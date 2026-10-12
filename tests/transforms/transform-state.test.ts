import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  applyRotateLeft,
  applyFlipH,
  applyRotation,
  applyScale,
  applyShapeChange,
  applyCropResize,
  turnFrameWithPhoto,
} from '../../src/transforms/transform-state';
import { enforceAspectRatio } from '../../src/transforms/constrain';

describe('createInitialState', () => {
  it('should create initial state with defaults', () => {
    const state = createInitialState();
    expect(state.quarterTurns).toBe(0);
    expect(state.rotation).toBe(0);
    expect(state.flipH).toBe(false);
    expect(state.scale).toBe(1);
    // Default crop is a 0.8 × 0.8 centered box — keeps the frame inset from
    // the image edge so handles sit on image pixels.
    expect(state.cropRect.x).toBeCloseTo(0.1);
    expect(state.cropRect.y).toBeCloseTo(0.1);
    expect(state.cropRect.width).toBeCloseTo(0.8);
    expect(state.cropRect.height).toBeCloseTo(0.8);
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
    // CCW: quarterTurns decrements unbounded so the spring animates a
    // single -90° tick per click.
    const state = createInitialState();
    const rotated = applyRotateLeft(state);
    expect(rotated.quarterTurns).toBe(-90);
  });

  it('should accumulate a full turn after four 90° clicks', () => {
    let state = createInitialState();
    for (let i = 0; i < 4; i++) {
      state = applyRotateLeft(state);
    }
    expect(state.quarterTurns).toBe(-360);
  });

  it('should cycle through the CCW sequence', () => {
    let state = createInitialState();
    state = applyRotateLeft(state); expect(state.quarterTurns).toBe(-90);
    state = applyRotateLeft(state); expect(state.quarterTurns).toBe(-180);
    state = applyRotateLeft(state); expect(state.quarterTurns).toBe(-270);
    state = applyRotateLeft(state); expect(state.quarterTurns).toBe(-360);
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

  it('should keep crop rect in place when flipping', () => {
    // Flip pivots around the crop-rect center visually, so the frame
    // itself doesn't move.
    let state = createInitialState();
    state = { ...state, cropRect: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 } };
    const flipped = applyFlipH(state);
    expect(flipped.cropRect.x).toBeCloseTo(0.1);
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

  describe("size 'max' (a ratio picked by the user)", () => {
    // Square 1600×1600 photo: 16:9 at full width is 1600×900 → height 900/1600.
    it('takes the largest frame of the ratio the photo allows', () => {
      const shaped = applyShapeChange(createInitialState(), '16:9', 1600, 1600, 'max');
      expect(shaped.cropRect.width).toBeCloseTo(1, 5);
      expect(shaped.cropRect.height).toBeCloseTo(900 / 1600, 5);
    });

    it('does not inherit the previous frame hugging an edge — it is clamped back inside', () => {
      // A user crop pinned to the left edge (as left after dragging the SE handle in).
      const leftCrop = { ...createInitialState(), cropRect: { x: 0, y: 0, width: 0.78, height: 0.8 } };
      const shaped = applyShapeChange(leftCrop, '16:9', 1600, 1600, 'max');
      expect(shaped.cropRect.x).toBeCloseTo(0, 5); // full width → nothing to hug
      expect(shaped.cropRect.x + shaped.cropRect.width).toBeCloseTo(1, 5);
      // Vertically it stays around the previous centre, inside the photo.
      expect(shaped.cropRect.y).toBeGreaterThanOrEqual(0);
      expect(shaped.cropRect.y + shaped.cropRect.height).toBeLessThanOrEqual(1 + 1e-9);
    });

    it('fills the height for a portrait ratio on a landscape photo', () => {
      const shaped = applyShapeChange(createInitialState(), '9:16', 2000, 1000, 'max');
      expect(shaped.cropRect.height).toBeCloseTo(1, 5);
      // On screen: (w·2000)/(h·1000) = 9/16.
      expect((shaped.cropRect.width * 2000) / (shaped.cropRect.height * 1000)).toBeCloseTo(9 / 16, 5);
      expect(shaped.cropRect.x).toBeCloseTo((1 - shaped.cropRect.width) / 2, 5);
    });

    it("'default' keeps the inset starting frame", () => {
      const shaped = applyShapeChange(createInitialState(), '16:9', 1600, 1600);
      expect(shaped.cropRect.width).toBeCloseTo(0.8, 5);
    });
  });
});

describe('turnFrameWithPhoto (classic quarter turn)', () => {
  const rect = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
  const base = { ...createInitialState(), cropRect: rect };
  const near = (a: { x: number; y: number; width: number; height: number }, b: typeof a) => {
    for (const k of ['x', 'y', 'width', 'height'] as const) expect(a[k]).toBeCloseTo(b[k], 10);
  };

  it('turns the frame counter-clockwise with the photo', () => {
    // Old top-left (0.1, 0.2) → new (y, 1 − x − w) for the rect.
    near(turnFrameWithPhoto(base).cropRect, { x: 0.2, y: 0.6, width: 0.4, height: 0.3 });
  });

  it('keeps a full-photo frame the full photo', () => {
    const full = { ...base, cropRect: { x: 0, y: 0, width: 1, height: 1 } };
    expect(turnFrameWithPhoto(full).cropRect).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it('turns clockwise under a single-axis mirror (the flip reverses the visible turn)', () => {
    near(turnFrameWithPhoto({ ...base, flipH: true }).cropRect, { x: 0.4, y: 0.1, width: 0.4, height: 0.3 });
    // Both axes mirrored = a 180° turn → counter-clockwise again.
    expect(turnFrameWithPhoto({ ...base, flipH: true, flipV: true }).cropRect).toEqual(turnFrameWithPhoto(base).cropRect);
  });

  it('four turns bring the frame back', () => {
    let s = base;
    for (let i = 0; i < 4; i++) s = turnFrameWithPhoto(s);
    expect(s.cropRect.x).toBeCloseTo(rect.x, 10);
    expect(s.cropRect.y).toBeCloseTo(rect.y, 10);
    expect(s.cropRect.width).toBeCloseTo(rect.width, 10);
    expect(s.cropRect.height).toBeCloseTo(rect.height, 10);
  });

  it('turns the tilt pivot the same way', () => {
    const s = turnFrameWithPhoto({ ...base, rotationPivot: { x: 0.25, y: 0.4 } });
    expect(s.rotationPivot).toEqual({ x: 0.4, y: 0.75 });
  });
});

describe('applyCropResize', () => {
  // Default state is now a 0.8×0.8 crop inset by 0.1 on each side.
  it('should resize east handle', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 'e', -0.2, 0);
    expect(result.cropRect.width).toBeCloseTo(0.6);
    expect(result.cropRect.x).toBeCloseTo(0.1);
  });

  it('should resize south handle', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 's', 0, -0.3);
    expect(result.cropRect.height).toBeCloseTo(0.5);
    expect(result.cropRect.y).toBeCloseTo(0.1);
  });

  it('should resize west handle', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 'w', 0.2, 0);
    expect(result.cropRect.x).toBeCloseTo(0.3);
    expect(result.cropRect.width).toBeCloseTo(0.6);
  });

  it('should resize north handle', () => {
    const state = createInitialState();
    const result = applyCropResize(state, 'n', 0, 0.2);
    expect(result.cropRect.y).toBeCloseTo(0.3);
    expect(result.cropRect.height).toBeCloseTo(0.6);
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

  // Anchor regression: a ratio-locked resize must keep the edge/corner
  // diagonally opposite the dragged handle fixed. Before the fix,
  // enforceAspectRatio recomputed the dependent dimension from the (x,y)
  // origin, so dragging a top handle drifted the bottom edge.
  it('keeps the bottom edge fixed when dragging the north handle (ratio-locked)', () => {
    const state = createInitialState(); // 0.1,0.1,0.8,0.8 → bottom = 0.9
    const r = applyCropResize(state, 'n', 0, 0.2, 'square').cropRect;
    expect(r.y + r.height).toBeCloseTo(0.9); // bottom held
    expect(r.x + r.width / 2).toBeCloseTo(0.5); // grew about the horizontal centre
  });

  it('keeps the opposite corner fixed when dragging the NE handle (ratio-locked)', () => {
    const state = createInitialState(); // SW corner = (0.1, 0.9)
    const r = applyCropResize(state, 'ne', 0.1, 0.2, 'square').cropRect;
    expect(r.x).toBeCloseTo(0.1); // left held
    expect(r.y + r.height).toBeCloseTo(0.9); // bottom held → SW corner fixed
  });
});

describe('enforceAspectRatio anchoring', () => {
  // When the ratio-derived dependent dimension would overflow the room past
  // the pinned edge, the rect must SHRINK (ratio preserved) so the anchor
  // still holds — it must not slide the whole rect via the trailing clamp.
  it('holds the opposite corner when the square size must shrink to fit (NW drag)', () => {
    // SE corner is the anchor at (0.9, 0.8); square height (0.9) overruns the
    // 0.8 room above the bottom, so the rect must shrink to 0.8 × 0.8.
    const r = enforceAspectRatio({ x: 0, y: 0.5, width: 0.9, height: 0.3 }, 1, 'nw', 1000, 1000, 20);
    expect(r.width).toBeCloseTo(r.height); // ratio held (square)
    expect(r.x + r.width).toBeCloseTo(0.9); // right edge held
    expect(r.y + r.height).toBeCloseTo(0.8); // bottom edge held → SE corner fixed
  });

  // On a non-square image the ratio must survive: the old independent
  // Math.min(…, 1) clamps capped one axis and broke a "square" into 1.6:1.
  it('preserves the locked ratio on a non-square image (E drag, 2000x1000)', () => {
    const r = enforceAspectRatio({ x: 0.1, y: 0.1, width: 0.8, height: 0.5 }, 1, 'e', 2000, 1000, 20);
    expect(r.width * 2000).toBeCloseTo(r.height * 1000); // square in pixels
    expect(r.x).toBeCloseTo(0.1); // left edge (anchor for E) held
    expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(r.y + r.height).toBeLessThanOrEqual(1 + 1e-9);
  });
});
