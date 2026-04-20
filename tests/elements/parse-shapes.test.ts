import { describe, it, expect } from 'vitest';
import { parseAvailableShapes, DEFAULT_SHAPES } from '../../src/elements/parse-shapes';
import type { CropShapeName } from '../../src/core/types';

describe('parseAvailableShapes', () => {
  it('passes through a CropShapeName[]', () => {
    const input: CropShapeName[] = ['circle', '16:9'];
    expect(parseAvailableShapes(input)).toEqual(['circle', '16:9']);
  });

  it('parses a JSON array attribute', () => {
    expect(parseAvailableShapes('["free","circle","3:2"]'))
      .toEqual(['free', 'circle', '3:2']);
  });

  it('falls back to CSV split when JSON is malformed', () => {
    expect(parseAvailableShapes('["bad'))
      .toEqual(['["bad']);
  });

  it('parses a comma-separated string', () => {
    expect(parseAvailableShapes('free,circle,16:9'))
      .toEqual(['free', 'circle', '16:9']);
  });

  it('parses whitespace-separated tokens', () => {
    expect(parseAvailableShapes('free circle 16:9'))
      .toEqual(['free', 'circle', '16:9']);
  });

  it('returns undefined for null/empty/whitespace input', () => {
    expect(parseAvailableShapes(null)).toBeUndefined();
    expect(parseAvailableShapes(undefined)).toBeUndefined();
    expect(parseAvailableShapes('')).toBeUndefined();
    expect(parseAvailableShapes('   ')).toBeUndefined();
  });

  it('DEFAULT_SHAPES covers the canonical preset set', () => {
    expect(DEFAULT_SHAPES).toContain('free');
    expect(DEFAULT_SHAPES).toContain('circle');
    expect(DEFAULT_SHAPES).toContain('rounded-rect');
    expect(DEFAULT_SHAPES.length).toBeGreaterThan(5);
  });
});
