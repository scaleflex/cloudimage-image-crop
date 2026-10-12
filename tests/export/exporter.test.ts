import { describe, it, expect } from 'vitest';
import { getTransformParams } from '../../src/export/exporter';
import { createInitialState, applyRotateLeft, applyFlipH, applyRotation, turnFrameWithPhoto } from '../../src/transforms/transform-state';

describe('getTransformParams', () => {
  it('should return correct params for default state', () => {
    const state = createInitialState();
    const params = getTransformParams(state, 1920, 1080);
    // Default crop is 0.8 × 0.8 centered (inset 0.1 on each side).
    expect(params.rotation).toBe(0);
    expect(params.flipH).toBe(false);
    expect(params.crop.x).toBe(Math.round(0.1 * 1920));
    expect(params.crop.y).toBe(Math.round(0.1 * 1080));
    expect(params.crop.width).toBe(Math.round(0.8 * 1920));
    expect(params.crop.height).toBe(Math.round(0.8 * 1080));
    expect(params.outputWidth).toBe(params.crop.width);
    expect(params.outputHeight).toBe(params.crop.height);
  });

  it('should include fine rotation on top of 90° quarter turns', () => {
    // One CCW turn lands at -90°; adding 10° fine rotation gives -80°.
    let state = createInitialState();
    state = applyRotateLeft(state);
    state = applyRotation(state, 10);
    const params = getTransformParams(state, 1920, 1080);
    expect(params.rotation).toBe(-80);
  });

  it('should swap output dimensions for 90° rotation', () => {
    let state = createInitialState();
    state = applyRotateLeft(state);
    const params = getTransformParams(state, 1920, 1080);
    expect(params.outputWidth).toBe(params.crop.height);
    expect(params.outputHeight).toBe(params.crop.width);
  });

  it('should include flip state', () => {
    let state = createInitialState();
    state = applyFlipH(state);
    const params = getTransformParams(state, 1920, 1080);
    expect(params.flipH).toBe(true);
  });

  // `crop` = region of the ORIGINAL photo under the frame (zoom/pan/tilt ignored).
  // Photo 4000×2000; values cross-checked against resolveServerCrop.
  describe('crop after a 90° turn (classic)', () => {
    const IW = 4000;
    const IH = 2000;
    const leftHalf = { x: 0, y: 0, width: 0.5, height: 1 };

    it('free shape: the frame turned with the photo still maps to the same original region', () => {
      const before = { ...createInitialState(), cropRect: leftHalf };
      const turned = { ...turnFrameWithPhoto(applyRotateLeft(before)), turnedBox: true };
      const p = getTransformParams(turned, IW, IH);
      expect(p.crop).toEqual({ x: 0, y: 0, width: 2000, height: 2000 });
      expect(getTransformParams(before, IW, IH).crop).toEqual(p.crop);
    });

    it('ratio kept through the turn: full-box 2:1 frame on the cover-fit portrait photo → middle band', () => {
      const s = { ...applyRotateLeft(createInitialState()), turnedBox: false, cropRect: { x: 0, y: 0, width: 1, height: 1 } };
      const p = getTransformParams(s, IW, IH);
      expect(p.crop).toEqual({ x: 1500, y: 0, width: 1000, height: 2000 });
      // Output is the turned crop: 2000×1000 = the frame's 2:1.
      expect(p.outputWidth).toBe(2000);
      expect(p.outputHeight).toBe(1000);
    });

    it('ignores zoom, pan and tilt (contract) — same crop as the neutral state', () => {
      const base = { ...createInitialState(), cropRect: leftHalf };
      const busy = applyRotation({ ...base, scale: 2, panX: 30, panY: -10 }, 12);
      expect(getTransformParams(busy, IW, IH).crop).toEqual(getTransformParams(base, IW, IH).crop);
      expect(getTransformParams(busy, IW, IH).scale).toBe(2);
    });

    it('flip about the photo centre mirrors the original region', () => {
      const s = applyFlipH({ ...createInitialState(), cropRect: leftHalf });
      expect(getTransformParams(s, IW, IH).crop).toEqual({ x: 2000, y: 0, width: 2000, height: 2000 });
    });
  });

  it('should include scale', () => {
    const state = createInitialState();
    const params = getTransformParams(state, 1920, 1080);
    expect(params.scale).toBe(1);
  });
});
