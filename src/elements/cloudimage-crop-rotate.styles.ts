import { css } from 'lit';

/**
 * Fine-rotation ruler — always visible inline in the toolbar. Dotted tick
 * marks scroll under a centered indicator with the degree readout below.
 */
export const sfxCropRotateStyles = css`
  :host {
    /* Inline-flex so the host doesn't take toolbar space — the actual ruler
       below uses position:fixed and anchors to the canvas bottom-center via
       createPopoverAnchor, exactly where the legacy popover lived. */
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .ci-crop-rotate-root {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ci-crop-rotate-popover {
    position: fixed;
    top: var(--ci-crop-popover-top, 50%);
    left: var(--ci-crop-popover-left, 50%);
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    pointer-events: auto;
    white-space: nowrap;
    z-index: 10;
  }

  /* Ruler viewport — fixed width, overflow clipped. Ticks scroll inside. */
  .ci-crop-rotate-ruler {
    position: relative;
    width: var(--ruler-w, 260px);
    height: 30px;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .ci-crop-rotate-ruler.is-dragging { cursor: grabbing; }
  .ci-crop-rotate-ruler:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Tick strip — absolutely positioned ticks, the whole strip is
     translated along X in sync with the current value. */
  .ci-crop-rotate-ticks {
    position: absolute;
    top: 50%;
    left: 0;
    height: 100%;
    will-change: transform;
    /* Dark halo wrapping every tick so the white ink stays legible over a
       bright photo. Applied to the strip so all ticks share one shadow pass. */
    filter:
      drop-shadow(0 0 1px var(--ci-crop-ruler-halo, oklch(0 0 0 / 0.85)))
      drop-shadow(0 0 2px var(--ci-crop-ruler-halo, oklch(0 0 0 / 0.85)));
  }

  .ci-crop-rotate-tick {
    position: absolute;
    top: 50%;
    width: 1px;
    height: 8px;
    margin-left: -0.5px;
    margin-top: -4px;
    border-radius: 0.5px;
    background: var(--ci-crop-ruler-ink, var(--ci-crop-text));
    opacity: 0.9;
  }
  .ci-crop-rotate-tick--major {
    width: 1px;
    height: 12px;
    margin-left: -0.5px;
    margin-top: -6px;
    opacity: 1;
  }

  /* Fixed center indicator — single vertical line, slightly taller than ticks. */
  .ci-crop-rotate-indicator {
    position: absolute;
    top: calc(50% + 4px);
    height: 16px;
    left: 50%;
    width: 4px;
    margin-left: -2px;
    background: var(--ci-crop-ruler-ink, var(--ci-crop-text));
    border-radius: 2px;
    pointer-events: none;
    /* Same dark halo as the ticks so the centre marker stays visible. */
    filter:
      drop-shadow(0 0 1px var(--ci-crop-ruler-halo, oklch(0 0 0 / 0.85)))
      drop-shadow(0 0 2px var(--ci-crop-ruler-halo, oklch(0 0 0 / 0.85)));
  }

  .ci-crop-rotate-value {
    font-size: 14px;
    font-weight: 400;
    color: var(--ci-crop-ruler-ink, var(--ci-crop-text));
    text-align: center;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.2px;
    /* Dark halo so the degree readout reads over both bright and dark photos. */
    text-shadow:
      0 0 2px var(--ci-crop-ruler-halo, oklch(0 0 0 / 0.85)),
      0 1px 2px var(--ci-crop-ruler-halo, oklch(0 0 0 / 0.85));
  }

  @media (max-width: 768px) {
    .ci-crop-rotate-ruler { width: 220px; height: 22px; }
    .ci-crop-rotate-tick { height: 6px; margin-top: -3px; }
    .ci-crop-rotate-tick--major { height: 9px; margin-top: -4.5px; }
    .ci-crop-rotate-indicator {
      top: calc(50% + 3px);
      height: 12px;
      width: 3px;
      margin-left: -1.5px;
    }
    .ci-crop-rotate-value { font-size: 12px; }
    .ci-crop-rotate-popover {
      transform: translateX(-50%) translateY(24px);
    }
  }
  @media (max-width: 480px) {
    .ci-crop-rotate-ruler { width: 180px; height: 20px; }
    .ci-crop-rotate-tick { height: 5px; margin-top: -2.5px; }
    .ci-crop-rotate-tick--major { height: 8px; margin-top: -4px; }
    .ci-crop-rotate-indicator {
      top: calc(50% + 2px);
      height: 10px;
    }
    .ci-crop-rotate-value { font-size: 11px; }
    .ci-crop-rotate-popover {
      transform: translateX(-50%) translateY(30px);
    }
  }

  /* Narrow editor — make the ruler more compact when the toolbar
     collapses into the vertical left rail. */
  @container sfxcrop (max-width: 760px) {
    .ci-crop-rotate-ruler { width: 140px; height: 18px; }
    .ci-crop-rotate-tick { height: 5px; margin-top: -2.5px; }
    .ci-crop-rotate-tick--major { height: 8px; margin-top: -4px; }
    .ci-crop-rotate-indicator {
      top: calc(50% + 2px);
      height: 10px;
      width: 3px;
      margin-left: -1.5px;
    }
    .ci-crop-rotate-value { font-size: 11px; }
  }
`;
