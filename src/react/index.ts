/**
 * React entry for `@scaleflex/crop/react`.
 *
 * Exports:
 *   - `SfxCrop` — forwardRef component rendering `<sfx-crop>`
 *   - `useSfxCrop` — hook variant for consumers that render the element manually
 *   - `SfxCropElement`, `SfxCropProps`, `SfxCropSaveDetail` — types
 *
 * The wrapper dynamically imports `../define` on module load so the custom
 * element auto-registers whenever this module is evaluated in the browser.
 * SSR-safe: the import is guarded behind a `typeof customElements` check.
 */

// Tier 1 — ready <SfxCrop> component with the built-in toolbar.
export { SfxCrop } from './sfx-crop';
export type { SfxCropProps, SfxCropElement, SfxCropSaveDetail } from './sfx-crop';

// Tier 1 helper — imperative hook against the custom element (same built-in UI).
export { useSfxCrop } from './use-sfx-crop';
export type { UseSfxCropReturn } from './use-sfx-crop';

// Tier 3 — headless controller hook; consumer renders their own canvas + UI.
export { useSfxCropController } from './use-sfx-crop-controller';
export type {
  UseSfxCropControllerOptions,
  UseSfxCropControllerReturn,
  CropControllerState,
  CropControllerActions,
  CropControllerApi,
} from './use-sfx-crop-controller';

// Headless primitives re-exported so React consumers don't need to reach
// into the root `@scaleflex/crop` package for types and the factory.
export { createCropController, DEFAULT_CONFIG, mergeConfig } from '../index';
export type {
  CropController,
  CropControllerOptions,
  CropControllerCallbacks,
  SfxCropConfig,
} from '../index';

export type {
  TransformState,
  TransformParams,
  CropShapeName,
  CropShape,
  CropRect,
  NormalizedRect,
  HandlePosition,
  Point,
  Size,
  CropIconOverrides,
} from '../core/types';
