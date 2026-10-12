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

/**
 * Classic variant draw size (un-turned) of the photo in a `boxW×boxH` box, shared
 * with the exporter so canvas and server stay in sync:
 * - the turned photo's orientation matches the box (`turnedBox` ⇔ odd turn) → it
 *   fills the box exactly (drawn `boxH×boxW` on an odd turn, then turned);
 * - it doesn't (a picked ratio kept its box through a turn) → the turned photo is
 *   cover-fit, overflowing one axis, so any frame in the box stays filled.
 */
export function classicDrawSize(
  boxW: number,
  boxH: number,
  imageW: number,
  imageH: number,
  quarterTurns: number,
  turnedBox: boolean | undefined,
): { drawW: number; drawH: number } {
  const odd = Math.round(quarterTurns / 90) % 2 !== 0;
  if (turnedBox === undefined) {
    // Legacy (≤ 3.0.0) state: an odd turn letterboxed the photo — scaled down
    // to the box's shorter axis so its turned footprint fits the unchanged box.
    const fit = odd ? Math.min(boxW, boxH) / Math.max(boxW, boxH) : 1;
    return { drawW: boxW * fit, drawH: boxH * fit };
  }
  if (odd === turnedBox) return odd ? { drawW: boxH, drawH: boxW } : { drawW: boxW, drawH: boxH };
  return computeCoverDraw(boxW, boxH, imageW, imageH, quarterTurns);
}

/**
 * A state written by 3.0.0 or earlier — before `turnedBox` existed. Every
 * state this version creates carries an explicit `turnedBox` boolean, so its
 * absence marks a saved descriptor from the old layout, which renders exactly
 * as 3.0.0 did: odd turns letterboxed (see {@link classicDrawSize}) and flip
 * mirrored about the crop centre (see {@link flipPivot}).
 */
export function isLegacyLayout(state: { turnedBox?: boolean }): boolean {
  return state.turnedBox === undefined;
}

/**
 * Normalized point the flip mirrors about: the photo/box centre — or, for a
 * legacy (≤ 3.0.0) state, the crop-frame centre, as 3.0.0 did.
 */
export function flipPivot(state: {
  turnedBox?: boolean;
  cropRect: { x: number; y: number; width: number; height: number };
}): { x: number; y: number } {
  if (!isLegacyLayout(state)) return { x: 0.5, y: 0.5 };
  const c = state.cropRect;
  return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
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
  /**
   * Quarter turns that decide the draw SIZE — the turn being animated TO. The
   * angle itself still follows the animated `state.quarterTurns`; sizing off
   * the animated value instead would switch draw rules halfway (at 45°) and
   * make the photo visibly jump in size mid-turn, while the box (and
   * `turnedBox`) have already snapped to the final layout.
   */
  layoutTurns: number = state.quarterTurns,
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
    const fp = flipPivot(state);
    const fx = x + fp.x * w;
    const fy = y + fp.y * h;
    ctx.translate(fx, fy);
    ctx.scale(state.flipH, state.flipV);
    ctx.translate(-fx, -fy);
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
    const c = computeCoverDraw(w, h, image.naturalWidth, image.naturalHeight, layoutTurns);
    drawW = c.drawW;
    drawH = c.drawH;
  } else {
    const c = classicDrawSize(w, h, image.naturalWidth, image.naturalHeight, layoutTurns, state.turnedBox);
    drawW = c.drawW;
    drawH = c.drawH;
  }

  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();
}
