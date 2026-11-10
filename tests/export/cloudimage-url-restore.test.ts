import { describe, it, expect } from 'vitest';
import { buildCloudimageUrlFromDescriptor, type CropDescriptor } from '../../src/export/cloudimage-url';
import { cropDescriptorFromCloudimageUrl } from '../../src/export/cloudimage-url-restore';
import type { TransformState } from '../../src/core/types';

const SRC = 'https://token.filerobot.com/folder/photo.jpg?vh=abc';
const IW = 5000;
const IH = 2790;
const BOX = { containerWidth: 720, containerHeight: 408 };

const state = (over: Partial<TransformState>): TransformState => ({
  quarterTurns: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  scale: 1,
  panX: 0,
  panY: 0,
  cropRect: { x: 0, y: 0, width: 1, height: 1 },
  turnedBox: false,
  ...over,
});

const descriptor = (s: TransformState, serverFraming?: 'centered' | 'inset'): CropDescriptor => ({
  state: s,
  imageWidth: IW,
  imageHeight: IH,
  ...BOX,
  variant: 'fixed',
  serverFraming,
});

const ops = (url: string): Record<string, string> => {
  const params = new URL(url).searchParams;
  return Object.fromEntries([...params.entries()]);
};

const point = (v: string): number[] => v.split(',').map(Number);

/** Two crop urls describe the same crop: same flip/turn, corners within `tol` px. */
const expectSameCrop = (actual: string, expected: string, tol = 2): void => {
  const a = ops(actual);
  const e = ops(expected);
  expect(a.flip).toBe(e.flip);
  expect(Number(a.r ?? 0)).toBeCloseTo(Number(e.r ?? 0), 1);
  for (const key of ['tl_px', 'br_px']) {
    const [ax, ay] = point(a[key]);
    const [ex, ey] = point(e[key]);
    expect(Math.abs(ax - ex)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ay - ey)).toBeLessThanOrEqual(tol);
  }
};

const roundTrip = (s: TransformState, serverFraming?: 'centered' | 'inset'): { saved: string; restored: string } => {
  const saved = buildCloudimageUrlFromDescriptor(descriptor(s, serverFraming), { src: SRC });
  const d = cropDescriptorFromCloudimageUrl(saved, { imageWidth: IW, imageHeight: IH, ...BOX, serverFraming });
  expect(d).not.toBeNull();
  const restored = buildCloudimageUrlFromDescriptor(d!, { src: SRC });
  return { saved, restored };
};

describe('cropDescriptorFromCloudimageUrl', () => {
  it.each([
    ['the untouched frame', state({})],
    ['a zoom', state({ scale: 1.6 })],
    ['a zoom with a pan', state({ scale: 2, panX: 90, panY: -40 })],
    ['a horizontal flip', state({ scale: 1.4, panX: -30, flipH: true })],
    ['both flips', state({ scale: 1.3, panY: 25, flipH: true, flipV: true })],
    ['a quarter turn', state({ quarterTurns: 90, scale: 2.2, panX: 20, panY: 10 })],
    ['a half turn with a flip', state({ quarterTurns: 180, scale: 1.5, flipH: true })],
    ['three quarter turns with a flip', state({ quarterTurns: 270, scale: 2.5, panY: -15, flipV: true })],
  ])('restores %s exactly', (_, s) => {
    const { saved, restored } = roundTrip(s);
    expectSameCrop(restored, saved);
  });

  it.each(['centered', 'inset'] as const)('restores a tilted crop with %s framing', (framing) => {
    const { saved, restored } = roundTrip(state({ rotation: 12, scale: 1.8, panX: 15, panY: -10 }), framing);
    expect(new URL(restored).searchParams.get('ci_url_encoded')).toBe('1');
    expectSameCrop(restored, saved);
  });

  it('restores a tilt combined with a turn and a flip', () => {
    const { saved, restored } = roundTrip(
      state({ quarterTurns: 90, rotation: -20, flipH: true, scale: 2.4 }),
      'centered',
    );
    expectSameCrop(restored, saved);
  });

  it('returns the turn, tilt and flips the url carries', () => {
    const saved = buildCloudimageUrlFromDescriptor(
      descriptor(state({ quarterTurns: 90, rotation: 10, flipV: true, scale: 2 }), 'inset'),
      { src: SRC },
    );
    const d = cropDescriptorFromCloudimageUrl(saved, { imageWidth: IW, imageHeight: IH, ...BOX, serverFraming: 'inset' })!;
    expect(d.state.quarterTurns).toBe(90);
    expect(d.state.rotation).toBeCloseTo(10, 1);
    expect(d.state.flipV).toBe(true);
    expect(d.state.flipH).toBe(false);
    expect(d.variant).toBe('fixed');
    // The editor tilts about the frame's centre; the on-screen layer needs it set explicitly.
    expect(d.state.rotationPivot).toEqual({ x: 0.5, y: 0.5 });
  });

  it('sets no tilt pivot when there is no tilt', () => {
    const saved = buildCloudimageUrlFromDescriptor(descriptor(state({ quarterTurns: 90, scale: 2 })), { src: SRC });
    const d = cropDescriptorFromCloudimageUrl(saved, { imageWidth: IW, imageHeight: IH, ...BOX })!;
    expect(d.state.rotationPivot).toBeUndefined();
  });

  it('returns null for a url without a crop', () => {
    expect(cropDescriptorFromCloudimageUrl(SRC, { imageWidth: IW, imageHeight: IH, ...BOX })).toBeNull();
    expect(cropDescriptorFromCloudimageUrl('not a url', { imageWidth: IW, imageHeight: IH, ...BOX })).toBeNull();
  });

  it('centres a crop of another shape (an older editor) on the same region, covering the frame', () => {
    // Square crop around (2000, 1200) restored into a 720×408 frame.
    const legacy = `${SRC}&tl_px=1500,700&br_px=2500,1700&e_scale=1.3`;
    const d = cropDescriptorFromCloudimageUrl(legacy, { imageWidth: IW, imageHeight: IH, ...BOX })!;
    const rebuilt = ops(buildCloudimageUrlFromDescriptor(d, { src: SRC }));
    const [x1, y1] = point(rebuilt.tl_px);
    const [x2, y2] = point(rebuilt.br_px);
    expect((x1 + x2) / 2).toBeCloseTo(2000, -1);
    expect((y1 + y2) / 2).toBeCloseTo(1200, -1);
    expect(d.state.scale).toBeGreaterThanOrEqual(1);
  });

  it('never zooms out past the cover floor', () => {
    const whole = `${SRC}&tl_px=0,0&br_px=${IW},${IH}`;
    const d = cropDescriptorFromCloudimageUrl(whole, { imageWidth: IW, imageHeight: IH, ...BOX })!;
    expect(d.state.scale).toBeGreaterThanOrEqual(1);
  });
});
