import { useCallback, useEffect, useRef, useState } from 'react';
import type { SfxCropElement } from '../elements/sfx-crop';
import type { CropRect, CropShapeName, TransformState, TransformParams } from '../core/types';
import type { CloudimageUrlOptions, CropDescriptor } from '../export/cloudimage-url';

// Auto-register the custom element. Guarded for SSR.
if (typeof customElements !== 'undefined') {
  void import('../define');
}

export interface UseSfxCropReturn {
  /** Attach this ref to your `<sfx-crop ref={ref}>` (or the React `SfxCrop`). */
  ref: React.RefObject<SfxCropElement | null>;
  /** Fires after the editor has loaded the image and the renderer is live. */
  ready: boolean;
  // --- Imperative methods (no-ops before ready) ---
  loadImage(src: string): Promise<void>;
  rotateLeft(): void;
  flipHorizontal(): void;
  setRotation(deg: number): void;
  setScale(scale: number): void;
  setCropShape(shape: CropShapeName): void;
  setCropRect(rect: CropRect): void;
  getCropRect(): CropRect | null;
  getTransformState(): TransformState | null;
  reset(): void;
  toCanvas(): HTMLCanvasElement | null;
  toBlob(type?: string, quality?: number): Promise<Blob | null>;
  toDataURL(type?: string, quality?: number): string | null;
  toTransformParams(): TransformParams | null;
  toCloudimageURL(options?: Partial<CloudimageUrlOptions>): string | null;
  toCropDescriptor(): CropDescriptor | null;
  save(type?: string, quality?: number): Promise<void>;
  cancel(): void;
}

/**
 * Hook variant of the React wrapper — returns a ref to bind plus stable
 * callables for imperative operations. Prefer the `<SfxCrop>` component for
 * declarative usage; reach for this hook when you need to render the element
 * yourself or share imperative access across multiple components.
 */
export function useSfxCrop(): UseSfxCropReturn {
  const ref = useRef<SfxCropElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onReady = (): void => setReady(true);
    el.addEventListener('sfx-crop-ready', onReady);
    return () => {
      el.removeEventListener('sfx-crop-ready', onReady);
      setReady(false);
    };
  }, []);

  const loadImage = useCallback((src: string) => {
    return ref.current ? ref.current.loadImage(src) : Promise.resolve();
  }, []);
  const rotateLeft = useCallback(() => ref.current?.rotateLeft(), []);
  const flipHorizontal = useCallback(() => ref.current?.flipHorizontal(), []);
  const setRotation = useCallback((deg: number) => ref.current?.setRotation(deg), []);
  const setScale = useCallback((scale: number) => ref.current?.setScale(scale), []);
  const setCropShape = useCallback((shape: CropShapeName) => ref.current?.setCropShape(shape), []);
  const setCropRect = useCallback((rect: CropRect) => ref.current?.setCropRect(rect), []);
  const getCropRect = useCallback((): CropRect | null => ref.current?.getCropRect() ?? null, []);
  const getTransformState = useCallback((): TransformState | null => ref.current?.getTransformState() ?? null, []);
  const reset = useCallback(() => ref.current?.reset(), []);
  const toCanvas = useCallback((): HTMLCanvasElement | null => ref.current?.toCanvas() ?? null, []);
  const toBlob = useCallback(async (type?: string, quality?: number): Promise<Blob | null> =>
    ref.current ? ref.current.toBlob(type, quality) : null, []);
  const toDataURL = useCallback((type?: string, quality?: number): string | null =>
    ref.current?.toDataURL(type, quality) ?? null, []);
  const toTransformParams = useCallback((): TransformParams | null =>
    ref.current?.toTransformParams() ?? null, []);
  const toCloudimageURL = useCallback((options?: Partial<CloudimageUrlOptions>): string | null =>
    ref.current?.toCloudimageURL(options) ?? null, []);
  const toCropDescriptor = useCallback((): CropDescriptor | null =>
    ref.current?.toCropDescriptor() ?? null, []);
  const save = useCallback((type?: string, quality?: number): Promise<void> =>
    ref.current ? ref.current.save(type, quality) : Promise.resolve(), []);
  const cancel = useCallback(() => ref.current?.cancel(), []);

  return {
    ref,
    ready,
    loadImage,
    rotateLeft,
    flipHorizontal,
    setRotation,
    setScale,
    setCropShape,
    setCropRect,
    getCropRect,
    getTransformState,
    reset,
    toCanvas,
    toBlob,
    toDataURL,
    toTransformParams,
    toCloudimageURL,
    toCropDescriptor,
    save,
    cancel,
  };
}
