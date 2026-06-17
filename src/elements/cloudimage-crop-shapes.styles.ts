import { css } from 'lit';

/**
 * Capsule shape-selector. Trigger + dropdown follow uploader's source-pill
 * language: glassy trigger, primary tint on hover, 12px dropdown radius
 * with a soft shadow, primary-blue accent on the active option.
 */
export const sfxCropShapesStyles = css`
  :host {
    position: relative;
    display: inline-block;
  }

  .ci-crop-shape-trigger {
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
    transition:
      background var(--ci-crop-transition),
      border-color var(--ci-crop-transition),
      color var(--ci-crop-transition),
      transform var(--ci-crop-transition),
      box-shadow var(--ci-crop-transition);
    white-space: nowrap;
    letter-spacing: 0.1px;
  }

  /* Fixed variant: translucent pill so the trigger reads over the photo
     (no dimmed crop mask behind it). Plain background — no filter/transform. */
  :host([variant="fixed"]) .ci-crop-shape-trigger {
    background: var(--ci-crop-overlay-color);
  }

  .ci-crop-shape-trigger:hover {
    border-color: var(--ci-crop-primary);
    transform: translateY(-1px);
  }

  .ci-crop-shape-trigger:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }

  .ci-crop-shape-trigger-icon {
    display: flex;
    width: 20px;
    height: 20px;
  }
  .ci-crop-shape-trigger-icon svg { width: 100%; height: 100%; display: block; }

  .ci-crop-shape-trigger-label { line-height: 1; }

  .ci-crop-shape-chevron {
    display: flex;
    width: 14px;
    height: 14px;
    margin-left: auto;
    transition: transform var(--ci-crop-transition);
  }
  .ci-crop-shape-chevron svg { width: 100%; height: 100%; display: block; }

  :host([open]) .ci-crop-shape-chevron {
    transform: rotate(180deg);
  }

  .ci-crop-shape-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    /* Size to the widest option + orientation toggle. Clamp to avoid
       spilling off the viewport on very narrow screens. */
    width: max-content;
    min-width: 88px;
    max-width: min(92vw, 200px);
    max-height: min(55vh, 360px);
    padding: 4px;
    /* Barely-there grey tint with translucency so the panel picks up
       whatever sits behind it (image, dark overlay, etc.) without reading
       as a solid white box. backdrop-filter blur keeps text crisp on
       busy backgrounds. */
    background: var(--ci-crop-dropdown-bg);
    border: 1px solid var(--ci-crop-border);
    border-radius: var(--ci-crop-radius-lg, 8px);
    box-shadow: var(--ci-crop-dropdown-shadow);
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    display: flex;
    flex-direction: column;
    z-index: 100;
    opacity: 0;
    transform: translateY(6px) scale(0.96);
    pointer-events: none;
    transition: opacity 120ms ease-in, transform 120ms ease-in;
  }

  /* Orientation toggle — naked icon-only buttons centered at the top.
     No border, no background: only the rectangle SVG is visible. Active
     state is signalled by the icon's color (text) vs. inactive (muted). */
  .ci-crop-shape-orient {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .ci-crop-shape-orient-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 32px;
    padding: 0;
    background: transparent;
    color: var(--ci-crop-text-muted);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: color var(--ci-crop-transition);
  }
  .ci-crop-shape-orient-btn:hover {
    color: var(--ci-crop-text-secondary);
  }
  .ci-crop-shape-orient-btn.is-active {
    color: var(--ci-crop-text-secondary);
  }
  .ci-crop-shape-orient-btn svg {
    width: 24px;
    height: 24px;
    /* display:block kills SVG's default baseline drop (inline elements sit
       on the text baseline, leaving a few sub-pixels of descender space at
       the bottom — enough to push a tightly-fitted icon visibly off-center).
       The -1px translate is optical correction: both Lucide monitor (stand
       under the screen) and smartphone (home-indicator dot near the bottom)
       carry visual weight below their geometric centre. */
    display: block;
    transform: translateY(-1px);
  }

  .ci-crop-shape-list {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .ci-crop-shape-list::-webkit-scrollbar {
    width: 4px;
  }
  .ci-crop-shape-list::-webkit-scrollbar-thumb {
    background: var(--ci-crop-border);
    border-radius: 2px;
  }

  :host([open]) .ci-crop-shape-dropdown {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    transition: opacity 220ms cubic-bezier(0.34, 1.2, 0.64, 1),
                transform 220ms cubic-bezier(0.34, 1.2, 0.64, 1);
  }

  .ci-crop-shape-option {
    display: flex;
    align-items: center;
    gap: 8px;
    /* Stretch to the dropdown's resolved (content-sized) width so all
       rows share the same left edge + hover highlight. */
    width: 100%;
    padding: 5px 10px;
    height: 30px;
    background: transparent;
    color: var(--ci-crop-text-secondary);
    border: none;
    border-radius: var(--ci-crop-radius-sm, 4px);
    cursor: pointer;
    font-family: var(--ci-crop-font);
    font-size: 14px;
    font-weight: 500;
    text-align: left;
    transition: background var(--ci-crop-transition), color var(--ci-crop-transition);
  }

  .ci-crop-shape-option:hover {
    background: var(--ci-crop-dropdown-hover);
    color: var(--ci-crop-primary);
  }

  .ci-crop-shape-option:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: -2px;
  }

  .ci-crop-shape-option--active {
    background: var(--ci-crop-primary-bg);
    color: var(--ci-crop-primary);
  }

  .ci-crop-shape-option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    color: var(--ci-crop-text-secondary);
    flex-shrink: 0;
  }
  .ci-crop-shape-option-icon svg { width: 100%; height: 100%; display: block; }
  .ci-crop-shape-option--active .ci-crop-shape-option-icon { color: var(--ci-crop-primary); }

  @media (max-width: 768px) {
    /* Drop label + chevron and shrink to a square icon-only pill so
       the shape icon sits dead-center. The base 84px min-width was
       sized for the desktop "[icon] Aspect 16:9 ▾" layout and leaves
       empty pill space on the right once those pieces are hidden. */
    .ci-crop-shape-trigger-label { display: none; }
    .ci-crop-shape-chevron { display: none; }
    .ci-crop-shape-trigger {
      min-width: 0;
      width: 36px;
      padding: 0;
      gap: 0;
      justify-content: center;
    }
  }

  /* Narrow editor: drop the textual label + chevron so the trigger
     reduces to an icon-only 30×30 capsule that matches the rest of
     the compact left-rail toolbar. Anchor the dropdown to the left
     edge since the trigger now lives in the left column. Container
     query keyed off the sfxcrop named container so a narrow editor on
     a wide desktop also collapses. */
  @container sfxcrop (max-width: 760px) {
    /* Label/chevron also need hiding when only the editor (not viewport)
       is narrow — the 768px @media above only triggers on small viewports. */
    .ci-crop-shape-trigger-label { display: none; }
    .ci-crop-shape-chevron { display: none; }
    .ci-crop-shape-trigger {
      min-width: 0;
      width: 30px;
      height: 30px;
      padding: 0;
      gap: 0;
      justify-content: center;
    }
    /* Shrink the icon SLOT (not just the SVG) and center its contents,
       so the 16×16 SVG sits dead-center inside the 30×30 trigger. The
       base .ci-crop-shape-trigger-icon is 20×20 with display:flex but
       no justify/align — leaving a 16×16 SVG inside top-left aligned. */
    .ci-crop-shape-trigger-icon {
      width: 16px;
      height: 16px;
      align-items: center;
      justify-content: center;
    }
    .ci-crop-shape-trigger svg {
      width: 16px;
      height: 16px;
    }
    /* Fixed variant: match the toolbar's uniform 40×40 round icon buttons. */
    :host([variant="fixed"]) .ci-crop-shape-trigger {
      width: 40px;
      height: 40px;
    }
    /* Classic left-rail only: the trigger sits in the vertical rail, so the
       dropdown opens to the SIDE (right of the trigger). Excluded from the
       fixed variant — there the toolbar is a horizontal top bar, so the menu
       must keep the default downward opening (below the trigger) to avoid
       running off the screen edge. */
    :host(:not([variant="fixed"])) .ci-crop-shape-dropdown {
      right: auto;
      left: calc(100% + 6px);
      top: auto;
      bottom: -30px;
      transform: translateY(6px) scale(0.96);
    }
    :host(:not([variant="fixed"])[open]) .ci-crop-shape-dropdown {
      transform: translateY(0) scale(1);
    }
  }
`;
