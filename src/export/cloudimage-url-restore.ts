import type { TransformState } from '../core/types';
import { degreesToRadians } from '../utils/math';
import {
  identityMatrix,
  invertMatrix,
  multiplyMatrices,
  rotateMatrix,
  scaleMatrix,
  transformPoint,
  translateMatrix,
} from '../transforms/matrix';
import type { CropDescriptor } from './cloudimage-url';
import { resolveDisplay } from './exporter';

/** What {@link cropDescriptorFromCloudimageUrl} needs about the editor the crop reopens in. */
export interface CropRestoreTarget {
  /** The ORIGINAL photo's natural size — the one `tl_px`/`br_px` were measured on. */
  imageWidth: number;
  imageHeight: number;
  /** The editor box (CSS px) the descriptor will be restored into. */
  containerWidth: number;
  containerHeight: number;
  /**
   * Calibrated free-tilt framing of this photo (`calibrateCloudimage()`); only read for a tilted
   * (nested) url. Omitted → the same `'auto'` heuristic the url builder falls back to.
   */
  serverFraming?: 'centered' | 'inset';
}

interface ParsedCrop {
  /** Crop rect as emitted: original px (single pass) or the nested outer crop. */
  rect: { x: number; y: number; width: number; height: number };
  flipH: boolean;
  flipV: boolean;
  /** Net Cloudimage rotation, degrees clockwise (the editor's `geomDeg`). */
  geomDeg: number;
  nested: boolean;
}

const FULL_FRAME = { x: 0, y: 0, width: 1, height: 1 };

/**
 * Rebuild a `'fixed'`-variant {@link CropDescriptor} from a Cloudimage crop url — the inverse of
 * `buildCloudimageUrlFromDescriptor`, so an editor can reopen on a crop that was saved only as its
 * url (pass the result to `restoreState()` after `cloudimage-crop-image-load`).
 *
 * Exact for every crop this library emits in the fixed variant (zoom, pan, flips, quarter turns,
 * and free tilt given the photo's calibrated framing): the frame IS the editor box, so a crop is
 * fully described by its turn/tilt/flips — read straight from the url — plus a zoom and a pan,
 * solved from the crop's size and centre through the same matrix the canvas renders with.
 *
 * A crop of another shape than the box (e.g. made by an older editor) is restored centred on the
 * same region, zoomed so the box covers it, never below the cover floor.
 *
 * @returns `null` when the url carries no crop (`tl_px`/`br_px`) or cannot be parsed.
 */
export function cropDescriptorFromCloudimageUrl(url: string, target: CropRestoreTarget): CropDescriptor | null {
  const { imageWidth: iw, imageHeight: ih, containerWidth: cw, containerHeight: ch } = target;
  if (!(iw > 0) || !(ih > 0) || !(cw > 0) || !(ch > 0)) return null;

  const parsed = parseCrop(url);
  if (!parsed) return null;

  const { quarterTurns, rotation } = splitAngle(parsed.geomDeg, parsed.flipH !== parsed.flipV);
  const base: TransformState = {
    quarterTurns,
    rotation,
    flipH: parsed.flipH,
    flipV: parsed.flipV,
    scale: 1,
    panX: 0,
    panY: 0,
    cropRect: { ...FULL_FRAME },
    // A tilt pivots about the frame's centre — what the editor itself captures when the user
    // tilts. Left unset, the on-screen layer would not draw the same picture as the export.
    ...(rotation !== 0 ? { rotationPivot: { x: 0.5, y: 0.5 } } : {}),
    turnedBox: false,
  };

  // Target: the crop's centre in original px, and its size along the box's own axes.
  const center = parsed.nested
    ? nestedCenterInImage(parsed, iw, ih, target.serverFraming ?? 'auto')
    : { x: parsed.rect.x + parsed.rect.width / 2, y: parsed.rect.y + parsed.rect.height / 2 };
  // A single-pass crop is measured before the turn; a nested one after it (in the rotated canvas).
  const oddTurn = !parsed.nested && Math.round(Math.abs(parsed.geomDeg) / 90) % 2 === 1;
  const targetW = oddTurn ? parsed.rect.height : parsed.rect.width;
  const targetH = oddTurn ? parsed.rect.width : parsed.rect.height;

  const unit = windowInImage(base, iw, ih, cw, ch);
  // Window size scales as 1/zoom. The smaller zoom keeps the whole saved region in view when its
  // shape differs from the box; 1 is the fixed variant's cover floor.
  const scale = Math.max(1, Math.min(unit.width / targetW, unit.height / targetH));

  const at = (panX: number, panY: number): { x: number; y: number } =>
    windowInImage({ ...base, scale, panX, panY }, iw, ih, cw, ch).center;
  // The window centre is affine in the pan: solve it from two unit probes.
  const c0 = at(0, 0);
  const ex = sub(at(1, 0), c0);
  const ey = sub(at(0, 1), c0);
  const det = ex.x * ey.y - ex.y * ey.x;
  if (Math.abs(det) < 1e-9) return null;
  const d = sub(center, c0);
  const panX = (d.x * ey.y - d.y * ey.x) / det;
  const panY = (ex.x * d.y - ex.y * d.x) / det;

  return {
    state: { ...base, scale, panX, panY },
    imageWidth: iw,
    imageHeight: ih,
    containerWidth: cw,
    containerHeight: ch,
    variant: 'fixed',
    ...(parsed.nested && target.serverFraming ? { serverFraming: target.serverFraming } : {}),
  };
}

