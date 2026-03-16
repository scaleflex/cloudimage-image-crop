const CORNER_HANDLE_SIZE = 12;
const EDGE_HANDLE_W = 24;
const EDGE_HANDLE_H = 6;
const HIT_AREA_PAD = 22; // 44px / 2 for 44×44 hit area

export function drawCropFrame(
  ctx: CanvasRenderingContext2D,
  cropRect: { x: number; y: number; width: number; height: number },
  shapeType: 'rect' | 'circle' | 'rounded-rect' = 'rect',
  borderRadius: number = 20,
): void {
  const isCircle = shapeType === 'circle';
  const isRoundedRect = shapeType === 'rounded-rect';
  const { x, y, width, height } = cropRect;

  ctx.save();

  // Draw inner shadow (1px dark outline for contrast on bright images)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  if (isCircle) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2 - 1;
    const ry = height / 2 - 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isRoundedRect) {
    drawRoundedRect(ctx, x + 1, y + 1, width - 2, height - 2, Math.min(borderRadius, width / 2, height / 2));
    ctx.stroke();
  } else {
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
  }

  // Draw border (2px white)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  if (isCircle) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Dashed circular guideline inside crop area
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 1, ry - 1, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (isRoundedRect) {
    const r = Math.min(borderRadius, width / 2, height / 2);
    drawRoundedRect(ctx, x, y, width, height, r);
    ctx.stroke();
  } else {
    ctx.strokeRect(x, y, width, height);
  }

  // Draw corner handles (12×12px white squares with 2px border-radius)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;
  const hs = Math.min(CORNER_HANDLE_SIZE, width / 3, height / 3);

  const corners = [
    { cx: x, cy: y },             // NW
    { cx: x + width, cy: y },     // NE
    { cx: x + width, cy: y + height }, // SE
    { cx: x, cy: y + height },    // SW
  ];

  for (const corner of corners) {
    drawRoundedRect(ctx, corner.cx - hs / 2, corner.cy - hs / 2, hs, hs, 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw edge handles (24×6px or 6×24px white rectangles at midpoints)
  if (!isCircle && !isRoundedRect) {
    const ew = Math.min(EDGE_HANDLE_W, width / 3);
    const eh = EDGE_HANDLE_H;
    const evw = EDGE_HANDLE_H;
    const evh = Math.min(EDGE_HANDLE_W, height / 3);
    const midX = x + width / 2;
    const midY = y + height / 2;

    // Top edge
    drawRoundedRect(ctx, midX - ew / 2, y - eh / 2, ew, eh, 2);
    ctx.fill();
    ctx.stroke();

    // Bottom edge
    drawRoundedRect(ctx, midX - ew / 2, y + height - eh / 2, ew, eh, 2);
    ctx.fill();
    ctx.stroke();

    // Left edge
    drawRoundedRect(ctx, x - evw / 2, midY - evh / 2, evw, evh, 2);
    ctx.fill();
    ctx.stroke();

    // Right edge
    drawRoundedRect(ctx, x + width - evw / 2, midY - evh / 2, evw, evh, 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Get the hit areas for handles. Returns rectangles around each handle (44×44px minimum). */
export function getHandleRects(
  cropRect: { x: number; y: number; width: number; height: number },
): { target: string; rect: { x: number; y: number; w: number; h: number } }[] {
  const { x, y, width, height } = cropRect;
  const pad = HIT_AREA_PAD;

  return [
    { target: 'handle-nw', rect: { x: x - pad, y: y - pad, w: pad * 2, h: pad * 2 } },
    { target: 'handle-n', rect: { x: x + pad, y: y - pad, w: width - pad * 2, h: pad * 2 } },
    { target: 'handle-ne', rect: { x: x + width - pad, y: y - pad, w: pad * 2, h: pad * 2 } },
    { target: 'handle-e', rect: { x: x + width - pad, y: y + pad, w: pad * 2, h: height - pad * 2 } },
    { target: 'handle-se', rect: { x: x + width - pad, y: y + height - pad, w: pad * 2, h: pad * 2 } },
    { target: 'handle-s', rect: { x: x + pad, y: y + height - pad, w: width - pad * 2, h: pad * 2 } },
    { target: 'handle-sw', rect: { x: x - pad, y: y + height - pad, w: pad * 2, h: pad * 2 } },
    { target: 'handle-w', rect: { x: x - pad, y: y + pad, w: pad * 2, h: height - pad * 2 } },
  ];
}
