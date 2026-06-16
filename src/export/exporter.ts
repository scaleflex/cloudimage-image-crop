import type { TransformState, TransformParams } from '../core/types';
import { degreesToRadians, clamp } from '../utils/math';
import { computeCoverDraw } from '../canvas/image-layer';
import {
  type Matrix2D,
  identityMatrix,
  multiplyMatrices,
  translateMatrix,
  scaleMatrix,
  rotateMatrix,
  invertMatrix,
  transformPoint,
} from '../transforms/matrix';

function get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return ctx;
}

/** Calculate transform params in original image pixel coordinates. */
export function getTransformParams(
  state: TransformState,
  imageWidth: number,
  imageHeight: number,
): TransformParams {
  const totalRotation = state.quarterTurns + state.rotation;
  const cropW = Math.round(state.cropRect.width * imageWidth);
  const cropH = Math.round(state.cropRect.height * imageHeight);
  const is90 = Math.round(state.quarterTurns / 90) % 2 !== 0;

  return {
    rotation: totalRotation,
    flipH: state.flipH,
    flipV: state.flipV,
    scale: state.scale,
    crop: {
      x: Math.round(state.cropRect.x * imageWidth),
      y: Math.round(state.cropRect.y * imageHeight),
      width: cropW,
      height: cropH,
    },
    outputWidth: is90 ? cropH : cropW,
    outputHeight: is90 ? cropW : cropH,
  };
}

/** Geometry resolved from a {@link TransformState} for a given display box. */
export interface ResolvedDisplay {
  /** Display-space dimensions (= image px in classic; density-scaled box in fixed). */
  DW: number;
  DH: number;
  /** Size the photo is drawn at within display space (centered). */
  drawW: number;
  drawH: number;
  /** Crop window in display space (px). */
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  /**
   * Affine map from the centered draw-space (the `drawImage(image, -drawW/2,
   * -drawH/2, …)` frame) to display px. Built by composing the SAME transform
   * sequence {@link renderToCanvas} applies via the canvas context, so the two
   * cannot drift — guarded by the matrix-equivalence test.
   */
  imgToDisp: Matrix2D;
}

/**
 * Resolve the display coordinate system + the image→display matrix for a state.
 * Single source of truth shared by {@link renderToCanvas} (slices it onto a
 * canvas) and {@link resolveServerCrop} (inverts it to derive CDN crop coords).
 *
 * Classic: the editor box has the photo aspect, so display space IS image-pixel
 * space (DW=iw, DH=ih) and the photo fills it; a 90°/270° turn letterboxes the
 * photo (shorter-axis fit). Fixed: the box has the FRAME aspect, the photo is
 * cover-fit, and display space is the box scaled up toward native resolution.
 */
