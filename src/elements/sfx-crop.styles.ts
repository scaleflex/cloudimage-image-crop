import { css } from 'lit';

/**
 * `<sfx-crop>` host + container + loading/error overlay.
 *
 * Visual language tracks `@scaleflex/uploader`: Inter typography, 16px outer
 * radius, deep soft shadow, primary-blue accents for spinners and focus.
 * Works embedded on any page surface (light or dark); `--sfx-cr-*` tokens
 * swap automatically when the host carries `theme="dark"`.
 */
export const sfxCropStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    font-family: var(--sfx-cr-font);
    color: var(--sfx-cr-text);
  }

  :host([hidden]) { display: none; }

  :host(:focus-visible) {
    outline: 2px solid var(--sfx-cr-ring);
    outline-offset: 2px;
  }

  .sfx-cr-container {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    background: var(--sfx-cr-bg);
    border-radius: var(--sfx-cr-radius);
    font-family: var(--sfx-cr-font);
    user-select: none;
    -webkit-user-select: none;
  }

  /* ====== Loading ====== */
  .sfx-cr-loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: var(--sfx-cr-bg);
    z-index: 10;
    transition: opacity 280ms ease;
  }
  .sfx-cr-loading--hidden {
    opacity: 0;
    pointer-events: none;
  }

  .sfx-cr-loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid var(--sfx-cr-border);
    border-top-color: var(--sfx-cr-primary);
    border-radius: 50%;
    animation: sfx-cr-spin 0.8s linear infinite;
  }

  .sfx-cr-loading-text {
    font-size: 13px;
    font-weight: 500;
    color: var(--sfx-cr-text-secondary);
    letter-spacing: 0.2px;
  }

  /* ====== Error ====== */
  .sfx-cr-error {
    position: absolute;
    inset: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 32px;
    background: var(--sfx-cr-bg);
    z-index: 10;
    color: var(--sfx-cr-error);
    font-size: 14px;
    font-weight: 500;
    text-align: center;
  }
  .sfx-cr-error--visible { display: flex; }
`;
