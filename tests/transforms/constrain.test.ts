import { describe, it, expect } from 'vitest';
import { getAspectRatio, clampCropToImage, constrainScale, snapRotation, clampCoverPanScale, coverTiltedFrame } from '../../src/transforms/constrain';
import type { TransformState } from '../../src/core/types';
import { classicDrawSize } from '../../src/canvas/image-layer';

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
  // drawW0/drawH0 = photo draw size at scale 1 in container px. For these
  // square/whole-frame cases the cover-fit photo equals the container box.

  it('locks a square photo into a square frame with no pan slack', () => {
    const r = clampCoverPanScale(makeState({ panX: 50, panY: 50 }), 100, 100, whole(100, 100), 100, 100, 5);
    expect(r.minScale).toBeCloseTo(1);
    expect(r.scale).toBeCloseTo(1);
    expect(r.panX).toBeCloseTo(0);
    expect(r.panY).toBeCloseTo(0);
  });

  it('allows vertical pan slack when a square photo covers a wide frame', () => {
    // 2:1 frame, square photo cover-fit → 200×200 draw; width exact, 100px
    // vertical slack → ±50.
    const r = clampCoverPanScale(makeState({ panY: 80 }), 200, 100, whole(200, 100), 200, 200, 5);
    expect(r.minScale).toBeCloseTo(1);
    expect(r.panX).toBeCloseTo(0);
    expect(r.panY).toBeCloseTo(50); // clamped from 80
  });

  it('raises scale to cover a fine tilt', () => {
    const r = clampCoverPanScale(makeState({ rotation: 45 }), 100, 100, whole(100, 100), 100, 100, 5);
    // needW = needH = 100*(cos45+sin45) ≈ 141.42; drawW0 = 100 → minScale ≈ 1.414
    expect(r.minScale).toBeCloseTo(Math.SQRT2, 2);
    expect(r.scale).toBeCloseTo(Math.SQRT2, 2);
  });

  it('caps the cover floor at maxScale (never inverts scale bounds)', () => {
    // 45° tilt needs ~1.414× to cover, but maxScale is 1.2 → floor pinned to
    // 1.2 so minScale ≤ maxScale and the renderer bounds can't invert.
    const r = clampCoverPanScale(makeState({ rotation: 45 }), 100, 100, whole(100, 100), 100, 100, 1.2);
    expect(r.minScale).toBeCloseTo(1.2);
    expect(r.scale).toBeCloseTo(1.2);
    expect(r.minScale).toBeLessThanOrEqual(1.2);
  });

  it('never lowers a scale the user zoomed past the cover floor', () => {
    const r = clampCoverPanScale(makeState({ scale: 3 }), 100, 100, whole(100, 100), 100, 100, 5);
    expect(r.scale).toBeCloseTo(3);
  });

  it('accounts for a 90° quarter-turn when computing the cover floor', () => {
    // Portrait photo (100×200) into a landscape 2:1 frame, turned 90° so the
    // photo's long side runs horizontal → cover draw 100×200.
    const r = clampCoverPanScale(makeState({ quarterTurns: 90 }), 200, 100, whole(200, 100), 100, 200, 5);
    expect(r.minScale).toBeCloseTo(2);
    expect(Number.isFinite(r.scale)).toBe(true);
  });

  it('shifts the pan window for an off-centre (classic) crop frame', () => {
    // Top-left 50×50 crop in a 100×100 container, classic stretch draw (100×100).
    // The centred photo must pan left to cover the frame, but not right.
    const frame = { x: 0, y: 0, width: 50, height: 50 };
    const r = clampCoverPanScale(makeState({ panX: 40, panY: 40 }), 100, 100, frame, 100, 100, 5);
    expect(r.minScale).toBeCloseTo(0.5);
    expect(r.panX).toBeCloseTo(0);  // clamped down from +40 (window [-50, 0])
    expect(r.panY).toBeCloseTo(0);
  });
});

