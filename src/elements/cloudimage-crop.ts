import { html, type PropertyValues } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { createCropController, type CropController } from '../core/crop-controller';
import type { CloudimageUrlOptions, CropDescriptor } from '../export/cloudimage-url';
import { mergeConfig } from '../core/config';
import { setupAria } from '../a11y/aria';
import type {
  CloudimageCropConfig,
  CropShapeName,
  CropRect,
  TransformState,
  TransformParams,
  CropIconOverrides,
} from '../core/types';
import { CloudimageCropCanvasElement } from './cloudimage-crop-canvas';
import type { CloudimageCropToolbarElement, CloudimageCropToolbarCommand } from './cloudimage-crop-toolbar';
import { CloudimageCropBaseElement } from './base';
import { parseAvailableShapes, DEFAULT_SHAPES } from './parse-shapes';
import { getAspectRatio } from '../transforms/constrain';
import { MOVE_HANDLE_OFFSET } from '../canvas/crop-frame';
import { FORWARDED_HANDLE } from '../interactions/pointer-tracker';
import { designTokens, baseStyles, spinKeyframes } from '../styles/shared.css';
import { sfxCropStyles } from './cloudimage-crop.styles';

/** Which edge(s) of the box a ResizableFrame handle drags. */
type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** Smallest box side (px) a ResizableFrame drag will shrink the element to. */
const MIN_RESIZE_PX = 80;

/**
 * `variant:'fixed', cropShape:'free'` handle positions — 8 points around the
 * box's own edge/corners. Drags change the HOST ELEMENT's own width/height
 * directly (see ResizableFrame handlers below); there's no separate crop
 * rect for this case, the box IS the frame.
 */
const RESIZE_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
/** Classic frame corner dots, rendered in the DOM so they can overhang the photo edge. */
const CORNERS = ['nw', 'ne', 'se', 'sw'] as const;

/**
 * Lit `@property` converter for the tri-state `show-grid` attribute, which
 * accepts `"true" | "false" | "interaction"` (string or empty-shorthand), and
 * exposes it on the element as a real `boolean | 'interaction'` property.
 */
const SHOW_GRID_CONVERTER = {
  fromAttribute(v: string | null): boolean | 'interaction' {
    if (v === null) return 'interaction';
    if (v === 'true' || v === '') return true;
    if (v === 'false') return false;
    return 'interaction';
  },
  toAttribute(v: boolean | 'interaction'): string {
    return v === true ? 'true' : v === false ? 'false' : 'interaction';
  },
};

/**
 * `<cloudimage-crop>` — Scaleflex interactive image-crop editor web component.
 *
 * Renders `<cloudimage-crop-canvas>` plus an optional `<cloudimage-crop-toolbar>` and a zoom
 * slider inside an open shadow root. A {@link createCropController} instance
 * drives the canvas / pointer / keyboard pipeline against the pre-created
 * `<canvas>` ref — the canvas node is never re-created, so pointer capture and
 * non-passive `wheel` listeners stay stable across Lit updates.
 *
 * Events (all `bubbles: true, composed: true`):
 *   - `cloudimage-crop-ready`        `{ element }`
 *   - `cloudimage-crop-image-load`   `{ image }`
 *   - `cloudimage-crop-change`       `TransformState`
 *   - `cloudimage-crop-crop-change`  `CropRect` (image-pixel coords)
 *   - `cloudimage-crop-save`         `{ blob, dataURL, params, url, descriptor }` (from imperative `.save()`; `blob`/`dataURL` are null when `outputMode="cloudimage"`)
 *   - `cloudimage-crop-cancel`       (from imperative `.cancel()`)
 *   - `cloudimage-crop-error`        `{ error }`
 *
 * Theme via `--ci-crop-*` custom properties set on the host, or via
 * `::part(container|canvas-host|toolbar|loading|error)` from light DOM.
 */
export class CloudimageCropElement extends CloudimageCropBaseElement {
  static styles = [designTokens, baseStyles, spinKeyframes, sfxCropStyles];

  // === Attributes mirroring CloudimageCropConfig ===

  @property({ type: String, reflect: true }) src = '';
  @property({ type: String, attribute: 'crop-shape', reflect: true }) cropShape: CropShapeName = '16:9';
  @property({ type: String, reflect: true }) theme: 'light' | 'dark' = 'light';

  @property({ type: Number, attribute: 'initial-rotation' }) initialRotation = 0;
  @property({ type: Number, attribute: 'initial-scale' }) initialScale = 1;
  @property({ type: Number, attribute: 'min-scale' }) minScale = 0.5;
  @property({ type: Number, attribute: 'max-scale' }) maxScale = 5;
  @property({ type: Number, attribute: 'min-crop-size' }) minCropSize = 20;
  @property({ type: Number, attribute: 'handle-size' }) handleSize = 12;
  @property({ type: Number, attribute: 'border-radius' }) borderRadius = 20;
  @property({ type: Number, attribute: 'output-quality' }) outputQuality = 0.92;
  @property({ type: Number, attribute: 'max-output-width' }) maxOutputWidth = 0;
  @property({ type: Number, attribute: 'max-output-height' }) maxOutputHeight = 0;
  @property({ type: Number, attribute: 'bleed-margin-size' }) bleedMarginSize = 10;
  @property({ type: Number, attribute: 'animation-speed' }) animationSpeed = 1.0;

