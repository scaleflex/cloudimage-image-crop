import type { CropRect, CropShapeName, TransformState } from '../core/types';
import { clamp } from '../utils/math';
import { classicDrawSize } from '../canvas/image-layer';

/**
 * Parse a free-form aspect-ratio string like `"16:9"`, `"7:2"`, or `"11:8"`
 * into a numeric ratio. Supports positive integers or decimals. Returns
 * `null` if the input isn't a valid W:H pair — consumers can then treat it
 * as a named shape (`'free'`, `'square'`, …) or reject it.
 */
export function parseRatio(name: string): number | null {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(name.trim());
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return w / h;
}

/**
 * Get the numeric aspect ratio for a crop shape. Handles the named shapes
 * (`free`, `square`, `circle`, `rounded-rect`) and every built-in preset
 * (`"16:9"`, etc.), plus any other `"W:H"` string a consumer passes in.
 * Returns `null` for free-form (no ratio constraint).
 */
export function getAspectRatio(shape: CropShapeName | string): number | null {
  switch (shape) {
    case 'free': return null;
    case 'rounded-rect': return null;
    case 'square':
    case 'circle': return 1;
    // Everything else — `"16:9"`, `"4:3"`, `"7:2"`, `"2.35:1"` — goes
    // through `parseRatio`. The switch intentionally doesn't enumerate
    // the named ratios so the library stays a parser, not a catalog.
    default: return parseRatio(shape);
  }
}

/** Clamp crop rect to stay within [0,1] image bounds. Spec section 8.3. */
export function clampCropToImage(crop: CropRect): CropRect {
  const width = clamp(crop.width, 0, 1);
  const height = clamp(crop.height, 0, 1);
  const x = clamp(crop.x, 0, 1 - width);
  const y = clamp(crop.y, 0, 1 - height);
  return { x, y, width, height };
}

/** Enforce aspect ratio on crop rect during resize. Spec section 8.3. */
export function enforceAspectRatio(
  crop: CropRect,
  ratio: number | null,
  handle: string,
  imageWidth: number,
  imageHeight: number,
  minSize: number,
): CropRect {
  if (ratio === null) {
    return enforceMinSize(crop, minSize, imageWidth, imageHeight);
  }

  // The ratio is width/height in image-normalized space
  // Adjust for actual image aspect
  const imageRatio = imageWidth / imageHeight;
  const adjustedRatio = ratio / imageRatio;

  let { x, y, width, height } = crop;

  // Determine which dimension is the driver based on handle
  const isHorizontalHandle = handle.includes('e') || handle.includes('w');
  const isVerticalHandle = handle.includes('n') || handle.includes('s');

  if (isHorizontalHandle && !isVerticalHandle) {
    height = width / adjustedRatio;
  } else if (isVerticalHandle && !isHorizontalHandle) {
    width = height * adjustedRatio;
  } else {
    // Corner handles: use width as driver
    height = width / adjustedRatio;
  }

  // Resolve the anchor each axis must hold: the edge/corner diagonally
  // opposite the dragged handle. updateResize already pinned the *driver*
  // dimension's anchor, but recomputing the *dependent* dimension above grows
  // it from the (x, y) origin — which would drag the anchored edge (e.g. an
  // N/NW/NE drag moving the bottom edge). A vertical-/horizontal-only handle
  // has no opposite corner, so it grows symmetrically about the centre.
  const origRight = crop.x + crop.width;
  const origBottom = crop.y + crop.height;
  const cx = crop.x + crop.width / 2;
  const cy = crop.y + crop.height / 2;

  // Room the rect may occupy while keeping that anchor inside the image. For a
  // centred axis it's twice the distance to the nearer edge.
  let maxWidth: number;
  if (handle.includes('w')) maxWidth = origRight; // right edge pinned
  else if (handle.includes('e')) maxWidth = 1 - crop.x; // left edge pinned
  else maxWidth = 2 * Math.min(cx, 1 - cx); // centred
  let maxHeight: number;
  if (handle.includes('n')) maxHeight = origBottom; // bottom edge pinned
  else if (handle.includes('s')) maxHeight = 1 - crop.y; // top edge pinned
  else maxHeight = 2 * Math.min(cy, 1 - cy); // centred

  // Cap the size to that room WITHOUT breaking the ratio: scale both axes by
  // the same factor (only ever shrinking). The previous independent
  // Math.min(…, 1) clamps got this wrong — they capped one axis and left the
  // other, so the locked ratio broke and the trailing clamp dragged the anchor
  // whenever the ratio-derived dimension overran the room past the pinned edge.
  const fit = Math.min(1, maxWidth / width, maxHeight / height);
  if (fit < 1) {
    width *= fit;
    height *= fit;
  }

  // Enforce the minimum crop size. Bumping one axis to the floor re-derives the
  // other through the ratio; if the anchor sits so close to an edge that the
  // min size can't fit, the trailing clamp absorbs the small overflow (a
  // physical limit, not the drift bug).
  const minW = minSize / imageWidth;
  const minH = minSize / imageHeight;
  if (width < minW) {
    width = minW;
    height = width / adjustedRatio;
  }
  if (height < minH) {
    height = minH;
    width = height * adjustedRatio;
  }

  // Place the rect so the resolved anchor stays fixed.
  if (handle.includes('w')) x = origRight - width; // pin right edge
  else if (handle.includes('e')) x = crop.x; // pin left edge
  else x = cx - width / 2; // keep horizontal centre
  if (handle.includes('n')) y = origBottom - height; // pin bottom edge
  else if (handle.includes('s')) y = crop.y; // pin top edge
  else y = cy - height / 2; // keep vertical centre

  // Safety net: keep the rect inside the image. With the room-capping above
  // this is a no-op except the over-constrained min-size corner case.
  x = clamp(x, 0, 1 - width);
  y = clamp(y, 0, 1 - height);

  return { x, y, width, height };
}