export function resolveDisplay(
  state: TransformState,
  iw: number,
  ih: number,
  containerWidth: number,
  containerHeight: number,
  variant: 'classic' | 'fixed' = 'classic',
): ResolvedDisplay {
  const fixed = variant === 'fixed' && containerWidth > 0 && containerHeight > 0;

  let DW: number;
  let DH: number;
  let drawW: number;
  let drawH: number;

  if (fixed) {
    const coverCss = computeCoverDraw(containerWidth, containerHeight, iw, ih, state.quarterTurns);
    // Image px per CSS px — render the box at this density to stay near native.
    const density = Math.max(iw / coverCss.drawW, ih / coverCss.drawH);
    DW = Math.max(1, Math.round(containerWidth * density));
    DH = Math.max(1, Math.round(containerHeight * density));
    const coverOut = computeCoverDraw(DW, DH, iw, ih, state.quarterTurns);
    drawW = coverOut.drawW;
    drawH = coverOut.drawH;
  } else {
    DW = iw;
    DH = ih;
    const is90 = Math.round(state.quarterTurns / 90) % 2 !== 0;
    const fit = is90 ? Math.min(DW, DH) / Math.max(DW, DH) : 1;
    drawW = DW * fit;
    drawH = DH * fit;
  }

  const cropX = state.cropRect.x * DW;
  const cropY = state.cropRect.y * DH;
  const cropW = state.cropRect.width * DW;
  const cropH = state.cropRect.height * DH;

  // Build the image(draw-space) → display matrix mirroring renderToCanvas's ctx
  // chain EXACTLY (ctx pre-multiplies, so each op is appended on the right).
  const liveCx = (state.cropRect.x + state.cropRect.width / 2) * DW;
  const liveCy = (state.cropRect.y + state.cropRect.height / 2) * DH;
  const tiltPivot = state.rotationPivot ?? {
    x: state.cropRect.x + state.cropRect.width / 2,
    y: state.cropRect.y + state.cropRect.height / 2,
  };
  const tiltCx = tiltPivot.x * DW;
  const tiltCy = tiltPivot.y * DH;
  const panFactor = containerWidth > 0 ? DW / containerWidth : 1;

  let m = identityMatrix();
  if (state.rotation !== 0) {
    m = multiplyMatrices(m, translateMatrix(tiltCx, tiltCy));
    m = multiplyMatrices(m, rotateMatrix(state.rotation));
    m = multiplyMatrices(m, translateMatrix(-tiltCx, -tiltCy));
  }
  if (state.flipH || state.flipV) {
    m = multiplyMatrices(m, translateMatrix(liveCx, liveCy));
    m = multiplyMatrices(m, scaleMatrix(state.flipH ? -1 : 1, state.flipV ? -1 : 1));
    m = multiplyMatrices(m, translateMatrix(-liveCx, -liveCy));
  }
  m = multiplyMatrices(m, translateMatrix(DW / 2, DH / 2));
  m = multiplyMatrices(m, scaleMatrix(state.scale, state.scale));
  m = multiplyMatrices(m, translateMatrix(state.panX * panFactor, state.panY * panFactor));
  if (state.quarterTurns !== 0) {
    m = multiplyMatrices(m, rotateMatrix(state.quarterTurns));
  }

  return { DW, DH, drawW, drawH, cropX, cropY, cropW, cropH, imgToDisp: m };
}

