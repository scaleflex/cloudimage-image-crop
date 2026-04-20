import type {
  SfxCropConfig,
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
import { hitTest, getCursor } from '../canvas/hit-test';
import { createPointerTracker, type PointerTrackerHandle } from '../interactions/pointer-tracker';
import { startDragCrop, updateDragCrop, type DragCropState } from '../interactions/drag-crop';
import { startResize, updateResize, type ResizeState } from '../interactions/resize-handles';
import { startPinch, type PinchState } from '../interactions/pinch-zoom';
import { handleWheelZoom } from '../interactions/wheel-zoom';
import { setupKeyboard, type KeyboardHandle } from '../a11y/keyboard';
import { announceState } from '../a11y/aria';
import { renderToCanvas, canvasToBlob, getTransformParams } from '../export/exporter';

/**
 * Callbacks invoked by the controller in response to state transitions.
 * All are optional. Designed for bridging into CustomEvents (<sfx-crop>)
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
  /** Fired when loading/error UI needs to change. */
  onLoadingChange?(loading: boolean, error: string | null): void;
}

export interface CropControllerOptions {
  /** The canvas the renderer writes to (pre-created by the host element). */
  canvas: HTMLCanvasElement;
  /** Element hosting resize/keyboard/ARIA — usually the <sfx-crop> host itself. */
  host: HTMLElement;
  /** Layout reference — the wrapping container whose dimensions drive the fit-scale math. */
  layoutContainer: HTMLElement;
  /** Merged config (see {@link mergeConfig}). */
  config: SfxCropConfig;
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
  flipVertical(): void;
  setRotation(deg: number): void;
  setScale(scale: number): void;
  reset(): void;
  toCanvas(): HTMLCanvasElement;
  toBlob(type?: string, quality?: number): Promise<Blob>;
  toDataURL(type?: string, quality?: number): string;
  toTransformParams(): TransformParams;
  update(config: Partial<SfxCropConfig>): void;
  destroy(): void;
}

