import { html, css } from 'lit';
import { property, query } from 'lit/decorators.js';
import { SfxCropBaseElement } from './base';
import { clamp } from '../utils/math';
import { ICON_ZOOM_IN, ICON_ZOOM_OUT } from './icons';

/**
 * Logarithmic mapping between the slider's linear [0, 1] track and the
 * consumer-facing exponential [min, max] scale. Matches the behavior of the
 * legacy `createZoomSlider` so zoom feels identical after the Lit port.
 */
function scaleToSlider(scale: number, minScale: number, maxScale: number): number {
  return Math.log(scale / minScale) / Math.log(maxScale / minScale);
}
function sliderToScale(value: number, minScale: number, maxScale: number): number {
  return minScale * Math.pow(maxScale / minScale, value);
}

/**
 * `<sfx-crop-zoom>` — minus/plus buttons + range input + percent label.
 *
 * Light DOM so the parent `<sfx-crop>`'s shadow stylesheet (carrying the
 * legacy `.ci-crop-zoom-*` rules) applies without duplication.
 *
 * Public value is a `scale` (`min`..`max`, default 1). Double-click on the
 * input resets to 1. Buttons nudge by ±10% multiplicatively.
 *
 * Event:
 *   `sfx-crop-zoom-change` — `{ detail: { scale: number } }`, bubbles + composed.
 */
export class SfxCropZoomElement extends SfxCropBaseElement {
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  static styles = css``;

  @property({ type: Number }) min = 0.5;
  @property({ type: Number }) max = 5;
  @property({ type: Number }) value = 1;

  @query('input[type="range"]') private inputEl!: HTMLInputElement;
  @query('.ci-crop-zoom-label') private labelEl!: HTMLSpanElement;

  render(): unknown {
    return html`
      <div class="ci-crop-zoom-slider">
        <button
          type="button"
          class="ci-crop-zoom-btn"
          aria-label="Zoom out"
          @click=${this.onMinus}
          .innerHTML=${ICON_ZOOM_OUT}
        ></button>
        <input
          type="range"
          class="ci-crop-zoom-input"
          min="0"
          max="1"
          step="0.001"
          .value=${String(scaleToSlider(this.value, this.min, this.max))}
          aria-label="Zoom"
          aria-valuemin=${String(this.min)}
          aria-valuemax=${String(this.max)}
          aria-valuenow=${this.value.toFixed(2)}
          aria-valuetext=${`${Math.round(this.value * 100)}%`}
          @input=${this.onInput}
          @dblclick=${this.onReset}
        />
        <span class="ci-crop-zoom-label">${Math.round(this.value * 100)}%</span>
        <button
          type="button"
          class="ci-crop-zoom-btn"
          aria-label="Zoom in"
          @click=${this.onPlus}
          .innerHTML=${ICON_ZOOM_IN}
        ></button>
      </div>
    `;
  }

  /** Sync value without emitting — used by host to reflect controller state. */
  setValue(scale: number): void {
    const v = clamp(scale, this.min, this.max);
    this.value = v;
  }

  private emit(scale: number): void {
    this.value = scale;
    this.dispatchEvent(new CustomEvent('sfx-crop-zoom-change', {
      detail: { scale },
      bubbles: true,
      composed: true,
    }));
  }

  private onInput = (e: Event): void => {
    const sliderVal = parseFloat((e.target as HTMLInputElement).value);
    const scale = sliderToScale(sliderVal, this.min, this.max);
    this.emit(scale);
  };

  private onMinus = (): void => {
    const v = clamp(this.value * 0.9, this.min, this.max);
    this.emit(v);
  };

  private onPlus = (): void => {
    const v = clamp(this.value * 1.1, this.min, this.max);
    this.emit(v);
  };

  private onReset = (): void => {
    this.emit(1);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'sfx-crop-zoom': SfxCropZoomElement;
  }
}