/** Render the cropped/transformed image to a new canvas. */
export function renderToCanvas(
  image: HTMLImageElement,
  state: TransformState,
  maxWidth: number,
  maxHeight: number,
  cropShape: string = 'free',
  borderRadius: number = 20,
  /**
   * Width (CSS px) of the editor's layout container at the moment of export.
   * The renderer stores `state.panX/panY` in container CSS pixels; we draw
   * at iw×ih image pixels, so pan must be rescaled by iw/containerWidth or
   * the exported framing drifts under any non-zero pan (e.g. after zoom).
   * Falls back to iw (no rescaling) when callers don't have the dim.
   */
  containerWidth: number = 0,
  /** Editor box height (CSS px) — required for the fixed variant's cover math. */
  containerHeight: number = 0,
  /** Display variant — `'fixed'` switches to frame-box + cover export. */
  variant: 'classic' | 'fixed' = 'classic',
): HTMLCanvasElement {
  // Display geometry is resolved once, here and for the server-crop path, by
  // the shared resolveDisplay() — keeping the canvas and the CDN URL in lockstep.
  const { DW, DH, drawW, drawH, cropX, cropY, cropW, cropH } = resolveDisplay(
    state,
    image.naturalWidth,
    image.naturalHeight,
    containerWidth,
    containerHeight,
    variant,
  );

  let outW = Math.max(1, Math.round(cropW));
  let outH = Math.max(1, Math.round(cropH));

  if (maxWidth > 0 && outW > maxWidth) {
    outH = Math.max(1, Math.round(outH * (maxWidth / outW)));
    outW = maxWidth;
  }
  if (maxHeight > 0 && outH > maxHeight) {
    outW = Math.max(1, Math.round(outW * (maxHeight / outH)));
    outH = maxHeight;
  }

  // Guard against a degenerate crop (e.g. setCropRect({width:0})): dividing by
  // ~0 would make renderScale Infinity and corrupt the canvas transform.
  const renderScale = cropW > 1e-6 ? outW / cropW : 1;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = get2DContext(canvas);

  ctx.save();

  // Map display-space rect (cropX, cropY, cropW, cropH) → (0, 0, outW, outH).
  ctx.scale(renderScale, renderScale);
  ctx.translate(-cropX, -cropY);

  // Mirror image-layer.ts transform chain in DW×DH display space.
  const liveCx = (state.cropRect.x + state.cropRect.width / 2) * DW;
  const liveCy = (state.cropRect.y + state.cropRect.height / 2) * DH;
  const tiltPivot = state.rotationPivot ?? {
    x: state.cropRect.x + state.cropRect.width / 2,
    y: state.cropRect.y + state.cropRect.height / 2,
  };
  const tiltCx = tiltPivot.x * DW;
  const tiltCy = tiltPivot.y * DH;

  if (state.rotation !== 0) {
    ctx.translate(tiltCx, tiltCy);
    ctx.rotate(degreesToRadians(state.rotation));
    ctx.translate(-tiltCx, -tiltCy);
  }
  if (state.flipH || state.flipV) {
    ctx.translate(liveCx, liveCy);
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    ctx.translate(-liveCx, -liveCy);
  }

  ctx.translate(DW / 2, DH / 2);
  ctx.scale(state.scale, state.scale);
  // Pan is stored in editor-box CSS px; rescale into display space. In fixed
  // mode the box width is `containerWidth`; in classic it's the image width.
  const panFactor = containerWidth > 0 ? DW / containerWidth : 1;
  ctx.translate(state.panX * panFactor, state.panY * panFactor);
  if (state.quarterTurns !== 0) {
    ctx.rotate(degreesToRadians(state.quarterTurns));
  }

  // `drawW`/`drawH` computed above: cover-fit (fixed) or shorter-axis fit on a
  // 90° turn (classic, matches image-layer.ts).
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();

  // For circle shapes, apply circular mask
  if (cropShape === 'circle') {
    applyCircleMask(canvas);
  } else if (cropShape === 'rounded-rect') {
    applyRoundedRectMask(canvas, borderRadius);
  }

  return canvas;
}

function normalizeAngle(deg: number): number {
  const a = deg % 360;
  const r = a < 0 ? a + 360 : a;
  return r === 0 ? 0 : r; // avoid -0
}

/**
 * A server-side crop plan derived from a {@link TransformState}, for building a
 * Cloudimage URL that matches {@link renderToCanvas} pixel-for-pixel (geometry).
 *
 * The crop window's pre-image is computed by inverting the shared
 * {@link resolveDisplay} matrix, so zoom/pan/flip/90° turns and both variants
 * are all captured.
 *
 * - `tilted === false` (rotation ∈ {0,90,180,270}): a **single-pass** URL —
 *   crop `cropPx` (original pixels) → flip → rotate `rotateCCW` → resize to
 *   `outW×outH`.
 * - `tilted === true` (free tilt): a **two-pass nested** URL — `nested` carries
 *   the inner rotate+flip and the `outerCrop` expressed in the inner rotated
 *   canvas (`innerW×innerH`).
 */