export function enforceMinSize(
  crop: CropRect,
  minSize: number,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  const minW = minSize / imageWidth;
  const minH = minSize / imageHeight;
  return {
    ...crop,
    width: Math.max(crop.width, minW),
    height: Math.max(crop.height, minH),
  };
}

/** Compute minimum scale needed to cover the crop area at a given rotation. */
export function computeMinScale(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  rotation: number,
): number {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rotatedW = imageWidth * cos + imageHeight * sin;
  const rotatedH = imageWidth * sin + imageHeight * cos;
  return Math.min(canvasWidth / rotatedW, canvasHeight / rotatedH);
}

/**
 * Cover constraint: keep the photo fully covering a target frame so the crop
 * never exports transparent gaps. Returns the `scale` / `panX` / `panY` to use
 * plus the (capped) minimum scale below which coverage breaks.
 *
 * The frame is given in container CSS px and may be **off-centre** (the classic
 * movable crop rect) or the whole editor box (the fixed variant). The photo is
 * always drawn centred in the container; pan is stored in container CSS px
 * relative to the image centre, and the live draw places the image centre at
 * `scale * pan` px from the container centre (see `image-layer.ts` —
 * translate(center)→scale→translate(pan)). The math works in CSS px and divides
 * the slack by `scale`.
 *
 * `drawW0` / `drawH0` are the photo's draw size **at scale 1** in container px —
 * the caller passes the model that matches the actual render: cover-fit
 * (`computeCoverDraw`) in the fixed variant, or the stretched container box
 * (`w × h`) in classic. This keeps the clamp aligned with what's drawn even
 * when the editor box aspect diverges from the image aspect.
 *
 * Fine tilt (`state.rotation`) inflates the frame to its axis-aligned bounding
 * box (conservative). Flip is a no-op (mirrors about the centre).
 *
 * `maxScale` caps the cover floor: if covering the frame would need more zoom
 * than the consumer allows, the floor is pinned to `maxScale` (so the returned
 * `minScale ≤ maxScale` and the renderer's scale bounds never invert — at the
 * cost of a residual gap, which is an unavoidable min/max-scale conflict).
 */
