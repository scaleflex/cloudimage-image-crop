import { css } from 'lit';

/**
 * `<cloudimage-crop>` host + container + loading/error overlay.
 *
 * Visual language tracks `@scaleflex/uploader`: Inter typography, 16px outer
 * radius, deep soft shadow, primary-blue accents for spinners and focus.
 * Works embedded on any page surface (light or dark); `--ci-crop-*` tokens
 * swap automatically when the host carries `theme="dark"`.
 */
export const sfxCropStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    font-family: var(--ci-crop-font);
    color: var(--ci-crop-text);
    /* Establish a named inline-size container so the toolbar / shapes /
       zoom / rotate sub-elements can switch to their compact left-rail
       layout based on the editor's own width — independent of the page
       viewport. A narrow column on a wide desktop (sidebar preview,
       split view) gets the same compact UI as a phone. */
    container-type: inline-size;
    container-name: sfxcrop;
  }

  :host([hidden]) { display: none; }

  :host(:focus-visible) {
    outline: 2px solid var(--ci-crop-ring);
    outline-offset: 2px;
  }

  .ci-crop-container {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    background: var(--ci-crop-bg);
    border-radius: var(--ci-crop-radius);
    /* Editor card frame: shadow-only (no border). A border draws two
       visible curves at the corners (outer + inner padding edge),
       reading as a "double ring"; a slightly stronger shadow gives the
       same elevation feel with a single clean rounded silhouette. */
    /* shadow-xs ring + shadow-md elevation, sourced from ui-tw scale */
    box-shadow:
      0 0 0 1px oklch(0 0 0 / 0.05),
      0 4px 6px -1px oklch(0 0 0 / 0.1),
      0 2px 4px -2px oklch(0 0 0 / 0.1);
    font-family: var(--ci-crop-font);
    user-select: none;
    -webkit-user-select: none;
  }

  /* ====== Loading ====== */
  .ci-crop-loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: var(--ci-crop-bg);
    z-index: 10;
    transition: opacity 280ms ease;
  }
  .ci-crop-loading--hidden {
    opacity: 0;
    pointer-events: none;
  }

  .ci-crop-loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--ci-crop-border);
    border-top-color: var(--ci-crop-primary);
    border-radius: 50%;
    animation: ci-crop-spin 0.8s linear infinite;
  }

  .ci-crop-loading-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--ci-crop-text-secondary);
    letter-spacing: 0.2px;
  }

  /* ====== Error ====== */
  .ci-crop-error {
    position: absolute;
    inset: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 32px;
    background: var(--ci-crop-bg);
    z-index: 10;
    color: var(--ci-crop-error);
    font-size: 14px;
    font-weight: 500;
    text-align: center;
  }
  .ci-crop-error--visible { display: flex; }
`;
