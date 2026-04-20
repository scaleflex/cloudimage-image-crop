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
import type { SfxCropCanvasElement } from './sfx-crop-canvas';
import type { SfxCropToolbarElement, SfxCropToolbarCommand } from './sfx-crop-toolbar';
import type { SfxCropZoomElement } from './sfx-crop-zoom';
import './sfx-crop-zoom';
import { SfxCropBaseElement } from './base';
// Shared stylesheet — tokens on :host(+.ci-crop-container) with --sfx-cr-*
// prefix. Per-element `static styles` split is on the roadmap; for 2.0.0 the
// full sheet is injected once via unsafeCSS.
import CSS_STRING from '../styles/index.css?inline';

/**
 * `<sfx-crop>` — Scaleflex interactive image-crop editor web component.
 *
 * P2: full open shadow-DOM root. Renders `<sfx-crop-canvas>` plus an optional
 * `<sfx-crop-toolbar>` and a zoom slider. A {@link createCropController}
 * instance drives the canvas/pointer/keyboard pipeline using the pre-created
 * `<canvas>` ref — it never re-creates the canvas node, so pointer capture
 * and non-passive wheel listeners stay stable across Lit updates.
 *
 * Events (all `bubbles: true, composed: true`):
 *   - `sfx-crop-ready`  `{ element }`
 *   - `sfx-crop-image-load` `{ image }`
 *   - `sfx-crop-change` `TransformState`
 *   - `sfx-crop-crop-change` `CropRect` (image-pixel coords)
 *   - `sfx-crop-save`   `{ blob, dataURL, params }` (from imperative `.save()`)
 *   - `sfx-crop-cancel` (from imperative `.cancel()`)
 *   - `sfx-crop-error`  `{ error }`
 *
 * Theme a consumer via `--sfx-cr-*` custom properties set on the host, or via
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

  @property({ type: String, attribute: 'show-grid' }) showGridAttr: string | boolean = 'interaction';

  @property({ type: Boolean, attribute: 'show-toolbar' }) showToolbar = true;
  @property({ type: Boolean, attribute: 'show-rotate-slider' }) showRotateSlider = true;
  @property({ type: Boolean, attribute: 'show-zoom-slider' }) showZoomSlider = true;
  @property({ type: Boolean, attribute: 'show-shape-selector' }) showShapeSelector = true;
  @property({ type: Boolean, attribute: 'show-rotate-button' }) showRotateButton = true;
  @property({ type: Boolean, attribute: 'show-flip-button' }) showFlipButton = true;
  @property({ type: Boolean, attribute: 'show-flip-v-button' }) showFlipVButton = true;
  @property({ type: Boolean, attribute: 'show-bleed-margin' }) showBleedMargin = false;
  @property({ type: Boolean, attribute: 'enable-animations' }) enableAnimations = true;
  @property({ type: Boolean }) keyboard = true;
  @property({ type: Boolean, attribute: 'pinch-zoom' }) pinchZoom = true;
  @property({ type: Boolean, attribute: 'wheel-zoom' }) wheelZoom = true;

  @property({ attribute: 'available-shapes' })
  availableShapes: CropShapeName[] | string = ['free', 'square', 'circle', 'rounded-rect', '16:9', '4:3', '3:2'];

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

  firstUpdated(): void {
    setupAria(this);

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

  updated(changed: PropertyValues): void {
    if (!this.controller) return;
    const delta: Partial<SfxCropConfig> = {};
    let has = false;

    const forward = <K extends keyof SfxCropConfig>(prop: keyof SfxCropElement, key: K, value: SfxCropConfig[K]): void => {
      if (changed.has(prop as PropertyKey)) {
        delta[key] = value;
        has = true;
      }
    };

    forward('src', 'src', this.src);
    forward('cropShape', 'cropShape', this.cropShape);
    forward('theme', 'theme', this.theme);
    forward('minScale', 'minScale', this.minScale);
    forward('maxScale', 'maxScale', this.maxScale);
    forward('borderRadius', 'borderRadius', this.borderRadius);
    forward('showBleedMargin', 'showBleedMargin', this.showBleedMargin);
    forward('bleedMarginSize', 'bleedMarginSize', this.bleedMarginSize);
    forward('bleedMarginColor', 'bleedMarginColor', this.bleedMarginColor);
    forward('enableAnimations', 'enableAnimations', this.enableAnimations);
    forward('animationSpeed', 'animationSpeed', this.animationSpeed);
    forward('keyboard', 'keyboard', this.keyboard);
    forward('pinchZoom', 'pinchZoom', this.pinchZoom);
    forward('wheelZoom', 'wheelZoom', this.wheelZoom);

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
        this.cropShape = detail.value;
        this.controller.setCropShape(detail.value);
        break;
    }
  };

  // === Public imperative API ===

  loadImage(src: string): Promise<void> { return this.ensure().loadImage(src); }
  getTransformState(): TransformState { return this.ensure().getTransformState(); }
  setCropShape(shape: CropShapeName): void {
    this.cropShape = shape;
    this.ensure().setCropShape(shape);
  }
  setCropRect(rect: CropRect): void { this.ensure().setCropRect(rect); }
  getCropRect(): CropRect { return this.ensure().getCropRect(); }
  rotateLeft(): void { this.ensure().rotateLeft(); }
  flipHorizontal(): void { this.ensure().flipHorizontal(); }
  flipVertical(): void { this.ensure().flipVertical(); }
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
    if (!this.controller) throw new Error('<sfx-crop> not connected — wait for "sfx-crop-ready" or firstUpdated().');
    return this.controller;
  }

  private dispatch(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private parseShowGrid(): boolean | 'interaction' {
    const v = this.showGridAttr;
    if (v === true || v === 'true' || v === '') return true;
    if (v === false || v === 'false') return false;
    return 'interaction';
  }

  private parseAvailableShapes(): CropShapeName[] {
    if (Array.isArray(this.availableShapes)) return this.availableShapes;
    if (typeof this.availableShapes === 'string' && this.availableShapes.trim()) {
      return this.availableShapes.split(/[\s,]+/).filter(Boolean) as CropShapeName[];
    }
    return ['free', 'square', 'circle', 'rounded-rect', '16:9', '4:3', '3:2'];
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
      availableShapes: this.parseAvailableShapes(),
      handleSize: this.handleSize,
      handleColor: this.handleColor,
      borderRadius: this.borderRadius,
      outputType: this.outputType,
      outputQuality: this.outputQuality,
      maxOutputWidth: this.maxOutputWidth,
      maxOutputHeight: this.maxOutputHeight,
      overlayColor: this.overlayColor,
      showGrid: this.parseShowGrid(),
      showToolbar: this.showToolbar,
      showRotateSlider: this.showRotateSlider,
      showZoomSlider: this.showZoomSlider,
      showShapeSelector: this.showShapeSelector,
      showRotateButton: this.showRotateButton,
      showFlipButton: this.showFlipButton,
      showFlipVButton: this.showFlipVButton,
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

declare global {
  interface HTMLElementTagNameMap {
    'sfx-crop': SfxCropElement;
  }
}