describe('coverTiltedFrame', () => {
  const W = 600;
  const H = 400;

  /**
   * Forward-map a photo-local point (px, photo centre at origin, scale 1) to
   * canvas px exactly like `drawImageLayer` (classic): quarter turn → pan →
   * scale → centre, then flip about the centre, then tilt about the pivot.
   */
  function toCanvas(s: TransformState, lx: number, ly: number): [number, number] {
    const q = (s.quarterTurns * Math.PI) / 180;
    let x = lx * Math.cos(q) - ly * Math.sin(q);
    let y = lx * Math.sin(q) + ly * Math.cos(q);
    x = W / 2 + s.scale * (x + s.panX);
    y = H / 2 + s.scale * (y + s.panY);
    if (s.flipH) x = W - x;
    if (s.flipV) y = H - y;
    const c = s.cropRect;
    const pv = s.rotationPivot ?? { x: c.x + c.width / 2, y: c.y + c.height / 2 };
    const px = pv.x * W;
    const py = pv.y * H;
    const t = (s.rotation * Math.PI) / 180;
    return [px + Math.cos(t) * (x - px) - Math.sin(t) * (y - py), py + Math.sin(t) * (x - px) + Math.cos(t) * (y - py)];
  }

  /** True when every frame corner lies inside the drawn (convex) photo quad. */
  function covers(s: TransformState): boolean {
    // Same draw rule as the canvas (image is W×H here, like the box at no turn).
    const d = classicDrawSize(W, H, W, H, s.quarterTurns, s.turnedBox);
    const hw = d.drawW / 2;
    const hh = d.drawH / 2;
    const quad = [toCanvas(s, -hw, -hh), toCanvas(s, hw, -hh), toCanvas(s, hw, hh), toCanvas(s, -hw, hh)];
    const c = s.cropRect;
    const corners: [number, number][] = [
      [c.x * W, c.y * H],
      [(c.x + c.width) * W, c.y * H],
      [(c.x + c.width) * W, (c.y + c.height) * H],
      [c.x * W, (c.y + c.height) * H],
    ];
    return corners.every(([x, y]) => {
      let sign = 0;
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = quad[i];
        const [bx, by] = quad[(i + 1) % 4];
        const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
        if (Math.abs(cross) < 1e-6) continue;
        if (sign === 0) sign = Math.sign(cross);
        else if (Math.sign(cross) !== sign) return false;
      }
      return true;
    });
  }

  const apply = (s: TransformState, maxScale = 5): TransformState => ({ ...s, ...coverTiltedFrame(s, W, H, maxScale) });

  it.each([
    ['full frame, small tilt', makeState({ rotation: 9.3, cropRect: { x: 0, y: 0, width: 1, height: 1 } })],
    ['full frame, max tilt', makeState({ rotation: -45, cropRect: { x: 0, y: 0, width: 1, height: 1 } })],
    ['off-centre frame at the edge', makeState({ rotation: -20, cropRect: { x: 0, y: 0.1, width: 0.45, height: 0.8 } })],
    ['quarter turn (turned box) + tilt', makeState({ quarterTurns: -90, turnedBox: true, rotation: 12, cropRect: { x: 0.2, y: 0, width: 0.6, height: 1 } })],
    ['flipped + tilt', makeState({ flipH: true, flipV: true, rotation: 25, cropRect: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 } })],
    ['panned photo', makeState({ rotation: 15, panX: 80, panY: -40, cropRect: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } })],
    ['pivot away from the frame', makeState({ rotation: 30, rotationPivot: { x: 0.2, y: 0.2 }, cropRect: { x: 0.5, y: 0.4, width: 0.45, height: 0.55 } })],
  ])('fills the frame: %s', (_label, s) => {
    expect(covers(s)).toBe(false);
    expect(covers(apply(s))).toBe(true);
  });

  it('leaves an already covered photo untouched', () => {
    const s = makeState({ rotation: 5, scale: 2, cropRect: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 } });
    const r = coverTiltedFrame(s, W, H, 5);
    expect(r.scale).toBe(2);
    expect(r.panX).toBe(0);
    expect(r.panY).toBe(0);
  });

  it('zooms about the frame centre — the subject under it does not slide', () => {
    const s = makeState({ rotation: -18, cropRect: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 } });
    // Photo-local point under the frame centre, before and after.
    const local = (st: TransformState): [number, number] => {
      const c = st.cropRect;
      const fx = (c.x + c.width / 2) * W;
      const fy = (c.y + c.height / 2) * H;
      // Invert the forward map numerically for this flip-free, unturned case.
      const pv = st.rotationPivot ?? { x: c.x + c.width / 2, y: c.y + c.height / 2 };
      const t = (-st.rotation * Math.PI) / 180;
      const ux = pv.x * W + Math.cos(t) * (fx - pv.x * W) - Math.sin(t) * (fy - pv.y * H);
      const uy = pv.y * H + Math.sin(t) * (fx - pv.x * W) + Math.cos(t) * (fy - pv.y * H);
      return [(ux - W / 2) / st.scale - st.panX, (uy - H / 2) / st.scale - st.panY];
    };
    const [bx, by] = local(s);
    const [ax, ay] = local(apply(s));
    expect(ax).toBeCloseTo(bx, 6);
    expect(ay).toBeCloseTo(by, 6);
  });

  it('never zooms past maxScale', () => {
    const s = makeState({ rotation: 45, cropRect: { x: 0, y: 0, width: 1, height: 1 } });
    const r = coverTiltedFrame(s, W, H, 1.2);
    expect(r.scale).toBeLessThanOrEqual(1.2);
    expect(r.minScale).toBeLessThanOrEqual(1.2);
  });

  it('keeps pan inside the cover window while tilted', () => {
    const s = makeState({ rotation: 10, scale: 1.5, panX: 500, cropRect: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } });
    expect(covers(apply(s))).toBe(true);
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
