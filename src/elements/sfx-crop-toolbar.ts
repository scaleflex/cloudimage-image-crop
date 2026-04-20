import { html, css } from 'lit';
import { property, query } from 'lit/decorators.js';
import { SfxCropBaseElement } from './base';
import type { CropShapeName } from '../core/types';
import { ICON_ROTATE_LEFT, ICON_FLIP_H } from './icons';
import './sfx-crop-rotate';
import './sfx-crop-shapes';
import type { SfxCropRotateElement } from './sfx-crop-rotate';
import type { SfxCropShapesElement } from './sfx-crop-shapes';

/**
 * Unified descriptor dispatched on `sfx-crop-toolbar-command` so the host
 * `<sfx-crop>` routes interactions through a single handler.
 */
export type SfxCropToolbarCommand =
  | { type: 'rotate-left' }
  | { type: 'flip-h' }
  | { type: 'rotation'; value: number }
  | { type: 'shape'; value: CropShapeName };

/**
 * `<sfx-crop-toolbar>` — composes rotate/flip buttons + `<sfx-crop-rotate>` +
 * `<sfx-crop-shapes>` into the editor's action bar. Fully Lit-native since P3;
 * the legacy imperative `createToolbar` factory is no longer called.
 *
 * Light DOM so the parent `<sfx-crop>`'s shadow stylesheet (carrying the
 * `.ci-crop-toolbar*` rules) applies without duplication.
 */
export class SfxCropToolbarElement extends SfxCropBaseElement {
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  static styles = css``;

  @property({ type: String }) shape: CropShapeName = 'free';
  @property({ type: Number }) rotation = 0;
  @property({ type: Boolean, attribute: 'show-rotate-button' }) showRotateButton = true;
  @property({ type: Boolean, attribute: 'show-flip-button' }) showFlipButton = true;
  @property({ type: Boolean, attribute: 'show-flip-v-button' }) showFlipVButton = false;
  @property({ type: Boolean, attribute: 'show-rotate-slider' }) showRotateSlider = true;
  @property({ type: Boolean, attribute: 'show-shape-selector' }) showShapeSelector = true;
  @property({ type: String, attribute: 'toolbar-position' }) toolbarPosition: 'top' | 'bottom' = 'bottom';

  /** JSON-serialized or CSV string on the attribute; `CropShapeName[]` via property. */
  @property({ attribute: 'available-shapes' })
  availableShapes: CropShapeName[] | string | null = null;

  @query('sfx-crop-rotate') private rotateEl?: SfxCropRotateElement;
  @query('sfx-crop-shapes') private shapesEl?: SfxCropShapesElement;

  render(): unknown {
    const hasLeftButtons = this.showRotateButton || this.showFlipButton;
    const cls = `ci-crop-toolbar${this.toolbarPosition === 'top' ? ' ci-crop-toolbar--top' : ''}`;
    const shapes = this.parseAvailableShapes() ?? ['free', 'square', 'circle', 'rounded-rect', '16:9', '4:3', '3:2'];

    return html`
      <div class=${cls}>
        ${hasLeftButtons ? html`
          <div class="ci-crop-toolbar-group">
            ${this.showRotateButton ? html`
              <button
                type="button"
                class="ci-crop-toolbar-btn"
                aria-label="Rotate left 90°"
                .innerHTML=${ICON_ROTATE_LEFT}
                @click=${() => this.emit({ type: 'rotate-left' })}
              ></button>
            ` : null}
            ${this.showFlipButton ? html`
              <button
                type="button"
                class="ci-crop-toolbar-btn"
                aria-label="Flip horizontal"
                .innerHTML=${ICON_FLIP_H}
                @click=${() => this.emit({ type: 'flip-h' })}
              ></button>
            ` : null}
          </div>
        ` : null}

        ${hasLeftButtons && this.showRotateSlider ? html`<div class="ci-crop-toolbar-separator"></div>` : null}

        ${this.showRotateSlider ? html`
          <sfx-crop-rotate
            .value=${this.rotation}
            @sfx-crop-rotate-change=${(e: CustomEvent<{ degrees: number }>) =>
              this.emit({ type: 'rotation', value: e.detail.degrees })}
          ></sfx-crop-rotate>
        ` : null}

        ${this.showRotateSlider && this.showShapeSelector ? html`<div class="ci-crop-toolbar-separator"></div>` : null}

        ${this.showShapeSelector ? html`
          <sfx-crop-shapes
            .value=${this.shape}
            .shapes=${shapes}
            @sfx-crop-shape-change=${(e: CustomEvent<{ shape: CropShapeName }>) =>
              this.emit({ type: 'shape', value: e.detail.shape })}
          ></sfx-crop-shapes>
        ` : null}
      </div>
    `;
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

  private parseAvailableShapes(): CropShapeName[] | undefined {
    const v = this.availableShapes;
    if (!v) return undefined;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      if (v.trim().startsWith('[')) {
        try { return JSON.parse(v) as CropShapeName[]; } catch { /* fall through */ }
      }
      return v.split(/[\s,]+/).filter(Boolean) as CropShapeName[];
    }
    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sfx-crop-toolbar': SfxCropToolbarElement;
  }
}
