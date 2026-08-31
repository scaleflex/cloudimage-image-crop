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
    /* Bottom-anchored, not top: keeps the block's bottom edge (the degree
       label) pinned a constant distance above the canvas edge regardless of
       how tall the ruler+label content currently is — see popover-anchor.ts. */
    bottom: var(--ci-crop-popover-bottom, 16px);
    left: var(--ci-crop-popover-left, 50%);
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    pointer-events: auto;
    white-space: nowrap;
    z-index: 10;

    /*
     * Single source of truth for every fluid size below (ruler, ticks,
     * indicator, label, gap) — defined here, on the common ancestor, so
     * .ci-crop-rotate-ruler and .ci-crop-rotate-value (siblings, not one
     * descended from the other) can both read it via inheritance.
     *
     * Hold-then-shrink, not shrink-the-whole-time: "100cqi - RULER_GUTTER"
     * only drops below the 260px ceiling once the editor box is narrower
     * than (260px + RULER_GUTTER) — until then the clamp() just returns the
     * ceiling, i.e. full size, however much the box shrinks. Only past that
     * point does the ruler actually start tracking the shrinking box
     * 1:1 (not a fraction of it, unlike the old "34cqi" rate), down to the
     * 140px floor (hit at 140px + RULER_GUTTER). RULER_GUTTER (116px) is
     * tuned so shrinking starts at ~376px editor-box width (260 + 116) —
     * the point past which the ruler is the one actually running out of
     * room, not a cosmetic shrink from the first pixel of drag.
     */
    --ruler-w: clamp(140px, 100cqi - 116px, 260px);
    /* 0 at the 140px floor, 1 at the 260px ceiling — every other fluid size
       below is this same progress mapped onto its own min..max range, so
       everything moves in lockstep and hits floor/ceiling at the same time.
       Divide by 120px (a LENGTH), not 120 (a bare number): length ÷ length
       is a unitless ratio; length ÷ number is still a length. Dividing by
       the bare number left --ruler-t as a length in disguise, which made
       every "--ruler-t * Npx" below (height, gap, font-size) a px² product
       — invalid at computed-value time, so those properties silently fell
       back to their initial value (height: auto), and since every child of
       .ci-crop-rotate-ruler is position:absolute (no auto-height
       contribution), the ruler collapsed to 0 height — ticks/indicator
       still there in the DOM, just clipped to nothing visible. */
    --ruler-t: calc((var(--ruler-w) - 140px) / 120px);
    gap: calc(2px + var(--ruler-t) * 2px);
  }

  /* Ruler viewport — overflow clipped, ticks scroll inside. */
  .ci-crop-rotate-ruler {
    position: relative;
    width: var(--ruler-w);
    height: calc(18px + var(--ruler-t) * 12px);
    --tick-h: calc(5px + var(--ruler-t) * 3px);
    --tick-h-major: calc(8px + var(--ruler-t) * 4px);
    --indicator-h: calc(10px + var(--ruler-t) * 6px);
    --indicator-w: calc(3px + var(--ruler-t) * 1px);
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
    height: var(--tick-h);
    margin-left: -0.5px;
    margin-top: calc(var(--tick-h) / -2);
    border-radius: 0.5px;
    background: var(--ci-crop-ruler-ink, var(--ci-crop-text));
    opacity: 0.9;
  }
  .ci-crop-rotate-tick--major {
    width: 1px;
    height: var(--tick-h-major);
    margin-left: -0.5px;
    margin-top: calc(var(--tick-h-major) / -2);
    opacity: 1;
  }

  /* Fixed center indicator — single vertical line, slightly taller than ticks. */
  .ci-crop-rotate-indicator {
    position: absolute;
    top: calc(50% + var(--indicator-h, 16px) / 4);
    height: var(--indicator-h);
    left: 50%;
    width: var(--indicator-w);
    margin-left: calc(var(--indicator-w) / -2);
    background: var(--ci-crop-ruler-ink, var(--ci-crop-text));
    border-radius: 2px;
    pointer-events: none;
    /* Same dark halo as the ticks so the centre marker stays visible. */
    filter:
      drop-shadow(0 0 1px var(--ci-crop-ruler-halo, oklch(0 0 0 / 0.85)))
      drop-shadow(0 0 2px var(--ci-crop-ruler-halo, oklch(0 0 0 / 0.85)));
  }

  .ci-crop-rotate-value {
    font-size: calc(11px + var(--ruler-t) * 3px);
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

  /* A genuinely short box (a very wide/thin crop held on a phone, e.g. a
     6:1 ratio in landscape) doesn't have room for BOTH the top toolbar row
     and this popover's ruler + degree label without the two overlapping.
     Dropping the label — the ruler ticks + drag gesture still work fine
     without it — is the cheapest way to reclaim enough height to stop that
     overlap, without touching the toolbar's own layout or hiding the
     ruler entirely (rotate-left still only does coarse 90° steps). */
  @container sfxcrop (max-height: 140px) {
    .ci-crop-rotate-value {
      display: none;
    }
  }
`;
