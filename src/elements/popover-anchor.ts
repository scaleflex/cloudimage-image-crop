/**
 * Position a slider popover (`.ci-crop-*-popover`) at the bottom of the
 * `<cloudimage-crop>` canvas rect, regardless of where its trigger sits in the
 * toolbar. The popover uses `position: fixed` with CSS variables
 * `--ci-crop-popover-left` / `--ci-crop-popover-bottom` that this helper
 * writes on the popover element.
 *
 * The `<cloudimage-crop>` host's bounding rect matches the rendered canvas area
 * (see `CloudimageCropElement.fitHostToImage`), so anchoring to its bottom edge
 * places the ruler over the lower strip of the photo.
 *
 * Anchored by BOTTOM, not top: the popover's own content (ruler + degree
 * label) is fluid now — its height shrinks as the editor box narrows (see
 * cloudimage-crop-rotate.styles.ts's clamp()s). A top-anchored offset stays
 * fixed regardless of content height, so shrinking content left a growing
 * gap below it — visually "the ruler rises" as you resize down. Anchoring
 * the BOTTOM edge instead keeps it pinned a constant BOTTOM_INSET above the
 * box's own bottom edge at every size; the block's content grows/shrinks
 * from there, not away from it.
 */

/** Vertical gap (px) between the popover's bottom edge and the canvas bottom edge. */
const BOTTOM_INSET = 16;

/**
 * Walk up through nested shadow roots from `element` to find the enclosing
 * `<cloudimage-crop>` host — its bounding rect matches the rendered canvas
 * area (see `CloudimageCropElement.fitHostToImage`), which is what every
 * "how much room do I actually have" calculation in this component tree
 * (popover anchoring, the shape-dropdown's open-side flip) measures against,
 * regardless of how deep the querying element's own shadow root is nested.
 */
export function findCropHost(element: HTMLElement): HTMLElement | null {
  let node: Node = element;
  for (let i = 0; i < 6; i++) {
    const root = node.getRootNode();
    if (!(root instanceof ShadowRoot)) break;
    node = root.host;
    const tag = (node as Element).tagName?.toLowerCase();
    if (tag === 'cloudimage-crop') return node as HTMLElement;
  }
  return null;
}

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

  const update = (): void => {
    const popover = element.shadowRoot?.querySelector(popoverSelector) as HTMLElement | null;
    const crop = findCropHost(element);
    if (!popover || !crop) return;
    const rect = crop.getBoundingClientRect();
    popover.style.setProperty('--ci-crop-popover-left', `${rect.left + rect.width / 2}px`);
    popover.style.setProperty('--ci-crop-popover-bottom', `${window.innerHeight - rect.bottom + BOTTOM_INSET}px`);
  };

  const onScrollOrResize = (): void => update();

  const start = (): void => {
    if (listening) return;
    listening = true;
    update();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    const crop = findCropHost(element);
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
