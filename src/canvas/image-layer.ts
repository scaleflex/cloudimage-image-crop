import type { DisplayState } from '../core/types';
import { degreesToRadians } from '../utils/math';

export function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  imgRect: { x: number; y: number; w: number; h: number },
  state: DisplayState,
): void {
  const { x, y, w, h } = imgRect;
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();

  // 1. Translate to image center
  ctx.translate(cx, cy);

  // 2. Apply scale (zoom)
  ctx.scale(state.scale, state.scale);

  // 3. Apply pan offset
  ctx.translate(state.panX, state.panY);

  // 4. Apply rotation (90° steps + fine)
  const totalRotation = state.quarterTurns + state.rotation;
  if (totalRotation !== 0) {
    ctx.rotate(degreesToRadians(totalRotation));
  }

  // 5. Apply flip
  if (state.flipH !== 1 || state.flipV !== 1) {
    ctx.scale(state.flipH, state.flipV);
  }

  // 6. Draw image centered
  // After 90° rotations, the effective dimensions swap
  const is90 = Math.round(state.quarterTurns / 90) % 2 !== 0;
  const drawW = is90 ? h : w;
  const drawH = is90 ? w : h;

  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();
}
