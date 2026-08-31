import { css } from 'lit';

/**
 * `<cloudimage-crop>` host + container + loading/error overlay.
 *
 * Visual language tracks `@scaleflex/uploader`: Inter typography, 16px outer
 * radius, deep soft shadow, primary-blue accents for spinners and focus.
 * Works embedded on any page surface (light or dark); `--ci-crop-*` tokens
 * swap automatically when the host carries `theme="dark"`.
 */
export const sfxCropStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    font-family: var(--ci-crop-font);
    color: var(--ci-crop-text);
    /* Named SIZE container (both axes) so sub-elements can switch layout
       based on the editor's own WIDTH — independent of the page viewport,
       so a narrow column on a wide desktop gets the same compact UI as a
       phone — and so the shape-selector dropdown can clamp its own
       max-height to the box's real HEIGHT via cqh units (see
       cloudimage-crop-shapes.styles.ts) instead of the viewport's, which
       overflows/clips in a short, wide box (e.g. a 5:1 crop). Safe to
       size-contain: fitHostToImage() always sets an explicit pixel
       width/height on :host before layout matters here. */
    container-type: size;
    container-name: sfxcrop;
  }

  :host([hidden]) { display: none; }

  :host(:focus-visible) {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }

  .ci-crop-container {
    position: relative;
    /* "clip", not "hidden": this box clips the photo to the crop frame's
     * shape but must never actually SCROLL. Popovers positioned inside it
     * (e.g. the shape-selector dropdown) are position:absolute and their
     * open height can exceed the container — overflow:hidden still lets
     * the browser silently scrollTop it into view whenever an option
     * receives focus, dragging the canvas out of frame and exposing this
     * element's own background as a blank strip underneath. "clip" clips
     * identically but makes the box non-scrollable, so scrollTop can never
     * move (programmatically or via focus) — no visual jump. */
    overflow: clip;
    width: 100%;
    height: 100%;
    background: var(--ci-crop-bg);
    border-radius: var(--ci-crop-radius);
    /* Editor card frame: shadow-only (no border). A border draws two
       visible curves at the corners (outer + inner padding edge),
       reading as a "double ring"; a slightly stronger shadow gives the
       same elevation feel with a single clean rounded silhouette. */
    /* shadow-xs ring + shadow-md elevation, sourced from ui-tw scale */
    box-shadow:
      0 0 0 1px oklch(0 0 0 / 0.05),
      0 4px 6px -1px oklch(0 0 0 / 0.1),
      0 2px 4px -2px oklch(0 0 0 / 0.1);
    font-family: var(--ci-crop-font);
    user-select: none;
    -webkit-user-select: none;
  }

  /* ====== Loading ====== */
  .ci-crop-loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: var(--ci-crop-bg);
    z-index: 10;
    transition: opacity 280ms ease;
  }
  .ci-crop-loading--hidden {
    opacity: 0;
    pointer-events: none;
  }

  .ci-crop-loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--ci-crop-border);
    border-top-color: var(--ci-crop-primary);
    border-radius: 50%;
    animation: ci-crop-spin 0.8s linear infinite;
  }

  .ci-crop-loading-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--ci-crop-text-secondary);
    letter-spacing: 0.2px;
  }

  /* ====== Error ====== */
  .ci-crop-error {
    position: absolute;
    inset: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 32px;
    background: var(--ci-crop-bg);
    z-index: 10;
    color: var(--ci-crop-error);
    font-size: 14px;
    font-weight: 500;
    text-align: center;
  }
  .ci-crop-error--visible { display: flex; }

  /* ====== ResizableFrame (variant:'fixed', cropShape:'free') ======
   * Drag-the-box's-own-edge handles. Siblings of .ci-crop-container (which
   * overflow:clip's the photo to the frame shape) so a handle sitting half
   * outside the box's edge isn't itself clipped away — :host is the
   * outermost un-clipped box they can anchor to.
   *
   * Visual language borrowed straight from classic's own canvas-drawn frame
   * (crop-frame.ts): small circular corner dots (--ci-crop-handle-fill/
   * -stroke, the same tokens, so it matches whatever theme is active) — NOT
   * a separate big colored square per handle. Classic doesn't draw a visible
   * mark on the edges at all, only an enlarged hit zone with a resize
   * cursor; the n/s/e/w handles here do the same — hit target only, nothing
   * painted, so the frame doesn't get visually busier than classic's. */
  .ci-crop-resize-handle {
    position: absolute;
    z-index: 20;
    touch-action: none;
  }

  .ci-crop-resize-handle--n,
  .ci-crop-resize-handle--s {
    left: 12px;
    right: 12px;
    height: 16px;
    cursor: ns-resize;
  }
  .ci-crop-resize-handle--n { top: -8px; }
  .ci-crop-resize-handle--s { bottom: -8px; }

  .ci-crop-resize-handle--e,
  .ci-crop-resize-handle--w {
    top: 12px;
    bottom: 12px;
    width: 16px;
    cursor: ew-resize;
  }
  .ci-crop-resize-handle--e { right: -8px; }
  .ci-crop-resize-handle--w { left: -8px; }

  .ci-crop-resize-handle--ne,
  .ci-crop-resize-handle--nw,
  .ci-crop-resize-handle--se,
  .ci-crop-resize-handle--sw {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--ci-crop-handle-fill);
    border: 1px solid var(--ci-crop-handle-stroke);
    box-shadow: 0 1px 2px oklch(0 0 0 / 0.2);
  }
  .ci-crop-resize-handle--ne { top: -6px; right: -6px; cursor: nesw-resize; }
  .ci-crop-resize-handle--nw { top: -6px; left: -6px; cursor: nwse-resize; }
  .ci-crop-resize-handle--se { bottom: -6px; right: -6px; cursor: nwse-resize; }
  .ci-crop-resize-handle--sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
`;
