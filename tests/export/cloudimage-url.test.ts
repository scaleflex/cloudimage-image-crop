import { describe, it, expect } from 'vitest';
import { buildCloudimageUrl, buildCloudimageUrlFromDescriptor } from '../../src/export/cloudimage-url';
import { getTransformParams } from '../../src/export/exporter';
import { createInitialState, applyRotateLeft, applyScale, applyRotation } from '../../src/transforms/transform-state';
import type { TransformParams } from '../../src/core/types';

/** TransformParams with sane defaults (400×300 crop at 100,50). */
function makeParams(over: Partial<TransformParams> = {}): TransformParams {
  return {
    rotation: 0,
    flipH: false,
    flipV: false,
    scale: 1,
    crop: { x: 100, y: 50, width: 400, height: 300 },
    outputWidth: 400,
    outputHeight: 300,
    ...over,
  };
}

/** Parse the query string of a built URL. */
function query(url: string): URLSearchParams {
  const i = url.indexOf('?');
  return new URLSearchParams(i === -1 ? '' : url.slice(i + 1));
}

const RAW_SRC = 'https://example.com/photo.jpg';

describe('buildCloudimageUrl — base URL & target', () => {
  it('wraps a raw origin URL in the token host (fetch-from-origin path form)', () => {
    const url = buildCloudimageUrl(makeParams(), { src: RAW_SRC, token: 'demo' });
    expect(url.startsWith('https://demo.cloudimg.io/https://example.com/photo.jpg?')).toBe(true);
  });

  it('uses a custom domain when provided', () => {
    const url = buildCloudimageUrl(makeParams(), { src: RAW_SRC, token: 'demo', domain: 'mycdn.example' });
    expect(url.startsWith('https://demo.mycdn.example/')).toBe(true);
  });

  it('appends ops onto an already-Cloudimage URL without a token', () => {
    const url = buildCloudimageUrl(makeParams(), { src: 'https://demo.cloudimg.io/photo.jpg' });
    expect(url.startsWith('https://demo.cloudimg.io/photo.jpg?')).toBe(true);
    expect(query(url).get('tl_px')).toBe('100,50');
  });

  it('auto-detects a Filerobot URL and appends ops (no token), preserving its query', () => {
    const src = 'https://acme.filerobot.com/folder/pic.jpg?vh=abc123';
    const url = buildCloudimageUrl(makeParams(), { src });
    expect(url.startsWith('https://acme.filerobot.com/folder/pic.jpg?')).toBe(true);
    const qp = query(url);
    expect(qp.get('vh')).toBe('abc123');
    expect(qp.get('tl_px')).toBe('100,50');
  });

  it('percent-encodes a raw "&" / space in the path (browser-safe), not double-encoding %20', () => {
    const src = 'https://acme.filerobot.com/Wines%20&%20More/p.jpg?vh=1';
    const url = buildCloudimageUrl(makeParams(), { src });
    expect(url).toContain('/Wines%20%26%20More/p.jpg?');
    expect(url).not.toContain('&%20More');
    expect(query(url).get('vh')).toBe('1');
  });

  it('merges ops onto an existing query, our values winning', () => {
    const url = buildCloudimageUrl(makeParams(), { src: 'https://demo.cloudimg.io/photo.jpg?w=100&sharp=1', maxWidth: 400 });
    const qp = query(url);
    expect(qp.get('w')).toBe('400');
    expect(qp.get('sharp')).toBe('1');
  });

  it('percent-encodes a raw origin URL that carries its own query string', () => {
    const src = 'https://example.com/photo.jpg?v=2';
    const url = buildCloudimageUrl(makeParams(), { src, token: 'demo' });
    expect(url).toContain('ci_url_encoded=1');
    expect(url).toContain(encodeURIComponent(src));
  });

  it('throws when src is missing', () => {
    expect(() => buildCloudimageUrl(makeParams(), { src: '', token: 'demo' })).toThrow(/src is required/);
  });

  it('throws when a token is needed but absent', () => {
    expect(() => buildCloudimageUrl(makeParams(), { src: RAW_SRC })).toThrow(/token is required/);
  });
});

describe('buildCloudimageUrl — crop & flip', () => {
  it('maps the crop rect straight to tl_px/br_px (original pixels)', () => {
    const qp = query(buildCloudimageUrl(makeParams(), { src: RAW_SRC, token: 'demo' }));
    expect(qp.get('tl_px')).toBe('100,50');
    expect(qp.get('br_px')).toBe('500,350');
    expect(qp.has('r')).toBe(false);
    expect(qp.has('flip')).toBe(false);
  });

  it('emits flip without mirroring the crop coords (Cloudimage flips the crop)', () => {
    const qpH = query(buildCloudimageUrl(makeParams({ flipH: true }), { src: RAW_SRC, token: 'demo' }));
    expect(qpH.get('flip')).toBe('h');
    expect(qpH.get('tl_px')).toBe('100,50');
    expect(qpH.get('br_px')).toBe('500,350');

    const qpV = query(buildCloudimageUrl(makeParams({ flipV: true }), { src: RAW_SRC, token: 'demo' }));
    expect(qpV.get('flip')).toBe('v');
    expect(qpV.get('tl_px')).toBe('100,50');

    const qpHV = query(buildCloudimageUrl(makeParams({ flipH: true, flipV: true }), { src: RAW_SRC, token: 'demo' }));
    expect(qpHV.get('flip')).toBe('hv');
  });
});

