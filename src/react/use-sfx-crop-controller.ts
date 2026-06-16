import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createCropController,
  type CropController,
  type CropControllerCallbacks,
} from '../core/crop-controller';
import { mergeConfig } from '../core/config';
import type {
  SfxCropConfig,
  TransformState,
  TransformParams,
  CropRect,
  CropShapeName,
} from '../core/types';
import type { CloudimageUrlOptions, CropDescriptor } from '../export/cloudimage-url';

/**
 * Headless options for {@link useSfxCropController}. Most fields mirror the
 * built-in element's attributes, minus UI toggles that are irrelevant when
 * the consumer provides their own UI.
 */
export type UseSfxCropControllerOptions = Partial<SfxCropConfig>;

/** Reactive snapshot exposed by the hook. */
export interface CropControllerState {
  /** Current editor transform (rotation, flip, scale, pan, crop). */
  state: TransformState;
  cropRect: CropRect;
  cropShape: CropShapeName;
  scale: number;
  rotation: number;
  loading: boolean;
  error: string | null;
  /** `true` once the editor has a decoded image and the render loop is live. */
  ready: boolean;
}

/** Imperative actions — stable identity across renders. */
export interface CropControllerActions {
  loadImage(src: string): Promise<void>;
  rotateLeft(): void;
  flipHorizontal(): void;
  setRotation(deg: number): void;
  setScale(scale: number): void;
  setCropShape(shape: CropShapeName): void;
  setCropRect(rect: CropRect): void;
  reset(): void;
}

/** Export / query surface — stable identity across renders. */
export interface CropControllerApi {
  toCanvas(): HTMLCanvasElement | null;
  toBlob(type?: string, quality?: number): Promise<Blob | null>;
  toDataURL(type?: string, quality?: number): string | null;
  toTransformParams(): TransformParams | null;
  /** Build a Cloudimage server-side crop URL (null until the controller is live). */
  toCloudimageURL(options?: Partial<CloudimageUrlOptions>): string | null;
  /** Serializable snapshot to rebuild the Cloudimage URL server-side (null until live). */
  toCropDescriptor(): CropDescriptor | null;
  /** Underlying controller handle (null until both refs are attached). */
  getController(): CropController | null;
}

export interface UseSfxCropControllerReturn extends CropControllerState {
  /** Attach to your `<canvas>` node. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Attach to a sizing box (e.g. a `<div>` with `max-width`/`max-height`). */
  containerRef: React.RefObject<HTMLElement | null>;
  actions: CropControllerActions;
  api: CropControllerApi;
}

/**
 * Headless React hook — wraps {@link createCropController} so a consumer can
 * drop a `<canvas>` + sizing container anywhere in their tree and wire up
 * their own UI (their design-system buttons, sliders, modals, etc.). The
 * hook never mounts `<sfx-crop>`; there is no Lit, no shadow DOM, no
 * built-in toolbar.
 *
 * Usage:
 * ```tsx
 * const { canvasRef, containerRef, state, actions, api } = useSfxCropController({
 *   src: '/photo.jpg',
 *   cropShape: '16:9',
 * });
 *
 * return (
 *   <div ref={containerRef} style={{ maxWidth: 1200, maxHeight: 640 }}>
 *     <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
 *     <button onClick={actions.rotateLeft}>Rotate</button>
 *     <input type="range" min={0.5} max={5} step={0.01}
 *            value={state.scale} onChange={(e) => actions.setScale(+e.target.value)} />
 *   </div>
 * );
 * ```
 */
export function useSfxCropController(
  options: UseSfxCropControllerOptions = {},
): UseSfxCropControllerReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const controllerRef = useRef<CropController | null>(null);

  // Latest options captured in a ref so callback updates don't re-create the
  // controller every render. We only re-init on fundamental changes (src).
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, setState] = useState<TransformState>(() => ({
    quarterTurns: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
    scale: 1,
    panX: 0,
    panY: 0,
    cropRect: { x: 0, y: 0, width: 1, height: 1 },
  }));
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
  const [cropShape, setCropShapeState] = useState<CropShapeName>(options.cropShape ?? 'free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Create / destroy the controller when both refs land. Re-create on `src`
  // change so consumers can swap images without unmounting the component.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const opts = optionsRef.current;
    const config = mergeConfig(opts);

    const callbacks: CropControllerCallbacks = {
      onReady: () => setReady(true),
      onImageLoad: () => {},
      onError: (e) => setError(e.message),
      onChange: (s) => setState(s),
      onCropChange: (c) => setCropRect(c),
      onShapeSync: (s) => setCropShapeState(s),
      onLoadingChange: (l, err) => {
        setLoading(l);
        setError(err);
      },
    };

    const ctrl = createCropController({
      canvas,
      host: container,
      layoutContainer: container,
      config,
      callbacks,
    });
    controllerRef.current = ctrl;

    if (opts.src) {
      void ctrl.loadImage(opts.src).catch(() => {});
    }

    return () => {
      setReady(false);
      ctrl.destroy();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.src]);

  // Push config-only updates (crop-shape, scale bounds, theme, etc.) to the
  // running controller without re-initializing. Skips first render and src
  // changes (handled above).
  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    const { src: _src, ...rest } = options;
    ctrl.update(rest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.cropShape,
    options.minScale,
    options.maxScale,
    options.minCropSize,
    options.theme,
    options.showGrid,
    options.showBleedMargin,
    options.bleedMarginSize,
    options.bleedMarginColor,
    options.enableAnimations,
    options.keyboard,
    options.pinchZoom,
    options.wheelZoom,
  ]);

  // --- Stable actions ---
  const actions = useMemo<CropControllerActions>(() => ({
    loadImage: (src) =>
      controllerRef.current ? controllerRef.current.loadImage(src) : Promise.resolve(),
    rotateLeft: () => controllerRef.current?.rotateLeft(),
    flipHorizontal: () => controllerRef.current?.flipHorizontal(),
    setRotation: (deg) => controllerRef.current?.setRotation(deg),
    setScale: (scale) => controllerRef.current?.setScale(scale),
    setCropShape: (shape) => controllerRef.current?.setCropShape(shape),
    setCropRect: (rect) => controllerRef.current?.setCropRect(rect),
    reset: () => controllerRef.current?.reset(),
  }), []);

  const api = useMemo<CropControllerApi>(() => ({
    toCanvas: () => controllerRef.current?.toCanvas() ?? null,
    toBlob: (type, quality) =>
      controllerRef.current ? controllerRef.current.toBlob(type, quality) : Promise.resolve(null),
    toDataURL: (type, quality) =>
      controllerRef.current?.toDataURL(type, quality) ?? null,
    toTransformParams: () => controllerRef.current?.toTransformParams() ?? null,
    toCloudimageURL: (options) => controllerRef.current?.toCloudimageURL(options) ?? null,
    toCropDescriptor: () => controllerRef.current?.toCropDescriptor() ?? null,
    getController: () => controllerRef.current,
  }), []);

  return {
    canvasRef,
    containerRef,
    state,
    cropRect,
    cropShape,
    scale: state.scale,
    rotation: state.rotation,
    loading,
    error,
    ready,
    actions,
    api,
  };
}
