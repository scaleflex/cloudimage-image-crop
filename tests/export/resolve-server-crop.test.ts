import { describe, it, expect } from 'vitest';
import { resolveServerCrop, getTransformParams } from '../../src/export/exporter';
import { createInitialState, applyRotateLeft, applyScale, applyPan, applyRotation } from '../../src/transforms/transform-state';

const W = 1920;
const H = 1080;

describe('resolveServerCrop — single pass (no tilt)', () => {
  it('identity: crop == cropRect × dims (matches getTransformParams)', () => {
    const s = createInitialState();
    const sc = resolveServerCrop(s, W, H, W, H, 'classic');
    const p = getTransformParams(s, W, H);
    expect(sc.tilted).toBe(false);
    expect(sc.rotateCCW).toBe(0);
    expect(sc.clamped).toBe(false); // crop is within the photo
    expect(sc.cropPx.x).toBe(p.crop.x);
    expect(sc.cropPx.y).toBe(p.crop.y);
    expect(sc.cropPx.width).toBe(p.crop.width);
    expect(sc.cropPx.height).toBe(p.crop.height);
  });

  it('zoom shrinks the pre-image crop (scale 2 → half size, centred) — this is what was ignored before', () => {
    const sc = resolveServerCrop(applyScale(createInitialState(), 2, 0.5, 5), W, H, W, H, 'classic');
    expect(sc.cropPx).toEqual({ x: 576, y: 324, width: 768, height: 432 });
  });

  it('pan shifts the pre-image crop', () => {
    const sc = resolveServerCrop(applyPan(createInitialState(), 100, 0), W, H, W, H, 'classic');
    expect(sc.cropPx.x).toBe(92); // 192 − 100·panFactor(1)
    expect(sc.cropPx.width).toBe(1536);
  });

  it('90° turn → rotateCCW=90, axis-aligned crop within bounds', () => {
    const sc = resolveServerCrop(applyRotateLeft(createInitialState()), W, H, W, H, 'classic');
    expect(sc.tilted).toBe(false);
    expect(sc.rotateCCW).toBe(90);
    expect(sc.cropPx.x).toBeGreaterThanOrEqual(0);
    expect(sc.cropPx.x + sc.cropPx.width).toBeLessThanOrEqual(W);
    expect(sc.cropPx.y + sc.cropPx.height).toBeLessThanOrEqual(H);
    // classic letterboxes the photo on a 90° turn, so the default 80% crop frame
    // reaches into the empty margin → the crop is clamped to the image and the
    // canvas's margins can't be reproduced server-side.
    expect(sc.clamped).toBe(true);
  });

  it('90° turn with a crop kept INSIDE the letterboxed photo → not clamped', () => {
    const s = { ...applyRotateLeft(createInitialState()), cropRect: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 } };
    const sc = resolveServerCrop(s, W, H, W, H, 'classic');
    expect(sc.tilted).toBe(false);
    expect(sc.clamped).toBe(false);
  });

  it('fixed variant resolves a real sub-region (no longer the whole image)', () => {
    const full = { ...createInitialState(), cropRect: { x: 0, y: 0, width: 1, height: 1 } };
    const sc = resolveServerCrop(full, W, H, 800, 800, 'fixed');
    expect(sc.tilted).toBe(false);
    expect(sc.cropPx.width).toBeGreaterThan(0);
    expect(sc.cropPx.width).toBeLessThan(W); // square frame over landscape → centre strip
    expect(sc.cropPx.x + sc.cropPx.width).toBeLessThanOrEqual(W);
    expect(sc.clamped).toBe(false); // fixed cover-fits → frame always within the photo
  });

  it('classic photo zoomed out smaller than the frame (scale < 1) → crop clamps to the photo, flagged', () => {
    // With the cover constraint off in classic, the photo may shrink below the
    // crop frame; the crop window then spills past the photo into the canvas
    // background. The server crop reproduces only what overlaps the image
    // (clamped to its bounds) and flags `clamped` — i.e. it returns the result
    // "as is" rather than throwing or emitting out-of-bounds pixels.
    const s = { ...createInitialState(), scale: 0.5 };
    const sc = resolveServerCrop(s, W, H, W, H, 'classic');
    expect(sc.tilted).toBe(false);
    expect(sc.clamped).toBe(true);
    // cropPx stays a valid sub-rect of the photo — no negative or over-bounds px.
    expect(sc.cropPx.x).toBeGreaterThanOrEqual(0);
    expect(sc.cropPx.y).toBeGreaterThanOrEqual(0);
    expect(sc.cropPx.x + sc.cropPx.width).toBeLessThanOrEqual(W);
    expect(sc.cropPx.y + sc.cropPx.height).toBeLessThanOrEqual(H);
    // output dimensions stay positive → a well-formed URL, not a degenerate crop.
    expect(sc.outW).toBeGreaterThan(0);
    expect(sc.outH).toBeGreaterThan(0);
  });
});

