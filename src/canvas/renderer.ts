import type { DisplayState } from '../core/types';
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
  setScaleBounds(min: number, max: number): void;
  setBleedConfig(config: BleedConfig): void;
  /** Toggle the `'fixed'` variant: cover-fit photo, no resize/move handles. */
  setFixedFrame(fixed: boolean): void;
  resize(): void;
  destroy(): void;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  getCropShapeType: () => CropShapeType,
  borderRadius: number = 20,
  reducedMotion: boolean = false,
  // Layout reference whose dimensions drive the fit-scale + canvas-backing
  // size. Required because when `<canvas>` lives inside a shadow root its
  // `parentElement` is null (the parent is the ShadowRoot, not an Element),
  // so walking up the DOM is unreliable. Falls back to the canvas's own
  // host chain when omitted for backwards compatibility.
  layoutContainer?: HTMLElement,
): RendererHandle {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) throw new Error('2D canvas context unavailable');
  const ctx: CanvasRenderingContext2D = maybeCtx;

  /**
   * Resolve the element that defines the canvas's visible box. Priority:
   *   1. Explicit `layoutContainer` (controller's sizing reference).
   *   2. `canvas.parentElement` (works in light DOM).
   *   3. Shadow-DOM fallback: walk `getRootNode()` hosts until we find one.
   */
  function getSizingElement(): HTMLElement | null {
    if (layoutContainer) return layoutContainer;
    if (canvas.parentElement) return canvas.parentElement;
    let node: Node | null = canvas.getRootNode();
    while (node && node !== document) {
      if (node instanceof ShadowRoot) {
        const host: Element = node.host;
        if (host instanceof HTMLElement) return host;
        node = host.getRootNode();
      } else {
        break;
      }
    }
    return null;
  }

  let dirty = true;
  let animationId: number | null = null;
  let destroyed = false;
  let loopRunning = false;
  let lastFrameTime = 0;

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
    interactive: false,
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

  // Elastic bounce velocity when scale escapes bounds (spec section 3.4).
  let bounceVelocity = 0;
  let scaleMin = 0.5;
  let scaleMax = 5;
  let fixedFrame = false;

  function resize(): void {
    if (destroyed) return;
    const container = getSizingElement();
    if (!container) return;

    const rawDpr = window.devicePixelRatio;
    const dpr = Math.min(Number.isFinite(rawDpr) && rawDpr > 0 ? rawDpr : 1, 2);
    const rect = container.getBoundingClientRect();
    // Container may not be laid out yet (0×0); bail and let the next
    // ResizeObserver tick call us again.
    if (rect.width <= 0 || rect.height <= 0) return;
    canvas.width = Math.max(0, Math.floor(rect.width * dpr));
    canvas.height = Math.max(0, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  }

  /**
   * The canvas host is sized by <sfx-crop> to the image's display rect, so
   * the image fills the canvas edge-to-edge. No letterbox, no toolbar
   * reserve inside the canvas.
   */
  function getImageDisplayRect(): { x: number; y: number; w: number; h: number } {
    const container = getSizingElement();
    if (!container) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: 0, y: 0, w: container.clientWidth, h: container.clientHeight };
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

  /**
   * Convert a per-frame lerp factor (tuned at 60fps) into a frame-rate
   * independent one for the current `dt`. Keeps the "half-life" of the
   * easing the same whether the display runs at 30Hz, 60Hz, or 120Hz.
   */
  function frameLerp(factor60: number, dt: number): number {
    return 1 - Math.pow(1 - factor60, dt * 60);
  }

  function animate(dt: number): void {
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
      displayState.interactive = targetState.interactive;
      dirty = true;
      return;
    }

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

    // Lerp other properties — factors are tuned at 60fps and normalized to dt.
    const lerpFactor = frameLerp(0.15, dt);
    const cropLerp = frameLerp(0.12, dt);
    const gridLerp = frameLerp(0.12, dt);

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

    const interactive = !!targetState.interactive;

    if (interactive) {
      // Snap pan + cropRect directly to target while the user drags so the
      // frame tracks the cursor 1:1 instead of lagging behind via lerp.
      if (displayState.panX !== targetState.panX || displayState.panY !== targetState.panY) {
        displayState.panX = targetState.panX;
        displayState.panY = targetState.panY;
        dirty = true;
      }
      const tc = targetState.cropRect;
      const crop = displayState.cropRect;
      if (crop.x !== tc.x || crop.y !== tc.y || crop.width !== tc.width || crop.height !== tc.height) {
        displayState.cropRect = { ...tc };
        dirty = true;
      }
    } else {
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
    }

    // Lerp grid opacity (spec: factor: 0.12)
    if (Math.abs(displayState.gridOpacity - targetState.gridOpacity) > 0.01) {
      displayState.gridOpacity = lerp(displayState.gridOpacity, targetState.gridOpacity, gridLerp);
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
      displayState.interactive = targetState.interactive;
    }
  }

  function render(now?: number): void {
    if (destroyed || !loopRunning) {
      animationId = null;
      return;
    }
    const t = typeof now === 'number' ? now : performance.now();
    // Clamp dt to avoid spring/lerp explosions on tab-switch (>250ms gaps).
    const dt = lastFrameTime === 0 ? 1 / 60 : Math.min(0.25, Math.max(0, (t - lastFrameTime) / 1000));
    lastFrameTime = t;

    animationId = requestAnimationFrame(render);

    animate(dt);

    if (!dirty) return;

    const container = getSizingElement();
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    // Skip drawing until layout produces a sized container — the
    // ResizeObserver will markDirty() once it has dimensions. Don't clear
    // the dirty flag yet, or the next frame will leave the canvas blank.
    if (cw === 0 || ch === 0) return;
    dirty = false;

    // 1. Clear — leave the canvas transparent so the host element's
    // `--sfx-cr-canvas-bg` CSS variable shows through and follows the
    // active theme (light/dark) without a hardcoded fill here.
    ctx.clearRect(0, 0, cw, ch);

    const imgRect = getImageDisplayRect();

    // 3. Image layer — cover-fit in the fixed variant.
    drawImageLayer(ctx, image, imgRect, displayState, fixedFrame);

    // 4. Overlay mask + 5. crop frame — both pull theme-aware colors from
    // CSS variables each frame so light/dark themes swap instantly.
    const cropCanvas = getCanvasCropRect();
    const shapeType = getCropShapeType();
    const themeHost = getSizingElement() ?? canvas;
    const cssVar = (name: string, fallback: string): string =>
      getComputedStyle(themeHost).getPropertyValue(name).trim() || fallback;

    // In the fixed variant the rectangular frame IS the whole editor box, so
    // there is no "outside" to dim — skip the overlay. Circle / rounded-rect
    // still mask their corners, so keep it for those shapes.
    if (!(fixedFrame && shapeType === 'rect')) {
      const overlayColor = cssVar('--sfx-cr-overlay-color', 'rgba(0, 0, 0, 0.55)');
      drawOverlayLayer(ctx, cw, ch, cropCanvas, shapeType, borderRadius, overlayColor);
    }

    // The rectangular fixed frame coincides with the editor-box edge, so its
    // border is redundant — skip it. Circle / rounded-rect keep their outline
    // (it conveys the crop shape). Classic always draws the frame + handles.
    if (!(fixedFrame && shapeType === 'rect')) {
      drawCropFrame(ctx, cropCanvas, shapeType, borderRadius, {
        frame: cssVar('--sfx-cr-frame-color', '#ffffff'),
        frameShadow: cssVar('--sfx-cr-frame-shadow', 'rgba(0, 0, 0, 0.3)'),
        handleFill: cssVar('--sfx-cr-handle-fill', '#ffffff'),
        handleStroke: cssVar('--sfx-cr-handle-stroke', 'rgba(0, 0, 0, 0.25)'),
      }, !fixedFrame);
    }

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
      if (loopRunning || destroyed) return;
      loopRunning = true;
      lastFrameTime = 0;
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
      // rotationPivot isn't animated — snap it so the draw layer sees the
      // latest pivot immediately (captured on tilt entry, cleared on 0°).
      displayState.rotationPivot = state.rotationPivot;
      dirty = true;
    },

    getDisplayState() {
      return { ...displayState };
    },

    getCanvasCropRect,

    setScaleBounds(min: number, max: number) {
      scaleMin = min;
      scaleMax = max;
    },

    setBleedConfig(config: BleedConfig) {
      bleedConfig = config;
      dirty = true;
    },

    setFixedFrame(fixed: boolean) {
      fixedFrame = fixed;
      dirty = true;
    },

    resize,

    destroy() {
      destroyed = true;
      loopRunning = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
  };
}
