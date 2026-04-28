import type { CropRect } from '../core/types';
import { clamp } from '../utils/math';
import { enforceAspectRatio, getAspectRatio } from '../transforms/constrain';
import type { CropShapeName } from '../core/types';

export interface ResizeState {
  handle: string;
  startCrop: CropRect;
  startX: number;
  startY: number;
}

export interface ResizeModifiers {
  shiftKey: boolean;
  altKey: boolean;
}

export function startResize(
  handle: string,
  crop: CropRect,
  pointerX: number,
  pointerY: number,
): ResizeState {
  // Normalize to the bare position ("nw", "se", …). Callers pass the full
  // hit-test id like "handle-nw"; leaving the "handle-" prefix in place
  // silently triggers the `includes('e')` / `includes('n')` branches below
  // (the word "handle" itself contains 'e' and 'n'), which makes e.g. the
  // SE handle also move the top edge.
  const position = handle.startsWith('handle-') ? handle.slice(7) : handle;
  return {
    handle: position,
    startCrop: { ...crop },
    startX: pointerX,
    startY: pointerY,
  };
}

export function updateResize(
  state: ResizeState,
  pointerX: number,
  pointerY: number,
  imageWidth: number,
  imageHeight: number,
  cropShape: CropShapeName,
  minCropSize: number,
  modifiers: ResizeModifiers = { shiftKey: false, altKey: false },
): CropRect {
  const dx = (pointerX - state.startX) / imageWidth;
  const dy = (pointerY - state.startY) / imageHeight;
  const { startCrop, handle } = state;

  let x = startCrop.x;
  let y = startCrop.y;
  let width = startCrop.width;
  let height = startCrop.height;

  const minW = minCropSize / imageWidth;
  const minH = minCropSize / imageHeight;

  // Adjust based on handle
  if (handle.includes('w')) {
    const newX = clamp(x + dx, 0, x + width - minW);
    width = width - (newX - x);
    x = newX;
  }
  if (handle.includes('e')) {
    width = clamp(width + dx, minW, 1 - x);
  }
  if (handle.includes('n')) {
    const newY = clamp(y + dy, 0, y + height - minH);
    height = height - (newY - y);
    y = newY;
  }
  if (handle.includes('s')) {
    height = clamp(height + dy, minH, 1 - y);
  }

  // Ensure minimum size
  width = Math.max(width, minW);
  height = Math.max(height, minH);

  // Alt key: resize from center (spec section 9.3)
  if (modifiers.altKey) {
    const cx = startCrop.x + startCrop.width / 2;
    const cy = startCrop.y + startCrop.height / 2;
    const halfW = width / 2;
    const halfH = height / 2;
    x = clamp(cx - halfW, 0, 1 - width);
    y = clamp(cy - halfH, 0, 1 - height);
  }

  let crop: CropRect = { x, y, width, height };

  // Determine effective aspect ratio
  let effectiveRatio = getAspectRatio(cropShape);

  // Shift key: temporarily lock aspect ratio in free mode (spec section 9.3)
  if (modifiers.shiftKey && cropShape === 'free') {
    effectiveRatio = startCrop.width / startCrop.height;
  }

  if (effectiveRatio !== null) {
    crop = enforceAspectRatio(crop, effectiveRatio, handle, imageWidth, imageHeight, minCropSize);
  }

  return crop;
}
