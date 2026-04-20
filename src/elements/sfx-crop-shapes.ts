import { html, css, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { SfxCropBaseElement } from './base';
import type { CropShapeName } from '../core/types';
import {
  ICON_CROP_FREE,
  ICON_CROP_SQUARE,
  ICON_CROP_CIRCLE,
  ICON_CROP_ROUNDED_RECT,
  ICON_CROP_LANDSCAPE,
  ICON_CROP_PORTRAIT,
  ICON_CHEVRON_DOWN,
} from './icons';

interface ShapeOption {
  value: CropShapeName;
  label: string;
  icon: string;
}

const ALL_SHAPES: ShapeOption[] = [
  { value: 'free', label: 'Free', icon: ICON_CROP_FREE },
  { value: 'square', label: 'Square', icon: ICON_CROP_SQUARE },
  { value: 'circle', label: 'Circle', icon: ICON_CROP_CIRCLE },
  { value: 'rounded-rect', label: 'Rounded', icon: ICON_CROP_ROUNDED_RECT },
  { value: '16:9', label: '16:9', icon: ICON_CROP_LANDSCAPE },
  { value: '4:3', label: '4:3', icon: ICON_CROP_LANDSCAPE },
  { value: '3:2', label: '3:2', icon: ICON_CROP_LANDSCAPE },
  { value: '2:3', label: '2:3', icon: ICON_CROP_PORTRAIT },
  { value: '3:4', label: '3:4', icon: ICON_CROP_PORTRAIT },
  { value: '9:16', label: '9:16', icon: ICON_CROP_PORTRAIT },
];

/**
 * `<sfx-crop-shapes>` — trigger + dropdown with aspect-ratio / shape presets.
 * Light DOM for stylesheet inheritance from the parent `<sfx-crop>`.
 *
 * Keyboard: Enter/Space toggles the dropdown; Arrow keys navigate options;
 * Enter/Space commits; Escape closes.
 *
 * Event:
 *   `sfx-crop-shape-change` — `{ detail: { shape: CropShapeName } }`,
 *   bubbles + composed.
 */
export class SfxCropShapesElement extends SfxCropBaseElement {
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  static styles = css``;

  @property({ type: String }) value: CropShapeName = 'free';

  /** Supported shape names (default covers the full preset set). */
  @property({ attribute: false })
  shapes: CropShapeName[] = ALL_SHAPES.map((s) => s.value);

  @state() private open = false;
  @state() private focusedIndex = -1;

  private docClickHandler = (): void => {
    if (this.open) this.close();
  };

  connectedCallback(): void {
    super.connectedCallback();
    // Closes when anything outside the shadow tree is clicked.
    document.addEventListener('click', this.docClickHandler);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.docClickHandler);
  }

  updated(changed: PropertyValues): void {
    if (changed.has('open') && this.open) {
      // Focus current selection after paint.
      requestAnimationFrame(() => {
        const idx = this.focusedIndex >= 0 ? this.focusedIndex : 0;
        this.focusOption(idx);
      });
    }
  }

  render(): unknown {
    const visible = ALL_SHAPES.filter((s) => this.shapes.includes(s.value));
    const current = visible.find((s) => s.value === this.value) ?? visible[0];

    return html`
      <div
        class=${`ci-crop-shape-selector${this.open ? ' ci-crop-shape-selector--open' : ''}`}
        @keydown=${this.onKeyDown}
        @click=${(e: Event) => e.stopPropagation()}
      >
        <button
          type="button"
          class="ci-crop-shape-trigger"
          aria-label="Select crop shape"
          aria-haspopup="listbox"
          aria-expanded=${this.open ? 'true' : 'false'}
          @click=${this.onTriggerClick}
        >
          <span class="ci-crop-shape-trigger-icon" .innerHTML=${current?.icon ?? ''}></span>
          <span class="ci-crop-shape-trigger-label">${current?.label ?? ''}</span>
          <span class="ci-crop-shape-chevron" .innerHTML=${ICON_CHEVRON_DOWN}></span>
        </button>
        <div class="ci-crop-shape-dropdown" role="listbox">
          ${visible.map((opt, i) => html`
            <button
              type="button"
              class=${`ci-crop-shape-option${opt.value === this.value ? ' ci-crop-shape-option--active' : ''}`}
              role="option"
              aria-selected=${opt.value === this.value ? 'true' : 'false'}
              style=${`transition-delay:${i * 20}ms`}
              @click=${(e: Event) => this.onOptionClick(e, opt.value)}
              data-index=${String(i)}
            >
              <span class="ci-crop-shape-option-icon" .innerHTML=${opt.icon}></span>
              <span class="ci-crop-shape-option-label">${opt.label}</span>
            </button>
          `)}
        </div>
      </div>
    `;
  }

  /** Sync value without emitting — used by host. */
  setValue(shape: CropShapeName): void {
    this.value = shape;
  }

  private emit(shape: CropShapeName): void {
    this.dispatchEvent(new CustomEvent('sfx-crop-shape-change', {
      detail: { shape },
      bubbles: true,
      composed: true,
    }));
  }

  private close(): void {
    this.open = false;
  }

  private onTriggerClick = (e: Event): void => {
    e.stopPropagation();
    if (this.open) {
      this.close();
    } else {
      this.focusedIndex = Math.max(
        0,
        ALL_SHAPES.filter((s) => this.shapes.includes(s.value)).findIndex((s) => s.value === this.value),
      );
      this.open = true;
    }
  };

  private onOptionClick(e: Event, shape: CropShapeName): void {
    e.stopPropagation();
    this.value = shape;
    this.close();
    this.emit(shape);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.open) return;
    const visible = ALL_SHAPES.filter((s) => this.shapes.includes(s.value));

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        this.focusOption(Math.min(this.focusedIndex + 1, visible.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        this.focusOption(Math.max(this.focusedIndex - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        if (this.focusedIndex >= 0 && this.focusedIndex < visible.length) {
          const picked = visible[this.focusedIndex].value;
          this.value = picked;
          this.close();
          this.emit(picked);
        }
        break;
    }
  };

  private focusOption(index: number): void {
    this.focusedIndex = index;
    const opt = this.querySelector<HTMLElement>(`.ci-crop-shape-option[data-index="${index}"]`);
    opt?.focus();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sfx-crop-shapes': SfxCropShapesElement;
  }
}
