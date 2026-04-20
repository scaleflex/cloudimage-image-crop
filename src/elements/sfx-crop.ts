/// <reference path="../vite-env.d.ts" />
import { html, css, unsafeCSS, type PropertyValues } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { createCropController, type CropController } from '../core/crop-controller';
import { mergeConfig } from '../core/config';
import { setupAria } from '../a11y/aria';
import type {
  SfxCropConfig,
  CropShapeName,
  CropRect,
  TransformState,
  TransformParams,
} from '../core/types';
import { SfxCropCanvasElement } from './sfx-crop-canvas';
import type { SfxCropToolbarElement, SfxCropToolbarCommand } from './sfx-crop-toolbar';
import type { SfxCropZoomElement } from './sfx-crop-zoom';
import './sfx-crop-zoom';
import { SfxCropBaseElement } from './base';
import { parseAvailableShapes, DEFAULT_SHAPES } from './parse-shapes';
// Shared stylesheet — tokens live on :host with --sfx-cr-* prefix, so
// consumers can theme from light DOM. Per-element `static styles` split is
// on the roadmap; for 2.0.0 the full sheet is injected once via unsafeCSS.
// INVARIANT: the sheet MUST NOT contain user-supplied content — unsafeCSS
// bypasses CSS escaping. Current source is a static asset we own.
import CSS_STRING from '../styles/index.css?inline';

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
 * `<sfx-crop>` — Scaleflex interactive image-crop editor web component.
 *
 * Renders `<sfx-crop-canvas>` plus an optional `<sfx-crop-toolbar>` and a zoom
 * slider inside an open shadow root. A {@link createCropController} instance
 * drives the canvas / pointer / keyboard pipeline against the pre-created
 * `<canvas>` ref — the canvas node is never re-created, so pointer capture and
 * non-passive `wheel` listeners stay stable across Lit updates.
 *
 * Events (all `bubbles: true, composed: true`):
 *   - `sfx-crop-ready`        `{ element }`
 *   - `sfx-crop-image-load`   `{ image }`
 *   - `sfx-crop-change`       `TransformState`
 *   - `sfx-crop-crop-change`  `CropRect` (image-pixel coords)
 *   - `sfx-crop-save`         `{ blob, dataURL, params }` (from imperative `.save()`)
 *   - `sfx-crop-cancel`       (from imperative `.cancel()`)
 *   - `sfx-crop-error`        `{ error }`
 *
 * Theme via `--sfx-cr-*` custom properties set on the host, or via
 * `::part(canvas-host|toolbar|zoom|loading|error|container)` from light DOM.
 */
export class SfxCropElement extends SfxCropBaseElement {
  static styles = [
    css`
      :host {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
      }
      :host([hidden]) { display: none; }
    `,
    unsafeCSS(CSS_STRING),
  ];

  // === Attributes mirroring SfxCropConfig ===

  @property({ type: String, reflect: true }) src = '';
  @property({ type: String, attribute: 'crop-shape', reflect: true }) cropShape: CropShapeName = 'free';
  @property({ type: String, reflect: true }) theme: 'light' | 'dark' = 'dark';

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
  @property({ type: String, attribute: 'toolbar-position' }) toolbarPosition: 'bottom' | 'top' = 'bottom';

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

  // === Internal reactive state ===
  @state() private loading = false;
  @state() private errorMessage: string | null = null;

  // === Queries ===
  @query('sfx-crop-canvas') private canvasHost!: SfxCropCanvasElement;
  @query('sfx-crop-toolbar') private toolbarHost?: SfxCropToolbarElement;
  @query('sfx-crop-zoom') private zoomHost?: SfxCropZoomElement;
  @query('.ci-crop-container') private containerEl!: HTMLDivElement;

  // === Runtime references ===
  private controller: CropController | null = null;

  // === Lifecycle ===

  async firstUpdated(): Promise<void> {
    setupAria(this);

    // Guard: if @scaleflex/crop/define wasn't imported, canvasHost will be an
    // un-upgraded HTMLUnknownElement with no Lit lifecycle — bail with a
    // descriptive error rather than a cryptic "undefined.then" crash.
    if (!(this.canvasHost instanceof SfxCropCanvasElement)) {
      throw new Error(
        "<sfx-crop>: custom elements not registered. Import '@scaleflex/crop/define' before using the tag.",
      );
    }

    // <sfx-crop-canvas> is a child custom element; its template (the <canvas>)
    // only materializes after its own first update cycle. Awaiting the child's
    // updateComplete guarantees `canvasEl` is non-null before we hand it to
    // the controller.
    await this.canvasHost.updateComplete;

    // If the host was removed from the DOM during the microtask window (fast
    // mount/unmount, e.g. React StrictMode or router transitions),
    // disconnectedCallback already ran with a null controller — don't leak one
    // by creating it now.
    if (!this.isConnected) return;

    const canvas = this.canvasHost.canvasEl;
    const config = mergeConfig(this.buildConfig());
    this.controller = createCropController({
      canvas,
      host: this,
      layoutContainer: this.containerEl,
      config,
      callbacks: {
        onReady: () => this.dispatch('sfx-crop-ready', { element: this }),
        onImageLoad: (image) => this.dispatch('sfx-crop-image-load', { image }),
        onError: (error) => this.dispatch('sfx-crop-error', { error }),
        onChange: (s) => this.dispatch('sfx-crop-change', s),
        onCropChange: (c) => this.dispatch('sfx-crop-crop-change', c),
        onRotationSync: (deg) => this.toolbarHost?.setRotationValue(deg),
        onShapeSync: (shape) => this.toolbarHost?.setShapeValue(shape),
        onScaleSync: (scale) => this.zoomHost?.setValue(scale),
        onLoadingChange: (loading, error) => {
          this.loading = loading;
          this.errorMessage = error;
        },
      },
    });

    if (this.src) this.controller.loadImage(this.src);
  }

