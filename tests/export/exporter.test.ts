import { describe, it, expect } from 'vitest';
import { getTransformParams } from '../../src/export/exporter';
import { createInitialState, applyRotateLeft, applyFlipH, applyRotation } from '../../src/transforms/transform-state';

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

  it('should include scale', () => {
    const state = createInitialState();
    const params = getTransformParams(state, 1920, 1080);
    expect(params.scale).toBe(1);
  });
});
