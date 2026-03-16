import { describe, it, expect } from 'vitest';
import { getTransformParams } from '../../src/export/exporter';
import { createInitialState, applyRotateLeft, applyFlipH, applyRotation } from '../../src/transforms/transform-state';

describe('getTransformParams', () => {
  it('should return correct params for default state', () => {
    const state = createInitialState();
    const params = getTransformParams(state, 1920, 1080);
    expect(params.rotation).toBe(0);
    expect(params.flipH).toBe(false);
    expect(params.crop.x).toBe(0);
    expect(params.crop.y).toBe(0);
    expect(params.crop.width).toBe(1920);
    expect(params.crop.height).toBe(1080);
    expect(params.outputWidth).toBe(1920);
    expect(params.outputHeight).toBe(1080);
  });

  it('should include rotation in total rotation', () => {
    let state = createInitialState();
    state = applyRotateLeft(state);
    state = applyRotation(state, 10);
    const params = getTransformParams(state, 1920, 1080);
    expect(params.rotation).toBe(100); // 90 + 10
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
