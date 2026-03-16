import type { DisplayState, NormalizedRect } from '../core/types';
import { lerp } from '../utils/math';
import { drawImageLayer } from './image-layer';
import { drawOverlayLayer } from './overlay-layer';
import { drawCropFrame } from './crop-frame';
import { drawGrid } from './grid-layer';
import { drawBleedMargin } from './bleed-layer';

export type CropShapeType = 'rect' | 'circle' | 'rounded-rect';

export interface BleedConfig {
  show: boolean;
  size: number;
  color: string;
}

export interface RendererContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  image: HTMLImageElement;
  imageWidth: number;
  imageHeight: number;
}

export interface RendererHandle {
  markDirty(): void;
  startLoop(): void;
  stopLoop(): void;
  setDisplayState(state: DisplayState): void;
  getDisplayState(): DisplayState;
  getCanvasCropRect(): { x: number; y: number; width: number; height: number };
  addZoomVelocity(delta: number): void;
  setScaleBounds(min: number, max: number): void;
  setBleedConfig(config: BleedConfig): void;
  resize(): void;
  destroy(): void;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  getCropShapeType: () => CropShapeType,
  borderRadius: number = 20,
  reducedMotion: boolean = false,
): RendererHandle {
  const ctx = canvas.getContext('2d')!;
  let dirty = true;
  let animationId: number | null = null;
  let destroyed = false;
  let loopRunning = false;

  const displayState: DisplayState = {
    quarterTurns: 0,
    rotation: 0,
    flipH: 1,
    flipV: 1,
    scale: 1,
    panX: 0,
    panY: 0,
    cropRect: { x: 0, y: 0, width: 1, height: 1 },
    gridOpacity: 0,
  };

  // Target state for animation interpolation
  const targetState: DisplayState = { ...displayState };

  // Spring velocities
  const velocities = {
    quarterTurns: 0,
    flipH: 0,
    flipV: 0,
  };

  let bleedConfig: BleedConfig = { show: false, size: 10, color: 'rgba(255, 0, 0, 0.5)' };

  // Zoom inertia (spec section 3.4)
  let zoomVelocity = 0;
  let bounceVelocity = 0;
  let scaleMin = 0.5;
  let scaleMax = 5;

  function resize(): void {
    const container = canvas.parentElement;
    if (!container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  }

  /** Get the dimensions and position of the image as displayed on canvas (fitting). */
  function getImageDisplayRect(): { x: number; y: number; w: number; h: number } {
    const container = canvas.parentElement;
    if (!container) return { x: 0, y: 0, w: 0, h: 0 };

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;

    // Account for 90° rotations: swap dimensions
    const is90 = Math.round(displayState.quarterTurns / 90) % 2 !== 0;
    const effectiveW = is90 ? ih : iw;
    const effectiveH = is90 ? iw : ih;

    // Fit image within canvas area (leaving space for toolbar ~80px)
    const availableH = ch - 80;
    const scaleToFit = Math.min(cw / effectiveW, availableH / effectiveH, 1);
    const w = effectiveW * scaleToFit;
    const h = effectiveH * scaleToFit;
    const x = (cw - w) / 2;
    const y = (availableH - h) / 2;

    return { x, y, w, h };
  }

  function getCanvasCropRect(): { x: number; y: number; width: number; height: number } {
    const imgRect = getImageDisplayRect();
    const crop = displayState.cropRect;
    return {
      x: imgRect.x + crop.x * imgRect.w,
      y: imgRect.y + crop.y * imgRect.h,
      width: crop.width * imgRect.w,
      height: crop.height * imgRect.h,
    };
  }

  function animate(): void {
    if (reducedMotion) {
      // Snap everything immediately
      displayState.quarterTurns = targetState.quarterTurns;
      displayState.rotation = targetState.rotation;
      displayState.flipH = targetState.flipH;
      displayState.flipV = targetState.flipV;
      displayState.scale = targetState.scale;
      displayState.panX = targetState.panX;
      displayState.panY = targetState.panY;
      displayState.cropRect = { ...targetState.cropRect };
      displayState.gridOpacity = targetState.gridOpacity;
      dirty = true;
      return;
    }

    const dt = 1 / 60;
    let needsAnim = false;

    // Spring-animate quarterTurns (spec: stiffness: 180, damping: 22, mass: 1)
    if (Math.abs(displayState.quarterTurns - targetState.quarterTurns) > 0.01) {
      const displacement = displayState.quarterTurns - targetState.quarterTurns;
      const springForce = -180 * displacement;
      const dampForce = -22 * velocities.quarterTurns;
      velocities.quarterTurns += (springForce + dampForce) * dt;
      displayState.quarterTurns += velocities.quarterTurns * dt;
      if (Math.abs(displayState.quarterTurns - targetState.quarterTurns) < 0.01 && Math.abs(velocities.quarterTurns) < 0.01) {
        displayState.quarterTurns = targetState.quarterTurns;
        velocities.quarterTurns = 0;
      }
      needsAnim = true;
      dirty = true;
    }

    // Spring-animate flipH (stiffness: 400, damping: 28)
    if (Math.abs(displayState.flipH - targetState.flipH) > 0.01) {
      const displacement = displayState.flipH - targetState.flipH;
      const springForce = -400 * displacement;
      const dampForce = -28 * velocities.flipH;
      velocities.flipH += (springForce + dampForce) * dt;
      displayState.flipH += velocities.flipH * dt;
      if (Math.abs(displayState.flipH - targetState.flipH) < 0.01 && Math.abs(velocities.flipH) < 0.01) {
        displayState.flipH = targetState.flipH;
        velocities.flipH = 0;
      }
      needsAnim = true;
      dirty = true;
    }

    // Spring-animate flipV (stiffness: 400, damping: 28)
    if (Math.abs(displayState.flipV - targetState.flipV) > 0.01) {
      const displacement = displayState.flipV - targetState.flipV;
      const springForce = -400 * displacement;
      const dampForce = -28 * velocities.flipV;
      velocities.flipV += (springForce + dampForce) * dt;
      displayState.flipV += velocities.flipV * dt;
      if (Math.abs(displayState.flipV - targetState.flipV) < 0.01 && Math.abs(velocities.flipV) < 0.01) {
        displayState.flipV = targetState.flipV;
        velocities.flipV = 0;
      }
      needsAnim = true;
      dirty = true;
    }

    // Lerp other properties
    const lerpFactor = 0.15;

    if (Math.abs(displayState.rotation - targetState.rotation) > 0.01) {
      displayState.rotation = lerp(displayState.rotation, targetState.rotation, lerpFactor);
      needsAnim = true;
      dirty = true;
    }

    if (Math.abs(displayState.scale - targetState.scale) > 0.001) {
      displayState.scale = lerp(displayState.scale, targetState.scale, lerpFactor);
      needsAnim = true;
      dirty = true;
    }

    if (Math.abs(displayState.panX - targetState.panX) > 0.1) {
      displayState.panX = lerp(displayState.panX, targetState.panX, lerpFactor);
      needsAnim = true;
      dirty = true;
    }

    if (Math.abs(displayState.panY - targetState.panY) > 0.1) {
      displayState.panY = lerp(displayState.panY, targetState.panY, lerpFactor);
      needsAnim = true;
      dirty = true;
    }

    // Lerp crop (spec: factor: 0.12 for shape morph)
    const cropLerp = 0.12;
    const crop = displayState.cropRect;
    const tc = targetState.cropRect;
    if (
      Math.abs(crop.x - tc.x) > 0.0001 ||
      Math.abs(crop.y - tc.y) > 0.0001 ||
      Math.abs(crop.width - tc.width) > 0.0001 ||
      Math.abs(crop.height - tc.height) > 0.0001
    ) {
      displayState.cropRect = {
        x: lerp(crop.x, tc.x, cropLerp),
        y: lerp(crop.y, tc.y, cropLerp),
        width: lerp(crop.width, tc.width, cropLerp),
        height: lerp(crop.height, tc.height, cropLerp),
      };
      needsAnim = true;
      dirty = true;
    }

    // Lerp grid opacity (spec: factor: 0.12)
    if (Math.abs(displayState.gridOpacity - targetState.gridOpacity) > 0.01) {
      displayState.gridOpacity = lerp(displayState.gridOpacity, targetState.gridOpacity, 0.12);
      needsAnim = true;
      dirty = true;
    }

    // Zoom inertia (spec section 3.4: velocity *= 0.92 per frame, stop at 0.001)
    if (Math.abs(zoomVelocity) > 0.001) {
      targetState.scale += zoomVelocity;
      zoomVelocity *= 0.92;
      if (Math.abs(zoomVelocity) < 0.001) zoomVelocity = 0;
      needsAnim = true;
      dirty = true;
    }

    // Elastic bounce when scale exceeds bounds (spec section 3.4)
    if (displayState.scale < scaleMin) {
      const displacement = displayState.scale - scaleMin;
      const springForce = -400 * displacement;
      const dampForce = -28 * bounceVelocity;
      bounceVelocity += (springForce + dampForce) * dt;
      displayState.scale += bounceVelocity * dt;
      if (Math.abs(displayState.scale - scaleMin) < 0.001 && Math.abs(bounceVelocity) < 0.001) {
        displayState.scale = scaleMin;
        bounceVelocity = 0;
      }
      needsAnim = true;
      dirty = true;
    } else if (displayState.scale > scaleMax) {
      const displacement = displayState.scale - scaleMax;
      const springForce = -400 * displacement;
      const dampForce = -28 * bounceVelocity;
      bounceVelocity += (springForce + dampForce) * dt;
      displayState.scale += bounceVelocity * dt;
      if (Math.abs(displayState.scale - scaleMax) < 0.001 && Math.abs(bounceVelocity) < 0.001) {
        displayState.scale = scaleMax;
        bounceVelocity = 0;
      }
      needsAnim = true;
      dirty = true;
    }

    if (!needsAnim) {
      // Snap to final values
      displayState.rotation = targetState.rotation;
      displayState.scale = targetState.scale;
      displayState.panX = targetState.panX;
      displayState.panY = targetState.panY;
      displayState.cropRect = { ...targetState.cropRect };
      displayState.gridOpacity = targetState.gridOpacity;
    }
  }

  function render(): void {
    if (destroyed) return;
    animationId = requestAnimationFrame(render);

    animate();

    if (!dirty) return;
    dirty = false;

    const container = canvas.parentElement;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // 1. Clear
    ctx.clearRect(0, 0, cw, ch);

    // 2. Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, cw, ch);

    const imgRect = getImageDisplayRect();

    // 3. Image layer
    drawImageLayer(ctx, image, imgRect, displayState);

    // 4. Overlay mask
    const cropCanvas = getCanvasCropRect();
    const shapeType = getCropShapeType();
    drawOverlayLayer(ctx, cw, ch, cropCanvas, shapeType, borderRadius);

    // 5. Crop frame + handles
    drawCropFrame(ctx, cropCanvas, shapeType, borderRadius);

    // 5.5. Bleed margins
    if (bleedConfig.show) {
      drawBleedMargin(ctx, cropCanvas, bleedConfig.size, bleedConfig.color);
    }

    // 6. Grid
    if (displayState.gridOpacity > 0.01) {
      drawGrid(ctx, cropCanvas, displayState.gridOpacity);
    }
  }

  resize();

  return {
    markDirty() {
      dirty = true;
    },

    startLoop() {
      if (loopRunning) return;
      loopRunning = true;
      render();
    },

    stopLoop() {
      loopRunning = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },

    setDisplayState(state: DisplayState) {
      Object.assign(targetState, state);
      dirty = true;
    },

    getDisplayState() {
      return { ...displayState };
    },

    getCanvasCropRect,

    addZoomVelocity(delta: number) {
      zoomVelocity += delta;
      dirty = true;
    },

    setScaleBounds(min: number, max: number) {
      scaleMin = min;
      scaleMax = max;
    },

    setBleedConfig(config: BleedConfig) {
      bleedConfig = config;
      dirty = true;
    },

    resize,

    destroy() {
      destroyed = true;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
  };
}
