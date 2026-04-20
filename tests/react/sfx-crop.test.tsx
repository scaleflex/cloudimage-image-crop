import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRef } from 'react';
import { render, cleanup } from '@testing-library/react';
import '../../src/define';
import { SfxCrop, type SfxCropElement } from '../../src/react';

describe('<SfxCrop> React wrapper', () => {
  beforeAll(async () => {
    await customElements.whenDefined('sfx-crop');
  });

  afterEach(() => cleanup());

  it('renders an <sfx-crop> element', () => {
    const { container } = render(<SfxCrop />);
    expect(container.querySelector('sfx-crop')).toBeTruthy();
  });

  it('forwards class + style + id props to the host', () => {
    const { container } = render(
      <SfxCrop className="demo" style={{ width: 320 }} id="viewer" />,
    );
    const el = container.querySelector('sfx-crop') as HTMLElement;
    expect(el.className).toBe('demo');
    expect(el.id).toBe('viewer');
    expect(el.style.width).toBe('320px');
  });

  it('syncs camelCase config props to element properties', async () => {
    const { container } = render(<SfxCrop cropShape="circle" minScale={0.2} theme="light" />);
    const el = container.querySelector('sfx-crop') as SfxCropElement;
    await el.updateComplete;
    expect(el.cropShape).toBe('circle');
    expect(el.minScale).toBe(0.2);
    expect(el.theme).toBe('light');
  });

  it('bridges CustomEvents to prop callbacks', async () => {
    const onChange = vi.fn();
    const onCropChange = vi.fn();
    const { container } = render(<SfxCrop onChange={onChange} onCropChange={onCropChange} />);
    const el = container.querySelector('sfx-crop') as SfxCropElement;
    await el.updateComplete;

    el.dispatchEvent(new CustomEvent('sfx-crop-change', {
      detail: { cropRect: { x: 0, y: 0, width: 1, height: 1 } },
      bubbles: true,
      composed: true,
    }));
    el.dispatchEvent(new CustomEvent('sfx-crop-crop-change', {
      detail: { x: 0, y: 0, width: 800, height: 600 },
      bubbles: true,
      composed: true,
    }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onCropChange).toHaveBeenCalledWith({ x: 0, y: 0, width: 800, height: 600 });
  });

  it('reads the LATEST callback on each event (no stale-closure)', async () => {
    let callCount = 0;
    const { container, rerender } = render(<SfxCrop onChange={() => { callCount += 1; }} />);
    const el = container.querySelector('sfx-crop') as SfxCropElement;
    await el.updateComplete;

    el.dispatchEvent(new CustomEvent('sfx-crop-change', { detail: {}, bubbles: true, composed: true }));
    expect(callCount).toBe(1);

    // Swap to a different handler — the bridge should pick it up without
    // re-attaching listeners.
    let replacedCalls = 0;
    rerender(<SfxCrop onChange={() => { replacedCalls += 1; }} />);
    el.dispatchEvent(new CustomEvent('sfx-crop-change', { detail: {}, bubbles: true, composed: true }));
    expect(callCount).toBe(1);
    expect(replacedCalls).toBe(1);
  });

  it('forwards the bare element through ref', () => {
    const ref = createRef<SfxCropElement | null>();
    const { container } = render(<SfxCrop ref={ref} />);
    const el = container.querySelector('sfx-crop') as SfxCropElement;
    expect(ref.current).toBe(el);
  });
});
