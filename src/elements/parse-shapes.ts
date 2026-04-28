import type { CropShapeName } from '../core/types';
import { parseRatio } from '../transforms/constrain';

// Full preset list, ordered wide → square → tall, matching JoliPage's
// aspect-ratio picker so the shape selector feels consistent across
// Scaleflex surfaces.
// Canonical default preset list — Free, Square, and the five most common
// landscape/portrait ratio pairs (16:9, 4:3, 3:2, 5:4, 2:1). Consumers
// add whatever else they need via `availableShapes`; any `"W:H"` string
// is parsed on the fly.
const DEFAULT_SHAPES: CropShapeName[] = [
  'free',
  'square',
  // Landscape
  '16:9', '4:3', '3:2', '5:4', '2:1',
  // Portrait
  '9:16', '3:4', '2:3', '4:5', '1:2',
];

// Whitelist for the built-in geometry shapes. Anything not listed here
// still passes validation if it matches the `"W:H"` pattern — see
// `isValidShape` below.
const VALID_SHAPES: readonly CropShapeName[] = [
  'free', 'square', 'circle', 'rounded-rect',
];

/**
 * A shape is valid if it's either in the built-in preset list, or a
 * well-formed free-form `"W:H"` aspect-ratio string (`"7:2"`, `"11:8"`…).
 * Lets consumers pass ad-hoc ratios without extending the `CropShapeName`
 * union in the library.
 */
function isValidShape(v: unknown): v is CropShapeName {
  if (typeof v !== 'string') return false;
  if ((VALID_SHAPES as readonly string[]).includes(v)) return true;
  return parseRatio(v) !== null;
}

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
  if (Array.isArray(v)) return v.filter(isValidShape);
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(isValidShape);
    } catch {
      // fall through to CSV split
    }
  }
  return trimmed.split(/[\s,]+/).filter(Boolean).filter(isValidShape);
}

export { DEFAULT_SHAPES };
