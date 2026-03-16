import type { CropRect, CropShapeName } from '../core/types';
import { clamp } from '../utils/math';

/** Get the numeric aspect ratio for a crop shape. null = free. */
export function getAspectRatio(shape: CropShapeName): number | null {
  switch (shape) {
    case 'free': return null;
    case 'square': return 1;
    case 'circle': return 1;
    case 'rounded-rect': return null;
    case '16:9': return 16 / 9;
    case '9:16': return 9 / 16;
    case '4:3': return 4 / 3;
    case '3:4': return 3 / 4;
    case '3:2': return 3 / 2;
    case '2:3': return 2 / 3;
    default: return null;
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
