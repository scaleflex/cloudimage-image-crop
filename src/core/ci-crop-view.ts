import type {
  CICropViewConfig,
  CICropViewInstance,
  TransformState,
  CropShapeName,
  TransformParams,
  HitTarget,
  DisplayState,
  CropRect,
} from './types';
import { mergeConfig, validateConfig, parseDataAttributes } from './config';
import { getElement, createElement, addClass, removeClass, injectStyles, removeStyles } from '../utils/dom';
import { clamp } from '../utils/math';
import {
  createInitialState,
  applyRotateLeft,
  applyFlipH,
  applyFlipV,
  applyRotation,
  applyScale,
  applyCropMove,
  applyShapeChange,
  applyPan,
} from '../transforms/transform-state';
import { createRenderer, type RendererHandle, type CropShapeType } from '../canvas/renderer';
import { hitTest, getCursor } from '../canvas/hit-test';
import { createPointerTracker, type PointerTrackerHandle, type PointerInfo } from '../interactions/pointer-tracker';
import { startDragCrop, updateDragCrop, type DragCropState } from '../interactions/drag-crop';
import { startResize, updateResize, type ResizeState } from '../interactions/resize-handles';
import { startPinch, updatePinch, type PinchState } from '../interactions/pinch-zoom';
import { handleWheelZoom } from '../interactions/wheel-zoom';
import { createToolbar, type ToolbarHandle } from '../ui/toolbar';
import { createZoomSlider, type ZoomSliderHandle } from '../ui/zoom-slider';
import { setupKeyboard, type KeyboardHandle } from '../a11y/keyboard';
import { setupAria, announceState } from '../a11y/aria';
import { renderToCanvas, canvasToBlob, getTransformParams } from '../export/exporter';
import CSS_STRING from '../styles/index.css?inline';

export class CICropView implements CICropViewInstance {
  private static instances = new Map<HTMLElement, CICropView>();

  private container: HTMLElement;
  private config: CICropViewConfig;
  private canvas!: HTMLCanvasElement;
  private image: HTMLImageElement | null = null;
  private state!: TransformState;
  private renderer: RendererHandle | null = null;
  private pointerTracker: PointerTrackerHandle | null = null;
  private toolbar: ToolbarHandle | null = null;
  private zoomSlider: ZoomSliderHandle | null = null;
  private keyboardHandle: KeyboardHandle | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private cropShape: CropShapeName;

  // Interaction state
  private dragState: DragCropState | null = null;
  private resizeState: ResizeState | null = null;
  private pinchState: PinchState | null = null;
  private currentHitTarget: HitTarget = { type: 'none' };
  private isInteracting = false;

  // Double-tap detection
  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;

  // Loading UI
  private loadingOverlay: HTMLElement | null = null;
  private errorOverlay: HTMLElement | null = null;

  /** Scan for data-ci-crop-src elements and auto-initialize. */
  static autoInit(root: HTMLElement = document.body): CICropView[] {
    const elements = root.querySelectorAll<HTMLElement>('[data-ci-crop-src]');
    const instances: CICropView[] = [];
    elements.forEach((el) => {
      const config = parseDataAttributes(el);
      instances.push(new CICropView(el, config));
    });
    return instances;
  }

  constructor(
    element: HTMLElement | string,
    config: Partial<CICropViewConfig> = {},
  ) {
    this.container = getElement(element);

    // Parse data attributes
    const dataConfig = parseDataAttributes(this.container);

    // Destroy existing instance on same container
    const existing = CICropView.instances.get(this.container);
    if (existing) {
      existing.destroy();
    }
    CICropView.instances.set(this.container, this);

    this.config = mergeConfig({ ...dataConfig, ...config });

    const errors = validateConfig(this.config);
    if (errors.length > 0) {
      console.warn('CICropView config warnings:', errors);
    }

    // Apply theme
    this.applyTheme();

    // Inject styles
    injectStyles(CSS_STRING, 'ci-crop-styles');

    // Init state
    this.cropShape = this.config.cropShape;
    this.state = createInitialState(this.config.cropShape);
    if (this.config.initialCrop) {
      this.state = applyCropMove(this.state, this.config.initialCrop);
    }
    if (this.config.initialRotation) {
      this.state = applyRotation(this.state, this.config.initialRotation);
    }
    if (this.config.initialScale && this.config.initialScale !== 1) {
      this.state = applyScale(this.state, this.config.initialScale, this.config.minScale, this.config.maxScale);
    }

    // Setup DOM
    this.setupDOM();

    // Load image
    if (this.config.src) {
      this.loadImage(this.config.src);
    }
  }

