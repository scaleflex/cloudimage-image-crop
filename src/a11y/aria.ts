import type { TransformState } from '../core/types';

/** Set up ARIA attributes on the container. */
export function setupAria(container: HTMLElement): void {
  container.setAttribute('role', 'application');
  container.setAttribute('aria-roledescription', 'image crop tool');
  container.setAttribute('aria-label', 'Image crop tool — use arrow keys to move crop, R to rotate, F to flip horizontal, V to flip vertical, +/- to zoom');
  container.setAttribute('tabindex', '0');
}

/** Update ARIA live region with current state. */
export function announceState(
  container: HTMLElement,
  state: TransformState,
  cropShape: string = 'free',
): void {
  let liveRegion = container.querySelector<HTMLElement>('.ci-crop-sr-only[aria-live]');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.className = 'ci-crop-sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    container.appendChild(liveRegion);
  }

  const rotation = state.quarterTurns + state.rotation;
  const scale = Math.round(state.scale * 100);
  const shape = cropShape;
  const flipH = state.flipH ? ', flipped horizontal' : '';
  const flipV = state.flipV ? ', flipped vertical' : '';

  liveRegion.textContent = `Crop: ${shape}, rotation ${rotation.toFixed(1)}°${flipH}${flipV}, zoom ${scale}%`;
}
