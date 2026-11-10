import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createRenderer } from '../../src/canvas/renderer';

const noopCtx = new Proxy({}, { get: () => () => {} });

let origGetContext: typeof HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = (() => noopCtx) as never;
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterAll(() => {
  HTMLCanvasElement.prototype.getContext = origGetContext;
  vi.unstubAllGlobals();
});

describe('renderer.resize()', () => {
  it('sizes the canvas to the layout box, ignoring an ancestor transform', () => {
    // A dialog's zoom-in animation scales the editor to 95% while it opens; the canvas must
    // still take the untransformed layout size, or it stays 5% short once the animation ends.
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 720 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 408 });
    container.getBoundingClientRect = () => ({ x: 0, y: 0, width: 684, height: 387.6 }) as DOMRect;

    const canvas = document.createElement('canvas');
    const renderer = createRenderer(canvas, new Image(), () => 'rect', 20, true, container);
    renderer.resize();

    expect(canvas.style.width).toBe('720px');
    expect(canvas.style.height).toBe('408px');
    renderer.destroy();
  });
});
