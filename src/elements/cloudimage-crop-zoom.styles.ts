import { css } from 'lit';

/**
 * Zoom popover: ruler-style scrubber with dotted tick marks and a
 * centered indicator + percentage readout. No pill around the ruler —
 * ticks float transparently over the photo; only the percent value gets
 * a small glassy plate for readability.
 */
export const sfxCropZoomStyles = css`
  :host {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .ci-crop-zoom-root {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Trigger — visually matches the other toolbar icon buttons. */
  .ci-crop-zoom-trigger {
    width: 44px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: transparent;
    color: var(--ci-crop-text-secondary);
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;
    transition:
      border-color var(--ci-crop-transition),
      color var(--ci-crop-transition),
      transform var(--ci-crop-transition);
  }
  .ci-crop-zoom-trigger:hover {
    border-color: var(--ci-crop-primary);
    color: var(--ci-crop-primary);
    transform: translateY(-1px);
  }
  .ci-crop-zoom-trigger:active {
    transform: translateY(0) scale(0.96);
  }
  .ci-crop-zoom-trigger:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }
  .ci-crop-zoom-trigger svg {
    width: 20px;
    height: 20px;
    display: block;
  }

  :host([open]) .ci-crop-zoom-trigger {
    color: var(--ci-crop-primary);
  }

  /* Popover — transparent, floats above the trigger. */
  .ci-crop-zoom-popover {
    position: fixed;
    top: var(--ci-crop-popover-top, 50%);
    left: var(--ci-crop-popover-left, 50%);
    transform: translateX(-50%) translateY(6px) scale(0.98);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease-in, transform 120ms ease-in;
    white-space: nowrap;
    z-index: 10;
  }

  :host([open]) .ci-crop-zoom-popover {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
    pointer-events: auto;
    transition: opacity 220ms cubic-bezier(0.34, 1.2, 0.64, 1),
                transform 220ms cubic-bezier(0.34, 1.2, 0.64, 1);
  }

  .ci-crop-zoom-ruler {
    position: relative;
    width: var(--ruler-w, 260px);
    height: 30px;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .ci-crop-zoom-ruler.is-dragging { cursor: grabbing; }
  .ci-crop-zoom-ruler:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .ci-crop-zoom-ticks {
    position: absolute;
    top: 50%;
    left: 0;
    height: 100%;
    will-change: transform;
  }

  .ci-crop-zoom-tick {
    position: absolute;
    top: 50%;
    width: 1px;
    height: 8px;
    margin-left: -0.5px;
    margin-top: -4px;
    border-radius: 0.5px;
    background: var(--ci-crop-text);
    opacity: 0.55;
  }
  .ci-crop-zoom-tick--major {
    width: 1px;
    height: 12px;
    margin-left: -0.5px;
    margin-top: -6px;
    opacity: 0.9;
  }

  .ci-crop-zoom-indicator {
    position: absolute;
    top: calc(50% + 4px);
    height: 16px;
    left: 50%;
    width: 4px;
    margin-left: -2px;
    background: var(--ci-crop-text);
    border-radius: 2px;
    pointer-events: none;
  }

  .ci-crop-zoom-value {
    font-size: 14px;
    font-weight: 400;
    color: var(--ci-crop-text);
    text-align: center;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.2px;
  }

  @media (max-width: 768px) {
    /* Slimmer ruler + smaller readout on phones, mirroring the rotate
       popover. Push the popover down toward the canvas bottom edge so
       it doesn't sit in the middle of the photo. */
    .ci-crop-zoom-ruler { width: 220px; height: 22px; }
    .ci-crop-zoom-tick { height: 6px; margin-top: -3px; }
    .ci-crop-zoom-tick--major { height: 9px; margin-top: -4.5px; }
    .ci-crop-zoom-indicator {
      top: calc(50% + 3px);
      height: 12px;
      width: 3px;
      margin-left: -1.5px;
    }
    .ci-crop-zoom-value { font-size: 12px; }
    :host([open]) .ci-crop-zoom-popover {
      transform: translateX(-50%) translateY(24px) scale(1);
    }
  }
  @media (max-width: 480px) {
    .ci-crop-zoom-ruler { width: 180px; height: 20px; }
    .ci-crop-zoom-tick { height: 5px; margin-top: -2.5px; }
    .ci-crop-zoom-tick--major { height: 8px; margin-top: -4px; }
    .ci-crop-zoom-indicator {
      top: calc(50% + 2px);
      height: 10px;
    }
    .ci-crop-zoom-value { font-size: 11px; }
    :host([open]) .ci-crop-zoom-popover {
      transform: translateX(-50%) translateY(30px) scale(1);
    }
  }

  /* Narrow editor — match the compact 30×30 trigger sizing of the
     rest of the vertical left-rail toolbar. Container query so a
     narrow editor on a wide desktop also collapses. */
  @container sfxcrop (max-width: 600px) {
    .ci-crop-zoom-trigger {
      width: 30px;
      height: 30px;
    }
    .ci-crop-zoom-trigger svg {
      width: 16px;
      height: 16px;
    }
  }
`;
