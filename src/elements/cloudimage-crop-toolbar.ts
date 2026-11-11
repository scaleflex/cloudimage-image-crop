import { html, type PropertyValues } from 'lit';
import { property, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { CloudimageCropBaseElement } from './base';
import type {
  CropShapeName,
  CropIconOverrides,
  CropTooltipLabels,
  CropTooltipMode,
  CropResetPlacement,
} from '../core/types';
import { resolveIcon } from './icons';
import './cloudimage-crop-rotate';
import './cloudimage-crop-shapes';
import type { CloudimageCropRotateElement } from './cloudimage-crop-rotate';
import type { CloudimageCropShapesElement } from './cloudimage-crop-shapes';
import { parseAvailableShapes, DEFAULT_SHAPES } from './parse-shapes';
import { baseStyles, toolbarEnterKeyframes } from '../styles/shared.css';
import { sfxCropToolbarStyles } from './cloudimage-crop-toolbar.styles';

/**
 * Unified descriptor dispatched on `cloudimage-crop-toolbar-command` so the host
 * `<cloudimage-crop>` routes interactions through a single handler.
 */
export type CloudimageCropToolbarCommand =
  | { type: 'reset' }
  | { type: 'rotate-left' }
  | { type: 'flip-h' }
  | { type: 'rotation'; value: number }
  | { type: 'scale'; value: number }
  | { type: 'shape'; value: CropShapeName }
  | { type: 'save' }
  | { type: 'cancel' };

/**
 * `<cloudimage-crop-toolbar>` — composes rotate/flip buttons + the always-visible
 * `<cloudimage-crop-rotate>` fine-rotation ruler + `<cloudimage-crop-shapes>` into the
 * editor's action bar. Zoom is wheel-only and has no toolbar control.
 */
export class CloudimageCropToolbarElement extends CloudimageCropBaseElement {
  static styles = [baseStyles, toolbarEnterKeyframes, sfxCropToolbarStyles];

  @property({ type: String }) shape: CropShapeName = 'free';
  @property({ type: Number }) rotation = 0;
  @property({ type: Boolean, attribute: 'show-rotate-button' }) showRotateButton = true;
  @property({ type: Boolean, attribute: 'show-flip-button' }) showFlipButton = true;
  @property({ type: Boolean, attribute: 'show-rotate-slider' }) showRotateSlider = true;
  @property({ type: Boolean, attribute: 'show-shape-selector' }) showShapeSelector = true;
  /**
   * Show a "Cancel" button pinned to the top-left corner of the box —
   * mirrors "Done" (top-right). Off by default: most consumers render their
   * own dismiss affordance outside the editor. Turn it on when yours lives
   * INSIDE a box whose size the user controls (e.g. ResizableFrame's
   * `variant:'fixed', cropShape:'free'` drag) — an external button can't
   * track that without duplicating the box's own resize logic, whereas a
   * toolbar button is already part of the box and moves/resizes with it for
   * free. Emits `{type:'cancel'}`, which `<cloudimage-crop>` routes to its
   * own `cancel()` (dispatches `cloudimage-crop-cancel`).
   */
  @property({ type: Boolean, attribute: 'show-cancel-button' }) showCancelButton = false;
  /**
   * `'toolbar'` (default): Reset leads the centred tool group. `'start'`: Reset
   * is pinned to the left corner, after Cancel when shown.
   */
  @property({ type: String, attribute: 'reset-placement' }) resetPlacement: CropResetPlacement = 'toolbar';
  /**
   * Show the primary "Done" button (top-right). On by default. Turn off when the
   * host commits the crop through its own action instead (e.g. an embedding
   * dialog's "Apply" button reading `toCropDescriptor()` / `toCloudimageURL()`),
   * so the editor doesn't offer a second, competing confirm action.
   */
  @property({ type: Boolean, attribute: 'show-done-button' }) showDoneButton = true;
  @property({ type: String, attribute: 'toolbar-position', reflect: true })
  toolbarPosition: 'top' | 'bottom' = 'top';

  /** Reflected so the stylesheet can center the bar over the fixed frame. */
  @property({ type: String, reflect: true }) variant: 'classic' | 'fixed' = 'classic';

  /** True while the user is actively dragging/resizing/panning the crop
   *  frame (see `<cloudimage-crop>`'s `isInteracting`) — fades every button
   *  in the toolbar, including the rotate ruler, so the controls don't
   *  compete with the photo for attention mid-gesture. */
  @property({ type: Boolean, reflect: true }) interacting = false;

  /** JSON-serialized or CSV string on the attribute; `CropShapeName[]` via property. */
  @property({ attribute: 'available-shapes' })
  availableShapes: CropShapeName[] | string | null = null;

  /** Consumer icon overrides propagated from `<cloudimage-crop>`. */
  @property({ attribute: false }) icons: CropIconOverrides = {};

  /** Browser `title` tooltips (default) or the editor's own, themable ones. */
  @property({ type: String }) tooltips: CropTooltipMode = 'native';

  /** Tooltip text overrides (e.g. translations); aria-labels stay English. */
  @property({ attribute: false }) tooltipLabels: CropTooltipLabels = {};

  /** `title` / `data-tooltip` for a button, by the tooltip mode. */
  private tip(key: keyof CropTooltipLabels, fallback: string): { title?: string; tooltip?: string } {
    const text = this.tooltipLabels?.[key] || fallback;
    return this.tooltips === 'styled' ? { tooltip: text } : { title: text };
  }

  @query('cloudimage-crop-rotate') private rotateEl?: CloudimageCropRotateElement;
  @query('cloudimage-crop-shapes') private shapesEl?: CloudimageCropShapesElement;

  render(): unknown {
    const hasLeftButtons = this.showRotateButton || this.showFlipButton;
    const parsedShapes = parseAvailableShapes(this.availableShapes) ?? [...DEFAULT_SHAPES];
    // "Custom" (free-form) doesn't apply to the fixed variant — there the
    // box itself IS the crop frame, so there's no separate free-form crop
    // region to pick inside it. Filter it out of the picker regardless of
    // what the consumer passed via availableShapes.
    const shapes = this.variant === 'fixed'
      ? parsedShapes.filter((s) => s !== 'free')
      : parsedShapes;

    const resetAtStart = this.resetPlacement === 'start';
    // Narrow editor: reserve the corner gutters only for the corner buttons
    // actually shown — otherwise the tool group loses 120px for nothing. The
    // left corner holds up to two circles (Cancel + a pinned Reset).
    const startButtons = Number(this.showCancelButton) + Number(resetAtStart);
    const gutterL = ['', ' ci-crop-toolbar--gutter-l', ' ci-crop-toolbar--gutter-l2'][startButtons];
    const gutterR = this.showDoneButton ? ' ci-crop-toolbar--gutter-r' : '';
    const resetTip = this.tip('reset', 'Reset all changes');
    const rotateTip = this.tip('rotateLeft', 'Rotate left 90°');
    const flipTip = this.tip('flipHorizontal', 'Flip horizontal');
    const cancelTip = this.tip('cancel', 'Cancel');
    const doneTip = this.tip('done', 'Done');

    const resetButton = html`
      <button
        type="button"
        class="ci-crop-reset-btn"
        aria-label="Reset all changes"
        title=${ifDefined(resetTip.title)}
        data-tooltip=${ifDefined(resetTip.tooltip)}
        data-tooltip-align=${ifDefined(resetAtStart ? 'start' : undefined)}
        @click=${() => this.emit({ type: 'reset' })}
      >
        ${unsafeHTML(resolveIcon('reset', this.icons))}
      </button>
    `;

    const cancelButton = this.showCancelButton ? html`
      <button
        type="button"
        class="ci-crop-cancel-btn"
        part="cancel"
        aria-label="Cancel"
        title=${ifDefined(cancelTip.title)}
        data-tooltip=${ifDefined(cancelTip.tooltip)}
        data-tooltip-align="start"
        @click=${() => this.emit({ type: 'cancel' })}
      >
        <span class="ci-crop-cancel-btn-icon">${unsafeHTML(resolveIcon('close', this.icons))}</span>
        <span class="ci-crop-cancel-btn-label">Cancel</span>
      </button>
    ` : null;

    // A pinned Reset can leave the centred group with nothing in it — skip the
    // empty 36px box rather than keep an invisible element in the row.
    const hasGroup = !resetAtStart || hasLeftButtons || this.showShapeSelector;

    // The left corner renders BEFORE the tool row: it is absolutely positioned,
    // so DOM order changes nothing visually, but it makes Tab follow what the
    // user sees — Cancel / Reset on the left first, the tools, then Done.
    return html`
      ${resetAtStart ? html`
        <div class="ci-crop-start">${cancelButton}${resetButton}</div>
      ` : cancelButton}

      <div class="ci-crop-toolbar${gutterL}${gutterR}" @cloudimage-crop-popover-open=${this.onPopoverOpen}>
        ${hasGroup ? html`<div class="ci-crop-toolbar-group">
          ${resetAtStart ? null : resetButton}

          ${hasLeftButtons ? html`
            ${resetAtStart ? null : html`<span class="ci-crop-toolbar-divider" aria-hidden="true"></span>`}
            ${this.showRotateButton ? html`
              <button
                type="button"
                class="ci-crop-toolbar-btn"
                aria-label="Rotate left 90°"
                title=${ifDefined(rotateTip.title)}
                data-tooltip=${ifDefined(rotateTip.tooltip)}
                @click=${() => this.emit({ type: 'rotate-left' })}
              >${unsafeHTML(resolveIcon('rotateLeft', this.icons))}</button>
            ` : null}
            ${this.showFlipButton ? html`
              <button
                type="button"
                class="ci-crop-toolbar-btn"
                aria-label="Flip horizontal"
                title=${ifDefined(flipTip.title)}
                data-tooltip=${ifDefined(flipTip.tooltip)}
                @click=${() => this.emit({ type: 'flip-h' })}
              >${unsafeHTML(resolveIcon('flipHorizontal', this.icons))}</button>
            ` : null}
          ` : null}

          ${this.showShapeSelector ? html`
            ${resetAtStart && !hasLeftButtons ? null : html`<span class="ci-crop-toolbar-divider" aria-hidden="true"></span>`}
            <cloudimage-crop-shapes
              .value=${this.shape}
              .shapes=${shapes}
              variant=${this.variant}
              .icons=${this.icons}
              @cloudimage-crop-shape-change=${(e: CustomEvent<{ shape: CropShapeName }>) =>
                this.emit({ type: 'shape', value: e.detail.shape })}
            ></cloudimage-crop-shapes>
          ` : null}
        </div>` : null}

        ${this.showRotateSlider ? html`
          <cloudimage-crop-rotate
            .value=${this.rotation}
            .icons=${this.icons}
            @cloudimage-crop-rotate-change=${(e: CustomEvent<{ degrees: number }>) =>
              this.emit({ type: 'rotation', value: e.detail.degrees })}
          ></cloudimage-crop-rotate>
        ` : null}
      </div>

      ${this.showDoneButton ? html`
        <button
          type="button"
          class="ci-crop-done-btn"
          part="done"
          aria-label="Done"
          title=${ifDefined(doneTip.title)}
          data-tooltip=${ifDefined(doneTip.tooltip)}
          data-tooltip-align="end"
          @click=${() => this.emit({ type: 'save' })}
        >
          <span class="ci-crop-done-btn-icon">${unsafeHTML(resolveIcon('check', this.icons))}</span>
          <span class="ci-crop-done-btn-label">Done</span>
        </button>
      ` : null}
    `;
  }

  /** Set when Reset had focus as `resetPlacement` changed; see `updated()`. */
  private refocusReset = false;

  /**
   * Moving Reset between the tool group and the left corner renders a new
   * button in a different template slot, which drops focus. Remember whether
   * the old one had it so `updated()` can hand it to the new one.
   */
  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('resetPlacement')) {
      const active = this.shadowRoot?.activeElement;
      this.refocusReset = Boolean(active?.classList.contains('ci-crop-reset-btn'));
    }
  }

  protected updated(): void {
    if (!this.refocusReset) return;
    this.refocusReset = false;
    this.shadowRoot?.querySelector<HTMLButtonElement>('.ci-crop-reset-btn')?.focus();
  }

  /**
   * Mutual exclusion for collapsible popovers. The rotate ruler is now
   * inline (always visible), so only the shapes popover participates —
   * keeping the handler future-proof if more popovers are added.
   */
  private onPopoverOpen = (e: Event): void => {
    const source = (e as CustomEvent<{ source?: string }>).detail?.source;
    if (source !== 'shapes' && this.shapesEl) this.shapesEl.open = false;
  };

  /** Sync the rotation slider without firing an event. */
  setRotationValue(degrees: number): void {
    this.rotation = degrees;
    this.rotateEl?.setValue(degrees);
  }

  /** Sync the shape selector without firing an event. */
  setShapeValue(shape: CropShapeName): void {
    this.shape = shape;
    this.shapesEl?.setValue(shape);
  }

  private emit(detail: CloudimageCropToolbarCommand): void {
    this.dispatchEvent(new CustomEvent('cloudimage-crop-toolbar-command', {
      detail,
      bubbles: true,
      composed: true,
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cloudimage-crop-toolbar': CloudimageCropToolbarElement;
  }
}
