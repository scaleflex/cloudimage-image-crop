import { describe, it, expect } from 'vitest';
import { resolveDisplay } from '../../src/export/exporter';
import { transformPoint, invertMatrix } from '../../src/transforms/matrix';
import { createInitialState, applyRotateLeft, applyScale, applyPan } from '../../src/transforms/transform-state';

const W = 1920;
const H = 1080;

describe('resolveDisplay', () => {
  it('classic identity: display = image px, photo fills it, centre maps to centre', () => {
    const d = resolveDisplay(createInitialState(), W, H, W, H, 'classic');
    expect(d.DW).toBe(W);
    expect(d.DH).toBe(H);
    expect(d.drawW).toBe(W);
    expect(d.drawH).toBe(H);
    const c = transformPoint(d.imgToDisp, 0, 0);
    expect(c.x).toBeCloseTo(W / 2);
    expect(c.y).toBeCloseTo(H / 2);
    const tl = transformPoint(d.imgToDisp, -d.drawW / 2, -d.drawH / 2);
    expect(tl.x).toBeCloseTo(0);
    expect(tl.y).toBeCloseTo(0);
  });

  it('scale zooms about the display centre', () => {
    const d = resolveDisplay(applyScale(createInitialState(), 2, 0.5, 5), W, H, W, H, 'classic');
    const p = transformPoint(d.imgToDisp, 100, 0);
    expect(p.x).toBeCloseTo(W / 2 + 200);
    expect(p.y).toBeCloseTo(H / 2);
  });

  it('one rotate-left turns CCW (−90°) about centre', () => {
    const d = resolveDisplay(applyRotateLeft(createInitialState()), W, H, W, H, 'classic');
    const p = transformPoint(d.imgToDisp, 100, 0);
    expect(p.x).toBeCloseTo(W / 2);
    expect(p.y).toBeCloseTo(H / 2 - 100);
  });

  it('classic 90° turn does NOT shrink the photo (no shorter-axis fit) — size preserved', () => {
    // Free-layer model: a quarter-turn rotates the photo in place at its current
    // scale; it is NOT letterboxed down to the canvas's short axis. The draw size
    // stays the full image px (the footprint may overflow the canvas, which is OK
    // — pan/zoom to reframe). Mirrors image-layer.ts so canvas ↔ server stay synced.
    const d = resolveDisplay(applyRotateLeft(createInitialState()), W, H, W, H, 'classic');
    expect(d.drawW).toBe(W);
    expect(d.drawH).toBe(H);
  });

  it('flip pivots about the image centre, not the crop → moving the frame does not move the photo', () => {
    // Regression for the "after a flip, dragging the frame slides the photo
    // horizontally" bug: flipH must mirror about the image centre, so the
    // image→display matrix is independent of where the crop frame sits. A fixed
    // image pixel must map to the same display point for two different crop rects.
    const cropA = { ...createInitialState(), flipH: true, cropRect: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 } };
    const cropB = { ...createInitialState(), flipH: true, cropRect: { x: 0.5, y: 0.5, width: 0.4, height: 0.4 } };
    const dA = resolveDisplay(cropA, W, H, W, H, 'classic');
    const dB = resolveDisplay(cropB, W, H, W, H, 'classic');
    const pA = transformPoint(dA.imgToDisp, 123, -45);
    const pB = transformPoint(dB.imgToDisp, 123, -45);
    expect(pA.x).toBeCloseTo(pB.x);
    expect(pA.y).toBeCloseTo(pB.y);
  });

  it('inverse round-trips (scale + pan)', () => {
    const d = resolveDisplay(applyPan(applyScale(createInitialState(), 1.5, 0.5, 5), 30, -20), W, H, W, H, 'classic');
    const inv = invertMatrix(d.imgToDisp);
    for (const [x, y] of [[0, 0], [100, 50], [-200, 300]]) {
      const f = transformPoint(d.imgToDisp, x, y);
      const b = transformPoint(inv, f.x, f.y);
      expect(b.x).toBeCloseTo(x);
      expect(b.y).toBeCloseTo(y);
    }
  });

  it('fixed variant: square density box, whole box is the crop, cover draw', () => {
    const full = { ...createInitialState(), cropRect: { x: 0, y: 0, width: 1, height: 1 } };
    const d = resolveDisplay(full, W, H, 800, 800, 'fixed');
    expect(d.DW).toBe(d.DH); // square frame
    expect(d.cropX).toBe(0);
    expect(d.cropY).toBe(0);
    expect(d.cropW).toBe(d.DW);
    expect(d.cropH).toBe(d.DH);
    // cover: the photo is drawn at least as large as the box on both axes
    expect(d.drawW).toBeGreaterThanOrEqual(d.DW);
    expect(d.drawH).toBeGreaterThanOrEqual(d.DH);
  });
});
