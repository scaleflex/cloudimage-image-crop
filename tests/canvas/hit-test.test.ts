import { describe, it, expect } from 'vitest';
import { hitTest, getCursor } from '../../src/canvas/hit-test';

describe('hitTest', () => {
  const cropRect = { x: 100, y: 100, width: 200, height: 150 };

  it('should detect crop-area inside crop area', () => {
    const result = hitTest(200, 175, cropRect);
    expect(result.type).toBe('crop-area');
  });

  it('should detect outside outside crop area', () => {
    const result = hitTest(10, 10, cropRect);
    expect(result.type).toBe('outside');
  });

  it('should detect corner handles', () => {
    // NW corner
    const nw = hitTest(100, 100, cropRect);
    expect(nw.type).toBe('handle');
    expect(nw.position).toBe('nw');

    // SE corner
    const se = hitTest(300, 250, cropRect);
    expect(se.type).toBe('handle');
    expect(se.position).toBe('se');
  });
});

describe('getCursor', () => {
  it('should return move for crop-area', () => {
    expect(getCursor({ type: 'crop-area' }, false)).toBe('move');
  });

  it('should return move when dragging crop-area (classic: drags the crop frame)', () => {
    expect(getCursor({ type: 'crop-area' }, true)).toBe('move');
  });

  it('should return grab/grabbing for outside (pans the photo)', () => {
    expect(getCursor({ type: 'outside' }, false)).toBe('grab');
    expect(getCursor({ type: 'outside' }, true)).toBe('grabbing');
  });

  it('should return resize cursors for handles', () => {
    expect(getCursor({ type: 'handle', position: 'nw' }, false)).toBe('nwse-resize');
    expect(getCursor({ type: 'handle', position: 'se' }, false)).toBe('nwse-resize');
    expect(getCursor({ type: 'handle', position: 'ne' }, false)).toBe('nesw-resize');
    expect(getCursor({ type: 'handle', position: 'n' }, false)).toBe('ns-resize');
    expect(getCursor({ type: 'handle', position: 'e' }, false)).toBe('ew-resize');
  });

  it('should return default for none', () => {
    expect(getCursor({ type: 'none' }, false)).toBe('default');
  });
});
