/**
 * Demo site for @scaleflex/crop.
 *
 * Hash-routed SPA matching the shell of @scaleflex/uploader's demo site:
 *   #/                             landing
 *   #/docs/<slug>                  documentation pages
 *   #/examples/<slug>              example playgrounds
 *
 * All page content is plain TS returning HTML template literals rendered
 * into #content.innerHTML — no framework on the site chrome. The
 * `<sfx-crop>` custom element used on live sections is the component being
 * demoed (imported via the side-effect entry below).
 */

import '../src/define';
import type { SfxCropElement } from '../src/elements/sfx-crop';
import type { CropShapeName } from '../src/core/types';

declare global {
  interface Window { Prism?: { highlightAll(): void; highlightElement(el: Element): void } }
}

// ---------------------------------------------------------------------------
// Demo image
// ---------------------------------------------------------------------------

const DEMO_SRC = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=80';

// ---------------------------------------------------------------------------
// Icons (Lucide-style, 20×20 stroke, matching @scaleflex/uploader's palette)
// ---------------------------------------------------------------------------

const ICONS = {
  github: '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
  npm: '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M0 256V0h256v256H0zm41-41h59.2v-133H141v133h33.4V41H41v174z"/></svg>',
  external: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>',
  burger: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
};

// ---------------------------------------------------------------------------
// Theme toggle — scoped per <sfx-crop> preview. Each `.demo-crop-wrap` that
// hosts a crop gets its own button; clicking flips only that sibling crop
// between `theme="light"` and `theme="dark"`. The last choice is persisted
// so the preview restores the same theme after navigation.

const THEME_KEY = 'sfx-crop-demo-theme';
type DemoTheme = 'light' | 'dark';

function getStoredTheme(): DemoTheme {
  const v = localStorage.getItem(THEME_KEY);
  return v === 'dark' ? 'dark' : 'light';
}

function syncToggleButton(btn: HTMLButtonElement, theme: DemoTheme): void {
  btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  btn.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch crop to light theme' : 'Switch crop to dark theme',
  );
  btn.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
}

function applyThemeToWrap(wrap: HTMLElement, theme: DemoTheme): void {
  wrap.querySelectorAll('sfx-crop').forEach((el) => el.setAttribute('theme', theme));
  const btn = wrap.querySelector<HTMLButtonElement>('.demo-theme-toggle');
  if (btn) syncToggleButton(btn, theme);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Renders a code block with a copy button. `lang` hints Prism highlighting.
 */
function codeBlock(code: string, lang = 'typescript'): string {
  const id = `code-${Math.random().toString(36).slice(2, 8)}`;
  return `
    <div class="demo-code-wrap">
      <pre><code class="language-${lang}" id="${id}">${escapeHtml(code.trim())}</code></pre>
      <button class="demo-copy-btn" data-copy-target="${id}" aria-label="Copy to clipboard">
        ${ICONS.copy}
      </button>
    </div>
  `;
}

/**
 * Renders a tabbed code group (e.g. HTML | React | TypeScript). Each tab is
 * its own `codeBlock`. Tabs show the first block by default.
 */
function tabbedCode(tabs: { label: string; code: string; lang: string }[]): string {
  const groupId = `tabs-${Math.random().toString(36).slice(2, 8)}`;
  return `
    <div class="demo-tabs" data-group="${groupId}">
      <div class="demo-tabs-head">
        ${tabs.map((t, i) => `
          <button class="demo-tabs-btn${i === 0 ? ' is-active' : ''}" data-tab-index="${i}">${t.label}</button>
        `).join('')}
      </div>
      <div class="demo-tabs-body">
        ${tabs.map((t, i) => `
          <div class="demo-tabs-pane${i === 0 ? ' is-active' : ''}" data-tab-index="${i}">${codeBlock(t.code, t.lang)}</div>
        `).join('')}
      </div>
    </div>
  `;
}

function bindCopyButtons(root: HTMLElement): void {
  for (const btn of root.querySelectorAll<HTMLButtonElement>('.demo-copy-btn')) {
    btn.addEventListener('click', () => {
      const id = btn.dataset.copyTarget!;
      const code = root.querySelector<HTMLElement>(`#${id}`);
      if (!code) return;
      navigator.clipboard.writeText(code.textContent ?? '').then(() => {
        btn.classList.add('is-copied');
        btn.innerHTML = ICONS.check;
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.innerHTML = ICONS.copy;
        }, 1600);
      });
    });
  }
}

function bindTabs(root: HTMLElement): void {
  for (const group of root.querySelectorAll<HTMLElement>('.demo-tabs')) {
    const heads = group.querySelectorAll<HTMLButtonElement>('.demo-tabs-btn');
    const panes = group.querySelectorAll<HTMLElement>('.demo-tabs-pane');
    heads.forEach((btn) => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.tabIndex);
      heads.forEach((b) => b.classList.toggle('is-active', Number(b.dataset.tabIndex) === idx));
      panes.forEach((p) => p.classList.toggle('is-active', Number(p.dataset.tabIndex) === idx));
    }));
  }
}

function highlight(root: HTMLElement): void {
  if (typeof window.Prism === 'undefined') {
    setTimeout(() => highlight(root), 60);
    return;
  }
  for (const el of root.querySelectorAll<HTMLElement>('pre code')) {
    window.Prism.highlightElement(el);
  }
}

// ---------------------------------------------------------------------------
// Layout shell: header + sidebar + footer
// ---------------------------------------------------------------------------

interface Route {
  path: string;
  label: string;
}

const DOC_ROUTES: Route[] = [
  { path: '/docs/getting-started', label: 'Getting started' },
  { path: '/docs/configuration',   label: 'Configuration' },
  { path: '/docs/api',             label: 'API reference' },
  { path: '/docs/theming',         label: 'Theming' },
  { path: '/docs/types',           label: 'TypeScript types' },
];

interface ExampleGroup { label: string; items: Route[] }

const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    label: 'Getting started',
    items: [
      { path: '/examples/basic',          label: 'Basic usage' },
      { path: '/examples/react',          label: 'React wrapper' },
    ],
  },
  {
    label: 'Crop configuration',
    items: [
      { path: '/examples/shapes',         label: 'Shape presets' },
      { path: '/examples/fixed',          label: 'Fixed variant' },
      { path: '/examples/initial-state',  label: 'Initial state' },
    ],
  },
  {
    label: 'Interactions',
    items: [
      { path: '/examples/transforms',     label: 'Transforms & guides' },
    ],
  },
  {
    label: 'Integration',
    items: [
      { path: '/examples/events',         label: 'Event handling' },
      { path: '/examples/export',         label: 'Export (blob / data-URL)' },
    ],
  },
  {
    label: 'Appearance',
    items: [
      { path: '/examples/theming',        label: 'Theming tokens' },
      { path: '/examples/custom-icons',   label: 'Custom icons' },
    ],
  },
];

function renderHeader(currentPath: string): string {
  const isHome = currentPath === '/';
  const isDocs = currentPath.startsWith('/docs');
  const isEx   = currentPath.startsWith('/examples');
  return `
    <header class="demo-topbar" role="banner">
      <div class="demo-topbar-inner">
        <button class="demo-topbar-burger" id="demo-burger" aria-label="Toggle sidebar">${ICONS.burger}</button>
        <a href="#/" class="demo-topbar-logo" aria-label="Scaleflex home">
          <img src="https://assets.scaleflex.com/Marketing/Logos/Scaleflex%20Logos/Logo%20Horizontal/scaleflex%20logo%20without%20tagline%20white%20text%20%28horizontal%29%20.png?vh=85bc00" alt="Scaleflex" height="28" />
        </a>
        <nav class="demo-topbar-nav" aria-label="Primary">
          <a href="#/"                          class="demo-topbar-nav-link${isHome ? ' is-active' : ''}">Home</a>
          <a href="#/docs/getting-started"      class="demo-topbar-nav-link${isDocs ? ' is-active' : ''}">Documentation</a>
          <a href="#/examples/basic"            class="demo-topbar-nav-link${isEx ? ' is-active' : ''}">Examples</a>
        </nav>
        <div class="demo-topbar-actions">
          <a class="demo-topbar-chip" href="https://github.com/scaleflex/js-cloudimage-crop" target="_blank" rel="noopener" aria-label="GitHub repository">
            ${ICONS.github}<span>GitHub</span>
          </a>
          <a class="demo-topbar-chip demo-topbar-chip--icon" href="https://www.npmjs.com/package/@scaleflex/crop" target="_blank" rel="noopener" aria-label="npm package">
            ${ICONS.npm}
          </a>
        </div>
      </div>
    </header>
  `;
}

function renderSidebar(currentPath: string): string {
  if (currentPath.startsWith('/docs')) {
    return `
      <aside class="demo-sidebar" id="demo-sidebar" aria-label="Documentation">
        <div class="demo-sidebar-inner">
          <div class="demo-sidebar-title">Documentation</div>
          <nav class="demo-sidebar-nav">
            ${DOC_ROUTES.map((r) => `
              <a href="#${r.path}" class="demo-sidebar-link${currentPath === r.path ? ' is-active' : ''}">${r.label}</a>
            `).join('')}
          </nav>
        </div>
      </aside>
    `;
  }
  if (currentPath.startsWith('/examples')) {
    return `
      <aside class="demo-sidebar" id="demo-sidebar" aria-label="Examples">
        <div class="demo-sidebar-inner">
          ${EXAMPLE_GROUPS.map((g) => `
            <div class="demo-sidebar-group">
              <div class="demo-sidebar-group-label">${g.label}</div>
              <nav class="demo-sidebar-nav">
                ${g.items.map((r) => `
                  <a href="#${r.path}" class="demo-sidebar-link${currentPath === r.path ? ' is-active' : ''}">${r.label}</a>
                `).join('')}
              </nav>
            </div>
          `).join('')}
        </div>
      </aside>
    `;
  }
  return '';
}

function renderFooter(): string {
  return `
    <footer class="demo-footer" role="contentinfo">
      <div class="demo-footer-main">
        <div class="demo-footer-brand">
          <a href="https://www.scaleflex.com" target="_blank" rel="noopener">
            <img src="https://assets.scaleflex.com/Marketing/Logos/Scaleflex%20Logos/Logo%20Horizontal/scaleflex%20logo%20without%20tagline%20white%20text%20%28horizontal%29%20.png?vh=85bc00" alt="Scaleflex" height="22" />
          </a>
          <p>Image infrastructure for teams that ship.</p>
        </div>
        <div class="demo-footer-col">
          <h4>Resources</h4>
          <a href="#/docs/getting-started">Documentation</a>
          <a href="#/examples/basic">Examples</a>
          <a href="https://github.com/scaleflex/js-cloudimage-crop" target="_blank" rel="noopener">GitHub ${ICONS.external}</a>
          <a href="https://www.npmjs.com/package/@scaleflex/crop" target="_blank" rel="noopener">npm ${ICONS.external}</a>
        </div>
        <div class="demo-footer-col">
          <h4>Also by Scaleflex</h4>
          <a href="https://www.npmjs.com/package/@scaleflex/uploader" target="_blank" rel="noopener">@scaleflex/uploader ${ICONS.external}</a>
          <a href="https://www.npmjs.com/package/@scaleflex/asset-picker" target="_blank" rel="noopener">@scaleflex/asset-picker ${ICONS.external}</a>
          <a href="https://github.com/scaleflex/filerobot-image-editor" target="_blank" rel="noopener">filerobot-image-editor ${ICONS.external}</a>
        </div>
        <div class="demo-footer-col">
          <h4>Company</h4>
          <a href="https://www.scaleflex.com" target="_blank" rel="noopener">About ${ICONS.external}</a>
          <a href="https://www.scaleflex.com/en/contact" target="_blank" rel="noopener">Contact ${ICONS.external}</a>
        </div>
      </div>
      <div class="demo-footer-bottom">
        <span>© ${new Date().getFullYear()} Scaleflex. MIT license.</span>
      </div>
    </footer>
  `;
}

// ---------------------------------------------------------------------------
// Pages — landing
// ---------------------------------------------------------------------------