  @property({ type: String, attribute: 'handle-color' }) handleColor = '#ffffff';
  @property({ type: String, attribute: 'overlay-color' }) overlayColor = 'rgba(0, 0, 0, 0.55)';
  @property({ type: String, attribute: 'bleed-margin-color' }) bleedMarginColor = 'rgba(255, 0, 0, 0.5)';
  @property({ type: String, attribute: 'output-type' }) outputType = 'image/png';
  @property({ type: String, attribute: 'toolbar-position', reflect: true }) toolbarPosition: 'bottom' | 'top' = 'top';

  /**
   * What `.save()` emits: `'blob'` (default — rasterized canvas crop) or
   * `'cloudimage'` (a server-side Cloudimage transform URL; `blob`/`dataURL`
   * in the save event are then null). See `toCloudimageURL()`.
   */
  @property({ type: String, attribute: 'output-mode' }) outputMode: 'blob' | 'cloudimage' = 'blob';
  @property({ type: String, attribute: 'cloudimage-token' }) cloudimageToken = '';
  @property({ type: String, attribute: 'cloudimage-domain' }) cloudimageDomain = '';
  @property({ type: String, attribute: 'cloudimage-bg-color' }) cloudimageBgColor = '';

  /**
   * Display variant. `'classic'` (default) = movable/resizable frame over a
   * photo-aspect canvas. `'fixed'` = the editor box IS the crop frame (sized to
   * `cropShape`), with the photo cover-fit and panned underneath; toolbar
   * overlays the frame.
   */
  @property({ type: String, reflect: true }) variant: 'classic' | 'fixed' = 'classic';

  /** `true | false | 'interaction'` (default). Attribute accepts all three as strings. */
  @property({ attribute: 'show-grid', converter: SHOW_GRID_CONVERTER })
  showGrid: boolean | 'interaction' = 'interaction';

  @property({ type: Boolean, attribute: 'show-toolbar' }) showToolbar = true;
  @property({ type: Boolean, attribute: 'show-rotate-slider' }) showRotateSlider = true;
  @property({ type: Boolean, attribute: 'show-zoom-slider' }) showZoomSlider = true;
  @property({ type: Boolean, attribute: 'show-shape-selector' }) showShapeSelector = true;
  @property({ type: Boolean, attribute: 'show-rotate-button' }) showRotateButton = true;
  @property({ type: Boolean, attribute: 'show-flip-button' }) showFlipButton = true;
  /**
   * Show a "Cancel" button in the toolbar (top-left, mirrors "Done"). Off by
   * default. Turn on for a host whose SIZE the user controls interactively
   * (ResizableFrame's `variant:'fixed', cropShape:'free'` drag) — an
   * external cancel button placed by the consumer can't track that resize
   * without reimplementing the toolbar's own positioning; this one already
   * lives inside the box. Emits `cloudimage-crop-cancel` via `cancel()`.
   */
  @property({ type: Boolean, attribute: 'show-cancel-button' }) showCancelButton = false;
  /**
   * Show the toolbar's primary "Done" button (top-right, calls `save()`). On by
   * default. Turn off when the host commits the crop through its own action —
   * e.g. an embedding dialog's "Apply" reading `toCropDescriptor()` /
   * `toCloudimageURL()` — so there aren't two competing confirm buttons.
   */
  @property({ type: Boolean, attribute: 'show-done-button' }) showDoneButton = true;
  @property({ type: Boolean, attribute: 'show-bleed-margin' }) showBleedMargin = false;
  @property({ type: Boolean, attribute: 'enable-animations' }) enableAnimations = true;
  @property({ type: Boolean }) keyboard = true;
  @property({ type: Boolean, attribute: 'pinch-zoom' }) pinchZoom = true;
  @property({ type: Boolean, attribute: 'wheel-zoom' }) wheelZoom = true;
  /**
   * Fade the toolbar (buttons + rotate ruler) to near-invisible while the
   * user is actively dragging/resizing/panning the crop frame, so the
   * controls don't compete with the photo for attention mid-gesture. Off
   * by default — opt in for editors where the toolbar visually crowds the
   * photo during a drag; most embeds are fine with it staying put.
   */
  @property({ type: Boolean, attribute: 'dim-toolbar-on-drag' }) dimToolbarOnDrag = false;

  @property({ attribute: 'available-shapes' })
  availableShapes: CropShapeName[] | string = [...DEFAULT_SHAPES];

  @property({ attribute: 'initial-crop' })
  initialCrop: CropRect | string | null = null;

  /**
   * Per-slot icon overrides. Values are raw SVG strings injected via
   * `unsafeHTML` — same trust model as the library's built-in icons
   * (static, author-trusted). Omit any slot to keep the default.
   * Not an HTML attribute; set via DOM property only.
   */
  @property({ attribute: false }) icons: CropIconOverrides = {};

  // === Internal reactive state ===
  @state() private loading = false;
  @state() private errorMessage: string | null = null;
  /** True while the user is actively dragging/resizing/panning the crop
   *  frame. Tracked unconditionally (cheap), but only forwarded as the
   *  `interacting` prop on `<cloudimage-crop-toolbar>` below when
   *  {@link dimToolbarOnDrag} is on — that's the actual opt-in switch. */
  @state() private isInteracting = false;

  // === Queries ===
  @query('cloudimage-crop-canvas') private canvasHost!: CloudimageCropCanvasElement;
  @query('cloudimage-crop-toolbar') private toolbarHost?: CloudimageCropToolbarElement;
  @query('.ci-crop-container') private containerEl!: HTMLDivElement;

  // === Runtime references ===
  private controller: CropController | null = null;
  private currentImage: HTMLImageElement | null = null;
  private parentResizeObserver: ResizeObserver | null = null;

