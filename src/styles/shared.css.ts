import { css } from 'lit';

/**
 * Design tokens — sourced from the @scaleflex/ui-tw kit
 * (packages/ui/src/styles/variables.css). Color values are exact OKLCH
 * copies of the kit's --background / --foreground / --primary / etc., so
 * a page that theme-embeds both <sfx-crop> and the ui-tw components
 * shares a single palette. Override any token from light DOM, e.g.
 * `<sfx-crop style="--sfx-cr-primary:oklch(0.6 0.18 280)">`.
 *
 * Light is the default; `theme="dark"` mirrors the kit's `:root.dark`.
 * Tokens cascade through shadow boundaries via CSS custom-property
 * inheritance, so sub-elements never redeclare them.
 */
export const designTokens = css`
  :host {
    /* Palette — light theme (matches ui-tw :root) */
    --sfx-cr-primary: oklch(0.578 0.198 268.129);
    --sfx-cr-primary-hover: oklch(0.5 0.198 268.129);
    --sfx-cr-primary-mid: oklch(0.62 0.198 268.129);
    --sfx-cr-primary-bg: oklch(0.578 0.198 268.129 / 0.07);
    --sfx-cr-primary-glow: oklch(0.578 0.198 268.129 / 0.18);

    --sfx-cr-success: oklch(0.637 0.17 151.295);
    --sfx-cr-error: oklch(0.577 0.215 27.325);

    --sfx-cr-text: oklch(0.37 0.022 248.413);
    --sfx-cr-text-secondary: oklch(53.03% 0.039 249.89);
    --sfx-cr-text-muted: oklch(0.685 0.033 249.82);
    /* Fine-tilt ruler ink. Light theme deepens it well past --sfx-cr-text so
       the dotted ticks read against a bright/washed photo; dark theme reuses
       the standard light text. */
    --sfx-cr-ruler-ink: oklch(0.24 0.02 248.413);

    --sfx-cr-border: oklch(92.86% 0.009 247.92);
    --sfx-cr-border-light: oklch(0.974 0.006 239.819);

    --sfx-cr-bg: oklch(1 0 0);
    --sfx-cr-surface: oklch(0.974 0.006 239.819);
    --sfx-cr-canvas-bg: oklch(0.974 0.006 239.819);
    /* Dimming overlay for pixels outside the crop rect. Light theme uses a
       very soft, near-white tint so the whole surround stays bright; dark
       theme keeps the classic black dim for contrast against the photo. */
    --sfx-cr-overlay-color: oklch(1 0 0 / 0.52);
    /* Crop frame + handle colors, theme-aware so the rectangle reads
       against both a washed-out light background and a dimmed dark one. */
    --sfx-cr-frame-color: oklch(0.37 0.022 248.413);
    --sfx-cr-frame-shadow: oklch(1 0 0 / 0.7);
    --sfx-cr-handle-fill: oklch(0.37 0.022 248.413);
    --sfx-cr-handle-stroke: oklch(1 0 0 / 0.95);

    --sfx-cr-ring: oklch(0.578 0.198 268.129 / 0.7);
    --sfx-cr-shadow: oklch(26.18% 0.024 256.43 / 0.1);

    /* Derived — kept for internal reuse */
    --sfx-cr-toolbar-bg: oklch(1 0 0 / 0.85);
    --sfx-cr-toolbar-color: var(--sfx-cr-text);
    --sfx-cr-toolbar-border: oklch(92.86% 0.009 247.92 / 0.6);
    /* shadow-sm + soft primary tint */
    --sfx-cr-toolbar-shadow: 0 1px 3px 0 oklch(0 0 0 / 0.1), 0 1px 2px -1px oklch(0 0 0 / 0.1);
    --sfx-cr-btn-size: 36px;
    --sfx-cr-btn-radius: 6px;
    --sfx-cr-btn-hover-bg: var(--sfx-cr-primary-bg);
    --sfx-cr-btn-active-bg: oklch(0.578 0.198 268.129 / 0.14);
    --sfx-cr-separator-color: var(--sfx-cr-border-light);
    --sfx-cr-slider-track: var(--sfx-cr-border);
    --sfx-cr-slider-fill: var(--sfx-cr-primary);
    --sfx-cr-slider-thumb: var(--sfx-cr-primary);
    /* Translucent so the dropdown picks up whatever sits behind it
       (image, overlay) when paired with backdrop-filter. */
    --sfx-cr-dropdown-bg: oklch(0.974 0.006 239.819 / 0.8);
    --sfx-cr-dropdown-hover: var(--sfx-cr-primary-bg);
    /* shadow-md + shadow-lg blend */
    --sfx-cr-dropdown-shadow: 0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1);
    --sfx-cr-zoom-bar-bg: oklch(1 0 0 / 0.85);
    --sfx-cr-transition: 0.15s ease;
    --sfx-cr-font: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

    /* Border-radius scale — mirrors ui-tw --radius-sm/md/lg/xl */
    --sfx-cr-radius-sm: 4px;
    --sfx-cr-radius-md: 6px;
    --sfx-cr-radius-lg: 8px;
    --sfx-cr-radius-xl: 12px;
    /* Outer card (when <sfx-crop> fills the host) */
    --sfx-cr-radius: var(--sfx-cr-radius-xl);
    --sfx-cr-card-shadow: 0 28px 80px oklch(0 0 0 / 0.2), 0 4px 16px oklch(0 0 0 / 0.06);
  }

  /* Dark variant — mirrors ui-tw :root.dark. */
  :host([theme="dark"]) {
    --sfx-cr-primary: oklch(0.6 0.2 268.129);
    --sfx-cr-primary-hover: oklch(0.55 0.2 268.129);
    --sfx-cr-primary-mid: oklch(0.65 0.2 268.129);
    --sfx-cr-primary-bg: oklch(0.6 0.2 268.129 / 0.07);
    --sfx-cr-primary-glow: oklch(0.6 0.2 268.129 / 0.22);

    --sfx-cr-success: oklch(0.6 0.2 154.83);
    --sfx-cr-error: oklch(0.55 0.2 27.325);

    --sfx-cr-text: oklch(0.95 0.01 264.55);
    --sfx-cr-text-secondary: oklch(0.9 0.01 264.55);
    --sfx-cr-text-muted: oklch(0.75 0.01 249.82);
    /* Ruler keeps the standard light ink on the dark canvas. */
    --sfx-cr-ruler-ink: var(--sfx-cr-text);

    --sfx-cr-border: oklch(0.3 0.01 247.92);
    --sfx-cr-border-light: oklch(0.3 0.01 285);

    --sfx-cr-bg: oklch(0.13 0.027 261.692);
    --sfx-cr-surface: oklch(0.25 0.01 264.55);
    --sfx-cr-canvas-bg: oklch(0.13 0.027 261.692);
    --sfx-cr-overlay-color: oklch(0 0 0 / 0.35);
    --sfx-cr-frame-color: oklch(0.95 0.01 264.55);
    --sfx-cr-frame-shadow: oklch(0 0 0 / 0.6);
    --sfx-cr-handle-fill: oklch(0.95 0.01 264.55);
    --sfx-cr-handle-stroke: oklch(0 0 0 / 0.25);

    --sfx-cr-ring: oklch(0.6 0.2 268.129 / 0.7);
    --sfx-cr-shadow: oklch(0 0 0 / 0.2);

    --sfx-cr-toolbar-bg: oklch(0.13 0.027 261.692 / 0.85);
    --sfx-cr-toolbar-color: oklch(0.95 0.01 264.55);
    --sfx-cr-toolbar-border: oklch(0.3 0.01 247.92 / 0.5);
    --sfx-cr-toolbar-shadow: 0 4px 20px oklch(0 0 0 / 0.4);

    --sfx-cr-btn-hover-bg: oklch(0.6 0.2 268.129 / 0.22);
    --sfx-cr-btn-active-bg: oklch(0.6 0.2 268.129 / 0.32);

    --sfx-cr-slider-track: oklch(0.3 0.01 247.92);

    --sfx-cr-dropdown-bg: oklch(0.13 0.027 261.692 / 0.82);
    --sfx-cr-dropdown-hover: oklch(0.6 0.2 268.129 / 0.22);
    --sfx-cr-dropdown-shadow: 0 10px 15px -3px oklch(0 0 0 / 0.5), 0 4px 6px -4px oklch(0 0 0 / 0.3);
    --sfx-cr-zoom-bar-bg: oklch(0.13 0.027 261.692 / 0.85);

    --sfx-cr-card-shadow: 0 28px 80px oklch(0 0 0 / 0.55), 0 4px 16px oklch(0 0 0 / 0.2);
  }
`;

export const baseStyles = css`
  .sfx-cr-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    :host, :host *, :host *::before, :host *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
`;

export const spinKeyframes = css`
  @keyframes sfx-cr-spin { to { transform: rotate(360deg); } }
`;

export const toolbarEnterKeyframes = css`
  @keyframes sfx-cr-toolbar-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const zoomEnterKeyframes = css`
  @keyframes sfx-cr-zoom-enter {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`;

export const modalInKeyframes = css`
  @keyframes sfx-cr-card-in {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

/** Shared slider-thumb styling used by zoom + rotate inputs. */
export const sliderThumbStyles = css`
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--sfx-cr-slider-thumb);
    cursor: pointer;
    box-shadow: 0 1px 4px var(--sfx-cr-primary-glow);
    transition: transform 150ms ease, box-shadow 150ms ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 5px var(--sfx-cr-primary-glow);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--sfx-cr-slider-thumb);
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 4px var(--sfx-cr-primary-glow);
  }
`;
