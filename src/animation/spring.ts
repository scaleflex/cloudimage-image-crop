import type { SpringConfig } from '../core/types';

export const SPRING_ROTATE: SpringConfig = {
  stiffness: 180,
  damping: 22,
  mass: 1,
  precision: 0.01,
};

export const SPRING_FLIP: SpringConfig = {
  stiffness: 400,
  damping: 28,
  mass: 1,
  precision: 0.01,
};

export const SPRING_BOUNCE_HANDLE: SpringConfig = {
  stiffness: 400,
  damping: 15,
  mass: 0.5,
  precision: 0.01,
};

export interface SpringState {
  value: number;
  velocity: number;
  target: number;
}

export function createSpring(config: SpringConfig, initial: number = 0): SpringState {
  return {
    value: initial,
    velocity: 0,
    target: initial,
  };
}

/**
 * Advance a spring by one time step.
 * Returns true if the spring is still animating.
 */
export function stepSpring(state: SpringState, config: SpringConfig, dt: number): boolean {
  const displacement = state.value - state.target;
  const springForce = -config.stiffness * displacement;
  const dampForce = -config.damping * state.velocity;
  const acceleration = (springForce + dampForce) / config.mass;

  state.velocity += acceleration * dt;
  state.value += state.velocity * dt;

  // Check if settled
  if (Math.abs(state.value - state.target) < config.precision && Math.abs(state.velocity) < config.precision) {
    state.value = state.target;
    state.velocity = 0;
    return false;
  }

  return true;
}
