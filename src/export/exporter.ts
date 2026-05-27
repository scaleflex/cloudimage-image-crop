import type { TransformState, TransformParams } from '../core/types';
import { degreesToRadians } from '../utils/math';
import { computeCoverDraw } from '../canvas/image-layer';

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
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;

  const fixed = variant === 'fixed' && containerWidth > 0 && containerHeight > 0;

  // Choose the display coordinate system (DW×DH) the transform chain is
  // replayed in, and the photo's draw size within it.
  //
  // Classic: the editor box has the photo's natural aspect, so display space
  // IS image-pixel space (DW=iw, DH=ih) and the photo fills it edge-to-edge.
  // cropRect is normalized to this display rect — we replay the chain and
  // slice cropRect out (handles quarterTurns/flip/tilt correctly).
  //
  // Fixed: the editor box has the FRAME aspect and the photo is drawn COVER.
  // The whole box is the crop (cropRect = {0,0,1,1}), so display space is the
  // frame box scaled up to roughly native photo resolution.
  let DW: number;
  let DH: number;
  let drawW: number;
  let drawH: number;

  if (fixed) {
    const coverCss = computeCoverDraw(containerWidth, containerHeight, iw, ih, state.quarterTurns);
    // Image px per CSS px — render the box at this density to keep the photo
    // near its native resolution.
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

  const renderScale = outW / cropW;

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
