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

  it('one rotate-left turns CCW (−90°) about the centre of the turned display', () => {
    // Free shape: the box (and display space) takes the turned photo's aspect: H×W.
    const d = resolveDisplay({ ...applyRotateLeft(createInitialState()), turnedBox: true }, W, H, H, W, 'classic');
    const p = transformPoint(d.imgToDisp, 100, 0);
    expect(p.x).toBeCloseTo(H / 2);
    expect(p.y).toBeCloseTo(W / 2 - 100);
  });

  it('classic 90° turn: display space is the turned photo, drawn at its own size — it fills it exactly', () => {
    // The photo keeps its full image px (no shrink) and, turned, covers the
    // H×W display edge to edge — no letterbox margins and no overflow. Mirrors
    // image-layer.ts so canvas ↔ server stay in sync.
    const d = resolveDisplay({ ...applyRotateLeft(createInitialState()), turnedBox: true }, W, H, H, W, 'classic');
    expect(d.drawW).toBe(W);
    expect(d.drawH).toBe(H);
    expect(d.DW).toBe(H);
    expect(d.DH).toBe(W);
    // The four photo corners land on the four display corners.
    const corners = [
      transformPoint(d.imgToDisp, -W / 2, -H / 2),
      transformPoint(d.imgToDisp, W / 2, -H / 2),
      transformPoint(d.imgToDisp, W / 2, H / 2),
      transformPoint(d.imgToDisp, -W / 2, H / 2),
    ].map((p) => [Math.round(p.x), Math.round(p.y)].join(','));
    expect(new Set(corners)).toEqual(new Set(['0,0', `${H},0`, `${H},${W}`, `0,${W}`]));
  });

  it('classic 90° turn keeping the box (picked ratio): the turned photo is cover-fit — box filled, one axis overflows', () => {
    const d = resolveDisplay({ ...applyRotateLeft(createInitialState()), turnedBox: false }, W, H, W, H, 'classic');
    expect(d.DW).toBe(W);
    expect(d.DH).toBe(H);
    const pts = [
      transformPoint(d.imgToDisp, -d.drawW / 2, -d.drawH / 2),
      transformPoint(d.imgToDisp, d.drawW / 2, d.drawH / 2),
    ];
    const xs = pts.map((p) => p.x).sort((a, b) => a - b);
    const ys = pts.map((p) => p.y).sort((a, b) => a - b);
    // Turned portrait footprint: exactly the box width, taller than the box.
    expect(xs[0]).toBeCloseTo(0, 5);
    expect(xs[1]).toBeCloseTo(W, 5);
    expect(ys[0]).toBeLessThan(0);
    expect(ys[1]).toBeGreaterThan(H);
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
