/** Draw rule-of-thirds grid inside the crop area. */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  cropRect: { x: number; y: number; width: number; height: number },
  opacity: number,
): void {
  const { x, y, width, height } = cropRect;

  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * opacity})`;
  ctx.lineWidth = 0.5;

  // Vertical lines (1/3 and 2/3)
  for (let i = 1; i <= 2; i++) {
    const lx = x + (width * i) / 3;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(lx, y + height);
    ctx.stroke();
  }

  // Horizontal lines (1/3 and 2/3)
  for (let i = 1; i <= 2; i++) {
    const ly = y + (height * i) / 3;
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + width, ly);
    ctx.stroke();
  }

  ctx.restore();
}