export function clampCoverPanScale(
  state: TransformState,
  containerW: number,
  containerH: number,
  frame: { x: number; y: number; width: number; height: number },
  drawW0: number,
  drawH0: number,
  maxScale: number,
): { scale: number; panX: number; panY: number; minScale: number } {
  // Tilt-inflated frame the photo must cover.
  const rad = (state.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const needW = frame.width * c + frame.height * s;
  const needH = frame.width * s + frame.height * c;

  // Scale at which the photo extents exactly cover the inflated frame, capped
  // at maxScale so the floor can never exceed the ceiling.
  const coverFloor = Math.max(needW / drawW0, needH / drawH0);
  const minScale = Math.min(coverFloor, maxScale);
  const scale = clamp(state.scale, minScale, maxScale);

  // The photo is centred in the container; offset is the container centre minus
  // the frame centre, so an off-centre crop shifts the allowed pan window.
  const offsetX = containerW / 2 - (frame.x + frame.width / 2);
  const offsetY = containerH / 2 - (frame.y + frame.height / 2);

  // Half-slack between the (scaled) photo extents and the frame it must cover.
  // Zero (locked) when the cover floor was capped below what coverage needs.
  const slackX = Math.max(0, (drawW0 * scale - needW) / 2);
  const slackY = Math.max(0, (drawH0 * scale - needH) / 2);

  return {
    scale,
    panX: clamp(state.panX, (-slackX - offsetX) / scale, (slackX - offsetX) / scale),
    panY: clamp(state.panY, (-slackY - offsetY) / scale, (slackY - offsetY) / scale),
    minScale,
  };
}

/**
 * Classic variant, free tilt: keep the photo covering the crop frame so a tilt
 * never leaves empty corners inside it (they would also reach the export — the
 * server fills them with the background colour / transparency).
 *
 * Mirrors the classic draw (`image-layer.ts`) exactly, in container CSS px with
 * the photo box `w × h` at scale 1: tilt rotates about `rotationPivot` (or the
 * frame centre), flip mirrors about the container centre, then the photo is
 * centred at `C + flip·scale·pan` and a quarter turn swaps its extents. Undoing
 * the tilt about the pivot turns the frame into a rotated rect whose bounding box
 * must sit inside the untilted photo.
 *
 * When the photo doesn't cover, it is zoomed **about the frame centre** — the
 * photo point under the frame centre stays put, so the subject doesn't slide —
 * to the smallest scale that covers. Pan is then clamped to the remaining cover
 * window (so panning while tilted can't open a gap either). `maxScale` caps the
 * zoom; past it a residual gap is unavoidable.
 */
/** Frame centre in the photo's untilted space (undo the tilt about its pivot), container px. */
function untiltedFrameCentre(state: TransformState, w: number, h: number): { ux: number; uy: number } {
  const crop = state.cropRect;
  const fcx = (crop.x + crop.width / 2) * w;
  const fcy = (crop.y + crop.height / 2) * h;
  const pivot = state.rotationPivot ?? { x: crop.x + crop.width / 2, y: crop.y + crop.height / 2 };
  const px = pivot.x * w;
  const py = pivot.y * h;
  const rad = (state.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    ux: px + cos * (fcx - px) + sin * (fcy - py),
    uy: py - sin * (fcx - px) + cos * (fcy - py),
  };
}

/**
 * Re-express a view (`state.scale`/`panX`/`panY`) at another scale, keeping the
 * photo point under the frame centre where it is — the inverse of the
 * zoom-about-frame-centre that {@link coverTiltedFrame} applies. Used to fold a
 * pan made at the on-screen (auto-zoomed) scale back into the user's own zoom.
 */
export function rebaseTiltedPan(
  state: TransformState,
  toScale: number,
  w: number,
  h: number,
): { panX: number; panY: number } {
  const { ux, uy } = untiltedFrameCentre(state, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const fX = state.flipH ? -1 : 1;
  const fY = state.flipV ? -1 : 1;
  const k = toScale / state.scale;
  // Photo centre that keeps the same photo point under the frame centre.
  const ocx = ux - k * (ux - (cx + fX * state.scale * state.panX));
  const ocy = uy - k * (uy - (cy + fY * state.scale * state.panY));
  return { panX: (ocx - cx) / (fX * toScale), panY: (ocy - cy) / (fY * toScale) };
}

export function coverTiltedFrame(
  state: TransformState,
  w: number,
  h: number,
  maxScale: number,
  /** Natural photo size — only needed for an odd turn in a box that kept its aspect. */
  imageW: number = w,
  imageH: number = h,
  /**
   * `clampPanFirst`: when the current scale CAN cover the frame (≥ the pan-free
   * floor), restore cover by clamping pan only — no zoom. For a pan-drag, so
   * dragging the photo off the frame hits a wall instead of zooming in.
   */
  opts: { clampPanFirst?: boolean } = {},
): { scale: number; panX: number; panY: number; minScale: number } {
  const crop = state.cropRect;
  const fw = crop.width * w;
  const fh = crop.height * h;
  const rad = (state.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const { ux, uy } = untiltedFrameCentre(state, w, h);
  // Half extents of the frame's bounding box in that space.
  const hw = (fw * Math.abs(cos) + fh * Math.abs(sin)) / 2;
  const hh = (fw * Math.abs(sin) + fh * Math.abs(cos)) / 2;

  // Photo half extents at scale 1, after its quarter turn — same draw rule as
  // the canvas (classicDrawSize): the box itself, unless an odd turn kept the
  // box's aspect, where the turned photo is cover-fit and overflows one axis.
  const odd = Math.round(state.quarterTurns / 90) % 2 !== 0;
  const draw = classicDrawSize(w, h, imageW, imageH, state.quarterTurns, state.turnedBox);
  const halfW = (odd ? draw.drawH : draw.drawW) / 2;
  const halfH = (odd ? draw.drawW : draw.drawH) / 2;
  const cx = w / 2;
  const cy = h / 2;
  const fX = state.flipH ? -1 : 1;
  const fY = state.flipV ? -1 : 1;

  // Pan-free floor: below it no pan can cover the frame.
  const minScale = Math.min(Math.max(hw / halfW, hh / halfH), maxScale);

  // Photo centre now, and the photo-local point under the frame centre.
  let scale = state.scale;
  const ocx = cx + fX * scale * state.panX;
  const ocy = cy + fY * scale * state.panY;
  const lx = (ux - ocx) / scale;
  const ly = (uy - ocy) / scale;

  const covered = Math.abs(ux - ocx) + hw <= scale * halfW + 1e-6 && Math.abs(uy - ocy) + hh <= scale * halfH + 1e-6;
  let panX = state.panX;
  let panY = state.panY;
  if (!covered && !(opts.clampPanFirst && scale >= minScale - 1e-9)) {
    // Smallest scale that covers while zooming about the frame centre:
    // |s·l| + half ≤ s·halfPhoto  ⇔  s ≥ half / (halfPhoto − |l|).
    const need = (half: number, l: number, halfPhoto: number): number =>
      Math.abs(l) < halfPhoto ? half / (halfPhoto - Math.abs(l)) : Number.POSITIVE_INFINITY;
    const zoomed = Math.max(scale, need(hw, lx, halfW), need(hh, ly, halfH));
    scale = Math.min(Number.isFinite(zoomed) ? zoomed : Math.max(scale, minScale), maxScale);
    // Re-place the photo so the same point stays under the frame centre.
    panX = fX * (ux - scale * lx - cx) / scale;
    panY = fY * (uy - scale * ly - cy) / scale;
  }
  scale = Math.max(scale, minScale);

  // Clamp pan to the cover window at the final scale.
  const slackX = Math.max(0, scale * halfW - hw);
  const slackY = Math.max(0, scale * halfH - hh);
  const panWindow = (d: number, slack: number, f: number): [number, number] => {
    const a = (d - slack) / (f * scale);
    const b = (d + slack) / (f * scale);
    return a < b ? [a, b] : [b, a];
  };
  const [x0, x1] = panWindow(ux - cx, slackX, fX);
  const [y0, y1] = panWindow(uy - cy, slackY, fY);
  return { scale, panX: clamp(panX, x0, x1), panY: clamp(panY, y0, y1), minScale };
}

/** Snap rotation near 0 within threshold. */
export function snapRotation(degrees: number, threshold: number = 2): number {
  if (Math.abs(degrees) < threshold) {
    return 0;
  }
  return degrees;
}

/** Constrain scale to range. */
export function constrainScale(
  scale: number,
  minScale: number,
  maxScale: number,
): number {
  return clamp(scale, minScale, maxScale);
}

/** @deprecated Use clampCropToImage instead */
export const constrainCropBounds = clampCropToImage;
/** @deprecated Use enforceAspectRatio instead */
export const constrainAspectRatio = enforceAspectRatio;
