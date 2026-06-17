import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import '../../src/define';
import { CloudimageCropToolbarElement, type CloudimageCropToolbarCommand } from '../../src/elements/cloudimage-crop-toolbar';

/**
 * Covers the unified `cloudimage-crop-toolbar-command` event contract: every click
 * path (rotate-left button, flip-h button, rotate slider, shape dropdown)
 * collapses to a single CustomEvent the host routes through one handler.
 */
describe('<cloudimage-crop-toolbar>', () => {
  beforeAll(async () => {
    await customElements.whenDefined('cloudimage-crop-toolbar');
  });

  let el: CloudimageCropToolbarElement;
  afterEach(() => {
    el?.remove();
  });

  async function mount(): Promise<CloudimageCropToolbarElement> {
    el = document.createElement('cloudimage-crop-toolbar') as CloudimageCropToolbarElement;
    document.body.appendChild(el);
    await el.updateComplete;
    // Inner <cloudimage-crop-rotate>/<cloudimage-crop-shapes> need their first render too.
    const rotate = el.shadowRoot!.querySelector('cloudimage-crop-rotate');
    const shapes = el.shadowRoot!.querySelector('cloudimage-crop-shapes');
    await (rotate as { updateComplete?: Promise<unknown> })?.updateComplete;
    await (shapes as { updateComplete?: Promise<unknown> })?.updateComplete;
    return el;
  }

  function captureCommand(target: EventTarget): Promise<CloudimageCropToolbarCommand> {
    return new Promise((resolve) => {
      target.addEventListener('cloudimage-crop-toolbar-command', (e) => {
        resolve((e as CustomEvent<CloudimageCropToolbarCommand>).detail);
      }, { once: true });
    });
  }

  it('emits rotate-left on the rotate button click', async () => {
    await mount();
    const waitForEvent = captureCommand(document);
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      'button[aria-label="Rotate left 90°"]',
    )!;
    btn.click();
    await expect(waitForEvent).resolves.toEqual({ type: 'rotate-left' });
  });

  it('emits flip-h on the flip button click', async () => {
    await mount();
    const waitForEvent = captureCommand(document);
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>(
      'button[aria-label="Flip horizontal"]',
    )!;
    btn.click();
    await expect(waitForEvent).resolves.toEqual({ type: 'flip-h' });
  });

  it('forwards rotate-slider changes as rotation commands', async () => {
    await mount();
    const waitForEvent = captureCommand(document);
    const rotate = el.shadowRoot!.querySelector('cloudimage-crop-rotate')!;
    rotate.dispatchEvent(new CustomEvent('cloudimage-crop-rotate-change', {
      detail: { degrees: 12.5 },
      bubbles: true,
      composed: true,
    }));
    await expect(waitForEvent).resolves.toEqual({ type: 'rotation', value: 12.5 });
  });

  it('forwards shape-selector changes as shape commands', async () => {
    await mount();
    const waitForEvent = captureCommand(document);
    const shapes = el.shadowRoot!.querySelector('cloudimage-crop-shapes')!;
    shapes.dispatchEvent(new CustomEvent('cloudimage-crop-shape-change', {
      detail: { shape: '16:9' },
      bubbles: true,
      composed: true,
    }));
    await expect(waitForEvent).resolves.toEqual({ type: 'shape', value: '16:9' });
  });

  it('respects show-rotate-button=false by omitting the rotate button', async () => {
    el = document.createElement('cloudimage-crop-toolbar') as CloudimageCropToolbarElement;
    el.showRotateButton = false;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(
      el.shadowRoot!.querySelector('button[aria-label="Rotate left 90°"]'),
    ).toBeNull();
  });

  it('setRotationValue syncs the slider without firing a command', async () => {
    await mount();
    let fired = false;
    el.addEventListener('cloudimage-crop-toolbar-command', () => { fired = true; });
    el.setRotationValue(-12);
    await el.updateComplete;
    expect(fired).toBe(false);
    expect(el.rotation).toBe(-12);
  });

  it('setShapeValue syncs without firing a command', async () => {
    await mount();
    let fired = false;
    el.addEventListener('cloudimage-crop-toolbar-command', () => { fired = true; });
    el.setShapeValue('circle');
    await el.updateComplete;
    expect(fired).toBe(false);
    expect(el.shape).toBe('circle');
  });
});