export interface ServerCrop {
  /** Crop rect in ORIGINAL image pixels (axis-aligned; the single-pass crop). */
  cropPx: { x: number; y: number; width: number; height: number };
  /** Cloudimage rotation (CCW degrees, normalized [0,360)). */
  rotateCCW: number;
  flipH: boolean;
  flipV: boolean;
  /** Output dimensions (crop window size in display px). */
  outW: number;
  outH: number;
  /** True when a non-90° tilt requires the nested (rotate-then-crop) URL. */
  tilted: boolean;
  /**
   * True when the crop window extends beyond the (transformed) image and had to
   * be clamped to its bounds — i.e. the canvas shows empty/background margins
   * there that a Cloudimage URL cannot reproduce (CDNs clamp crops to the image,
   * they don't pad). Happens with a `classic` 90°/270° turn whose crop frame
   * reaches into the letterbox margin, or any zoom-out below cover. Geometry for
   * the in-image region is still exact; only the margin can't be matched.
   */
  clamped: boolean;
  /** Present iff `tilted` — the two-pass plan. */
  nested?: {
    innerRotateCCW: number;
    flipH: boolean;
    flipV: boolean;
    innerW: number;
    innerH: number;
    /**
     * Crop rect for the nested outer pass, in Cloudimage's nested-crop frame:
     * the axis-aligned crop within the rotated bbox, shifted by the bbox→photo
     * inset `((innerW-iw)/2, (innerH-ih)/2)` because Cloudimage measures a nested
     * `tl_px`/`br_px` from the original image frame's inset position, not the
     * bbox corner. Emitted directly as `tl_px`/`br_px`.
     */
    outerCrop: { x: number; y: number; width: number; height: number };
  };
}

/**
 * Resolve the {@link ServerCrop} plan for a state + display box. Pure; shares
 * {@link resolveDisplay} with the canvas renderer so the two never diverge.
 */
export function resolveServerCrop(
  state: TransformState,
  iw: number,
  ih: number,
  containerWidth: number,
  containerHeight: number,
  variant: 'classic' | 'fixed' = 'classic',
): ServerCrop {
  const { drawW, drawH, cropX, cropY, cropW, cropH, imgToDisp } = resolveDisplay(
    state, iw, ih, containerWidth, containerHeight, variant,
  );
  const inv = invertMatrix(imgToDisp);

  // The four crop-window corners → ORIGINAL image pixels (drawImage draws the
  // photo centered at drawW×drawH, so draw-space (-drawW/2..) maps to 0..iw).
  const cornersImg = [
    [cropX, cropY],
    [cropX + cropW, cropY],
    [cropX + cropW, cropY + cropH],
    [cropX, cropY + cropH],
  ].map(([dx, dy]) => {
    const q = transformPoint(inv, dx, dy);
    return {
      x: (q.x + drawW / 2) * (iw / drawW),
      y: (q.y + drawH / 2) * (ih / drawH),
    };
  });

  const totalDeg = state.quarterTurns + state.rotation;
  const rotateCCW = normalizeAngle(-totalDeg);
  const tilted = Math.abs(((totalDeg % 90) + 90) % 90) > 1e-6;
  const outW = Math.max(1, Math.round(cropW));
  const outH = Math.max(1, Math.round(cropH));

  if (!tilted) {
    // rotation is a multiple of 90 → the pre-image is an axis-aligned rect.
    const xs = cornersImg.map((p) => p.x);
    const ys = cornersImg.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const x = clamp(Math.round(minX), 0, iw);
    const y = clamp(Math.round(minY), 0, ih);
    const x2 = clamp(Math.round(maxX), 0, iw);
    const y2 = clamp(Math.round(maxY), 0, ih);
    return {
      cropPx: { x, y, width: Math.max(1, x2 - x), height: Math.max(1, y2 - y) },
      rotateCCW,
      flipH: state.flipH,
      flipV: state.flipV,
      outW,
      outH,
      tilted: false,
      clamped: minX < -0.5 || minY < -0.5 || maxX > iw + 0.5 || maxY > ih + 0.5,
    };
  }

  // Non-90 tilt → nested. Inner rotates the (flipped) full image into its
  // bounding box; the pre-image rect — rotated by the same angle — becomes
  // axis-aligned, so its bbox in the inner canvas is the outer crop.
  const rad = degreesToRadians(totalDeg);
  const innerW = Math.round(Math.abs(iw * Math.cos(rad)) + Math.abs(ih * Math.sin(rad)));
  const innerH = Math.round(Math.abs(iw * Math.sin(rad)) + Math.abs(ih * Math.cos(rad)));

  // original px → inner canvas px: flip about image center, rotate by the
  // editor's net angle, then recenter into innerW×innerH.
  let innerMap = identityMatrix();
  innerMap = multiplyMatrices(innerMap, translateMatrix(innerW / 2, innerH / 2));
  innerMap = multiplyMatrices(innerMap, rotateMatrix(totalDeg));
  if (state.flipH || state.flipV) {
    innerMap = multiplyMatrices(innerMap, scaleMatrix(state.flipH ? -1 : 1, state.flipV ? -1 : 1));
  }
  innerMap = multiplyMatrices(innerMap, translateMatrix(-iw / 2, -ih / 2));

  const innerPts = cornersImg.map((p) => transformPoint(innerMap, p.x, p.y));
  const ixs = innerPts.map((p) => p.x);
  const iys = innerPts.map((p) => p.y);
  // Axis-aligned crop in the rotated bbox (inner = photo rotated about its centre
  // into innerW×innerH, photo centred).
  const ox = clamp(Math.round(Math.min(...ixs)), 0, innerW);
  const oy = clamp(Math.round(Math.min(...iys)), 0, innerH);
  const ox2 = clamp(Math.round(Math.max(...ixs)), 0, innerW);
  const oy2 = clamp(Math.round(Math.max(...iys)), 0, innerH);

  // Cloudimage measures a NESTED crop's tl_px/br_px from where the original image
  // frame sits inside the rotated bbox (its centred inset) — NOT from the bbox
  // corner. Shift the emitted crop by that inset so the CDN crops the region we
  // computed. (Verified empirically across angles, crop positions and both image
  // orientations; without it every tilted crop is offset by the inset.)
  const insetX = Math.round((innerW - iw) / 2);
  const insetY = Math.round((innerH - ih) / 2);
  const outerCrop = {
    x: ox - insetX,
    y: oy - insetY,
    width: Math.max(1, ox2 - ox),
    height: Math.max(1, oy2 - oy),
  };

  // The crop reaches outside the photo (→ background margins the URL can't
  // reproduce) when its pre-image leaves the original image bounds.
  const cxs = cornersImg.map((p) => p.x);
  const cys = cornersImg.map((p) => p.y);
  const clamped = Math.min(...cxs) < -0.5 || Math.min(...cys) < -0.5
    || Math.max(...cxs) > iw + 0.5 || Math.max(...cys) > ih + 0.5;

  return {
    cropPx: outerCrop,
    rotateCCW,
    flipH: state.flipH,
    flipV: state.flipV,
    outW,
    outH,
    tilted: true,
    clamped,
    nested: {
      innerRotateCCW: rotateCCW,
      flipH: state.flipH,
      flipV: state.flipV,
      innerW,
      innerH,
      outerCrop,
    },
  };
}

