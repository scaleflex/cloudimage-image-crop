import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import '../../src/define';
import { CloudimageCropElement } from '../../src/elements/cloudimage-crop';
import { CloudimageCropCanvasElement } from '../../src/elements/cloudimage-crop-canvas';
import { CloudimageCropToolbarElement } from '../../src/elements/cloudimage-crop-toolbar';

/**
 * Smoke tests that would have caught the P2 hotfixes (element upgrade order,
 * child `updateComplete` race). No image src is attached — the controller
 * initializes but never reaches getContext/renderer paths that jsdom can't
 * service.
 */
describe('<cloudimage-crop>', () => {
  beforeAll(async () => {
    await customElements.whenDefined('cloudimage-crop');
  });

  let el: CloudimageCropElement;
  afterEach(() => {
    el?.remove();
  });

  it('registers cloudimage-crop, cloudimage-crop-canvas, cloudimage-crop-toolbar', () => {
    expect(customElements.get('cloudimage-crop')).toBe(CloudimageCropElement);
    expect(customElements.get('cloudimage-crop-canvas')).toBe(CloudimageCropCanvasElement);
    expect(customElements.get('cloudimage-crop-toolbar')).toBe(CloudimageCropToolbarElement);
  });

  it('upgrades into CloudimageCropElement when connected', async () => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el).toBeInstanceOf(CloudimageCropElement);
  });

  it('reflects `crop-shape` attribute to the `cropShape` property', async () => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    el.setAttribute('crop-shape', '16:9');
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.cropShape).toBe('16:9');
  });

  it('parses the `show-grid` attribute through the tri-state converter', async () => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
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
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
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

  it('dispatches `cloudimage-crop-cancel` with bubbles + composed', async () => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    document.body.appendChild(el);
    await el.updateComplete;

    const received: Event[] = [];
    document.addEventListener('cloudimage-crop-cancel', (e) => received.push(e), { once: true });
    el.cancel();
    expect(received).toHaveLength(1);
    expect(received[0].bubbles).toBe(true);
    expect((received[0] as CustomEvent).composed).toBe(true);
  });

  it('throws a helpful error when an imperative method runs before connect', () => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    // Not appended — controller is null. `rotateLeft` should throw our
    // branded message, not a generic `Cannot read properties of null`.
    expect(() => el.rotateLeft()).toThrow(/not connected/);
  });

  it('cleans up on disconnect without throwing', async () => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(() => el.remove()).not.toThrow();
  });
});
