import type { HitTarget, CursorStyle, HandlePosition } from '../core/types';
import { getHandleRects } from './crop-frame';

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
      const position = target.replace('handle-', '') as HandlePosition;
      return { type: 'handle', position };
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
  if (isDragging && target.type === 'crop-area') return 'grabbing';

  switch (target.type) {
    case 'crop-area': return 'move';
    case 'outside': return 'crosshair';
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
