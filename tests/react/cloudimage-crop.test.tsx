import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRef } from 'react';
import { render, cleanup } from '@testing-library/react';
import '../../src/define';
import { CloudimageCrop, type CloudimageCropElement } from '../../src/react';

describe('<CloudimageCrop> React wrapper', () => {
  beforeAll(async () => {
    await customElements.whenDefined('cloudimage-crop');
  });

  afterEach(() => cleanup());

  it('renders an <cloudimage-crop> element', () => {
    const { container } = render(<CloudimageCrop />);
    expect(container.querySelector('cloudimage-crop')).toBeTruthy();
  });

  it('forwards class + style + id props to the host', () => {
    const { container } = render(
      <CloudimageCrop className="demo" style={{ width: 320 }} id="viewer" />,
    );
    const el = container.querySelector('cloudimage-crop') as HTMLElement;
    expect(el.className).toBe('demo');
    expect(el.id).toBe('viewer');
    expect(el.style.width).toBe('320px');
  });

  it('syncs camelCase config props to element properties', async () => {
    const { container } = render(<CloudimageCrop cropShape="circle" minScale={0.2} theme="light" />);
    const el = container.querySelector('cloudimage-crop') as CloudimageCropElement;
    await el.updateComplete;
    expect(el.cropShape).toBe('circle');
    expect(el.minScale).toBe(0.2);
    expect(el.theme).toBe('light');
  });

  it('bridges CustomEvents to prop callbacks', async () => {
    const onChange = vi.fn();
    const onCropChange = vi.fn();
    const { container } = render(<CloudimageCrop onChange={onChange} onCropChange={onCropChange} />);
    const el = container.querySelector('cloudimage-crop') as CloudimageCropElement;
    await el.updateComplete;

    el.dispatchEvent(new CustomEvent('cloudimage-crop-change', {
      detail: { cropRect: { x: 0, y: 0, width: 1, height: 1 } },
      bubbles: true,
      composed: true,
    }));
    el.dispatchEvent(new CustomEvent('cloudimage-crop-crop-change', {
      detail: { x: 0, y: 0, width: 800, height: 600 },
      bubbles: true,
      composed: true,
    }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onCropChange).toHaveBeenCalledWith({ x: 0, y: 0, width: 800, height: 600 });
  });

  it('reads the LATEST callback on each event (no stale-closure)', async () => {
    let callCount = 0;
    const { container, rerender } = render(<CloudimageCrop onChange={() => { callCount += 1; }} />);
    const el = container.querySelector('cloudimage-crop') as CloudimageCropElement;
    await el.updateComplete;

    el.dispatchEvent(new CustomEvent('cloudimage-crop-change', { detail: {}, bubbles: true, composed: true }));
    expect(callCount).toBe(1);

    // Swap to a different handler — the bridge should pick it up without
    // re-attaching listeners.
    let replacedCalls = 0;
    rerender(<CloudimageCrop onChange={() => { replacedCalls += 1; }} />);
    el.dispatchEvent(new CustomEvent('cloudimage-crop-change', { detail: {}, bubbles: true, composed: true }));
    expect(callCount).toBe(1);
    expect(replacedCalls).toBe(1);
  });

  it('forwards the bare element through ref', () => {
    const ref = createRef<CloudimageCropElement | null>();
    const { container } = render(<CloudimageCrop ref={ref} />);
    const el = container.querySelector('cloudimage-crop') as CloudimageCropElement;
    expect(ref.current).toBe(el);
  });
});
