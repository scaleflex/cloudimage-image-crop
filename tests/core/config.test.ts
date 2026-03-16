import { describe, it, expect } from 'vitest';
import { mergeConfig, validateConfig, parseDataAttributes, DEFAULT_CONFIG } from '../../src/core/config';

describe('DEFAULT_CONFIG', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_CONFIG.src).toBe('');
    expect(DEFAULT_CONFIG.cropShape).toBe('free');
    expect(DEFAULT_CONFIG.minCropSize).toBe(20);
    expect(DEFAULT_CONFIG.minScale).toBe(0.5);
    expect(DEFAULT_CONFIG.maxScale).toBe(5);
    expect(DEFAULT_CONFIG.theme).toBe('dark');
    expect(DEFAULT_CONFIG.showGrid).toBe('interaction');
    expect(DEFAULT_CONFIG.showRotateSlider).toBe(true);
    expect(DEFAULT_CONFIG.showZoomSlider).toBe(true);
    expect(DEFAULT_CONFIG.showShapeSelector).toBe(true);
    expect(DEFAULT_CONFIG.showRotateButton).toBe(true);
    expect(DEFAULT_CONFIG.showFlipButton).toBe(true);
    expect(DEFAULT_CONFIG.toolbarPosition).toBe('bottom');
    expect(DEFAULT_CONFIG.overlayColor).toBe('rgba(0, 0, 0, 0.55)');
    expect(DEFAULT_CONFIG.handleSize).toBe(12);
    expect(DEFAULT_CONFIG.handleColor).toBe('#ffffff');
    expect(DEFAULT_CONFIG.outputType).toBe('image/png');
    expect(DEFAULT_CONFIG.outputQuality).toBe(0.92);
    expect(DEFAULT_CONFIG.enableAnimations).toBe(true);
    expect(DEFAULT_CONFIG.animationSpeed).toBe(1.0);
  });
});

describe('mergeConfig', () => {
  it('should merge partial config with defaults', () => {
    const config = mergeConfig({ src: 'test.jpg', cropShape: '16:9' });
    expect(config.src).toBe('test.jpg');
    expect(config.cropShape).toBe('16:9');
    expect(config.minScale).toBe(0.5); // default
  });

  it('should override all provided fields', () => {
    const config = mergeConfig({
      src: 'test.jpg',
      theme: 'light',
      minScale: 1,
      maxScale: 3,
      enableAnimations: false,
    });
    expect(config.theme).toBe('light');
    expect(config.minScale).toBe(1);
    expect(config.maxScale).toBe(3);
    expect(config.enableAnimations).toBe(false);
  });
});

describe('validateConfig', () => {
  it('should report missing src', () => {
    const config = mergeConfig({});
    const errors = validateConfig(config);
    expect(errors).toContain('src is required');
  });

  it('should report invalid minScale', () => {
    const config = mergeConfig({ src: 'test.jpg', minScale: -1 });
    const errors = validateConfig(config);
    expect(errors).toContain('minScale must be > 0');
  });

  it('should report maxScale <= minScale', () => {
    const config = mergeConfig({ src: 'test.jpg', minScale: 5, maxScale: 2 });
    const errors = validateConfig(config);
    expect(errors).toContain('maxScale must be > minScale');
  });

  it('should report invalid outputQuality', () => {
    const config = mergeConfig({ src: 'test.jpg', outputQuality: 1.5 });
    const errors = validateConfig(config);
    expect(errors).toContain('outputQuality must be between 0 and 1');
  });

  it('should report invalid minCropSize', () => {
    const config = mergeConfig({ src: 'test.jpg', minCropSize: 0 });
    const errors = validateConfig(config);
    expect(errors).toContain('minCropSize must be >= 1');
  });

  it('should return no errors for valid config', () => {
    const config = mergeConfig({ src: 'test.jpg' });
    const errors = validateConfig(config);
    expect(errors).toEqual([]);
  });
});

describe('parseDataAttributes', () => {
  it('should parse data-ci-crop-src', () => {
    const el = document.createElement('div');
    el.setAttribute('data-ci-crop-src', '/photo.jpg');
    const config = parseDataAttributes(el);
    expect(config.src).toBe('/photo.jpg');
  });

  it('should parse data-ci-crop-shape', () => {
    const el = document.createElement('div');
    el.setAttribute('data-ci-crop-shape', '16:9');
    const config = parseDataAttributes(el);
    expect(config.cropShape).toBe('16:9');
  });

  it('should parse data-ci-crop-theme', () => {
    const el = document.createElement('div');
    el.setAttribute('data-ci-crop-theme', 'light');
    const config = parseDataAttributes(el);
    expect(config.theme).toBe('light');
  });

  it('should parse data-ci-crop-show-grid', () => {
    const el = document.createElement('div');
    el.setAttribute('data-ci-crop-show-grid', 'interaction');
    const config = parseDataAttributes(el);
    expect(config.showGrid).toBe('interaction');
  });

  it('should parse numeric attributes', () => {
    const el = document.createElement('div');
    el.setAttribute('data-ci-crop-min-scale', '0.3');
    el.setAttribute('data-ci-crop-max-scale', '8');
    const config = parseDataAttributes(el);
    expect(config.minScale).toBe(0.3);
    expect(config.maxScale).toBe(8);
  });

  it('should parse boolean attributes', () => {
    const el = document.createElement('div');
    el.setAttribute('data-ci-crop-enable-animations', 'false');
    const config = parseDataAttributes(el);
    expect(config.enableAnimations).toBe(false);
  });

  it('should return empty config for element with no data attributes', () => {
    const el = document.createElement('div');
    const config = parseDataAttributes(el);
    expect(Object.keys(config)).toHaveLength(0);
  });
});
