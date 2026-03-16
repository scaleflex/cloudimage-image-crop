import { describe, it, expect } from 'vitest';
import { getAspectRatio, clampCropToImage, constrainScale, snapRotation } from '../../src/transforms/constrain';

describe('getAspectRatio', () => {
  it('should return null for free', () => {
    expect(getAspectRatio('free')).toBeNull();
  });

  it('should return 1 for square', () => {
    expect(getAspectRatio('square')).toBe(1);
  });

  it('should return 1 for circle', () => {
    expect(getAspectRatio('circle')).toBe(1);
  });

  it('should return correct ratios for landscape', () => {
    expect(getAspectRatio('16:9')).toBeCloseTo(16 / 9);
    expect(getAspectRatio('4:3')).toBeCloseTo(4 / 3);
    expect(getAspectRatio('3:2')).toBeCloseTo(3 / 2);
  });

  it('should return correct ratios for portrait', () => {
    expect(getAspectRatio('9:16')).toBeCloseTo(9 / 16);
    expect(getAspectRatio('3:4')).toBeCloseTo(3 / 4);
    expect(getAspectRatio('2:3')).toBeCloseTo(2 / 3);
  });
});

describe('clampCropToImage', () => {
  it('should keep valid crops unchanged', () => {
    const crop = { x: 0.1, y: 0.2, width: 0.5, height: 0.5 };
    const result = clampCropToImage(crop);
    expect(result).toEqual(crop);
  });

  it('should clamp out-of-bounds crops', () => {
    const crop = { x: -0.1, y: 0.8, width: 0.5, height: 0.5 };
    const result = clampCropToImage(crop);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0.5);
  });
});

describe('constrainScale', () => {
  it('should clamp scale', () => {
    expect(constrainScale(0.1, 0.5, 5)).toBe(0.5);
    expect(constrainScale(10, 0.5, 5)).toBe(5);
    expect(constrainScale(2, 0.5, 5)).toBe(2);
  });
});

describe('snapRotation', () => {
  it('should snap to zero within threshold', () => {
    expect(snapRotation(1.5)).toBe(0);
    expect(snapRotation(-1.9)).toBe(0);
  });

  it('should not snap outside threshold', () => {
    expect(snapRotation(3)).toBe(3);
    expect(snapRotation(-5)).toBe(-5);
  });

  it('should use custom threshold', () => {
    expect(snapRotation(4, 5)).toBe(0);
    expect(snapRotation(6, 5)).toBe(6);
  });
});
