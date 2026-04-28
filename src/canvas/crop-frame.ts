const CORNER_HANDLE_SIZE = 12;
const EDGE_HANDLE_W = 24;
const EDGE_HANDLE_H = 6;
const HIT_AREA_PAD = 22; // 44px / 2 for 44×44 hit area
/** Diagonal offset of the move-handle from the NW corner, in canvas px. */
const MOVE_HANDLE_OFFSET = 11;
/** Hit radius for the move-handle, in canvas px. */
const MOVE_HANDLE_HIT = 9;

export interface FrameTheme {
  frame: string;
  frameShadow: string;
  handleFill: string;
  handleStroke: string;
}

const DEFAULT_THEME: FrameTheme = {
  frame: '#ffffff',
  frameShadow: 'rgba(0, 0, 0, 0.3)',
  handleFill: '#ffffff',
  handleStroke: 'rgba(0, 0, 0, 0.25)',
};

export function drawCropFrame(
  ctx: CanvasRenderingContext2D,
  cropRect: { x: number; y: number; width: number; height: number },
  shapeType: 'rect' | 'circle' | 'rounded-rect' = 'rect',
  borderRadius: number = 20,
  theme: FrameTheme = DEFAULT_THEME,
): void {
  const isCircle = shapeType === 'circle';
  const isRoundedRect = shapeType === 'rounded-rect';
  const { x, y, width, height } = cropRect;

  ctx.save();

  // Draw inner shadow (1px contrast outline)
  ctx.strokeStyle = theme.frameShadow;
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

  // Draw primary frame border
  ctx.strokeStyle = theme.frame;
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
    ctx.strokeStyle = theme.frameShadow;
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

  // Draw corner handles (circles)
  ctx.fillStyle = theme.handleFill;
  ctx.strokeStyle = theme.handleStroke;
  ctx.lineWidth = 1;
  const hr = Math.min(CORNER_HANDLE_SIZE / 2, width / 6, height / 6);

  const corners = [
    { cx: x, cy: y },
    { cx: x + width, cy: y },
    { cx: x + width, cy: y + height },
    { cx: x, cy: y + height },
  ];

  for (const corner of corners) {
    ctx.beginPath();
    ctx.arc(corner.cx, corner.cy, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Move-handle: a separate circle offset diagonally outward from the NW
  // corner — dragging it slides the whole frame without resizing.
  const moveCx = x - MOVE_HANDLE_OFFSET;
  const moveCy = y - MOVE_HANDLE_OFFSET;
  ctx.beginPath();
  ctx.arc(moveCx, moveCy, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Inner dot to visually distinguish from the resize corners.
  ctx.fillStyle = theme.handleStroke;
  ctx.beginPath();
  ctx.arc(moveCx, moveCy, Math.max(2, hr * 0.35), 0, Math.PI * 2);
  ctx.fill();

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
    // Move-handle (NW diagonal) — checked first so it wins over the NW
    // corner's hit area where they overlap.
    {
      target: 'move-handle',
      rect: {
        x: x - MOVE_HANDLE_OFFSET - MOVE_HANDLE_HIT,
        y: y - MOVE_HANDLE_OFFSET - MOVE_HANDLE_HIT,
        w: MOVE_HANDLE_HIT * 2,
        h: MOVE_HANDLE_HIT * 2,
      },
    },
    // Corner handles (highest priority — checked first)
    { target: 'handle-nw', rect: { x: x - pad, y: y - pad, w: pad * 2, h: pad * 2 } },
    { target: 'handle-ne', rect: { x: x + width - pad, y: y - pad, w: pad * 2, h: pad * 2 } },
    { target: 'handle-se', rect: { x: x + width - pad, y: y + height - pad, w: pad * 2, h: pad * 2 } },
    { target: 'handle-sw', rect: { x: x - pad, y: y + height - pad, w: pad * 2, h: pad * 2 } },
    // Edge hit zones (no visual handle, but cursor + resize still work)
    { target: 'handle-n', rect: { x: x + pad, y: y - pad, w: width - pad * 2, h: pad * 2 } },
    { target: 'handle-s', rect: { x: x + pad, y: y + height - pad, w: width - pad * 2, h: pad * 2 } },
    { target: 'handle-e', rect: { x: x + width - pad, y: y + pad, w: pad * 2, h: height - pad * 2 } },
    { target: 'handle-w', rect: { x: x - pad, y: y + pad, w: pad * 2, h: height - pad * 2 } },
  ];
}
