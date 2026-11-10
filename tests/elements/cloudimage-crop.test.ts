import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
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

  it('forwards showDoneButton to the toolbar (Done shown by default, hidden when false)', async () => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    document.body.appendChild(el);
    await el.updateComplete;
    const toolbar = () =>
      el.shadowRoot!.querySelector('cloudimage-crop-toolbar') as CloudimageCropToolbarElement;
    await toolbar().updateComplete;
    expect(toolbar().shadowRoot!.querySelector('button[aria-label="Done"]')).not.toBeNull();

    el.showDoneButton = false;
    await el.updateComplete;
    await toolbar().updateComplete;
    expect(toolbar().showDoneButton).toBe(false);
    expect(toolbar().shadowRoot!.querySelector('button[aria-label="Done"]')).toBeNull();
  });

  it('hides Done when showDoneButton is false before the first render', async () => {
    // A boolean-attribute binding would leave the toolbar on its `true` default here: `false`
    // on first render never creates the attribute, so no attributeChanged ever reaches it.
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    el.showDoneButton = false;
    document.body.appendChild(el);
    await el.updateComplete;
    const toolbar = el.shadowRoot!.querySelector('cloudimage-crop-toolbar') as CloudimageCropToolbarElement;
    await toolbar.updateComplete;
    expect(toolbar.showDoneButton).toBe(false);
    expect(toolbar.shadowRoot!.querySelector('button[aria-label="Done"]')).toBeNull();
  });

  it.each([
    'showRotateButton',
    'showFlipButton',
    'showRotateSlider',
    'showShapeSelector',
  ] as const)('forwards %s = false to the toolbar when set before the first render', async (prop) => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    el[prop] = false;
    document.body.appendChild(el);
    await el.updateComplete;
    const toolbar = el.shadowRoot!.querySelector('cloudimage-crop-toolbar') as CloudimageCropToolbarElement;
    await toolbar.updateComplete;
    expect(toolbar[prop]).toBe(false);
  });

  describe('toolbar tooltips', () => {
    const mountWith = async (setup: (e: CloudimageCropElement) => void) => {
      el = document.createElement('cloudimage-crop') as CloudimageCropElement;
      el.showCancelButton = true;
      setup(el);
      document.body.appendChild(el);
      await el.updateComplete;
      const toolbar = el.shadowRoot!.querySelector('cloudimage-crop-toolbar') as CloudimageCropToolbarElement;
      await toolbar.updateComplete;
      return (label: string) => toolbar.shadowRoot!.querySelector(`button[aria-label="${label}"]`) as HTMLElement;
    };

    it('keeps the browser title tooltip by default', async () => {
      const button = await mountWith(() => {});
      for (const label of ['Reset all changes', 'Rotate left 90°', 'Flip horizontal', 'Cancel', 'Done']) {
        expect(button(label).getAttribute('title')).toBe(label);
        expect(button(label).hasAttribute('data-tooltip')).toBe(false);
      }
    });

    it('draws its own tooltip instead of the title when styled', async () => {
      const button = await mountWith((e) => { e.tooltips = 'styled'; });
      for (const label of ['Reset all changes', 'Rotate left 90°', 'Flip horizontal', 'Cancel', 'Done']) {
        expect(button(label).hasAttribute('title')).toBe(false);
        expect(button(label).getAttribute('data-tooltip')).toBe(label);
      }
      expect(button('Cancel').getAttribute('data-tooltip-align')).toBe('start');
      expect(button('Done').getAttribute('data-tooltip-align')).toBe('end');
    });

    it('shows translated tooltip text but keeps the English aria-label', async () => {
      const button = await mountWith((e) => {
        e.tooltips = 'styled';
        e.tooltipLabels = { reset: 'Réinitialiser', done: 'Enregistrer' };
      });
      expect(button('Reset all changes').getAttribute('data-tooltip')).toBe('Réinitialiser');
      expect(button('Done').getAttribute('data-tooltip')).toBe('Enregistrer');
      expect(button('Flip horizontal').getAttribute('data-tooltip')).toBe('Flip horizontal');
    });

    it('translates the native title too', async () => {
      const button = await mountWith((e) => { e.tooltipLabels = { cancel: 'Annuler' }; });
      expect(button('Cancel').getAttribute('title')).toBe('Annuler');
    });
  });

  it('turns the toolbar Cancel off again after it was on', async () => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    el.showCancelButton = true;
    document.body.appendChild(el);
    await el.updateComplete;
    const toolbar = el.shadowRoot!.querySelector('cloudimage-crop-toolbar') as CloudimageCropToolbarElement;
    await toolbar.updateComplete;
    expect(toolbar.showCancelButton).toBe(true);

    el.showCancelButton = false;
    await el.updateComplete;
    expect(toolbar.showCancelButton).toBe(false);
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
    expect(typeof el.restoreState).toBe('function');
  });

  it('throws a helpful error when restoreState runs before connect', () => {
    el = document.createElement('cloudimage-crop') as CloudimageCropElement;
    expect(() => el.restoreState({
      state: { quarterTurns: 0, rotation: 0, flipH: false, flipV: false, scale: 1, panX: 0, panY: 0, cropRect: { x: 0, y: 0, width: 1, height: 1 } },
      imageWidth: 100,
      imageHeight: 100,
      containerWidth: 100,
      containerHeight: 100,
      variant: 'classic',
    })).toThrow(/not connected/);
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

/**
 * Export defaults with a loaded image. jsdom has no image decoding and no 2D
 * canvas, so both are stubbed; the canvas encoder hands back a blob of exactly
 * the MIME type it was asked for, like a browser that supports it.
 */
describe('<cloudimage-crop> export defaults', () => {
  class FakeImage {
    naturalWidth = 1600;
    naturalHeight = 900;
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) { queueMicrotask(() => this.onload?.()); }
  }
  const noopCtx = new Proxy({}, { get: () => () => {} });
  let origImage: typeof Image;
  let origGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let origToBlob: typeof HTMLCanvasElement.prototype.toBlob;

  beforeAll(async () => {
    await customElements.whenDefined('cloudimage-crop');
    origImage = globalThis.Image;
    (globalThis as unknown as { Image: unknown }).Image = FakeImage;
    origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => noopCtx) as never;
    origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, type?: string) {
      cb(new Blob(['x'], { type: type ?? '' }));
    };
  });
  afterAll(() => {
    (globalThis as unknown as { Image: unknown }).Image = origImage;
    HTMLCanvasElement.prototype.getContext = origGetContext;
    HTMLCanvasElement.prototype.toBlob = origToBlob;
  });

  let el: CloudimageCropElement;
  afterEach(() => {
    el?.remove();
  });

  async function mount(
    props: Partial<CloudimageCropElement>,
    attrs: Record<string, string> = {},
  ): Promise<CloudimageCropElement> {
    const node = document.createElement('cloudimage-crop') as CloudimageCropElement;
    Object.assign(node, { src: 'https://demo.cloudimg.io/photo.jpg', ...props });
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    const loaded = new Promise((r) => node.addEventListener('cloudimage-crop-image-load', r, { once: true }));
    document.body.appendChild(node);
    await node.updateComplete;
    await loaded;
    return node;
  }

  async function savedUrl(node: CloudimageCropElement): Promise<URLSearchParams> {
    const saved = new Promise<CustomEvent>((r) =>
      node.addEventListener('cloudimage-crop-save', (e) => r(e as CustomEvent), { once: true }),
    );
    await node.save();
    const url: string = (await saved).detail.url;
    expect(url).toMatch(/^https:\/\/demo\.cloudimg\.io\/photo\.jpg\?/);
    return new URLSearchParams(url.slice(url.indexOf('?') + 1));
  }

  it('cloudimage mode without outputType saves a URL that forces no format and no quality', async () => {
    el = await mount({ outputMode: 'cloudimage' });
    const qp = await savedUrl(el);
    expect(qp.get('tl_px')).toBeTruthy();
    expect(qp.has('force_format')).toBe(false);
    expect(qp.has('q')).toBe(false);
  });

  it('cloudimage mode with an explicit outputType still forces that format and its quality', async () => {
    el = await mount({ outputMode: 'cloudimage', outputQuality: 0.8 }, { 'output-type': 'image/webp' });
    const qp = await savedUrl(el);
    expect(qp.get('force_format')).toBe('webp');
    expect(qp.get('q')).toBe('80');
  });

  it('toBlob() without outputType still exports a PNG', async () => {
    el = await mount({});
    const blob = await el.toBlob();
    expect(blob.type).toBe('image/png');
  });

});
