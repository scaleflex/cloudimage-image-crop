import { html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { CloudimageCropBaseElement } from './base';
import { clamp } from '../utils/math';
import { resolveIcon } from './icons';
import type { CropIconOverrides } from '../core/types';
import { baseStyles } from '../styles/shared.css';
import { sfxCropZoomStyles } from './cloudimage-crop-zoom.styles';
import { createPopoverAnchor, type PopoverAnchor } from './popover-anchor';

/**
 * Logarithmic mapping between an internal slider-space [0, 1] and the
 * consumer-facing exponential [min, max] scale. Keeps the scrubbing feel
 * consistent across asymmetric zoom ranges (e.g. 0.5× … 5×).
 */
function scaleToSlider(scale: number, minScale: number, maxScale: number): number {
  return Math.log(scale / minScale) / Math.log(maxScale / minScale);
}
function sliderToScale(value: number, minScale: number, maxScale: number): number {
  return minScale * Math.pow(maxScale / minScale, value);
}

/** Ruler geometry — tick density + visible viewport width in px. */
const PX_PER_UNIT = 260; // 1 full slider-space unit (0 → 1) == 260px drag.
const RULER_WIDTH = 260;
const TICK_COUNT = 40; // ticks spread evenly across the [0, 1] slider range.
const MAJOR_EVERY = 5;

/**
 * `<cloudimage-crop-zoom>` — loupe trigger + ruler scrubber popover.
 *
 * The trigger matches the toolbar's other icon buttons. Click opens a
 * transparent ruler of dotted ticks under a fixed center indicator; drag
 * left/right to scrub zoom. Ruler operates in logarithmic slider-space
 * (so 1× is exactly at one end of the range proportional to `min/max`),
 * and the center label shows the current percentage of the scale.
 *
 * Event:
 *   `cloudimage-crop-zoom-change` — `{ detail: { scale: number } }`, bubbles + composed.
 */
export class CloudimageCropZoomElement extends CloudimageCropBaseElement {
  static styles = [baseStyles, sfxCropZoomStyles];

  @property({ type: Number }) min = 0.5;
  @property({ type: Number }) max = 5;
  @property({ type: Number }) value = 1;
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) icons: CropIconOverrides = {};

  @state() private dragging = false;

  private activePointer: number | null = null;
  private pointerStartX = 0;
  private pointerStartSlider = 0;

  /**
   * Timer id for {@link showTemporarily}'s auto-close. Non-null only while
   * the popover was opened by wheel-zoom activity and is awaiting an idle
   * window before collapsing again. Any manual interaction (trigger click,
   * ruler drag) clears it so the popover stays open under the user's hand.
   */
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  private docClickHandler = (): void => {
    if (this.open) {
      this.clearAutoClose();
      this.open = false;
    }
  };

  private popoverAnchor: PopoverAnchor = createPopoverAnchor(this, '.ci-crop-zoom-popover');

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.docClickHandler);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.docClickHandler);
    this.popoverAnchor.stop();
    this.clearAutoClose();
  }

  updated(changed: PropertyValues): void {
    if (changed.has('open')) {
      if (this.open) this.popoverAnchor.start();
      else this.popoverAnchor.stop();
    }
    if (this.open && (changed.has('value') || changed.has('dragging'))) {
      this.popoverAnchor.update();
    }
  }

  render(): unknown {
    const sliderPos = scaleToSlider(this.value, this.min, this.max);
    const percent = Math.round(this.value * 100);
    // Translate ticks so the current slider position lands at the center
    // indicator. Drag right → ticks shift right → slider-pos decreases.
    const offset = RULER_WIDTH / 2 - sliderPos * PX_PER_UNIT;

    const ticks: { pos: number; major: boolean }[] = [];
    const step = 1 / TICK_COUNT;
    for (let i = 0; i <= TICK_COUNT; i++) {
      ticks.push({ pos: i * step, major: i % MAJOR_EVERY === 0 });
    }

    return html`
      <div
        class="ci-crop-zoom-root"
        @click=${(e: Event) => e.stopPropagation()}
        @keydown=${this.onKeyDown}
      >
        <button
          type="button"
          class="ci-crop-zoom-trigger"
          aria-label=${`Zoom — ${percent}%`}
          aria-haspopup="dialog"
          aria-expanded=${this.open ? 'true' : 'false'}
          @click=${this.onTriggerClick}
        >${unsafeHTML(resolveIcon('loupe', this.icons))}</button>

        <div class="ci-crop-zoom-popover" role="group" aria-label="Zoom controls">
          <div
            class=${`ci-crop-zoom-ruler${this.dragging ? ' is-dragging' : ''}`}
            role="slider"
            aria-valuemin=${String(this.min)}
            aria-valuemax=${String(this.max)}
            aria-valuenow=${this.value.toFixed(2)}
            aria-valuetext=${`${percent}%`}
            tabindex="0"
            style=${`--ruler-w: ${RULER_WIDTH}px`}
            @pointerdown=${this.onPointerDown}
            @pointermove=${this.onPointerMove}
            @pointerup=${this.onPointerUp}
            @pointercancel=${this.onPointerUp}
            @dblclick=${this.onReset}
          >
            <div class="ci-crop-zoom-ticks" style=${`transform: translateX(${offset.toFixed(1)}px)`}>
              ${ticks.map((t) => html`
                <span
                  class=${`ci-crop-zoom-tick${t.major ? ' ci-crop-zoom-tick--major' : ''}`}
                  style=${`left: ${(t.pos * PX_PER_UNIT).toFixed(1)}px`}
                ></span>
              `)}
            </div>
            <div class="ci-crop-zoom-indicator" aria-hidden="true"></div>
          </div>
          <span class="ci-crop-zoom-value">${percent}%</span>
        </div>
      </div>
    `;
  }

  /** Sync value without emitting — used by host to reflect controller state. */
  setValue(scale: number): void {
    this.value = clamp(scale, this.min, this.max);
  }

  /**
   * Open the popover and auto-close after `duration` ms of inactivity.
   * Subsequent calls debounce the close (so a stream of wheel events keeps
   * the slider visible). Manual interaction (trigger click, ruler drag)
   * cancels the pending close.
   *
   * If the popover is already open via manual click (no timer armed) this
   * is a no-op: a wheel burst must never hijack a user-opened popover into
   * auto-closing.
   */
  showTemporarily(duration = 1500): void {
    if (this.open && this.autoCloseTimer === null) return;
    const wasOpen = this.open;
    this.open = true;
    if (!wasOpen) {
      this.dispatchEvent(new CustomEvent('cloudimage-crop-popover-open', {
        detail: { source: 'zoom' },
        bubbles: true,
        composed: true,
      }));
    }
    this.clearAutoClose();
    this.autoCloseTimer = setTimeout(() => {
      this.autoCloseTimer = null;
      this.open = false;
    }, duration);
  }

  private clearAutoClose(): void {
    if (this.autoCloseTimer !== null) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
  }

  private onTriggerClick = (e: Event): void => {
    e.stopPropagation();
    this.clearAutoClose();
    this.open = !this.open;
    if (this.open) {
      this.dispatchEvent(new CustomEvent('cloudimage-crop-popover-open', {
        detail: { source: 'zoom' },
        bubbles: true,
        composed: true,
      }));
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.open = false;
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const step = e.shiftKey ? 0.05 : 0.01;
      const current = scaleToSlider(this.value, this.min, this.max);
      const next = clamp(current + delta * step, 0, 1);
      this.emit(sliderToScale(next, this.min, this.max));
    }
  };

  // --- Pointer scrubbing ---
  private onPointerDown = (e: PointerEvent): void => {
    if (this.activePointer !== null) return;
    // User is now driving the slider by hand — drop any pending auto-close
    // so the popover doesn't vanish mid-drag.
    this.clearAutoClose();
    this.activePointer = e.pointerId;
    this.pointerStartX = e.clientX;
    this.pointerStartSlider = scaleToSlider(this.value, this.min, this.max);
    this.dragging = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture failure — drag still works inside the element.
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.activePointer !== e.pointerId) return;
    const deltaX = e.clientX - this.pointerStartX;
    // Drag right → ticks shift right → slider value DECREASES (physical).
    const nextSlider = clamp(this.pointerStartSlider - deltaX / PX_PER_UNIT, 0, 1);
    this.emit(sliderToScale(nextSlider, this.min, this.max));
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
  };

  private emit(scale: number): void {
    if (this.value === scale) return;
    this.value = scale;
    this.dispatchEvent(new CustomEvent('cloudimage-crop-zoom-change', {
      detail: { scale },
      bubbles: true,
      composed: true,
    }));
  }

  private onReset = (): void => {
    this.emit(1);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'cloudimage-crop-zoom': CloudimageCropZoomElement;
  }
}
