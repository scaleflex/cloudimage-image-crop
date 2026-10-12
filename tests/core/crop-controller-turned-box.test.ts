import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createCropController, type CropController } from '../../src/core/crop-controller';
import { mergeConfig } from '../../src/core/config';
import { FORWARDED_HANDLE } from '../../src/interactions/pointer-tracker';

/**
 * Classic variant: a free-shape quarter turn flips `turnedBox`, and the host
 * must re-size its box to the turned photo — from EVERY path, including the
 * keyboard `R` shortcut (which calls the controller directly, bypassing the
 * element's own rotateLeft()). `onBoxAspectChange` is that signal.
 */

const IMG_W = 4000;
const IMG_H = 2000;

// jsdom has no image decoding and no 2D canvas — stub just enough to boot.
class FakeImage {
  naturalWidth = IMG_W;
  naturalHeight = IMG_H;
  crossOrigin = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) { queueMicrotask(() => this.onload?.()); }
}
const noopCtx = new Proxy({}, { get: () => () => {} });

let origImage: typeof Image;
let origGetContext: typeof HTMLCanvasElement.prototype.getContext;
beforeAll(() => {
  origImage = globalThis.Image;
  (globalThis as unknown as { Image: unknown }).Image = FakeImage;
  origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = (() => noopCtx) as never;
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterAll(() => {
  (globalThis as unknown as { Image: unknown }).Image = origImage;
  HTMLCanvasElement.prototype.getContext = origGetContext;
  vi.unstubAllGlobals();
});

let ctrl: CropController | null = null;
afterEach(() => {
  ctrl?.destroy();
  ctrl = null;
  document.body.innerHTML = '';
});

async function boot(cropShape: string, { wireBox = true } = {}) {
  const host = document.createElement('div');
  host.tabIndex = 0;
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);
  document.body.appendChild(host);
  const onBoxAspectChange = vi.fn();
  ctrl = createCropController({
    canvas,
    host,
    layoutContainer: host,
    config: mergeConfig({ variant: 'classic', cropShape } as never),
    callbacks: wireBox ? { onBoxAspectChange } : {},
  });
  await ctrl.loadImage('fake.jpg');
  host.focus();
  return { host, ctrl, onBoxAspectChange };
}

function pressR(host: HTMLElement) {
  host.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true, composed: true }));
}