  /**
   * User-set size for `variant:'fixed', cropShape:'free'` — set once a
   * ResizableFrame drag ends, cleared on shape/variant change or reset().
   * When present, fitHostToImage() honors it (clamped to the available box)
   * instead of computing an automatic size — the WHOLE editor box is the
   * crop frame in fixed variant, so resizing it directly (drag the box's own
   * edge, like a window) *is* how you resize the crop, no separate rect.
   */
  private _manualSize: { w: number; h: number } | null = null;
  /** The pending `cropShape` change came from a toolbar pick (see onToolbarCommand). */
  private _shapePicked = false;
  private _resizeDrag: { edge: ResizeEdge; startX: number; startY: number; startW: number; startH: number } | null = null;

  // === Lifecycle ===

  async firstUpdated(): Promise<void> {
    setupAria(this);

    // Guard: if @cloudimage/image-crop/define wasn't imported, canvasHost will be an
    // un-upgraded HTMLUnknownElement with no Lit lifecycle — bail with a
    // descriptive error rather than a cryptic "undefined.then" crash.
    if (!(this.canvasHost instanceof CloudimageCropCanvasElement)) {
      throw new Error(
        "<cloudimage-crop>: custom elements not registered. Import '@cloudimage/image-crop/define' before using the tag.",
      );
    }

    // <cloudimage-crop-canvas> is a child custom element; its template (the <canvas>)
    // only materializes after its own first update cycle. Awaiting the child's
    // updateComplete guarantees `canvasEl` is non-null before we hand it to
    // the controller.
    await this.canvasHost.updateComplete;

    // Fast mount/unmount (React StrictMode, router transitions) could have
    // removed us during the microtask gap — don't leak a controller for a
    // detached host.
    if (!this.isConnected) return;

    const canvas = this.canvasHost.canvasEl;
    const config = mergeConfig(this.buildConfig());
    this.controller = createCropController({
      canvas,
      host: this,
      // Pass the canvas host (which we size to the image's display rect)
      // so the controller's ResizeObserver and renderer measure the tight
      // photo box — not the outer column that also includes toolbars.
      layoutContainer: this.canvasHost,
      config,
      callbacks: {
        onReady: () => this.dispatch('cloudimage-crop-ready', { element: this }),
        onImageLoad: (image) => {
          this.currentImage = image;
          this.fitHostToImage();
          this.dispatch('cloudimage-crop-image-load', { image });
        },
        onError: (error) => this.dispatch('cloudimage-crop-error', { error }),
        onChange: (s) => {
          this.dispatch('cloudimage-crop-change', s);
        },
        onCropChange: (c) => this.dispatch('cloudimage-crop-crop-change', c),
        onRotationSync: (deg) => this.toolbarHost?.setRotationValue(deg),
        onShapeSync: (shape) => {
          // Keep the reflected attribute in step with controller-driven
          // changes (e.g. reset()) so later attribute reads — and the
          // toolbar's next render — see the current shape.
          this.cropShape = shape;
          this.toolbarHost?.setShapeValue(shape);
        },
        onScaleSync: () => {},
        onLoadingChange: (loading, error) => {
          this.loading = loading;
          this.errorMessage = error;
        },
        onInteractingChange: (interacting) => {
          this.isInteracting = interacting;
        },
        onFrameLayout: (rect) => this.placeCornerHandles(rect),
        // Classic box follows the turned photo — from every path (toolbar,
        // keyboard R, restoreState, shape/variant switch).
        onBoxAspectChange: () => this.fitHostToImage(),
      },
    });

    // Track the parent's width so the editor re-fits to image aspect as
    // the surrounding layout changes (window resize, sidebar collapse, ...).
    const parent = this.parentElement;
    if (parent) {
      this.parentResizeObserver = new ResizeObserver(() => this.fitHostToImage());
      this.parentResizeObserver.observe(parent);
    }

    if (this.src) this.controller.loadImage(this.src);
  }

