import type { CICropViewConfig, CropShapeName } from './types';

export const DEFAULT_CONFIG: CICropViewConfig = {
  src: '',
  cropShape: 'free',
  initialCrop: null,
  initialRotation: 0,
  initialScale: 1,
  customAspectRatios: [],
  minCropSize: 20,
  availableShapes: ['free', 'square', 'circle', 'rounded-rect', '16:9', '4:3', '3:2'],
  minScale: 0.5,
  maxScale: 5,
  theme: 'dark',
  showGrid: 'interaction',
  showRotateSlider: true,
  showZoomSlider: true,
  showShapeSelector: true,
  showRotateButton: true,
  showFlipButton: true,
  showFlipVButton: true,
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

export function mergeConfig(partial: Partial<CICropViewConfig>): CICropViewConfig {
  return { ...DEFAULT_CONFIG, ...partial };
}

export function validateConfig(config: CICropViewConfig): string[] {
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

/** Parse data-ci-crop-* attributes from an HTML element into a partial config. */
export function parseDataAttributes(element: HTMLElement): Partial<CICropViewConfig> {
  const config: Partial<CICropViewConfig> = {};

  const src = element.getAttribute('data-ci-crop-src');
  if (src) config.src = src;

  const shape = element.getAttribute('data-ci-crop-shape');
  if (shape) config.cropShape = shape as CropShapeName;

  const theme = element.getAttribute('data-ci-crop-theme');
  if (theme === 'light' || theme === 'dark') config.theme = theme;

  const showGrid = element.getAttribute('data-ci-crop-show-grid');
  if (showGrid === 'true') config.showGrid = true;
  else if (showGrid === 'false') config.showGrid = false;
  else if (showGrid === 'interaction') config.showGrid = 'interaction';

  const minScale = element.getAttribute('data-ci-crop-min-scale');
  if (minScale) config.minScale = parseFloat(minScale);

  const maxScale = element.getAttribute('data-ci-crop-max-scale');
  if (maxScale) config.maxScale = parseFloat(maxScale);

  const enableAnimations = element.getAttribute('data-ci-crop-enable-animations');
  if (enableAnimations === 'true') config.enableAnimations = true;
  else if (enableAnimations === 'false') config.enableAnimations = false;

  const toolbarPosition = element.getAttribute('data-ci-crop-toolbar-position');
  if (toolbarPosition === 'top' || toolbarPosition === 'bottom') config.toolbarPosition = toolbarPosition;

  const overlayColor = element.getAttribute('data-ci-crop-overlay-color');
  if (overlayColor) config.overlayColor = overlayColor;

  return config;
}
