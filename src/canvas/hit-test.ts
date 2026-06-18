import type { HitTarget, CursorStyle, HandlePosition } from '../core/types';
import { getHandleRects } from './crop-frame';

const HANDLE_POSITIONS: readonly HandlePosition[] = [
  'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w',
];

function toHandlePosition(raw: string): HandlePosition | null {
  return (HANDLE_POSITIONS as readonly string[]).includes(raw) ? (raw as HandlePosition) : null;
}

function pointInRect(
  px: number,
  py: number,
  rect: { x: number; y: number; w: number; h: number },
): boolean {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

/** Determine what's under the cursor. */
export function hitTest(
  px: number,
  py: number,
  cropRect: { x: number; y: number; width: number; height: number },
): HitTarget {
  // Check handles first (highest priority)
  const handles = getHandleRects(cropRect);
  for (const { target, rect } of handles) {
    if (pointInRect(px, py, rect)) {
      if (target === 'move-handle') return { type: 'move-handle' };
      const position = toHandlePosition(target.replace('handle-', ''));
      if (position) return { type: 'handle', position };
    }
  }

  // Check if inside crop area
  if (
    px >= cropRect.x &&
    px <= cropRect.x + cropRect.width &&
    py >= cropRect.y &&
    py <= cropRect.y + cropRect.height
  ) {
    return { type: 'crop-area' };
  }

  return { type: 'outside' };
}

/** Map hit target to CSS cursor style. */
export function getCursor(target: HitTarget, isDragging: boolean): CursorStyle {
  if (target.type === 'move-handle') return 'move';

  switch (target.type) {
    // Classic: dragging inside the frame moves the crop rect → 'move'.
    case 'crop-area': return 'move';
    // Outside the frame (on the photo) pans the image → grab / grabbing.
    case 'outside': return isDragging ? 'grabbing' : 'grab';
    case 'handle': {
      switch (target.position) {
        case 'nw': case 'se': return 'nwse-resize';
        case 'ne': case 'sw': return 'nesw-resize';
        case 'n': case 's': return 'ns-resize';
        case 'e': case 'w': return 'ew-resize';
        default: return 'default';
      }
    }
    default: return 'default';
  }
}
