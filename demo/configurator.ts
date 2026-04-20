import '../src/define';
import type { SfxCropElement } from '../src/elements/sfx-crop';
import type { CropShapeName } from '../src/core/types';

interface ConfiguratorState {
  src: string;
  cropShape: CropShapeName;
  theme: 'light' | 'dark';
  toolbarPosition: 'top' | 'bottom';
  showGrid: boolean;
  showToolbar: boolean;
  showRotateSlider: boolean;
  showZoomSlider: boolean;
  showShapeSelector: boolean;
  showRotateButton: boolean;
  showFlipButton: boolean;
  keyboard: boolean;
  wheelZoom: boolean;
  showBleedMargin: boolean;
}

function createDemoImage(): string {
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 600;
  const ctx = c.getContext('2d')!;

  const sky = ctx.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#1a1a2e');
  sky.addColorStop(1, '#16213e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 800, 400);

  const ground = ctx.createLinearGradient(0, 400, 0, 600);
  ground.addColorStop(0, '#0f3460');
  ground.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 400, 800, 200);

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

  const moonGrad = ctx.createRadialGradient(600, 120, 30, 600, 120, 50);
  moonGrad.addColorStop(0, '#ffeaa7');
  moonGrad.addColorStop(1, '#fdcb6e');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(600, 120, 45, 0, Math.PI * 2);
  ctx.fill();

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

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('@scaleflex/crop', 400, 550);

  return c.toDataURL('image/png');
}

