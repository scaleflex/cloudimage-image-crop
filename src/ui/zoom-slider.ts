import { createElement } from '../utils/dom';
import { ICON_ZOOM_OUT, ICON_ZOOM_IN } from './icons';
import { clamp } from '../utils/math';

function scaleToSlider(scale: number, minScale: number, maxScale: number): number {
  return Math.log(scale / minScale) / Math.log(maxScale / minScale);
}

function sliderToScale(value: number, minScale: number, maxScale: number): number {
  return minScale * Math.pow(maxScale / minScale, value);
}

export interface ZoomSliderHandle {
  setValue(scale: number): void;
  destroy(): void;
}

export function createZoomSlider(
  container: HTMLElement,
  minScale: number,
  maxScale: number,
  onChange: (scale: number) => void,
): ZoomSliderHandle {
  const wrapper = createElement('div', 'ci-crop-zoom-slider');

  // Minus button
  const minusBtn = createElement('button', 'ci-crop-zoom-btn', { 'aria-label': 'Zoom out' });
  minusBtn.innerHTML = ICON_ZOOM_OUT;
  minusBtn.addEventListener('click', () => {
    const sliderVal = parseFloat(input.value);
    const current = sliderToScale(sliderVal, minScale, maxScale);
    const newVal = clamp(current * 0.9, minScale, maxScale);
    input.value = String(scaleToSlider(newVal, minScale, maxScale));
    label.textContent = `${Math.round(newVal * 100)}%`;
    onChange(newVal);
  });

  const label = createElement('span', 'ci-crop-zoom-label');
  label.textContent = '100%';

  const input = createElement('input', 'ci-crop-zoom-input');
  input.type = 'range';
  input.min = '0';
  input.max = '1';
  input.value = String(scaleToSlider(1, minScale, maxScale));
  input.step = '0.001';
  input.setAttribute('aria-label', 'Zoom');
  input.setAttribute('aria-valuemin', String(minScale));
  input.setAttribute('aria-valuemax', String(maxScale));
  input.setAttribute('aria-valuenow', '1');
  input.setAttribute('aria-valuetext', '100%');

  // Plus button
  const plusBtn = createElement('button', 'ci-crop-zoom-btn', { 'aria-label': 'Zoom in' });
  plusBtn.innerHTML = ICON_ZOOM_IN;
  plusBtn.addEventListener('click', () => {
    const sliderVal = parseFloat(input.value);
    const current = sliderToScale(sliderVal, minScale, maxScale);
    const newVal = clamp(current * 1.1, minScale, maxScale);
    input.value = String(scaleToSlider(newVal, minScale, maxScale));
    label.textContent = `${Math.round(newVal * 100)}%`;
    onChange(newVal);
  });

  const handleInput = () => {
    const sliderVal = parseFloat(input.value);
    const scale = sliderToScale(sliderVal, minScale, maxScale);
    label.textContent = `${Math.round(scale * 100)}%`;
    input.setAttribute('aria-valuenow', String(scale.toFixed(2)));
    input.setAttribute('aria-valuetext', `${Math.round(scale * 100)}%`);
    onChange(scale);
  };

  input.addEventListener('input', handleInput);

  // Double-click to reset to 100%
  input.addEventListener('dblclick', () => {
    input.value = String(scaleToSlider(1, minScale, maxScale));
    label.textContent = '100%';
    input.setAttribute('aria-valuenow', '1');
    input.setAttribute('aria-valuetext', '100%');
    onChange(1);
  });

  wrapper.appendChild(minusBtn);
  wrapper.appendChild(input);
  wrapper.appendChild(label);
  wrapper.appendChild(plusBtn);
  container.appendChild(wrapper);

  return {
    setValue(scale: number) {
      const v = clamp(scale, minScale, maxScale);
      input.value = String(scaleToSlider(v, minScale, maxScale));
      label.textContent = `${Math.round(v * 100)}%`;
      input.setAttribute('aria-valuenow', String(v.toFixed(2)));
      input.setAttribute('aria-valuetext', `${Math.round(v * 100)}%`);
    },

    destroy() {
      input.removeEventListener('input', handleInput);
      wrapper.remove();
    },
  };
}
