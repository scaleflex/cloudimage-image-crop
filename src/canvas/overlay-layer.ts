let offscreen: HTMLCanvasElement | null = null;

function getOffscreen(w: number, h: number): CanvasRenderingContext2D {
  if (!offscreen) {
    offscreen = document.createElement('canvas');
  }
  if (offscreen.width !== w || offscreen.height !== h) {
    offscreen.width = w;
    offscreen.height = h;
  }
  const ctx = offscreen.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

export function drawOverlayLayer(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  cropRect: { x: number; y: number; width: number; height: number },
  shapeType: 'rect' | 'circle' | 'rounded-rect' = 'rect',
  borderRadius: number = 20,
  overlayColor: string = 'rgba(0, 0, 0, 0.55)',
): void {
  // Draw overlay on offscreen canvas so destination-out doesn't erase the image
  const off = getOffscreen(canvasWidth, canvasHeight);

  off.fillStyle = overlayColor;
  off.fillRect(0, 0, canvasWidth, canvasHeight);

  // Cut out crop area
  off.globalCompositeOperation = 'destination-out';
  off.fillStyle = 'rgba(0, 0, 0, 1)';

  if (shapeType === 'circle') {
    const cx = cropRect.x + cropRect.width / 2;
    const cy = cropRect.y + cropRect.height / 2;
    const rx = cropRect.width / 2;
    const ry = cropRect.height / 2;
    off.beginPath();
    off.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    off.fill();
  } else if (shapeType === 'rounded-rect') {
    const { x, y, width, height } = cropRect;
    const r = Math.min(borderRadius, width / 2, height / 2);
    off.beginPath();
    off.moveTo(x + r, y);
    off.lineTo(x + width - r, y);
    off.arcTo(x + width, y, x + width, y + r, r);
    off.lineTo(x + width, y + height - r);
    off.arcTo(x + width, y + height, x + width - r, y + height, r);
    off.lineTo(x + r, y + height);
    off.arcTo(x, y + height, x, y + height - r, r);
    off.lineTo(x, y + r);
    off.arcTo(x, y, x + r, y, r);
    off.closePath();
    off.fill();
  } else {
    off.fillRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
  }

  off.globalCompositeOperation = 'source-over';

  // Composite the overlay onto the main canvas
  ctx.drawImage(offscreen!, 0, 0);
}
