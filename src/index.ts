/**
 * `@scaleflex/image-crop` — public, side-effect-free entry.
 *
 * Three tiers of adoption live here:
 *   1. Ready component — `<sfx-crop>` via `@scaleflex/image-crop/define`.
 *   2. (reserved for future sub-element assembly.)
 *   3. Headless controller — `createCropController({ canvas, host, config })`
 *      drives pointer, keyboard, render, and export against a consumer-owned
 *      `<canvas>` with zero built-in UI. The custom element below is thin
 *      sugar on top of this same factory.
 *
 * No side effects — importing this module does not register any custom
 * element. Import `@scaleflex/image-crop/define` for that. React consumers can
 * import from `@scaleflex/image-crop/react` for a `<SfxCrop>` component + hooks.
 */

export { SfxCropElement } from './elements/sfx-crop';

// Headless tier — build a custom UI around a consumer-owned <canvas>.
export { createCropController } from './core/crop-controller';
export type {
  CropController,
  CropControllerOptions,
  CropControllerCallbacks,
} from './core/crop-controller';

export { mergeConfig, DEFAULT_CONFIG, TOOLBAR_RESERVE_PX } from './core/config';

export type {
  SfxCropConfig,
  TransformState,
  TransformParams,
  CropShapeName,
  CropShapeBuiltin,
  CropShape,
  CropShapeConfig,
  CropRect,
  NormalizedRect,
  DisplayState,
  HitTarget,
  HandlePosition,
  Point,
  Size,
  SpringConfig,
  LerpConfig,
  CropIconOverrides,
} from './core/types';

export { parseRatio, getAspectRatio } from './transforms/constrain';
export { imageToCanvas, canvasToImage, buildTransformMatrix } from './transforms/matrix';

// Cloudimage server-side crop — turn a crop/transform into a Cloudimage URL
// instead of a rasterized Blob (see `outputMode` / `toCloudimageURL()`).
export { buildCloudimageUrl, buildCloudimageUrlFromDescriptor } from './export/cloudimage-url';
export type { CloudimageUrlOptions, CloudimageTarget, CropDescriptor } from './export/cloudimage-url';
// Lower-level crop plan — lets a consumer inspect `clamped` (the crop reaches
// outside the photo, so the CDN result drops background margins the canvas
// shows) before committing to a server-side URL.
export { resolveServerCrop } from './export/exporter';
export type { ServerCrop } from './export/exporter';
