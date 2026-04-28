import { describe, it, expect, beforeAll, afterEach, beforeEach, vi } from 'vitest';
import '../../src/define';
import type { SfxCropZoomElement } from '../../src/elements/sfx-crop-zoom';

/**
 * Covers the wheel-zoom ↔ popover debounce contract implemented by
 * {@link SfxCropZoomElement.showTemporarily}: controller fires the method
 * on every wheel notch; the popover opens, rides out a burst, then closes
 * after an idle window — but never hijacks a user-opened popover.
 */
describe('<sfx-crop-zoom> showTemporarily', () => {
  beforeAll(async () => {
    await customElements.whenDefined('sfx-crop-zoom');
  });

  let el: SfxCropZoomElement;
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    el?.remove();
    vi.useRealTimers();
  });

  async function mount(): Promise<SfxCropZoomElement> {
    el = document.createElement('sfx-crop-zoom') as SfxCropZoomElement;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  it('opens the popover and auto-closes after the duration', async () => {
    await mount();
    expect(el.open).toBe(false);

    el.showTemporarily(500);
    expect(el.open).toBe(true);

    vi.advanceTimersByTime(499);
    expect(el.open).toBe(true);

    vi.advanceTimersByTime(1);
    expect(el.open).toBe(false);
  });

  it('debounces: a second call within the window extends visibility', async () => {
    await mount();
    el.showTemporarily(500);
    vi.advanceTimersByTime(400);
    expect(el.open).toBe(true);

    // Another wheel notch lands — the popover must stay open for another
    // full 500 ms from this point (not close at 500 ms from the first call).
    el.showTemporarily(500);
    vi.advanceTimersByTime(400);
    expect(el.open).toBe(true);

    vi.advanceTimersByTime(100);
    expect(el.open).toBe(false);
  });

  it('does NOT auto-close when the popover was opened manually', async () => {
    await mount();
    // Manual open: open flag flipped without the auto-close timer.
    el.open = true;
    await el.updateComplete;

    // A wheel burst after manual open should be a no-op (guard).
    el.showTemporarily(500);
    vi.advanceTimersByTime(10_000);
    expect(el.open).toBe(true);
  });

  it('dispatches sfx-crop-popover-open only on transition closed → open', async () => {
    await mount();
    const events: string[] = [];
    el.addEventListener('sfx-crop-popover-open', () => events.push('open'));

    el.showTemporarily(500);
    expect(events).toEqual(['open']);

    // Still within the window — shouldn't fire another open event.
    el.showTemporarily(500);
    expect(events).toEqual(['open']);
  });

  it('clears the pending close when the doc click handler closes it', async () => {
    await mount();
    el.showTemporarily(500);
    expect(el.open).toBe(true);

    // Simulate the document click that normally dismisses the popover.
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.open).toBe(false);

    // Advancing past the original duration must not resurrect open=false
    // via the stale timer (would be a no-op anyway, but would also waste a
    // scheduler slot — easier to observe via a subsequent showTemporarily).
    vi.advanceTimersByTime(1000);
    expect(el.open).toBe(false);

    // After a click-dismiss, a fresh wheel burst must still work.
    el.showTemporarily(500);
    expect(el.open).toBe(true);
  });
});
