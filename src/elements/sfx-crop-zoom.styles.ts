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

  .sfx-cr-zoom-root {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Trigger — visually matches the other toolbar icon buttons. */
  .sfx-cr-zoom-trigger {
    width: 44px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: transparent;
    color: var(--sfx-cr-text-secondary);
    border: 1px solid transparent;
    border-radius: 999px;
    cursor: pointer;
    transition:
      border-color var(--sfx-cr-transition),
      color var(--sfx-cr-transition),
      transform var(--sfx-cr-transition);
  }
  .sfx-cr-zoom-trigger:hover {
    border-color: var(--sfx-cr-primary);
    color: var(--sfx-cr-primary);
    transform: translateY(-1px);
  }
  .sfx-cr-zoom-trigger:active {
    transform: translateY(0) scale(0.96);
  }
  .sfx-cr-zoom-trigger:focus-visible {
    outline: 2px solid var(--sfx-cr-ring);
    outline-offset: 2px;
  }
  .sfx-cr-zoom-trigger svg {
    width: 20px;
    height: 20px;
    display: block;
  }

  :host([open]) .sfx-cr-zoom-trigger {
    color: var(--sfx-cr-primary);
  }

  /* Popover — transparent, floats above the trigger. */
  .sfx-cr-zoom-popover {
    position: fixed;
    top: var(--sfx-cr-popover-top, 50%);
    left: var(--sfx-cr-popover-left, 50%);
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

  :host([open]) .sfx-cr-zoom-popover {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
    pointer-events: auto;
    transition: opacity 220ms cubic-bezier(0.34, 1.2, 0.64, 1),
                transform 220ms cubic-bezier(0.34, 1.2, 0.64, 1);
  }

  .sfx-cr-zoom-ruler {
    position: relative;
    width: var(--ruler-w, 260px);
    height: 30px;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .sfx-cr-zoom-ruler.is-dragging { cursor: grabbing; }
  .sfx-cr-zoom-ruler:focus-visible {
    outline: 2px solid var(--sfx-cr-ring);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .sfx-cr-zoom-ticks {
    position: absolute;
    top: 50%;
    left: 0;
    height: 100%;
    will-change: transform;
  }

  .sfx-cr-zoom-tick {
    position: absolute;
    top: 50%;
    width: 1px;
    height: 8px;
    margin-left: -0.5px;
    margin-top: -4px;
    border-radius: 0.5px;
    background: var(--sfx-cr-text);
    opacity: 0.55;
  }
  .sfx-cr-zoom-tick--major {
    width: 1px;
    height: 12px;
    margin-left: -0.5px;
    margin-top: -6px;
    opacity: 0.9;
  }

  .sfx-cr-zoom-indicator {
    position: absolute;
    top: calc(50% + 4px);
    height: 16px;
    left: 50%;
    width: 4px;
    margin-left: -2px;
    background: var(--sfx-cr-text);
    border-radius: 2px;
    pointer-events: none;
  }

  .sfx-cr-zoom-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--sfx-cr-text);
    text-align: center;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.2px;
  }
`;
