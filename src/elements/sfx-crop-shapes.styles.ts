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

  .sfx-cr-shape-trigger:hover {
    border-color: var(--sfx-cr-primary);
    color: var(--sfx-cr-primary);
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
    background: rgba(246, 247, 249, 0.8);
    border: 1px solid var(--sfx-cr-border);
    border-radius: 10px;
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

  :host-context([theme="dark"]) .sfx-cr-shape-dropdown,
  :host([data-theme="dark"]) .sfx-cr-shape-dropdown {
    /* Dark theme equivalent — keep the same translucent feel over the
       dimmed canvas. */
    background: rgba(20, 25, 38, 0.82);
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
    color: var(--sfx-cr-text);
  }
  .sfx-cr-shape-orient-btn.is-active {
    color: var(--sfx-cr-text);
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
    color: var(--sfx-cr-text);
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-family: var(--sfx-cr-font);
    font-size: 13.5px;
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
    color: var(--sfx-cr-text);
    flex-shrink: 0;
  }
  .sfx-cr-shape-option-icon svg { width: 100%; height: 100%; display: block; }
  .sfx-cr-shape-option--active .sfx-cr-shape-option-icon { color: var(--sfx-cr-primary); }

  @media (max-width: 768px) {
    .sfx-cr-shape-trigger-label { display: none; }
    .sfx-cr-shape-trigger { min-width: 0; padding: 8px 10px; }
  }
`;
