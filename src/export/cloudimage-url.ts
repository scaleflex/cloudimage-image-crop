import type { TransformParams, TransformState } from '../core/types';
import { resolveServerCrop, type ServerCrop } from './exporter';

/**
 * Options for {@link buildCloudimageUrl}.
 *
 * The crop geometry comes from {@link TransformParams} (the same object
 * `toTransformParams()` returns); these options describe the Cloudimage target
 * and the resize/format directives.
 */
export interface CloudimageUrlOptions {
  /**
   * The original image URL shown in the editor (i.e. `config.src`). Required.
   * If it's already a Cloudimage / Filerobot URL (`*.cloudimg.io`,
   * `*.filerobot.com`, or {@link domain}) the crop operations are
   * appended/merged onto it; otherwise it's wrapped as
   * `https://<token>.<domain>/<src>?…` (Cloudimage fetch-from-origin form).
   */
  src: string;
  /**
   * Cloudimage token — the `<token>` in `<token>.cloudimg.io`. Required unless
   * {@link src} is already a Cloudimage / Filerobot URL.
   */
  token?: string;
  /** Cloudimage domain. Defaults to `cloudimg.io`. */
  domain?: string;
  /**
   * Hex fill (no leading `#`, e.g. `ffffff`) for the corners Cloudimage exposes
   * when a rotation angle is not a multiple of 90°. Omitted → Cloudimage's
   * default fill.
   */
  bgColor?: string;
  /** Output format as a MIME type (e.g. `image/jpeg`); mapped to `force_format`. */
  format?: string;
  /** Output quality `0..1` for lossy formats; mapped to `q=0..100`. */
  quality?: number;
  /** Max output width in px (`0`/omitted = none); mapped to `w` + `func=bound`. */
  maxWidth?: number;
  /** Max output height in px (`0`/omitted = none); mapped to `h` + `func=bound`. */
  maxHeight?: number;
}

/** The Cloudimage delivery target (where + how), independent of the crop geometry. */
export type CloudimageTarget = CloudimageUrlOptions;

/**
 * A fully-serializable snapshot that lets ANY consumer (browser or server/Node)
 * reproduce the editor's crop as a Cloudimage URL with pixel-for-pixel geometry
 * — it carries the complete transform state plus the dimensions needed to
 * resolve zoom/pan and the fixed-variant cover-fit. Persist this (e.g. from the
 * `sfx-crop-save` event) to rebuild the URL later via
 * {@link buildCloudimageUrlFromDescriptor}.
 */
export interface CropDescriptor {
  state: TransformState;
  imageWidth: number;
  imageHeight: number;
  /** Editor box size (CSS px) at capture time — rescales pan + fixed cover. */
  containerWidth: number;
  containerHeight: number;
  variant: 'classic' | 'fixed';
}

const DEFAULT_DOMAIN = 'cloudimg.io';

/**
 * Hosts whose URLs are already Cloudimage-transformable — crop ops are appended
 * directly instead of wrapping with a token. Covers Cloudimage (`*.cloudimg.io`)
 * and Filerobot DAM delivery (`*.filerobot.com`), which runs on the same engine.
 * A consumer-supplied `domain` is matched in addition to these.
 */
const DELIVERY_DOMAINS = ['cloudimg.io', 'filerobot.com'];

/**
 * Build a Cloudimage v7 URL that reproduces a crop/transform server-side,
 * instead of rasterising it on a canvas.
 *
 * Cloudimage's positionable crop (`tl_px`/`br_px`) operates on the **original
 * image pixels** and is applied **before** flip/rotate, so the mapping is:
 *
 * - **Exact** for crop + flip + resize + format/quality. `tl_px`/`br_px` are the
 *   plain crop rectangle; `flip` mirrors the crop (matching the editor's
 *   flip-about-crop-centre). This is the common server-side-crop case.
 * - **Best-effort** for rotation: Cloudimage rotates the *cropped result*
 *   (crop → rotate), with `bg_color` filling the corners for non-90° angles.
 *   The editor instead rotates the photo and then crops an upright frame
 *   ("straighten"), which crop-then-rotate cannot reproduce — for pixel-faithful
 *   rotated output use blob mode (`toBlob`/`toCanvas`).
 * - Zoom/pan are ignored — same contract as `toTransformParams()`.
 *
 * Operations are emitted in Cloudimage's pipeline order (`flip → rotate → crop →
 * resize → format`); URL param order is otherwise irrelevant to the CDN.
 *
 * @throws if `src` is missing, or if `token` is needed (non-Cloudimage `src`)
 *   but absent.
 */