function renderHome(): string {
  const svg = (inner: string): string =>
    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  const featureCards = [
    {
      icon: svg('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>'),
      title: 'Free / ratio / circle',
      body: '10 built-in crop presets plus rounded-rect with custom border radius.',
    },
    {
      icon: svg('<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>'),
      title: 'Rotate, flip, zoom',
      body: '90° steps, ±45° fine rotation with snap-to-zero, pinch + wheel zoom, pan.',
    },
    {
      icon: svg('<circle cx="13.5" cy="6.5" r=".7"/><circle cx="17.5" cy="10.5" r=".7"/><circle cx="8.5" cy="7.5" r=".7"/><circle cx="6.5" cy="12.5" r=".7"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.83-.44-1.12-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.66h1.99c3.05 0 5.56-2.5 5.56-5.56C21.97 6.01 17.46 2 12 2z"/>'),
      title: 'Fully themeable',
      body: '--sfx-cr-* CSS custom properties + ::part() theming — match any brand.',
    },
    {
      icon: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M18 10h.01"/><path d="M6 14h.01"/><path d="M18 14h.01"/><path d="M10 14h4"/>'),
      title: 'Keyboard + A11y',
      body: 'Arrow keys, R/F shortcuts, tabindex, ARIA live-region announcements.',
    },
    {
      icon: svg('<circle cx="12" cy="12" r="1.2"/><ellipse cx="12" cy="12" rx="10" ry="4.5"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)"/>'),
      title: 'React binding',
      body: 'forwardRef wrapper and useSfxCrop() hook via @scaleflex/crop/react.',
    },
    {
      icon: svg('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
      title: 'Light & fast',
      body: '~21 KB gzipped total cold-start; ESM + CJS; Lit 3 under the hood.',
    },
  ];

  const siblingSlides = [
    {
      title: '@scaleflex/<span class="demo-gradient-text">uploader</span>',
      desc: 'Drag &amp; drop file uploader with 7 cloud providers, resumable uploads, and a polished UI that pairs with Crop.',
      liveUrl: 'https://scaleflex.github.io/uploader/',
      repoUrl: 'https://github.com/scaleflex/uploader',
      visual: `
        <svg viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" class="demo-also-icon">
          <rect x="4" y="4" width="172" height="172" rx="12" stroke="url(#also-grad-0)" stroke-width="2" opacity="0.3"/>
          <rect x="24" y="40" width="132" height="100" rx="10" stroke="url(#also-grad-0)" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.5"/>
          <path d="M90 60 L90 110" stroke="url(#also-grad-0)" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
          <path d="M72 78 L90 60 L108 78" stroke="url(#also-grad-0)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
          <circle cx="90" cy="90" r="60" stroke="url(#also-grad-0)" stroke-width="1" opacity="0.12"><animate attributeName="r" values="60;70;60" dur="4s" repeatCount="indefinite"/></circle>
          <defs><linearGradient id="also-grad-0" x1="0" y1="0" x2="180" y2="180"><stop stop-color="#60a5fa"/><stop offset="1" stop-color="#00d4aa"/></linearGradient></defs>
        </svg>
      `,
    },
    {
      title: '@scaleflex/<span class="demo-gradient-text">asset-picker</span>',
      desc: 'Browse &amp; pick assets from your Scaleflex DAM with folder navigation, search, and drag-select — all out of the box.',
      liveUrl: 'https://scaleflex.github.io/asset-picker/',
      repoUrl: 'https://github.com/scaleflex/asset-picker',
      visual: `
        <svg viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" class="demo-also-icon">
          <rect x="4" y="4" width="172" height="172" rx="12" stroke="url(#also-grad-1)" stroke-width="2" opacity="0.3"/>
          <rect x="20" y="30" width="60" height="55" rx="6" fill="url(#also-grad-1)" opacity="0.12" stroke="url(#also-grad-1)" stroke-width="1.2" stroke-opacity="0.4"/>
          <rect x="100" y="30" width="60" height="55" rx="6" fill="url(#also-grad-1)" opacity="0.08" stroke="url(#also-grad-1)" stroke-width="1.2" stroke-opacity="0.4"/>
          <rect x="20" y="100" width="60" height="55" rx="6" fill="url(#also-grad-1)" opacity="0.08" stroke="url(#also-grad-1)" stroke-width="1.2" stroke-opacity="0.4"/>
          <rect x="100" y="100" width="60" height="55" rx="6" fill="url(#also-grad-1)" opacity="0.18" stroke="url(#also-grad-1)" stroke-width="2" stroke-opacity="0.7"/>
          <circle cx="36" cy="48" r="5" fill="url(#also-grad-1)" opacity="0.7"/>
          <path d="M20 75 L36 60 L55 70 L80 55 L80 85 L20 85 Z" fill="url(#also-grad-1)" opacity="0.25"/>
          <circle cx="116" cy="48" r="5" fill="url(#also-grad-1)" opacity="0.7"/>
          <path d="M100 75 L116 60 L135 70 L160 55 L160 85 L100 85 Z" fill="url(#also-grad-1)" opacity="0.18"/>
          <path d="M122 130 L138 130 L130 142 Z" fill="url(#also-grad-1)" opacity="0.9"/>
          <defs><linearGradient id="also-grad-1" x1="0" y1="0" x2="180" y2="180"><stop stop-color="#60a5fa"/><stop offset="1" stop-color="#00d4aa"/></linearGradient></defs>
        </svg>
      `,
    },
    {
      title: '<span class="demo-gradient-text">filerobot</span>-image-editor',
      desc: 'Full canvas-based editor with filters, adjust, annotations and stickers — when cropping alone isn&rsquo;t enough.',
      liveUrl: 'https://scaleflex.github.io/filerobot-image-editor/',
      repoUrl: 'https://github.com/scaleflex/filerobot-image-editor',
      visual: `
        <svg viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" class="demo-also-icon">
          <rect x="4" y="4" width="172" height="172" rx="12" stroke="url(#also-grad-2)" stroke-width="2" opacity="0.3"/>
          <path d="M90 30 C60 30 36 54 36 84 C36 100 48 112 64 112 C72 112 76 108 76 102 C76 98 74 96 74 92 C74 86 78 82 84 82 L98 82 C118 82 134 66 134 46 C134 36 122 30 90 30 Z" fill="url(#also-grad-2)" opacity="0.18" stroke="url(#also-grad-2)" stroke-width="1.5" stroke-opacity="0.5"/>
          <circle cx="70" cy="56" r="6" fill="url(#also-grad-2)" opacity="0.9"/>
          <circle cx="108" cy="50" r="6" fill="url(#also-grad-2)" opacity="0.7"/>
          <circle cx="122" cy="72" r="6" fill="url(#also-grad-2)" opacity="0.5"/>
          <circle cx="60" cy="82" r="6" fill="url(#also-grad-2)" opacity="0.4"/>
          <path d="M80 118 L114 150 L132 132 L98 100 Z" fill="url(#also-grad-2)" opacity="0.22" stroke="url(#also-grad-2)" stroke-width="1.5" stroke-opacity="0.6"/>
          <path d="M70 108 L82 120" stroke="url(#also-grad-2)" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
          <defs><linearGradient id="also-grad-2" x1="0" y1="0" x2="180" y2="180"><stop stop-color="#60a5fa"/><stop offset="1" stop-color="#00d4aa"/></linearGradient></defs>
        </svg>
      `,
    },
  ];

  const installSnippet = `npm install @scaleflex/crop`;
  const esmSnippet = `<script type="module">
  import '@scaleflex/crop/define';
</script>

<sfx-crop
  src="/photo.jpg"
  crop-shape="free"
  theme="light"
></sfx-crop>`;
  const reactSnippet = `import { SfxCrop } from '@scaleflex/crop/react';

export function Editor() {
  return (
    <SfxCrop
      src="/photo.jpg"
      cropShape="free"
      theme="light"
      onChange={(state) => console.log(state)}
    />
  );
}`;

  return `
    <section class="demo-hero">
      <div class="demo-hero-inner">
        <div class="demo-hero-badge">
          <span class="demo-hero-badge-dot"></span>
          @scaleflex/crop
        </div>
        <h1 class="demo-hero-title"><span class="demo-gradient-text">Crop</span></h1>
        <p class="demo-hero-sub">Framework-agnostic Web Component for interactive image cropping — rotate, flip, zoom, and shape presets in a single <code>&lt;sfx-crop&gt;</code> tag.</p>
        <div class="demo-hero-actions">
          <a class="demo-btn demo-btn--primary" href="#quick-start">Get started ${ICONS.arrow}</a>
          <a class="demo-btn demo-btn--glass" href="https://github.com/scaleflex/js-cloudimage-crop" target="_blank" rel="noopener">${ICONS.github} GitHub</a>
          <a class="demo-btn demo-btn--glass" href="https://www.npmjs.com/package/@scaleflex/crop" target="_blank" rel="noopener">${ICONS.npm} npm</a>
        </div>
        <div class="demo-hero-meta">
          <span>Web Component</span>
          <span>Lit 3</span>
          <span>React wrapper</span>
          <span>TypeScript</span>
          <span>WCAG 2.1 AA</span>
        </div>
      </div>
    </section>

    <section class="demo-live" id="live-demo">
      <div class="demo-section-inner">
        <div class="demo-section-label">Live demo</div>
        <h2>Try it right here</h2>
        <p class="demo-lead">A fully interactive crop editor embedded directly in this page — drag corners, rotate with the slider, switch crop shapes.</p>
        <div class="demo-crop-controls">
          <button type="button" class="demo-variant-toggle" aria-label="Toggle crop variant" aria-pressed="false">Variant: classic</button>
          <button type="button" class="demo-grid-toggle" aria-label="Toggle rule-of-thirds grid" aria-pressed="false">Grid: off</button>
          <button type="button" class="demo-bleed-toggle" aria-label="Toggle print bleed guides" aria-pressed="false">Bleed: off</button>
          <button type="button" class="demo-theme-toggle" aria-label="Toggle crop theme" aria-pressed="false">${ICONS.moon}</button>
        </div>
        <div class="demo-card demo-card--lg demo-crop-wrap">
          <sfx-crop id="home-viewer" style="display:block;max-width:1200px;max-height:640px;margin:0 auto"></sfx-crop>
        </div>
      </div>
    </section>

    <section class="demo-quick-start" id="quick-start">
      <div class="demo-section-inner">
        <div class="demo-section-label">Quick start</div>
        <h2 class="demo-quick-start-title">Up and running in under a minute</h2>
        <p class="demo-quick-start-sub">Install from npm, import the custom element, and drop&nbsp;<code>&lt;sfx-crop&gt;</code><br />into your markup with a few lines of code.</p>

        <div class="demo-quick-start-tabs" role="tablist" aria-label="Integration method">
          <button class="demo-quick-start-tab is-active" data-tab="npm" role="tab" aria-selected="true">npm</button>
          <button class="demo-quick-start-tab" data-tab="cdn" role="tab" aria-selected="false">CDN</button>
        </div>

        <div class="demo-quick-start-steps" data-tab-content="npm">
          <div class="demo-quick-start-step">
            <div class="demo-step-header">
              <span class="demo-step-number">1</span>
              <h3>Install</h3>
            </div>
            <div class="demo-step-code">
              <code>npm install @scaleflex/crop</code>
              <button class="demo-step-copy" data-copy-text="npm install @scaleflex/crop" aria-label="Copy">${ICONS.copy}</button>
            </div>
          </div>
          <div class="demo-quick-start-step">
            <div class="demo-step-header">
              <span class="demo-step-number">2</span>
              <h3>Import</h3>
            </div>
            <div class="demo-step-code">
              <code>import '@scaleflex/crop/define';</code>
              <button class="demo-step-copy" data-copy-text="import '@scaleflex/crop/define';" aria-label="Copy">${ICONS.copy}</button>
            </div>
          </div>
          <div class="demo-quick-start-step">
            <div class="demo-step-header">
              <span class="demo-step-number">3</span>
              <h3>Use</h3>
            </div>
            <p class="demo-step-description">Add <code>&lt;sfx-crop&gt;</code> to your HTML, set <code>src</code>, and listen for <code>.change</code>.</p>
          </div>
        </div>

        <div class="demo-quick-start-steps" data-tab-content="cdn" hidden>
          <div class="demo-quick-start-step">
            <div class="demo-step-header">
              <span class="demo-step-number">1</span>
              <h3>Add script</h3>
            </div>
            <div class="demo-step-code">
              <code>&lt;script type="module" src="https://esm.sh/@scaleflex/crop/define"&gt;&lt;/script&gt;</code>
              <button class="demo-step-copy" data-copy-text='<script type="module" src="https://esm.sh/@scaleflex/crop/define"></script>' aria-label="Copy">${ICONS.copy}</button>
            </div>
          </div>
          <div class="demo-quick-start-step">
            <div class="demo-step-header">
              <span class="demo-step-number">2</span>
              <h3>Use</h3>
            </div>
            <p class="demo-step-description">Drop <code>&lt;sfx-crop src="/photo.jpg"&gt;&lt;/sfx-crop&gt;</code> anywhere in your page.</p>
          </div>
        </div>

        <div class="demo-quick-start-code">
          ${tabbedCode([
            { label: 'HTML', code: esmSnippet, lang: 'markup' },
            { label: 'React', code: reactSnippet, lang: 'tsx' },
          ])}
        </div>
      </div>
    </section>

    <section class="demo-features">
      <div class="demo-section-inner">
        <div class="demo-section-label">Features</div>
        <h2>Everything you need for image crop</h2>
        <div class="demo-feature-grid">
          ${featureCards.map((f) => `
            <div class="demo-feature-card">
              <div class="demo-feature-icon">${f.icon}</div>
              <h3>${f.title}</h3>
              <p>${f.body}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="demo-also demo-siblings" id="also-slider">
      <div class="demo-also-slides">
        ${siblingSlides.map((s, i) => `
          <div class="demo-also-slide${i === 0 ? ' demo-also-slide--active' : ''}" data-slide="${i}">
            <div class="demo-also-inner">
              <div class="demo-also-content">
                <div class="demo-section-label">Also by Scaleflex</div>
                <h3 class="demo-also-title">${s.title}</h3>
                <p class="demo-also-desc">${s.desc}</p>
                <div class="demo-also-actions">
                  <a class="demo-btn demo-btn--primary demo-btn--small" href="${s.liveUrl}" target="_blank" rel="noopener">
                    Live demo ${ICONS.arrow}
                  </a>
                  <a class="demo-btn demo-btn--glass demo-btn--small" href="${s.repoUrl}" target="_blank" rel="noopener">
                    ${ICONS.github} GitHub
                  </a>
                </div>
              </div>
              <div class="demo-also-visual">${s.visual}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="demo-also-dots" id="also-dots"></div>
    </section>
  `;
}

function hydrateHome(root: HTMLElement): void {
  const el = root.querySelector('#home-viewer') as SfxCropElement | null;
  if (el) {
    el.src = DEMO_SRC;
    // Let the library's default cropShape (16:9) stand — previous override
    // to 'free' made the home preview ignore the library default.
    el.showGrid = 'interaction';
    el.showToolbar = true;
    el.showZoomSlider = true;
    el.showRotateSlider = true;
  }
  // Variant toggle — flips between the classic movable frame and the fixed
  // cover-frame ("window") mode. Lives in the controls row above the editor.
  const variantBtn = root.querySelector<HTMLButtonElement>('.demo-variant-toggle');
  if (el && variantBtn) {
    variantBtn.addEventListener('click', () => {
      const next = el.variant === 'fixed' ? 'classic' : 'fixed';
      el.variant = next;
      variantBtn.textContent = `Variant: ${next}`;
      variantBtn.setAttribute('aria-pressed', String(next === 'fixed'));
    });
  }
  // Grid toggle — pins the rule-of-thirds grid always-on (true) vs the default
  // (only while interacting).
  const gridBtn = root.querySelector<HTMLButtonElement>('.demo-grid-toggle');
  if (el && gridBtn) {
    gridBtn.addEventListener('click', () => {
      const on = el.showGrid !== true;
      el.showGrid = on ? true : 'interaction';
      gridBtn.textContent = `Grid: ${on ? 'on' : 'off'}`;
      gridBtn.setAttribute('aria-pressed', String(on));
    });
  }
  // Bleed-guide toggle — flips the print-safe-area guides on #home-viewer.
  const bleedBtn = root.querySelector<HTMLButtonElement>('.demo-bleed-toggle');
  if (el && bleedBtn) {
    bleedBtn.addEventListener('click', () => {
      const next = !el.showBleedMargin;
      el.showBleedMargin = next;
      bleedBtn.textContent = `Bleed: ${next ? 'on' : 'off'}`;
      bleedBtn.setAttribute('aria-pressed', String(next));
    });
  }
  // The built-in toolbar "Done" button fires `sfx-crop-save`. A single global
  // handler (see setupSavePreview) catches it from any <sfx-crop> on the page
  // and shows the result preview — no per-editor wiring needed here.

  // Theme toggle — now in the same external controls row (no longer overlaid
  // on the editor), so it's wired here against #home-viewer directly rather
  // than via the generic per-wrap binding.
  const themeBtn = root.querySelector<HTMLButtonElement>('.demo-theme-toggle');
  if (el && themeBtn) {
    const stored = getStoredTheme();
    el.setAttribute('theme', stored);
    syncToggleButton(themeBtn, stored);
    themeBtn.addEventListener('click', () => {
      const current = el.getAttribute('theme') as DemoTheme | null;
      const next: DemoTheme = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      el.setAttribute('theme', next);
      syncToggleButton(themeBtn, next);
    });
  }
  // npm/CDN tab toggle in Quick Start
  const qsTabs = root.querySelectorAll<HTMLButtonElement>('.demo-quick-start-tab');
  qsTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab ?? 'npm';
      qsTabs.forEach((t) => {
        const active = t.dataset.tab === target;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      root.querySelectorAll<HTMLElement>('.demo-quick-start-steps').forEach((g) => {
        g.hidden = g.dataset.tabContent !== target;
      });
    });
  });

  // Step copy buttons
  root.querySelectorAll<HTMLButtonElement>('.demo-step-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copyText ?? '';
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('is-copied');
        btn.innerHTML = ICONS.check;
        setTimeout(() => { btn.classList.remove('is-copied'); btn.innerHTML = ICONS.copy; }, 1600);
      });
    });
  });

  // "Also by Scaleflex" carousel
  const slides = root.querySelectorAll<HTMLElement>('.demo-also-slide');
  const dotsContainer = root.querySelector<HTMLElement>('#also-dots');
  if (slides.length > 0 && dotsContainer) {
    let current = 0;
    let animating = false;
    let timer: ReturnType<typeof setInterval>;

    const clearAnim = (el: HTMLElement) => {
      el.classList.remove(
        'demo-also-slide--enter-right',
        'demo-also-slide--enter-left',
        'demo-also-slide--leave-left',
        'demo-also-slide--leave-right',
      );
    };

    const goTo = (index: number) => {
      if (index === current || animating) return;
      animating = true;
      const forward = index > current || (current === slides.length - 1 && index === 0);
      const prev = slides[current];
      const next = slides[index];

      clearAnim(prev);
      prev.classList.remove('demo-also-slide--active');
      prev.classList.add(forward ? 'demo-also-slide--leave-left' : 'demo-also-slide--leave-right');

      clearAnim(next);
      next.classList.add(forward ? 'demo-also-slide--enter-right' : 'demo-also-slide--enter-left');

      next.addEventListener('animationend', function handler() {
        next.removeEventListener('animationend', handler);
        clearAnim(prev);
        clearAnim(next);
        next.classList.add('demo-also-slide--active');
        animating = false;
      });

      current = index;
      dotsContainer.querySelectorAll('.demo-also-dot').forEach((d, i) => {
        d.classList.toggle('demo-also-dot--active', i === current);
      });
      resetTimer();
    };

    const resetTimer = () => {
      clearInterval(timer);
      timer = setInterval(() => goTo((current + 1) % slides.length), 6000);
    };

    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement('button');
      dot.className = `demo-also-dot${i === 0 ? ' demo-also-dot--active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }

    resetTimer();
  }
}

// ---------------------------------------------------------------------------
// Pages — docs
// ---------------------------------------------------------------------------

function docPage(title: string, lead: string, body: string): string {
  return `
    <article class="demo-doc">
      <header class="demo-doc-header">
        <h1>${title}</h1>
        <p class="demo-doc-lead">${lead}</p>
      </header>
      ${body}
    </article>
  `;
}

function renderDocGettingStarted(): string {
  return docPage(
    'Getting started',
    'Install, register the custom element, and drop <code>&lt;sfx-crop&gt;</code> into your markup.',
    `
      <h2>Install</h2>
      ${tabbedCode([
        { label: 'npm',  code: 'npm install @scaleflex/crop',  lang: 'bash' },
        { label: 'pnpm', code: 'pnpm add @scaleflex/crop',     lang: 'bash' },
        { label: 'yarn', code: 'yarn add @scaleflex/crop',     lang: 'bash' },
      ])}

      <h2>Register the custom element</h2>
      <p>A single side-effect import registers <code>&lt;sfx-crop&gt;</code> and its sub-elements (<code>sfx-crop-canvas</code>, <code>sfx-crop-toolbar</code>, <code>sfx-crop-zoom</code>, <code>sfx-crop-rotate</code>, <code>sfx-crop-shapes</code>). The import is idempotent — safe under React StrictMode and repeated module evaluations.</p>
      ${codeBlock(`import '@scaleflex/crop/define';`, 'typescript')}

      <h2>Use it</h2>
      ${tabbedCode([
        { label: 'HTML', code: `<sfx-crop
  src="/photo.jpg"
  crop-shape="16:9"
  theme="light"
></sfx-crop>`, lang: 'markup' },
        { label: 'React', code: `import { SfxCrop, type SfxCropElement } from '@scaleflex/crop/react';
import { useRef } from 'react';

export function Editor() {
  const ref = useRef<SfxCropElement>(null);

  return (
    <SfxCrop
      ref={ref}
      src="/photo.jpg"
      cropShape="16:9"
      onChange={(state) => console.log(state)}
      onSave={({ blob }) => upload(blob)}
    />
  );
}`, lang: 'tsx' },
        { label: 'CDN', code: `<script type="module" src="https://esm.sh/@scaleflex/crop/define"></script>

<sfx-crop src="/photo.jpg" crop-shape="16:9"></sfx-crop>`, lang: 'markup' },
      ])}

      <h2>Browser support</h2>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Browser</th><th>Minimum version</th></tr></thead>
          <tbody>
            <tr><td>Chrome / Edge</td><td>90+</td></tr>
            <tr><td>Firefox</td><td>100+</td></tr>
            <tr><td>Safari</td><td>15.4+</td></tr>
          </tbody>
        </table>
      </div>
      <p>Requires <code>customElements</code>, Shadow DOM, and modern CSS (<code>backdrop-filter</code>, <code>oklch()</code>).</p>
    `,
  );
}

function renderDocConfiguration(): string {
  // Grouped in rendering order: source / shape / initial state / zoom /
  // toolbar layout / styling / export / input. Each row is a public
  // HTML attribute with its camelCase DOM-property counterpart.
  const groups: { heading: string; rows: [string, string, string, string][] }[] = [
    {
      heading: 'Source &amp; shape',
      rows: [
        ['src',              'URL',                                              '""',      'Image source URL. Setting it at runtime triggers an async reload.'],
        ['variant',          'classic | fixed',                                  'classic', 'Display mode. <code>classic</code>: movable/resizable frame over the photo. <code>fixed</code>: the editor box is the crop frame, photo cover-fit + panned underneath (avatar/phone style). Switchable at runtime.'],
        ['crop-shape',       'free | square | circle | rounded-rect | 16:9 | 4:3 | 3:2 | 5:4 | 2:1 | 9:16 | 3:4 | 2:3 | 4:5 | 1:2 | "W:H"', '16:9', 'Active crop preset or ad-hoc ratio string.'],
        ['available-shapes', 'JSON array | CSV',                                 'full preset list', 'Shapes exposed in the selector dropdown.'],
        ['min-crop-size',    'px',                                               '20',      'Minimum crop rect side in image-pixel space.'],
      ],
    },
    {
      heading: 'Initial state',
      rows: [
        ['initial-crop',     'JSON <code>CropRect</code> (normalized)',          'null',    'Seed the crop rectangle on load (property form accepts an object).'],
        ['initial-rotation', 'number (−45 … +45)',                               '0',       'Seed the fine-rotation value.'],
        ['initial-scale',    'number',                                           '1',       'Seed the zoom level.'],
      ],
    },
    {
      heading: 'Zoom',
      rows: [
        ['min-scale',        'number',                                           '0.5',     'Lowest zoom level.'],
        ['max-scale',        'number',                                           '5',       'Highest zoom level.'],
      ],
    },
    {
      heading: 'Toolbar &amp; layout',
      rows: [
        ['theme',                'light | dark',                                 'light',   'Color variant — swaps the token bundle.'],
        ['toolbar-position',     'top | bottom',                                 'top',     'Anchor for the floating toolbar pill.'],
        ['show-toolbar',         'boolean',                                      'true',    'Toggle the entire toolbar row. The toolbar includes a primary <strong>Done</strong> button (right edge) that calls <code>save()</code> → dispatches <code>sfx-crop-save</code>. Hide the toolbar to drive everything imperatively.'],
        ['show-rotate-button',   'boolean',                                      'true',    'Show the 90° rotate-left button.'],
        ['show-flip-button',     'boolean',                                      'true',    'Show the flip-horizontal button.'],
        ['show-rotate-slider',   'boolean',                                      'true',    'Show the fine-rotation (±45°) trigger.'],
        ['show-zoom-slider',     'boolean',                                      'true',    'Show the zoom trigger.'],
        ['show-shape-selector',  'boolean',                                      'true',    'Show the shape-selector dropdown.'],
        ['show-grid',            'true | false | interaction',                   'interaction', 'Rule-of-thirds grid: always on, always off, or only while dragging.'],
      ],
    },
    {
      heading: 'Appearance',
      rows: [
        ['handle-size',          'px',                                           '12',      'Corner-handle diameter.'],
        ['handle-color',         'CSS color',                                    '#ffffff', 'Corner-handle fill.'],
        ['border-radius',        'px',                                           '20',      'Corner radius for the <code>rounded-rect</code> shape.'],
        ['overlay-color',        'CSS color',                                    'rgba(0,0,0,.55)', 'Dim mask color over the out-of-crop area.'],
        ['show-bleed-margin',    'boolean',                                      'false',   'Show print-bleed guides inside the crop.'],
        ['bleed-margin-size',    'px',                                           '10',      'Distance from the crop edge to the bleed line.'],
        ['bleed-margin-color',   'CSS color',                                    'rgba(255,0,0,.5)', 'Bleed-line color.'],
        ['enable-animations',    'boolean',                                      'true',    'Spring + lerp animations for rotation / zoom / shape changes.'],
        ['animation-speed',      'number',                                       '1.0',     'Animation speed multiplier (<code>&lt; 1</code> slower, <code>&gt; 1</code> faster).'],
      ],
    },
    {
      heading: 'Export',
      rows: [
        ['output-type',       'MIME',                                            'image/png',   'Default format for <code>toBlob()</code> / <code>toDataURL()</code> / <code>save()</code>.'],
        ['output-quality',    'number (0 – 1)',                                  '0.92',        'Quality for lossy formats (ignored for PNG).'],
        ['max-output-width',  'px',                                              '0',           'Clamp the exported width (<code>0</code> = original).'],
        ['max-output-height', 'px',                                              '0',           'Clamp the exported height (<code>0</code> = original).'],
      ],
    },
    {
      heading: 'Input',
      rows: [
        ['keyboard',             'boolean',                                      'true',    'Enable keyboard shortcuts (R / F / + / − / 0 / arrows).'],
        ['wheel-zoom',           'boolean',                                      'true',    'Enable mouse-wheel zoom over the canvas.'],
        ['pinch-zoom',           'boolean',                                      'true',    'Enable pinch-to-zoom on touch devices.'],
      ],
    },
  ];

  const renderTable = (rows: [string, string, string, string][]): string => `
    <div class="demo-table-wrap">
      <table class="demo-table">
        <thead><tr><th>Attribute</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          ${rows.map(([n, t, d, desc]) => `<tr><td><code>${n}</code></td><td>${t}</td><td><code>${d}</code></td><td>${desc}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  return docPage(
    'Configuration',
    'Every config field has a kebab-case HTML attribute and a matching camelCase DOM property.',
    `
      <h2>Declarative (HTML attributes)</h2>
      ${codeBlock(`<sfx-crop
  src="/photo.jpg"
  crop-shape="16:9"
  theme="light"
  min-scale="0.5"
  max-scale="8"
  show-grid="interaction"
  available-shapes='["free","circle","16:9"]'
></sfx-crop>`, 'markup')}

      <h2>Imperative (DOM properties)</h2>
      ${codeBlock(`const el = document.querySelector('sfx-crop');
el.cropShape = '16:9';
el.minScale = 0.5;
el.availableShapes = ['free', 'circle', '16:9'];
el.initialCrop = { x: 0.1, y: 0.1, width: 0.8, height: 0.6 };`, 'typescript')}

      <h2>Booleans</h2>
      <p>Boolean attributes accept the presence shorthand, <code>"true"</code>, or <code>"false"</code>:</p>
      ${codeBlock(`<sfx-crop show-toolbar></sfx-crop>
<sfx-crop show-toolbar="false"></sfx-crop>`, 'markup')}

      ${groups.map((g) => `
        <h2>${g.heading}</h2>
        ${renderTable(g.rows)}
      `).join('')}

      <h2>Property-only APIs</h2>
      <p>These are set via DOM property (no HTML attribute equivalent) because they hold objects:</p>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>icons</code></td><td><code>CropIconOverrides</code></td><td>Per-slot SVG strings — swap any built-in icon (<code>rotateLeft</code>, <code>flipHorizontal</code>, <code>tilt</code>, <code>loupe</code>, <code>zoomIn</code>, <code>zoomOut</code>, <code>cropAspect</code>, <code>cropCustom</code>, <code>cropCircle</code>, <code>cropRoundedRect</code>, <code>orientLandscape</code>, <code>orientPortrait</code>, <code>chevronDown</code>, <code>reset</code>).</td></tr>
            <tr><td><code>customAspectRatios</code></td><td><code>{ name: string; ratio: number }[]</code></td><td>Consumer-defined ratios surfaced in the shape selector.</td></tr>
          </tbody>
        </table>
      </div>
      ${codeBlock(`const el = document.querySelector('sfx-crop');
el.icons = { rotateLeft: '<svg viewBox="0 0 24 24">…</svg>' };
el.customAspectRatios = [{ name: 'Cinema', ratio: 2.35 }];`, 'typescript')}
    `,
  );
}

function renderDocApi(): string {
  const methods: [string, string, string][] = [
    ['loadImage',        '(src: string): Promise&lt;void&gt;',             'Load a new image. Cancels any in-flight decode from a previous call.'],
    ['rotateLeft',       '(): void',                                       '90° counter-clockwise turn.'],
    ['flipHorizontal',   '(): void',                                       'Mirror across the vertical axis.'],
    ['setRotation',      '(deg: number): void',                            'Fine rotation in degrees, clamped to −45 … +45.'],
    ['setScale',         '(scale: number): void',                          'Zoom level, clamped to <code>minScale</code> … <code>maxScale</code>.'],
    ['setCropShape',     '(shape: CropShapeName): void',                   'Switch preset. Re-fits the crop rect to the new aspect.'],
    ['setCropRect',      '(rect: CropRect): void',                         'Place the crop rectangle in image-pixel space.'],
    ['getCropRect',      '(): CropRect',                                   'Current crop rectangle in image-pixel coordinates.'],
    ['getTransformState','(): TransformState',                             'Full snapshot (rotation, flips, scale, pan, crop rect normalized).'],
    ['toCanvas',         '(): HTMLCanvasElement',                          'Render the current crop to a fresh off-screen canvas.'],
    ['toBlob',           '(type?: string, quality?: number): Promise&lt;Blob&gt;', 'Export the crop as a <code>Blob</code>. Defaults come from the <code>output-*</code> attributes.'],
    ['toDataURL',        '(type?: string, quality?: number): string',      'Export as a data URL (base64).'],
    ['toTransformParams','(): TransformParams',                            'Summary suitable for server-side rendering (image CDNs).'],
    ['reset',            '(): void',                                       'Restore rotation, scale, pan, and crop rect to initial values.'],
    ['save',             '(type?: string, quality?: number): Promise&lt;void&gt;', 'Export and dispatch <code>sfx-crop-save</code> with the result.'],
    ['cancel',           '(): void',                                       'Dispatch <code>sfx-crop-cancel</code> — the consumer decides what that means.'],
  ];

  const events: [string, string, string][] = [
    ['sfx-crop-ready',        '{ element: SfxCropElement }',                                          'Element upgraded and controller wired. Safe to call imperative API.'],
    ['sfx-crop-image-load',   '{ image: HTMLImageElement }',                                          'Image decoded and initial fit applied.'],
    ['sfx-crop-change',       'TransformState',                                                       'Any state change — rotation, flip, scale, pan, crop.'],
    ['sfx-crop-crop-change',  'CropRect (image-pixel coords)',                                        'Crop rect moved or resized (subset of <code>-change</code>).'],
    ['sfx-crop-save',         '{ blob: Blob, dataURL: string, params: TransformParams }',             'Emitted from <code>save()</code>.'],
    ['sfx-crop-cancel',       'void',                                                                 'Emitted from <code>cancel()</code>.'],
    ['sfx-crop-error',        '{ error: Error }',                                                     'Image load failed or invalid configuration.'],
  ];

  return docPage(
    'API reference',
    'Imperative methods on the <code>&lt;sfx-crop&gt;</code> element and the seven custom events it emits.',
    `
      <h2>Methods</h2>
      <p>Hold a DOM ref (or the React <code>ref.current</code>) and call:</p>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Method</th><th>Signature</th><th>Description</th></tr></thead>
          <tbody>
            ${methods.map(([n, sig, desc]) => `<tr><td><code>${n}</code></td><td><code>${sig}</code></td><td>${desc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <h2>Events</h2>
      <p>All events <code>bubble</code> and cross shadow boundaries (<code>composed: true</code>), so you can listen from <code>document</code>.</p>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Event</th><th><code>detail</code></th><th>Fired when</th></tr></thead>
          <tbody>
            ${events.map(([n, d, desc]) => `<tr><td><code>${n}</code></td><td><code>${escapeHtml(d)}</code></td><td>${desc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <h2>Vanilla JS example</h2>
      ${codeBlock(`const crop = document.querySelector('sfx-crop');

crop.addEventListener('sfx-crop-change', (e) => {
  console.log('state:', e.detail);
});

crop.addEventListener('sfx-crop-save', (e) => {
  const { blob, dataURL, params } = e.detail;
  uploadToServer(blob);
});

document.getElementById('save').onclick = () => crop.save();`, 'typescript')}

      <h2>React</h2>
      <p>The <code>&lt;SfxCrop&gt;</code> component wraps the same custom element and forwards every prop + event. It also forwards a ref to the underlying <code>SfxCropElement</code>, so imperative methods work the same way.</p>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Prop</th><th>Type</th><th>Maps to</th></tr></thead>
          <tbody>
            <tr><td><code>src</code>, <code>cropShape</code>, <code>theme</code>, <code>minScale</code>, <code>maxScale</code>, <code>availableShapes</code>, <code>showToolbar</code>, …</td><td>same as HTML attrs</td><td>Every configuration field listed on the Configuration page.</td></tr>
            <tr><td><code>icons</code></td><td><code>CropIconOverrides</code></td><td>Per-slot SVG overrides.</td></tr>
            <tr><td><code>onChange</code></td><td><code>(state: TransformState) =&gt; void</code></td><td><code>sfx-crop-change</code></td></tr>
            <tr><td><code>onCropChange</code></td><td><code>(rect: CropRect) =&gt; void</code></td><td><code>sfx-crop-crop-change</code></td></tr>
            <tr><td><code>onReady</code></td><td><code>(el: SfxCropElement) =&gt; void</code></td><td><code>sfx-crop-ready</code></td></tr>
            <tr><td><code>onImageLoad</code></td><td><code>(image: HTMLImageElement) =&gt; void</code></td><td><code>sfx-crop-image-load</code></td></tr>
            <tr><td><code>onSave</code></td><td><code>(detail: SfxCropSaveDetail) =&gt; void</code></td><td><code>sfx-crop-save</code></td></tr>
            <tr><td><code>onCancel</code></td><td><code>() =&gt; void</code></td><td><code>sfx-crop-cancel</code></td></tr>
            <tr><td><code>onError</code></td><td><code>(error: Error) =&gt; void</code></td><td><code>sfx-crop-error</code></td></tr>
          </tbody>
        </table>
      </div>

      <h3>Ref-based imperative usage</h3>
      ${codeBlock(`import { SfxCrop, type SfxCropElement } from '@scaleflex/crop/react';
import { useRef } from 'react';

export function Editor() {
  const ref = useRef<SfxCropElement>(null);

  return (
    <>
      <SfxCrop ref={ref} src="/photo.jpg" cropShape="16:9" />
      <button onClick={() => ref.current?.save()}>Save</button>
      <button onClick={() => ref.current?.reset()}>Reset</button>
    </>
  );
}`, 'tsx')}

      <h3>Hook alternative — <code>useSfxCrop</code></h3>
      <p>For consumers that render <code>&lt;sfx-crop&gt;</code> manually (outside React's declarative tree) and just want a typed handle:</p>
      ${codeBlock(`import { useSfxCrop } from '@scaleflex/crop/react';

const { ref, save, reset, rotateLeft } = useSfxCrop();

return <sfx-crop ref={ref} src="/photo.jpg" />;`, 'tsx')}

      <h3>Headless — <code>useSfxCropController</code></h3>
      <p>Full headless control: the hook owns the controller and returns <code>canvasRef</code> / <code>containerRef</code> / <code>state</code> / <code>actions</code> / <code>api</code> so you can render your own canvas, toolbar, and markup while re-using the engine.</p>
      ${codeBlock(`import { useSfxCropController } from '@scaleflex/crop/react';

const { canvasRef, containerRef, state, actions } = useSfxCropController({
  src: '/photo.jpg',
  cropShape: '16:9',
});

return (
  <div ref={containerRef}>
    <canvas ref={canvasRef} />
    <button onClick={actions.rotateLeft}>⟲</button>
    <button onClick={() => actions.setScale(state.scale + 0.1)}>+</button>
  </div>
);`, 'tsx')}
    `,
  );
}

function renderDocTheming(): string {
  const tokenGroups: { heading: string; rows: [string, string][] }[] = [
    {
      heading: 'Brand &amp; accent',
      rows: [
        ['--sfx-cr-primary',        'Brand accent — frame, slider thumbs, active option, focus ring.'],
        ['--sfx-cr-primary-hover',  'Hover state for primary.'],
        ['--sfx-cr-primary-mid',    'Lighter tint of primary — used for gradients / transitions.'],
        ['--sfx-cr-primary-bg',     'Soft tint for hover / active button backgrounds.'],
        ['--sfx-cr-primary-glow',   'Focus / handle-hover halo (translucent).'],
        ['--sfx-cr-success',        'Confirmation color (e.g. post-save feedback).'],
        ['--sfx-cr-error',          'Error message color.'],
      ],
    },
    {
      heading: 'Text',
      rows: [
        ['--sfx-cr-text',           'Primary text (values, labels).'],
        ['--sfx-cr-text-secondary', 'Secondary labels, inactive button glyphs.'],
        ['--sfx-cr-text-muted',     'Placeholders, range ends.'],
      ],
    },
    {
      heading: 'Surfaces &amp; borders',
      rows: [
        ['--sfx-cr-bg',             'Outer card background.'],
        ['--sfx-cr-surface',        'Secondary surface (inner panels).'],
        ['--sfx-cr-canvas-bg',      'Backdrop behind the image when it doesn\'t cover the full area.'],
        ['--sfx-cr-border',         'Hairline borders.'],
        ['--sfx-cr-border-light',   'Subtler variant used for separators inside the toolbar.'],
        ['--sfx-cr-radius',         'Outer card corner radius.'],
        ['--sfx-cr-card-shadow',    'Outer card drop shadow.'],
        ['--sfx-cr-shadow',         'Generic component shadow token.'],
      ],
    },
    {
      heading: 'Frame &amp; handles',
      rows: [
        ['--sfx-cr-overlay-color',  'Dim mask color over the out-of-crop area.'],
        ['--sfx-cr-frame-color',    'Crop-frame outline color.'],
        ['--sfx-cr-frame-shadow',   'Subtle shadow behind the frame outline.'],
        ['--sfx-cr-handle-fill',    'Corner-handle fill.'],
        ['--sfx-cr-handle-stroke',  'Corner-handle outline.'],
        ['--sfx-cr-ruler-ink',      'Fine-tilt ruler ink (ticks, indicator, degree label). Deepened in light theme for legibility over bright photos.'],
      ],
    },
    {
      heading: 'Toolbar &amp; controls',
      rows: [
        ['--sfx-cr-toolbar-bg',       'Toolbar pill background (translucent).'],
        ['--sfx-cr-toolbar-color',    'Default toolbar text color.'],
        ['--sfx-cr-toolbar-border',   'Toolbar pill border.'],
        ['--sfx-cr-toolbar-shadow',   'Toolbar drop shadow.'],
        ['--sfx-cr-btn-size',         'Square button size.'],
        ['--sfx-cr-btn-radius',       'Toolbar button corner radius.'],
        ['--sfx-cr-btn-hover-bg',     'Button hover background.'],
        ['--sfx-cr-btn-active-bg',    'Button pressed background.'],
        ['--sfx-cr-separator-color',  'Divider color between toolbar groups.'],
        ['--sfx-cr-slider-track',     'Range-input track.'],
        ['--sfx-cr-slider-fill',      'Range-input filled portion.'],
        ['--sfx-cr-slider-thumb',     'Range-input thumb.'],
      ],
    },
    {
      heading: 'Popovers &amp; dropdowns',
      rows: [
        ['--sfx-cr-dropdown-bg',      'Dropdown panel background.'],
        ['--sfx-cr-dropdown-hover',   'Option hover background.'],
        ['--sfx-cr-dropdown-shadow',  'Dropdown drop shadow.'],
        ['--sfx-cr-zoom-bar-bg',      'Zoom ruler popover background.'],
      ],
    },
    {
      heading: 'Typography &amp; motion',
      rows: [
        ['--sfx-cr-font',       'Font family stack.'],
        ['--sfx-cr-ring',       'Focus outline color.'],
        ['--sfx-cr-transition', 'Default transition timing for interactive states.'],
      ],
    },
  ];

  const renderTokenTable = (rows: [string, string][]): string => `
    <div class="demo-table-wrap">
      <table class="demo-table">
        <thead><tr><th>Token</th><th>Role</th></tr></thead>
        <tbody>
          ${rows.map(([t, d]) => `<tr><td><code>${t}</code></td><td>${d}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  return docPage(
    'Theming',
    'Scaleflex design tokens with the <code>--sfx-cr-*</code> prefix — override any from light DOM. No shadow-DOM piercing required.',
    `
      <h2>Theme attribute</h2>
      <p>Swap the built-in light / dark token bundle in one line:</p>
      ${codeBlock(`<sfx-crop theme="light"></sfx-crop>
<sfx-crop theme="dark"></sfx-crop>`, 'markup')}
      <p>Dark re-maps surfaces, text, overlay, and frame colors — palette tokens (primary) stay the same, so brand customisation survives theme flips.</p>

      <h2>Overriding tokens</h2>
      <p>Set custom properties on the host element (or any ancestor). They cascade through the shadow boundary via CSS inheritance:</p>
      ${codeBlock(`sfx-crop {
  --sfx-cr-primary: #ff3366;
  --sfx-cr-primary-hover: #e62958;
  --sfx-cr-primary-bg: #ffe3ec;
  --sfx-cr-primary-glow: rgba(255, 51, 102, 0.22);
  --sfx-cr-radius: 20px;
  --sfx-cr-font: 'SF Pro Display', system-ui, sans-serif;
}`, 'css')}

      ${tokenGroups.map((g) => `
        <h2>${g.heading}</h2>
        ${renderTokenTable(g.rows)}
      `).join('')}

      <h2>Shadow parts</h2>
      <p>For the rare cases where a token isn't enough, style the internal parts via <code>::part()</code>:</p>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Part</th><th>Maps to</th></tr></thead>
          <tbody>
            <tr><td><code>container</code></td><td>Outer editor card.</td></tr>
            <tr><td><code>canvas-host</code></td><td><code>&lt;sfx-crop-canvas&gt;</code> host wrapping the <code>&lt;canvas&gt;</code>.</td></tr>
            <tr><td><code>toolbar</code></td><td>Floating pill toolbar.</td></tr>
            <tr><td><code>loading</code></td><td>Loading overlay.</td></tr>
            <tr><td><code>error</code></td><td>Error overlay.</td></tr>
          </tbody>
        </table>
      </div>
      ${codeBlock(`sfx-crop::part(container)   { border: 1px solid #e8edf5; }
sfx-crop::part(canvas-host) { background: #0f172a; }
sfx-crop::part(toolbar)     { box-shadow: 0 8px 24px rgba(0,0,0,.2); }`, 'css')}
    `,
  );
}

function renderDocTypes(): string {
  return docPage(
    'TypeScript types',
    'Public types re-exported from <code>@scaleflex/crop</code> and <code>@scaleflex/crop/react</code>.',
    `
      <h2>Imports</h2>
      ${codeBlock(`import type {
  SfxCropElement,
  SfxCropConfig,
  CropShapeName,
  CropShape,             // deprecated alias for CropShapeName
  CropRect,
  NormalizedRect,
  HandlePosition,
  TransformState,
  TransformParams,
  CropIconOverrides,
  Point,
  Size,
} from '@scaleflex/crop';

import type {
  SfxCropProps,
  SfxCropSaveDetail,
  UseSfxCropReturn,
  UseSfxCropControllerOptions,
  UseSfxCropControllerReturn,
} from '@scaleflex/crop/react';`, 'typescript')}

      <h2>CropShapeName</h2>
      <p>Union of built-in presets plus any consumer-supplied <code>"W:H"</code> string — autocomplete stays on the built-ins while ad-hoc ratios like <code>"2.35:1"</code> pass through.</p>
      ${codeBlock(`type CropShapeName =
  | 'free' | 'square' | 'circle' | 'rounded-rect'
  | '16:9' | '4:3' | '3:2' | '5:4' | '2:1'
  | '9:16' | '3:4' | '2:3' | '4:5' | '1:2'
  | (string & {});        // ad-hoc "W:H"`, 'typescript')}

      <h2>CropRect</h2>
      <p>Pixel-space rectangle — what <code>getCropRect()</code> returns and what <code>sfx-crop-crop-change</code> carries.</p>
      ${codeBlock(`interface CropRect {
  x: number;       // image-pixel x (left edge, integer)
  y: number;       // image-pixel y (top edge, integer)
  width: number;   // image-pixel width
  height: number;  // image-pixel height
}`, 'typescript')}

      <h2>NormalizedRect</h2>
      <p>Same shape as <code>CropRect</code> but <code>[0, 1]</code> normalized — how the crop is stored internally on <code>TransformState.cropRect</code>.</p>
      ${codeBlock(`interface NormalizedRect {
  x: number;      // 0-1 (fraction of image width)
  y: number;      // 0-1 (fraction of image height)
  width: number;  // 0-1
  height: number; // 0-1
}`, 'typescript')}

      <h2>HandlePosition</h2>
      ${codeBlock(`type HandlePosition =
  | 'nw' | 'ne' | 'sw' | 'se'     // corners
  | 'n'  | 's'  | 'e'  | 'w';     // edge midpoints`, 'typescript')}

      <h2>TransformState</h2>
      <p>Complete editor state — payload of <code>sfx-crop-change</code>.</p>
      ${codeBlock(`interface TransformState {
  quarterTurns: number;            // 0, 90, 180, 270 (CCW)
  rotation: number;                // -45 … +45 fine tilt
  flipH: boolean;
  flipV: boolean;
  scale: number;                   // 1 = fit
  panX: number;                    // canvas-pixel offset from center
  panY: number;
  cropRect: NormalizedRect;        // [0,1] in image space
  rotationPivot?: { x: number; y: number };  // normalized image-space pivot for fine tilt
}`, 'typescript')}

      <h2>TransformParams</h2>
      <p>Server-side-renderable summary — useful for passing to an image CDN (Cloudimage, Filerobot).</p>
      ${codeBlock(`interface TransformParams {
  rotation: number;                // total degrees (quarterTurns + fine)
  flipH: boolean;
  flipV: boolean;
  scale: number;
  crop: { x: number; y: number; width: number; height: number };  // image pixels
  outputWidth: number;
  outputHeight: number;
}`, 'typescript')}

      <h2>CropIconOverrides</h2>
      <p>Per-slot SVG strings. Values are inserted via <code>unsafeHTML</code>, so treat them as static author-trusted content — never concatenate user input.</p>
      ${codeBlock(`interface CropIconOverrides {
  rotateLeft?:      string;   // 90° CCW rotate button
  flipHorizontal?:  string;   // mirror button
  tilt?:            string;   // fine-rotation (±45°) trigger
  loupe?:           string;   // collapsed zoom trigger
  zoomIn?:          string;   // "+" inside the zoom popover
  zoomOut?:         string;   // "−" inside the zoom popover
  cropAspect?:      string;   // shape-selector trigger
  cropCustom?:      string;   // "Custom" option in the shape dropdown
  cropCircle?:      string;   // circle option
  cropRoundedRect?: string;   // rounded-rect option
  orientLandscape?: string;   // landscape orientation tab
  orientPortrait?:  string;   // portrait tab
  chevronDown?:     string;   // dropdown chevron
  reset?:           string;   // reset button glyph
}`, 'typescript')}

      <h2>SfxCropSaveDetail</h2>
      <p>Payload of the <code>onSave</code> / <code>sfx-crop-save</code> callback.</p>
      ${codeBlock(`interface SfxCropSaveDetail {
  blob: Blob;
  dataURL: string;
  params: TransformParams;
}`, 'typescript')}
    `,
  );
}

// ---------------------------------------------------------------------------
// Pages — examples
// ---------------------------------------------------------------------------

function examplePage(title: string, description: string, body: string): string {
  return `
    <article class="demo-example">
      <header class="demo-example-header">
        <h1>${title}</h1>
        <p class="demo-doc-lead">${description}</p>
      </header>
      ${body}
    </article>
  `;
}

function renderExampleBasic(): string {
  return examplePage(
    'Basic usage',
    'The minimal embed — one tag plus the side-effect import.',
    `
      <div class="demo-example-live">
        <sfx-crop id="ex-basic" style="width:100%;height:520px;display:block"></sfx-crop>
      </div>

      ${tabbedCode([
        { label: 'HTML', code: `<script type="module">
  import '@scaleflex/crop/define';
</script>

<sfx-crop
  src="/photo.jpg"
  crop-shape="free"
  theme="light"
></sfx-crop>`, lang: 'markup' },
        { label: 'React', code: `import { SfxCrop } from '@scaleflex/crop/react';

export function Editor() {
  return <SfxCrop src="/photo.jpg" cropShape="free" theme="light" />;
}`, lang: 'tsx' },
      ])}
    `,
  );
}

function renderExampleShapes(): string {
  return examplePage(
    'Shape presets',
    'Free form, fixed ratios (16:9, 4:3, 3:2), portrait variants, circle, and rounded-rect.',
    `
      <div class="demo-example-grid">
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Free</div>
          <sfx-crop class="ex-shape" data-shape="free" style="height:320px;display:block"></sfx-crop>
        </div>
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Circle</div>
          <sfx-crop class="ex-shape" data-shape="circle" style="height:320px;display:block"></sfx-crop>
        </div>
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Rounded 16:9</div>
          <sfx-crop class="ex-shape" data-shape="rounded-rect" style="height:320px;display:block"></sfx-crop>
        </div>
      </div>

      ${tabbedCode([
        { label: 'HTML', code: `<sfx-crop src="/photo.jpg" crop-shape="circle"></sfx-crop>
<sfx-crop src="/photo.jpg" crop-shape="16:9"></sfx-crop>
<sfx-crop
  src="/photo.jpg"
  crop-shape="rounded-rect"
  border-radius="28"
></sfx-crop>`, lang: 'markup' },
        { label: 'Imperative', code: `const el = document.querySelector('sfx-crop');
el.setCropShape('rounded-rect');
el.borderRadius = 28;`, lang: 'typescript' },
      ])}

      <h2>Custom ratios</h2>
      <p>Pass any <code>"W:H"</code> string — built-in or ad-hoc — to <code>crop-shape</code> and to <code>availableShapes</code>. The component parses the ratio on the fly.</p>
      ${tabbedCode([
        { label: 'HTML', code: `<sfx-crop
  src="/photo.jpg"
  crop-shape="2.35:1"
  available-shapes='["free","square","16:9","2.35:1","9:16"]'
></sfx-crop>`, lang: 'markup' },
        { label: 'React', code: `<SfxCrop
  src="/photo.jpg"
  cropShape="2.35:1"
  availableShapes={['free', 'square', '16:9', '2.35:1', '9:16']}
/>`, lang: 'tsx' },
      ])}
    `,
  );
}

function renderExampleInitialState(): string {
  return examplePage(
    'Initial state',
    'Open the editor with a pre-filled crop, rotation, and zoom — the typical re-edit flow when a user returns to previously saved values.',
    `
      <div class="demo-example-live">
        <sfx-crop id="ex-initial" style="width:100%;height:520px;display:block"></sfx-crop>
      </div>

      ${tabbedCode([
        { label: 'HTML', code: `<sfx-crop
  src="/photo.jpg"
  initial-crop='{"x":0.1,"y":0.12,"width":0.6,"height":0.6}'
  initial-rotation="-8"
  initial-scale="1.2"
  crop-shape="free"
></sfx-crop>`, lang: 'markup' },
        { label: 'Imperative', code: `const el = document.querySelector('sfx-crop');

// Seed BEFORE setting src so the first render already reflects them.
el.initialCrop     = { x: 0.1, y: 0.12, width: 0.6, height: 0.6 };
el.initialRotation = -8;
el.initialScale    = 1.2;
el.src             = '/photo.jpg';`, lang: 'typescript' },
        { label: 'React', code: `<SfxCrop
  src="/photo.jpg"
  initialCrop={{ x: 0.1, y: 0.12, width: 0.6, height: 0.6 }}
  initialRotation={-8}
  initialScale={1.2}
/>`, lang: 'tsx' },
      ])}

      <h2>Notes</h2>
      <ul>
        <li><code>initialCrop</code> is normalized — coordinates are <code>[0, 1]</code> fractions of the image, not pixels. Persist it from <code>TransformState.cropRect</code> (also normalized).</li>
        <li>Initial values apply on image load; later changes to these props are ignored. Use <code>setCropRect()</code> / <code>setRotation()</code> / <code>setScale()</code> for runtime updates, or <code>reset()</code> to return to the initial values.</li>
        <li>Omit any of the three — defaults (<code>null</code> / <code>0</code> / <code>1</code>) apply to unseeded fields.</li>
      </ul>
    `,
  );
}

function renderExampleTransforms(): string {
  return examplePage(
    'Transforms & guides',
    'Drive rotation, flip, and scale from external controls or keyboard shortcuts. Toggle print bleed guides for print-ready crops.',
    `
      <div class="demo-example-live">
        <sfx-crop id="ex-tx" style="width:100%;height:520px;display:block"></sfx-crop>
      </div>
      <div class="demo-example-controls">
        <button class="demo-btn demo-btn--ghost" id="ex-rl">Rotate left</button>
        <button class="demo-btn demo-btn--ghost" id="ex-fh">Flip H</button>
        <button class="demo-btn demo-btn--ghost" id="ex-reset">Reset</button>
      </div>

      ${codeBlock(`const crop = document.querySelector('sfx-crop');

document.getElementById('rl').onclick    = () => crop.rotateLeft();
document.getElementById('fh').onclick    = () => crop.flipHorizontal();
document.getElementById('reset').onclick = () => crop.reset();`, 'typescript')}

      <h2>Keyboard shortcuts</h2>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Key</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><kbd>R</kbd></td><td>Rotate 90° counter-clockwise</td></tr>
            <tr><td><kbd>F</kbd></td><td>Flip horizontally</td></tr>
            <tr><td><kbd>+</kbd> / <kbd>−</kbd></td><td>Zoom in / out by 0.1</td></tr>
            <tr><td><kbd>0</kbd></td><td>Reset zoom to 100%</td></tr>
            <tr><td><kbd>[</kbd> / <kbd>]</kbd></td><td>Fine rotation ±1°</td></tr>
            <tr><td><kbd>←↑↓→</kbd></td><td>Nudge crop position</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Print bleed guides</h2>
      <p>Safe-area guides drawn inside the crop rectangle — switch them on for print-ready crops where bleed must stay clear of trim. They're a visual aid only: the dashed line isn't baked into <code>toBlob()</code> / <code>toDataURL()</code> output.</p>
      <div class="demo-crop-controls">
        <button type="button" class="demo-bleed-toggle" id="ex-bleed-toggle" aria-label="Toggle print bleed guides" aria-pressed="true">Bleed: on</button>
      </div>
      <div class="demo-example-live">
        <sfx-crop
          id="ex-bleed"
          show-bleed-margin
          bleed-margin-size="16"
          bleed-margin-color="rgba(37, 99, 235, 0.65)"
          style="width:100%;height:420px;display:block"
        ></sfx-crop>
      </div>
      ${codeBlock(`<sfx-crop
  src="/photo.jpg"
  show-bleed-margin
  bleed-margin-size="16"
  bleed-margin-color="rgba(37, 99, 235, 0.65)"
></sfx-crop>`, 'markup')}
    `,
  );
}

function renderExampleEvents(): string {
  return examplePage(
    'Event handling',
    'Custom events mirror Scaleflex conventions — bubble through shadow boundaries.',
    `
      <div class="demo-example-live">
        <sfx-crop id="ex-events" style="width:100%;height:480px;display:block"></sfx-crop>
      </div>
      <div class="demo-example-log" id="ex-events-log" aria-live="polite"></div>

      ${tabbedCode([
        { label: 'Vanilla', code: `const el = document.querySelector('sfx-crop');

el.addEventListener('sfx-crop-ready',       () => console.log('ready'));
el.addEventListener('sfx-crop-image-load',  (e) => console.log('image', e.detail.image));
el.addEventListener('sfx-crop-change',      (e) => console.log('state', e.detail));
el.addEventListener('sfx-crop-crop-change', (e) => console.log('crop',  e.detail));`, lang: 'typescript' },
        { label: 'React', code: `<SfxCrop
  src="/photo.jpg"
  onReady={({ element }) => element.setScale(1.2)}
  onChange={(state)       => setTransform(state)}
  onCropChange={(rect)    => setCrop(rect)}
  onSave={({ blob })      => upload(blob)}
  onError={({ error })    => toast.error(error.message)}
/>`, lang: 'tsx' },
      ])}
    `,
  );
}

function renderExampleExport(): string {
  return examplePage(
    'Export (blob / data-URL)',
    'Get the crop result as a Canvas, Blob, data-URL, or a set of <code>TransformParams</code> for server-side rendering.',
    `
      <div class="demo-example-live">
        <sfx-crop id="ex-export" style="width:100%;height:480px;display:block"></sfx-crop>
      </div>
      <div class="demo-example-controls">
        <button class="demo-btn demo-btn--primary" id="ex-download">Download PNG</button>
        <button class="demo-btn demo-btn--ghost" id="ex-params">Get transform params</button>
      </div>
      <pre class="demo-example-out" id="ex-export-out"></pre>

      ${codeBlock(`const crop = document.querySelector('sfx-crop');

// Download the cropped image
const blob = await crop.toBlob('image/png');
const link = Object.assign(document.createElement('a'), {
  href: URL.createObjectURL(blob),
  download: 'cropped.png',
});
link.click();

// Or render it server-side
const params = crop.toTransformParams();
// → { rotation, flipH, flipV, scale, crop: {x,y,w,h}, outputWidth, outputHeight }
fetch('/api/transform', { method: 'POST', body: JSON.stringify(params) });`, 'typescript')}
    `,
  );
}

function renderExampleCustomIcons(): string {
  // The SVG strings below live in a single source-of-truth `CUSTOM_ICON_SET`
  // block so the preview and the code snippet can't drift. Each picked to
  // contrast visibly with the built-in Lucide default — so the override is
  // obvious at a glance.
  const sample = `const el = document.querySelector('sfx-crop');
el.icons = {
  rotateLeft:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>' +
                  '<path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
  flipHorizontal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="m3 7 5 5-5 5V7"/><path d="m21 7-5 5 5 5V7"/>' +
                  '<path d="M12 20v2"/><path d="M12 14v2"/>' +
                  '<path d="M12 8v2"/><path d="M12 2v2"/></svg>',
  loupe:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<circle cx="12" cy="12" r="10"/>' +
                  '<path d="m14.31 8 5.74 9.94"/><path d="M9.69 8h11.48"/>' +
                  '<path d="m7.38 12 5.74-9.94"/><path d="M9.69 16 3.95 6.06"/>' +
                  '<path d="M14.31 16H2.83"/><path d="m16.62 12-5.74 9.94"/></svg>',
  reset:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M9 14 4 9l5-5"/>' +
                  '<path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/></svg>',
};`;

  return examplePage(
    'Custom icons',
    'Swap any toolbar glyph via the <code>icons</code> property — per-slot SVG strings, untouched slots keep the Lucide defaults.',
    `
      <div class="demo-example-cell demo-example-cell--highlight">
        <div class="demo-example-cell-label">Custom icons</div>
        <sfx-crop class="ex-icons-cell" data-variant="custom" style="height:480px;display:block"></sfx-crop>
      </div>

      ${tabbedCode([
        { label: 'Imperative', code: sample, lang: 'typescript' },
        { label: 'React', code: `<SfxCrop
  src="/photo.jpg"
  icons={{
    rotateLeft:     '<svg viewBox="0 0 24 24" …>…</svg>',
    flipHorizontal: '<svg viewBox="0 0 24 24" …>…</svg>',
    loupe:          '<svg viewBox="0 0 24 24" …>…</svg>',
    reset:          '<svg viewBox="0 0 24 24" …>…</svg>',
  }}
/>`, lang: 'tsx' },
      ])}

      <h2>Available slots</h2>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Slot</th><th>Where it appears</th></tr></thead>
          <tbody>
            <tr><td><code>rotateLeft</code></td><td>90° rotate-left button.</td></tr>
            <tr><td><code>flipHorizontal</code></td><td>Flip-horizontal button.</td></tr>
            <tr><td><code>tilt</code></td><td>Fine-rotation (±45°) trigger.</td></tr>
            <tr><td><code>loupe</code></td><td>Collapsed zoom trigger.</td></tr>
            <tr><td><code>zoomIn</code> / <code>zoomOut</code></td><td>Zoom popover <code>+</code> / <code>−</code>.</td></tr>
            <tr><td><code>cropAspect</code></td><td>Shape-selector trigger.</td></tr>
            <tr><td><code>cropCustom</code>, <code>cropCircle</code>, <code>cropRoundedRect</code></td><td>Shape dropdown options.</td></tr>
            <tr><td><code>orientLandscape</code> / <code>orientPortrait</code></td><td>Orientation tabs in the shape dropdown.</td></tr>
            <tr><td><code>chevronDown</code></td><td>Dropdown chevron.</td></tr>
            <tr><td><code>reset</code></td><td>Reset button glyph.</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Security</h2>
      <p>Values are injected with <code>unsafeHTML</code>. Treat them the same way as the library's built-in icons — <strong>static, author-trusted content only</strong>. Never concatenate user input into these strings.</p>
    `,
  );
}

function renderExampleReact(): string {
  return examplePage(
    'React wrapper',
    'A forwardRef component (<code>&lt;SfxCrop&gt;</code>) and a matching hook (<code>useSfxCrop</code>).',
    `
      <h2>Component</h2>
      ${codeBlock(`import { useRef } from 'react';
import { SfxCrop, type SfxCropElement } from '@scaleflex/crop/react';

export function Editor() {
  const ref = useRef<SfxCropElement>(null);

  const handleSave = async () => {
    const blob = await ref.current?.toBlob('image/jpeg', 0.9);
    if (blob) upload(blob);
  };

  return (
    <>
      <SfxCrop
        ref={ref}
        src="/photo.jpg"
        cropShape="free"
        theme="light"
        onChange={(s) => console.log(s)}
        onSave={({ blob }) => upload(blob)}
      />
      <button onClick={handleSave}>Save</button>
    </>
  );
}`, 'tsx')}

      <h2>Hook</h2>
      ${codeBlock(`import { useSfxCrop } from '@scaleflex/crop/react';

export function Editor() {
  const crop = useSfxCrop();
  return (
    <div>
      <sfx-crop ref={crop.ref} src="/photo.jpg" />
      <button disabled={!crop.ready} onClick={() => crop.save()}>
        {crop.ready ? 'Save' : 'Loading…'}
      </button>
    </div>
  );
}`, 'tsx')}

      <h2>SSR</h2>
      <p>The React entry dynamically imports <code>/define</code> behind a <code>typeof customElements !== 'undefined'</code> check — safe in Next.js / Remix server environments.</p>
    `,
  );
}

function renderExampleTheming(): string {
  return examplePage(
    'Theming tokens',
    'Override any <code>--sfx-cr-*</code> property from the host page.',
    `
      <div class="demo-example-cell">
        <div class="demo-example-cell-label">Sunset — full token override</div>
        <sfx-crop class="ex-theme" data-accent="sunset" style="
          --sfx-cr-primary:#ea580c;
          --sfx-cr-primary-hover:#c2410c;
          --sfx-cr-primary-bg:#ffedd5;
          --sfx-cr-primary-glow:rgba(234,88,12,.28);
          --sfx-cr-text:#7c2d12;
          --sfx-cr-text-secondary:#ea580c;
          --sfx-cr-text-muted:#fdba74;
          --sfx-cr-bg:#fff7ed;
          --sfx-cr-canvas-bg:#fff1e0;
          --sfx-cr-overlay-color:rgba(255,237,213,.78);
          --sfx-cr-border:#fed7aa;
          --sfx-cr-frame-color:#ea580c;
          --sfx-cr-handle-fill:#ea580c;
          --sfx-cr-handle-stroke:#fff7ed;
          --sfx-cr-ring:rgba(234,88,12,.55);
          --sfx-cr-toolbar-bg:rgba(255,247,237,.92);
          --sfx-cr-toolbar-border:rgba(234,88,12,.25);
          --sfx-cr-toolbar-shadow:0 4px 16px rgba(234,88,12,.18);
          --sfx-cr-dropdown-bg:#fff7ed;
          --sfx-cr-dropdown-hover:#ffedd5;
          --sfx-cr-radius:24px;
          max-width:1200px;max-height:520px;display:block;margin:0 auto
        "></sfx-crop>
      </div>

      <p class="demo-lead" style="margin-top:24px;text-align:left;">
        Every <code>--sfx-cr-*</code> token can be re-pointed from the host page. Below is a full sunset palette
        — note how it repaints the toolbar background, the icon color (<code>--sfx-cr-text-secondary</code>),
        the canvas dimming overlay, the crop frame &amp; handles, and even the outer card radius.
      </p>

      ${codeBlock(`sfx-crop.brand-sunset {
  /* Accent — buttons, hover/active, sliders, focus rings */
  --sfx-cr-primary:        #ea580c;
  --sfx-cr-primary-hover:  #c2410c;
  --sfx-cr-primary-bg:     #ffedd5;
  --sfx-cr-primary-glow:   rgba(234, 88, 12, 0.28);

  /* Text + ICON colors. Toolbar icons inherit --sfx-cr-text-secondary
     in their idle state; --sfx-cr-text drives ruler ticks + value text. */
  --sfx-cr-text:           #7c2d12;
  --sfx-cr-text-secondary: #ea580c;   /* idle icon color */
  --sfx-cr-text-muted:     #fdba74;

  /* Surfaces */
  --sfx-cr-bg:             #fff7ed;
  --sfx-cr-canvas-bg:      #fff1e0;
  --sfx-cr-overlay-color:  rgba(255, 237, 213, 0.78);  /* outside-crop dim */
  --sfx-cr-border:         #fed7aa;

  /* Crop frame + handle */
  --sfx-cr-frame-color:    #ea580c;
  --sfx-cr-handle-fill:    #ea580c;
  --sfx-cr-handle-stroke:  #fff7ed;
  --sfx-cr-ring:           rgba(234, 88, 12, 0.55);

  /* Toolbar pill */
  --sfx-cr-toolbar-bg:     rgba(255, 247, 237, 0.92);
  --sfx-cr-toolbar-border: rgba(234, 88, 12, 0.25);
  --sfx-cr-toolbar-shadow: 0 4px 16px rgba(234, 88, 12, 0.18);

  /* Aspect-ratio dropdown */
  --sfx-cr-dropdown-bg:    #fff7ed;
  --sfx-cr-dropdown-hover: #ffedd5;

  /* Outer card */
  --sfx-cr-radius:         24px;
}`, 'css')}
    `,
  );
}

// ---------------------------------------------------------------------------
// Example hydration
// ---------------------------------------------------------------------------

function hydrateExampleBasic(root: HTMLElement): void {
  const el = root.querySelector('#ex-basic') as SfxCropElement | null;
  if (el) { el.src = DEMO_SRC; el.showGrid = 'interaction'; el.theme = 'light'; }
}

function hydrateExampleShapes(root: HTMLElement): void {
  for (const el of root.querySelectorAll<SfxCropElement>('.ex-shape')) {
    el.src = DEMO_SRC;
    el.cropShape = (el.dataset.shape as CropShapeName) ?? 'free';
    el.showToolbar = false;
    el.showZoomSlider = false;
    el.keyboard = false;
    el.wheelZoom = false;
    el.showGrid = true;
  }
}

function hydrateExampleInitialState(root: HTMLElement): void {
  const el = root.querySelector('#ex-initial') as SfxCropElement | null;
  if (!el) return;
  // Seed the initial-* fields before `src` — the controller reads them
  // once, during image load. Order matters for the imperative path.
  el.initialCrop     = { x: 0.1, y: 0.12, width: 0.6, height: 0.6 };
  el.initialRotation = -8;
  el.initialScale    = 1.2;
  el.cropShape       = 'free';
  el.src = DEMO_SRC;
  el.showGrid = 'interaction';
}

function hydrateExampleCustomIcons(root: HTMLElement): void {
  // Keep the SVG set in exact lockstep with the snippet shown in the
  // rendered tab — any drift here breaks the "what you see is what you
  // copy-paste" promise.
  const CUSTOM_ICONS = {
    rotateLeft:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>' +
      '<path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
    flipHorizontal:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="m3 7 5 5-5 5V7"/><path d="m21 7-5 5 5 5V7"/>' +
      '<path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/></svg>',
    loupe:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="10"/>' +
      '<path d="m14.31 8 5.74 9.94"/><path d="M9.69 8h11.48"/>' +
      '<path d="m7.38 12 5.74-9.94"/><path d="M9.69 16 3.95 6.06"/>' +
      '<path d="M14.31 16H2.83"/><path d="m16.62 12-5.74 9.94"/></svg>',
    reset:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 14 4 9l5-5"/>' +
      '<path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/></svg>',
  };

  for (const el of root.querySelectorAll<SfxCropElement>('.ex-icons-cell')) {
    el.src = DEMO_SRC;
    el.cropShape = '16:9';
    el.showGrid = 'interaction';
    if (el.dataset.variant === 'custom') el.icons = CUSTOM_ICONS;
  }
}

function hydrateExampleTransforms(root: HTMLElement): void {
  const el = root.querySelector('#ex-tx') as SfxCropElement | null;
  if (!el) return;
  el.src = DEMO_SRC;
  el.showGrid = 'interaction';
  root.querySelector('#ex-rl')?.addEventListener('click', () => el.rotateLeft());
  root.querySelector('#ex-fh')?.addEventListener('click', () => el.flipHorizontal());
  root.querySelector('#ex-reset')?.addEventListener('click', () => el.reset());

  // Secondary live demo on the same page — print-bleed guides.
  const bleed = root.querySelector('#ex-bleed') as SfxCropElement | null;
  if (bleed) {
    bleed.src = DEMO_SRC; bleed.showGrid = true; bleed.theme = 'light';
    const bleedBtn = root.querySelector<HTMLButtonElement>('#ex-bleed-toggle');
    bleedBtn?.addEventListener('click', () => {
      const next = !bleed.showBleedMargin;
      bleed.showBleedMargin = next;
      bleedBtn.textContent = `Bleed: ${next ? 'on' : 'off'}`;
      bleedBtn.setAttribute('aria-pressed', String(next));
    });
  }
}

function hydrateExampleEvents(root: HTMLElement): void {
  const el  = root.querySelector('#ex-events') as SfxCropElement | null;
  const log = root.querySelector<HTMLElement>('#ex-events-log');
  if (!el || !log) return;
  el.src = DEMO_SRC;
  el.showGrid = 'interaction';
  const append = (msg: string): void => {
    const p = document.createElement('div');
    p.textContent = msg;
    log.prepend(p);
    while (log.children.length > 12) log.lastChild?.remove();
  };
  el.addEventListener('sfx-crop-ready',       () => append('▸ sfx-crop-ready'));
  el.addEventListener('sfx-crop-image-load',  () => append('▸ sfx-crop-image-load'));
  el.addEventListener('sfx-crop-change',      (e: Event) => {
    const s = (e as CustomEvent).detail;
    append(`▸ sfx-crop-change  rot=${s.rotation.toFixed(1)}° scale=${s.scale.toFixed(2)}`);
  });
  el.addEventListener('sfx-crop-crop-change', (e: Event) => {
    const r = (e as CustomEvent).detail;
    append(`▸ sfx-crop-crop-change  ${r.x}×${r.y}  ${r.width}×${r.height}`);
  });
  // Fired by the toolbar's "Done" button (→ save()).
  el.addEventListener('sfx-crop-save', (e: Event) => {
    const { params } = (e as CustomEvent).detail as { params: { outputWidth: number; outputHeight: number } };
    append(`▸ sfx-crop-save  ${params.outputWidth}×${params.outputHeight}px`);
  });
}

function hydrateExampleExport(root: HTMLElement): void {
  const el  = root.querySelector('#ex-export') as SfxCropElement | null;
  const out = root.querySelector<HTMLElement>('#ex-export-out');
  if (!el || !out) return;
  el.src = DEMO_SRC;
  el.showGrid = 'interaction';

  root.querySelector('#ex-download')?.addEventListener('click', async () => {
    const blob = await el.toBlob('image/png');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cropped.png';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  root.querySelector('#ex-params')?.addEventListener('click', () => {
    out.textContent = JSON.stringify(el.toTransformParams(), null, 2);
  });
}

function hydrateExampleTheming(root: HTMLElement): void {
  for (const el of root.querySelectorAll<SfxCropElement>('.ex-theme')) {
    el.src = DEMO_SRC;
    // Toolbar stays visible so the brand primary is also visible on the
    // hover-ring / focus-ring of the toolbar buttons — without it, the
    // only tinted surfaces are the frame + handles and the cards look
    // nearly identical.
    el.showToolbar = true;
    el.showRotateSlider = false;
    el.showZoomSlider = false;
    el.keyboard = false;
    el.wheelZoom = false;
    el.theme = 'light';
  }
}

function renderExampleFixed(): string {
  return examplePage(
    'Fixed variant',
    'The editor box IS the crop frame: the photo is cover-fit and panned / zoomed / rotated underneath, always covering the frame (no transparent gaps). No resize handles — the toolbar overlays the frame. Ideal for avatars and phone-style crops.',
    `
      <div class="demo-example-grid">
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Square (1:1)</div>
          <sfx-crop class="ex-fixed" data-shape="square" style="height:360px;display:block"></sfx-crop>
        </div>
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Portrait (9:16)</div>
          <sfx-crop class="ex-fixed" data-shape="9:16" style="height:360px;display:block"></sfx-crop>
        </div>
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Circle</div>
          <sfx-crop class="ex-fixed" data-shape="circle" style="height:360px;display:block"></sfx-crop>
        </div>
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Landscape (16:9)</div>
          <sfx-crop class="ex-fixed" data-shape="16:9" style="height:360px;display:block"></sfx-crop>
        </div>
      </div>

      ${tabbedCode([
        { label: 'HTML', code: `<sfx-crop
  src="/photo.jpg"
  variant="fixed"
  crop-shape="1:1"
></sfx-crop>`, lang: 'markup' },
        { label: 'React', code: `import { SfxCrop } from '@scaleflex/crop/react';

<SfxCrop
  src="/photo.jpg"
  variant="fixed"
  cropShape="1:1"
  onSave={({ blob }) => upload(blob)}
/>`, lang: 'tsx' },
      ])}
    `,
  );
}

function hydrateExampleFixed(root: HTMLElement): void {
  for (const el of root.querySelectorAll<SfxCropElement>('.ex-fixed')) {
    el.variant = 'fixed';
    el.cropShape = (el.dataset.shape ?? '1:1') as SfxCropElement['cropShape'];
    el.src = DEMO_SRC;
  }
}

// ---------------------------------------------------------------------------
// Route registry
// ---------------------------------------------------------------------------

type PageRenderer = () => string;
type PageHydrator = (root: HTMLElement) => void;

interface PageDef { render: PageRenderer; hydrate?: PageHydrator }

const PAGES: Record<string, PageDef> = {
  '/':                        { render: renderHome, hydrate: hydrateHome },

  '/docs/getting-started':    { render: renderDocGettingStarted },
  '/docs/configuration':      { render: renderDocConfiguration },
  '/docs/api':                { render: renderDocApi },
  '/docs/theming':            { render: renderDocTheming },
  '/docs/types':              { render: renderDocTypes },

  '/examples/basic':          { render: renderExampleBasic,          hydrate: hydrateExampleBasic },
  '/examples/shapes':         { render: renderExampleShapes,         hydrate: hydrateExampleShapes },
  '/examples/fixed':          { render: renderExampleFixed,          hydrate: hydrateExampleFixed },
  '/examples/initial-state':  { render: renderExampleInitialState,   hydrate: hydrateExampleInitialState },
  '/examples/transforms':     { render: renderExampleTransforms,     hydrate: hydrateExampleTransforms },
  '/examples/events':         { render: renderExampleEvents,         hydrate: hydrateExampleEvents },
  '/examples/export':         { render: renderExampleExport,         hydrate: hydrateExampleExport },
  '/examples/custom-icons':   { render: renderExampleCustomIcons,    hydrate: hydrateExampleCustomIcons },
  '/examples/theming':        { render: renderExampleTheming,        hydrate: hydrateExampleTheming },
  '/examples/react':          { render: renderExampleReact },
};

function currentPath(): string {
  const h = location.hash;
  if (!h || h === '#' || h === '#/') return '/';
  return h.replace(/^#/, '');
}

function layoutFor(path: string): 'home' | 'docs' | 'examples' {
  if (path.startsWith('/docs')) return 'docs';
  if (path.startsWith('/examples')) return 'examples';
  return 'home';
}

function renderMobileNav(path: string): string {
  const isHome = path === '/';
  const isDocs = path.startsWith('/docs');
  const isEx   = path.startsWith('/examples');

  // Sub-section list for the route currently in view (docs/examples).
  // On home the primary nav alone is enough.
  let secondary = '';
  if (isDocs) {
    secondary = `
      <div class="demo-mobile-nav-section">
        <div class="demo-mobile-nav-section-label">Documentation</div>
        ${DOC_ROUTES.map((r) => `
          <a href="#${r.path}" class="demo-mobile-nav-link demo-mobile-nav-link--sub${path === r.path ? ' is-active' : ''}">${r.label}</a>
        `).join('')}
      </div>
    `;
  } else if (isEx) {
    secondary = EXAMPLE_GROUPS.map((g) => `
      <div class="demo-mobile-nav-section">
        <div class="demo-mobile-nav-section-label">${g.label}</div>
        ${g.items.map((r) => `
          <a href="#${r.path}" class="demo-mobile-nav-link demo-mobile-nav-link--sub${path === r.path ? ' is-active' : ''}">${r.label}</a>
        `).join('')}
      </div>
    `).join('');
  }

  return `
    <nav class="demo-mobile-nav" id="demo-mobile-nav" aria-label="Mobile">
      <div class="demo-mobile-nav-section">
        <a href="#/"                     class="demo-mobile-nav-link${isHome ? ' is-active' : ''}">Home</a>
        <a href="#/docs/getting-started" class="demo-mobile-nav-link${isDocs ? ' is-active' : ''}">Documentation</a>
        <a href="#/examples/basic"       class="demo-mobile-nav-link${isEx ? ' is-active' : ''}">Examples</a>
      </div>
      ${secondary}
    </nav>
  `;
}

function renderShell(path: string, pageHtml: string): string {
  const layout = layoutFor(path);
  const sidebar = renderSidebar(path);
  return `
    ${renderHeader(path)}
    ${renderMobileNav(path)}
    <div class="demo-sidebar-backdrop" id="demo-sidebar-backdrop"></div>
    <main class="demo-main demo-main--${layout}" id="demo-main">
      ${sidebar}
      <div class="demo-content" id="content">${pageHtml}</div>
    </main>
    ${renderFooter()}
  `;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

// Per-navigation cleanup: every listener wired in navigate() ties to this
// AbortController; every ResizeObserver pushes onto navResizeObservers.
// The next navigate() call aborts/disconnects them before re-binding so
// long sessions don't accrete observers across many route changes.
let navAbort: AbortController | null = null;
let navResizeObservers: ResizeObserver[] = [];

function navigate(): void {
  // Tear down per-page bindings from the previous render.
  navAbort?.abort();
  for (const ro of navResizeObservers) ro.disconnect();
  navResizeObservers = [];
  navAbort = new AbortController();
  const { signal } = navAbort;

  const path = currentPath();
  const page = PAGES[path] ?? PAGES['/'];
  const app  = document.getElementById('app')!;
  const layout = layoutFor(path);
  document.body.classList.toggle('is-home', layout === 'home');
  document.body.classList.toggle('has-sidebar', layout !== 'home');

  app.innerHTML = renderShell(path, page.render());
  const root = app.querySelector<HTMLElement>('#content')!;

  bindCopyButtons(root);
  bindTabs(root);
  highlight(root);

  page.hydrate?.(root);

  // Scroll the content area to top on nav. Keep anchors (#quick-start) working.
  if (!location.hash.includes('#quick-start')) window.scrollTo({ top: 0, behavior: 'instant' });

  // Mobile sidebar / nav drawer.
  // - Burger toggles `body.sidebar-open` which slides in either the
  //   route's sidebar (docs/examples) or the mobile primary nav (home).
  // - Tap on backdrop, drawer link, or Escape closes the drawer.
  const closeDrawer = (): void => document.body.classList.remove('sidebar-open');
  document.getElementById('demo-burger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.body.classList.toggle('sidebar-open');
  }, { signal });
  document.getElementById('demo-sidebar-backdrop')?.addEventListener('click', closeDrawer, { signal });
  document
    .querySelectorAll<HTMLAnchorElement>('.demo-mobile-nav a, .demo-sidebar a')
    .forEach((a) => a.addEventListener('click', closeDrawer, { signal }));

  // Per-crop theme toggle — rebind after each nav since the page HTML is
  // replaced wholesale. Each toggle button lives inside `.demo-crop-wrap`
  // and only flips the crop that sits next to it.
  document.querySelectorAll<HTMLElement>('.demo-crop-wrap').forEach((wrap) => {
    const btn = wrap.querySelector<HTMLButtonElement>('.demo-theme-toggle');
    if (!btn) return;
    const initialTheme = getStoredTheme();
    applyThemeToWrap(wrap, initialTheme);
    btn.setAttribute('aria-pressed', initialTheme === 'dark' ? 'true' : 'false');
    btn.addEventListener('click', () => {
      const current = wrap.querySelector('sfx-crop')?.getAttribute('theme') as DemoTheme | null;
      const next: DemoTheme = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyThemeToWrap(wrap, next);
      btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    }, { signal });
    // Keep the toggle pinned to the host's actual top-right corner.
    // The wrap is full-width (definite measurement parent for the
    // editor), but the host shrinks to image aspect inside, centered
    // via margin:auto. CSS positions the button via `right: calc(
    // (100% - var(--sfx-host-w)) / 2 + 12px)`, so we just publish the
    // host's current pixel width as that custom property.
    const host = wrap.querySelector<HTMLElement>('sfx-crop');
    if (host) {
      const sync = () => {
        wrap.style.setProperty('--sfx-host-w', `${host.offsetWidth}px`);
      };
      const ro = new ResizeObserver(sync);
      ro.observe(host);
      navResizeObservers.push(ro);
      sync();
    }
  });
}

/**
 * Global "Done" result preview. The toolbar's Done button calls save(), which
 * dispatches a bubbling + composed `sfx-crop-save`, so one document-level
 * listener surfaces the finished crop from ANY <sfx-crop> on the page — home
 * or examples — in a single shared modal. This is the demo stand-in for what a
 * real app does on save (upload / persist / close).
 */
function setupSavePreview(): void {
  const overlay = document.createElement('div');
  overlay.className = 'demo-save-modal';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="demo-save-card" role="dialog" aria-modal="true" aria-label="Crop result">
      <div class="demo-save-head">
        <span class="demo-save-title">Cropped result</span>
        <button type="button" class="demo-save-close" aria-label="Close">✕</button>
      </div>
      <div class="demo-save-body"><img class="demo-save-img" alt="Cropped result preview" /></div>
      <div class="demo-save-foot">
        <span class="demo-save-meta"></span>
        <a class="demo-save-dl" download="cropped.png">Download PNG</a>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const img  = overlay.querySelector<HTMLImageElement>('.demo-save-img')!;
  const meta = overlay.querySelector<HTMLElement>('.demo-save-meta')!;
  const dl   = overlay.querySelector<HTMLAnchorElement>('.demo-save-dl')!;
  let url: string | null = null;

  const close = (): void => {
    overlay.hidden = true;
    if (url) { URL.revokeObjectURL(url); url = null; }
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.demo-save-close')!.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });

  document.addEventListener('sfx-crop-save', (e: Event) => {
    const d = (e as CustomEvent).detail as {
      blob: Blob; dataURL: string; params: { outputWidth: number; outputHeight: number };
    };
    img.src = d.dataURL;
    meta.textContent = `${d.params.outputWidth} × ${d.params.outputHeight} px · PNG`;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(d.blob);
    dl.href = url;
    overlay.hidden = false;
  });
}

setupSavePreview();

window.addEventListener('hashchange', navigate);
document.addEventListener('DOMContentLoaded', navigate);
// Escape closes the mobile drawer regardless of which page-specific
// listeners got rebound by the most recent navigate() call.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.body.classList.remove('sidebar-open');
});
// Fire immediately if DOM already loaded (Vite HMR)
if (document.readyState !== 'loading') navigate();
