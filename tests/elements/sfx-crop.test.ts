import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import '../../src/define';
import { SfxCropElement } from '../../src/elements/sfx-crop';
import { SfxCropCanvasElement } from '../../src/elements/sfx-crop-canvas';
import { SfxCropToolbarElement } from '../../src/elements/sfx-crop-toolbar';

/**
 * Smoke tests that would have caught the P2 hotfixes (element upgrade order,
 * child `updateComplete` race). No image src is attached — the controller
 * initializes but never reaches getContext/renderer paths that jsdom can't
 * service.
 */
describe('<sfx-crop>', () => {
  beforeAll(async () => {
    await customElements.whenDefined('sfx-crop');
  });

  let el: SfxCropElement;
  afterEach(() => {
    el?.remove();
  });

  it('registers sfx-crop, sfx-crop-canvas, sfx-crop-toolbar', () => {
    expect(customElements.get('sfx-crop')).toBe(SfxCropElement);
    expect(customElements.get('sfx-crop-canvas')).toBe(SfxCropCanvasElement);
    expect(customElements.get('sfx-crop-toolbar')).toBe(SfxCropToolbarElement);
  });

  it('upgrades into SfxCropElement when connected', async () => {
    el = document.createElement('sfx-crop') as SfxCropElement;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el).toBeInstanceOf(SfxCropElement);
  });

  it('reflects `crop-shape` attribute to the `cropShape` property', async () => {
    el = document.createElement('sfx-crop') as SfxCropElement;
    el.setAttribute('crop-shape', '16:9');
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.cropShape).toBe('16:9');
  });

  it('parses the `show-grid` attribute through the tri-state converter', async () => {
    el = document.createElement('sfx-crop') as SfxCropElement;
    el.setAttribute('show-grid', 'true');
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.showGrid).toBe(true);

    el.setAttribute('show-grid', 'false');
    await el.updateComplete;
    expect(el.showGrid).toBe(false);

    el.setAttribute('show-grid', 'interaction');
    await el.updateComplete;
    expect(el.showGrid).toBe('interaction');
  });

  it('exposes imperative methods', () => {
    el = document.createElement('sfx-crop') as SfxCropElement;
    // No controller yet — we just check that the methods exist on the prototype.
    expect(typeof el.rotateLeft).toBe('function');
    expect(typeof el.flipHorizontal).toBe('function');
    expect(typeof el.setRotation).toBe('function');
    expect(typeof el.setScale).toBe('function');
    expect(typeof el.setCropShape).toBe('function');
    expect(typeof el.save).toBe('function');
    expect(typeof el.cancel).toBe('function');
    expect(typeof el.toBlob).toBe('function');
    expect(typeof el.toDataURL).toBe('function');
  });

  it('dispatches `sfx-crop-cancel` with bubbles + composed', async () => {
    el = document.createElement('sfx-crop') as SfxCropElement;
    document.body.appendChild(el);
    await el.updateComplete;

    const received: Event[] = [];
    document.addEventListener('sfx-crop-cancel', (e) => received.push(e), { once: true });
    el.cancel();
    expect(received).toHaveLength(1);
    expect(received[0].bubbles).toBe(true);
    expect((received[0] as CustomEvent).composed).toBe(true);
  });

  it('throws a helpful error when an imperative method runs before connect', () => {
    el = document.createElement('sfx-crop') as SfxCropElement;
    // Not appended — controller is null. `rotateLeft` should throw our
    // branded message, not a generic `Cannot read properties of null`.
    expect(() => el.rotateLeft()).toThrow(/not connected/);
  });

  it('cleans up on disconnect without throwing', async () => {
    el = document.createElement('sfx-crop') as SfxCropElement;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(() => el.remove()).not.toThrow();
  });
});