  // === Public API ===

  async loadImage(src: string): Promise<void> {
    this.showLoading();

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
      });

      if (this.destroyed) return;

      this.image = img;
      this.hideLoading();
      this.config.onImageLoad?.(img);
      this.initEditor();
    } catch (error) {
      if (this.destroyed) return;
      this.showError((error as Error).message);
      this.config.onError?.(error as Error);
    }
  }

  getTransformState(): TransformState {
    return { ...this.state, cropRect: { ...this.state.cropRect } };
  }

  setCropShape(shape: CropShapeName): void {
    if (this.destroyed) return;
    this.cropShape = shape;
    this.state = applyShapeChange(this.state, shape);
    this.toolbar?.setShape(shape);
    this.syncDisplayState();
    this.config.onChange?.(this.getTransformState());
    this.config.onCropChange?.(this.getCropRect());
  }

  setCropRect(rect: CropRect): void {
    if (this.destroyed) return;
    this.state = applyCropMove(this.state, rect);
    this.syncDisplayState();
    this.config.onChange?.(this.getTransformState());
    this.config.onCropChange?.(this.getCropRect());
  }

  getCropRect(): CropRect {
    if (!this.image) return { ...this.state.cropRect };
    const iw = this.image.naturalWidth;
    const ih = this.image.naturalHeight;
    return {
      x: Math.round(this.state.cropRect.x * iw),
      y: Math.round(this.state.cropRect.y * ih),
      width: Math.round(this.state.cropRect.width * iw),
      height: Math.round(this.state.cropRect.height * ih),
    };
  }

  rotateLeft(): void {
    if (this.destroyed) return;
    this.state = applyRotateLeft(this.state);
    this.syncDisplayState();
    announceState(this.container, this.state, this.cropShape);
    this.config.onChange?.(this.getTransformState());
    this.config.onCropChange?.(this.getCropRect());
  }

  flipHorizontal(): void {
    if (this.destroyed) return;
    this.state = applyFlipH(this.state);
    this.syncDisplayState();
    announceState(this.container, this.state, this.cropShape);
    this.config.onChange?.(this.getTransformState());
    this.config.onCropChange?.(this.getCropRect());
  }

  flipVertical(): void {
    if (this.destroyed) return;
    this.state = applyFlipV(this.state);
    this.syncDisplayState();
    announceState(this.container, this.state, this.cropShape);
    this.config.onChange?.(this.getTransformState());
    this.config.onCropChange?.(this.getCropRect());
  }

  setRotation(degrees: number): void {
    if (this.destroyed) return;
    this.state = applyRotation(this.state, degrees);
    this.toolbar?.setRotation(degrees);
    this.syncDisplayState();
    this.config.onChange?.(this.getTransformState());
  }

  setScale(scale: number): void {
    if (this.destroyed) return;
    this.state = applyScale(this.state, scale, this.config.minScale, this.config.maxScale);
    this.zoomSlider?.setValue(this.state.scale);
    this.syncDisplayState();
    this.config.onChange?.(this.getTransformState());
  }

  reset(): void {
    if (this.destroyed) return;
    this.cropShape = this.config.cropShape;
    this.state = createInitialState(this.config.cropShape);
    this.toolbar?.setRotation(0);
    this.toolbar?.setShape(this.config.cropShape);
    this.zoomSlider?.setValue(1);
    this.syncDisplayState();
    announceState(this.container, this.state, this.cropShape);
    this.config.onChange?.(this.getTransformState());
  }

  toCanvas(): HTMLCanvasElement {
    if (!this.image) throw new Error('No image loaded');
    return renderToCanvas(
      this.image,
      this.state,
      this.config.maxOutputWidth,
      this.config.maxOutputHeight,
      this.cropShape,
      this.config.borderRadius,
    );
  }

  async toBlob(type?: string, quality?: number): Promise<Blob> {
    const canvas = this.toCanvas();
    return canvasToBlob(
      canvas,
      type || this.config.outputType,
      quality ?? this.config.outputQuality,
    );
  }

  toDataURL(type?: string, quality?: number): string {
    const canvas = this.toCanvas();
    return canvas.toDataURL(
      type || this.config.outputType,
      quality ?? this.config.outputQuality,
    );
  }

  toTransformParams(): TransformParams {
    if (!this.image) throw new Error('No image loaded');
    return getTransformParams(this.state, this.image.naturalWidth, this.image.naturalHeight);
  }

  update(config: Partial<CICropViewConfig>): void {
    if (this.destroyed) return;
    const oldSrc = this.config.src;
    this.config = mergeConfig({ ...this.config, ...config });

    if (config.theme !== undefined) {
      this.applyTheme();
    }

    if (config.cropShape !== undefined) {
      this.setCropShape(config.cropShape);
    }

    if (config.src !== undefined && config.src !== oldSrc) {
      this.loadImage(config.src);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (CICropView.instances.get(this.container) === this) {
      CICropView.instances.delete(this.container);
    }

    this.renderer?.destroy();
    this.pointerTracker?.destroy();
    this.toolbar?.destroy();
    this.zoomSlider?.destroy();
    this.keyboardHandle?.destroy();
    this.resizeObserver?.disconnect();
    if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);

    // Remove DOM
    this.loadingOverlay?.remove();
    this.errorOverlay?.remove();
    this.canvas?.remove();

    removeClass(this.container, 'ci-crop-container', 'ci-crop-theme-light', 'ci-crop-theme-dark');
    removeStyles('ci-crop-styles');
  }

  // === Private ===

  private getCropShapeType(): CropShapeType {
    if (this.cropShape === 'circle') return 'circle';
    if (this.cropShape === 'rounded-rect') return 'rounded-rect';
    return 'rect';
  }

  private applyTheme(): void {
    if (this.config.theme === 'light') {
      addClass(this.container, 'ci-crop-theme-light');
      removeClass(this.container, 'ci-crop-theme-dark');
    } else {
      addClass(this.container, 'ci-crop-theme-dark');
      removeClass(this.container, 'ci-crop-theme-light');
    }
  }

  private setupDOM(): void {
    addClass(this.container, 'ci-crop-container');

    // ARIA
    setupAria(this.container);

    // Canvas
    this.canvas = createElement('canvas', 'ci-crop-canvas');
    this.container.appendChild(this.canvas);

    // Loading overlay
    this.loadingOverlay = createElement('div', 'ci-crop-loading');
    const spinner = createElement('div', 'ci-crop-loading-spinner');
    const loadingText = createElement('div', 'ci-crop-loading-text');
    loadingText.textContent = 'Loading...';
    this.loadingOverlay.appendChild(spinner);
    this.loadingOverlay.appendChild(loadingText);
    this.container.appendChild(this.loadingOverlay);

    // Error overlay
    this.errorOverlay = createElement('div', 'ci-crop-error');
    this.errorOverlay.textContent = 'Failed to load image';
    this.container.appendChild(this.errorOverlay);

    // Resize observer with debounce (16ms)
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = setTimeout(() => {
        this.renderer?.resize();
        this.renderer?.markDirty();
      }, 16);
    });
    this.resizeObserver.observe(this.container);
  }

  private initEditor(): void {
    if (!this.image) return;

    // Detect reduced motion
    const reducedMotion = !this.config.enableAnimations ||
      (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    // Create renderer
    this.renderer = createRenderer(
      this.canvas,
      this.image,
      () => this.getCropShapeType(),
      this.config.borderRadius,
      reducedMotion,
    );

    this.renderer.setScaleBounds(this.config.minScale, this.config.maxScale);
    this.renderer.setBleedConfig({
      show: this.config.showBleedMargin,
      size: this.config.bleedMarginSize,
      color: this.config.bleedMarginColor,
    });
    this.syncDisplayState();
    this.renderer.startLoop();

    // Setup interactions
    this.setupPointerTracking();

    // Setup toolbar
    if (this.config.showToolbar) {
      this.toolbar = createToolbar(this.container, this.cropShape, {
        onRotateLeft: () => this.rotateLeft(),
        onFlipH: () => this.flipHorizontal(),
        onFlipV: () => this.flipVertical(),
        onRotationChange: (deg) => this.setRotation(deg),
        onShapeChange: (shape) => this.setCropShape(shape),
      }, {
        showRotateButton: this.config.showRotateButton,
        showFlipButton: this.config.showFlipButton,
        showFlipVButton: this.config.showFlipVButton,
        showRotateSlider: this.config.showRotateSlider,
        showShapeSelector: this.config.showShapeSelector,
        toolbarPosition: this.config.toolbarPosition,
        availableShapes: this.config.availableShapes,
      });
    }

    // Setup zoom slider
    if (this.config.showZoomSlider) {
      this.zoomSlider = createZoomSlider(
        this.container,
        this.config.minScale,
        this.config.maxScale,
        (scale) => this.setScale(scale),
      );
    }

    // Setup keyboard
    if (this.config.keyboard) {
      this.keyboardHandle = setupKeyboard(this.container, {
        onRotateLeft: () => this.rotateLeft(),
        onFlipH: () => this.flipHorizontal(),
        onFlipV: () => this.flipVertical(),
        onZoomIn: () => this.setScale(this.state.scale + 0.1),
        onZoomOut: () => this.setScale(this.state.scale - 0.1),
        onResetZoom: () => this.setScale(1),
        onMoveCrop: (dx, dy) => {
          const cropRect = this.state.cropRect;
          this.state = applyCropMove(this.state, {
            x: cropRect.x + dx,
            y: cropRect.y + dy,
            width: cropRect.width,
            height: cropRect.height,
          });
          this.syncDisplayState();
          this.config.onChange?.(this.getTransformState());
          this.config.onCropChange?.(this.getCropRect());
        },
        onRotateFine: (delta) => {
          this.setRotation(this.state.rotation + delta);
        },
      });
    }

    this.config.onReady?.(this);
  }

  private syncDisplayState(): void {
    if (!this.renderer) return;

    const ds: DisplayState = {
      quarterTurns: this.state.quarterTurns,
      rotation: this.state.rotation,
      flipH: this.state.flipH ? -1 : 1,
      flipV: this.state.flipV ? -1 : 1,
      scale: this.state.scale,
      panX: this.state.panX,
      panY: this.state.panY,
      cropRect: { ...this.state.cropRect },
      gridOpacity: this.isInteracting ? 1 : (this.config.showGrid === true ? 1 : 0),
    };

    this.renderer.setDisplayState(ds);
  }

  private setupPointerTracking(): void {
    this.pointerTracker = createPointerTracker(this.canvas, {
      onPointerDown: (pointer, pointers) => {
        // Double-tap detection (spec section 2.11)
        const now = Date.now();
        const dt = now - this.lastTapTime;
        const dist = Math.sqrt(
          (pointer.x - this.lastTapX) ** 2 + (pointer.y - this.lastTapY) ** 2,
        );
        if (dt < 300 && dist < 20 && pointers.length === 1) {
          this.setScale(1);
          this.lastTapTime = 0;
          return;
        }
        this.lastTapTime = now;
        this.lastTapX = pointer.x;
        this.lastTapY = pointer.y;

        if (pointers.length === 2) {
          // Start pinch zoom
          this.pinchState = startPinch(pointers, this.state.scale);
          this.dragState = null;
          this.resizeState = null;
          return;
        }

        const cropRect = this.renderer!.getCanvasCropRect();
        const target = hitTest(pointer.x, pointer.y, cropRect);
        this.currentHitTarget = target;
        this.isInteracting = true;

        if (target.type === 'crop-area') {
          this.dragState = startDragCrop(this.state.cropRect, pointer.x, pointer.y);
        } else if (target.type === 'handle' && target.position) {
          this.resizeState = startResize('handle-' + target.position, this.state.cropRect, pointer.x, pointer.y);
        }

        this.syncDisplayState();
      },

      onPointerMove: (pointer, pointers) => {
        if (!this.image) return;

        const cropRect = this.renderer!.getCanvasCropRect();

        // If dragging crop
        if (this.dragState) {
          const container = this.canvas.parentElement!;
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const is90 = Math.round(this.state.quarterTurns / 90) % 2 !== 0;
          const iw = this.image.naturalWidth;
          const ih = this.image.naturalHeight;
          const effectiveW = is90 ? ih : iw;
          const effectiveH = is90 ? iw : ih;
          const availableH = ch - 80;
          const fitScale = Math.min(cw / effectiveW, availableH / effectiveH, 1);
          const displayW = effectiveW * fitScale;
          const displayH = effectiveH * fitScale;

          const newCrop = updateDragCrop(this.dragState, pointer.x, pointer.y, displayW, displayH);
          this.state = applyCropMove(this.state, newCrop);
          this.syncDisplayState();
          this.config.onChange?.(this.getTransformState());
          this.config.onCropChange?.(this.getCropRect());
          return;
        }

        // If resizing
        if (this.resizeState) {
          const container = this.canvas.parentElement!;
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const is90 = Math.round(this.state.quarterTurns / 90) % 2 !== 0;
          const iw = this.image.naturalWidth;
          const ih = this.image.naturalHeight;
          const effectiveW = is90 ? ih : iw;
          const effectiveH = is90 ? iw : ih;
          const availableH = ch - 80;
          const fitScale = Math.min(cw / effectiveW, availableH / effectiveH, 1);
          const displayW = effectiveW * fitScale;
          const displayH = effectiveH * fitScale;

          const newCrop = updateResize(
            this.resizeState,
            pointer.x,
            pointer.y,
            displayW,
            displayH,
            this.cropShape,
            this.config.minCropSize,
            { shiftKey: pointer.shiftKey, altKey: pointer.altKey },
          );
          this.state = applyCropMove(this.state, newCrop);
          this.syncDisplayState();
          this.config.onChange?.(this.getTransformState());
          this.config.onCropChange?.(this.getCropRect());
          return;
        }

        // Hover — update cursor
        const target = hitTest(pointer.x, pointer.y, cropRect);
        const cursor = getCursor(target, false);
        this.canvas.style.cursor = cursor;
      },

      onPointerUp: (_pointer, pointers) => {
        if (pointers.length < 2) {
          this.pinchState = null;
        }
        if (pointers.length === 0) {
          this.dragState = null;
          this.resizeState = null;
          this.isInteracting = false;
          this.syncDisplayState();
        }
      },

      onPinch: (e) => {
        if (!this.pinchState) {
          this.pinchState = { initialDistance: e.distance, initialScale: this.state.scale, initialCenterX: e.centerX, initialCenterY: e.centerY };
        }
        const newScale = this.state.scale * (e.distance / this.pinchState.initialDistance);
        const panDeltaX = e.centerX - this.pinchState.initialCenterX;
        const panDeltaY = e.centerY - this.pinchState.initialCenterY;
        this.state = applyScale(this.state, newScale, this.config.minScale, this.config.maxScale);
        this.state = applyPan(this.state, panDeltaX, panDeltaY);
        this.zoomSlider?.setValue(this.state.scale);
        this.syncDisplayState();
        this.config.onChange?.(this.getTransformState());
      },

      onWheel: (e) => {
        if (!this.config.wheelZoom) return;
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const result = handleWheelZoom(e.deltaY, this.state.scale, {
          minScale: this.config.minScale,
          maxScale: this.config.maxScale,
          sensitivity: 1,
        }, cursorX, cursorY, centerX, centerY);

        this.state = applyScale(this.state, result.scale, this.config.minScale, this.config.maxScale);
        this.state = applyPan(this.state, result.panDeltaX, result.panDeltaY);
        this.zoomSlider?.setValue(this.state.scale);
        this.syncDisplayState();
        this.config.onChange?.(this.getTransformState());
      },
    });
  }

  private showLoading(): void {
    if (this.loadingOverlay) {
      removeClass(this.loadingOverlay, 'ci-crop-loading--hidden');
    }
    if (this.errorOverlay) {
      removeClass(this.errorOverlay, 'ci-crop-error--visible');
    }
  }

  private hideLoading(): void {
    if (this.loadingOverlay) {
      addClass(this.loadingOverlay, 'ci-crop-loading--hidden');
    }
  }

  private showError(message: string): void {
    this.hideLoading();
    if (this.errorOverlay) {
      this.errorOverlay.textContent = message;
      addClass(this.errorOverlay, 'ci-crop-error--visible');
    }
  }
}
