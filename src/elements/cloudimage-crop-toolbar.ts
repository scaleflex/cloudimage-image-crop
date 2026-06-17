import { html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { CloudimageCropBaseElement } from './base';
import type { CropShapeName, CropIconOverrides } from '../core/types';
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
  | { type: 'save' };

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
  @property({ type: String, attribute: 'toolbar-position', reflect: true })
  toolbarPosition: 'top' | 'bottom' = 'top';

  /** Reflected so the stylesheet can center the bar over the fixed frame. */
  @property({ type: String, reflect: true }) variant: 'classic' | 'fixed' = 'classic';

  /** JSON-serialized or CSV string on the attribute; `CropShapeName[]` via property. */
  @property({ attribute: 'available-shapes' })
  availableShapes: CropShapeName[] | string | null = null;

  /** Consumer icon overrides propagated from `<cloudimage-crop>`. */
  @property({ attribute: false }) icons: CropIconOverrides = {};

  @query('cloudimage-crop-rotate') private rotateEl?: CloudimageCropRotateElement;
  @query('cloudimage-crop-shapes') private shapesEl?: CloudimageCropShapesElement;

  render(): unknown {
    const hasLeftButtons = this.showRotateButton || this.showFlipButton;
    const shapes = parseAvailableShapes(this.availableShapes) ?? [...DEFAULT_SHAPES];

    return html`
      <div class="ci-crop-toolbar" @cloudimage-crop-popover-open=${this.onPopoverOpen}>
        <button
          type="button"
          class="ci-crop-reset-btn"
          aria-label="Reset all changes"
          @click=${() => this.emit({ type: 'reset' })}
        >
          ${unsafeHTML(resolveIcon('reset', this.icons))}
          <span>Reset</span>
        </button>

        ${hasLeftButtons ? html`
          <div class="ci-crop-toolbar-group">
            ${this.showRotateButton ? html`
              <button
                type="button"
                class="ci-crop-toolbar-btn"
                aria-label="Rotate left 90°"
                @click=${() => this.emit({ type: 'rotate-left' })}
              >${unsafeHTML(resolveIcon('rotateLeft', this.icons))}</button>
            ` : null}
            ${this.showFlipButton ? html`
              <button
                type="button"
                class="ci-crop-toolbar-btn"
                aria-label="Flip horizontal"
                @click=${() => this.emit({ type: 'flip-h' })}
              >${unsafeHTML(resolveIcon('flipHorizontal', this.icons))}</button>
            ` : null}
          </div>
        ` : null}

        ${this.showRotateSlider ? html`
          <cloudimage-crop-rotate
            .value=${this.rotation}
            .icons=${this.icons}
            @cloudimage-crop-rotate-change=${(e: CustomEvent<{ degrees: number }>) =>
              this.emit({ type: 'rotation', value: e.detail.degrees })}
          ></cloudimage-crop-rotate>
        ` : null}

        ${this.showShapeSelector ? html`
          <cloudimage-crop-shapes
            .value=${this.shape}
            .shapes=${shapes}
            variant=${this.variant}
            .icons=${this.icons}
            @cloudimage-crop-shape-change=${(e: CustomEvent<{ shape: CropShapeName }>) =>
              this.emit({ type: 'shape', value: e.detail.shape })}
          ></cloudimage-crop-shapes>
        ` : null}
      </div>

      <button
        type="button"
        class="ci-crop-done-btn"
        part="done"
        aria-label="Done"
        @click=${() => this.emit({ type: 'save' })}
      >Done</button>
    `;
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
