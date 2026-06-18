import type {
  CloudimageCropConfig,
  TransformState,
  CropShapeName,
  TransformParams,
  HitTarget,
  DisplayState,
  CropRect,
} from './types';
import { mergeConfig } from './config';
import {
  createInitialState,
  applyRotateLeft,
  applyFlipH,
  applyRotation,
  applyScale,
  applyCropMove,
  applyShapeChange,
  applyPan,
} from '../transforms/transform-state';
import { createRenderer, type RendererHandle, type CropShapeType } from '../canvas/renderer';
import { computeCoverDraw } from '../canvas/image-layer';
import { clampCoverPanScale } from '../transforms/constrain';
import { hitTest, getCursor } from '../canvas/hit-test';
import { createPointerTracker, type PointerTrackerHandle } from '../interactions/pointer-tracker';
import { updateDragCrop, type DragCropState } from '../interactions/drag-crop';
import { startResize, updateResize, type ResizeState } from '../interactions/resize-handles';
import { startPinch, type PinchState } from '../interactions/pinch-zoom';
import { handleWheelZoom } from '../interactions/wheel-zoom';
import { setupKeyboard, type KeyboardHandle } from '../a11y/keyboard';
import { announceState } from '../a11y/aria';
import { renderToCanvas, canvasToBlob, getTransformParams } from '../export/exporter';
import { buildCloudimageUrlFromDescriptor, type CloudimageUrlOptions, type CropDescriptor } from '../export/cloudimage-url';
import { calibrateServerFraming } from '../export/calibrate';

/**
 * Callbacks invoked by the controller in response to state transitions.
 * All are optional. Designed for bridging into CustomEvents (<cloudimage-crop>)
 * or into imperative listeners.
 */
export interface CropControllerCallbacks {
  onReady?(): void;
  onImageLoad?(image: HTMLImageElement): void;
  onError?(error: Error): void;
  onChange?(state: TransformState): void;
  onCropChange?(crop: CropRect): void;
  /** Fired whenever internal state syncs the toolbar's rotation slider. */
  onRotationSync?(degrees: number): void;
  /** Fired whenever internal state syncs the toolbar's shape selector. */
  onShapeSync?(shape: CropShapeName): void;
  /** Fired whenever internal state syncs the zoom slider. */
  onScaleSync?(scale: number): void;
  /**
   * Fired on every wheel-zoom notch so the host can surface the zoom
   * slider UI while scrolling. Separate from {@link onScaleSync} (which
   * also fires for slider drags) so the host can distinguish wheel from
   * pointer activity.
   */
  onWheelZoomActivity?(): void;
  /** Fired when loading/error UI needs to change. */
  onLoadingChange?(loading: boolean, error: string | null): void;
}

export interface CropControllerOptions {
  /** The canvas the renderer writes to (pre-created by the host element). */
  canvas: HTMLCanvasElement;
  /** Element hosting resize/keyboard/ARIA — usually the <cloudimage-crop> host itself. */
  host: HTMLElement;
  /** Layout reference — the wrapping container whose dimensions drive the fit-scale math. */
  layoutContainer: HTMLElement;
  /** Merged config (see {@link mergeConfig}). */
  config: CloudimageCropConfig;
  /** Optional callbacks. */
  callbacks?: CropControllerCallbacks;
}

