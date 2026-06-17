import { html } from 'lit';
import { query } from 'lit/decorators.js';
import { CloudimageCropBaseElement } from './base';
import { sfxCropCanvasStyles } from './cloudimage-crop-canvas.styles';

/**
 * `<cloudimage-crop-canvas>` — minimal host for the editor's `<canvas>`.
 *
 * Owns its own shadow root so the canvas styling + `touch-action: none` live
 * encapsulated alongside the `<canvas>` node. The parent `<cloudimage-crop>`'s host-
 * level `--ci-crop-*` tokens cascade in via CSS custom-property inheritance.
 *
 * The `<canvas>` is rendered once and never re-created, so `setPointerCapture`,
 * non-passive `wheel` listeners, and the ResizeObserver bound by the
 * controller stay stable across Lit updates.
 *
 * Theme a consumer via `::part(canvas)` from the parent host.
 */
export class CloudimageCropCanvasElement extends CloudimageCropBaseElement {
  static styles = [sfxCropCanvasStyles];

  @query('canvas')
  canvasEl!: HTMLCanvasElement;

  render(): unknown {
    return html`<canvas part="canvas"></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cloudimage-crop-canvas': CloudimageCropCanvasElement;
  }
}
