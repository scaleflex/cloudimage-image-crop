import { describe, it, expect } from 'vitest';
import { getAspectRatio, clampCropToImage, constrainScale, snapRotation, clampCoverPanScale } from '../../src/transforms/constrain';
import type { TransformState } from '../../src/core/types';

function makeState(partial: Partial<TransformState> = {}): TransformState {
  return {
    quarterTurns: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
    scale: 1,
    panX: 0,
    panY: 0,
    cropRect: { x: 0, y: 0, width: 1, height: 1 },
    ...partial,
  };
}

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

describe('clampCoverPanScale', () => {
  const whole = (w: number, h: number) => ({ x: 0, y: 0, width: w, height: h });

  it('locks a square photo into a square frame with no pan slack', () => {
    const r = clampCoverPanScale(makeState({ panX: 50, panY: 50 }), 100, 100, whole(100, 100), 100, 100);
    expect(r.minScale).toBeCloseTo(1);
    expect(r.scale).toBeCloseTo(1);
    expect(r.panX).toBeCloseTo(0);
    expect(r.panY).toBeCloseTo(0);
  });

  it('allows vertical pan slack when a square photo covers a wide frame', () => {
    // 2:1 frame, square photo → cover scales to 200×200; width exact, 100px
    // vertical slack → ±50.
    const r = clampCoverPanScale(makeState({ panY: 80 }), 200, 100, whole(200, 100), 100, 100);
    expect(r.minScale).toBeCloseTo(1);
    expect(r.panX).toBeCloseTo(0);
    expect(r.panY).toBeCloseTo(50); // clamped from 80
  });

  it('raises scale to cover a fine tilt', () => {
    const r = clampCoverPanScale(makeState({ rotation: 45 }), 100, 100, whole(100, 100), 100, 100);
    // needW = needH = 100*(cos45+sin45) ≈ 141.42; drawW = 100 → minScale ≈ 1.414
    expect(r.minScale).toBeCloseTo(Math.SQRT2, 2);
    expect(r.scale).toBeCloseTo(Math.SQRT2, 2);
  });

  it('never lowers a scale the user zoomed past the cover floor', () => {
    const r = clampCoverPanScale(makeState({ scale: 3 }), 100, 100, whole(100, 100), 100, 100);
    expect(r.scale).toBeCloseTo(3);
  });

  it('accounts for a 90° quarter-turn when computing the cover floor', () => {
    // Portrait photo (100×200) into a landscape 2:1 frame, turned 90° so the
    // photo's long side runs horizontal.
    const r = clampCoverPanScale(makeState({ quarterTurns: 90 }), 200, 100, whole(200, 100), 100, 200);
    expect(r.minScale).toBeGreaterThan(0);
    expect(Number.isFinite(r.scale)).toBe(true);
  });

  it('shifts the pan window for an off-centre (classic) crop frame', () => {
    // Top-left 50×50 crop in a 100×100 container, square photo. The centred
    // photo must be able to pan left to cover the frame, but not right.
    const frame = { x: 0, y: 0, width: 50, height: 50 };
    const r = clampCoverPanScale(makeState({ panX: 40, panY: 40 }), 100, 100, frame, 100, 100);
    expect(r.minScale).toBeCloseTo(0.5);
    expect(r.panX).toBeCloseTo(0);  // clamped down from +40 (window [-50, 0])
    expect(r.panY).toBeCloseTo(0);
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
