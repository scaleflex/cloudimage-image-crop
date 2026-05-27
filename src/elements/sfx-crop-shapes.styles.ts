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

  .sfx-cr-shape-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    min-width: 84px;
    height: 36px;
    background: transparent;
    color: var(--sfx-cr-text-secondary);
    border: 1.5px solid var(--sfx-cr-border);
    border-radius: 50px;
    cursor: pointer;
    font-family: var(--sfx-cr-font);
    font-size: 14px;
    font-weight: 500;
    transition:
      background var(--sfx-cr-transition),
      border-color var(--sfx-cr-transition),
      color var(--sfx-cr-transition),
      transform var(--sfx-cr-transition),
      box-shadow var(--sfx-cr-transition);
    white-space: nowrap;
    letter-spacing: 0.1px;
  }

  /* Fixed variant: translucent pill so the trigger reads over the photo
     (no dimmed crop mask behind it). Plain background — no filter/transform. */
  :host([variant="fixed"]) .sfx-cr-shape-trigger {
    background: var(--sfx-cr-overlay-color);
  }

  .sfx-cr-shape-trigger:hover {
    border-color: var(--sfx-cr-primary);
    transform: translateY(-1px);
  }

  .sfx-cr-shape-trigger:focus-visible {
    outline: 2px solid var(--sfx-cr-ring);
    outline-offset: 2px;
  }

  .sfx-cr-shape-trigger-icon {
    display: flex;
    width: 20px;
    height: 20px;
  }
  .sfx-cr-shape-trigger-icon svg { width: 100%; height: 100%; display: block; }

  .sfx-cr-shape-trigger-label { line-height: 1; }

  .sfx-cr-shape-chevron {
    display: flex;
    width: 14px;
    height: 14px;
    margin-left: auto;
    transition: transform var(--sfx-cr-transition);
  }
  .sfx-cr-shape-chevron svg { width: 100%; height: 100%; display: block; }

  :host([open]) .sfx-cr-shape-chevron {
    transform: rotate(180deg);
  }

  .sfx-cr-shape-dropdown {
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
    background: var(--sfx-cr-dropdown-bg);
    border: 1px solid var(--sfx-cr-border);
    border-radius: var(--sfx-cr-radius-lg, 8px);
    box-shadow: var(--sfx-cr-dropdown-shadow);
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
  .sfx-cr-shape-orient {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .sfx-cr-shape-orient-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 32px;
    padding: 0;
    background: transparent;
    color: var(--sfx-cr-text-muted);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: color var(--sfx-cr-transition);
  }
  .sfx-cr-shape-orient-btn:hover {
    color: var(--sfx-cr-text-secondary);
  }
  .sfx-cr-shape-orient-btn.is-active {
    color: var(--sfx-cr-text-secondary);
  }
  .sfx-cr-shape-orient-btn svg {
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

  .sfx-cr-shape-list {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .sfx-cr-shape-list::-webkit-scrollbar {
    width: 4px;
  }
  .sfx-cr-shape-list::-webkit-scrollbar-thumb {
    background: var(--sfx-cr-border);
    border-radius: 2px;
  }

  :host([open]) .sfx-cr-shape-dropdown {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    transition: opacity 220ms cubic-bezier(0.34, 1.2, 0.64, 1),
                transform 220ms cubic-bezier(0.34, 1.2, 0.64, 1);
  }

  .sfx-cr-shape-option {
    display: flex;
    align-items: center;
    gap: 8px;
    /* Stretch to the dropdown's resolved (content-sized) width so all
       rows share the same left edge + hover highlight. */
    width: 100%;
    padding: 5px 10px;
    height: 30px;
    background: transparent;
    color: var(--sfx-cr-text-secondary);
    border: none;
    border-radius: var(--sfx-cr-radius-sm, 4px);
    cursor: pointer;
    font-family: var(--sfx-cr-font);
    font-size: 14px;
    font-weight: 500;
    text-align: left;
    transition: background var(--sfx-cr-transition), color var(--sfx-cr-transition);
  }

  .sfx-cr-shape-option:hover {
    background: var(--sfx-cr-dropdown-hover);
    color: var(--sfx-cr-primary);
  }

  .sfx-cr-shape-option:focus-visible {
    outline: 2px solid var(--sfx-cr-ring);
    outline-offset: -2px;
  }

  .sfx-cr-shape-option--active {
    background: var(--sfx-cr-primary-bg);
    color: var(--sfx-cr-primary);
  }

  .sfx-cr-shape-option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    color: var(--sfx-cr-text-secondary);
    flex-shrink: 0;
  }
  .sfx-cr-shape-option-icon svg { width: 100%; height: 100%; display: block; }
  .sfx-cr-shape-option--active .sfx-cr-shape-option-icon { color: var(--sfx-cr-primary); }

  @media (max-width: 768px) {
    /* Drop label + chevron and shrink to a square icon-only pill so
       the shape icon sits dead-center. The base 84px min-width was
       sized for the desktop "[icon] Aspect 16:9 ▾" layout and leaves
       empty pill space on the right once those pieces are hidden. */
    .sfx-cr-shape-trigger-label { display: none; }
    .sfx-cr-shape-chevron { display: none; }
    .sfx-cr-shape-trigger {
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
    .sfx-cr-shape-trigger-label { display: none; }
    .sfx-cr-shape-chevron { display: none; }
    .sfx-cr-shape-trigger {
      min-width: 0;
      width: 30px;
      height: 30px;
      padding: 0;
      gap: 0;
      justify-content: center;
    }
    /* Shrink the icon SLOT (not just the SVG) and center its contents,
       so the 16×16 SVG sits dead-center inside the 30×30 trigger. The
       base .sfx-cr-shape-trigger-icon is 20×20 with display:flex but
       no justify/align — leaving a 16×16 SVG inside top-left aligned. */
    .sfx-cr-shape-trigger-icon {
      width: 16px;
      height: 16px;
      align-items: center;
      justify-content: center;
    }
    .sfx-cr-shape-trigger svg {
      width: 16px;
      height: 16px;
    }
    /* Fixed variant: match the toolbar's uniform 40×40 round icon buttons. */
    :host([variant="fixed"]) .sfx-cr-shape-trigger {
      width: 40px;
      height: 40px;
    }
    /* Classic left-rail only: the trigger sits in the vertical rail, so the
       dropdown opens to the SIDE (right of the trigger). Excluded from the
       fixed variant — there the toolbar is a horizontal top bar, so the menu
       must keep the default downward opening (below the trigger) to avoid
       running off the screen edge. */
    :host(:not([variant="fixed"])) .sfx-cr-shape-dropdown {
      right: auto;
      left: calc(100% + 6px);
      top: auto;
      bottom: -30px;
      transform: translateY(6px) scale(0.96);
    }
    :host(:not([variant="fixed"])[open]) .sfx-cr-shape-dropdown {
      transform: translateY(0) scale(1);
    }
  }
`;
