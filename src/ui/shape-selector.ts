import { createElement, addClass, removeClass } from '../utils/dom';
import {
  ICON_CROP_FREE,
  ICON_CROP_SQUARE,
  ICON_CROP_CIRCLE,
  ICON_CROP_ROUNDED_RECT,
  ICON_CROP_LANDSCAPE,
  ICON_CROP_PORTRAIT,
  ICON_CHEVRON_DOWN,
} from './icons';
import type { CropShapeName } from '../core/types';

interface ShapeOption {
  value: CropShapeName;
  label: string;
  icon: string;
}

const ALL_SHAPES: ShapeOption[] = [
  { value: 'free', label: 'Free', icon: ICON_CROP_FREE },
  { value: 'square', label: 'Square', icon: ICON_CROP_SQUARE },
  { value: 'circle', label: 'Circle', icon: ICON_CROP_CIRCLE },
  { value: 'rounded-rect', label: 'Rounded', icon: ICON_CROP_ROUNDED_RECT },
  { value: '16:9', label: '16:9', icon: ICON_CROP_LANDSCAPE },
  { value: '4:3', label: '4:3', icon: ICON_CROP_LANDSCAPE },
  { value: '3:2', label: '3:2', icon: ICON_CROP_LANDSCAPE },
  { value: '2:3', label: '2:3', icon: ICON_CROP_PORTRAIT },
  { value: '3:4', label: '3:4', icon: ICON_CROP_PORTRAIT },
  { value: '9:16', label: '9:16', icon: ICON_CROP_PORTRAIT },
];

export interface ShapeSelectorHandle {
  setValue(shape: CropShapeName): void;
  destroy(): void;
}

export function createShapeSelector(
  parent: HTMLElement,
  initialShape: CropShapeName,
  onChange: (shape: CropShapeName) => void,
  availableShapes?: CropShapeName[],
): ShapeSelectorHandle {
  const shapes = availableShapes
    ? ALL_SHAPES.filter((s) => availableShapes.includes(s.value))
    : ALL_SHAPES;

  const wrapper = createElement('div', 'ci-crop-shape-selector');

  // Trigger button
  const trigger = createElement('button', 'ci-crop-shape-trigger', {
    'aria-label': 'Select crop shape',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
  });

  const triggerIcon = createElement('span', 'ci-crop-shape-trigger-icon');
  const triggerLabel = createElement('span', 'ci-crop-shape-trigger-label');
  const chevron = createElement('span', 'ci-crop-shape-chevron');
  chevron.innerHTML = ICON_CHEVRON_DOWN;

  trigger.appendChild(triggerIcon);
  trigger.appendChild(triggerLabel);
  trigger.appendChild(chevron);

  // Dropdown
  const dropdown = createElement('div', 'ci-crop-shape-dropdown', { 'role': 'listbox' });

  let currentShape = initialShape;
  let isOpen = false;
  let focusedIndex = -1;
  let optionElements: HTMLElement[] = [];

  function updateTrigger(shape: CropShapeName): void {
    const opt = shapes.find((s) => s.value === shape) || shapes[0];
    triggerIcon.innerHTML = opt.icon;
    triggerLabel.textContent = opt.label;
  }

  function buildOptions(): void {
    dropdown.innerHTML = '';
    optionElements = [];
    focusedIndex = -1;

    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      const option = createElement('button', 'ci-crop-shape-option', {
        'role': 'option',
        'aria-selected': String(shape.value === currentShape),
      });

      const icon = createElement('span', 'ci-crop-shape-option-icon');
      icon.innerHTML = shape.icon;
      const label = createElement('span', 'ci-crop-shape-option-label');
      label.textContent = shape.label;

      option.appendChild(icon);
      option.appendChild(label);

      // Staggered fade-in (spec section 3.10: 20ms delay between items)
      option.style.opacity = '0';
      option.style.transition = 'opacity 180ms ease-out, background var(--ci-crop-transition, 200ms ease)';
      option.style.transitionDelay = `${i * 20}ms`;

      if (shape.value === currentShape) {
        addClass(option, 'ci-crop-shape-option--active');
        focusedIndex = i;
      }

      option.addEventListener('click', (e) => {
        e.stopPropagation();
        currentShape = shape.value;
        updateTrigger(shape.value);
        close();
        onChange(shape.value);
      });

      dropdown.appendChild(option);
      optionElements.push(option);
    }
  }

  function focusOption(index: number): void {
    if (index < 0 || index >= optionElements.length) return;
    focusedIndex = index;
    optionElements[index].focus();
  }

  function open(): void {
    if (isOpen) return;
    isOpen = true;
    buildOptions();
    addClass(wrapper, 'ci-crop-shape-selector--open');
    trigger.setAttribute('aria-expanded', 'true');
    // Focus current selection or first item
    requestAnimationFrame(() => {
      const idx = focusedIndex >= 0 ? focusedIndex : 0;
      focusOption(idx);
      // Trigger staggered fade-in
      optionElements.forEach(el => { el.style.opacity = '1'; });
    });
  }

  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    removeClass(wrapper, 'ci-crop-shape-selector--open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) {
      close();
    } else {
      open();
    }
  });

  // Keyboard navigation
  function onKeyDown(e: KeyboardEvent): void {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        focusOption(Math.min(focusedIndex + 1, optionElements.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        focusOption(Math.max(focusedIndex - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        if (focusedIndex >= 0 && focusedIndex < shapes.length) {
          currentShape = shapes[focusedIndex].value;
          updateTrigger(currentShape);
          close();
          onChange(currentShape);
        }
        break;
    }
  }

  wrapper.addEventListener('keydown', onKeyDown);

  // Close on outside click
  const onDocClick = () => close();
  document.addEventListener('click', onDocClick);

  updateTrigger(initialShape);

  wrapper.appendChild(trigger);
  wrapper.appendChild(dropdown);
  parent.appendChild(wrapper);

  return {
    setValue(shape: CropShapeName): void {
      currentShape = shape;
      updateTrigger(shape);
    },

    destroy(): void {
      wrapper.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onDocClick);
      wrapper.remove();
    },
  };
}