/**
 * Non-DOM-owning factory extracted from {@link CICropView}. The element that
 * owns the DOM (e.g. `<sfx-crop>`) provides the canvas + layout container and
 * listens to state via callbacks. No toolbar, zoom slider, or overlay divs
 * are created here — those are the host's responsibility.
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

  let dragState: DragCropState | null = null;
  let panDragState: { startX: number; startY: number; startPanX: number; startPanY: number } | null = null;
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

  function syncDisplayState(): void {
    if (!renderer) return;
    const ds: DisplayState = {
      quarterTurns: state.quarterTurns,
      rotation: state.rotation,
      flipH: state.flipH ? -1 : 1,
      flipV: state.flipV ? -1 : 1,
      scale: state.scale,
      panX: state.panX,
      panY: state.panY,
      cropRect: { ...state.cropRect },
      gridOpacity: isInteracting ? 1 : (config.showGrid === true ? 1 : 0),
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
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
      renderer?.resize();
      renderer?.markDirty();
    }, 16);
  });
  resizeObserver.observe(layoutContainer);

  // === Image loading ===
  async function loadImage(src: string): Promise<void> {
    callbacks.onLoadingChange?.(true, null);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
      });

      if (destroyed) return;

      image = img;
      callbacks.onLoadingChange?.(false, null);
      callbacks.onImageLoad?.(img);
      initEditor();
    } catch (error) {
      if (destroyed) return;
      const msg = (error as Error).message;
      callbacks.onLoadingChange?.(false, msg);
      callbacks.onError?.(error as Error);
    }
  }

  function initEditor(): void {
    if (!image) return;

    const reducedMotion = !config.enableAnimations ||
      (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    renderer = createRenderer(
      canvas,
      image,
      getCropShapeType,
      config.borderRadius,
      reducedMotion,
    );

    renderer.setScaleBounds(config.minScale, config.maxScale);
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
        const target: HitTarget = hitTest(pointer.x, pointer.y, cropRect);
        isInteracting = true;

        if (target.type === 'crop-area' && state.scale > 1) {
          panDragState = { startX: pointer.x, startY: pointer.y, startPanX: state.panX, startPanY: state.panY };
        } else if (target.type === 'crop-area') {
          dragState = startDragCrop(state.cropRect, pointer.x, pointer.y);
        } else if (target.type === 'handle' && target.position) {
          resizeState = startResize('handle-' + target.position, state.cropRect, pointer.x, pointer.y);
        }

        syncDisplayState();
      },

      onPointerMove: (pointer) => {
        if (!image) return;
        const cropRect = renderer!.getCanvasCropRect();

        if (panDragState) {
          const dx = pointer.x - panDragState.startX;
          const dy = pointer.y - panDragState.startY;
          state = {
            ...state,
            panX: panDragState.startPanX + dx / state.scale,
            panY: panDragState.startPanY + dy / state.scale,
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

        const target = hitTest(pointer.x, pointer.y, cropRect);
        canvas.style.cursor = getCursor(target, false);
      },

      onHover: (pointer) => {
        if (!renderer) return;
        const cropRect = renderer.getCanvasCropRect();
        const target = hitTest(pointer.x, pointer.y, cropRect);
        canvas.style.cursor = getCursor(target, false);
      },

      onPointerUp: (_pointer, pointers) => {
        if (pointers.length < 2) pinchState = null;
        if (pointers.length === 0) {
          dragState = null;
          panDragState = null;
          resizeState = null;
          isInteracting = false;
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
        syncDisplayState();
        emitChange();
      },
    });
  }

  function computeDisplaySize(): { displayW: number; displayH: number } {
    const cw = layoutContainer.clientWidth;
    const ch = layoutContainer.clientHeight;
    const is90 = Math.round(state.quarterTurns / 90) % 2 !== 0;
    const iw = image!.naturalWidth;
    const ih = image!.naturalHeight;
    const effectiveW = is90 ? ih : iw;
    const effectiveH = is90 ? iw : ih;
    const availableH = ch - 80;
    const fitScale = Math.min(cw / effectiveW, availableH / effectiveH, 1);
    return { displayW: effectiveW * fitScale, displayH: effectiveH * fitScale };
  }

  // === Public API ===

  function setCropShape(shape: CropShapeName): void {
    if (destroyed) return;
    cropShape = shape;
    state = applyShapeChange(state, shape);
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

  function flipVertical(): void {
    // No-op: vertical flip removed (parity with CICropView).
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
    state = createInitialState(config.cropShape);
    callbacks.onRotationSync?.(0);
    callbacks.onShapeSync?.(config.cropShape);
    callbacks.onScaleSync?.(1);
    syncDisplayState();
    announceState(host, state, cropShape);
    emitChange();
  }

  function toCanvas(): HTMLCanvasElement {
    if (!image) throw new Error('No image loaded');
    return renderToCanvas(
      image,
      state,
      config.maxOutputWidth,
      config.maxOutputHeight,
      cropShape,
      config.borderRadius,
    );
  }

  async function toBlob(type?: string, quality?: number): Promise<Blob> {
    const c = toCanvas();
    return canvasToBlob(c, type || config.outputType, quality ?? config.outputQuality);
  }

  function toDataURL(type?: string, quality?: number): string {
    return toCanvas().toDataURL(type || config.outputType, quality ?? config.outputQuality);
  }

  function toTransformParams(): TransformParams {
    if (!image) throw new Error('No image loaded');
    return getTransformParams(state, image.naturalWidth, image.naturalHeight);
  }

  function update(partial: Partial<SfxCropConfig>): void {
    if (destroyed) return;
    const oldSrc = config.src;
    config = mergeConfig({ ...config, ...partial });
    if (partial.cropShape !== undefined) setCropShape(partial.cropShape);
    if (partial.src !== undefined && partial.src !== oldSrc) loadImage(partial.src);
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    renderer?.destroy();
    pointerTracker?.destroy();
    keyboardHandle?.destroy();
    resizeObserver?.disconnect();
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
  }

  return {
    loadImage,
    getTransformState,
    getCropRect,
    setCropShape,
    setCropRect,
    rotateLeft,
    flipHorizontal,
    flipVertical,
    setRotation,
    setScale,
    reset,
    toCanvas,
    toBlob,
    toDataURL,
    toTransformParams,
    update,
    destroy,
  };
}
