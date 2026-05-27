import type { DisplayState } from '../core/types';
import { degreesToRadians } from '../utils/math';

/**
 * Aspect-preserving COVER size (in the container's CSS-px units) for drawing
 * `imageW×imageH` so it fully covers `containerW×containerH` with no gaps.
 *
 * `quarterTurns` is accounted for: on an odd 90° turn the image is rotated in
 * place, so the un-rotated draw rect must cover the *swapped* container box
 * (`containerH×containerW`) for the rotated footprint to cover the frame.
 *
 * Shared by the live renderer (fixed variant) and the exporter so the framing
 * matches the canvas pixel-for-pixel.
 */
export function computeCoverDraw(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
  quarterTurns: number,
): { drawW: number; drawH: number } {
  const is90 = Math.round(quarterTurns / 90) % 2 !== 0;
  const targetW = is90 ? containerH : containerW;
  const targetH = is90 ? containerW : containerH;
  const s = Math.max(targetW / imageW, targetH / imageH);
  return { drawW: imageW * s, drawH: imageH * s };
}

export function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  imgRect: { x: number; y: number; w: number; h: number },
  state: DisplayState,
  /**
   * Fixed variant: draw the photo COVER-fit (preserving its natural aspect) so
   * it fills the frame-shaped editor box. In classic mode the box already has
   * the photo's aspect, so the photo is stretched edge-to-edge as before.
   */
  cover: boolean = false,
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
  let drawW: number;
  let drawH: number;
  if (cover) {
    // Fixed variant: cover the frame box at the photo's natural aspect so the
    // frame is always fully painted. The cover-clamp on pan/scale (controller)
    // keeps it covered as the user pans/zooms/tilts.
    const c = computeCoverDraw(w, h, image.naturalWidth, image.naturalHeight, state.quarterTurns);
    drawW = c.drawW;
    drawH = c.drawH;
  } else {
    // Classic: the canvas keeps its size across 90° rotations, so on a
    // quarter-turn we scale the image down to the shorter canvas axis — its
    // post-rotation bounding box then fits inside the unchanged frame (with
    // gutters on the long axis) instead of overflowing.
    const is90 = Math.round(state.quarterTurns / 90) % 2 !== 0;
    const fit = is90 ? Math.min(w, h) / Math.max(w, h) : 1;
    drawW = w * fit;
    drawH = h * fit;
  }

  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();
}
