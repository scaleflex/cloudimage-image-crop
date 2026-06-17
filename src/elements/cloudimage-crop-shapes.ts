import { html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { CloudimageCropBaseElement } from './base';
import type { CropShapeName, CropIconOverrides } from '../core/types';
import { getAspectRatio, parseRatio } from '../transforms/constrain';
import {
  ICON_CROP_CUSTOM,
  ICON_CROP_CIRCLE,
  ICON_CROP_ROUNDED_RECT,
  resolveIcon,
} from './icons';
import { baseStyles } from '../styles/shared.css';
import { sfxCropShapesStyles } from './cloudimage-crop-shapes.styles';

type Orientation = 'landscape' | 'portrait';

interface ShapeOption {
  value: CropShapeName;
  label: string;
  /** Pre-rendered SVG icon markup; generated for aspect shapes, fixed for
   *  the non-ratio shapes (free / circle / rounded-rect). */
  icon: string;
  /** Which orientation tab this shape belongs to. `'both'` = always visible
   *  (Custom, Circle, Rounded, 1:1). */
  show: Orientation | 'both';
}

/**
 * Generate a proportionally-sized filled-rectangle SVG icon for an aspect
 * ratio, so the picker visually reflects each preset's shape (matches the
 * reference in the design spec).
 */
function ratioIcon(ratio: number): string {
  const frame = 22;
  const maxBox = 18;
  const stroke = 1.5;
  let w: number;
  let h: number;
  if (ratio >= 1) {
    w = maxBox;
    h = maxBox / ratio;
  } else {
    h = maxBox;
    w = maxBox * ratio;
  }
  // Stroke is centered on the path — shrink the rect by half the stroke
  // width and shift by the same amount so nothing spills outside the frame.
  const rectW = Math.max(0, w - stroke);
  const rectH = Math.max(0, h - stroke);
  const x = (frame - rectW) / 2;
  const y = (frame - rectH) / 2;
  // Corner radius scales with the shorter side so extreme ratios (6:1, 1:2,
  // etc.) don't look like fully-rounded pills.
  const r = Math.min(3.5, Math.min(rectW, rectH) / 4);
  return `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frame} ${frame}" fill="none" stroke="currentColor" stroke-width="${stroke}"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${rectW.toFixed(2)}" height="${rectH.toFixed(2)}" rx="${r.toFixed(2)}"/></svg>`;
}

/**
 * Build the fixed geometry-shape entries. Named ratios aren't enumerated
 * here anymore — `resolveShape()` generates their ShapeOption on demand
 * from the `"W:H"` string via `parseRatio()`.
 */
function buildShapeMap(): Record<string, ShapeOption> {
  return {
    free: { value: 'free', label: 'Custom', icon: ICON_CROP_CUSTOM, show: 'both' },
    circle: { value: 'circle', label: 'Circle', icon: ICON_CROP_CIRCLE, show: 'both' },
    'rounded-rect': { value: 'rounded-rect', label: 'Rounded', icon: ICON_CROP_ROUNDED_RECT, show: 'both' },
    square: { value: 'square', label: '1:1', icon: ratioIcon(1), show: 'both' },
  };
}

const SHAPE_MAP = buildShapeMap();

/**
 * Look up or synthesize a ShapeOption for any allowed shape name. Built-in
 * presets come from SHAPE_MAP; any other string that matches the `W:H`
 * pattern gets a dynamically generated entry with a proportional icon —
 * that's the extension point for consumer-supplied ratios like `"7:2"`.
 */
function resolveShape(name: CropShapeName | string): ShapeOption | null {
  const built = SHAPE_MAP[name];
  if (built) return built;
  const r = parseRatio(name);
  if (r === null) return null;
  return {
    value: name as CropShapeName,
    label: name,
    icon: ratioIcon(r),
    show: r > 1 ? 'landscape' : r < 1 ? 'portrait' : 'both',
  };
}

/**
 * `<cloudimage-crop-shapes>` — trigger + dropdown with aspect-ratio / shape presets.
 * Split into an orientation toggle (landscape / portrait) at the top, then a
 * list of shapes that pass both the `shapes` allow-list and the selected
 * orientation filter. Non-ratio shapes (Custom, Circle, Rounded, 1:1) sit in
 * both orientation tabs so they're never hidden by a toggle click.
 *
 * Keyboard: Enter/Space toggles the dropdown; Arrow keys navigate options;
 * Enter/Space commits; Escape closes.
 *
 * Event:
 *   `cloudimage-crop-shape-change` — `{ detail: { shape: CropShapeName } }`,
 *   bubbles + composed.
 */
export class CloudimageCropShapesElement extends CloudimageCropBaseElement {
  static styles = [baseStyles, sfxCropShapesStyles];

  @property({ type: String }) value: CropShapeName = 'free';

  /** Supported shape names. Default covers the canonical ratio pairs +
   *  Free + Square. `Circle` / `rounded-rect` are built-in geometry
   *  shapes but must be opted into explicitly. Any `"W:H"` string is
   *  accepted — the dropdown generates a proportional icon for it. */
  @property({ attribute: false })
  shapes: CropShapeName[] = [
    'free', 'square',
    '16:9', '4:3', '3:2', '5:4', '2:1',
    '9:16', '3:4', '2:3', '4:5', '1:2',
  ];

  @property({ type: Boolean, reflect: true }) open = false;
  /** Reflected so the trigger can pick up a translucent pill in the fixed variant. */
  @property({ type: String, reflect: true }) variant: 'classic' | 'fixed' = 'classic';
  @property({ attribute: false }) icons: CropIconOverrides = {};

  @state() private orientation: Orientation = 'landscape';
  @state() private focusedIndex = -1;
  private focusRafId: number | null = null;

  private docClickHandler = (): void => {
    if (this.open) this.close();
  };

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.docClickHandler);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.docClickHandler);
    if (this.focusRafId !== null) {
      cancelAnimationFrame(this.focusRafId);
      this.focusRafId = null;
    }
  }

  updated(changed: PropertyValues): void {
    if (changed.has('open') && this.open) {
      // Default to the orientation of the currently selected shape so the
      // active option is already visible when the dropdown opens.
      const active = resolveShape(this.value);
      if (active && active.show !== 'both') this.orientation = active.show;

      this.focusRafId = requestAnimationFrame(() => {
        this.focusRafId = null;
        const list = this.getVisibleOptions();
        const activeIdx = list.findIndex((o) => o.value === this.value);
        this.focusOption(activeIdx >= 0 ? activeIdx : 0);
      });
    }
  }

  render(): unknown {
    const visible = this.getVisibleOptions();
    const current = resolveShape(this.value) ?? SHAPE_MAP.free;

    return html`
      <div
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
          <span class="ci-crop-shape-trigger-icon">${unsafeHTML(resolveIcon('cropAspect', this.icons))}</span>
          <span class="ci-crop-shape-trigger-label">${current.label}</span>
          <span class="ci-crop-shape-chevron">${unsafeHTML(resolveIcon('chevronDown', this.icons))}</span>
        </button>
        <div class="ci-crop-shape-dropdown" role="listbox">
          <div class="ci-crop-shape-orient" role="tablist" aria-label="Orientation">
            <button
              type="button"
              class=${`ci-crop-shape-orient-btn${this.orientation === 'landscape' ? ' is-active' : ''}`}
              role="tab"
              aria-selected=${this.orientation === 'landscape' ? 'true' : 'false'}
              aria-label="Landscape orientations"
              @click=${() => this.setOrientation('landscape')}
            >${unsafeHTML(resolveIcon('orientLandscape', this.icons))}</button>
            <button
              type="button"
              class=${`ci-crop-shape-orient-btn${this.orientation === 'portrait' ? ' is-active' : ''}`}
              role="tab"
              aria-selected=${this.orientation === 'portrait' ? 'true' : 'false'}
              aria-label="Portrait orientations"
              @click=${() => this.setOrientation('portrait')}
            >${unsafeHTML(resolveIcon('orientPortrait', this.icons))}</button>
          </div>
          <div class="ci-crop-shape-list" role="presentation">
            ${visible.map((opt, i) => html`
              <button
                type="button"
                class=${`ci-crop-shape-option${opt.value === this.value ? ' ci-crop-shape-option--active' : ''}`}
                role="option"
                aria-selected=${opt.value === this.value ? 'true' : 'false'}
                @click=${(e: Event) => this.onOptionClick(e, opt.value)}
                data-index=${String(i)}
              >
                <span class="ci-crop-shape-option-icon">${unsafeHTML(this.optionIcon(opt))}</span>
                <span class="ci-crop-shape-option-label">${opt.label}</span>
              </button>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Pick the icon for a dropdown option, consulting consumer overrides
   * for the three non-ratio geometry shapes. Aspect-ratio options stay
   * on their proportional rectangle — not overridable, and that's
   * intentional since each one is generated from the ratio itself.
   */
  private optionIcon(opt: ShapeOption): string {
    switch (opt.value) {
      case 'free':         return resolveIcon('cropCustom', this.icons);
      case 'circle':       return resolveIcon('cropCircle', this.icons);
      case 'rounded-rect': return resolveIcon('cropRoundedRect', this.icons);
      default:             return opt.icon;
    }
  }

  /** Sync value without emitting — used by host. */
  setValue(shape: CropShapeName): void {
    this.value = shape;
  }

  private setOrientation(o: Orientation): void {
    if (this.orientation === o) return;
    this.orientation = o;
    this.focusedIndex = -1;
  }

  /**
   * Options visible under the current orientation tab, respecting the
   * `shapes` allow-list. Each allowed name is resolved via `resolveShape`
   * so consumer-supplied `"W:H"` strings (not in SHAPE_MAP) get a dynamic
   * option with a proportional icon. Sorted: named shapes first in a
   * fixed order, then ratios by numeric value.
   */
  private getVisibleOptions(): ShapeOption[] {
    const options: ShapeOption[] = [];
    for (const name of this.shapes) {
      const opt = resolveShape(name);
      if (!opt) continue;
      if (opt.show !== 'both' && opt.show !== this.orientation) continue;
      options.push(opt);
    }
    return options.sort((a, b) => {
      const order: Record<string, number> = { free: 0, circle: 1, 'rounded-rect': 2, square: 3 };
      const ao = order[a.value];
      const bo = order[b.value];
      if (ao !== undefined && bo !== undefined) return ao - bo;
      if (ao !== undefined) return -1;
      if (bo !== undefined) return 1;
      const ra = getAspectRatio(a.value) ?? 1;
      const rb = getAspectRatio(b.value) ?? 1;
      // Landscape: ascending (1.0 → wider). Portrait: descending (1.0 → narrower).
      return this.orientation === 'portrait' ? rb - ra : ra - rb;
    });
  }

  private emit(shape: CropShapeName): void {
    this.dispatchEvent(new CustomEvent('cloudimage-crop-shape-change', {
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
      const list = this.getVisibleOptions();
      this.focusedIndex = Math.max(0, list.findIndex((s) => s.value === this.value));
      this.open = true;
      // Close sibling popovers (zoom, rotate) so only one is expanded.
      this.dispatchEvent(new CustomEvent('cloudimage-crop-popover-open', {
        detail: { source: 'shapes' },
        bubbles: true,
        composed: true,
      }));
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
    const visible = this.getVisibleOptions();

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
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        this.setOrientation('landscape');
        break;
      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        this.setOrientation('portrait');
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
    const opt = this.renderRoot.querySelector<HTMLElement>(
      `.ci-crop-shape-option[data-index="${index}"]`,
    );
    opt?.focus();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cloudimage-crop-shapes': CloudimageCropShapesElement;
  }
}
