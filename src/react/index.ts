/**
 * React entry for `@cloudimage/image-crop/react`.
 *
 * Exports:
 *   - `CloudimageCrop` — forwardRef component rendering `<cloudimage-crop>`
 *   - `useCloudimageCrop` — hook variant for consumers that render the element manually
 *   - `CloudimageCropElement`, `CloudimageCropProps`, `CloudimageCropSaveDetail` — types
 *
 * The wrapper dynamically imports `../define` on module load so the custom
 * element auto-registers whenever this module is evaluated in the browser.
 * SSR-safe: the import is guarded behind a `typeof customElements` check.
 */

// Tier 1 — ready <CloudimageCrop> component with the built-in toolbar.
export { CloudimageCrop } from './cloudimage-crop';
export type { CloudimageCropProps, CloudimageCropElement, CloudimageCropSaveDetail } from './cloudimage-crop';

// Tier 1 helper — imperative hook against the custom element (same built-in UI).
export { useCloudimageCrop } from './use-cloudimage-crop';
export type { UseCloudimageCropReturn } from './use-cloudimage-crop';

// Tier 3 — headless controller hook; consumer renders their own canvas + UI.
export { useCloudimageCropController } from './use-cloudimage-crop-controller';
export type {
  UseCloudimageCropControllerOptions,
  UseCloudimageCropControllerReturn,
  CropControllerState,
  CropControllerActions,
  CropControllerApi,
} from './use-cloudimage-crop-controller';

// Headless primitives re-exported so React consumers don't need to reach
// into the root `@cloudimage/image-crop` package for types and the factory.
export { createCropController, DEFAULT_CONFIG, mergeConfig, buildCloudimageUrl, buildCloudimageUrlFromDescriptor, resolveServerCrop, calibrateServerFraming } from '../index';
export type {
  CropController,
  CropControllerOptions,
  CropControllerCallbacks,
  CloudimageCropConfig,
  CloudimageUrlOptions,
  CloudimageTarget,
  CropDescriptor,
  ServerCrop,
  ServerFraming,
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
