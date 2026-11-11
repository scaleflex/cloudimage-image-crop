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

  it('reserves narrow-box corner gutters only for the Cancel / Done buttons actually shown', async () => {
    await mount();
    const row = (): DOMTokenList => el.shadowRoot!.querySelector('.ci-crop-toolbar')!.classList;

    el.showCancelButton = false;
    el.showDoneButton = false;
    await el.updateComplete;
    expect(row().contains('ci-crop-toolbar--gutter-l')).toBe(false);
    expect(row().contains('ci-crop-toolbar--gutter-r')).toBe(false);

    el.showDoneButton = true;
    await el.updateComplete;
    expect(row().contains('ci-crop-toolbar--gutter-l')).toBe(false);
    expect(row().contains('ci-crop-toolbar--gutter-r')).toBe(true);

    el.showCancelButton = true;
    await el.updateComplete;
    expect(row().contains('ci-crop-toolbar--gutter-l')).toBe(true);
  });

  describe('resetPlacement', () => {
    const reset = (): HTMLButtonElement =>
      el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Reset all changes"]')!;
    const group = (): Element => el.shadowRoot!.querySelector('.ci-crop-toolbar-group')!;
    const row = (): DOMTokenList => el.shadowRoot!.querySelector('.ci-crop-toolbar')!.classList;

    it('keeps Reset first in the tool group by default', async () => {
      await mount();
      expect(el.resetPlacement).toBe('toolbar');
      expect(group().firstElementChild).toBe(reset());
      expect(el.shadowRoot!.querySelector('.ci-crop-start')).toBeNull();
    });

    it("'start' pins Reset next to Cancel, out of the tool group", async () => {
      await mount();
      el.showCancelButton = true;
      el.resetPlacement = 'start';
      await el.updateComplete;

      const start = el.shadowRoot!.querySelector('.ci-crop-start')!;
      expect([...start.children].map((b) => b.getAttribute('aria-label'))).toEqual(['Cancel', 'Reset all changes']);
      expect(group().contains(reset())).toBe(false);
      expect(reset().getAttribute('data-tooltip-align')).toBe('start');
      // No divider is left leading the group once Reset has moved out.
      expect(group().firstElementChild?.classList.contains('ci-crop-toolbar-divider')).toBe(false);
      expect(row().contains('ci-crop-toolbar--gutter-l2')).toBe(true);
    });

    it("'start' without Cancel pins Reset alone and reserves one gutter", async () => {
      await mount();
      el.showCancelButton = false;
      el.resetPlacement = 'start';
      await el.updateComplete;

      const start = el.shadowRoot!.querySelector('.ci-crop-start')!;
      expect(start.children).toHaveLength(1);
      expect(start.firstElementChild).toBe(reset());
      expect(row().contains('ci-crop-toolbar--gutter-l')).toBe(true);
      expect(row().contains('ci-crop-toolbar--gutter-l2')).toBe(false);
    });

    it('drops the shape divider when nothing precedes it in the group', async () => {
      await mount();
      el.resetPlacement = 'start';
      el.showRotateButton = false;
      el.showFlipButton = false;
      await el.updateComplete;
      expect(group().querySelector('.ci-crop-toolbar-divider')).toBeNull();
    });

    it('puts the left corner first in focus order, matching what the user sees', async () => {
      await mount();
      el.showCancelButton = true;
      const toolbarRow = (): Element => el.shadowRoot!.querySelector('.ci-crop-toolbar')!;
      const precedes = (a: Element, b: Element): boolean =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

      await el.updateComplete;
      expect(precedes(el.shadowRoot!.querySelector('.ci-crop-cancel-btn')!, toolbarRow())).toBe(true);

      el.resetPlacement = 'start';
      await el.updateComplete;
      expect(precedes(el.shadowRoot!.querySelector('.ci-crop-start')!, toolbarRow())).toBe(true);
    });

    it('keeps focus on Reset when it moves between positions', async () => {
      await mount();
      reset().focus();
      expect(el.shadowRoot!.activeElement).toBe(reset());

      el.resetPlacement = 'start';
      await el.updateComplete;
      expect(el.shadowRoot!.activeElement).toBe(reset());

      el.resetPlacement = 'toolbar';
      await el.updateComplete;
      expect(el.shadowRoot!.activeElement).toBe(reset());
    });

    it('does not move focus to Reset when something else had it', async () => {
      await mount();
      const rotate = el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Rotate left 90°"]')!;
      rotate.focus();
      el.resetPlacement = 'start';
      await el.updateComplete;
      expect(el.shadowRoot!.activeElement).toBe(rotate);
    });

    it('renders no empty tool group when Reset is pinned and every tool is off', async () => {
      await mount();
      el.resetPlacement = 'start';
      el.showRotateButton = false;
      el.showFlipButton = false;
      el.showShapeSelector = false;
      await el.updateComplete;
      expect(el.shadowRoot!.querySelector('.ci-crop-toolbar-group')).toBeNull();
      expect(reset()).not.toBeNull();
    });

    it('still emits reset from the pinned position', async () => {
      await mount();
      el.resetPlacement = 'start';
      await el.updateComplete;
      const waitForEvent = captureCommand(document);
      reset().click();
      await expect(waitForEvent).resolves.toEqual({ type: 'reset' });
    });
  });

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

  it('renders the Done button by default and emits save on click', async () => {
    await mount();
    const waitForEvent = captureCommand(document);
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Done"]')!;
    expect(btn).not.toBeNull();
    btn.click();
    await expect(waitForEvent).resolves.toEqual({ type: 'save' });
  });

  it('respects show-done-button=false by omitting the Done button', async () => {
    el = document.createElement('cloudimage-crop-toolbar') as CloudimageCropToolbarElement;
    el.showDoneButton = false;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('button[aria-label="Done"]')).toBeNull();
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
