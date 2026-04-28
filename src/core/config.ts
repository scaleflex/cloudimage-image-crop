import type { SfxCropConfig } from './types';

/**
 * Vertical space (in CSS px) reserved below the canvas for the toolbar when
 * fitting the image to the host container. Both the controller and the
 * renderer reach for this; keep them in sync by importing from here.
 */
export const TOOLBAR_RESERVE_PX = 80;

export const DEFAULT_CONFIG: SfxCropConfig = {
  src: '',
  cropShape: '16:9',
  initialCrop: null,
  initialRotation: 0,
  initialScale: 1,
  customAspectRatios: [],
  minCropSize: 20,
  availableShapes: [
    'free', 'square',
    '16:9', '4:3', '3:2', '5:4', '2:1',
    '9:16', '3:4', '2:3', '4:5', '1:2',
  ],
  minScale: 0.5,
  maxScale: 5,
  theme: 'light',
  showGrid: 'interaction',
  showRotateSlider: true,
  showZoomSlider: true,
  showShapeSelector: true,
  showRotateButton: true,
  showFlipButton: true,
  toolbarPosition: 'bottom',
  showToolbar: true,
  overlayColor: 'rgba(0, 0, 0, 0.55)',
  handleSize: 12,
  handleColor: '#ffffff',
  borderRadius: 20,
  outputType: 'image/png',
  outputQuality: 0.92,
  maxOutputWidth: 0,
  maxOutputHeight: 0,
  showBleedMargin: false,
  bleedMarginSize: 10,
  bleedMarginColor: 'rgba(255, 0, 0, 0.5)',
  enableAnimations: true,
  animationSpeed: 1.0,
  keyboard: true,
  pinchZoom: true,
  wheelZoom: true,
};

export function mergeConfig(partial: Partial<SfxCropConfig>): SfxCropConfig {
  return { ...DEFAULT_CONFIG, ...partial };
}

export function validateConfig(config: SfxCropConfig): string[] {
  const errors: string[] = [];

  if (!config.src) {
    errors.push('src is required');
  }

  if (config.minScale <= 0) {
    errors.push('minScale must be > 0');
  }

  if (config.maxScale <= config.minScale) {
    errors.push('maxScale must be > minScale');
  }

  if (config.outputQuality < 0 || config.outputQuality > 1) {
    errors.push('outputQuality must be between 0 and 1');
  }

  if (config.minCropSize < 1) {
    errors.push('minCropSize must be >= 1');
  }

  return errors;
}
