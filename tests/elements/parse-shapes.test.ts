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

  it('falls back to CSV split when JSON is malformed and drops unknown tokens', () => {
    // Malformed JSON input still goes through the CSV path; unknown tokens
    // (`["bad`) are rejected by the shape whitelist, so we end up with [].
    expect(parseAvailableShapes('["bad')).toEqual([]);
  });

  it('filters unknown shape names', () => {
    expect(parseAvailableShapes('free, evil, circle, 999'))
      .toEqual(['free', 'circle']);
    expect(parseAvailableShapes('["free", 999, "evil", "4:3"]'))
      .toEqual(['free', '4:3']);
  });

  it('accepts consumer-supplied W:H ratios that are not in the built-in list', () => {
    expect(parseAvailableShapes('free, 7:2, 11:8, 16:9'))
      .toEqual(['free', '7:2', '11:8', '16:9']);
    expect(parseAvailableShapes('["square", "2.5:1", "8:11"]'))
      .toEqual(['square', '2.5:1', '8:11']);
  });

  it('rejects malformed ratio strings', () => {
    expect(parseAvailableShapes('7x2, 16/9, :3, 4:, 0:1'))
      .toEqual([]);
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

  it('DEFAULT_SHAPES is the canonical ratio set', () => {
    // Free + square + five landscape/portrait pairs (16:9, 4:3, 3:2,
    // 5:4, 2:1). Circle and rounded-rect are valid `CropShapeName`s
    // but must be opted into explicitly via availableShapes. Any other
    // `"W:H"` string — `"21:9"`, `"2.35:1"`, ... — is parsed on the fly.
    expect(DEFAULT_SHAPES).toEqual([
      'free', 'square',
      '16:9', '4:3', '3:2', '5:4', '2:1',
      '9:16', '3:4', '2:3', '4:5', '1:2',
    ]);
  });
});
