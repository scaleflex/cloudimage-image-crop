export function drawBleedMargin(
  ctx: CanvasRenderingContext2D,
  cropRect: { x: number; y: number; width: number; height: number },
  bleedSize: number,
  color: string,
): void {
  // Skip if bleed would exceed half the crop dimension
  if (bleedSize * 2 >= cropRect.width || bleedSize * 2 >= cropRect.height) {
    return;
  }

  ctx.save();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);

  ctx.strokeRect(
    cropRect.x + bleedSize,
    cropRect.y + bleedSize,
    cropRect.width - bleedSize * 2,
    cropRect.height - bleedSize * 2,
  );

  ctx.setLineDash([]);
  ctx.restore();
}
