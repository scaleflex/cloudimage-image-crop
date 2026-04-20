import '../src/define';
import type { SfxCropElement } from '../src/elements/sfx-crop';
import type { CropShapeName } from '../src/core/types';
import { initConfigurator } from './configurator';

/**
 * Applies a config bag onto an `<sfx-crop>` element via property assignment.
 * Properties are preferred over attributes so arrays/objects preserve
 * identity and Lit's diff stays stable.
 */
function configureCrop(id: string, cfg: {
  src?: string;
  cropShape?: CropShapeName;
  showGrid?: boolean | 'interaction';
  showToolbar?: boolean;
  showZoomSlider?: boolean;
  showRotateSlider?: boolean;
  keyboard?: boolean;
  wheelZoom?: boolean;
}): SfxCropElement | null {
  const el = document.getElementById(id) as SfxCropElement | null;
  if (!el) return null;
  if (cfg.src !== undefined) el.src = cfg.src;
  if (cfg.cropShape !== undefined) el.cropShape = cfg.cropShape;
  if (cfg.showGrid !== undefined) el.showGridAttr = cfg.showGrid;
  if (cfg.showToolbar !== undefined) el.showToolbar = cfg.showToolbar;
  if (cfg.showZoomSlider !== undefined) el.showZoomSlider = cfg.showZoomSlider;
  if (cfg.showRotateSlider !== undefined) el.showRotateSlider = cfg.showRotateSlider;
  if (cfg.keyboard !== undefined) el.keyboard = cfg.keyboard;
  if (cfg.wheelZoom !== undefined) el.wheelZoom = cfg.wheelZoom;
  return el;
}

// ── Demo image generator ──
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
  ctx.fillText('js-cloudimage-crop', 400, 550);

  return c.toDataURL('image/png');
}

const DEMO_SRC = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=80';

// ── Hero viewer ──
configureCrop('hero-viewer', {
  src: DEMO_SRC,
  cropShape: 'free',
  showGrid: true,
  showToolbar: true,
  showZoomSlider: true,
  showRotateSlider: true,
  keyboard: true,
  wheelZoom: true,
});

// ── Shape demos ──
configureCrop('shape-free',    { src: DEMO_SRC, cropShape: 'free',         showToolbar: false, showGrid: true, keyboard: false, wheelZoom: false });
configureCrop('shape-circle',  { src: DEMO_SRC, cropShape: 'circle',       showToolbar: false, showGrid: true, keyboard: false, wheelZoom: false });
configureCrop('shape-rounded', { src: DEMO_SRC, cropShape: 'rounded-rect', showToolbar: false, showGrid: true, keyboard: false, wheelZoom: false });

// ── Transform demo ──
const transformViewer = configureCrop('transform-viewer', {
  src: DEMO_SRC,
  cropShape: 'free',
  showGrid: true,
  showToolbar: true,
  showZoomSlider: true,
  showRotateSlider: true,
  keyboard: true,
  wheelZoom: true,
});

document.getElementById('btn-rotate-left')?.addEventListener('click', () => transformViewer?.rotateLeft());
document.getElementById('btn-flip-h')?.addEventListener('click', () => transformViewer?.flipHorizontal());
document.getElementById('btn-transform-reset')?.addEventListener('click', () => transformViewer?.reset());

// ── Configurator ──
initConfigurator();

// ── Nav: scroll shadow + active section highlighting ──
const nav = document.getElementById('demo-nav');
const navLinks = document.querySelectorAll<HTMLAnchorElement>('.demo-nav-links a');
const sections = document.querySelectorAll<HTMLElement>('main section[id]');

function updateNav(): void {
  if (nav) {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }

  let currentId = '';
  const offset = 120;
  for (const section of sections) {
    if (section.offsetTop - offset <= window.scrollY) {
      currentId = section.id;
    }
  }
  for (const link of navLinks) {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === `#${currentId}`);
  }
}

for (const link of navLinks) {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href?.startsWith('#')) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    const navHeight = nav ? nav.offsetHeight : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  });
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

// ── Mobile burger menu ──
const burger = document.getElementById('nav-burger');
if (nav && burger) {
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });

  for (const link of navLinks) {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  }
}

// ── Also by Scaleflex — slide auto-rotation ──
{
  const slides = document.querySelectorAll<HTMLElement>('.demo-also-slide');
  const dotsContainer = document.getElementById('also-dots');
  if (slides.length > 0 && dotsContainer) {
    let current = 0;
    let animating = false;
    let timer: ReturnType<typeof setInterval>;

    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement('button');
      dot.className = `demo-also-dot${i === 0 ? ' demo-also-dot--active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }

    function clearAnimClasses(el: HTMLElement) {
      el.classList.remove(
        'demo-also-slide--enter-right', 'demo-also-slide--enter-left',
        'demo-also-slide--leave-left', 'demo-also-slide--leave-right',
      );
    }

    function goTo(index: number) {
      if (index === current || animating) return;
      animating = true;
      const forward = index > current || (current === slides.length - 1 && index === 0);
      const prev = slides[current];
      const next = slides[index];

      clearAnimClasses(prev);
      prev.classList.remove('demo-also-slide--active');
      prev.classList.add(forward ? 'demo-also-slide--leave-left' : 'demo-also-slide--leave-right');

      clearAnimClasses(next);
      next.classList.add(forward ? 'demo-also-slide--enter-right' : 'demo-also-slide--enter-left');

      next.addEventListener('animationend', function handler() {
        next.removeEventListener('animationend', handler);
        clearAnimClasses(prev);
        clearAnimClasses(next);
        next.classList.add('demo-also-slide--active');
        animating = false;
      });

      current = index;
      dotsContainer!.querySelectorAll('.demo-also-dot').forEach((d, i) => {
        d.classList.toggle('demo-also-dot--active', i === current);
      });
      resetTimer();
    }

    function resetTimer() {
      clearInterval(timer);
      timer = setInterval(() => {
        goTo((current + 1) % slides.length);
      }, 5000);
    }

    resetTimer();
  }
}
