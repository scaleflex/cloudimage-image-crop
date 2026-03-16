export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Spring interpolation — returns new current value moving toward target. */
export function spring(
  current: number,
  target: number,
  velocity: { v: number },
  stiffness: number,
  damping: number,
  dt: number,
): number {
  const displacement = current - target;
  const springForce = -stiffness * displacement;
  const dampingForce = -damping * velocity.v;
  const acceleration = springForce + dampingForce;

  velocity.v += acceleration * dt;
  const next = current + velocity.v * dt;

  // Snap when close enough
  if (Math.abs(next - target) < 0.001 && Math.abs(velocity.v) < 0.001) {
    velocity.v = 0;
    return target;
  }

  return next;
}

/** Check if a point is inside a rotated rectangle. */
export function pointInRotatedRect(
  px: number,
  py: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
): boolean {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const dx = px - cx;
  const dy = py - cy;
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  return Math.abs(localX) <= w / 2 && Math.abs(localY) <= h / 2;
}
