import type { CropRect, CropShapeName, TransformState } from '../core/types';
import { clamp } from '../utils/math';
import { computeCoverDraw } from '../canvas/image-layer';

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

  // Enforce minimum
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

  // Clamp to bounds
  width = Math.min(width, 1);
  height = Math.min(height, 1);
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
 * plus the minimum scale below which coverage breaks.
 *
 * The frame is given in container CSS px and may be **off-centre** (the classic
 * movable crop rect) or the whole editor box (the fixed variant). The photo is
 * always drawn centred in the container; pan is stored in container CSS px
 * relative to the image centre, and the live draw places the image centre at
 * `scale * pan` px from the container centre (see `image-layer.ts` —
 * translate(center)→scale→translate(pan)). The math works in CSS px and divides
 * the slack by `scale`.
 *
 * Fine tilt (`state.rotation`) is handled conservatively by inflating the frame
 * the photo must cover to the tilt's axis-aligned bounding box. Flip is a no-op
 * (mirrors about the centre). 90° turns are folded into `computeCoverDraw`.
 */
export function clampCoverPanScale(
  state: TransformState,
  containerW: number,
  containerH: number,
  frame: { x: number; y: number; width: number; height: number },
  imageW: number,
  imageH: number,
): { scale: number; panX: number; panY: number; minScale: number } {
  // Base cover draw size (CSS px) at scale 1 — the photo drawn to cover the
  // whole container at its natural aspect.
  const { drawW, drawH } = computeCoverDraw(containerW, containerH, imageW, imageH, state.quarterTurns);

  // Tilt-inflated frame the photo must cover.
  const rad = (state.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const needW = frame.width * c + frame.height * s;
  const needH = frame.width * s + frame.height * c;

  // Minimum scale so the (scaled) photo extents cover the inflated frame.
  const minScale = Math.max(needW / drawW, needH / drawH);
  const scale = Math.max(state.scale, minScale);

  // The photo is centred in the container; offset is the container centre minus
  // the frame centre, so an off-centre crop shifts the allowed pan window.
  const offsetX = containerW / 2 - (frame.x + frame.width / 2);
  const offsetY = containerH / 2 - (frame.y + frame.height / 2);

  // Half-slack between the (scaled) photo extents and the frame it must cover.
  const slackX = Math.max(0, (drawW * scale - needW) / 2);
  const slackY = Math.max(0, (drawH * scale - needH) / 2);

  return {
    scale,
    panX: clamp(state.panX, (-slackX - offsetX) / scale, (slackX - offsetX) / scale),
    panY: clamp(state.panY, (-slackY - offsetY) / scale, (slackY - offsetY) / scale),
    minScale,
  };
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
