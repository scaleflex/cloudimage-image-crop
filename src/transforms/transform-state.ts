import type { TransformState, CropRect, CropShapeName, HandlePosition } from '../core/types';
import { clamp } from '../utils/math';
import { getAspectRatio, clampCropToImage, enforceAspectRatio } from './constrain';

/**
 * Default crop-rect inset from the image edge, in normalized units. The
 * initial crop fits inside a 0.8 × 0.8 centered box so the frame is
 * visually smaller than the photo and the handles sit on image pixels
 * instead of the canvas edge. Consumer can always replace via the
 * `initialCrop` option / attribute.
 */
const DEFAULT_CROP_SIZE = 0.8;

/**
 * Convert a target "screen" aspect ratio (W:H as the user sees it on the
 * canvas) into normalized-space ratio. The normalized rect `[0,1]²` maps
 * onto a canvas whose pixel aspect equals the image aspect, so a stored
 * normalized ratio `r_norm` renders on screen as `r_norm × imageAspect`.
 * To make a frame render at `targetRatio` we store `targetRatio / imageAspect`.
 */
function toNormalizedRatio(targetRatio: number, imageWidth: number, imageHeight: number): number {
  if (!imageWidth || !imageHeight) return targetRatio;
  return targetRatio / (imageWidth / imageHeight);
}

export function createInitialState(
  cropShape: CropShapeName = 'free',
  imageWidth: number = 1,
  imageHeight: number = 1,
): TransformState {
  const screenRatio = getAspectRatio(cropShape);
  let cropRect: CropRect;

  if (screenRatio !== null) {
    const ratio = toNormalizedRatio(screenRatio, imageWidth, imageHeight);
    // Fit the ratio inside the 0.8 × 0.8 centered box, then center.
    let w: number;
    let h: number;
    if (ratio >= 1) {
      w = DEFAULT_CROP_SIZE;
      h = w / ratio;
      if (h > DEFAULT_CROP_SIZE) {
        h = DEFAULT_CROP_SIZE;
        w = h * ratio;
      }
    } else {
      h = DEFAULT_CROP_SIZE;
      w = h * ratio;
      if (w > DEFAULT_CROP_SIZE) {
        w = DEFAULT_CROP_SIZE;
        h = w / ratio;
      }
    }
    cropRect = {
      x: (1 - w) / 2,
      y: (1 - h) / 2,
      width: w,
      height: h,
    };
  } else {
    // Free / rounded-rect — 0.8 × 0.8 centered square.
    const s = DEFAULT_CROP_SIZE;
    cropRect = { x: (1 - s) / 2, y: (1 - s) / 2, width: s, height: s };
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
  // Counter-clockwise 90° step. Kept unbounded (no modulo) so the spring
  // that drives `displayState.quarterTurns` always animates a single -90°
  // tick instead of snapping backwards by 270° when the normalized value
  // wraps around the `[0, 360)` boundary.
  const newRotation = state.quarterTurns - 90;

  // Keep the crop rect anchored to the canvas (screen) rather than the
  // photo: a 90° rotation only spins the image in place — the frame size
  // and position on screen stay as the user left them.
  return {
    ...state,
    quarterTurns: newRotation,
    panX: 0,
    panY: 0,
  };
}

export function applyFlipH(state: TransformState): TransformState {
  // Flip happens around the crop-rect center (see image-layer.ts), so
  // the frame stays put — no cropRect mutation needed.
  return { ...state, flipH: !state.flipH };
}

export function applyFlipV(state: TransformState): TransformState {
  return { ...state, flipV: !state.flipV };
}

export function applyRotation(state: TransformState, degrees: number): TransformState {
  const rotation = clamp(degrees, -45, 45);
  // Capture the tilt pivot once at the moment the user leaves 0°, so the
  // subject the user centred in the frame stays under the frame while
  // tilting. Keep it fixed across unrelated edits (e.g. resizing the crop
  // frame) so the photo doesn't drift. Clear it when tilt snaps back to 0.
  let rotationPivot = state.rotationPivot;
  if (rotation === 0) {
    rotationPivot = undefined;
  } else if (!rotationPivot) {
    const c = state.cropRect;
    rotationPivot = { x: c.x + c.width / 2, y: c.y + c.height / 2 };
  }
  return { ...state, rotation, rotationPivot };
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

export function applyShapeChange(
  state: TransformState,
  shape: CropShapeName,
  imageWidth: number = 1,
  imageHeight: number = 1,
): TransformState {
  const screenRatio = getAspectRatio(shape);
  let newCrop: CropRect;

  if (screenRatio === null) {
    newCrop = { ...state.cropRect };
  } else {
    const ratio = toNormalizedRatio(screenRatio, imageWidth, imageHeight);
    // Fit new ratio inside a fixed DEFAULT_CROP_SIZE box so repeated ratio
    // switches don't progressively shrink the frame. Centered on the
    // current crop's center.
    const { cropRect } = state;
    const cx = cropRect.x + cropRect.width / 2;
    const cy = cropRect.y + cropRect.height / 2;

    let w: number, h: number;
    if (ratio >= 1) {
      w = DEFAULT_CROP_SIZE;
      h = w / ratio;
      if (h > DEFAULT_CROP_SIZE) {
        h = DEFAULT_CROP_SIZE;
        w = h * ratio;
      }
    } else {
      h = DEFAULT_CROP_SIZE;
      w = h * ratio;
      if (w > DEFAULT_CROP_SIZE) {
        w = DEFAULT_CROP_SIZE;
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