export interface CropController {
  loadImage(src: string): Promise<void>;
  getTransformState(): TransformState;
  getCropRect(): CropRect;
  setCropShape(shape: CropShapeName): void;
  setCropRect(rect: CropRect): void;
  rotateLeft(): void;
  flipHorizontal(): void;
  setRotation(deg: number): void;
  setScale(scale: number): void;
  reset(): void;
  toCanvas(): HTMLCanvasElement;
  toBlob(type?: string, quality?: number): Promise<Blob>;
  toDataURL(type?: string, quality?: number): string;
  toTransformParams(): TransformParams;
  /**
   * Serializable snapshot (state + image/container dims + variant) that lets a
   * server/Node reproduce the crop as a Cloudimage URL. Throws if no image.
   */
  toCropDescriptor(): CropDescriptor;
  /**
   * Build a Cloudimage URL that reproduces the current crop/transform
   * server-side with full parity (crop/flip/90°/tilt/zoom/pan, both variants).
   * Reads token/domain/bg-color from config; `options` overrides per call.
   * Throws if no image is loaded, or if no token is configured and `config.src`
   * isn't already a Cloudimage/Filerobot URL.
   */
  toCloudimageURL(options?: Partial<CloudimageUrlOptions>): string;
  /**
   * Detect & cache (per image) the Cloudimage nested-crop framing so FREE-TILT
   * `toCloudimageURL()`/`toCropDescriptor()` reproduce the canvas exactly. Probes
   * the live CDN once per image (async). Recommended before a cloudimage export
   * of a tilted crop; non-tilt crops are exact without it. Returns the detected
   * framing, or null if there's no image / the probe failed.
   */
  calibrateCloudimage(): Promise<'centered' | 'inset' | null>;
  update(config: Partial<CloudimageCropConfig>): void;
  destroy(): void;
}

/**
 * Non-DOM-owning factory. The element that owns the DOM (e.g. `<cloudimage-crop>`)
 * provides the canvas + layout container and listens to state via callbacks.
 * No toolbar, zoom slider, or overlay divs are created here — those are the
 * host's responsibility.
 */
