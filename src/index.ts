/**
 * `@scaleflex/crop` — public, side-effect-free entry.
 *
 * Three tiers of adoption live here:
 *   1. Ready component — `<sfx-crop>` via `@scaleflex/crop/define`.
 *   2. (reserved for future sub-element assembly.)
 *   3. Headless controller — `createCropController({ canvas, host, config })`
 *      drives pointer, keyboard, render, and export against a consumer-owned
 *      `<canvas>` with zero built-in UI. The custom element below is thin
 *      sugar on top of this same factory.
 *
 * No side effects — importing this module does not register any custom
 * element. Import `@scaleflex/crop/define` for that. React consumers can
 * import from `@scaleflex/crop/react` for a `<SfxCrop>` component + hooks.
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
