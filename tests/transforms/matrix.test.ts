import { describe, it, expect } from 'vitest';
import {
  identityMatrix,
  multiplyMatrices,
  translateMatrix,
  scaleMatrix,
  rotateMatrix,
  transformPoint,
  invertMatrix,
  buildTransformMatrix,
  imageToCanvas,
  canvasToImage,
} from '../../src/transforms/matrix';

describe('identityMatrix', () => {
  it('should return identity', () => {
    expect(identityMatrix()).toEqual([1, 0, 0, 1, 0, 0]);
  });
});

describe('multiplyMatrices', () => {
  it('should return identity when multiplying with identity', () => {
    const id = identityMatrix();
    const t = translateMatrix(10, 20);
    expect(multiplyMatrices(id, t)).toEqual(t);
  });
});

describe('transformPoint', () => {
  it('should transform point with identity', () => {
    const m = identityMatrix();
    const p = transformPoint(m, 5, 10);
    expect(p.x).toBe(5);
    expect(p.y).toBe(10);
  });

  it('should transform point with translation', () => {
    const m = translateMatrix(10, 20);
    const p = transformPoint(m, 5, 5);
    expect(p.x).toBe(15);
    expect(p.y).toBe(25);
  });

  it('should transform point with scale', () => {
    const m = scaleMatrix(2, 3);
    const p = transformPoint(m, 5, 10);
    expect(p.x).toBe(10);
    expect(p.y).toBe(30);
  });
});

describe('invertMatrix', () => {
  it('should invert identity to identity', () => {
    const inv = invertMatrix(identityMatrix());
    inv.forEach((v, i) => {
      expect(v).toBeCloseTo([1, 0, 0, 1, 0, 0][i]);
    });
  });

  it('should invert translation', () => {
    const m = translateMatrix(10, 20);
    const inv = invertMatrix(m);
    const p = transformPoint(multiplyMatrices(m, inv), 5, 5);
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(5);
  });
});

describe('rotateMatrix', () => {
  it('should rotate 90 degrees', () => {
    const m = rotateMatrix(90);
    const p = transformPoint(m, 1, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
});

describe('buildTransformMatrix', () => {
  it('should return a DOMMatrix', () => {
    const state = {
      quarterTurns: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      scale: 1,
      panX: 0,
      panY: 0,
      cropRect: { x: 0, y: 0, width: 1, height: 1 },
    };
    const matrix = buildTransformMatrix(
      state,
      { width: 800, height: 600 },
      { width: 400, height: 300 },
    );
    expect(matrix).toBeInstanceOf(DOMMatrix);
  });

  it('should center the origin at canvas midpoint', () => {
    const state = {
      quarterTurns: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      scale: 1,
      panX: 0,
      panY: 0,
      cropRect: { x: 0, y: 0, width: 1, height: 1 },
    };
    const matrix = buildTransformMatrix(
      state,
      { width: 800, height: 600 },
      { width: 400, height: 300 },
    );
    // Origin (0,0) should map to canvas center
    const origin = matrix.transformPoint({ x: 0, y: 0 });
    expect(origin.x).toBeCloseTo(400);
    expect(origin.y).toBeCloseTo(300);
  });

  it('should apply scale', () => {
    const state = {
      quarterTurns: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      scale: 2,
      panX: 0,
      panY: 0,
      cropRect: { x: 0, y: 0, width: 1, height: 1 },
    };
    const matrix = buildTransformMatrix(
      state,
      { width: 800, height: 600 },
      { width: 400, height: 300 },
    );
    // Point (10, 0) should be 20px from center
    const p = matrix.transformPoint({ x: 10, y: 0 });
    expect(p.x).toBeCloseTo(420); // 400 + 10*2
    expect(p.y).toBeCloseTo(300);
  });
});

describe('imageToCanvas / canvasToImage', () => {
  it('should roundtrip a point', () => {
    const state = {
      quarterTurns: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      scale: 1.5,
      panX: 10,
      panY: -5,
      cropRect: { x: 0, y: 0, width: 1, height: 1 },
    };
    const matrix = buildTransformMatrix(
      state,
      { width: 800, height: 600 },
      { width: 400, height: 300 },
    );
    const original = { x: 50, y: 75 };
    const canvas = imageToCanvas(original, matrix);
    const back = canvasToImage(canvas, matrix);
    expect(back.x).toBeCloseTo(original.x);
    expect(back.y).toBeCloseTo(original.y);
  });

  it('should convert image origin to canvas center', () => {
    const state = {
      quarterTurns: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      scale: 1,
      panX: 0,
      panY: 0,
      cropRect: { x: 0, y: 0, width: 1, height: 1 },
    };
    const matrix = buildTransformMatrix(
      state,
      { width: 800, height: 600 },
      { width: 400, height: 300 },
    );
    const result = imageToCanvas({ x: 0, y: 0 }, matrix);
    expect(result.x).toBeCloseTo(400);
    expect(result.y).toBeCloseTo(300);
  });
});