describe('resolveServerCrop — nested (free tilt)', () => {
  it('free tilt → nested plan with bounding-box inner canvas + inset-shifted outer crop', () => {
    // Small centred crop so a 22° tilt keeps the window inside the photo.
    const s = { ...applyRotation(createInitialState(), 22), cropRect: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 } };
    const sc = resolveServerCrop(s, W, H, W, H, 'classic');
    expect(sc.tilted).toBe(true);
    expect(sc.rotateCCW).toBe(338); // −22 normalized to [0,360)
    expect(sc.nested).toBeDefined();
    const rad = (22 * Math.PI) / 180;
    const innerW = Math.round(Math.abs(W * Math.cos(rad)) + Math.abs(H * Math.sin(rad)));
    const innerH = Math.round(Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad)));
    expect(sc.nested!.innerW).toBe(innerW);
    expect(sc.nested!.innerH).toBe(innerH);
    const o = sc.nested!.outerCrop;
    // The crop can be no larger than the rotated bbox.
    expect(o.width).toBeGreaterThan(0);
    expect(o.height).toBeGreaterThan(0);
    expect(o.width).toBeLessThanOrEqual(innerW);
    expect(o.height).toBeLessThanOrEqual(innerH);
    expect(sc.clamped).toBe(false); // tilt only, scale 1 → crop stays within the photo
  });

  it('nested outer crop is shifted by the bbox→photo inset (Cloudimage nested-crop frame)', () => {
    // Regression lock for the inset fix: the emitted outerCrop equals the
    // axis-aligned bbox crop minus ((innerW-iw)/2, (innerH-ih)/2). Without the
    // shift, every tilted crop is offset and the CDN result drifts off-frame.
    const sc = resolveServerCrop(applyRotation(createInitialState(), 30), W, H, W, H, 'classic');
    const rad = (30 * Math.PI) / 180;
    const innerW = Math.round(Math.abs(W * Math.cos(rad)) + Math.abs(H * Math.sin(rad)));
    const innerH = Math.round(Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad)));
    const insetX = Math.round((innerW - W) / 2);
    const insetY = Math.round((innerH - H) / 2);
    // The inset is non-trivial for a landscape image, so the shift is observable.
    expect(insetX).not.toBe(0);
    // x + inset must land back inside the bbox (i.e. pre-shift crop was in-bounds).
    const o = sc.nested!.outerCrop;
    expect(o.x + insetX).toBeGreaterThanOrEqual(0);
    expect(o.x + insetX + o.width).toBeLessThanOrEqual(innerW + 1);
    expect(o.y + insetY).toBeGreaterThanOrEqual(0);
    expect(o.y + insetY + o.height).toBeLessThanOrEqual(innerH + 1);
  });

  it('90° turn + free tilt with default crop → nested AND clamped (letterbox margin)', () => {
    // quarterTurns ±90 letterboxes the photo (classic); the default 80% crop then
    // spills into the margin, so even the nested plan must clamp — the canvas's
    // empty margins are not reproducible via a Cloudimage crop.
    const s = applyRotation(applyRotateLeft(createInitialState()), 13.56);
    const sc = resolveServerCrop(s, W, H, W, H, 'classic');
    expect(sc.tilted).toBe(true);
    expect(sc.clamped).toBe(true);
  });

  it('landscape image turned 90° + slight tilt (bbox narrower than original) → no inset, crop stays inside the rotated canvas', () => {
    // Regression for the negative-inset bug: a landscape photo (iw > ih) turned a
    // quarter + small tilt makes the rotated bbox NARROWER than the original on x
    // (innerW < iw). The old inset (innerW-iw)/2 went negative and pushed br_px
    // past innerW, so Cloudimage clamped the crop to a wrong region. The emitted
    // crop must stay fully within the inner rotated canvas.
    const s = { ...createInitialState(), quarterTurns: -90, rotation: -6.67, flipH: true };
    const sc = resolveServerCrop(s, 4032, 2268, 872, 490, 'classic');
    expect(sc.tilted).toBe(true);
    const n = sc.nested!;
    expect(n.innerW).toBeLessThan(4032); // rotated bbox is narrower than the original width
    expect(n.outerCrop.x).toBeGreaterThanOrEqual(0);
    expect(n.outerCrop.y).toBeGreaterThanOrEqual(0);
    expect(n.outerCrop.x + n.outerCrop.width).toBeLessThanOrEqual(n.innerW);
    expect(n.outerCrop.y + n.outerCrop.height).toBeLessThanOrEqual(n.innerH);
  });

  it('framing param selects the nested inset (centered=no inset, inset=full inset, auto=heuristic)', () => {
    // Moderate tilt where the rotated bbox is larger than the original on both
    // axes → a positive inset, so 'centered' and 'inset' differ by exactly it.
    const s = { ...createInitialState(), rotation: 25 };
    const centered = resolveServerCrop(s, W, H, W, H, 'classic', 'centered');
    const inset = resolveServerCrop(s, W, H, W, H, 'classic', 'inset');
    const auto = resolveServerCrop(s, W, H, W, H, 'classic'); // default 'auto'
    const rad = (25 * Math.PI) / 180;
    const innerW = Math.round(Math.abs(W * Math.cos(rad)) + Math.abs(H * Math.sin(rad)));
    const innerH = Math.round(Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad)));
    const insetX = Math.round((innerW - W) / 2);
    const insetY = Math.round((innerH - H) / 2);
    expect(insetX).toBeGreaterThan(0); // positive-inset regime (both axes)
    expect(insetY).toBeGreaterThan(0);
    // 'centered' omits the inset; 'inset' subtracts it → they differ by the inset.
    expect(centered.nested!.outerCrop.x - inset.nested!.outerCrop.x).toBe(insetX);
    expect(centered.nested!.outerCrop.y - inset.nested!.outerCrop.y).toBe(insetY);
    // 'auto' here (positive inset on both axes) matches 'inset'.
    expect(auto.nested!.outerCrop.x).toBe(inset.nested!.outerCrop.x);
    expect(auto.nested!.outerCrop.y).toBe(inset.nested!.outerCrop.y);
  });
});