  /** @see LIVE_CONFIG_KEYS for the exact set forwarded to `controller.update()`. */
  updated(changed: PropertyValues): void {
    if (!this.controller) return;
    const delta: Partial<SfxCropConfig> = {};
    let has = false;
    for (const key of LIVE_CONFIG_KEYS) {
      if (changed.has(key)) {
        // Keys are shared between SfxCropElement and SfxCropConfig by design;
        // the cast removes the structural-vs-nominal friction without losing
        // correctness (LIVE_CONFIG_KEYS is typed against both).
        (delta as Record<string, unknown>)[key] = this[key];
        has = true;
      }
    }
    if (has) this.controller.update(delta);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.controller?.destroy();
    this.controller = null;
  }

  render(): unknown {
    const containerClasses = {
      'ci-crop-container': true,
      'ci-crop-theme-light': this.theme === 'light',
      'ci-crop-theme-dark': this.theme !== 'light',
    };

    return html`
      <div class=${classMap(containerClasses)} part="container">
        <sfx-crop-canvas part="canvas-host"></sfx-crop-canvas>
        ${this.showToolbar ? html`
          <sfx-crop-toolbar
            part="toolbar"
            .shape=${this.cropShape}
            ?show-rotate-button=${this.showRotateButton}
            ?show-flip-button=${this.showFlipButton}
            ?show-rotate-slider=${this.showRotateSlider}
            ?show-shape-selector=${this.showShapeSelector}
            toolbar-position=${this.toolbarPosition}
            .availableShapes=${this.availableShapes}
            @sfx-crop-toolbar-command=${this.onToolbarCommand}
          ></sfx-crop-toolbar>
        ` : null}
        ${this.showZoomSlider ? html`
          <sfx-crop-zoom
            part="zoom"
            .min=${this.minScale}
            .max=${this.maxScale}
            @sfx-crop-zoom-change=${(e: CustomEvent<{ scale: number }>) => this.controller?.setScale(e.detail.scale)}
          ></sfx-crop-zoom>
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
    const detail = (e as CustomEvent<SfxCropToolbarCommand>).detail;
    switch (detail.type) {
      case 'rotate-left': this.controller.rotateLeft(); break;
      case 'flip-h': this.controller.flipHorizontal(); break;
      case 'rotation': this.controller.setRotation(detail.value); break;
      case 'shape':
        // Assign the property only — `updated()` forwards the delta to
        // `controller.update({ cropShape })`, which in turn calls
        // `setCropShape`. No explicit `controller.setCropShape(...)` here,
        // or the change/cropChange events fire twice per click.
        this.cropShape = detail.value;
        break;
    }
  };

  // === Public imperative API ===

  loadImage(src: string): Promise<void> { return this.ensure().loadImage(src); }
  getTransformState(): TransformState { return this.ensure().getTransformState(); }
  /**
   * Sets the crop shape. Internally assigns `this.cropShape`, which Lit
   * reflects through `updated()` into `controller.update({ cropShape })`.
   * Exposed as an imperative method purely for ergonomic parity with
   * `rotateLeft()`, `setScale()`, etc.
   */
  setCropShape(shape: CropShapeName): void {
    this.ensure(); // assert controller exists; throws with helpful message otherwise
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

  async save(type?: string, quality?: number): Promise<void> {
    const blob = await this.toBlob(type, quality);
    const dataURL = this.toDataURL(type, quality);
    const params = this.toTransformParams();
    this.dispatch('sfx-crop-save', { blob, dataURL, params });
  }

  cancel(): void {
    this.dispatch('sfx-crop-cancel', undefined);
  }

  // === Internals ===

  private ensure(): CropController {
    if (!this.controller) {
      throw new Error('<sfx-crop> not connected — wait for "sfx-crop-ready" or firstUpdated().');
    }
    return this.controller;
  }

  private dispatch(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private parseInitialCrop(): CropRect | null {
    const v = this.initialCrop;
    if (!v) return null;
    if (typeof v === 'object') return v;
    try { return JSON.parse(v) as CropRect; } catch { return null; }
  }

  private buildConfig(): Partial<SfxCropConfig> {
    return {
      src: this.src,
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
 *
 * Init-only keys (`initialRotation`, `initialScale`, `initialCrop`) and
 * template-driven keys (`showToolbar`, `availableShapes`, …) are intentionally
 * excluded — Lit's diff already re-renders the shadow DOM when they change.
 */
const LIVE_CONFIG_KEYS = [
  'src', 'cropShape', 'theme',
  'minScale', 'maxScale', 'minCropSize', 'borderRadius',
  'handleSize', 'handleColor', 'overlayColor',
  'showGrid', 'showBleedMargin', 'bleedMarginSize', 'bleedMarginColor',
  'enableAnimations', 'animationSpeed',
  'keyboard', 'pinchZoom', 'wheelZoom',
] as const satisfies ReadonlyArray<keyof SfxCropConfig & keyof SfxCropElement>;

declare global {
  interface HTMLElementTagNameMap {
    'sfx-crop': SfxCropElement;
  }
}