export function buildCloudimageUrl(params: TransformParams, options: CloudimageUrlOptions): string {
  if (!options.src) throw new Error('buildCloudimageUrl: options.src is required');

  const ops: Array<[string, string]> = [];

  // Flip — applied to the crop; matches the editor's flip-about-crop-centre.
  const flip = `${params.flipH ? 'h' : ''}${params.flipV ? 'v' : ''}`;
  if (flip) ops.push(['flip', flip]);

  // Rotate. Cloudimage `r` is counter-clockwise-positive; the editor's
  // `rotation` follows the canvas convention (clockwise-positive), so negate and
  // normalise to [0, 360). Cloudimage rotates the *cropped* result.
  const r = normalizeAngle(-params.rotation);
  const rRounded = Math.round(r * 100) / 100;
  if (rRounded !== 0) {
    ops.push(['r', String(rRounded)]);
    // Non-multiples of 90 expose background corners.
    if (rRounded % 90 !== 0 && options.bgColor) ops.push(['bg_color', stripHash(options.bgColor)]);
  }

  // Crop — tl_px / br_px in ORIGINAL image pixels (Cloudimage crops the original
  // before flip/rotate, so this is the plain crop rect: no offset, no mirroring).
  const c = params.crop;
  ops.push(['tl_px', `${Math.round(c.x)},${Math.round(c.y)}`]);
  ops.push(['br_px', `${Math.round(c.x + c.width)},${Math.round(c.y + c.height)}`]);

  // Resize (after the crop). `func=bound` fits within the box preserving aspect;
  // `org_if_sml=1` prevents upscaling past native.
  const maxW = options.maxWidth ?? 0;
  const maxH = options.maxHeight ?? 0;
  if (maxW > 0) ops.push(['w', String(Math.round(maxW))]);
  if (maxH > 0) ops.push(['h', String(Math.round(maxH))]);
  if (maxW > 0 || maxH > 0) {
    ops.push(['func', 'bound']);
    ops.push(['org_if_sml', '1']);
  }

  // Format & quality.
  const fmt = mimeToForceFormat(options.format);
  if (fmt) ops.push(['force_format', fmt]);
  if ((fmt === 'jpeg' || fmt === 'webp') && options.quality != null) {
    ops.push(['q', String(Math.round(clamp01(options.quality) * 100))]);
  }

  return assembleUrl(options.src, options.token, options.domain, ops);
}

/**
 * Build a Cloudimage URL with **full canvas parity** from a {@link CropDescriptor}
 * — reproduces crop + flip + 90° turns + free tilt + zoom + pan for both
 * `classic` and `fixed` variants.
 *
 * - No tilt (rotation ∈ {0,90,180,270}) → a single-pass URL.
 * - Free tilt → a two-pass **nested** URL (inner rotates the photo, outer crops
 *   the rotated result), since Cloudimage crops before it rotates.
 *
 * @throws if `target.src` is missing, or `target.token` is needed but absent.
 */
export function buildCloudimageUrlFromDescriptor(d: CropDescriptor, target: CloudimageTarget): string {
  if (!target.src) throw new Error('buildCloudimageUrlFromDescriptor: target.src is required');
  const sc = resolveServerCrop(
    d.state, d.imageWidth, d.imageHeight, d.containerWidth, d.containerHeight, d.variant,
  );
  return sc.tilted ? emitNested(sc, target) : emitSinglePass(sc, target);
}

/** Single-pass URL: crop (original px) → flip → rotate → resize → format. */
function emitSinglePass(sc: ServerCrop, target: CloudimageTarget): string {
  const ops: Array<[string, string]> = [];
  const flip = `${sc.flipH ? 'h' : ''}${sc.flipV ? 'v' : ''}`;
  if (flip) ops.push(['flip', flip]);
  const r = Math.round(sc.rotateCCW * 100) / 100;
  if (r !== 0) {
    ops.push(['r', String(r)]);
    if (r % 90 !== 0 && target.bgColor) ops.push(['bg_color', stripHash(target.bgColor)]);
  }
  ops.push(['tl_px', `${sc.cropPx.x},${sc.cropPx.y}`]);
  ops.push(['br_px', `${sc.cropPx.x + sc.cropPx.width},${sc.cropPx.y + sc.cropPx.height}`]);
  appendResizeAndFormat(ops, target);
  return assembleUrl(target.src, target.token, target.domain, ops);
}

/** Two-pass nested URL: inner = flip+rotate (full image); outer = crop+resize+format. */
function emitNested(sc: ServerCrop, target: CloudimageTarget): string {
  const n = sc.nested!;

  // Inner: rotate (+flip) the whole image, no crop/resize. The outer then crops
  // the rotated result, so the editor's rotate-then-crop is reproduced.
  const innerOps: Array<[string, string]> = [];
  const flip = `${n.flipH ? 'h' : ''}${n.flipV ? 'v' : ''}`;
  if (flip) innerOps.push(['flip', flip]);
  const r = Math.round(n.innerRotateCCW * 100) / 100;
  if (r !== 0) {
    innerOps.push(['r', String(r)]);
    if (r % 90 !== 0 && target.bgColor) innerOps.push(['bg_color', stripHash(target.bgColor)]);
  }
  const innerUrl = assembleUrl(target.src, target.token, target.domain, innerOps);

  // Outer: crop the inner result in its rotated-canvas pixels, then resize/format.
  const outerOps: Array<[string, string]> = [];
  outerOps.push(['tl_px', `${n.outerCrop.x},${n.outerCrop.y}`]);
  outerOps.push(['br_px', `${n.outerCrop.x + n.outerCrop.width},${n.outerCrop.y + n.outerCrop.height}`]);
  appendResizeAndFormat(outerOps, target);

  // encodeURIComponent already double-encodes the inner's existing %xx (e.g.
  // %20 → %2520), which ci_url_encoded=1 expects.
  return `${deliveryHost(target)}/${encodeURIComponent(innerUrl)}?ci_url_encoded=1&${stringifyOps(outerOps)}`;
}