  /** @see LIVE_CONFIG_KEYS for the exact set forwarded to `controller.update()`. */
  updated(changed: PropertyValues): void {
    if (!this.controller) return;
    const delta: Partial<CloudimageCropConfig> = {};
    let has = false;
    for (const key of LIVE_CONFIG_KEYS) {
      // A toolbar pick already reached the controller via setCropShape().
      if (key === 'cropShape' && this._shapePicked) continue;
      if (changed.has(key)) {
        (delta as Record<string, unknown>)[key] = this[key];
        has = true;
      }
    }
    this._shapePicked = false;
    if (has) this.controller.update(delta);

    // The editor box aspect depends on `variant` + `cropShape` in the fixed
    // variant (box = frame aspect), so re-fit when either changes. Cheap no-op
    // in classic, where the box always tracks the photo aspect.
    if (changed.has('variant') || changed.has('cropShape')) {
      // Leaving the one combination ResizableFrame applies to (fixed + free)
      // drops any manual size — re-entering it later starts from a fresh
      // auto-fit, not a stale drag result from a different shape/variant.
      if (!(this.variant === 'fixed' && this.cropShape === 'free')) {
        this._manualSize = null;
      }
      this.fitHostToImage();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.parentResizeObserver?.disconnect();
    this.parentResizeObserver = null;
    window.removeEventListener('pointermove', this.onResizeHandlePointerMove);
    window.removeEventListener('pointerup', this.onResizeHandlePointerUp);
    this._resizeDrag = null;
    this.controller?.destroy();
    this.controller = null;
  }

  render(): unknown {
    return html`
      <div class="ci-crop-container" part="container">
        <cloudimage-crop-canvas part="canvas-host"></cloudimage-crop-canvas>
        ${this.showToolbar ? html`
          <cloudimage-crop-toolbar
            part="toolbar"
            .shape=${this.cropShape}
            ?show-rotate-button=${this.showRotateButton}
            ?show-flip-button=${this.showFlipButton}
            ?show-rotate-slider=${this.showRotateSlider}
            ?show-shape-selector=${this.showShapeSelector}
            ?show-cancel-button=${this.showCancelButton}
            .showDoneButton=${this.showDoneButton}
            toolbar-position=${this.toolbarPosition}
            variant=${this.variant}
            ?interacting=${this.dimToolbarOnDrag && this.isInteracting}
            .availableShapes=${this.availableShapes}
            .icons=${this.icons}
            @cloudimage-crop-toolbar-command=${this.onToolbarCommand}
          ></cloudimage-crop-toolbar>
        ` : null}
        <div class=${classMap({ 'ci-crop-loading': true, 'ci-crop-loading--hidden': !this.loading })} part="loading">
          <div class="ci-crop-loading-spinner"></div>
          <div class="ci-crop-loading-text">Loading…</div>
        </div>
        <div class=${classMap({ 'ci-crop-error': true, 'ci-crop-error--visible': !!this.errorMessage })} part="error">
          ${this.errorMessage ?? 'Failed to load image'}
        </div>
      </div>
      ${this.variant === 'fixed' && this.cropShape === 'free' ? this.renderResizeHandles() : null}
      ${this.variant !== 'fixed'
        ? html`
            ${CORNERS.map((c) => html`<div
              class="ci-crop-corner ci-crop-corner--${c}"
              data-corner=${c}
              part="corner-handle"
              hidden
              @pointerdown=${this.forwardHandlePointerDown}
            ></div>`)}
            <div
              class="ci-crop-move"
              data-corner="move"
              part="move-handle"
              hidden
              @pointerdown=${this.forwardHandlePointerDown}
            ></div>
          `
        : null}
    `;
  }

  /**
   * A DOM handle can sit (partly) outside the canvas, where the canvas never
   * sees the pointer. Re-dispatch the press on the canvas at the same client
   * coordinates: the pointer tracker measures relative to the canvas (negative
   * offsets included) and its hit zones reach past the frame edge, so it picks
   * the corner / move-handle and captures the pointer for the rest of the drag.
   */
  private forwardHandlePointerDown = (e: PointerEvent): void => {
    const canvas = this.canvasHost?.canvasEl;
    if (!canvas) return;
    e.preventDefault();
    e.stopPropagation();
    const dot = e.currentTarget as HTMLElement;
    const press = new PointerEvent('pointerdown', e);
    // Name the grabbed handle so the controller doesn't have to hit-test an
    // off-canvas point (the NW corner's overhang lies in the move-handle zone).
    (press as unknown as Record<string, unknown>)[FORWARDED_HANDLE] = dot.dataset.corner;
    canvas.dispatchEvent(press);
    // Normally the tracker's setPointerCapture() on the canvas routes the rest
    // of the drag there. Where an engine refuses capture for a synthetic press
    // (the tracker swallows that error), the moves would land on this dot and
    // the drag would die — so capture on the dot instead and relay them.
    if (canvas.hasPointerCapture?.(e.pointerId)) return;
    try {
      dot.setPointerCapture(e.pointerId);
    } catch {
      // Pointer already gone — nothing to relay.
      return;
    }
    const relay = (ev: PointerEvent): void => {
      if (ev.pointerId !== e.pointerId) return;
      canvas.dispatchEvent(new PointerEvent(ev.type, ev));
      if (ev.type === 'pointerup' || ev.type === 'pointercancel') {
        dot.removeEventListener('pointermove', relay);
        dot.removeEventListener('pointerup', relay);
        dot.removeEventListener('pointercancel', relay);
      }
    };
    dot.addEventListener('pointermove', relay);
    dot.addEventListener('pointerup', relay);
    dot.addEventListener('pointercancel', relay);
  };

  /**
   * Classic: place the frame's corner dots. They are DOM siblings of the
   * clipping `.ci-crop-container` (like the fixed variant's resize handles), so
   * a frame flush with the photo edge shows each dot centred on its corner,
   * overhanging the edge, instead of three quarters clipped by the canvas.
   * Called by the renderer on every drawn frame (follows the animation). A press
   * on a dot is forwarded to the canvas (forwardHandlePointerDown), which
   * hit-tests and runs the drag.
   */
  private placeCornerHandles(rect: { x: number; y: number; width: number; height: number }): void {
    const dots = this.renderRoot.querySelectorAll<HTMLElement>('.ci-crop-corner, .ci-crop-move');
    if (!dots.length || !this.canvasHost) return;
    // Canvas CSS px → :host px (the canvas host sits inside the container).
    const container = this.canvasHost.parentElement as HTMLElement | null;
    const ox = this.canvasHost.offsetLeft + (container?.offsetLeft ?? 0);
    const oy = this.canvasHost.offsetTop + (container?.offsetTop ?? 0);
    const at: Record<string, [number, number]> = {
      nw: [rect.x, rect.y],
      ne: [rect.x + rect.width, rect.y],
      se: [rect.x + rect.width, rect.y + rect.height],
      sw: [rect.x, rect.y + rect.height],
      // Same diagonal offset the canvas used for its own move-handle dot.
      move: [rect.x - MOVE_HANDLE_OFFSET, rect.y - MOVE_HANDLE_OFFSET],
    };
    for (const dot of dots) {
      const [x, y] = at[dot.dataset.corner ?? 'nw'];
      dot.style.transform = `translate(${ox + x}px, ${oy + y}px) translate(-50%, -50%)`;
      dot.hidden = false;
    }
  }

  /**
   * Drag-the-box-edge handles for `variant:'fixed', cropShape:'free'` — a
   * sibling of `.ci-crop-container`, not a child. That container is
   * `overflow: clip` (it masks the photo to the frame shape); handles half
   * outside the box's own edge would just get clipped away in there. `:host`
   * itself has no overflow rule, so this is the outermost box they can sit
   * on and still be visible/hittable at the true element edge.
   */
  private renderResizeHandles(): unknown {
    return html`
      ${RESIZE_EDGES.map((edge) => html`
        <div
          class="ci-crop-resize-handle ci-crop-resize-handle--${edge}"
          part="resize-handle"
          @pointerdown=${(e: PointerEvent) => this.onResizeHandlePointerDown(e, edge)}
        ></div>
      `)}
    `;
  }

  // === Toolbar command router ===

  private onToolbarCommand = (e: Event): void => {
    if (!this.controller) return;
    const detail = (e as CustomEvent<CloudimageCropToolbarCommand>).detail;
    switch (detail.type) {
      case 'reset':
        // Clear any ResizableFrame drag result too — reset means back to
        // the auto-fit box, not "keep my last manual size".
        this._manualSize = null;
        this.controller.reset();
        this.fitHostToImage();
        break;
      case 'rotate-left': this.rotateLeft(); break;
      case 'flip-h': this.controller.flipHorizontal(); break;
      case 'rotation': this.controller.setRotation(detail.value); break;
      case 'scale': this.controller.setScale(detail.value); break;
      case 'shape':
        // A USER pick, not a config change: apply it directly so Reset can undo
        // it (update({ cropShape }) would make it the new starting shape). The
        // controller's onShapeSync reflects it to `cropShape`; `updated()` skips
        // forwarding that one change back as config.
        this._shapePicked = true;
        this.controller.setCropShape(detail.value);
        this.cropShape = detail.value;
        break;
      case 'save':
        // Builds blob + dataURL + params and dispatches `cloudimage-crop-save`.
        void this.save();
        break;
      case 'cancel':
        this.cancel();
        break;
    }
  };

  // === Public imperative API ===

  loadImage(src: string): Promise<void> { return this.ensure().loadImage(src); }
  getTransformState(): TransformState { return this.ensure().getTransformState(); }
  setCropShape(shape: CropShapeName): void {
    this.ensure();
    this.cropShape = shape;
  }
  setCropRect(rect: CropRect): void { this.ensure().setCropRect(rect); }
  getCropRect(): CropRect { return this.ensure().getCropRect(); }
  rotateLeft(): void { this.ensure().rotateLeft(); }
  flipHorizontal(): void { this.ensure().flipHorizontal(); }
  setRotation(deg: number): void { this.ensure().setRotation(deg); }
  setScale(scale: number): void { this.ensure().setScale(scale); }
  /**
   * Restore a previously-saved {@link CropDescriptor} (from `toCropDescriptor()`
   * / a `cloudimage-crop-save` event) — full parity including 90°/tilt
   * rotation, flip, and pan, not just the crop rectangle. Call once the image
   * has loaded, e.g. from a `cloudimage-crop-image-load` listener.
   */
  restoreState(descriptor: CropDescriptor): void { this.ensure().restoreState(descriptor); }
  reset(): void {
    this._manualSize = null;
    this.ensure().reset();
    this.fitHostToImage();
  }
  toCanvas(): HTMLCanvasElement { return this.ensure().toCanvas(); }
  toBlob(type?: string, quality?: number): Promise<Blob> { return this.ensure().toBlob(type, quality); }
  toDataURL(type?: string, quality?: number): string { return this.ensure().toDataURL(type, quality); }
  toTransformParams(): TransformParams { return this.ensure().toTransformParams(); }
  /**
   * Build a Cloudimage URL reproducing the current crop/transform server-side.
   * For a free-TILTED crop, `await calibrateCloudimage()` once per image first
   * (save() does this itself) — uncalibrated, the CDN framing is a heuristic
   * that can select the wrong region on some images; a console warning flags it.
   */
  toCloudimageURL(options?: Partial<CloudimageUrlOptions>): string { return this.ensure().toCloudimageURL(options); }
  /** Serializable snapshot to reproduce the crop as a Cloudimage URL server-side. */
  toCropDescriptor(): CropDescriptor { return this.ensure().toCropDescriptor(); }
  /**
   * Detect & cache the per-image Cloudimage framing so a FREE-TILT
   * `toCloudimageURL()` matches the canvas exactly. Probes the CDN once per image
   * (async); `save()` awaits this automatically for tilted `cloudimage` output.
   */
  calibrateCloudimage(): Promise<'centered' | 'inset' | null> { return this.ensure().calibrateCloudimage(); }

  /**
   * Emit the crop result via `cloudimage-crop-save`. In the default `'blob'`
   * `outputMode` the detail carries the rasterized `blob` + `dataURL` (plus a
   * best-effort Cloudimage `url` when a token is configured). In `'cloudimage'`
   * mode the canvas is never rasterized — `blob`/`dataURL` are `null` and `url`
   * holds the Cloudimage transform URL.
   */
  async save(type?: string, quality?: number): Promise<void> {
    const params = this.toTransformParams();

    // For a FREE-TILT cloudimage export, calibrate the per-image CDN framing
    // first so the emitted `url`/`descriptor` reproduce the canvas exactly.
    // (Per-image, cached after the first probe; non-tilt crops are exact without
    // it; failures fall back to the builder's best-effort heuristic.)
    if (this.outputMode === 'cloudimage') {
      let tilted = false;
      try { tilted = this.toCropDescriptor().state.rotation % 90 !== 0; } catch { tilted = false; }
      if (tilted) { try { await this.ensure().calibrateCloudimage(); } catch { /* keep heuristic */ } }
    }

    let url: string | null = null;
    let descriptor: CropDescriptor | null = null;
    try { descriptor = this.toCropDescriptor(); } catch { descriptor = null; }
    try { url = this.toCloudimageURL(); } catch { url = null; }

    if (this.outputMode === 'cloudimage') {
      this.dispatch('cloudimage-crop-save', { blob: null, dataURL: null, params, url, descriptor });
      return;
    }
    const blob = await this.toBlob(type, quality);
    const dataURL = this.toDataURL(type, quality);
    this.dispatch('cloudimage-crop-save', { blob, dataURL, params, url, descriptor });
  }

  cancel(): void {
    this.dispatch('cloudimage-crop-cancel', undefined);
  }

  // === Internals ===

  private ensure(): CropController {
    if (!this.controller) {
      throw new Error('<cloudimage-crop> not connected — wait for "cloudimage-crop-ready" or firstUpdated().');
    }
    return this.controller;
  }

  /**
   * Size both the canvas host (to the image's display rect, no letterbox)
   * and the outer `<cloudimage-crop>` host (photo rect + measured toolbar stack).
   *
   * Bound order for `max-width` / `max-height`:
   *   1. Consumer-provided values on the host's own CSS / inline style.
   *   2. Parent's client rect as a fallback.
   *   3. Viewport size as a last resort.
   *
   * Called on image-load, on state changes (90° rotation swaps aspect),
   * and whenever the parent resizes.
   */
  private fitHostToImage(): void {
    if (!this.currentImage || !this.isConnected || !this.canvasHost) return;

    // Box dimensions follow the photo's aspect. Classic: the box may be turned
    // (`turnedBox` — a free-shape quarter turn makes the box follow the photo; a
    // picked ratio keeps it). Fixed keeps the natural aspect: its box is the
    // frame, and only the photo spins inside it.
    const turned = this.variant !== 'fixed' && !!this.controller?.getTransformState().turnedBox;
    const effW = turned ? this.currentImage.naturalHeight : this.currentImage.naturalWidth;
    const effH = turned ? this.currentImage.naturalWidth : this.currentImage.naturalHeight;

    // Clear inline dims before measuring so we don't read back our own
    // previous output — classic feedback-loop gotcha in auto-sized layouts.
    const savedW = this.style.width;
    const savedH = this.style.height;
    this.style.width = '';
    this.style.height = '';

    const parseMax = (raw: string): number => {
      if (!raw || raw === 'none') return Number.POSITIVE_INFINITY;
      const v = parsePx(raw);
      return Number.isFinite(v) && v > 0 ? v : Number.POSITIVE_INFINITY;
    };

    const hostStyle = getComputedStyle(this);
    let maxW = parseMax(hostStyle.maxWidth);
    let maxH = parseMax(hostStyle.maxHeight);

    const parent = this.parentElement;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    // Hidden parent (display:none, inactive tab) reports clientWidth=0.
    // Without a bail-out we'd fall through to maxW=Infinity and blow the
    // host up to the image's natural size.
    if (parent && parentStyle && (parentStyle.display === 'none' || parent.clientWidth === 0)) {
      this.style.width = savedW;
      this.style.height = savedH;
      return;
    }
    // `clientWidth` returns the padding-box width — laying out a child
    // against that overruns the parent's content-box by 2×padding and
    // causes the crop to overflow containers like cards/cells. Subtract
    // the parent's own padding so we measure the content area instead.
    const parentInnerWidth = (): number => {
      if (!parent || !parentStyle) return 0;
      const raw = parent.clientWidth;
      return Math.max(0, raw - (parsePx(parentStyle.paddingLeft) || 0) - (parsePx(parentStyle.paddingRight) || 0));
    };
    // Width: the parent is almost always horizontally definite (block
    // flow follows its container), so parent.clientWidth reflects the
    // available space. Cap by it even when CSS max-width is set —
    // otherwise a desktop-sized cap leaks past a narrow mobile viewport
    // and the photo overflows the container.
    const parentW = parentInnerWidth();
    if (parentW > 0) maxW = Math.min(maxW, parentW);
    else if (!Number.isFinite(maxW)) maxW = window.innerWidth;
    // Height: do NOT clamp by parent.clientHeight. `getComputedStyle`
    // returns the *used* value (px) for height even when the CSS rule
    // is `auto`, so we can't cheaply tell auto-sized parents from
    // definite ones — and for the common auto case, parent.clientHeight
    // echoes our own previous content height. Clamping by it creates a
    // one-way shrink loop: the host shrinks once on a viewport
    // contraction, then can't grow back because parentH still reads
    // the small previous value. Consumers who need to fit a fixed-
    // height container should set `max-height` on <cloudimage-crop> (as the
    // demo does with `max-height: 640px`) — that path is honored above
    // via getComputedStyle(this).maxHeight.
    if (!Number.isFinite(maxH)) maxH = window.innerHeight;

    this.style.width = savedW;
    this.style.height = savedH;

    // Toolbars are absolute-positioned overlays on top of the photo, so
    // they don't eat any canvas height — the full max-height budget goes
    // to the image.
    const availW = maxW;
    const availH = maxH;
    if (availW <= 0 || availH <= 0) return;

    let displayW: number;
    let displayH: number;
    if (this.variant === 'fixed' && this.cropShape === 'free' && this._manualSize) {
      // ResizableFrame override: the user dragged the box's own edge to a
      // specific size — honor it (clamped to what's actually available, e.g.
      // after the window/parent shrank) instead of the auto-fit below.
      displayW = Math.floor(Math.min(this._manualSize.w, availW));
      displayH = Math.floor(Math.min(this._manualSize.h, availH));
    } else if (this.variant === 'fixed') {
      // Fixed variant: the editor box IS the crop frame — size it to the
      // frame's aspect (maximal, centered within the available area). The
      // photo cover-fills it, so upscaling the box past the photo's natural
      // size is fine (unlike classic, which caps at fit ≤ 1).
      // `free`'s fallback is the PHOTO's own aspect, not the available-area
      // aspect: opening (or switching back to) Custom should show the whole
      // photo uncropped first — sized to match it exactly — rather than
      // starting from an arbitrary modal-shaped box that immediately
      // cover-fit-crops into a portrait/square photo before the user has
      // touched anything. ResizableFrame takes over from there once resized.
      const boxAspect = this.fixedFrameAspect(effW / effH);
      let dW = availW;
      let dH = availW / boxAspect;
      if (dH > availH) {
        dH = availH;
        dW = availH * boxAspect;
      }
      displayW = Math.floor(dW);
      displayH = Math.floor(dH);
    } else {
      const fit = Math.min(availW / effW, availH / effH, 1);
      displayW = Math.floor(effW * fit);
      displayH = Math.floor(effH * fit);
    }

    // Size only the outer host to the photo rect — toolbars float on top
    // via `position: absolute`. The inner canvas host stays at CSS
    // 100%/100%, which means it tracks the container's content-box
    // (border-box minus border-width). Setting it explicitly here would
    // make it 100% of the OUTER host instead, overflowing the container
    // by 2×border-width and producing mismatched corner radii.
    const prevW = parsePx(savedW);
    const prevH = parsePx(savedH);
    if (Number.isNaN(prevW) || Math.abs(prevW - displayW) >= 1 || Math.abs(prevH - displayH) >= 1) {
      this.style.width = `${displayW}px`;
      this.style.height = `${displayH}px`;
    }
  }


  /**
   * The `max-width` / `max-height` budget fitHostToImage() would compute —
   * factored out so a live ResizableFrame drag can clamp to the same bound
   * (can't drag the box past what the consumer's CSS / parent actually
   * allows) without re-running the full clear-before-measure dance that
   * method needs (that dance guards against reading back this element's OWN
   * inline size through a fit-content parent — irrelevant here since a drag
   * only reads static `max-width`/`max-height` and the parent's clientWidth,
   * neither of which this element's own width feeds back into).
   */
  private measureAvailableBox(): { availW: number; availH: number } {
    const parseMax = (raw: string): number => {
      if (!raw || raw === 'none') return Number.POSITIVE_INFINITY;
      const v = parsePx(raw);
      return Number.isFinite(v) && v > 0 ? v : Number.POSITIVE_INFINITY;
    };
    const hostStyle = getComputedStyle(this);
    let maxW = parseMax(hostStyle.maxWidth);
    let maxH = parseMax(hostStyle.maxHeight);

    const parent = this.parentElement;
    const parentStyle = parent ? getComputedStyle(parent) : null;
    if (parent && parentStyle) {
      const raw = parent.clientWidth;
      const parentW = Math.max(0, raw - (parsePx(parentStyle.paddingLeft) || 0) - (parsePx(parentStyle.paddingRight) || 0));
      if (parentW > 0) maxW = Math.min(maxW, parentW);
      else if (!Number.isFinite(maxW)) maxW = window.innerWidth;
    } else if (!Number.isFinite(maxW)) {
      maxW = window.innerWidth;
    }
    if (!Number.isFinite(maxH)) maxH = window.innerHeight;

    return { availW: maxW, availH: maxH };
  }

  // === ResizableFrame — drag the box's own edge in variant:'fixed',
  // cropShape:'free' (the whole box IS the crop frame there; resizing it
  // directly *is* how you resize the crop). Handles live in render() below,
  // shown only for that combination. ===

  private onResizeHandlePointerDown = (e: PointerEvent, edge: ResizeEdge): void => {
    e.preventDefault();
    e.stopPropagation();
    const rect = this.getBoundingClientRect();
    this._resizeDrag = { edge, startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height };
    this.isInteracting = true;
    window.addEventListener('pointermove', this.onResizeHandlePointerMove);
    window.addEventListener('pointerup', this.onResizeHandlePointerUp);
  };

  private onResizeHandlePointerMove = (e: PointerEvent): void => {
    const drag = this._resizeDrag;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const { availW, availH } = this.measureAvailableBox();

    let w = drag.startW;
    let h = drag.startH;
    if (drag.edge.includes('e')) w = drag.startW + dx;
    if (drag.edge.includes('w')) w = drag.startW - dx;
    if (drag.edge.includes('s')) h = drag.startH + dy;
    if (drag.edge.includes('n')) h = drag.startH - dy;
    w = Math.max(MIN_RESIZE_PX, Math.min(w, availW));
    h = Math.max(MIN_RESIZE_PX, Math.min(h, availH));
    w = Math.round(w);
    h = Math.round(h);

    this.style.width = `${w}px`;
    this.style.height = `${h}px`;
    // Commit on every move tick, not just pointerup: a height change here
    // resizes an auto-height parent (e.g. this library's own demo wrap),
    // which fires `parentResizeObserver` mid-drag and calls fitHostToImage()
    // — with `_manualSize` still null at that point it would fall through to
    // the auto-fit branch and immediately snap the box back, undoing the
    // drag in real time. Keeping `_manualSize` in lockstep makes that
    // mid-drag fitHostToImage() call idempotent instead (reapplies the same
    // size). Width-only drags don't trigger this (a fixed-width parent's
    // clientWidth doesn't depend on the child), which is why only s/n/corner
    // edges were affected.
    this._manualSize = { w, h };
    // Resize the canvas in lockstep with the box, right now — the
    // controller's own ResizeObserver debounces by 16ms to coalesce
    // external reflows, which is the wrong tradeoff for a drag WE are
    // already driving tick by tick: a fast drag keeps resetting that
    // timer and the canvas visibly lags the box (empty container
    // background showing in the gap) until the drag slows or stops.
    this.controller?.forceResize();
  };

  private onResizeHandlePointerUp = (): void => {
    if (!this._resizeDrag) return;
    this._resizeDrag = null;
    this.isInteracting = false;
    window.removeEventListener('pointermove', this.onResizeHandlePointerMove);
    window.removeEventListener('pointerup', this.onResizeHandlePointerUp);
    // Commit the DOM's actual rendered size (not the last computed w/h) so a
    // subsequent fitHostToImage() (parent resize, etc.) clamps from the same
    // number the browser actually painted.
    const rect = this.getBoundingClientRect();
    this._manualSize = { w: rect.width, h: rect.height };
  };

  /**
   * Aspect ratio (W/H) of the fixed-variant editor box for the current shape.
   * `free` uses whatever `fallback` the caller passes (the photo's own
   * aspect, so opening/reselecting Custom shows the whole photo first);
   * `square` / `circle` / `rounded-rect` are square; ratio shapes use their
   * parsed ratio.
   */
  private fixedFrameAspect(fallback: number): number {
    const shape = this.cropShape;
    if (shape === 'free') return fallback;
    if (shape === 'rounded-rect') return 1;
    const r = getAspectRatio(shape);
    return r && r > 0 ? r : fallback;
  }

  private dispatch(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private parseInitialCrop(): CropRect | null {
    const v = this.initialCrop;
    if (!v) return null;
    const raw = typeof v === 'object' ? v : safeJsonParse(v);
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.x !== 'number' || typeof r.y !== 'number' ||
        typeof r.width !== 'number' || typeof r.height !== 'number') return null;
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }

  private buildConfig(): Partial<CloudimageCropConfig> {
    return {
      src: this.src,
      variant: this.variant,
      cropShape: this.cropShape,
      theme: this.theme,
      initialRotation: this.initialRotation,
      initialScale: this.initialScale,
      initialCrop: this.parseInitialCrop(),
      minScale: this.minScale,
      maxScale: this.maxScale,
      minCropSize: this.minCropSize,
      availableShapes: parseAvailableShapes(this.availableShapes) ?? [...DEFAULT_SHAPES],
      handleSize: this.handleSize,
      handleColor: this.handleColor,
      borderRadius: this.borderRadius,
      outputType: this.outputType,
      outputQuality: this.outputQuality,
      maxOutputWidth: this.maxOutputWidth,
      maxOutputHeight: this.maxOutputHeight,
      outputMode: this.outputMode,
      cloudimageToken: this.cloudimageToken,
      cloudimageDomain: this.cloudimageDomain,
      cloudimageBgColor: this.cloudimageBgColor,
      overlayColor: this.overlayColor,
      showGrid: this.showGrid,
      showToolbar: this.showToolbar,
      showRotateSlider: this.showRotateSlider,
      showZoomSlider: this.showZoomSlider,
      showShapeSelector: this.showShapeSelector,
      showRotateButton: this.showRotateButton,
      showFlipButton: this.showFlipButton,
      toolbarPosition: this.toolbarPosition,
      showBleedMargin: this.showBleedMargin,
      bleedMarginSize: this.bleedMarginSize,
      bleedMarginColor: this.bleedMarginColor,
      enableAnimations: this.enableAnimations,
      animationSpeed: this.animationSpeed,
      keyboard: this.keyboard,
      pinchZoom: this.pinchZoom,
      wheelZoom: this.wheelZoom,
    };
  }
}

/**
 * Element properties whose runtime mutations the controller cares about. The
 * intersection typing ensures the key is spelled identically on both sides —
 * a misspelling fails the build.
 */
const LIVE_CONFIG_KEYS = [
  'src', 'variant', 'cropShape', 'theme',
  'minScale', 'maxScale', 'minCropSize', 'borderRadius',
  'handleSize', 'handleColor', 'overlayColor',
  'showGrid', 'showBleedMargin', 'bleedMarginSize', 'bleedMarginColor',
  'enableAnimations', 'animationSpeed',
  'keyboard', 'pinchZoom', 'wheelZoom',
  'outputMode', 'cloudimageToken', 'cloudimageDomain', 'cloudimageBgColor',
] as const satisfies ReadonlyArray<keyof CloudimageCropConfig & keyof CloudimageCropElement>;

/**
 * Parse a CSS length to a px number. Returns NaN for non-px-resolved
 * computed values (e.g. unresolved `calc(...)`), letting callers treat
 * the result as "unknown" rather than silently truncating to the first
 * literal in the expression.
 */
function parsePx(raw: string): number {
  if (!raw) return NaN;
  const v = parseFloat(raw);
  if (!Number.isFinite(v)) return NaN;
  // `getComputedStyle` resolves to `<number>px` for resolvable lengths.
  // Anything else (calc(), var(), keywords) we treat as unknown.
  return /^-?\d*\.?\d+(?:px)?$/.test(raw.trim()) ? v : NaN;
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

declare global {
  interface HTMLElementTagNameMap {
    'cloudimage-crop': CloudimageCropElement;
  }
}