describe('buildCloudimageUrl — rotation (crop → rotate)', () => {
  it('negates the editor rotation into Cloudimage CCW degrees (one rotate-left → r=90)', () => {
    const state = applyRotateLeft(createInitialState()); // rotation = -90
    const params = getTransformParams(state, 1920, 1080);
    const qp = query(buildCloudimageUrl(params, { src: RAW_SRC, token: 'demo' }));
    expect(qp.get('r')).toBe('90');
    expect(qp.has('bg_color')).toBe(false); // multiple of 90 → no exposed corners
    // crop is the plain rect in original pixels (no offset)
    expect(qp.get('tl_px')).toBe('192,108');
    expect(qp.get('br_px')).toBe('1728,972');
  });

  it('handles a 180° turn', () => {
    const params = getTransformParams(applyRotateLeft(applyRotateLeft(createInitialState())), 1920, 1080);
    const qp = query(buildCloudimageUrl(params, { src: RAW_SRC, token: 'demo' }));
    expect(qp.get('r')).toBe('180');
    expect(qp.get('tl_px')).toBe('192,108');
  });

  it('emits bg_color + crop unchanged for a free-angle tilt', () => {
    const qp = query(buildCloudimageUrl(makeParams({ rotation: 22 }), { src: RAW_SRC, token: 'demo', bgColor: '#ffffff' }));
    expect(qp.get('r')).toBe('338'); // -22 normalized to [0,360)
    expect(qp.get('bg_color')).toBe('ffffff');
    expect(qp.get('tl_px')).toBe('100,50'); // crop is plain original pixels
    expect(qp.get('br_px')).toBe('500,350');
  });
});

describe('buildCloudimageUrl — resize, format, quality', () => {
  it('emits w + func=bound + org_if_sml for a max width', () => {
    const qp = query(buildCloudimageUrl(makeParams(), { src: RAW_SRC, token: 'demo', maxWidth: 400 }));
    expect(qp.get('w')).toBe('400');
    expect(qp.get('func')).toBe('bound');
    expect(qp.get('org_if_sml')).toBe('1');
  });

  it('emits force_format + q for a lossy format', () => {
    const qp = query(buildCloudimageUrl(makeParams(), { src: RAW_SRC, token: 'demo', format: 'image/jpeg', quality: 0.8 }));
    expect(qp.get('force_format')).toBe('jpeg');
    expect(qp.get('q')).toBe('80');
  });

  it('omits q for a lossless format', () => {
    const qp = query(buildCloudimageUrl(makeParams(), { src: RAW_SRC, token: 'demo', format: 'image/png', quality: 0.8 }));
    expect(qp.get('force_format')).toBe('png');
    expect(qp.has('q')).toBe(false);
  });
});

describe('buildCloudimageUrlFromDescriptor — full parity', () => {
  const DW = 1920;
  const DH = 1080;
  const descriptor = (state: ReturnType<typeof createInitialState>) => ({
    state,
    imageWidth: DW,
    imageHeight: DH,
    containerWidth: DW,
    containerHeight: DH,
    variant: 'classic' as const,
  });

  it('single pass: emits the zoom-aware crop in original pixels (zoom now honored)', () => {
    const url = buildCloudimageUrlFromDescriptor(
      descriptor(applyScale(createInitialState(), 2, 0.5, 5)),
      { src: RAW_SRC, token: 'demo' },
    );
    const qp = query(url);
    expect(qp.get('tl_px')).toBe('576,324');
    expect(qp.get('br_px')).toBe('1344,756');
    expect(url.includes('ci_url_encoded')).toBe(false);
  });

  it('single pass: a 90° turn emits r=90 and no nesting', () => {
    const url = buildCloudimageUrlFromDescriptor(
      descriptor(applyRotateLeft(createInitialState())),
      { src: RAW_SRC, token: 'demo' },
    );
    expect(query(url).get('r')).toBe('90');
    expect(url.includes('ci_url_encoded')).toBe(false);
  });

  it('free tilt: nested URL — inner rotates (no crop), outer crops', () => {
    const url = buildCloudimageUrlFromDescriptor(
      descriptor(applyRotation(createInitialState(), 22)),
      { src: 'https://demo.cloudimg.io/p.jpg', bgColor: '#000000' },
    );
    expect(url).toContain('ci_url_encoded=1');
    expect(query(url).get('tl_px')).toBeTruthy();
    const enc = url.substring(url.indexOf('/', 8) + 1, url.indexOf('?'));
    const inner = decodeURIComponent(enc);
    expect(inner).toContain('r=338');
    expect(inner).toContain('bg_color=000000');
    expect(inner).not.toContain('tl_px');
  });
});
