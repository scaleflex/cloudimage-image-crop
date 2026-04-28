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

  // 1. Fine rotation and flip pivot around the crop-rect center —
  //    whatever the user framed with zoom/pan stays inside the frame
  //    while it tilts or mirrors. Applied first, in canvas-pixel space,
  //    before the image-local transform chain.
  //    Tilt uses a pivot captured at the moment the user first tilts
  //    (`state.rotationPivot`); flip uses the live crop centre. Decoupling
  //    the tilt pivot from the live frame keeps the photo from dragging
  //    along when the user later resizes the crop.
  const liveCx = x + (state.cropRect.x + state.cropRect.width / 2) * w;
  const liveCy = y + (state.cropRect.y + state.cropRect.height / 2) * h;
  const tiltPivot = state.rotationPivot ?? {
    x: state.cropRect.x + state.cropRect.width / 2,
    y: state.cropRect.y + state.cropRect.height / 2,
  };
  const tiltCx = x + tiltPivot.x * w;
  const tiltCy = y + tiltPivot.y * h;
  if (state.rotation !== 0) {
    ctx.translate(tiltCx, tiltCy);
    ctx.rotate(degreesToRadians(state.rotation));
    ctx.translate(-tiltCx, -tiltCy);
  }
  if (state.flipH !== 1 || state.flipV !== 1) {
    ctx.translate(liveCx, liveCy);
    ctx.scale(state.flipH, state.flipV);
    ctx.translate(-liveCx, -liveCy);
  }

  // 2. Translate to image center
  ctx.translate(cx, cy);

  // 3. Apply scale (zoom)
  ctx.scale(state.scale, state.scale);

  // 4. Apply pan offset
  ctx.translate(state.panX, state.panY);

  // 5. 90° quarter turns around the image center (independent of the
  //    fine tilt/flip above).
  if (state.quarterTurns !== 0) {
    ctx.rotate(degreesToRadians(state.quarterTurns));
  }

  // 6. Draw image centered.
  // The canvas element keeps its size across 90° rotations, so on a
  // quarter-turn we scale the image down to the shorter canvas axis —
  // its post-rotation bounding box then fits inside the unchanged
  // frame (with gutters on the long axis) instead of overflowing.
  const is90 = Math.round(state.quarterTurns / 90) % 2 !== 0;
  const fit = is90 ? Math.min(w, h) / Math.max(w, h) : 1;
  const drawW = w * fit;
  const drawH = h * fit;

  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();
}
