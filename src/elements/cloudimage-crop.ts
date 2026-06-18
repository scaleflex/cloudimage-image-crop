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
import { designTokens, baseStyles, spinKeyframes } from '../styles/shared.css';
import { sfxCropStyles } from './cloudimage-crop.styles';

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
  @property({ type: Boolean, attribute: 'show-bleed-margin' }) showBleedMargin = false;
  @property({ type: Boolean, attribute: 'enable-animations' }) enableAnimations = true;
  @property({ type: Boolean }) keyboard = true;
  @property({ type: Boolean, attribute: 'pinch-zoom' }) pinchZoom = true;
  @property({ type: Boolean, attribute: 'wheel-zoom' }) wheelZoom = true;

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

  // === Queries ===
  @query('cloudimage-crop-canvas') private canvasHost!: CloudimageCropCanvasElement;
  @query('cloudimage-crop-toolbar') private toolbarHost?: CloudimageCropToolbarElement;
  @query('.ci-crop-container') private containerEl!: HTMLDivElement;

  // === Runtime references ===
  private controller: CropController | null = null;
  private currentImage: HTMLImageElement | null = null;
  private parentResizeObserver: ResizeObserver | null = null;

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
      if (changed.has(key)) {
        (delta as Record<string, unknown>)[key] = this[key];
        has = true;
      }
    }
    if (has) this.controller.update(delta);

    // The editor box aspect depends on `variant` + `cropShape` in the fixed
    // variant (box = frame aspect), so re-fit when either changes. Cheap no-op
    // in classic, where the box always tracks the photo aspect.
    if (changed.has('variant') || changed.has('cropShape')) {
      this.fitHostToImage();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.parentResizeObserver?.disconnect();
    this.parentResizeObserver = null;
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
            toolbar-position=${this.toolbarPosition}
            variant=${this.variant}
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
    `;
  }

  // === Toolbar command router ===

  private onToolbarCommand = (e: Event): void => {
    if (!this.controller) return;
    const detail = (e as CustomEvent<CloudimageCropToolbarCommand>).detail;
    switch (detail.type) {
      case 'reset': this.controller.reset(); break;
      case 'rotate-left': this.controller.rotateLeft(); break;
      case 'flip-h': this.controller.flipHorizontal(); break;
      case 'rotation': this.controller.setRotation(detail.value); break;
      case 'scale': this.controller.setScale(detail.value); break;
      case 'shape':
        // Property assignment only — `updated()` forwards to controller.
        this.cropShape = detail.value;
        break;
      case 'save':
        // Builds blob + dataURL + params and dispatches `cloudimage-crop-save`.
        void this.save();
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
  reset(): void { this.ensure().reset(); }
  toCanvas(): HTMLCanvasElement { return this.ensure().toCanvas(); }
  toBlob(type?: string, quality?: number): Promise<Blob> { return this.ensure().toBlob(type, quality); }
  toDataURL(type?: string, quality?: number): string { return this.ensure().toDataURL(type, quality); }
  toTransformParams(): TransformParams { return this.ensure().toTransformParams(); }
  /** Build a Cloudimage URL reproducing the current crop/transform server-side. */
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

    // Frame dimensions follow the photo's natural aspect and stay fixed
    // across 90° rotations — only the image pixels inside the canvas
    // spin in place.
    const effW = this.currentImage.naturalWidth;
    const effH = this.currentImage.naturalHeight;

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
    if (this.variant === 'fixed') {
      // Fixed variant: the editor box IS the crop frame — size it to the
      // frame's aspect (maximal, centered within the available area). The
      // photo cover-fills it, so upscaling the box past the photo's natural
      // size is fine (unlike classic, which caps at fit ≤ 1).
      const boxAspect = this.fixedFrameAspect(availW / availH);
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
   * Aspect ratio (W/H) of the fixed-variant editor box for the current shape.
   * `free` fills the host (uses the available-area aspect); `square` / `circle`
   * / `rounded-rect` are square; ratio shapes use their parsed ratio.
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
