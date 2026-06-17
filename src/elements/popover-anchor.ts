/**
 * Position a slider popover (`.ci-crop-*-popover`) at the bottom of the
 * `<cloudimage-crop>` canvas rect, regardless of where its trigger sits in the
 * toolbar. The popover uses `position: fixed` with CSS variables
 * `--ci-crop-popover-left` / `--ci-crop-popover-top` that this helper writes
 * on the popover element.
 *
 * The `<cloudimage-crop>` host's bounding rect matches the rendered canvas area
 * (see `CloudimageCropElement.fitHostToImage`), so anchoring to its bottom edge
 * places the ruler over the lower strip of the photo.
 */

/** Vertical offset (px) above the canvas bottom edge. */
const BOTTOM_INSET = 72;

export interface PopoverAnchor {
  /** Keep the popover in sync with the canvas rect while it's open. */
  start(): void;
  /** Stop observing + detach listeners. Idempotent. */
  stop(): void;
  /** Recompute the popover's top/left from the current canvas rect. */
  update(): void;
}

export function createPopoverAnchor(
  element: HTMLElement,
  popoverSelector: string,
): PopoverAnchor {
  let observer: ResizeObserver | null = null;
  let listening = false;

  const findCropHost = (): HTMLElement | null => {
    let node: Node = element;
    for (let i = 0; i < 6; i++) {
      const root = node.getRootNode();
      if (!(root instanceof ShadowRoot)) break;
      node = root.host;
      const tag = (node as Element).tagName?.toLowerCase();
      if (tag === 'cloudimage-crop') return node as HTMLElement;
    }
    return null;
  };

  const update = (): void => {
    const popover = element.shadowRoot?.querySelector(popoverSelector) as HTMLElement | null;
    const crop = findCropHost();
    if (!popover || !crop) return;
    const rect = crop.getBoundingClientRect();
    popover.style.setProperty('--ci-crop-popover-left', `${rect.left + rect.width / 2}px`);
    popover.style.setProperty('--ci-crop-popover-top', `${rect.bottom - BOTTOM_INSET}px`);
  };

  const onScrollOrResize = (): void => update();

  const start = (): void => {
    if (listening) return;
    listening = true;
    update();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    const crop = findCropHost();
    if (crop && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => update());
      observer.observe(crop);
    }
  };

  const stop = (): void => {
    if (!listening) return;
    listening = false;
    window.removeEventListener('resize', onScrollOrResize);
    window.removeEventListener('scroll', onScrollOrResize, true);
    observer?.disconnect();
    observer = null;
  };

  return { start, stop, update };
}
