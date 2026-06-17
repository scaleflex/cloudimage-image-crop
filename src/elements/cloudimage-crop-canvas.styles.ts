import { css } from 'lit';

export const sfxCropCanvasStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    /* Single source of clipping is .ci-crop-container (overflow:hidden +
       border-radius). Don't add a second mask here: this host is sized
       by JS to the full outer rect (displayW×displayH), which is 4px
       wider than the container's content-box, so its own border-radius
       wouldn't align with the container's effective inner radius
       (radius - border-width) and you'd see two stepped curves at the
       corner. Transparent bg lets the container surface show through
       in the rounded corner sliver. */
    background: transparent;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    outline: none;
    touch-action: none;
  }
`;