export function createCropController(opts: CropControllerOptions): CropController {
  const { canvas, host, layoutContainer, callbacks = {} } = opts;
  let config = { ...opts.config };
  let cropShape: CropShapeName = config.cropShape;
  let image: HTMLImageElement | null = null;
  let state: TransformState = createInitialState(config.cropShape);
  let renderer: RendererHandle | null = null;
  let pointerTracker: PointerTrackerHandle | null = null;
  let keyboardHandle: KeyboardHandle | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let isInteracting = false;
  // Monotonic counter to invalidate in-flight loadImage() attempts when a new
  // src is assigned (or destroy() is called) before the previous Image decode
  // resolved. Prevents out-of-order completions from overwriting state.
  let loadGeneration = 0;
  // Per-image calibrated nested-crop framing (see calibrateServerFraming). The
  // Cloudimage rotation-framing is a per-image CDN property, so it's detected
  // once per image and reused for any tilted crop; cleared on a new image.
  let calibratedFraming: 'centered' | 'inset' | null = null;

  let dragState: DragCropState | null = null;
  let panDragState: { startX: number; startY: number; startPanX: number; startPanY: number } | null = null;
  let moveRectState: { startX: number; startY: number; startRect: CropRect } | null = null;
  let resizeState: ResizeState | null = null;
  let pinchState: PinchState | null = null;

  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  // === Initial state from config ===
  if (config.initialCrop) state = applyCropMove(state, config.initialCrop);
  if (config.initialRotation) state = applyRotation(state, config.initialRotation);
  if (config.initialScale && config.initialScale !== 1) {
    state = applyScale(state, config.initialScale, config.minScale, config.maxScale);
  }

  function getCropShapeType(): CropShapeType {
    if (cropShape === 'circle') return 'circle';
    if (cropShape === 'rounded-rect') return 'rounded-rect';
    return 'rect';
  }

  function getTransformState(): TransformState {
    return { ...state, cropRect: { ...state.cropRect } };
  }

  function getCropRect(): CropRect {
    if (!image) return { ...state.cropRect };
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    return {
      x: Math.round(state.cropRect.x * iw),
      y: Math.round(state.cropRect.y * ih),
      width: Math.round(state.cropRect.width * iw),
      height: Math.round(state.cropRect.height * ih),
    };
  }

  /** Normalized rect for the fixed variant: the whole editor box is the crop. */
  const FIXED_CROP_RECT = { x: 0, y: 0, width: 1, height: 1 };

  // Last laid-out editor-box size (CSS px). Tracked so export still works when
  // the editor is momentarily unlaid (hidden tab / detached), where
  // `clientWidth/Height` read 0.
  let lastLayoutW = 0;
  let lastLayoutH = 0;
  function layoutSize(): { w: number; h: number } {
    const cw = layoutContainer.clientWidth;
    const ch = layoutContainer.clientHeight;
    if (cw > 0 && ch > 0) {
      lastLayoutW = cw;
      lastLayoutH = ch;
    }
    return { w: cw > 0 ? cw : lastLayoutW, h: ch > 0 ? ch : lastLayoutH };
  }

  /**
   * Keep the photo covering the crop so the export never has transparent gaps.
   * Clamps pan + raises scale to the (max-capped) cover floor, and pins the
   * renderer's lower scale bound to it so the elastic bounce can't dip under
   * coverage.
   *
   * - `fixed`: frame = whole editor box; photo draw model = cover-fit.
   * - `classic`: frame = movable/resizable crop rect; photo draw model = the
   *   stretched container box (matches image-layer's classic draw). Skipped on
   *   a 90°/270° turn, where classic intentionally letterboxes to fit.
   */
  function applyCover(): void {
    if (!image || !renderer) return;
    const { w, h } = layoutSize();
    if (w <= 0 || h <= 0) return;

    let frame: { x: number; y: number; width: number; height: number };
    let drawW0: number;
    let drawH0: number;
    if (config.variant === 'fixed') {
      frame = { x: 0, y: 0, width: w, height: h };
      const cover = computeCoverDraw(w, h, image.naturalWidth, image.naturalHeight, state.quarterTurns);
      drawW0 = cover.drawW;
      drawH0 = cover.drawH;
    } else {
      // Classic keeps the existing letterbox on quarter-turns.
      if (Math.round(state.quarterTurns / 90) % 2 !== 0) {
        renderer.setScaleBounds(config.minScale, config.maxScale);
        return;
      }
      const cr = state.cropRect;
      frame = { x: cr.x * w, y: cr.y * h, width: cr.width * w, height: cr.height * h };
      // Classic draws the photo stretched to the container box (image-layer.ts).
      drawW0 = w;
      drawH0 = h;
    }

    const r = clampCoverPanScale(state, w, h, frame, drawW0, drawH0, config.maxScale);
    state = { ...state, scale: r.scale, panX: r.panX, panY: r.panY };
    renderer.setScaleBounds(r.minScale, config.maxScale);
  }

  function syncDisplayState(): void {
    if (!renderer) return;
    // Centralized cover enforcement: every state mutation funnels through here
    // before the display syncs, so pan/zoom/tilt/rotate all stay covered in
    // the fixed variant without sprinkling clamps across each handler.
    applyCover();
    const ds: DisplayState = {
      quarterTurns: state.quarterTurns,
      rotation: state.rotation,
      flipH: state.flipH ? -1 : 1,
      flipV: state.flipV ? -1 : 1,
      scale: state.scale,
      panX: state.panX,
      panY: state.panY,
      cropRect: { ...state.cropRect },
      rotationPivot: state.rotationPivot,
      gridOpacity: isInteracting ? 1 : (config.showGrid === true ? 1 : 0),
      interactive: isInteracting,
    };
    renderer.setDisplayState(ds);
  }

  function emitChange(): void {
    callbacks.onChange?.(getTransformState());
  }
  function emitCropChange(): void {
    callbacks.onCropChange?.(getCropRect());
  }

  // === Resize observer ===
  resizeObserver = new ResizeObserver(() => {
    if (destroyed) return;
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
      resizeDebounceTimer = null;
      if (destroyed) return;
      renderer?.resize();
      // Cover bounds are in container px, so re-clamp after the box resizes
      // (both variants). applyCover() inside is a no-op until an image loads.
      syncDisplayState();
      renderer?.markDirty();
    }, 16);
  });
  resizeObserver.observe(layoutContainer);

  // === Image loading ===
  async function loadImage(src: string): Promise<void> {
    if (destroyed) return;
    const myGen = ++loadGeneration;
    callbacks.onLoadingChange?.(true, null);

    try {
      const img = new Image();
      // CORS hint must be set before `src` — otherwise the browser may start a
      // non-CORS request and the resulting canvas will be tainted, making
      // toDataURL/toBlob throw SecurityError at export time.
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
      });

      // Drop the result if the controller was torn down or a newer loadImage
      // superseded us while the decode was in flight.
      if (destroyed || myGen !== loadGeneration) return;

      image = img;
      calibratedFraming = null; // new image → re-calibrate its CDN framing on demand
      callbacks.onLoadingChange?.(false, null);
      callbacks.onImageLoad?.(img);
      initEditor();
    } catch (error) {
      if (destroyed || myGen !== loadGeneration) return;
      const msg = (error as Error).message;
      callbacks.onLoadingChange?.(false, msg);
      callbacks.onError?.(error as Error);
    }
  }

  function initEditor(): void {
    if (!image) return;

    // Refit the crop rect now that the real image aspect is known. The
    // initial `createInitialState` ran pre-load with a 1×1 fallback, so
    // fixed-ratio shapes (e.g. "5:4") were stored as normalized ratios
    // that only match the target on a square image. Skip if the consumer
    // explicitly pinned an `initialCrop`.
    if (config.variant === 'fixed') {
      // The frame box itself is the crop — pan/zoom moves the photo under it.
      // initialCrop is ignored in this variant.
      state = { ...state, cropRect: { ...FIXED_CROP_RECT } };
    } else if (!config.initialCrop) {
      state = applyShapeChange(state, cropShape, image.naturalWidth, image.naturalHeight);
    }

    const reducedMotion = !config.enableAnimations ||
      (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    renderer = createRenderer(
      canvas,
      image,
      getCropShapeType,
      config.borderRadius,
      reducedMotion,
      // Pass the layout container explicitly: the canvas lives in its own
      // shadow root and `canvas.parentElement` returns null there.
      layoutContainer,
    );

    renderer.setScaleBounds(config.minScale, config.maxScale);
    renderer.setFixedFrame(config.variant === 'fixed');
    renderer.setBleedConfig({
      show: config.showBleedMargin,
      size: config.bleedMarginSize,
      color: config.bleedMarginColor,
    });
    syncDisplayState();
    renderer.startLoop();

    setupPointerTracking();

    if (config.keyboard) {
      keyboardHandle = setupKeyboard(host, {
        onRotateLeft: () => rotateLeft(),
        onFlipH: () => flipHorizontal(),
        onZoomIn: () => setScale(state.scale + 0.1),
        onZoomOut: () => setScale(state.scale - 0.1),
        onResetZoom: () => setScale(1),
        onMoveCrop: (dx, dy) => {
          // Fixed variant has no movable frame — ignore arrow-key crop nudges.
          if (config.variant === 'fixed') return;
          const cr = state.cropRect;
          state = applyCropMove(state, { x: cr.x + dx, y: cr.y + dy, width: cr.width, height: cr.height });
          syncDisplayState();
          emitChange();
          emitCropChange();
        },
        onRotateFine: (delta) => setRotation(state.rotation + delta),
      });
    }

    callbacks.onReady?.();
  }

  function setupPointerTracking(): void {
    pointerTracker = createPointerTracker(canvas, {
      onPointerDown: (pointer, pointers) => {
        const now = Date.now();
        const dt = now - lastTapTime;
        const dist = Math.sqrt((pointer.x - lastTapX) ** 2 + (pointer.y - lastTapY) ** 2);
        if (dt < 300 && dist < 20 && pointers.length === 1) {
          setScale(1);
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;
        lastTapX = pointer.x;
        lastTapY = pointer.y;

        if (pointers.length === 2) {
          pinchState = startPinch(pointers, state.scale);
          dragState = null;
          resizeState = null;
          return;
        }

        const cropRect = renderer!.getCanvasCropRect();
        let target: HitTarget = hitTest(pointer.x, pointer.y, cropRect);
        // Fixed variant: the frame can't be resized or moved — every grab on
        // it pans the photo. Coerce handle / move-handle hits to a plain
        // crop-area drag so they fall into the pan branch below.
        if (config.variant === 'fixed' && (target.type === 'handle' || target.type === 'move-handle')) {
          target = { type: 'crop-area' };
        }
        isInteracting = true;

        if (target.type === 'move-handle') {
          // Dedicated diagonal move-handle: drags the crop frame as-is
          // without resizing or panning the photo.
          moveRectState = {
            startX: pointer.x,
            startY: pointer.y,
            startRect: { ...state.cropRect },
          };
        } else if (target.type === 'crop-area') {
          // Dragging the photo area always pans the image — the crop frame
          // stays fixed and the image moves under it. Matches the
          // Cloudimage/uploader pattern and works at any scale (including
          // scale=1 when the photo fits the viewport but the user still
          // wants to reposition it under the frame). Crop size is changed
          // via the corner/edge handles.
          panDragState = { startX: pointer.x, startY: pointer.y, startPanX: state.panX, startPanY: state.panY };
        } else if (target.type === 'handle' && target.position) {
          resizeState = startResize('handle-' + target.position, state.cropRect, pointer.x, pointer.y);
        }

        syncDisplayState();
      },

      onPointerMove: (pointer) => {
        if (!image) return;
        const cropRect = renderer!.getCanvasCropRect();

        if (moveRectState) {
          const { displayW, displayH } = computeDisplaySize();
          if (displayW > 0 && displayH > 0) {
            const dx = (pointer.x - moveRectState.startX) / displayW;
            const dy = (pointer.y - moveRectState.startY) / displayH;
            state = applyCropMove(state, {
              x: moveRectState.startRect.x + dx,
              y: moveRectState.startRect.y + dy,
              width: moveRectState.startRect.width,
              height: moveRectState.startRect.height,
            });
            syncDisplayState();
            emitChange();
            emitCropChange();
          }
          return;
        }

        if (panDragState) {
          const dx = pointer.x - panDragState.startX;
          const dy = pointer.y - panDragState.startY;
          // `panX`/`panY` live in the image's (flippable) local frame,
          // but the drag delta is in screen pixels. Invert the axis when
          // the image is mirrored so dragging right always moves the
          // picture right on screen.
          const sx = state.flipH ? -1 : 1;
          const sy = state.flipV ? -1 : 1;
          state = {
            ...state,
            panX: panDragState.startPanX + (sx * dx) / state.scale,
            panY: panDragState.startPanY + (sy * dy) / state.scale,
          };
          syncDisplayState();
          emitChange();
          return;
        }

        if (dragState) {
          const { displayW, displayH } = computeDisplaySize();
          const newCrop = updateDragCrop(dragState, pointer.x, pointer.y, displayW, displayH);
          state = applyCropMove(state, newCrop);
          syncDisplayState();
          emitChange();
          emitCropChange();
          return;
        }

        if (resizeState) {
          const { displayW, displayH } = computeDisplaySize();
          const newCrop = updateResize(
            resizeState,
            pointer.x,
            pointer.y,
            displayW,
            displayH,
            cropShape,
            config.minCropSize,
            { shiftKey: pointer.shiftKey, altKey: pointer.altKey },
          );
          state = applyCropMove(state, newCrop);
          syncDisplayState();
          emitChange();
          emitCropChange();
          return;
        }

        if (config.variant === 'fixed') {
          canvas.style.cursor = 'grab';
        } else {
          const target = hitTest(pointer.x, pointer.y, cropRect);
          canvas.style.cursor = getCursor(target, false);
        }
      },

      onHover: (pointer) => {
        if (!renderer) return;
        if (config.variant === 'fixed') {
          canvas.style.cursor = 'grab';
          return;
        }
        const cropRect = renderer.getCanvasCropRect();
        const target = hitTest(pointer.x, pointer.y, cropRect);
        canvas.style.cursor = getCursor(target, false);
      },

      onPointerUp: (_pointer, pointers) => {
        if (pointers.length < 2) pinchState = null;
        if (pointers.length === 0) {
          dragState = null;
          panDragState = null;
          moveRectState = null;
          resizeState = null;
          isInteracting = false;
          // Forget the tap anchor on release so a stray hover-move cannot form
          // the tail half of a phantom double-tap.
          lastTapX = 0;
          lastTapY = 0;
          syncDisplayState();
        }
      },

      onPinch: (e) => {
        if (!pinchState) {
          pinchState = { initialDistance: e.distance, initialScale: state.scale, initialCenterX: e.centerX, initialCenterY: e.centerY };
        }
        const newScale = state.scale * (e.distance / pinchState.initialDistance);
        const panDeltaX = e.centerX - pinchState.initialCenterX;
        const panDeltaY = e.centerY - pinchState.initialCenterY;
        state = applyScale(state, newScale, config.minScale, config.maxScale);
        state = applyPan(state, panDeltaX, panDeltaY);
        callbacks.onScaleSync?.(state.scale);
        syncDisplayState();
        emitChange();
      },

      onWheel: (e) => {
        if (!config.wheelZoom) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const result = handleWheelZoom(e.deltaY, state.scale, {
          minScale: config.minScale,
          maxScale: config.maxScale,
          sensitivity: 1,
        }, cursorX, cursorY, centerX, centerY);

        state = applyScale(state, result.scale, config.minScale, config.maxScale);
        state = applyPan(state, result.panDeltaX, result.panDeltaY);
        callbacks.onScaleSync?.(state.scale);
        callbacks.onWheelZoomActivity?.();
        syncDisplayState();
        emitChange();
      },
    });
  }

  function computeDisplaySize(): { displayW: number; displayH: number } {
    // Canvas host is already sized to the image's display rect by the
    // element layer, so its own box dimensions ARE the display size.
    return { displayW: layoutContainer.clientWidth, displayH: layoutContainer.clientHeight };
  }

  // === Public API ===

  function setCropShape(shape: CropShapeName): void {
    if (destroyed) return;
    // Idempotence guard: property reflection + toolbar events can both land
    // on the same cropShape value. Skipping the no-op avoids double
    // change/cropChange dispatches to consumers.
    if (cropShape === shape) return;
    cropShape = shape;
    if (config.variant === 'fixed') {
      // Frame stays the whole box; only its aspect (driven by the element's
      // box resize) changes. cropRect remains full; applyCover re-covers.
      state = { ...state, cropRect: { ...FIXED_CROP_RECT } };
    } else {
      state = applyShapeChange(
        state,
        shape,
        image?.naturalWidth ?? 1,
        image?.naturalHeight ?? 1,
      );
    }
    callbacks.onShapeSync?.(shape);
    syncDisplayState();
    emitChange();
    emitCropChange();
  }

  function setCropRect(rect: CropRect): void {
    if (destroyed) return;
    state = applyCropMove(state, rect);
    syncDisplayState();
    emitChange();
    emitCropChange();
  }

  function rotateLeft(): void {
    if (destroyed) return;
    state = applyRotateLeft(state);
    syncDisplayState();
    announceState(host, state, cropShape);
    emitChange();
    emitCropChange();
  }

  function flipHorizontal(): void {
    if (destroyed) return;
    state = applyFlipH(state);
    syncDisplayState();
    announceState(host, state, cropShape);
    emitChange();
    emitCropChange();
  }

  function setRotation(degrees: number): void {
    if (destroyed) return;
    state = applyRotation(state, degrees);
    callbacks.onRotationSync?.(degrees);
    syncDisplayState();
    emitChange();
  }

  function setScale(scale: number): void {
    if (destroyed) return;
    state = applyScale(state, scale, config.minScale, config.maxScale);
    callbacks.onScaleSync?.(state.scale);
    syncDisplayState();
    emitChange();
  }

  function reset(): void {
    if (destroyed) return;
    cropShape = config.cropShape;
    state = createInitialState(
      config.cropShape,
      image?.naturalWidth ?? 1,
      image?.naturalHeight ?? 1,
    );
    // Fixed variant: reset to the full-box crop; pan/scale snap back to the
    // cover floor via applyCover(). initialCrop is not honored in this variant.
    if (config.variant === 'fixed') {
      state = { ...state, cropRect: { ...FIXED_CROP_RECT } };
    } else if (config.initialCrop) {
      state = applyCropMove(state, config.initialCrop);
    }
    if (config.initialRotation) state = applyRotation(state, config.initialRotation);
    if (config.initialScale !== undefined && config.initialScale !== 1) {
      state = applyScale(state, config.initialScale, config.minScale, config.maxScale);
    }
    callbacks.onRotationSync?.(state.rotation);
    callbacks.onShapeSync?.(config.cropShape);
    callbacks.onScaleSync?.(state.scale);
    syncDisplayState();
    announceState(host, state, cropShape);
    emitChange();
    emitCropChange();
  }

  function toCanvas(): HTMLCanvasElement {
    if (!image) throw new Error('No image loaded');
    // Use the last laid-out size so export still rescales pan correctly when
    // the editor is currently unlaid (hidden tab / detached → clientWidth 0).
    const { w, h } = layoutSize();
    return renderToCanvas(
      image,
      state,
      config.maxOutputWidth,
      config.maxOutputHeight,
      cropShape,
      config.borderRadius,
      // Pan is stored in the renderer's CSS-px container space; pass the
      // container dims so the exporter can rescale pan into display space.
      // The height + variant drive the fixed variant's cover-fit export.
      w,
      h,
      config.variant,
    );
  }

  async function toBlob(type?: string, quality?: number): Promise<Blob> {
    const c = toCanvas();
    return canvasToBlob(c, type || config.outputType, quality ?? config.outputQuality);
  }

  function toDataURL(type?: string, quality?: number): string {
    // `toDataURL` throws SecurityError synchronously when the canvas is
    // tainted by cross-origin pixels. Wrap so consumers get a clear message
    // instead of a raw DOMException — same surface as canvasToBlob.
    try {
      return toCanvas().toDataURL(type || config.outputType, quality ?? config.outputQuality);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      throw new Error(`Failed to export data URL: ${e.message}`);
    }
  }

  function toTransformParams(): TransformParams {
    if (!image) throw new Error('No image loaded');
    // NOTE: in the 'fixed' variant cropRect is the full box ({0,0,1,1}), so the
    // returned `crop` spans the whole image rather than the cover-framed region
    // — the rasterized exports (toCanvas/toBlob/toDataURL) are the source of
    // truth for that variant. Server-side replication of fixed-mode framing
    // from these params is not yet supported.
    return getTransformParams(state, image.naturalWidth, image.naturalHeight);
  }

  /**
   * Calibrate the per-image Cloudimage nested-crop framing used by FREE-TILT
   * URLs. Cloudimage frames a rotated image's nested crop differently per image
   * (a CDN-side property that can't be derived from the crop geometry), so this
   * probes the live CDN once with a synthetic tilt and caches the result;
   * subsequent `toCropDescriptor()`/`toCloudimageURL()` bake it in for exact
   * tilt parity. The framing is per-image (independent of the actual crop/turn),
   * so one probe covers every crop on the image; the cache clears on a new image.
   * No-op (returns null) without an image. Safe to await before each cloudimage
   * export. Non-tilt crops don't need it (they're exact regardless).
   */
  async function calibrateCloudimage(): Promise<'centered' | 'inset' | null> {
    if (!image || destroyed) return null;
    const { w, h } = layoutSize();
    const probe: CropDescriptor = {
      state: { ...createInitialState(cropShape), rotation: 15, cropRect: { x: 0.35, y: 0.35, width: 0.3, height: 0.3 } },
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      containerWidth: w,
      containerHeight: h,
      variant: 'classic',
    };
    try {
      calibratedFraming = await calibrateServerFraming(image, probe, {
        src: config.src,
        token: config.cloudimageToken || undefined,
        domain: config.cloudimageDomain || undefined,
      });
    } catch {
      calibratedFraming = null; // leave un-calibrated → 'auto' heuristic in the builder
    }
    return calibratedFraming;
  }

  function toCropDescriptor(): CropDescriptor {
    if (!image) throw new Error('No image loaded');
    const { w, h } = layoutSize();
    return {
      state: getTransformState(),
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      containerWidth: w,
      containerHeight: h,
      variant: config.variant,
      ...(calibratedFraming ? { serverFraming: calibratedFraming } : {}),
    };
  }

  function toCloudimageURL(options?: Partial<CloudimageUrlOptions>): string {
    return buildCloudimageUrlFromDescriptor(toCropDescriptor(), {
      src: config.src,
      token: config.cloudimageToken || undefined,
      domain: config.cloudimageDomain || undefined,
      bgColor: config.cloudimageBgColor || undefined,
      format: config.outputType,
      quality: config.outputQuality,
      maxWidth: config.maxOutputWidth,
      maxHeight: config.maxOutputHeight,
      ...options,
    });
  }

  function update(partial: Partial<CloudimageCropConfig>): void {
    if (destroyed) return;
    const oldSrc = config.src;
    const oldVariant = config.variant;
    config = mergeConfig({ ...config, ...partial });
    if (partial.cropShape !== undefined) setCropShape(partial.cropShape);
    if (partial.variant !== undefined && partial.variant !== oldVariant) {
      renderer?.setFixedFrame(config.variant === 'fixed');
      if (config.variant === 'fixed') {
        state = { ...state, cropRect: { ...FIXED_CROP_RECT } };
      } else {
        // Back to classic: restore an editable, centered frame and the
        // config-driven scale bounds (applyCover no longer runs to pin them).
        // Also reset the photo's zoom/pan — otherwise the scale forced up and
        // the pan accumulated in fixed mode carry over, leaving the photo
        // zoomed-in / offset under the freshly centered classic frame.
        renderer?.setScaleBounds(config.minScale, config.maxScale);
        state = applyShapeChange(state, cropShape, image?.naturalWidth ?? 1, image?.naturalHeight ?? 1);
        state = applyScale({ ...state, panX: 0, panY: 0 }, config.initialScale ?? 1, config.minScale, config.maxScale);
      }
      syncDisplayState();
      emitChange();
      emitCropChange();
    }
    if (partial.src !== undefined && partial.src !== oldSrc) {
      // loadImage already surfaces failures through onError; swallow the
      // promise so consumers calling update() synchronously don't trigger
      // `unhandledrejection` on decode errors.
      void loadImage(partial.src).catch(() => {});
    }
    // Re-push bleed guides when any bleed key changes — initEditor sets these
    // once, so toggling them at runtime (e.g. showBleedMargin) must refresh
    // the renderer or the change never reaches the canvas.
    if (
      partial.showBleedMargin !== undefined ||
      partial.bleedMarginSize !== undefined ||
      partial.bleedMarginColor !== undefined
    ) {
      renderer?.setBleedConfig({
        show: config.showBleedMargin,
        size: config.bleedMarginSize,
        color: config.bleedMarginColor,
      });
    }
    // The grid's resting opacity is derived in syncDisplayState() from
    // config.showGrid, so re-sync when it toggles or the grid won't appear /
    // disappear until the next pointer interaction.
    if (partial.showGrid !== undefined) syncDisplayState();
    // Colours are sampled from CSS vars each frame (see renderer), but the
    // loop only repaints when `dirty`. Flip it here so theme/token swaps
    // repaint without waiting for the next pointer event.
    renderer?.markDirty();
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    // Invalidate any in-flight loadImage so late-resolving Promises don't
    // touch the now-dead renderer.
    loadGeneration++;
    renderer?.destroy();
    pointerTracker?.destroy();
    keyboardHandle?.destroy();
    resizeObserver?.disconnect();
    if (resizeDebounceTimer) {
      clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = null;
    }
  }

  return {
    loadImage,
    getTransformState,
    getCropRect,
    setCropShape,
    setCropRect,
    rotateLeft,
    flipHorizontal,
    setRotation,
    setScale,
    reset,
    toCanvas,
    toBlob,
    toDataURL,
    toTransformParams,
    toCropDescriptor,
    toCloudimageURL,
    calibrateCloudimage,
    update,
    destroy,
  };
}
