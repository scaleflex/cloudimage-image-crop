import { createElement } from '../utils/dom';
import { clamp } from '../utils/math';

export interface RotateSliderHandle {
  setValue(degrees: number): void;
  destroy(): void;
}

export function createRotateSlider(
  parent: HTMLElement,
  onChange: (degrees: number) => void,
): RotateSliderHandle {
  const wrapper = createElement('div', 'ci-crop-rotate-slider');

  const minLabel = createElement('span', 'ci-crop-rotate-range-label');
  minLabel.textContent = '-45°';

  const sliderContainer = createElement('div', 'ci-crop-rotate-slider-track');

  const input = createElement('input', 'ci-crop-rotate-input');
  input.type = 'range';
  input.min = '-45';
  input.max = '45';
  input.value = '0';
  input.step = '0.1';
  input.setAttribute('aria-label', 'Fine rotation');
  input.setAttribute('aria-valuemin', '-45');
  input.setAttribute('aria-valuemax', '45');
  input.setAttribute('aria-valuenow', '0');
  input.setAttribute('aria-valuetext', '0°');

  // Center tick mark
  const centerTick = createElement('div', 'ci-crop-rotate-center-tick');
  sliderContainer.appendChild(input);
  sliderContainer.appendChild(centerTick);

  const maxLabel = createElement('span', 'ci-crop-rotate-range-label');
  maxLabel.textContent = '+45°';

  const valueLabel = createElement('span', 'ci-crop-rotate-label');
  valueLabel.textContent = '0°';

  // Snap to zero behavior
  let isDragging = false;

  const handleInput = () => {
    const value = parseFloat(input.value);
    valueLabel.textContent = `${value > 0 ? '+' : ''}${value.toFixed(1)}°`;
    input.setAttribute('aria-valuenow', String(value));
    input.setAttribute('aria-valuetext', `${value > 0 ? '+' : ''}${value.toFixed(1)}°`);
    onChange(value);
  };

  input.addEventListener('input', handleInput);

  input.addEventListener('mousedown', () => { isDragging = true; });
  input.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });

  const stopDrag = () => {
    isDragging = false;
    // Snap to zero on release if close
    const value = parseFloat(input.value);
    if (Math.abs(value) < 2) {
      input.value = '0';
      valueLabel.textContent = '0°';
      input.setAttribute('aria-valuenow', '0');
      input.setAttribute('aria-valuetext', '0°');
      onChange(0);
    }
  };

  input.addEventListener('mouseup', stopDrag);
  input.addEventListener('touchend', stopDrag);

  // Double-click to reset
  input.addEventListener('dblclick', () => {
    input.value = '0';
    valueLabel.textContent = '0°';
    input.setAttribute('aria-valuenow', '0');
    input.setAttribute('aria-valuetext', '0°');
    onChange(0);
  });

  wrapper.appendChild(minLabel);
  wrapper.appendChild(sliderContainer);
  wrapper.appendChild(maxLabel);
  wrapper.appendChild(valueLabel);
  parent.appendChild(wrapper);

  return {
    setValue(degrees: number) {
      const v = clamp(degrees, -45, 45);
      input.value = String(v);
      valueLabel.textContent = `${v > 0 ? '+' : ''}${v.toFixed(1)}°`;
      input.setAttribute('aria-valuenow', String(v));
      input.setAttribute('aria-valuetext', `${v > 0 ? '+' : ''}${v.toFixed(1)}°`);
    },

    destroy() {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('mouseup', stopDrag);
      input.removeEventListener('touchend', stopDrag);
      wrapper.remove();
    },
  };
}
