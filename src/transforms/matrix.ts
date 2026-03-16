import { degreesToRadians } from '../utils/math';
import type { TransformState, Size, Point } from '../core/types';

/** 2D affine transform matrix [a, b, c, d, e, f] (same layout as canvas). */
export type Matrix2D = [number, number, number, number, number, number];

export function identityMatrix(): Matrix2D {
  return [1, 0, 0, 1, 0, 0];
}

export function multiplyMatrices(a: Matrix2D, b: Matrix2D): Matrix2D {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export function translateMatrix(tx: number, ty: number): Matrix2D {
  return [1, 0, 0, 1, tx, ty];
}

export function scaleMatrix(sx: number, sy: number): Matrix2D {
  return [sx, 0, 0, sy, 0, 0];
}

export function rotateMatrix(degrees: number): Matrix2D {
  const rad = degreesToRadians(degrees);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos, sin, -sin, cos, 0, 0];
}

/** @internal Build matrix as 6-element tuple. */
export function buildMatrix2D(
  canvasCx: number,
  canvasCy: number,
  rotation90: number,
  rotationFine: number,
  flipH: number,
  scale: number,
  panX: number,
  panY: number,
): Matrix2D {
  let m = identityMatrix();

  // 1. Translate to canvas center
  m = multiplyMatrices(m, translateMatrix(canvasCx, canvasCy));

  // 2. Apply scale (zoom)
  if (scale !== 1) {
    m = multiplyMatrices(m, scaleMatrix(scale, scale));
  }

  // 3. Apply pan offset
  if (panX !== 0 || panY !== 0) {
    m = multiplyMatrices(m, translateMatrix(panX, panY));
  }

  // 4. Apply rotation (90° steps + fine)
  const totalRotation = rotation90 + rotationFine;
  if (totalRotation !== 0) {
    m = multiplyMatrices(m, rotateMatrix(totalRotation));
  }

  // 5. Apply flip
  if (flipH < 0) {
    m = multiplyMatrices(m, scaleMatrix(-1, 1));
  }

  return m;
}

/** Apply matrix to a point. */
export function transformPoint(m: Matrix2D, x: number, y: number): { x: number; y: number } {
  return {
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5],
  };
}

/** Invert a 2D affine matrix. */
export function invertMatrix(m: Matrix2D): Matrix2D {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-10) return identityMatrix();

  const invDet = 1 / det;
  return [
    m[3] * invDet,
    -m[1] * invDet,
    -m[2] * invDet,
    m[0] * invDet,
    (m[2] * m[5] - m[3] * m[4]) * invDet,
    (m[1] * m[4] - m[0] * m[5]) * invDet,
  ];
}

/** Build the full image transform matrix. Spec section 8.2. */
export function buildTransformMatrix(
  state: TransformState,
  canvasSize: Size,
  imageSize: Size,
): DOMMatrix {
  const canvasCx = canvasSize.width / 2;
  const canvasCy = canvasSize.height / 2;
  const m = buildMatrix2D(
    canvasCx,
    canvasCy,
    state.quarterTurns,
    state.rotation,
    state.flipH ? -1 : 1,
    state.scale,
    state.panX,
    state.panY,
  );
  return new DOMMatrix([m[0], m[1], m[2], m[3], m[4], m[5]]);
}

/** Convert a point from image space to canvas space. Spec section 8.2. */
export function imageToCanvas(point: Point, matrix: DOMMatrix): Point {
  const result = matrix.transformPoint({ x: point.x, y: point.y });
  return { x: result.x, y: result.y };
}

/** Convert a point from canvas space to image space. Spec section 8.2. */
export function canvasToImage(point: Point, matrix: DOMMatrix): Point {
  const inv = matrix.inverse();
  const result = inv.transformPoint({ x: point.x, y: point.y });
  return { x: result.x, y: result.y };
}