describe('crop controller — onBoxAspectChange (classic turnedBox)', () => {
  it('keyboard R with the free shape signals the box to turn (and back on the next turn)', async () => {
    const { host, ctrl, onBoxAspectChange } = await boot('free');
    expect(onBoxAspectChange).not.toHaveBeenCalled();

    pressR(host);
    expect(ctrl.getTransformState().turnedBox).toBe(true);
    expect(onBoxAspectChange).toHaveBeenLastCalledWith(true);

    pressR(host);
    expect(ctrl.getTransformState().turnedBox).toBe(false);
    expect(onBoxAspectChange).toHaveBeenLastCalledWith(false);
    expect(onBoxAspectChange).toHaveBeenCalledTimes(2);
  });

  it('headless without onBoxAspectChange: a free-shape turn keeps box and frame (no stretched photo)', async () => {
    const { host, ctrl } = await boot('free', { wireBox: false });
    const before = ctrl.getTransformState().cropRect;
    pressR(host);
    const s = ctrl.getTransformState();
    expect(s.quarterTurns % 180).not.toBe(0);
    expect(s.turnedBox).toBe(false); // box assumed fixed → turned photo is cover-fit
    expect(s.cropRect).toEqual(before);
    ctrl.setCropShape('16:9');
    ctrl.setCropShape('free');
    expect(ctrl.getTransformState().turnedBox).toBe(false);
  });

  it('reset() undoes a user shape pick, but returns to a shape the integrator configured later', async () => {
    const { ctrl } = await boot('16:9');
    // Observe the shape reset() lands on through the frame's aspect in px.
    const ratio = () => {
      const r = ctrl.getCropRect();
      return Math.round((r.width / r.height) * 100) / 100;
    };
    ctrl.setCropShape('1:1'); // user pick (toolbar / headless action)
    expect(ratio()).toBe(1);
    ctrl.reset();
    expect(ratio()).toBeCloseTo(16 / 9, 1);

    ctrl.update({ cropShape: '4:3' }); // integrator changed the configured shape
    ctrl.setCropShape('1:1');
    ctrl.reset();
    expect(ratio()).toBeCloseTo(4 / 3, 1);
  });

  it('tilt auto-cover zoom is reported through onScaleSync (zoom slider stays in step)', async () => {
    const host = document.createElement('div');
    const canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: 400 });
    const onScaleSync = vi.fn();
    ctrl = createCropController({
      canvas, host, layoutContainer: host,
      config: mergeConfig({ variant: 'classic', cropShape: 'free' } as never),
      callbacks: { onScaleSync },
    });
    await ctrl.loadImage('fake.jpg');
    ctrl.setCropRect({ x: 0, y: 0, width: 1, height: 1 }); // full frame
    onScaleSync.mockClear();
    ctrl.setRotation(10); // a full frame can't stay covered at scale 1 → auto-zoom
    expect(ctrl.getTransformState().scale).toBeGreaterThan(1);
    expect(onScaleSync).toHaveBeenLastCalledWith(ctrl.getTransformState().scale);
  });

  it('toCloudimageURL() warns once for an uncalibrated tilted crop, never for an untilted one', async () => {
    const host = document.createElement('div');
    const canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
    ctrl = createCropController({
      canvas, host, layoutContainer: host,
      config: mergeConfig({ variant: 'classic', cropShape: 'free', src: 'https://doc.cloudimg.io/sample.jpg' } as never),
    });
    await ctrl.loadImage('fake.jpg');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      ctrl.toCloudimageURL();
      expect(warn).not.toHaveBeenCalled();
      ctrl.setRotation(8);
      ctrl.toCloudimageURL();
      ctrl.toCloudimageURL();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('calibrateCloudimage');
    } finally {
      warn.mockRestore();
    }
  });

  it('a press forwarded from the NW corner dot resizes, even on its overhang (move-handle zone)', async () => {
    const { host, ctrl } = await boot('free');
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: 400 });
    ctrl.setCropRect({ x: 0, y: 0, width: 1, height: 1 }); // full-photo frame
    const canvas = host.querySelector('canvas')!;
    const ptr = (type: string, x: number, y: number, handle?: string): Event => {
      const ev = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0 });
      Object.assign(ev, { pointerId: 7, pointerType: 'mouse', pressure: 0.5 });
      if (handle) (ev as unknown as Record<string, unknown>)[FORWARDED_HANDLE] = handle;
      return ev;
    };
    // (-3.6, -3.6): outside the canvas, inside the move-handle's hit zone.
    canvas.dispatchEvent(ptr('pointerdown', -3.6, -3.6, 'nw'));
    canvas.dispatchEvent(ptr('pointermove', 60, 40));
    canvas.dispatchEvent(ptr('pointerup', 60, 40));
    const r = ctrl.getTransformState().cropRect;
    expect(r.x).toBeGreaterThan(0); // NW edge pulled inward → resized,
    expect(r.x + r.width).toBeCloseTo(1, 5); // SE corner stayed → not moved
  });

  describe('tilt auto-cover zoom is derived from the user view, not accumulated', () => {
    async function tilted() {
      const b = await boot('free');
      Object.defineProperty(b.host, 'clientWidth', { configurable: true, value: 800 });
      Object.defineProperty(b.host, 'clientHeight', { configurable: true, value: 400 });
      b.ctrl.setCropRect({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
      b.ctrl.setRotation(3);
      return b;
    }
    const view = (c: CropController) => {
      const s = c.getTransformState();
      return { scale: s.scale, panX: s.panX, panY: s.panY };
    };

    it('zooms in at the edge and gives the zoom (and pan) back when the frame moves away', async () => {
      const { ctrl } = await tilted();
      const centred = view(ctrl);
      expect(centred.scale).toBe(1);
      ctrl.setCropRect({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 }); // bottom-right corner
      expect(ctrl.getTransformState().scale).toBeGreaterThan(1);
      ctrl.setCropRect({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 }); // back to centre
      expect(view(ctrl)).toEqual(centred);
      ctrl.setCropRect({ x: 0, y: 0, width: 0.5, height: 0.5 }); // another edge excursion
      ctrl.setCropRect({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
      expect(view(ctrl)).toEqual(centred);
    });

    it('untilting releases the auto-zoom', async () => {
      const { ctrl } = await tilted();
      ctrl.setCropRect({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 });
      expect(ctrl.getTransformState().scale).toBeGreaterThan(1);
      ctrl.setRotation(0);
      expect(ctrl.getTransformState().scale).toBe(1);
    });

    it('a pan-drag at the edge hits a wall: no zoom jump, and the result is stable', async () => {
      const { host, ctrl } = await tilted();
      ctrl.setCropRect({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 }); // bottom-right → auto-zoom
      const auto = ctrl.getTransformState().scale;
      expect(auto).toBeGreaterThan(1);
      const canvas = host.querySelector('canvas')!;
      const ptr = (type: string, x: number, y: number): Event => {
        const ev = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0 });
        Object.assign(ev, { pointerId: 9, pointerType: 'mouse', pressure: 0.5 });
        return ev;
      };
      // Drag the photo (outside the frame) up-left — away from the frame.
      canvas.dispatchEvent(ptr('pointerdown', 160, 120));
      for (let i = 1; i <= 10; i++) canvas.dispatchEvent(ptr('pointermove', 160 - 2 * i, 120 - 2 * i));
      canvas.dispatchEvent(ptr('pointerup', 140, 100));
      const after = view(ctrl);
      expect(after.scale).toBeCloseTo(auto, 10); // wall, not +66% zoom
      for (let i = 0; i < 3; i++) {
        ctrl.setRotation(3); // unrelated re-syncs must not move anything (no drift)
        const again = view(ctrl);
        expect(again.scale).toBeCloseTo(after.scale, 9);
        expect(again.panX).toBeCloseTo(after.panX, 6);
        expect(again.panY).toBeCloseTo(after.panY, 6);
      }
      // The drag didn't take the user's zoom: frame back to centre → their 1.0.
      ctrl.setCropRect({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
      const back = view(ctrl);
      expect(back.scale).toBe(1);
      // …and their pan intent survives (the photo stays shifted by the drag).
      expect(Math.hypot(back.panX, back.panY)).toBeGreaterThan(1);
    });

    it('dragging the photo toward cover at an edge eases the auto-zoom off smoothly (no jump on release)', async () => {
      const { host, ctrl } = await tilted();
      ctrl.setCropRect({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 });
      const auto = ctrl.getTransformState().scale;
      const canvas = host.querySelector('canvas')!;
      const ptr = (type: string, x: number, y: number): Event => {
        const ev = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0 });
        Object.assign(ev, { pointerId: 11, pointerType: 'mouse', pressure: 0.5 });
        return ev;
      };
      canvas.dispatchEvent(ptr('pointerdown', 160, 120));
      let prev = auto;
      for (let i = 1; i <= 10; i++) {
        canvas.dispatchEvent(ptr('pointermove', 160 + 3 * i, 120 + 3 * i)); // toward the frame
        const s = ctrl.getTransformState().scale;
        expect(s).toBeLessThanOrEqual(prev + 1e-9);
        expect(prev - s).toBeLessThan(0.05); // gradual, no jump
        prev = s;
      }
      expect(prev).toBeLessThan(auto); // it did ease off
      const beforeUp = view(ctrl);
      canvas.dispatchEvent(ptr('pointerup', 190, 150));
      const up = view(ctrl);
      expect(up.scale).toBeCloseTo(beforeUp.scale, 9);
      expect(up.panX).toBeCloseTo(beforeUp.panX, 6);
    });

    it('wheel zoom-out at an off-centre cursor stops at the cover floor — no zoom-in, no drift', async () => {
      const { host, ctrl } = await tilted();
      ctrl.setCropRect({ x: 0, y: 0, width: 1, height: 1 }); // full frame
      ctrl.setRotation(5);
      const floor = ctrl.getTransformState().scale; // auto-cover = the floor
      const canvas = host.querySelector('canvas')!;
      // jsdom has no layout: the wheel anchors on the canvas rect's centre.
      canvas.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400, x: 0, y: 0, toJSON() {} }) as DOMRect;
      const wheel = (dy: number) =>
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: 680, clientY: 320, cancelable: true }));
      for (let i = 0; i < 6; i++) wheel(-60); // zoom in near a corner
      expect(ctrl.getTransformState().scale).toBeGreaterThan(floor * 1.3);
      // Keep scrolling out well past the floor: the zoom must only ever go DOWN
      // (no turn into a zoom-in) and settle on the floor, pan back near 0.
      let prev = ctrl.getTransformState().scale;
      for (let i = 0; i < 20; i++) {
        wheel(60);
        const s = ctrl.getTransformState().scale;
        expect(s).toBeLessThanOrEqual(prev + 1e-9);
        prev = s;
      }
      const end = view(ctrl);
      expect(end.scale).toBeCloseTo(floor, 3);
      expect(Math.abs(end.panX)).toBeLessThan(0.5);
      expect(Math.abs(end.panY)).toBeLessThan(0.5);
    });

    it("the user's own zoom is kept as the floor", async () => {
      const { ctrl } = await tilted();
      ctrl.setScale(1.5);
      ctrl.setCropRect({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 });
      ctrl.setCropRect({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
      expect(ctrl.getTransformState().scale).toBeCloseTo(1.5, 10);
    });
  });

  it('a picked ratio keeps the box through a turn — no signal', async () => {
    const { host, ctrl, onBoxAspectChange } = await boot('16:9');
    pressR(host);
    expect(ctrl.getTransformState().quarterTurns % 180).not.toBe(0);
    expect(ctrl.getTransformState().turnedBox).toBeFalsy();
    expect(onBoxAspectChange).not.toHaveBeenCalled();
  });

  it('restoring a legacy (3.0.0) tilted descriptor keeps its zoom — no tilt auto-cover', async () => {
    const { host, ctrl } = await boot('free');
    // jsdom has no layout: give the box a size so applyCover() actually runs.
    Object.defineProperty(host, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: 400 });
    const legacyState = {
      quarterTurns: 0, rotation: 13, flipH: false, flipV: false, scale: 1, panX: 0, panY: 0,
      cropRect: { x: 0, y: 0, width: 1, height: 1 }, rotationPivot: { x: 0.5, y: 0.5 },
    }; // no turnedBox — as 3.0.0 saved it
    ctrl.restoreState({ state: legacyState, imageWidth: IMG_W, imageHeight: IMG_H, containerWidth: 800, containerHeight: 400, variant: 'classic' });
    const s = ctrl.getTransformState();
    expect(s.turnedBox).toBeUndefined();
    expect(s.scale).toBe(1);

    // Same state from this version DOES get covered (full frame + tilt → zoom in).
    ctrl.restoreState({ state: { ...legacyState, turnedBox: false }, imageWidth: IMG_W, imageHeight: IMG_H, containerWidth: 800, containerHeight: 400, variant: 'classic' });
    expect(ctrl.getTransformState().scale).toBeGreaterThan(1);
  });

  it('first turn of a legacy odd-turn state upgrades it: box back upright, frame not moved', async () => {
    const { ctrl, onBoxAspectChange } = await boot('free');
    const cropRect = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    ctrl.restoreState({
      state: { quarterTurns: -90, rotation: 0, flipH: false, flipV: false, scale: 1, panX: 0, panY: 0, cropRect },
      imageWidth: IMG_W, imageHeight: IMG_H, containerWidth: 800, containerHeight: 400, variant: 'classic',
    });
    expect(ctrl.getTransformState().turnedBox).toBeUndefined();
    ctrl.rotateLeft(); // -180: even turn, box keeps the natural aspect
    const s = ctrl.getTransformState();
    expect(s.turnedBox).toBe(false);
    expect(s.cropRect).toEqual(cropRect);
    expect(onBoxAspectChange).not.toHaveBeenCalled();
  });

  it('ratio → turn → free re-aligns the box, signals it, and drops the stale tilt pivot', async () => {
    const { host, ctrl, onBoxAspectChange } = await boot('16:9');
    pressR(host);
    ctrl.setRotation(10); // captures a rotationPivot in the kept (unturned) box
    ctrl.setCropShape('free');
    const s = ctrl.getTransformState();
    expect(s.turnedBox).toBe(true);
    expect(s.rotationPivot).toBeUndefined();
    expect(onBoxAspectChange).toHaveBeenLastCalledWith(true);
  });
});
