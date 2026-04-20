import { html, css } from 'lit';
import { property, query } from 'lit/decorators.js';
import { SfxCropBaseElement } from './base';
import { clamp } from '../utils/math';

/**
 * `<sfx-crop-rotate>` — fine rotation slider (-45° … +45°) with a center tick
 * and "snap to zero" behaviour on release when within ±2°.
 *
 * Event:
 *   `sfx-crop-rotate-change` — `{ detail: { degrees: number } }`,
 *   bubbles + composed. Fired on every `input` and after the snap-to-zero
 *   release gesture.
 */
export class SfxCropRotateElement extends SfxCropBaseElement {
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  static styles = css``;

  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = -45;
  @property({ type: Number }) max = 45;
  @property({ type: Number }) step = 0.1;

  @query('input[type="range"]') private inputEl!: HTMLInputElement;

  render(): unknown {
    const formatted = `${this.value > 0 ? '+' : ''}${this.value.toFixed(1)}°`;
    return html`
      <div class="ci-crop-rotate-slider">
        <span class="ci-crop-rotate-range-label">${this.min}°</span>
        <div class="ci-crop-rotate-slider-track">
          <input
            type="range"
            class="ci-crop-rotate-input"
            .min=${String(this.min)}
            .max=${String(this.max)}
            .step=${String(this.step)}
            .value=${String(this.value)}
            aria-label="Fine rotation"
            aria-valuemin=${String(this.min)}
            aria-valuemax=${String(this.max)}
            aria-valuenow=${String(this.value)}
            aria-valuetext=${formatted}
            @input=${this.onInput}
            @mouseup=${this.onRelease}
            @touchend=${this.onRelease}
            @dblclick=${this.onReset}
          />
          <div class="ci-crop-rotate-center-tick"></div>
        </div>
        <span class="ci-crop-rotate-range-label">+${this.max}°</span>
        <span class="ci-crop-rotate-label">${formatted}</span>
      </div>
    `;
  }

  /** Sync value without emitting — used by host to reflect controller state. */
  setValue(degrees: number): void {
    this.value = clamp(degrees, this.min, this.max);
  }

  private emit(degrees: number): void {
    this.value = degrees;
    this.dispatchEvent(new CustomEvent('sfx-crop-rotate-change', {
      detail: { degrees },
      bubbles: true,
      composed: true,
    }));
  }

  private onInput = (e: Event): void => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    this.emit(v);
  };

  private onRelease = (): void => {
    // Snap to zero if the release lands within ±2° — matches the legacy UX.
    if (Math.abs(this.value) < 2) {
      this.emit(0);
    }
  };

  private onReset = (): void => {
    this.emit(0);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'sfx-crop-rotate': SfxCropRotateElement;
  }
}