export function initConfigurator(): void {
  const viewer = document.getElementById('configurator-viewer') as SfxCropElement | null;
  if (!viewer) return;

  let currentSrc = createDemoImage();

  const cfgGrid = document.getElementById('cfg-grid') as HTMLInputElement;
  const cfgToolbar = document.getElementById('cfg-toolbar') as HTMLInputElement;
  const cfgRotateSlider = document.getElementById('cfg-rotate-slider') as HTMLInputElement;
  const cfgZoomSlider = document.getElementById('cfg-zoom-slider') as HTMLInputElement;
  const cfgShapeSelector = document.getElementById('cfg-shape-selector') as HTMLInputElement;
  const cfgRotateBtn = document.getElementById('cfg-rotate-btn') as HTMLInputElement;
  const cfgFlipBtn = document.getElementById('cfg-flip-btn') as HTMLInputElement;
  const cfgKeyboard = document.getElementById('cfg-keyboard') as HTMLInputElement;
  const cfgWheelZoom = document.getElementById('cfg-wheel-zoom') as HTMLInputElement;
  const cfgBleed = document.getElementById('cfg-bleed') as HTMLInputElement;

  const cfgCropShape = document.getElementById('cfg-crop-shape') as HTMLSelectElement;
  const cfgTheme = document.getElementById('cfg-theme') as HTMLSelectElement;
  const cfgToolbarPos = document.getElementById('cfg-toolbar-pos') as HTMLSelectElement;

  const cfgCode = document.querySelector('#cfg-code code') as HTMLElement;
  const cfgCopy = document.getElementById('cfg-copy') as HTMLButtonElement;

  const cfgExport = document.getElementById('cfg-export') as HTMLButtonElement;
  const cfgGetParams = document.getElementById('cfg-get-params') as HTMLButtonElement;
  const cfgFileInput = document.getElementById('cfg-file-input') as HTMLInputElement;

  function getState(): ConfiguratorState {
    return {
      src: currentSrc,
      cropShape: cfgCropShape.value as CropShapeName,
      theme: cfgTheme.value as 'light' | 'dark',
      toolbarPosition: cfgToolbarPos.value as 'top' | 'bottom',
      showGrid: cfgGrid.checked,
      showToolbar: cfgToolbar.checked,
      showRotateSlider: cfgRotateSlider.checked,
      showZoomSlider: cfgZoomSlider.checked,
      showShapeSelector: cfgShapeSelector.checked,
      showRotateButton: cfgRotateBtn.checked,
      showFlipButton: cfgFlipBtn.checked,
      keyboard: cfgKeyboard.checked,
      wheelZoom: cfgWheelZoom.checked,
      showBleedMargin: cfgBleed.checked,
    };
  }

  /**
   * Produces an HTML usage example that reflects the selected options,
   * mirroring the Scaleflex `@scaleflex/uploader` / `@scaleflex/asset-picker`
   * documentation style.
   */
  function generateCode(s: ConfiguratorState): string {
    const attrs: string[] = [`  src="https://example.com/photo.jpg"`];
    if (s.cropShape !== 'free') attrs.push(`  crop-shape="${s.cropShape}"`);
    if (s.theme !== 'dark') attrs.push(`  theme="${s.theme}"`);
    if (!s.showGrid) attrs.push(`  show-grid="false"`);
    if (!s.showToolbar) attrs.push(`  ?show-toolbar=\${false}`);
    if (!s.showRotateSlider) attrs.push(`  ?show-rotate-slider=\${false}`);
    if (!s.showZoomSlider) attrs.push(`  ?show-zoom-slider=\${false}`);
    if (!s.showShapeSelector) attrs.push(`  ?show-shape-selector=\${false}`);
    if (!s.showRotateButton) attrs.push(`  ?show-rotate-button=\${false}`);
    if (!s.showFlipButton) attrs.push(`  ?show-flip-button=\${false}`);
    if (s.toolbarPosition !== 'bottom') attrs.push(`  toolbar-position="${s.toolbarPosition}"`);
    if (!s.keyboard) attrs.push(`  ?keyboard=\${false}`);
    if (!s.wheelZoom) attrs.push(`  ?wheel-zoom=\${false}`);
    if (s.showBleedMargin) attrs.push(`  show-bleed-margin`);

    return `import '@scaleflex/crop/define';\n\n<sfx-crop\n${attrs.join('\n')}\n></sfx-crop>`;
  }

  /** Sync the selected state onto the `<sfx-crop>` element. */
  function applyState(): void {
    const s = getState();
    viewer!.src = s.src;
    viewer!.cropShape = s.cropShape;
    viewer!.theme = s.theme;
    viewer!.toolbarPosition = s.toolbarPosition;
    viewer!.showGridAttr = s.showGrid ? 'true' : 'false';
    viewer!.showToolbar = s.showToolbar;
    viewer!.showRotateSlider = s.showRotateSlider;
    viewer!.showZoomSlider = s.showZoomSlider;
    viewer!.showShapeSelector = s.showShapeSelector;
    viewer!.showRotateButton = s.showRotateButton;
    viewer!.showFlipButton = s.showFlipButton;
    viewer!.keyboard = s.keyboard;
    viewer!.wheelZoom = s.wheelZoom;
    viewer!.showBleedMargin = s.showBleedMargin;

    cfgCode.textContent = generateCode(s);
    cfgCode.classList.add('language-html');
    const prism = (window as unknown as { Prism?: { highlightElement(el: HTMLElement): void } }).Prism;
    prism?.highlightElement(cfgCode);
  }

  const toggles = [cfgGrid, cfgToolbar, cfgRotateSlider, cfgZoomSlider, cfgShapeSelector, cfgRotateBtn, cfgFlipBtn, cfgKeyboard, cfgWheelZoom, cfgBleed];
  toggles.forEach((el) => el.addEventListener('change', applyState));

  const selects = [cfgCropShape, cfgTheme, cfgToolbarPos];
  selects.forEach((el) => el.addEventListener('change', applyState));

  cfgCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(cfgCode.textContent || '').then(() => {
      cfgCopy.textContent = 'Copied!';
      setTimeout(() => { cfgCopy.textContent = 'Copy to Clipboard'; }, 2000);
    });
  });

  cfgFileInput?.addEventListener('change', () => {
    const file = cfgFileInput.files?.[0];
    if (!file) return;
    currentSrc = URL.createObjectURL(file);
    applyState();
  });

  cfgExport?.addEventListener('click', async () => {
    try {
      const dataUrl = viewer!.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'cropped.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  });

  cfgGetParams?.addEventListener('click', () => {
    try {
      const params = viewer!.toTransformParams();
      alert(JSON.stringify(params, null, 2));
    } catch (err) {
      console.error('Get params failed:', err);
    }
  });

  applyState();
}
