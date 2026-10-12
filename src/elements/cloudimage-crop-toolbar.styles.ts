import { css } from 'lit';

/**
 * Floating pill toolbar — mirrors the glassy source-pill row in
 * `@scaleflex/uploader`. The bar is centered horizontally above or below
 * the canvas with a translucent white background, backdrop blur, and a
 * soft shadow ring.
 */
export const sfxCropToolbarStyles = css`
  :host {
    position: absolute;
    top: 12px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 5;
    /* No "forwards" fill mode: with it, the finished animation's effect
       (opacity:1, its own "to" keyframe) keeps outranking the regular CSS
       cascade forever — including the opacity:0.25 below for
       [interacting], which a fill-mode:forwards animation on the SAME
       property silently wins over no matter its specificity. Dropping
       "forwards" hands control back to the plain opacity declarations
       the instant the 300ms intro finishes; since the animation's own
       endpoint already is opacity:1, matching the base rule below, there's
       no visible seam at the handoff. */
    animation: ci-crop-toolbar-enter 300ms ease;
    pointer-events: none;
    opacity: 1;
    transition: opacity 150ms ease;
  }

  :host([toolbar-position="bottom"]) {
    top: auto;
    bottom: 12px;
  }

  /* Dragging/resizing/panning the crop frame — fade every control
     (buttons + the nested rotate ruler, both descendants of :host, so one
     opacity here covers both) nearly all the way out so the photo
     underneath gets the user's full attention while their cursor is busy
     elsewhere. Not display:none / visibility:hidden: still technically
     there (a very faint outline), just out of the way — and no layout
     shift when it returns. Not fully 0 either — a totally invisible
     toolbar mid-drag reads as "the controls vanished," not "faded." */
  :host([interacting]) {
    opacity: 0.08;
  }

  /* Fixed variant: the editor box IS the crop frame, so the floating bar sits
     directly over the photo. Each button's own dark pill (below) already
     gives Reset / Rotate / Flip / Ratio their contrast regardless of
     variant, so no separate spacing/skin override is needed here — fixed
     uses the exact same gaps/padding as classic.

     IMPORTANT: no backdrop-filter / transform / filter on :host or any
     ancestor. Those create a containing block for position:fixed
     descendants, which would re-anchor the canvas-bottom ruler + shape
     popover (both fixed-positioned) to the bar and knock the 45-deg tilt
     ruler off-screen. */

  /* Primary "Done" action — pinned to the right edge of the toolbar strip,
     away from the centered control cluster. The host spans the full block
     width (left:0/right:0), so right:16px sits near the block's edge. */
  .ci-crop-done-btn {
    position: absolute;
    right: 16px;
    /* :host itself sits at top:12px (see :host above); the toolbar row's
       own 4px top padding puts its content at an absolute 16px from the
       crop box edge. This 4px is that SAME local offset (relative to
       :host, which is Done's containing block) so Done lines up with the
       toolbar row at that same absolute 16px — not top:50%+translateY
       (-50%), which centers against :host's content-shrunk height and can
       drift away from the row whenever that height isn't exactly 36px. */
    top: 4px;
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 18px;
    background: var(--ci-crop-primary);
    color: #fff;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    font-family: var(--ci-crop-font);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.1px;
    white-space: nowrap;
    box-shadow: var(--ci-crop-toolbar-shadow);
    transition: background var(--ci-crop-transition);
  }
  .ci-crop-done-btn:hover {
    background: var(--ci-crop-primary-hover);
  }
  .ci-crop-done-btn:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }

  /* Secondary "Cancel" — mirrors Done at the opposite (left) edge. A fixed
     neutral dark pill rather than a theme token: it overlays arbitrary photo
     content (any brightness, either theme), so it needs its own guaranteed
     contrast rather than inheriting a token that assumes a page background. */
  .ci-crop-cancel-btn {
    position: absolute;
    left: 16px;
    top: 4px;
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 18px;
    background: oklch(0 0 0 / 0.55);
    color: #fff;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    font-family: var(--ci-crop-font);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.1px;
    white-space: nowrap;
    box-shadow: var(--ci-crop-toolbar-shadow);
    transition: background var(--ci-crop-transition);
  }
  .ci-crop-cancel-btn:hover {
    background: oklch(0 0 0 / 0.7);
  }
  .ci-crop-cancel-btn:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }

  /* Cancel/Done render both an icon and a text label so the narrow-editor
     breakpoint (below) can swap to icon-only circles without a JS-driven
     state — just flip which span is visible. Text-label layout is the
     default. */
  .ci-crop-cancel-btn-icon,
  .ci-crop-done-btn-icon {
    display: none;
    width: 18px;
    height: 18px;
  }
  .ci-crop-cancel-btn-icon svg,
  .ci-crop-done-btn-icon svg {
    width: 100%;
    height: 100%;
    display: block;
    stroke-width: 1.5;
  }

  /* Hole-punch pattern: the toolbar host is pointer-transparent and
     individual interactive children below opt back in. Gaps between
     buttons fall through to the canvas — important when a crop handle
     ends up under the floating toolbar and the user wants to grab it.
     The rotate / zoom / shapes sub-elements already follow the same
     pattern in their own stylesheets. */
  .ci-crop-toolbar {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
    padding: 4px 8px;
    background: transparent;
    color: var(--ci-crop-toolbar-color);
    border: none;
    border-radius: 0;
    box-shadow: none;
    pointer-events: none;
  }

  /* Reset / Rotate / Flip / Ratio each keep their OWN dark pill (set on
     .ci-crop-reset-btn / .ci-crop-toolbar-btn / .ci-crop-shape-trigger
     below) — the group itself is just a transparent flex row spacing them
     apart, with a thin divider between segments. */
  .ci-crop-toolbar-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    height: 36px;
  }

  /* Segment divider between Reset / Rotate+Flip / Ratio inside the group.
     Rendered as an explicit element (conditionally, in toolbar.ts) rather
     than a CSS ::after so it only ever appears between segments that are
     actually visible — no stray line when a segment is toggled off via
     show-rotate-button / show-flip-button / show-shape-selector. */
  .ci-crop-toolbar-divider {
    width: 1px;
    height: 20px;
    background: oklch(1 0 0 / 0.25);
    flex: none;
  }

  /* Sub-element hosts — same hole-punch opt-in as the plain buttons.
     Their hosts are tight inline-flex wrappers around a single trigger,
     so re-enabling them adds no extra dead zone. */
  cloudimage-crop-rotate,
  cloudimage-crop-shapes {
    pointer-events: auto;
  }

  /* The fine-tilt ruler renders as a canvas-anchored fixed popover, but its
     inline host still occupies a zero-width slot in the toolbar row — which
     doubles the gap between the flip button and the shape selector. Pull the
     host out of flow so every visible button stays evenly spaced (both
     variants). The popover is position:fixed, so this doesn't move it. */
  cloudimage-crop-rotate {
    position: absolute;
  }

  .ci-crop-toolbar-btn {
    pointer-events: auto;
    width: 52px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: oklch(0 0 0 / 0.55);
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    padding: 0;
    transition:
      background var(--ci-crop-transition),
      color var(--ci-crop-transition),
      transform var(--ci-crop-transition);
  }

  .ci-crop-toolbar-btn:hover {
    background: oklch(0 0 0 / 0.7);
    transform: none;
  }

  .ci-crop-toolbar-btn:active {
    transform: scale(0.96);
  }

  .ci-crop-toolbar-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .ci-crop-toolbar-btn:disabled:hover {
    background: oklch(0 0 0 / 0.55);
  }

  .ci-crop-toolbar-btn:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }

  .ci-crop-toolbar-btn svg {
    width: 20px;
    height: 20px;
    display: block;
    /* Thinner than the icons' own stroke-width="2" attribute — a CSS
       property on stroke-width beats a presentation attribute, so this
       doesn't require touching the shared icon strings in icons.ts. */
    stroke-width: 1.5;
  }

  /* Reset — icon-only capsule (title/aria-label carry the "Reset all
     changes" meaning). Lives before every other control so the user can
     wipe back to the initial state in one click. */
  .ci-crop-reset-btn {
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 36px;
    padding: 0;
    background: oklch(0 0 0 / 0.55);
    color: #fff;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-family: var(--ci-crop-font);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.1px;
    white-space: nowrap;
    transition: background var(--ci-crop-transition);
  }
  .ci-crop-reset-btn:hover {
    background: oklch(0 0 0 / 0.7);
  }
  .ci-crop-reset-btn:focus-visible {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }
  .ci-crop-reset-btn svg {
    width: 20px;
    height: 20px;
    display: block;
    stroke-width: 1.5;
  }

  @media (max-width: 480px) {
    .ci-crop-toolbar-group {
      gap: 6px;
    }
  }

  /* Narrow editor (component itself is small, regardless of viewport) —
     SAME behavior for both variants, and for both width-narrow and
     tall-narrow (portrait phone) boxes: Cancel and Done NEVER leave their
     pinned corners — no "order" tricks moving them into the tool group's
     flex flow. That previous approach put every control on one shared
     flex line and let justify-content:center center the WHOLE line —
     Cancel and Done ended up centered flush against the group instead of
     anchored to the block's edges, which is the opposite of what a
     "Cancel / Done" affordance should look like.

     Instead: Cancel/Done stay exactly where they are (just shrink to
     icon-only circles to free up horizontal room) and the tool group
     (Reset/Rotate/Flip/Ratio) stays on the SAME row, centered as always —
     .ci-crop-toolbar reserves a left/right gutter the width of one corner
     circle + its gap (36px + 16px edge offset + 8px gap = 60px) so the
     centered content can never render underneath Cancel/Done, without
     needing to drop to a separate row. If the group still doesn't fit in
     what's left, it wraps onto additional centered lines below — but
     starts at the same top level as Cancel/Done, not artificially pushed
     down by a fixed margin regardless of whether that room was needed. */
  @container sfxcrop (max-width: 640px) {
    :host {
      top: 8px;
      left: 4px;
      right: 4px;
    }
    :host([toolbar-position="bottom"]) {
      top: auto;
      bottom: 8px;
    }

    /* Icon-only Cancel/Done — same 36px circle as Reset/Rotate/Flip, so a
       narrow box doesn't burn width on "Cancel"/"Done" text next to them. */
    .ci-crop-cancel-btn,
    .ci-crop-done-btn {
      width: 36px;
      height: 36px;
      padding: 0;
    }
    .ci-crop-cancel-btn-label,
    .ci-crop-done-btn-label {
      display: none;
    }
    .ci-crop-cancel-btn-icon,
    .ci-crop-done-btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ci-crop-toolbar {
      width: 100%;
      box-sizing: border-box;
      flex-wrap: wrap;
      justify-content: center;
    }
    /* Gutters only on the sides where Cancel / Done actually sit. */
    .ci-crop-toolbar--gutter-l { padding-left: 60px; }
    .ci-crop-toolbar--gutter-r { padding-right: 60px; }

    /* The tools live in ONE group, so wrapping the outer row alone never
       helps — the group itself must wrap. A tall, narrow box (e.g. a
       landscape photo turned to portrait on a phone) then shows the tools
       on two centred lines instead of cutting Reset / the ratio button off
       at the box edges. */
    .ci-crop-toolbar-group {
      flex-wrap: wrap;
      justify-content: center;
      height: auto;
      min-height: 36px;
      row-gap: 8px;
      max-width: 100%;
    }

    .ci-crop-reset-btn,
    .ci-crop-toolbar-btn {
      width: 36px;
      height: 36px;
      min-width: 0;
      padding: 0;
    }
    .ci-crop-toolbar-btn svg {
      width: 18px;
      height: 18px;
    }
  }

  /* Very narrow box (e.g. a landscape photo turned to portrait on a phone):
     the tool group no longer fits one row (~216px with dividers + the
     toolbar's own padding and insets ≈ 240px) and wraps. CSS can't tell
     which divider ends up at a line break, so drop them here — otherwise one
     dangles at the end of the first row. The pills' own gaps still separate
     the segments. */
  @container sfxcrop (max-width: 260px) {
    .ci-crop-toolbar-divider {
      display: none;
    }
  }
`;
