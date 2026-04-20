import type { TransformState, CropRect, CropShapeName, HandlePosition } from '../core/types';
import { clamp } from '../utils/math';
import { getAspectRatio, clampCropToImage, enforceAspectRatio } from './constrain';

export function createInitialState(cropShape: CropShapeName = 'free'): TransformState {
  const ratio = getAspectRatio(cropShape);
  let cropRect: CropRect;

  if (ratio !== null) {
    // Center a crop rect with the given aspect ratio, fitting within the image
    if (ratio >= 1) {
      // Landscape or square
      const h = 1 / ratio;
      cropRect = { x: 0, y: (1 - h) / 2, width: 1, height: h };
    } else {
      // Portrait
      const w = ratio;
      cropRect = { x: (1 - w) / 2, y: 0, width: w, height: 1 };
    }
  } else {
    cropRect = { x: 0, y: 0, width: 1, height: 1 };
  }

  return {
    quarterTurns: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
    scale: 1,
    panX: 0,
    panY: 0,
    cropRect,
  };
}

export function applyRotateLeft(state: TransformState): TransformState {
  const newRotation = state.quarterTurns - 90;

  // Swap crop dimensions when rotating 90°
  const { cropRect } = state;
  const newCrop: CropRect = {
    x: cropRect.y,
    y: 1 - cropRect.x - cropRect.width,
    width: cropRect.height,
    height: cropRect.width,
  };

  return {
    ...state,
    quarterTurns: newRotation,
    cropRect: newCrop,
    panX: 0,
    panY: 0,
  };
}

export function applyFlipH(state: TransformState): TransformState {
  const { cropRect } = state;
  return {
    ...state,
    flipH: !state.flipH,
    cropRect: {
      ...cropRect,
      x: 1 - cropRect.x - cropRect.width,
    },
  };
}

export function applyFlipV(state: TransformState): TransformState {
  const { cropRect } = state;
  return {
    ...state,
    flipV: !state.flipV,
    cropRect: {
      ...cropRect,
      y: 1 - cropRect.y - cropRect.height,
    },
  };
}

export function applyRotation(state: TransformState, degrees: number): TransformState {
  return {
    ...state,
    rotation: clamp(degrees, -45, 45),
  };
}

export function applyScale(state: TransformState, scale: number, minScale: number, maxScale: number): TransformState {
  return {
    ...state,
    scale: clamp(scale, minScale, maxScale),
  };
}

export function applyCropMove(state: TransformState, cropRect: CropRect): TransformState {
  return {
    ...state,
    cropRect: {
      x: clamp(cropRect.x, 0, 1 - cropRect.width),
      y: clamp(cropRect.y, 0, 1 - cropRect.height),
      width: clamp(cropRect.width, 0, 1),
      height: clamp(cropRect.height, 0, 1),
    },
  };
}

export function applyShapeChange(state: TransformState, shape: CropShapeName): TransformState {
  const ratio = getAspectRatio(shape);
  let newCrop: CropRect;

  if (ratio === null) {
    newCrop = { ...state.cropRect };
  } else {
    // Fit new ratio within current crop area, centered
    const { cropRect } = state;
    const cx = cropRect.x + cropRect.width / 2;
    const cy = cropRect.y + cropRect.height / 2;

    let w: number, h: number;
    if (ratio >= 1) {
      w = cropRect.width;
      h = w / ratio;
      if (h > cropRect.height) {
        h = cropRect.height;
        w = h * ratio;
      }
    } else {
      h = cropRect.height;
      w = h * ratio;
      if (w > cropRect.width) {
        w = cropRect.width;
        h = w / ratio;
      }
    }

    newCrop = {
      x: clamp(cx - w / 2, 0, 1 - w),
      y: clamp(cy - h / 2, 0, 1 - h),
      width: w,
      height: h,
    };
  }

  return {
    ...state,
    cropRect: newCrop,
  };
}

export function applyPan(state: TransformState, dx: number, dy: number): TransformState {
  return {
    ...state,
    panX: state.panX + dx,
    panY: state.panY + dy,
  };
}

/** Pure crop resize — spec section 8.1. dx/dy in normalized [0,1] space. */
export function applyCropResize(
  state: TransformState,
  handle: HandlePosition,
  dx: number,
  dy: number,
  cropShape: CropShapeName = 'free',
  minCropSize: number = 20,
  imageWidth: number = 1000,
  imageHeight: number = 1000,
): TransformState {
  const { cropRect } = state;
  let { x, y, width, height } = cropRect;

  const minW = minCropSize / imageWidth;
  const minH = minCropSize / imageHeight;

  if (handle.includes('w')) {
    const newX = Math.max(0, Math.min(x + dx, x + width - minW));
    width = width - (newX - x);
    x = newX;
  }
  if (handle.includes('e')) {
    width = Math.max(minW, Math.min(width + dx, 1 - x));
  }
  if (handle.includes('n')) {
    const newY = Math.max(0, Math.min(y + dy, y + height - minH));
    height = height - (newY - y);
    y = newY;
  }
  if (handle.includes('s')) {
    height = Math.max(minH, Math.min(height + dy, 1 - y));
  }

  width = Math.max(width, minW);
  height = Math.max(height, minH);

  let newCrop: CropRect = { x, y, width, height };

  const ratio = getAspectRatio(cropShape);
  if (ratio !== null) {
    newCrop = enforceAspectRatio(newCrop, ratio, handle, imageWidth, imageHeight, minCropSize);
  }

  newCrop = clampCropToImage(newCrop);

  return { ...state, cropRect: newCrop };
}
