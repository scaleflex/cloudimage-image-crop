import { describe, it, expect } from 'vitest';
import { clamp, lerp, degreesToRadians, radiansToDegrees, distance, normalizeAngle } from '../../src/utils/math';

describe('clamp', () => {
  it('should clamp values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('should interpolate between two values', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });
});

describe('degreesToRadians', () => {
  it('should convert degrees to radians', () => {
    expect(degreesToRadians(0)).toBe(0);
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
  });
});

describe('radiansToDegrees', () => {
  it('should convert radians to degrees', () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
    expect(radiansToDegrees(0)).toBe(0);
  });
});

describe('distance', () => {
  it('should calculate euclidean distance', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
    expect(distance(1, 1, 1, 1)).toBe(0);
  });
});

describe('normalizeAngle', () => {
  it('should normalize angles to 0-360', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(-90)).toBe(270);
  });
});
