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

  // 1. Fine rotation + flip, applied first in canvas-pixel space before the
  //    image-local chain. Tilt pivots about a point captured at first tilt
  //    (`state.rotationPivot`); flip pivots about the IMAGE centre (cx, cy).
  //    Both are decoupled from the live crop rect, so moving or resizing the
  //    frame never drags the tilted / mirrored photo along with it.
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
    ctx.translate(cx, cy);
    ctx.scale(state.flipH, state.flipV);
    ctx.translate(-cx, -cy);
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
    // Classic: the photo is a free layer drawn at the container size (the box
    // carries the photo's aspect) and zoomed/panned by the user. A 90°/270° turn
    // must NOT change the photo's size — it just rotates in place at the current
    // scale. Its post-rotation footprint may overflow the canvas (the long axis
    // sticks out); that's fine in the free-layer model — pan/zoom to reframe.
    drawW = w;
    drawH = h;
  }

  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();
}
