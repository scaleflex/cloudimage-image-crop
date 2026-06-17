/**
 * Side-effect entry for `@cloudimage/image-crop/define`.
 *
 * Importing this module registers all six public custom elements:
 *   - <cloudimage-crop>          — main editor host
 *   - <cloudimage-crop-canvas>   — stable <canvas> host inside the shadow root
 *   - <cloudimage-crop-toolbar>  — action bar (rotate/flip/sliders/shape selector)
 *   - <cloudimage-crop-zoom>     — zoom slider popover
 *   - <cloudimage-crop-rotate>   — fine-rotation slider popover
 *   - <cloudimage-crop-shapes>   — shape preset dropdown
 *
 * The import is idempotent — repeated imports and React StrictMode double
 * mounts won't throw, thanks to the `safeDefine` guard used by each element.
 */
import { safeDefine } from './elements/base';
import { CloudimageCropElement } from './elements/cloudimage-crop';
import { CloudimageCropCanvasElement } from './elements/cloudimage-crop-canvas';
import { CloudimageCropToolbarElement } from './elements/cloudimage-crop-toolbar';
import { CloudimageCropZoomElement } from './elements/cloudimage-crop-zoom';
import { CloudimageCropRotateElement } from './elements/cloudimage-crop-rotate';
import { CloudimageCropShapesElement } from './elements/cloudimage-crop-shapes';

safeDefine('cloudimage-crop-zoom', CloudimageCropZoomElement);
safeDefine('cloudimage-crop-rotate', CloudimageCropRotateElement);
safeDefine('cloudimage-crop-shapes', CloudimageCropShapesElement);
safeDefine('cloudimage-crop-canvas', CloudimageCropCanvasElement);
safeDefine('cloudimage-crop-toolbar', CloudimageCropToolbarElement);
safeDefine('cloudimage-crop', CloudimageCropElement);

export {};
