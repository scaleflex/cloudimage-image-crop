import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  applyRotateLeft,
  applyFlipH,
  applyRotation,
  applyScale,
  applyShapeChange,
  applyCropResize,
} from '../../src/transforms/transform-state';

describe('createInitialState', () => {
  it('should create initial state with defaults', () => {
    const state = createInitialState();
    expect(state.quarterTurns).toBe(0);
    expect(state.rotation).toBe(0);
    expect(state.flipH).toBe(false);
    expect(state.scale).toBe(1);
    expect(state.cropRect.x).toBe(0);
    expect(state.cropRect.y).toBe(0);
    expect(state.cropRect.width).toBe(1);
    expect(state.cropRect.height).toBe(1);
  });

  it('should create state for square crop', () => {
    const state = createInitialState('square');
    expect(state.cropRect.width).toBe(state.cropRect.height);
  });

  it('should create state for portrait crop', () => {
    const state = createInitialState('2:3');
    const ratio = state.cropRect.width / state.cropRect.height;
    expect(ratio).toBeCloseTo(2 / 3, 1);
  });
});

describe('applyRotateLeft', () => {
  it('should rotate by 90° counter-clockwise', () => {
    // CCW: 0 → 270 → 180 → 90 → 0. Normalised to [0, 360).
    const state = createInitialState();
    const rotated = applyRotateLeft(state);
    expect(rotated.quarterTurns).toBe(270);
  });

  it('should wrap rotation after four 90° turns', () => {
    let state = createInitialState();
    for (let i = 0; i < 4; i++) {
      state = applyRotateLeft(state);
    }
    expect(state.quarterTurns).toBe(0);
  });

  it('should cycle through the CCW sequence', () => {
    let state = createInitialState();
    state = applyRotateLeft(state); expect(state.quarterTurns).toBe(270);
    state = applyRotateLeft(state); expect(state.quarterTurns).toBe(180);
    state = applyRotateLeft(state); expect(state.quarterTurns).toBe(90);
    state = applyRotateLeft(state); expect(state.quarterTurns).toBe(0);
  });

  it('should reset pan on rotation', () => {
    let state = createInitialState();
    state = { ...state, panX: 10, panY: 20 };
    const rotated = applyRotateLeft(state);
    expect(rotated.panX).toBe(0);
    expect(rotated.panY).toBe(0);
  });
});

describe('applyFlipH', () => {
  it('should toggle flip', () => {
    const state = createInitialState();
    expect(state.flipH).toBe(false);
    const flipped = applyFlipH(state);
    expect(flipped.flipH).toBe(true);
    const unflipped = applyFlipH(flipped);
    expect(unflipped.flipH).toBe(false);
  });

  it('should mirror crop rect horizontally', () => {
    let state = createInitialState();
    state = { ...state, cropRect: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 } };
    const flipped = applyFlipH(state);
    expect(flipped.cropRect.x).toBeCloseTo(0.6);
    expect(flipped.cropRect.width).toBeCloseTo(0.3);
  });
});

describe('applyRotation', () => {
  it('should set fine rotation', () => {
    const state = createInitialState();
    const rotated = applyRotation(state, 30);
    expect(rotated.rotation).toBe(30);
  });

  it('should clamp to -45..+45', () => {
    const state = createInitialState();
    expect(applyRotation(state, 60).rotation).toBe(45);
    expect(applyRotation(state, -60).rotation).toBe(-45);
  });
});

describe('applyScale', () => {
  it('should set scale within bounds', () => {
    const state = createInitialState();
    expect(applyScale(state, 2, 0.5, 5).scale).toBe(2);
    expect(applyScale(state, 0.1, 0.5, 5).scale).toBe(0.5);
    expect(applyScale(state, 10, 0.5, 5).scale).toBe(5);
  });
});

describe('applyShapeChange', () => {
  it('should change crop to square aspect', () => {
    const state = createInitialState();
    const square = applyShapeChange(state, 'square');
    expect(square.cropRect.width).toBeCloseTo(square.cropRect.height, 2);
  });

  it('should maintain aspect ratio for shape', () => {
    const state = createInitialState();
    const shaped = applyShapeChange(state, '16:9');
    const ratio = shaped.cropRect.width / shaped.cropRect.height;
    expect(ratio).toBeCloseTo(16 / 9, 1);
  });

  it('should handle portrait ratios', () => {
    const state = createInitialState();
    const shaped = applyShapeChange(state, '9:16');
    const ratio = shaped.cropRect.width / shaped.cropRect.height;
    expect(ratio).toBeCloseTo(9 / 16, 1);
  });
});

describe('applyCropResize', () => {
  it('should resize east handle', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 'e', -0.2, 0);
    expect(result.cropRect.width).toBeCloseTo(0.8);
    expect(result.cropRect.x).toBe(0);
  });

  it('should resize south handle', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 's', 0, -0.3);
    expect(result.cropRect.height).toBeCloseTo(0.7);
    expect(result.cropRect.y).toBe(0);
  });

  it('should resize west handle', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 'w', 0.2, 0);
    expect(result.cropRect.x).toBeCloseTo(0.2);
    expect(result.cropRect.width).toBeCloseTo(0.8);
  });

  it('should resize north handle', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 'n', 0, 0.2);
    expect(result.cropRect.y).toBeCloseTo(0.2);
    expect(result.cropRect.height).toBeCloseTo(0.8);
  });

  it('should enforce minimum size', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 'e', -0.99, 0, 'free', 20, 1000, 1000);
    expect(result.cropRect.width).toBeGreaterThanOrEqual(20 / 1000);
  });

  it('should clamp crop within image bounds', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 'e', 2, 0);
    expect(result.cropRect.x + result.cropRect.width).toBeLessThanOrEqual(1);
  });

  it('should enforce aspect ratio for square shape', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 'se', -0.2, -0.3, 'square');
    expect(result.cropRect.width).toBeCloseTo(result.cropRect.height, 1);
  });
});
