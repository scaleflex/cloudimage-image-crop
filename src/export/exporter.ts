import type { TransformState, TransformParams } from '../core/types';
import { degreesToRadians } from '../utils/math';

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
): HTMLCanvasElement {
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;

  // Calculate output dimensions
  let outW = Math.round(state.cropRect.width * iw);
  let outH = Math.round(state.cropRect.height * ih);

  // Swap dimensions for 90/270° rotations
  const is90 = Math.round(state.quarterTurns / 90) % 2 !== 0;
  if (is90) {
    [outW, outH] = [outH, outW];
  }

  // Apply max dimensions
  if (maxWidth > 0 && outW > maxWidth) {
    outH = Math.round(outH * (maxWidth / outW));
    outW = maxWidth;
  }
  if (maxHeight > 0 && outH > maxHeight) {
    outW = Math.round(outW * (maxHeight / outH));
    outH = maxHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;

  ctx.save();

  // Move origin to center
  ctx.translate(outW / 2, outH / 2);

  // Apply rotation
  const totalRotation = state.quarterTurns + state.rotation;
  if (totalRotation !== 0) {
    ctx.rotate(degreesToRadians(totalRotation));
  }

  // Apply flip
  if (state.flipH || state.flipV) {
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
  }

  // Draw the cropped portion of the image
  const sx = state.cropRect.x * iw;
  const sy = state.cropRect.y * ih;
  const sw = state.cropRect.width * iw;
  const sh = state.cropRect.height * ih;

  // After rotation, the draw dimensions may be swapped
  const drawW = is90 ? outH : outW;
  const drawH = is90 ? outW : outH;

  ctx.drawImage(image, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);

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
  const ctx = canvas.getContext('2d')!;
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
  const ctx = canvas.getContext('2d')!;
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
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      type,
      quality,
    );
  });
}
