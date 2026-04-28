import type { CropRect, CropShapeName } from '../core/types';
import { clamp } from '../utils/math';

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