describe('resolveServerCrop — flip × rotation order', () => {
  // The flip sits between the quarter-turn and the tilt in the editor's chain:
  // an odd flip negates ONLY the quarter-turn's contribution (rotate→flip), not
  // the tilt (flip→rotate). Cloudimage's emitted r = normalizeAngle(-geomDeg),
  // geomDeg = oddFlip ? rotation - quarterTurns : quarterTurns + rotation.
  it('single-pass: flipH + 90° negates the turn → r=270 (not 90)', () => {
    const s = { ...createInitialState(), quarterTurns: -90, rotation: 0, flipH: true };
    expect(resolveServerCrop(s, W, H, W, H, 'classic').rotateCCW).toBe(270);
  });

  it('nested: flipH + 90° + tilt 15 negates only the turn → r=255', () => {
    // geomDeg = 15 - (-90) = 105 → r = normalizeAngle(-105) = 255
    const s = { ...createInitialState(), quarterTurns: -90, rotation: 15, flipH: true };
    expect(resolveServerCrop(s, W, H, W, H, 'classic').rotateCCW).toBe(255);
  });

  it('even flip (h+v) preserves handedness → no negation', () => {
    // geomDeg = totalDeg = -90 + 15 = -75 → r = normalizeAngle(75) = 75
    const s = { ...createInitialState(), quarterTurns: -90, rotation: 15, flipH: true, flipV: true };
    expect(resolveServerCrop(s, W, H, W, H, 'classic').rotateCCW).toBe(75);
  });

  it('no flip is unchanged (regression): r = normalizeAngle(-(qt+tilt))', () => {
    const s = { ...createInitialState(), quarterTurns: -90, rotation: 15 };
    // geomDeg = -75 → r = 75
    expect(resolveServerCrop(s, W, H, W, H, 'classic').rotateCCW).toBe(75);
  });
});

describe('resolveServerCrop — input guards', () => {
  it('throws on a non-positive image dimension (would divide by zero)', () => {
    expect(() => resolveServerCrop(createInitialState(), 0, H, W, H, 'classic')).toThrow(/positive/);
    expect(() => resolveServerCrop(createInitialState(), W, 0, W, H, 'classic')).toThrow(/positive/);
  });

  it('throws on a non-positive / non-finite scale (would make the matrix singular)', () => {
    expect(() => resolveServerCrop({ ...createInitialState(), scale: 0 }, W, H, W, H, 'classic')).toThrow(/scale/);
    expect(() => resolveServerCrop({ ...createInitialState(), scale: -1 }, W, H, W, H, 'classic')).toThrow(/scale/);
    expect(() => resolveServerCrop({ ...createInitialState(), scale: NaN }, W, H, W, H, 'classic')).toThrow(/scale/);
  });
});
