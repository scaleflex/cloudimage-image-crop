import { CICropView } from '../src/index';
import type { CICropViewInstance } from '../src/core/types';

let instance: CICropViewInstance | null = null;

// Default demo image — inline generated via canvas (no external dependency)
function createDemoImage(): string {
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 600;
  const ctx = c.getContext('2d')!;

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#1a1a2e');
  sky.addColorStop(1, '#16213e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 800, 400);

  // Ground
  const ground = ctx.createLinearGradient(0, 400, 0, 600);
  ground.addColorStop(0, '#0f3460');
  ground.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 400, 800, 200);

  // Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 800;
    const y = Math.random() * 350;
    const r = Math.random() * 1.5 + 0.5;
    ctx.globalAlpha = Math.random() * 0.5 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon
  const moonGrad = ctx.createRadialGradient(600, 120, 30, 600, 120, 50);
  moonGrad.addColorStop(0, '#ffeaa7');
  moonGrad.addColorStop(1, '#fdcb6e');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(600, 120, 45, 0, Math.PI * 2);
  ctx.fill();

  // Mountains
  ctx.fillStyle = '#0a1628';
  ctx.beginPath();
  ctx.moveTo(0, 420);
  ctx.lineTo(150, 300);
  ctx.lineTo(300, 400);
  ctx.lineTo(450, 280);
  ctx.lineTo(550, 370);
  ctx.lineTo(700, 310);
  ctx.lineTo(800, 380);
  ctx.lineTo(800, 420);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('js-cloudimage-crop', 400, 550);

  return c.toDataURL('image/png');
}

const DEFAULT_SRC = createDemoImage();

function initCrop(src: string): void {
  // Destroy previous instance
  if (instance) {
    instance.destroy();
    instance = null;
  }

  instance = new CICropView('#crop-container', {
    src,
    cropShape: 'free',
    showGrid: true,
    showToolbar: true,
    showZoomSlider: true,
    keyboard: true,
    wheelZoom: true,
    pinchZoom: true,
    onReady: () => {
      console.log('CICropView ready');
    },
    onChange: (state) => {
      console.log('State changed:', state);
    },
    onError: (err) => {
      console.error('CICropView error:', err);
    },
  });
}

// File upload
const fileInput = document.getElementById('file-input') as HTMLInputElement;
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  initCrop(url);
});

// Export
document.getElementById('btn-export')?.addEventListener('click', async () => {
  if (!instance) return;

  try {
    const dataUrl = instance.toDataURL('image/png');
    const outputSection = document.getElementById('output')!;
    const outputImg = document.getElementById('output-img') as HTMLImageElement;
    const outputInfo = document.getElementById('output-info')!;

    outputImg.src = dataUrl;
    outputSection.style.display = 'block';

    const params = instance.toTransformParams();
    outputInfo.textContent = `Crop: ${params.crop.width}×${params.crop.height} at (${params.crop.x}, ${params.crop.y}), rotation: ${params.rotation}°, flip: ${params.flipH}`;
  } catch (err) {
    console.error('Export failed:', err);
  }
});

// Reset
document.getElementById('btn-reset')?.addEventListener('click', () => {
  instance?.reset();
});

// Get params
document.getElementById('btn-get-params')?.addEventListener('click', () => {
  if (!instance) return;
  try {
    const params = instance.toTransformParams();
    console.log('Crop params:', params);
    alert(JSON.stringify(params, null, 2));
  } catch (err) {
    console.error('Get params failed:', err);
  }
});

// Init with default image
initCrop(DEFAULT_SRC);
