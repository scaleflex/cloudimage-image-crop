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

  /* Own dark pill — same skin as Reset/Rotate/Flip in
     cloudimage-crop-toolbar.styles.ts, kept as a separate pill rather than
     merged into one shared capsule. */
  .ci-crop-shape-trigger {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    min-width: 0;
    height: 36px;
    background: oklch(0 0 0 / 0.55);
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-family: var(--ci-crop-font);
    font-size: 14px;
    font-weight: 500;
    transition: background var(--ci-crop-transition);
    white-space: nowrap;
    letter-spacing: 0.1px;
  }

  .ci-crop-shape-trigger:hover {
    background: oklch(0 0 0 / 0.7);
  }

  .ci-crop-shape-trigger:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }

  .ci-crop-shape-trigger-label { line-height: 1; }

  .ci-crop-shape-chevron {
    display: flex;
    width: 14px;
    height: 14px;
    margin-left: auto;
    transition: transform var(--ci-crop-transition);
  }
  .ci-crop-shape-chevron svg { width: 100%; height: 100%; display: block; stroke-width: 1.5; }

  :host([open]) .ci-crop-shape-chevron {
    transform: rotate(180deg);
  }

  .ci-crop-shape-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    /* Size to the widest option + orientation toggle. Clamp width to avoid
       spilling off the viewport on very narrow screens. Clamp height to
       the crop box's own real height (100cqh, from the size container on
       <cloudimage-crop>'s :host — see cloudimage-crop.styles.ts), not just
       the viewport: a short, wide box (e.g. a 5:1 crop) can be far shorter
       than 55vh, and a viewport-only clamp let the list overflow past the
       box's bottom edge, where .ci-crop-container's overflow:clip cut it
       off. The 90px subtracted is the trigger's own top offset + height +
       gap + a small bottom margin — an approximation, not exact, but
       erring smaller only means slightly earlier scrolling, never clipping.
       --ci-crop-dropdown-room is the exact room under the trigger, measured
       on open (computeOpenSide). When set it REPLACES the 90px approximation
       (only a fallback now): exact room is right for a trigger wrapped onto
       a lower toolbar row, and doesn't waste height in a short box. */
    /* border-box: max-height must bound the WHOLE panel (padding + border
       included), or the measured room below is overshot by the padding. */
    box-sizing: border-box;
    width: max-content;
    min-width: 88px;
    max-width: min(92vw, 200px);
    max-height: min(55vh, 360px, var(--ci-crop-dropdown-room, calc(100cqh - 90px)));
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
  /* Chromium renders its default up/down step-arrow buttons on a custom
     ::-webkit-scrollbar unless explicitly hidden — otherwise a squeezed,
     genuinely-scrolling list (e.g. computeOpenSide() correctly staying
     'down' because there's truly no room to flip 'right' either) shows
     ugly native arrows that clash with this thin/borderless scrollbar. */
  .ci-crop-shape-list::-webkit-scrollbar-button {
    display: none;
    width: 0;
    height: 0;
  }

  :host([open]) .ci-crop-shape-dropdown {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    transition: opacity 220ms cubic-bezier(0.34, 1.2, 0.64, 1),
                transform 220ms cubic-bezier(0.34, 1.2, 0.64, 1);
  }

  /* open-side="right" — flips the dropdown to the trigger's right edge
     instead of below it, set by CloudimageCropShapesElement.computeOpenSide()
     only when there isn't enough room below (a short, wide box like a 5:1
     crop). Aligning top:0 with the trigger (rather than centering) lets it
     use nearly the box's FULL height instead of just "trigger to box
     bottom" — the entire point of flipping sideways in the first place. */
  :host([open-side="right"]) .ci-crop-shape-dropdown {
    top: 0;
    right: auto;
    left: calc(100% + 8px);
    /* --ci-crop-dropdown-room-right: measured from the trigger's TOP to the
       box bottom on open — 100cqh − 24px ignores where the trigger sits. */
    max-height: min(80vh, 420px, var(--ci-crop-dropdown-room-right, calc(100cqh - 24px)));
    transform: translateX(-6px) scale(0.96);
  }
  :host([open-side="right"][open]) .ci-crop-shape-dropdown {
    transform: translateX(0) scale(1);
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

  /* Narrow editor: drop the chevron to save room — the ratio label ("5:4")
     stays, since with no icon it's the only thing identifying this control
     among the other round icon buttons. Matches the toolbar's compact
     breakpoint in cloudimage-crop-toolbar.styles.ts exactly (same
     max-width), so the trigger lines up with Reset/Rotate/Flip in the same
     wrapped row. The dropdown keeps its normal downward-opening default —
     there's no side rail anymore for it to dodge. */
  @container sfxcrop (max-width: 640px) {
    .ci-crop-shape-chevron { display: none; }
    .ci-crop-shape-trigger {
      min-width: 0;
      height: 36px;
      padding: 0 12px;
      gap: 0;
    }
  }
`;
