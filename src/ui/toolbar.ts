import { createElement } from '../utils/dom';
import { ICON_ROTATE_LEFT, ICON_FLIP_H, ICON_FLIP_V } from './icons';
import { createRotateSlider, type RotateSliderHandle } from './rotate-slider';
import { createShapeSelector, type ShapeSelectorHandle } from './shape-selector';
import type { CropShapeName } from '../core/types';

export interface ToolbarCallbacks {
  onRotateLeft(): void;
  onFlipH(): void;
  onFlipV(): void;
  onRotationChange(degrees: number): void;
  onShapeChange(shape: CropShapeName): void;
}

export interface ToolbarOptions {
  showRotateButton?: boolean;
  showFlipButton?: boolean;
  showFlipVButton?: boolean;
  showRotateSlider?: boolean;
  showShapeSelector?: boolean;
  toolbarPosition?: 'top' | 'bottom';
  availableShapes?: CropShapeName[];
}

export interface ToolbarHandle {
  element: HTMLElement;
  setRotation(degrees: number): void;
  setShape(shape: CropShapeName): void;
  destroy(): void;
}

export function createToolbar(
  container: HTMLElement,
  initialShape: CropShapeName,
  callbacks: ToolbarCallbacks,
  options: ToolbarOptions = {},
): ToolbarHandle {
  const {
    showRotateButton = true,
    showFlipButton = true,
    showFlipVButton = true,
    showRotateSlider = true,
    showShapeSelector = true,
    toolbarPosition = 'bottom',
    availableShapes,
  } = options;

  const element = createElement('div', 'ci-crop-toolbar');

  if (toolbarPosition === 'top') {
    element.classList.add('ci-crop-toolbar--top');
  }

  let rotateSliderHandle: RotateSliderHandle | null = null;
  let shapeSelectorHandle: ShapeSelectorHandle | null = null;

  // Left group: Rotate + Flip buttons
  const hasLeftButtons = showRotateButton || showFlipButton;
  if (hasLeftButtons) {
    const leftGroup = createElement('div', 'ci-crop-toolbar-group');

    if (showRotateButton) {
      const rotateBtn = createElement('button', 'ci-crop-toolbar-btn', { 'aria-label': 'Rotate left 90°' });
      rotateBtn.innerHTML = ICON_ROTATE_LEFT;
      rotateBtn.addEventListener('click', callbacks.onRotateLeft);
      leftGroup.appendChild(rotateBtn);
    }

    if (showFlipButton) {
      const flipBtn = createElement('button', 'ci-crop-toolbar-btn', { 'aria-label': 'Flip horizontal' });
      flipBtn.innerHTML = ICON_FLIP_H;
      flipBtn.addEventListener('click', callbacks.onFlipH);
      leftGroup.appendChild(flipBtn);
    }

    if (showFlipVButton) {
      const flipVBtn = createElement('button', 'ci-crop-toolbar-btn', { 'aria-label': 'Flip vertical' });
      flipVBtn.innerHTML = ICON_FLIP_V;
      flipVBtn.addEventListener('click', callbacks.onFlipV);
      leftGroup.appendChild(flipVBtn);
    }

    element.appendChild(leftGroup);
  }

  // Separator
  if (hasLeftButtons && showRotateSlider) {
    element.appendChild(createElement('div', 'ci-crop-toolbar-separator'));
  }

  // Center: Rotation slider
  if (showRotateSlider) {
    rotateSliderHandle = createRotateSlider(element, callbacks.onRotationChange);
  }

  // Separator
  if (showRotateSlider && showShapeSelector) {
    element.appendChild(createElement('div', 'ci-crop-toolbar-separator'));
  }

  // Right: Shape selector
  if (showShapeSelector) {
    shapeSelectorHandle = createShapeSelector(element, initialShape, callbacks.onShapeChange, availableShapes);
  }

  container.appendChild(element);

  return {
    element,

    setRotation(degrees: number): void {
      rotateSliderHandle?.setValue(degrees);
    },

    setShape(shape: CropShapeName): void {
      shapeSelectorHandle?.setValue(shape);
    },

    destroy(): void {
      rotateSliderHandle?.destroy();
      shapeSelectorHandle?.destroy();
      element.remove();
    },
  };
}
