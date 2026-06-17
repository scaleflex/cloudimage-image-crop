import { css } from 'lit';

/**
 * Floating pill toolbar — mirrors the glassy source-pill row in
 * `@scaleflex/uploader`. The bar is centered horizontally above or below
 * the canvas with a translucent white background, backdrop blur, and a
 * soft shadow ring.
 */
export const sfxCropToolbarStyles = css`
  :host {
    position: absolute;
    top: 16px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 5;
    animation: ci-crop-toolbar-enter 300ms ease forwards;
    pointer-events: none;
  }

  :host([toolbar-position="bottom"]) {
    top: auto;
    bottom: 16px;
  }

  /* Fixed variant: the editor box IS the crop frame, so the floating bar sits
     directly over the photo. Classic gets its button contrast for free from
     the dimmed crop mask; fixed has none, so give each control its own
     translucent pill to stay legible over arbitrary image content.

     IMPORTANT: backgrounds only — no backdrop-filter / transform / filter
     here or on any ancestor. Those create a containing block for
     position:fixed descendants, which would re-anchor the canvas-bottom ruler
     + shape popover (both fixed-positioned) to the bar and knock the 45-deg
     tilt ruler off-screen. A plain background is safe. */
  :host([variant="fixed"]) .ci-crop-toolbar,
  :host([variant="fixed"]) .ci-crop-toolbar-group {
    /* Fixed variant runs a slightly tighter uniform gap than classic. */
    gap: 12px;
  }
  :host([variant="fixed"]) .ci-crop-reset-btn,
  :host([variant="fixed"]) .ci-crop-toolbar-btn {
    background: var(--ci-crop-overlay-color);
  }

  /* Primary "Done" action — pinned to the right edge of the toolbar strip,
     away from the centered control cluster. The host spans the full block
     width (left:0/right:0), so right:16px sits near the block's edge. */
  .ci-crop-done-btn {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 18px;
    background: var(--ci-crop-primary);
    color: #fff;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    font-family: var(--ci-crop-font);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.1px;
    white-space: nowrap;
    box-shadow: var(--ci-crop-toolbar-shadow);
    transition:
      background var(--ci-crop-transition),
      transform var(--ci-crop-transition);
  }
  .ci-crop-done-btn:hover {
    background: var(--ci-crop-primary-hover);
    transform: translateY(-50%) scale(1.02);
  }
  .ci-crop-done-btn:active {
    transform: translateY(-50%) scale(0.97);
  }
  .ci-crop-done-btn:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }

  /* Hole-punch pattern: the toolbar host is pointer-transparent and
     individual interactive children below opt back in. Gaps between
     buttons fall through to the canvas — important when a crop handle
     ends up under the floating toolbar and the user wants to grab it.
     The rotate / zoom / shapes sub-elements already follow the same
     pattern in their own stylesheets. */
  .ci-crop-toolbar {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
    padding: 4px 8px;
    background: transparent;
    color: var(--ci-crop-toolbar-color);
    border: none;
    border-radius: 0;
    box-shadow: none;
    pointer-events: none;
  }

  .ci-crop-toolbar-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    /* Match the toolbar's own gap so spacing is uniform across every button
       (Reset, rotate, flip, shapes), not tighter inside the group. */
    gap: 16px;
  }

  /* Sub-element hosts — same hole-punch opt-in as the plain buttons.
     Their hosts are tight inline-flex wrappers around a single trigger,
     so re-enabling them adds no extra dead zone. */
  cloudimage-crop-rotate,
  cloudimage-crop-shapes {
    pointer-events: auto;
  }

  /* The fine-tilt ruler renders as a canvas-anchored fixed popover, but its
     inline host still occupies a zero-width slot in the toolbar row — which
     doubles the gap between the flip button and the shape selector. Pull the
     host out of flow so every visible button stays evenly spaced (both
     variants). The popover is position:fixed, so this doesn't move it. */
  cloudimage-crop-rotate {
    position: absolute;
  }

  .ci-crop-toolbar-btn {
    pointer-events: auto;
    width: 52px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--ci-crop-text-secondary);
    /* Transparent default border → hover swaps in a colored ring without
       the layout shifting from 0 → 1 px. */
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;
    padding: 0;
    transition:
      border-color var(--ci-crop-transition),
      color var(--ci-crop-transition),
      transform var(--ci-crop-transition);
  }

  .ci-crop-toolbar-btn:hover {
    border-color: var(--ci-crop-primary);
    transform: translateY(-1px);
  }

  .ci-crop-toolbar-btn:active {
    transform: translateY(0) scale(0.96);
  }

  .ci-crop-toolbar-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .ci-crop-toolbar-btn:disabled:hover {
    border-color: transparent;
    color: var(--ci-crop-text-muted);
    transform: none;
  }

  .ci-crop-toolbar-btn:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }

  .ci-crop-toolbar-btn svg {
    width: 20px;
    height: 20px;
    display: block;
  }

  /* Reset pill — mirrors the shape-selector trigger visual language:
     capsule border, transparent fill, primary-blue tint on hover. Lives
     before every other control so the user can wipe back to the initial
     state in one click. */
  .ci-crop-reset-btn {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    min-width: 84px;
    height: 36px;
    background: transparent;
    color: var(--ci-crop-text-secondary);
    border: 1.5px solid var(--ci-crop-border);
    border-radius: 50px;
    cursor: pointer;
    font-family: var(--ci-crop-font);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.1px;
    white-space: nowrap;
    transition:
      background var(--ci-crop-transition),
      border-color var(--ci-crop-transition),
      color var(--ci-crop-transition),
      transform var(--ci-crop-transition),
      box-shadow var(--ci-crop-transition);
  }
  .ci-crop-reset-btn:hover {
    border-color: var(--ci-crop-primary);
    transform: translateY(-1px);
  }
  .ci-crop-reset-btn:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }
  .ci-crop-reset-btn svg {
    width: 18px;
    height: 18px;
    display: block;
  }

  @media (max-width: 768px) {
    .ci-crop-toolbar {
      flex-wrap: wrap;
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .ci-crop-toolbar {
      padding: 6px 8px;
      gap: 8px;
    }
    .ci-crop-toolbar-group {
      gap: 8px;
    }
    .ci-crop-toolbar-btn {
      width: 40px;
      height: 32px;
    }
    .ci-crop-toolbar-btn svg {
      width: 18px;
      height: 18px;
      display: block;
    }
  }

  /* Narrow editor (component itself is small, regardless of viewport):
     stack the toolbar vertically along the LEFT edge, icons only.
     Tucked tight against the edge with a compact 30×30 footprint so
     the photo behind keeps maximum breathing room. Triggered by the
     sfxcrop container set on the cloudimage-crop host — matches editor
     width, not viewport width, so a narrow column on a wide desktop
     gets the same compact layout.

     EXCLUDED from the fixed variant via :not([variant="fixed"]): a fixed
     frame is often portrait/phone-shaped (narrow but tall), where the left
     rail looks wrong — fixed keeps the horizontal top bar at any width. */
  @container sfxcrop (max-width: 760px) {
    :host(:not([variant="fixed"])) {
      top: 8px;
      bottom: 8px;
      /* Stay full-width (don't collapse to a left-hugging strip): the Done
         button is absolutely positioned against this host, so the host must
         keep spanning to the container's right edge for Done to stay in the
         top-right corner. The button column is tucked left with padding
         instead of by repositioning the whole host. */
      left: 0;
      right: 0;
      padding-left: 4px;
      justify-content: flex-start;
      /* Cross-axis centers the stacked button column vertically inside
         the full-height host strip — toolbar floats in the middle of
         the photo regardless of its content height. */
      align-items: center;
    }
    :host(:not([variant="fixed"])[toolbar-position="bottom"]) {
      top: 8px;
      bottom: 8px;
    }
    /* Keep Done pinned to the editor's top-right corner — exactly where the
       desktop bar puts it — even though the host now spans the full photo
       height (top:50% would otherwise drop it to the vertical middle). A bit
       smaller and tucked tighter into the corner to free up the photo. */
    :host(:not([variant="fixed"])) .ci-crop-done-btn {
      top: 6px;
      right: 8px;
      height: 28px;
      padding: 0 12px;
      font-size: 12px;
      transform: none;
    }
    :host(:not([variant="fixed"])) .ci-crop-done-btn:hover { transform: scale(1.02); }
    :host(:not([variant="fixed"])) .ci-crop-done-btn:active { transform: scale(0.97); }
    :host(:not([variant="fixed"])) .ci-crop-toolbar {
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: flex-start;
      gap: 4px;
      padding: 3px;
    }
    :host(:not([variant="fixed"])) .ci-crop-toolbar-group {
      flex-direction: column;
      gap: 4px;
    }
    :host(:not([variant="fixed"])) .ci-crop-toolbar-btn {
      width: 30px;
      height: 30px;
    }
    :host(:not([variant="fixed"])) .ci-crop-toolbar-btn svg {
      width: 16px;
      height: 16px;
    }
    :host(:not([variant="fixed"])) .ci-crop-reset-btn {
      width: 30px;
      height: 30px;
      min-width: 0;
      padding: 0;
      gap: 0;
      justify-content: center;
    }
    :host(:not([variant="fixed"])) .ci-crop-reset-btn svg {
      width: 16px;
      height: 16px;
    }
    :host(:not([variant="fixed"])) .ci-crop-reset-btn span {
      display: none;
    }
  }

  /* Fixed + narrow (portrait/phone frame): keep the horizontal top bar, but
     render every control as a uniform 40×40 round icon button, centered in
     the frame. (Reset / shapes labels are dropped — icon only.) */
  @container sfxcrop (max-width: 760px) {
    :host([variant="fixed"]) .ci-crop-toolbar {
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }
    :host([variant="fixed"]) .ci-crop-toolbar-group {
      gap: 10px;
    }
    :host([variant="fixed"]) .ci-crop-reset-btn,
    :host([variant="fixed"]) .ci-crop-toolbar-btn {
      width: 40px;
      height: 40px;
      min-width: 0;
      padding: 0;
      gap: 0;
      justify-content: center;
    }
    :host([variant="fixed"]) .ci-crop-reset-btn span {
      display: none;
    }
    :host([variant="fixed"]) .ci-crop-done-btn {
      /* Stay in the top-right corner when the bar wraps to multiple rows
         (top:50% would otherwise centre Done over the taller wrapped bar),
         a bit smaller and tucked tighter into the corner. */
      top: 6px;
      right: 8px;
      height: 28px;
      padding: 0 12px;
      font-size: 12px;
      transform: none;
    }
    :host([variant="fixed"]) .ci-crop-done-btn:hover { transform: scale(1.02); }
    :host([variant="fixed"]) .ci-crop-done-btn:active { transform: scale(0.97); }
  }
`;
