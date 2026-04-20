import type { CropShapeName } from '../core/types';

const DEFAULT_SHAPES: CropShapeName[] = [
  'free', 'square', 'circle', 'rounded-rect', '16:9', '4:3', '3:2',
];

/**
 * Normalize the `availableShapes` / `available-shapes` input across the three
 * shapes an attribute/property can take: a live `CropShapeName[]` assigned via
 * property binding, a JSON array (`'["free","circle"]'`), or a CSV/whitespace
 * string (`'free, circle'`).
 *
 * Returns `undefined` when the caller didn't specify anything and wants the
 * default list — element/toolbar consumers fall back to {@link DEFAULT_SHAPES}.
 */
export function parseAvailableShapes(
  v: CropShapeName[] | string | null | undefined,
): CropShapeName[] | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed as CropShapeName[];
    } catch {
      // fall through to CSV split
    }
  }
  return trimmed.split(/[\s,]+/).filter(Boolean) as CropShapeName[];
}

export { DEFAULT_SHAPES };
