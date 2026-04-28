import { css } from 'lit';

/**
 * Design tokens — matched 1:1 with `@scaleflex/uploader`'s `--sfx-up-*`
 * palette so a host page that theme-embeds both components inherits a
 * consistent Scaleflex look. Override any token from light DOM, e.g.
 * `<sfx-crop style="--sfx-cr-primary:#ff3366">`.
 *
 * Light is the default (matches uploader's single theme); `theme="dark"`
 * remains available for consumers that want a darker canvas surround.
 * Tokens cascade through shadow boundaries via CSS custom-property
 * inheritance, so sub-elements never redeclare them.
 */
export const designTokens = css`
  :host {
    /* Palette (Scaleflex light) */
    --sfx-cr-primary: #2563eb;
    --sfx-cr-primary-hover: #1d4ed8;
    --sfx-cr-primary-mid: #3b82f6;
    --sfx-cr-primary-bg: #eff6ff;
    --sfx-cr-primary-glow: rgba(37, 99, 235, 0.18);

    --sfx-cr-success: #16a34a;
    --sfx-cr-error: #dc2626;

    --sfx-cr-text: #1e293b;
    --sfx-cr-text-secondary: #475569;
    --sfx-cr-text-muted: #94a3b8;

    --sfx-cr-border: #e8edf5;
    --sfx-cr-border-light: #f1f5f9;

    --sfx-cr-bg: #ffffff;
    --sfx-cr-surface: #f8fafc;
    --sfx-cr-canvas-bg: #fafbfc;
    /* Dimming overlay for pixels outside the crop rect. Light theme uses a
       very soft, near-white tint so the whole surround stays bright; dark
       theme keeps the classic black dim for contrast against the photo. */
    --sfx-cr-overlay-color: rgba(255, 255, 255, 0.72);
    /* Crop frame + handle colors, theme-aware so the rectangle reads
       against both a washed-out light background and a dimmed dark one. */
    --sfx-cr-frame-color: #1e293b;
    --sfx-cr-frame-shadow: rgba(255, 255, 255, 0.7);
    --sfx-cr-handle-fill: #1e293b;
    --sfx-cr-handle-stroke: rgba(255, 255, 255, 0.95);

    --sfx-cr-ring: oklch(0.578 0.198 268.129 / 0.7);
    --sfx-cr-shadow: rgba(0, 0, 0, 0.1);

    /* Derived — kept for internal reuse */
    --sfx-cr-toolbar-bg: rgba(255, 255, 255, 0.85);
    --sfx-cr-toolbar-color: var(--sfx-cr-text);
    --sfx-cr-toolbar-border: rgba(226, 232, 240, 0.6);
    --sfx-cr-toolbar-shadow: 0 2px 10px rgba(37, 99, 235, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
    --sfx-cr-btn-size: 36px;
    --sfx-cr-btn-radius: 6px;
    --sfx-cr-btn-hover-bg: var(--sfx-cr-primary-bg);
    --sfx-cr-btn-active-bg: rgba(37, 99, 235, 0.14);
    --sfx-cr-separator-color: var(--sfx-cr-border-light);
    --sfx-cr-slider-track: var(--sfx-cr-border);
    --sfx-cr-slider-fill: var(--sfx-cr-primary);
    --sfx-cr-slider-thumb: var(--sfx-cr-primary);
    --sfx-cr-dropdown-bg: #ffffff;
    --sfx-cr-dropdown-hover: var(--sfx-cr-primary-bg);
    --sfx-cr-dropdown-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
    --sfx-cr-zoom-bar-bg: rgba(255, 255, 255, 0.85);
    --sfx-cr-transition: 0.15s ease;
    --sfx-cr-font: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

    /* Outer card (when <sfx-crop> fills the host) */
    --sfx-cr-radius: 16px;
    --sfx-cr-card-shadow: 0 28px 80px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.06);
  }

  /* Dark variant — keeps the editor usable on dark demo pages while
     leaning on the same palette vocabulary. */
  :host([theme="dark"]) {
    --sfx-cr-text: #f1f5f9;
    --sfx-cr-text-secondary: #cbd5e1;
    --sfx-cr-text-muted: #94a3b8;

    --sfx-cr-border: rgba(255, 255, 255, 0.12);
    --sfx-cr-border-light: rgba(255, 255, 255, 0.08);

    --sfx-cr-bg: #0f172a;
    --sfx-cr-surface: #1e293b;
    --sfx-cr-canvas-bg: #0b1220;
    --sfx-cr-overlay-color: rgba(0, 0, 0, 0.55);
    --sfx-cr-frame-color: #ffffff;
    --sfx-cr-frame-shadow: rgba(0, 0, 0, 0.6);
    --sfx-cr-handle-fill: #ffffff;
    --sfx-cr-handle-stroke: rgba(0, 0, 0, 0.25);

    --sfx-cr-toolbar-bg: rgba(15, 23, 42, 0.85);
    --sfx-cr-toolbar-color: #f1f5f9;
    --sfx-cr-toolbar-border: rgba(255, 255, 255, 0.08);
    --sfx-cr-toolbar-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);

    --sfx-cr-btn-hover-bg: rgba(37, 99, 235, 0.22);
    --sfx-cr-btn-active-bg: rgba(37, 99, 235, 0.32);

    --sfx-cr-slider-track: rgba(255, 255, 255, 0.12);

    --sfx-cr-dropdown-bg: rgba(15, 23, 42, 0.98);
    --sfx-cr-dropdown-hover: rgba(37, 99, 235, 0.22);
    --sfx-cr-dropdown-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
    --sfx-cr-zoom-bar-bg: rgba(15, 23, 42, 0.85);

    --sfx-cr-card-shadow: 0 28px 80px rgba(0, 0, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.2);
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
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.35);
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
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.35);
  }
`;