/** Append resize (w/h + func=bound) and format/quality ops from the target. */
function appendResizeAndFormat(ops: Array<[string, string]>, target: CloudimageTarget): void {
  const maxW = target.maxWidth ?? 0;
  const maxH = target.maxHeight ?? 0;
  if (maxW > 0) ops.push(['w', String(Math.round(maxW))]);
  if (maxH > 0) ops.push(['h', String(Math.round(maxH))]);
  if (maxW > 0 || maxH > 0) {
    ops.push(['func', 'bound']);
    ops.push(['org_if_sml', '1']);
  }
  const fmt = mimeToForceFormat(target.format);
  if (fmt) ops.push(['force_format', fmt]);
  if ((fmt === 'jpeg' || fmt === 'webp') && target.quality != null) {
    ops.push(['q', String(Math.round(clamp01(target.quality) * 100))]);
  }
}

/** The `https://<host>` the outer (nested) URL is served from. */
function deliveryHost(target: CloudimageTarget): string {
  const dom = target.domain || DEFAULT_DOMAIN;
  if (isCloudimageUrl(target.src, dom)) {
    try {
      return new URL(target.src).origin;
    } catch {
      /* fall through to token form */
    }
  }
  if (!target.token) {
    throw new Error('buildCloudimageUrlFromDescriptor: options.token is required when src is not already a Cloudimage URL');
  }
  return `https://${target.token}.${dom}`;
}

function assembleUrl(
  src: string,
  token: string | undefined,
  domain: string | undefined,
  ops: Array<[string, string]>,
): string {
  const dom = domain || DEFAULT_DOMAIN;

  // Already a Cloudimage / Filerobot URL → merge our ops onto its query string.
  if (isCloudimageUrl(src, dom)) {
    const qIndex = src.indexOf('?');
    const base = qIndex === -1 ? src : src.slice(0, qIndex);
    const existing = qIndex === -1 ? '' : src.slice(qIndex + 1);
    return `${encodePathDelims(base)}?${mergeQuery(existing, ops)}`;
  }

  if (!token) {
    throw new Error('buildCloudimageUrl: options.token is required when src is not already a Cloudimage URL');
  }
  const host = `${token}.${dom}`;
  const query = stringifyOps(ops);

  // Fetch-from-origin (path form). When the origin URL carries its own query
  // string it must be percent-encoded and flagged with ci_url_encoded=1.
  if (src.includes('?')) {
    return `https://${host}/${encodeURIComponent(src)}?ci_url_encoded=1&${query}`;
  }
  return `https://${host}/${encodePathDelims(src)}?${query}`;
}

/**
 * Percent-encode the delimiter characters that are legal-but-fragile in a URL
 * path — a raw space, `&`, or `#` makes browsers / `<img>` mis-parse the path
 * (e.g. a folder literally named "Wines & More"). Already-encoded sequences
 * like `%20` are left intact (`%` is never touched), so this is idempotent.
 */
function encodePathDelims(s: string): string {
  return s.replace(/ /g, '%20').replace(/&/g, '%26').replace(/#/g, '%23');
}

/** True when `src`'s host is `*.cloudimg.io` / `*.filerobot.com` / `*.<domain>`. */
function isCloudimageUrl(src: string, domain: string): boolean {
  let host: string;
  try {
    host = new URL(src).hostname.toLowerCase();
  } catch {
    return false;
  }
  const domains = domain ? [...DELIVERY_DOMAINS, domain.toLowerCase()] : DELIVERY_DOMAINS;
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

function stringifyOps(ops: Array<[string, string]>): string {
  return ops.map(([k, v]) => `${k}=${v}`).join('&');
}

/** Merge our ops onto an existing query string; our values win on conflict. */
function mergeQuery(existing: string, ops: Array<[string, string]>): string {
  const ours = new Set(ops.map(([k]) => k));
  const kept = existing
    .split('&')
    .filter((pair) => pair && !ours.has(pair.split('=')[0]));
  return [...kept, ...ops.map(([k, v]) => `${k}=${v}`)].join('&');
}

function mimeToForceFormat(mime?: string): string | null {
  if (!mime) return null;
  const m = mime.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpeg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  return null;
}

function normalizeAngle(deg: number): number {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function stripHash(hex: string): string {
  return hex.startsWith('#') ? hex.slice(1) : hex;
}
