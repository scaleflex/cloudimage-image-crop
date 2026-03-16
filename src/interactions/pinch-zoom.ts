import type { PointerInfo } from './pointer-tracker';
import { distance } from '../utils/math';

export interface PinchState {
  initialDistance: number;
  initialScale: number;
  initialCenterX: number;
  initialCenterY: number;
}

export interface PinchResult {
  scale: number;
  panDeltaX: number;
  panDeltaY: number;
}

export function startPinch(pointers: PointerInfo[], currentScale: number): PinchState | null {
  if (pointers.length < 2) return null;

  const [a, b] = pointers;
  const dist = distance(a.x, a.y, b.x, b.y);
  if (dist < 10) return null;

  return {
    initialDistance: dist,
    initialScale: currentScale,
    initialCenterX: (a.x + b.x) / 2,
    initialCenterY: (a.y + b.y) / 2,
  };
}

export function updatePinch(
  state: PinchState,
  pointers: PointerInfo[],
  minScale: number,
  maxScale: number,
): PinchResult {
  if (pointers.length < 2) return { scale: state.initialScale, panDeltaX: 0, panDeltaY: 0 };

  const [a, b] = pointers;
  const dist = distance(a.x, a.y, b.x, b.y);
  const ratio = dist / state.initialDistance;
  const newScale = Math.min(Math.max(state.initialScale * ratio, minScale), maxScale);

  const centerX = (a.x + b.x) / 2;
  const centerY = (a.y + b.y) / 2;
  const panDeltaX = centerX - state.initialCenterX;
  const panDeltaY = centerY - state.initialCenterY;

  return { scale: newScale, panDeltaX, panDeltaY };
}