function applyRoundedRectMask(canvas: HTMLCanvasElement, borderRadius: number): void {
  const ctx = get2DContext(canvas);
  const w = canvas.width;
  const h = canvas.height;
  const r = Math.min(borderRadius, w / 2, h / 2);

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arcTo(w, 0, w, r, r);
  ctx.lineTo(w, h - r);
  ctx.arcTo(w, h, w - r, h, r);
  ctx.lineTo(r, h);
  ctx.arcTo(0, h, 0, h - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function applyCircleMask(canvas: HTMLCanvasElement): void {
  const ctx = get2DContext(canvas);
  const w = canvas.width;
  const h = canvas.height;

  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

/** Export canvas as Blob. */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let handled = false;
    try {
      canvas.toBlob(
        (blob) => {
          if (handled) return;
          handled = true;
          if (blob) {
            resolve(blob);
          } else {
            // `toBlob` hands back null when the encoder fails or the canvas
            // is empty; surface a descriptive error to the caller.
            reject(new Error('Failed to create blob (canvas may be empty or tainted)'));
          }
        },
        type,
        quality,
      );
    } catch (err) {
      // `toBlob` synchronously throws SecurityError on tainted canvases in
      // some browsers. Normalize the rejection path so every failure mode
      // ends up in the same `.catch(...)`.
      if (!handled) {
        handled = true;
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  });
}
