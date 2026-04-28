import { html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { SfxCropBaseElement } from './base';
import type { CropShapeName, CropIconOverrides } from '../core/types';
import { resolveIcon } from './icons';
import './sfx-crop-rotate';
import './sfx-crop-zoom';
import './sfx-crop-shapes';
import type { SfxCropRotateElement } from './sfx-crop-rotate';
import type { SfxCropZoomElement } from './sfx-crop-zoom';
import type { SfxCropShapesElement } from './sfx-crop-shapes';
import { parseAvailableShapes, DEFAULT_SHAPES } from './parse-shapes';
import { baseStyles, toolbarEnterKeyframes } from '../styles/shared.css';
import { sfxCropToolbarStyles } from './sfx-crop-toolbar.styles';

/**
 * Unified descriptor dispatched on `sfx-crop-toolbar-command` so the host
 * `<sfx-crop>` routes interactions through a single handler.
 */
export type SfxCropToolbarCommand =
  | { type: 'reset' }
  | { type: 'rotate-left' }
  | { type: 'flip-h' }
  | { type: 'rotation'; value: number }
  | { type: 'scale'; value: number }
  | { type: 'shape'; value: CropShapeName };

/**
 * `<sfx-crop-toolbar>` — composes rotate/flip buttons + `<sfx-crop-rotate>` +
 * `<sfx-crop-shapes>` into the editor's action bar. Fully Lit-native with its
 * own shadow DOM; tokens inherit from the parent `<sfx-crop>`.
 */
export class SfxCropToolbarElement extends SfxCropBaseElement {
  static styles = [baseStyles, toolbarEnterKeyframes, sfxCropToolbarStyles];

  @property({ type: String }) shape: CropShapeName = 'free';
  @property({ type: Number }) rotation = 0;
  @property({ type: Number }) scale = 1;
  @property({ type: Number }) minScale = 0.5;
  @property({ type: Number }) maxScale = 5;
  @property({ type: Boolean, attribute: 'show-rotate-button' }) showRotateButton = true;
  @property({ type: Boolean, attribute: 'show-flip-button' }) showFlipButton = true;
  @property({ type: Boolean, attribute: 'show-rotate-slider' }) showRotateSlider = true;
  @property({ type: Boolean, attribute: 'show-zoom-slider' }) showZoomSlider = true;
  @property({ type: Boolean, attribute: 'show-shape-selector' }) showShapeSelector = true;
  @property({ type: String, attribute: 'toolbar-position', reflect: true })
  toolbarPosition: 'top' | 'bottom' = 'top';

  /** JSON-serialized or CSV string on the attribute; `CropShapeName[]` via property. */
  @property({ attribute: 'available-shapes' })
  availableShapes: CropShapeName[] | string | null = null;

  /** Consumer icon overrides propagated from `<sfx-crop>`. */
  @property({ attribute: false }) icons: CropIconOverrides = {};

  @query('sfx-crop-rotate') private rotateEl?: SfxCropRotateElement;
  @query('sfx-crop-zoom') private zoomEl?: SfxCropZoomElement;
  @query('sfx-crop-shapes') private shapesEl?: SfxCropShapesElement;

  render(): unknown {
    const hasLeftButtons = this.showRotateButton || this.showFlipButton;
    const shapes = parseAvailableShapes(this.availableShapes) ?? [...DEFAULT_SHAPES];

    return html`
      <div class="sfx-cr-toolbar" @sfx-crop-popover-open=${this.onPopoverOpen}>
        <button
          type="button"
          class="sfx-cr-reset-btn"
          aria-label="Reset all changes"
          @click=${() => this.emit({ type: 'reset' })}
        >
          ${unsafeHTML(resolveIcon('reset', this.icons))}
          <span>Reset</span>
        </button>

        ${hasLeftButtons ? html`
          <div class="sfx-cr-toolbar-group">
            ${this.showRotateButton ? html`
              <button
                type="button"
                class="sfx-cr-toolbar-btn"
                aria-label="Rotate left 90°"
                @click=${() => this.emit({ type: 'rotate-left' })}
              >${unsafeHTML(resolveIcon('rotateLeft', this.icons))}</button>
            ` : null}
            ${this.showFlipButton ? html`
              <button
                type="button"
                class="sfx-cr-toolbar-btn"
                aria-label="Flip horizontal"
                @click=${() => this.emit({ type: 'flip-h' })}
              >${unsafeHTML(resolveIcon('flipHorizontal', this.icons))}</button>
            ` : null}
          </div>
        ` : null}

        ${this.showRotateSlider ? html`
          <sfx-crop-rotate
            .value=${this.rotation}
            .icons=${this.icons}
            @sfx-crop-rotate-change=${(e: CustomEvent<{ degrees: number }>) =>
              this.emit({ type: 'rotation', value: e.detail.degrees })}
          ></sfx-crop-rotate>
        ` : null}

        ${this.showZoomSlider ? html`
          <sfx-crop-zoom
            .value=${this.scale}
            .min=${this.minScale}
            .max=${this.maxScale}
            .icons=${this.icons}
            @sfx-crop-zoom-change=${(e: CustomEvent<{ scale: number }>) =>
              this.emit({ type: 'scale', value: e.detail.scale })}
          ></sfx-crop-zoom>
        ` : null}

        ${this.showShapeSelector ? html`
          <sfx-crop-shapes
            .value=${this.shape}
            .shapes=${shapes}
            .icons=${this.icons}
            @sfx-crop-shape-change=${(e: CustomEvent<{ shape: CropShapeName }>) =>
              this.emit({ type: 'shape', value: e.detail.shape })}
          ></sfx-crop-shapes>
        ` : null}
      </div>
    `;
  }

  /**
   * Mutual exclusion for the three collapsible popovers (rotate, zoom,
   * shapes): whenever one opens it dispatches a bubbling
   * `sfx-crop-popover-open` event, and we close the other two here so
   * only one surface is expanded at a time.
   */
  private onPopoverOpen = (e: Event): void => {
    const source = (e as CustomEvent<{ source?: string }>).detail?.source;
    if (source !== 'rotate' && this.rotateEl) this.rotateEl.open = false;
    if (source !== 'zoom' && this.zoomEl) this.zoomEl.open = false;
    if (source !== 'shapes' && this.shapesEl) this.shapesEl.open = false;
  };

  /** Sync the zoom slider without firing an event. */
  setScaleValue(scale: number): void {
    this.scale = scale;
    this.zoomEl?.setValue(scale);
  }

  /**
   * Surface the zoom popover briefly — called from the host when wheel
   * zoom fires so the user sees the ruler moving under their cursor.
   * Forwards to {@link SfxCropZoomElement.showTemporarily}; the element
   * handles debouncing and auto-close on its own.
   */
  showZoomPopover(duration?: number): void {
    this.zoomEl?.showTemporarily(duration);
  }

  /** Same as {@link showZoomPopover} but for the rotate slider — called
   *  from the host on wheel-rotation activity (rotation-mode wheel scrubs). */
  showRotatePopover(duration?: number): void {
    this.rotateEl?.showTemporarily(duration);
  }

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

  private emit(detail: SfxCropToolbarCommand): void {
    this.dispatchEvent(new CustomEvent('sfx-crop-toolbar-command', {
      detail,
      bubbles: true,
      composed: true,
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sfx-crop-toolbar': SfxCropToolbarElement;
  }
}
