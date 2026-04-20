/**
 * `@scaleflex/crop` — public, side-effect-free entry.
 *
 * Types + pure helpers only. For the custom element registration import
 * `@scaleflex/crop/define`; for the React binding import
 * `@scaleflex/crop/react`.
 */

export { SfxCropElement } from './elements/sfx-crop';

export type {
  SfxCropConfig,
  TransformState,
  TransformParams,
  CropShapeName,
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
} from './core/types';

export { imageToCanvas, canvasToImage, buildTransformMatrix } from './transforms/matrix';
