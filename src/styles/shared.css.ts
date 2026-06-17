import { css } from 'lit';

/**
 * Design tokens — sourced from the @scaleflex/ui-tw kit
 * (packages/ui/src/styles/variables.css). Color values are exact OKLCH
 * copies of the kit's --background / --foreground / --primary / etc., so
 * a page that theme-embeds both <cloudimage-crop> and the ui-tw components
 * shares a single palette. Override any token from light DOM, e.g.
 * `<cloudimage-crop style="--ci-crop-primary:oklch(0.6 0.18 280)">`.
 *
 * Light is the default; `theme="dark"` mirrors the kit's `:root.dark`.
 * Tokens cascade through shadow boundaries via CSS custom-property
 * inheritance, so sub-elements never redeclare them.
 */
export const designTokens = css`
  :host {
    /* Palette — light theme (matches ui-tw :root) */
    --ci-crop-primary: oklch(0.578 0.198 268.129);
    --ci-crop-primary-hover: oklch(0.5 0.198 268.129);
    --ci-crop-primary-mid: oklch(0.62 0.198 268.129);
    --ci-crop-primary-bg: oklch(0.578 0.198 268.129 / 0.07);
    --ci-crop-primary-glow: oklch(0.578 0.198 268.129 / 0.18);

    --ci-crop-success: oklch(0.637 0.17 151.295);
    --ci-crop-error: oklch(0.577 0.215 27.325);

    --ci-crop-text: oklch(0.37 0.022 248.413);
    --ci-crop-text-secondary: oklch(53.03% 0.039 249.89);
    --ci-crop-text-muted: oklch(0.685 0.033 249.82);
    /* Fine-tilt ruler ink + halo. The ruler floats directly over the photo,
       whose brightness is unknown, so its colour can't track the theme. We
       render a bright (near-white) core wrapped in a dark halo: the white core
       reads over dark images, the dark halo reads over bright ones — the same
       trick subtitles use to stay legible over arbitrary footage. */
    --ci-crop-ruler-ink: oklch(1 0 0);
    --ci-crop-ruler-halo: oklch(0 0 0 / 0.85);

    --ci-crop-border: oklch(92.86% 0.009 247.92);
    --ci-crop-border-light: oklch(0.974 0.006 239.819);

    --ci-crop-bg: oklch(1 0 0);
    --ci-crop-surface: oklch(0.974 0.006 239.819);
    --ci-crop-canvas-bg: oklch(0.974 0.006 239.819);
    /* Dimming overlay for pixels outside the crop rect. Light theme uses a
       very soft, near-white tint so the whole surround stays bright; dark
       theme keeps the classic black dim for contrast against the photo. */
    --ci-crop-overlay-color: oklch(1 0 0 / 0.52);
    /* Crop frame + handle colors, theme-aware so the rectangle reads
       against both a washed-out light background and a dimmed dark one. */
    --ci-crop-frame-color: oklch(0.37 0.022 248.413);
    --ci-crop-frame-shadow: oklch(1 0 0 / 0.7);
    --ci-crop-handle-fill: oklch(0.37 0.022 248.413);
    --ci-crop-handle-stroke: oklch(1 0 0 / 0.95);

    --ci-crop-ring: oklch(0.578 0.198 268.129 / 0.7);
    --ci-crop-shadow: oklch(26.18% 0.024 256.43 / 0.1);

    /* Derived — kept for internal reuse */
    --ci-crop-toolbar-bg: oklch(1 0 0 / 0.85);
    --ci-crop-toolbar-color: var(--ci-crop-text);
    --ci-crop-toolbar-border: oklch(92.86% 0.009 247.92 / 0.6);
    /* shadow-sm + soft primary tint */
    --ci-crop-toolbar-shadow: 0 1px 3px 0 oklch(0 0 0 / 0.1), 0 1px 2px -1px oklch(0 0 0 / 0.1);
    --ci-crop-btn-size: 36px;
    --ci-crop-btn-radius: 6px;
    --ci-crop-btn-hover-bg: var(--ci-crop-primary-bg);
    --ci-crop-btn-active-bg: oklch(0.578 0.198 268.129 / 0.14);
    --ci-crop-separator-color: var(--ci-crop-border-light);
    --ci-crop-slider-track: var(--ci-crop-border);
    --ci-crop-slider-fill: var(--ci-crop-primary);
    --ci-crop-slider-thumb: var(--ci-crop-primary);
    /* Translucent so the dropdown picks up whatever sits behind it
       (image, overlay) when paired with backdrop-filter. */
    --ci-crop-dropdown-bg: oklch(0.974 0.006 239.819 / 0.8);
    --ci-crop-dropdown-hover: var(--ci-crop-primary-bg);
    /* shadow-md + shadow-lg blend */
    --ci-crop-dropdown-shadow: 0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1);
    --ci-crop-zoom-bar-bg: oklch(1 0 0 / 0.85);
    --ci-crop-transition: 0.15s ease;
    --ci-crop-font: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

    /* Border-radius scale — mirrors ui-tw --radius-sm/md/lg/xl */
    --ci-crop-radius-sm: 4px;
    --ci-crop-radius-md: 6px;
    --ci-crop-radius-lg: 8px;
    --ci-crop-radius-xl: 12px;
    /* Outer card (when <cloudimage-crop> fills the host) */
    --ci-crop-radius: var(--ci-crop-radius-xl);
    --ci-crop-card-shadow: 0 28px 80px oklch(0 0 0 / 0.2), 0 4px 16px oklch(0 0 0 / 0.06);
  }

  /* Dark variant — mirrors ui-tw :root.dark. */
  :host([theme="dark"]) {
    --ci-crop-primary: oklch(0.6 0.2 268.129);
    --ci-crop-primary-hover: oklch(0.55 0.2 268.129);
    --ci-crop-primary-mid: oklch(0.65 0.2 268.129);
    --ci-crop-primary-bg: oklch(0.6 0.2 268.129 / 0.07);
    --ci-crop-primary-glow: oklch(0.6 0.2 268.129 / 0.22);

    --ci-crop-success: oklch(0.6 0.2 154.83);
    --ci-crop-error: oklch(0.55 0.2 27.325);

    --ci-crop-text: oklch(0.95 0.01 264.55);
    --ci-crop-text-secondary: oklch(0.9 0.01 264.55);
    --ci-crop-text-muted: oklch(0.75 0.01 249.82);
    /* Ruler keeps the white core + dark halo over the photo (see light theme);
       --ci-crop-ruler-halo is inherited from the base :host. */
    --ci-crop-ruler-ink: oklch(1 0 0);

    --ci-crop-border: oklch(0.3 0.01 247.92);
    --ci-crop-border-light: oklch(0.3 0.01 285);

    --ci-crop-bg: oklch(0.13 0.027 261.692);
    --ci-crop-surface: oklch(0.25 0.01 264.55);
    --ci-crop-canvas-bg: oklch(0.13 0.027 261.692);
    --ci-crop-overlay-color: oklch(0 0 0 / 0.35);
    --ci-crop-frame-color: oklch(0.95 0.01 264.55);
    --ci-crop-frame-shadow: oklch(0 0 0 / 0.6);
    --ci-crop-handle-fill: oklch(0.95 0.01 264.55);
    --ci-crop-handle-stroke: oklch(0 0 0 / 0.25);

    --ci-crop-ring: oklch(0.6 0.2 268.129 / 0.7);
    --ci-crop-shadow: oklch(0 0 0 / 0.2);

    --ci-crop-toolbar-bg: oklch(0.13 0.027 261.692 / 0.85);
    --ci-crop-toolbar-color: oklch(0.95 0.01 264.55);
    --ci-crop-toolbar-border: oklch(0.3 0.01 247.92 / 0.5);
    --ci-crop-toolbar-shadow: 0 4px 20px oklch(0 0 0 / 0.4);

    --ci-crop-btn-hover-bg: oklch(0.6 0.2 268.129 / 0.22);
    --ci-crop-btn-active-bg: oklch(0.6 0.2 268.129 / 0.32);

    --ci-crop-slider-track: oklch(0.3 0.01 247.92);

    --ci-crop-dropdown-bg: oklch(0.13 0.027 261.692 / 0.82);
    --ci-crop-dropdown-hover: oklch(0.6 0.2 268.129 / 0.22);
    --ci-crop-dropdown-shadow: 0 10px 15px -3px oklch(0 0 0 / 0.5), 0 4px 6px -4px oklch(0 0 0 / 0.3);
    --ci-crop-zoom-bar-bg: oklch(0.13 0.027 261.692 / 0.85);

    --ci-crop-card-shadow: 0 28px 80px oklch(0 0 0 / 0.55), 0 4px 16px oklch(0 0 0 / 0.2);
  }
`;

export const baseStyles = css`
  .ci-crop-sr-only {
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
  @keyframes ci-crop-spin { to { transform: rotate(360deg); } }
`;

export const toolbarEnterKeyframes = css`
  @keyframes ci-crop-toolbar-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const zoomEnterKeyframes = css`
  @keyframes ci-crop-zoom-enter {
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
  @keyframes ci-crop-card-in {
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
    background: var(--ci-crop-slider-thumb);
    cursor: pointer;
    box-shadow: 0 1px 4px var(--ci-crop-primary-glow);
    transition: transform 150ms ease, box-shadow 150ms ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 5px var(--ci-crop-primary-glow);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--ci-crop-slider-thumb);
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 4px var(--ci-crop-primary-glow);
  }
`;
