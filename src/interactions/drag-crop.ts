import type { CropRect } from '../core/types';
import { clamp } from '../utils/math';

export interface DragCropState {
  startCrop: CropRect;
  startX: number;
  startY: number;
}

/** Start dragging the crop area. */
export function startDragCrop(
  crop: CropRect,
  pointerX: number,
  pointerY: number,
): DragCropState {
  return {
    startCrop: { ...crop },
    startX: pointerX,
    startY: pointerY,
  };
}

/** Update crop position during drag. Returns new normalized crop rect. */
export function updateDragCrop(
  drag: DragCropState,
  pointerX: number,
  pointerY: number,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  const dx = (pointerX - drag.startX) / imageWidth;
  const dy = (pointerY - drag.startY) / imageHeight;

  const { startCrop } = drag;
  return {
    x: clamp(startCrop.x + dx, 0, 1 - startCrop.width),
    y: clamp(startCrop.y + dy, 0, 1 - startCrop.height),
    width: startCrop.width,
    height: startCrop.height,
  };
}
