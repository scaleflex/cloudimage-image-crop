import { clamp } from '../utils/math';

export interface WheelZoomConfig {
  minScale: number;
  maxScale: number;
  sensitivity: number;
}

export interface WheelZoomResult {
  scale: number;
  panDeltaX: number;
  panDeltaY: number;
}

/** Calculate new scale and pan from a wheel event. Centers zoom on cursor position. */
export function handleWheelZoom(
  deltaY: number,
  currentScale: number,
  config: WheelZoomConfig,
  cursorX?: number,
  cursorY?: number,
  canvasCenterX?: number,
  canvasCenterY?: number,
): WheelZoomResult {
  const factor = 1 - deltaY * config.sensitivity * 0.001;
  const newScale = clamp(currentScale * factor, config.minScale, config.maxScale);

  let panDeltaX = 0;
  let panDeltaY = 0;

  // Center zoom on cursor (spec section 3.4)
  if (cursorX !== undefined && canvasCenterX !== undefined) {
    const scaleRatio = 1 - newScale / currentScale;
    panDeltaX = (cursorX - canvasCenterX) * scaleRatio;
    panDeltaY = (cursorY! - canvasCenterY!) * scaleRatio;
  }

  return { scale: newScale, panDeltaX, panDeltaY };
}
