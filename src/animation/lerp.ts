import type { LerpConfig } from '../core/types';

export const LERP_DEFAULT: LerpConfig = {
  factor: 0.15,
  precision: 0.001,
};

export const LERP_CROP_MORPH: LerpConfig = {
  factor: 0.12,
  precision: 0.0001,
};

export const LERP_GRID_FADE: LerpConfig = {
  factor: 0.12,
  precision: 0.01,
};

export const LERP_TOOLBAR_ENTRY: LerpConfig = {
  factor: 0.12,
  precision: 0.01,
};

export interface LerpState {
  value: number;
  target: number;
}

export function createLerp(initial: number = 0): LerpState {
  return {
    value: initial,
    target: initial,
  };
}

/**
 * Advance a lerp by one step.
 * Returns true if the lerp is still animating.
 */
export function stepLerp(state: LerpState, config: LerpConfig): boolean {
  const diff = state.target - state.value;
  if (Math.abs(diff) < config.precision) {
    state.value = state.target;
    return false;
  }
  state.value += diff * config.factor;
  return true;
}