function parseCrop(url: string): ParsedCrop | null {
  let outer: URL;
  try {
    outer = new URL(url);
  } catch {
    return null;
  }
  const rect = readRect(outer.searchParams);
  if (!rect) return null;

  const nested = outer.searchParams.get('ci_url_encoded') === '1';
  let rotationParams = outer.searchParams;
  if (nested) {
    try {
      rotationParams = new URL(decodeURIComponent(outer.pathname.slice(1))).searchParams;
    } catch {
      return null;
    }
  }

  const flip = rotationParams.get('flip') ?? '';
  const rotateCCW = Number(rotationParams.get('r') ?? 0);
  if (!Number.isFinite(rotateCCW)) return null;

  return {
    rect,
    flipH: flip.includes('h'),
    flipV: flip.includes('v'),
    geomDeg: normalizeSigned(-rotateCCW),
    nested,
  };
}

function readRect(params: URLSearchParams): ParsedCrop['rect'] | null {
  const tl = params.get('tl_px')?.split(',').map(Number);
  const br = params.get('br_px')?.split(',').map(Number);
  if (!tl || !br || tl.length !== 2 || br.length !== 2 || [...tl, ...br].some((v) => !Number.isFinite(v))) {
    return null;
  }
  const width = br[0] - tl[0];
  const height = br[1] - tl[1];
  if (width <= 0 || height <= 0) return null;
  return { x: tl[0], y: tl[1], width, height };
}

/**
 * Split the net angle into the editor's quarter turn + fine tilt (±45°). The editor's net angle is
 * `quarterTurns + rotation`, or `rotation − quarterTurns` under an odd flip (see resolveServerCrop).
 */
function splitAngle(geomDeg: number, oddFlip: boolean): { quarterTurns: number; rotation: number } {
  const turn = Math.round(geomDeg / 90) * 90;
  const rotation = geomDeg - turn;
  const quarterTurns = normalize360(oddFlip ? -turn : turn);
  return { quarterTurns, rotation: Math.abs(rotation) < 1e-6 ? 0 : rotation };
}

/** Original-image point under the centre of a nested (tilt) url's outer crop. */
function nestedCenterInImage(
  parsed: ParsedCrop,
  iw: number,
  ih: number,
  framing: 'auto' | 'centered' | 'inset',
): { x: number; y: number } {
  // Mirrors resolveServerCrop's inner pass: original px → flip → rotate → centre in the bbox.
  const rad = degreesToRadians(parsed.geomDeg);
  const innerW = Math.round(Math.abs(iw * Math.cos(rad)) + Math.abs(ih * Math.sin(rad)));
  const innerH = Math.round(Math.abs(iw * Math.sin(rad)) + Math.abs(ih * Math.cos(rad)));
  const fullInsetX = Math.round((innerW - iw) / 2);
  const fullInsetY = Math.round((innerH - ih) / 2);
  const applyInset =
    framing === 'inset' ? true : framing === 'centered' ? false : fullInsetX >= 0 && fullInsetY >= 0;

  let innerMap = identityMatrix();
  innerMap = multiplyMatrices(innerMap, translateMatrix(innerW / 2, innerH / 2));
  innerMap = multiplyMatrices(innerMap, rotateMatrix(parsed.geomDeg));
  if (parsed.flipH || parsed.flipV) {
    innerMap = multiplyMatrices(innerMap, scaleMatrix(parsed.flipH ? -1 : 1, parsed.flipV ? -1 : 1));
  }
  innerMap = multiplyMatrices(innerMap, translateMatrix(-iw / 2, -ih / 2));

  const { rect } = parsed;
  const cx = rect.x + (applyInset ? fullInsetX : 0) + rect.width / 2;
  const cy = rect.y + (applyInset ? fullInsetY : 0) + rect.height / 2;
  return transformPoint(invertMatrix(innerMap), cx, cy);
}

/** The editor box's pre-image in original px: its centre and its side lengths. */
function windowInImage(
  state: TransformState,
  iw: number,
  ih: number,
  cw: number,
  ch: number,
): { center: { x: number; y: number }; width: number; height: number } {
  const { DW, DH, drawW, drawH, imgToDisp } = resolveDisplay(state, iw, ih, cw, ch, 'fixed');
  const inv = invertMatrix(imgToDisp);
  const toImage = (dx: number, dy: number): { x: number; y: number } => {
    const q = transformPoint(inv, dx, dy);
    return { x: (q.x + drawW / 2) * (iw / drawW), y: (q.y + drawH / 2) * (ih / drawH) };
  };
  const origin = toImage(0, 0);
  return {
    center: toImage(DW / 2, DH / 2),
    width: length(sub(toImage(DW, 0), origin)),
    height: length(sub(toImage(0, DH), origin)),
  };
}

const sub = (a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

const length = (v: { x: number; y: number }): number => Math.hypot(v.x, v.y);

function normalize360(deg: number): number {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
}

/** Normalize to (-180, 180]. */
function normalizeSigned(deg: number): number {
  const a = normalize360(deg);
  return a > 180 ? a - 360 : a;
}
