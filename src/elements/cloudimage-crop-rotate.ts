import { html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { CloudimageCropBaseElement } from './base';
import { clamp } from '../utils/math';
import type { CropIconOverrides } from '../core/types';
import { baseStyles } from '../styles/shared.css';
import { sfxCropRotateStyles } from './cloudimage-crop-rotate.styles';
import { createPopoverAnchor, type PopoverAnchor } from './popover-anchor';

/**
 * Physical pixels per 1° of tilt — sets the scrubbing feel of the ruler.
 * Bigger value ⇒ finger drag covers fewer degrees ⇒ finer control.
 */
const PX_PER_DEG = 6;
/** Visible width of the ruler viewport; shows ~±RULER_WIDTH/2/PX_PER_DEG degrees around the current value. */
const RULER_WIDTH = 260;
/** Tick step in degrees — dots are placed every 1°; every 5° gets a major dot. */
const TICK_STEP = 1;
const MAJOR_EVERY = 5;

/**
 * `<cloudimage-crop-rotate>` — always-visible fine-rotation ruler.
 *
 * Ticks scroll under a fixed center marker; the current degrees label sits
 * below. Drag the ruler left/right to tilt; double-click to reset.
 *
 * Event:
 *   `cloudimage-crop-rotate-change` — `{ detail: { degrees: number } }`,
 *   bubbles + composed.
 */
export class CloudimageCropRotateElement extends CloudimageCropBaseElement {
  static styles = [baseStyles, sfxCropRotateStyles];

  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = -45;
  @property({ type: Number }) max = 45;
  @property({ attribute: false }) icons: CropIconOverrides = {};

  @state() private dragging = false;

  private activePointer: number | null = null;
  private pointerStartX = 0;
  private pointerStartValue = 0;

  private popoverAnchor: PopoverAnchor = createPopoverAnchor(this, '.ci-crop-rotate-popover');

  connectedCallback(): void {
    super.connectedCallback();
    this.popoverAnchor.start();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.popoverAnchor.stop();
  }

  updated(changed: PropertyValues): void {
    if (changed.has('value') || changed.has('dragging')) {
      this.popoverAnchor.update();
    }
  }

  render(): unknown {
    const formatted = `${this.value > 0 ? '+' : ''}${this.value.toFixed(1)}°`;
    // Translate the tick strip so the current value sits under the fixed
    // center indicator. With drag-physical behaviour, dragging the ruler
    // right shifts ticks right and the value under the marker goes down.
    const offset = RULER_WIDTH / 2 - (this.value - this.min) * PX_PER_DEG;

    // Render only the ticks visible in the current viewport window plus
    // a few on each side so the strip looks continuous while scrolling.
    const visibleSpan = RULER_WIDTH / PX_PER_DEG;
    const padding = 4;
    const fromDeg = Math.max(this.min, Math.floor(this.value - visibleSpan / 2 - padding));
    const toDeg = Math.min(this.max, Math.ceil(this.value + visibleSpan / 2 + padding));

    const ticks: { deg: number; major: boolean }[] = [];
    for (let deg = Math.ceil(fromDeg / TICK_STEP) * TICK_STEP; deg <= toDeg; deg += TICK_STEP) {
      ticks.push({ deg, major: deg % MAJOR_EVERY === 0 });
    }

    return html`
      <div class="ci-crop-rotate-root" @keydown=${this.onKeyDown}>
        <div class="ci-crop-rotate-popover" role="group" aria-label="Fine rotation">
          <div
            class=${`ci-crop-rotate-ruler${this.dragging ? ' is-dragging' : ''}`}
            role="slider"
            aria-valuemin=${String(this.min)}
            aria-valuemax=${String(this.max)}
            aria-valuenow=${String(this.value)}
            aria-valuetext=${formatted}
            tabindex="0"
            style=${`--ruler-w: ${RULER_WIDTH}px`}
            @pointerdown=${this.onPointerDown}
            @pointermove=${this.onPointerMove}
            @pointerup=${this.onPointerUp}
            @pointercancel=${this.onPointerUp}
            @dblclick=${this.onReset}
          >
            <div class="ci-crop-rotate-ticks" style=${`transform: translateX(${offset.toFixed(1)}px)`}>
              ${ticks.map((t) => html`
                <span
                  class=${`ci-crop-rotate-tick${t.major ? ' ci-crop-rotate-tick--major' : ''}`}
                  style=${`left: ${((t.deg - this.min) * PX_PER_DEG).toFixed(1)}px`}
                ></span>
              `)}
            </div>
            <div class="ci-crop-rotate-indicator" aria-hidden="true"></div>
          </div>
          <span class="ci-crop-rotate-value">${formatted}</span>
        </div>
      </div>
    `;
  }

  /** Sync value without emitting — used by host to reflect controller state. */
  setValue(degrees: number): void {
    this.value = clamp(degrees, this.min, this.max);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.emit(clamp(this.value - (e.shiftKey ? 5 : 1), this.min, this.max));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.emit(clamp(this.value + (e.shiftKey ? 5 : 1), this.min, this.max));
    }
  };

  // --- Pointer scrubbing ---
  private onPointerDown = (e: PointerEvent): void => {
    if (this.activePointer !== null) return;
    this.activePointer = e.pointerId;
    this.pointerStartX = e.clientX;
    this.pointerStartValue = this.value;
    this.dragging = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore if capture fails — drag still works while pointer stays inside.
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.activePointer !== e.pointerId) return;
    const deltaX = e.clientX - this.pointerStartX;
    // Drag right moves the ruler right → ticks shift right → the value
    // under the center marker goes DOWN (physical scrolling).
    const next = this.pointerStartValue - deltaX / PX_PER_DEG;
    this.emit(clamp(next, this.min, this.max));
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.activePointer !== e.pointerId) return;
    this.activePointer = null;
    this.dragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Already released.
    }
    // Snap to zero if the release lands within ±2° — matches the legacy UX.
    if (Math.abs(this.value) < 2) this.emit(0);
  };

  private emit(degrees: number): void {
    if (this.value === degrees) return;
    this.value = degrees;
    this.dispatchEvent(new CustomEvent('cloudimage-crop-rotate-change', {
      detail: { degrees },
      bubbles: true,
      composed: true,
    }));
  }

  private onReset = (): void => {
    this.emit(0);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'cloudimage-crop-rotate': CloudimageCropRotateElement;
  }
}
