import { renderToCanvas, resolveServerCrop } from './exporter';
import {
  buildCloudimageUrlFromDescriptor,
  type CropDescriptor,
  type CloudimageTarget,
} from './cloudimage-url';

/**
 * Detect — against the **live Cloudimage CDN** — which nested-crop framing
 * reproduces a free-tilt crop for THIS image.
 *
 * Cloudimage frames a rotated image's nested crop differently per image (it
 * measures the outer `tl_px`/`br_px` either from the centred original frame or
 * from the rotated-bbox corner). This is a CDN-side property that can NOT be
 * derived from the crop geometry — verified against the live CDN that it's
 * independent of aspect, format, EXIF, dimensions and rotation angle — so the
 * only reliable way to pick it is to compare the editor's local crop with both
 * candidate URLs and keep the one that matches.
 *
 * Returns the framing to store in {@link CropDescriptor.serverFraming}. Non-tilt
 * crops don't need it (they're exact either way) → returns `'centered'`. Both
 * candidates failing to load (offline / CORS) also falls back to `'centered'`.
 *
 * Browser-only (uses `Image`, `<canvas>` and `fetch`). The image must be
 * CORS-clean (same requirement as `toBlob`/`toDataURL`).
 */
export async function calibrateServerFraming(
  image: HTMLImageElement,
  descriptor: CropDescriptor,
  target: CloudimageTarget,
): Promise<'centered' | 'inset'> {
  const sc = resolveServerCrop(
    descriptor.state, descriptor.imageWidth, descriptor.imageHeight,
    descriptor.containerWidth, descriptor.containerHeight, descriptor.variant,
  );
  if (!sc.tilted) return 'centered'; // single-pass is exact regardless of framing

  // Ground truth: the canvas crop the editor produces (rectangular — the shape
  // mask is client-side only and doesn't affect the geometric framing).
  const local = renderToCanvas(
    image, descriptor.state, 0, 0, 'free', 20,
    descriptor.containerWidth, descriptor.containerHeight, descriptor.variant,
  );
  const W = 200, H = Math.max(1, Math.round((W * local.height) / local.width));
  let ref: Uint8ClampedArray;
  try {
    ref = pixels(local, W, H);
  } catch {
    return 'centered'; // tainted canvas — can't measure; geometric default
  }

  const candidates: Array<'centered' | 'inset'> = ['centered', 'inset'];
  const diffs = await Promise.all(
    candidates.map(async (framing) => {
      const url = buildCloudimageUrlFromDescriptor({ ...descriptor, serverFraming: framing }, target);
      try {
        const img = await loadCrossOrigin(url);
        return meanDiff(ref, pixels(img, W, H));
      } catch {
        return Number.POSITIVE_INFINITY;
      }
    }),
  );
  // Lower diff wins; tie / both-failed → 'centered' (the geometric default).
  return diffs[1] < diffs[0] ? 'inset' : 'centered';
}

function pixels(src: CanvasImageSource, w: number, h: number): Uint8ClampedArray {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(src, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

function meanDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  const n = Math.min(a.length, b.length);
  let sum = 0, count = 0;
  for (let i = 0; i < n; i += 4) {
    sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    count += 3;
  }
  return count ? sum / count : Number.POSITIVE_INFINITY;
}

function loadCrossOrigin(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('calibrate: failed to load ' + url));
    img.src = url;
  });
}
