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
  npm: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 2v20h20V2H2zm18 18h-6V8h-3v12H4V4h16v16z"/></svg>',
  external: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>',
  burger: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
};

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
      { path: '/examples/basic',        label: 'Basic usage' },
      { path: '/examples/react',        label: 'React wrapper' },
    ],
  },
  {
    label: 'Crop',
    items: [
      { path: '/examples/shapes',       label: 'Shape presets' },
      { path: '/examples/transforms',   label: 'Rotate / flip / zoom' },
      { path: '/examples/bleed-margin', label: 'Print bleed margins' },
    ],
  },
  {
    label: 'Integration',
    items: [
      { path: '/examples/events',       label: 'Event handling' },
      { path: '/examples/export',       label: 'Export (blob / data-URL)' },
      { path: '/examples/theming',      label: 'Theming tokens' },
    ],
  },
  {
    label: 'Playground',
    items: [
      { path: '/examples/configurator', label: 'Live configurator' },
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
          <a class="demo-topbar-chip" href="https://www.npmjs.com/package/@scaleflex/crop" target="_blank" rel="noopener" aria-label="npm package">
            ${ICONS.npm}<span>npm</span>
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
          <div class="demo-sidebar-title">Examples</div>
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
  const featureCards = [
    { icon: '✂️', title: 'Free / ratio / circle', body: '10 built-in crop presets plus rounded-rect with custom border radius.' },
    { icon: '🔄', title: 'Rotate, flip, zoom', body: '90° steps, ±45° fine rotation with snap-to-zero, pinch + wheel zoom, pan.' },
    { icon: '🎨', title: 'Fully themeable', body: '--sfx-cr-* CSS custom properties + ::part() theming — match any brand.' },
    { icon: '⌨️', title: 'Keyboard + A11y', body: 'Arrow keys, R/F shortcuts, tabindex, ARIA live-region announcements.' },
    { icon: '⚛️', title: 'React binding', body: 'forwardRef wrapper and useSfxCrop() hook via @scaleflex/crop/react.' },
    { icon: '📦', title: 'Light & fast', body: '~21 KB gzipped total cold-start; ESM + CJS; Lit 3 under the hood.' },
  ];

  const installSnippet = `npm install @scaleflex/crop`;
  const esmSnippet = `import '@scaleflex/crop/define';

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
          @scaleflex/crop · v2.0
        </div>
        <h1 class="demo-hero-title">Crop</h1>
        <p class="demo-hero-sub">Framework-agnostic Web Component for interactive image cropping — rotate, flip, zoom, and shape presets in a single <code>&lt;sfx-crop&gt;</code> tag.</p>
        <div class="demo-hero-actions">
          <a class="demo-btn demo-btn--primary" href="#quick-start">Get started ${ICONS.arrow}</a>
          <a class="demo-btn demo-btn--glass" href="https://github.com/scaleflex/js-cloudimage-crop" target="_blank" rel="noopener">${ICONS.github} GitHub</a>
          <a class="demo-btn demo-btn--glass" href="https://www.npmjs.com/package/@scaleflex/crop" target="_blank" rel="noopener">${ICONS.npm} npm</a>
        </div>
        <div class="demo-hero-meta">
          <span>Web Component</span>
          <span>·</span>
          <span>Lit 3</span>
          <span>·</span>
          <span>React wrapper</span>
          <span>·</span>
          <span>TypeScript</span>
          <span>·</span>
          <span>WCAG 2.1 AA</span>
        </div>
      </div>
    </section>

    <section class="demo-live" id="live-demo">
      <div class="demo-section-inner">
        <div class="demo-section-label">Live demo</div>
        <h2>Try it right here</h2>
        <p class="demo-lead">A fully interactive crop editor embedded directly in this page — drag corners, rotate with the slider, switch crop shapes.</p>
        <div class="demo-card demo-card--lg">
          <sfx-crop id="home-viewer" style="width:100%;height:520px;display:block"></sfx-crop>
        </div>
      </div>
    </section>

    <section class="demo-quick-start" id="quick-start">
      <div class="demo-section-inner">
        <div class="demo-section-label">Quick start</div>
        <h2>Add it to your app in 30 seconds</h2>
        <div class="demo-install-card">
          <div class="demo-install-bar">
            <span class="demo-install-prompt">$</span>
            <code>${installSnippet}</code>
            <button class="demo-copy-btn demo-copy-btn--inverse" data-copy-text="${installSnippet}" aria-label="Copy install command">${ICONS.copy}</button>
          </div>
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

    <section class="demo-siblings">
      <div class="demo-section-inner">
        <div class="demo-section-label">Also by Scaleflex</div>
        <h2>Designed to work together</h2>
        <div class="demo-siblings-grid">
          <a class="demo-sibling" href="https://www.npmjs.com/package/@scaleflex/uploader" target="_blank" rel="noopener">
            <div class="demo-sibling-icon">📤</div>
            <div>
              <h3>@scaleflex/uploader</h3>
              <p>Drag &amp; drop file uploader with 7 cloud providers.</p>
            </div>
            ${ICONS.external}
          </a>
          <a class="demo-sibling" href="https://www.npmjs.com/package/@scaleflex/asset-picker" target="_blank" rel="noopener">
            <div class="demo-sibling-icon">🖼️</div>
            <div>
              <h3>@scaleflex/asset-picker</h3>
              <p>Browse &amp; pick assets from your Scaleflex DAM.</p>
            </div>
            ${ICONS.external}
          </a>
          <a class="demo-sibling" href="https://github.com/scaleflex/filerobot-image-editor" target="_blank" rel="noopener">
            <div class="demo-sibling-icon">🎨</div>
            <div>
              <h3>filerobot-image-editor</h3>
              <p>Full canvas-based editor with filters, adjust, annotations.</p>
            </div>
            ${ICONS.external}
          </a>
        </div>
      </div>
    </section>
  `;
}

function hydrateHome(root: HTMLElement): void {
  const el = root.querySelector('#home-viewer') as SfxCropElement | null;
  if (el) {
    el.src = DEMO_SRC;
    el.cropShape = 'free';
    el.showGrid = 'interaction';
    el.showToolbar = true;
    el.showZoomSlider = true;
    el.showRotateSlider = true;
  }
  // Inline copy button for the install bar
  const installCopy = root.querySelector<HTMLButtonElement>('.demo-install-bar .demo-copy-btn');
  installCopy?.addEventListener('click', () => {
    const text = installCopy.dataset.copyText ?? '';
    navigator.clipboard.writeText(text).then(() => {
      installCopy.classList.add('is-copied');
      installCopy.innerHTML = ICONS.check;
      setTimeout(() => { installCopy.classList.remove('is-copied'); installCopy.innerHTML = ICONS.copy; }, 1600);
    });
  });
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
      ${codeBlock('npm install @scaleflex/crop', 'bash')}

      <h2>Register the element</h2>
      <p>A single side-effect import registers <code>&lt;sfx-crop&gt;</code> and its five sub-elements (<code>sfx-crop-canvas</code>, <code>sfx-crop-toolbar</code>, <code>sfx-crop-zoom</code>, <code>sfx-crop-rotate</code>, <code>sfx-crop-shapes</code>). Idempotent — safe under React StrictMode and repeated imports.</p>
      ${codeBlock(`import '@scaleflex/crop/define';`, 'typescript')}

      <h2>Drop it into HTML</h2>
      ${codeBlock(`<sfx-crop
  src="/photo.jpg"
  crop-shape="free"
  theme="light"
  show-grid="interaction"
></sfx-crop>`, 'markup')}

      <h2>Or use the React binding</h2>
      ${codeBlock(`import { SfxCrop, type SfxCropElement } from '@scaleflex/crop/react';

export function Editor() {
  const ref = useRef<SfxCropElement>(null);

  return (
    <SfxCrop
      ref={ref}
      src="/photo.jpg"
      cropShape="free"
      onChange={(state) => console.log(state)}
      onSave={({ blob }) => upload(blob)}
    />
  );
}`, 'tsx')}

      <h2>CDN</h2>
      <p>No bundler? Import the side-effect entry from <code>esm.sh</code>:</p>
      ${codeBlock(`<script type="module" src="https://esm.sh/@scaleflex/crop/define"></script>

<sfx-crop src="/photo.jpg" crop-shape="free"></sfx-crop>`, 'markup')}

      <h2>Browser support</h2>
      <p>Chrome / Edge 90+, Firefox 100+, Safari 15.4+. Requires <code>customElements</code>, Shadow DOM, and modern CSS (<code>backdrop-filter</code>, <code>oklch()</code>).</p>
    `,
  );
}

function renderDocConfiguration(): string {
  const attrs: [string, string, string, string][] = [
    ['src',                 'URL',                                         '""',              'Image source URL.'],
    ['crop-shape',          'free|square|circle|rounded-rect|16:9|4:3|3:2|2:3|3:4|9:16', 'free', 'Active crop preset.'],
    ['theme',               'light|dark',                                  'dark',            'Color variant.'],
    ['show-grid',           'true|false|interaction',                      'interaction',     'Rule-of-thirds grid visibility.'],
    ['min-scale',           'number',                                      '0.5',             'Minimum zoom level.'],
    ['max-scale',           'number',                                      '5',               'Maximum zoom level.'],
    ['min-crop-size',       'px',                                          '20',              'Minimum crop rect side in image pixels.'],
    ['available-shapes',    'JSON array | CSV',                            'full preset set', 'Shapes exposed in the selector.'],
    ['toolbar-position',    'top|bottom',                                  'bottom',          'Floating toolbar anchor.'],
    ['show-toolbar',        'boolean',                                     'true',            'Toggle the floating toolbar.'],
    ['show-rotate-slider',  'boolean',                                     'true',            'Show the fine-rotation slider.'],
    ['show-zoom-slider',    'boolean',                                     'true',            'Show the secondary zoom pill.'],
    ['show-shape-selector', 'boolean',                                     'true',            'Show the shape dropdown.'],
    ['show-rotate-button',  'boolean',                                     'true',            'Show the 90° rotate-left button.'],
    ['show-flip-button',    'boolean',                                     'true',            'Show the flip-horizontal button.'],
    ['border-radius',       'px',                                          '20',              'Corner radius for the rounded-rect shape.'],
    ['overlay-color',       'CSS color',                                   'rgba(0,0,0,.55)', 'Dim-outside-crop mask color.'],
    ['handle-size',         'px',                                          '12',              'Corner-handle size.'],
    ['show-bleed-margin',   'boolean',                                     'false',           'Show print bleed guides inside the crop.'],
    ['bleed-margin-size',   'px',                                          '10',              'Distance from the crop edge to the bleed line.'],
    ['enable-animations',   'boolean',                                     'true',            'Spring + lerp animations.'],
    ['animation-speed',     'number',                                      '1.0',             'Animation speed multiplier.'],
    ['keyboard',            'boolean',                                     'true',            'Enable keyboard shortcuts (R/F/+/−/0/arrows).'],
    ['wheel-zoom',          'boolean',                                     'true',            'Enable mouse-wheel zoom.'],
    ['pinch-zoom',          'boolean',                                     'true',            'Enable pinch-to-zoom on touch.'],
  ];

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
el.availableShapes = ['free', 'circle', '16:9'];`, 'typescript')}

      <h2>All attributes</h2>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Attribute</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            ${attrs.map(([n, t, d, desc]) => `<tr><td><code>${n}</code></td><td>${escapeHtml(t)}</td><td><code>${d}</code></td><td>${desc}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <h2>Booleans</h2>
      <p>Boolean attributes accept the presence shorthand, <code>"true"</code>, or <code>"false"</code>:</p>
      ${codeBlock(`<sfx-crop show-toolbar></sfx-crop>
<sfx-crop show-toolbar="false"></sfx-crop>`, 'markup')}
    `,
  );
}

function renderDocApi(): string {
  return docPage(
    'API reference',
    'Imperative methods on the <code>&lt;sfx-crop&gt;</code> element and the seven custom events it emits.',
    `
      <h2>Methods</h2>
      <p>Hold a DOM ref (or the React <code>ref.current</code>) and call:</p>
      ${codeBlock(`el.loadImage(src: string): Promise<void>;
el.rotateLeft(): void;
el.flipHorizontal(): void;
el.setRotation(deg: number): void;          // -45 … +45
el.setScale(scale: number): void;
el.setCropShape(shape: CropShapeName): void;
el.setCropRect(rect: CropRect): void;
el.getCropRect(): CropRect;                 // image-pixel coords
el.getTransformState(): TransformState;
el.toCanvas(): HTMLCanvasElement;
el.toBlob(type?: string, quality?: number): Promise<Blob>;
el.toDataURL(type?: string, quality?: number): string;
el.toTransformParams(): TransformParams;    // for server-side rendering
el.reset(): void;
el.save(type?: string, quality?: number): Promise<void>;  // dispatches sfx-crop-save
el.cancel(): void;                                        // dispatches sfx-crop-cancel`, 'typescript')}

      <h2>Events</h2>
      <p>All events bubble and cross shadow boundaries (<code>composed: true</code>) — listen from <code>document</code> if you prefer.</p>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Event</th><th><code>detail</code> payload</th></tr></thead>
          <tbody>
            <tr><td><code>sfx-crop-ready</code></td><td><code>{ element: SfxCropElement }</code></td></tr>
            <tr><td><code>sfx-crop-image-load</code></td><td><code>{ image: HTMLImageElement }</code></td></tr>
            <tr><td><code>sfx-crop-change</code></td><td><code>TransformState</code></td></tr>
            <tr><td><code>sfx-crop-crop-change</code></td><td><code>CropRect</code> (image-pixel coords)</td></tr>
            <tr><td><code>sfx-crop-save</code></td><td><code>{ blob: Blob, dataURL: string, params: TransformParams }</code></td></tr>
            <tr><td><code>sfx-crop-cancel</code></td><td><code>void</code></td></tr>
            <tr><td><code>sfx-crop-error</code></td><td><code>{ error: Error }</code></td></tr>
          </tbody>
        </table>
      </div>

      <h2>Listen from vanilla JS</h2>
      ${codeBlock(`document.addEventListener('sfx-crop-change', (e) => {
  console.log('TransformState:', e.detail);
});

document.addEventListener('sfx-crop-save', (e) => {
  const { blob, dataURL, params } = e.detail;
  uploadToServer(blob);
});`, 'typescript')}

      <h2>CSS parts</h2>
      <p>Style internals via shadow-DOM <code>::part()</code>:</p>
      ${codeBlock(`sfx-crop::part(container)    { border: 1px solid #e8edf5; }
sfx-crop::part(canvas-host)  { background: #0f172a; }
sfx-crop::part(toolbar)      { border-radius: 12px; }
sfx-crop::part(zoom)         { display: none; }`, 'css')}
    `,
  );
}

function renderDocTheming(): string {
  return docPage(
    'Theming',
    'Scaleflex design tokens with the <code>--sfx-cr-*</code> prefix — override any from light DOM.',
    `
      <h2>Overriding tokens</h2>
      ${codeBlock(`sfx-crop {
  --sfx-cr-primary: #ff3366;
  --sfx-cr-primary-hover: #e62958;
  --sfx-cr-primary-bg: #ffe3ec;
  --sfx-cr-primary-glow: rgba(255, 51, 102, 0.22);
  --sfx-cr-radius: 20px;
  --sfx-cr-font: 'SF Pro Display', system-ui, sans-serif;
}`, 'css')}

      <h2>Switching theme</h2>
      <p>The <code>theme</code> attribute toggles a preset token bundle:</p>
      ${codeBlock(`<sfx-crop theme="dark"></sfx-crop>
<sfx-crop theme="light"></sfx-crop>`, 'markup')}

      <h2>Full token list</h2>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Token</th><th>Role</th></tr></thead>
          <tbody>
            <tr><td><code>--sfx-cr-primary</code></td><td>Brand accent (frame, slider thumbs, focus)</td></tr>
            <tr><td><code>--sfx-cr-primary-hover</code></td><td>Hover state for primary</td></tr>
            <tr><td><code>--sfx-cr-primary-bg</code></td><td>Subtle tint for hover/active states</td></tr>
            <tr><td><code>--sfx-cr-primary-glow</code></td><td>Focus / handle hover halo</td></tr>
            <tr><td><code>--sfx-cr-text</code></td><td>Body text</td></tr>
            <tr><td><code>--sfx-cr-text-secondary</code></td><td>Secondary labels</td></tr>
            <tr><td><code>--sfx-cr-text-muted</code></td><td>Placeholder / range labels</td></tr>
            <tr><td><code>--sfx-cr-border</code></td><td>Hairlines</td></tr>
            <tr><td><code>--sfx-cr-bg</code></td><td>Outer card background</td></tr>
            <tr><td><code>--sfx-cr-surface</code></td><td>Secondary surface</td></tr>
            <tr><td><code>--sfx-cr-canvas-bg</code></td><td>Behind the image when it doesn't cover the area</td></tr>
            <tr><td><code>--sfx-cr-radius</code></td><td>Outer card border radius</td></tr>
            <tr><td><code>--sfx-cr-font</code></td><td>Font family stack</td></tr>
            <tr><td><code>--sfx-cr-ring</code></td><td>Focus outline color</td></tr>
            <tr><td><code>--sfx-cr-error</code></td><td>Error message color</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Parts</h2>
      <div class="demo-table-wrap">
        <table class="demo-table">
          <thead><tr><th>Part</th><th>Maps to</th></tr></thead>
          <tbody>
            <tr><td><code>container</code></td><td>Outer <code>.sfx-cr-container</code> card</td></tr>
            <tr><td><code>canvas-host</code></td><td><code>&lt;sfx-crop-canvas&gt;</code> host</td></tr>
            <tr><td><code>toolbar</code></td><td>Floating pill toolbar</td></tr>
            <tr><td><code>zoom</code></td><td>Zoom pill bar</td></tr>
            <tr><td><code>loading</code></td><td>Loading overlay</td></tr>
            <tr><td><code>error</code></td><td>Error overlay</td></tr>
          </tbody>
        </table>
      </div>
    `,
  );
}

function renderDocTypes(): string {
  return docPage(
    'TypeScript types',
    'Shared types re-exported from <code>@scaleflex/crop</code>.',
    `
      ${codeBlock(`import type {
  SfxCropElement,
  CropShapeName,
  CropRect,
  NormalizedRect,
  TransformState,
  TransformParams,
  HandlePosition,
} from '@scaleflex/crop';
import type {
  SfxCropProps,
  SfxCropSaveDetail,
  UseSfxCropReturn,
} from '@scaleflex/crop/react';`, 'typescript')}

      <h2>CropRect</h2>
      ${codeBlock(`interface CropRect {
  x: number;       // image-pixel x (left edge)
  y: number;       // image-pixel y (top edge)
  width: number;   // image-pixel width
  height: number;  // image-pixel height
}`, 'typescript')}

      <h2>TransformState</h2>
      ${codeBlock(`interface TransformState {
  quarterTurns: number;   // 0, 90, 180, 270 — normalized CCW
  rotation: number;       // -45 … +45 fine rotation
  flipH: boolean;
  flipV: boolean;
  scale: number;
  panX: number;
  panY: number;
  cropRect: NormalizedRect;  // [0,1] in image space
}`, 'typescript')}

      <h2>TransformParams</h2>
      <p>Server-side-renderable summary — useful for passing to an image CDN (Cloudimage, Filerobot).</p>
      ${codeBlock(`interface TransformParams {
  rotation: number;       // total in degrees
  flipH: boolean;
  flipV: boolean;
  scale: number;
  crop: { x: number; y: number; width: number; height: number };
  outputWidth: number;
  outputHeight: number;
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
    `,
  );
}

function renderExampleTransforms(): string {
  return examplePage(
    'Rotate / flip / zoom',
    'Drive rotation and scale from external controls or keyboard shortcuts.',
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

function renderExampleBleed(): string {
  return examplePage(
    'Print bleed margins',
    'Safe-area guides drawn inside the crop rectangle — useful for print-ready crops.',
    `
      <div class="demo-example-live">
        <sfx-crop
          id="ex-bleed"
          show-bleed-margin
          bleed-margin-size="16"
          bleed-margin-color="rgba(37, 99, 235, 0.65)"
          style="width:100%;height:480px;display:block"
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
      <div class="demo-example-grid">
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Mint</div>
          <sfx-crop class="ex-theme" data-accent="mint" style="--sfx-cr-primary:#16a34a;--sfx-cr-primary-hover:#15803d;--sfx-cr-primary-bg:#dcfce7;--sfx-cr-primary-glow:rgba(22,163,74,.22);height:320px;display:block"></sfx-crop>
        </div>
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Rose</div>
          <sfx-crop class="ex-theme" data-accent="rose" style="--sfx-cr-primary:#e11d48;--sfx-cr-primary-hover:#be123c;--sfx-cr-primary-bg:#ffe4e6;--sfx-cr-primary-glow:rgba(225,29,72,.22);height:320px;display:block"></sfx-crop>
        </div>
        <div class="demo-example-cell">
          <div class="demo-example-cell-label">Violet</div>
          <sfx-crop class="ex-theme" data-accent="violet" style="--sfx-cr-primary:#7c3aed;--sfx-cr-primary-hover:#6d28d9;--sfx-cr-primary-bg:#ede9fe;--sfx-cr-primary-glow:rgba(124,58,237,.22);height:320px;display:block"></sfx-crop>
        </div>
      </div>

      ${codeBlock(`sfx-crop.brand-mint {
  --sfx-cr-primary: #16a34a;
  --sfx-cr-primary-hover: #15803d;
  --sfx-cr-primary-bg: #dcfce7;
  --sfx-cr-primary-glow: rgba(22, 163, 74, 0.22);
}`, 'css')}
    `,
  );
}

function renderExampleConfigurator(): string {
  return examplePage(
    'Live configurator',
    'Toggle every option in real time and watch the generated snippet update.',
    `
      <div class="demo-configurator">
        <div class="demo-configurator-preview">
          <sfx-crop id="cfg-viewer" style="width:100%;height:520px;display:block"></sfx-crop>
        </div>
        <div class="demo-configurator-panel">
          <div class="demo-configurator-group">
            <h4>Crop</h4>
            <label>Shape
              <select id="cfg-crop-shape">
                <option value="free" selected>free</option>
                <option value="square">square</option>
                <option value="circle">circle</option>
                <option value="rounded-rect">rounded-rect</option>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="3:2">3:2</option>
                <option value="2:3">2:3</option>
                <option value="3:4">3:4</option>
                <option value="9:16">9:16</option>
              </select>
            </label>
            <label>Theme
              <select id="cfg-theme">
                <option value="light" selected>light</option>
                <option value="dark">dark</option>
              </select>
            </label>
            <label>Toolbar position
              <select id="cfg-toolbar-pos">
                <option value="bottom" selected>bottom</option>
                <option value="top">top</option>
              </select>
            </label>
          </div>
          <div class="demo-configurator-group">
            <h4>Visibility</h4>
            <label class="demo-toggle"><input type="checkbox" id="cfg-grid" checked> <span>Grid</span></label>
            <label class="demo-toggle"><input type="checkbox" id="cfg-toolbar" checked> <span>Toolbar</span></label>
            <label class="demo-toggle"><input type="checkbox" id="cfg-rotate-slider" checked> <span>Rotate slider</span></label>
            <label class="demo-toggle"><input type="checkbox" id="cfg-zoom-slider" checked> <span>Zoom slider</span></label>
            <label class="demo-toggle"><input type="checkbox" id="cfg-shape-selector" checked> <span>Shape selector</span></label>
            <label class="demo-toggle"><input type="checkbox" id="cfg-rotate-btn" checked> <span>Rotate button</span></label>
            <label class="demo-toggle"><input type="checkbox" id="cfg-flip-btn" checked> <span>Flip button</span></label>
          </div>
          <div class="demo-configurator-group">
            <h4>Behaviour</h4>
            <label class="demo-toggle"><input type="checkbox" id="cfg-keyboard" checked> <span>Keyboard</span></label>
            <label class="demo-toggle"><input type="checkbox" id="cfg-wheel-zoom" checked> <span>Wheel zoom</span></label>
            <label class="demo-toggle"><input type="checkbox" id="cfg-bleed"> <span>Bleed margins</span></label>
          </div>
        </div>
      </div>

      <h2>Generated code</h2>
      <div class="demo-code-wrap"><pre><code id="cfg-code" class="language-markup"></code></pre>
        <button class="demo-copy-btn" data-copy-target="cfg-code" aria-label="Copy to clipboard">${ICONS.copy}</button>
      </div>
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

function hydrateExampleTransforms(root: HTMLElement): void {
  const el = root.querySelector('#ex-tx') as SfxCropElement | null;
  if (!el) return;
  el.src = DEMO_SRC;
  el.showGrid = 'interaction';
  root.querySelector('#ex-rl')?.addEventListener('click', () => el.rotateLeft());
  root.querySelector('#ex-fh')?.addEventListener('click', () => el.flipHorizontal());
  root.querySelector('#ex-reset')?.addEventListener('click', () => el.reset());
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

function hydrateExampleBleed(root: HTMLElement): void {
  const el = root.querySelector('#ex-bleed') as SfxCropElement | null;
  if (el) { el.src = DEMO_SRC; el.showGrid = true; el.theme = 'light'; }
}

function hydrateExampleTheming(root: HTMLElement): void {
  for (const el of root.querySelectorAll<SfxCropElement>('.ex-theme')) {
    el.src = DEMO_SRC;
    el.showToolbar = false;
    el.showZoomSlider = false;
    el.keyboard = false;
    el.wheelZoom = false;
    el.theme = 'light';
  }
}

function hydrateExampleConfigurator(root: HTMLElement): void {
  const viewer = root.querySelector('#cfg-viewer') as SfxCropElement | null;
  if (!viewer) return;
  viewer.src = DEMO_SRC;

  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  const cfgShape   = q<HTMLSelectElement>('#cfg-crop-shape');
  const cfgTheme   = q<HTMLSelectElement>('#cfg-theme');
  const cfgPos     = q<HTMLSelectElement>('#cfg-toolbar-pos');
  const cfgGrid    = q<HTMLInputElement>('#cfg-grid');
  const cfgToolbar = q<HTMLInputElement>('#cfg-toolbar');
  const cfgRotSl   = q<HTMLInputElement>('#cfg-rotate-slider');
  const cfgZoomSl  = q<HTMLInputElement>('#cfg-zoom-slider');
  const cfgShapeS  = q<HTMLInputElement>('#cfg-shape-selector');
  const cfgRotBtn  = q<HTMLInputElement>('#cfg-rotate-btn');
  const cfgFlipBtn = q<HTMLInputElement>('#cfg-flip-btn');
  const cfgKb      = q<HTMLInputElement>('#cfg-keyboard');
  const cfgWheel   = q<HTMLInputElement>('#cfg-wheel-zoom');
  const cfgBleed   = q<HTMLInputElement>('#cfg-bleed');
  const codeEl     = q<HTMLElement>('#cfg-code');

  function apply(): void {
    viewer!.cropShape = cfgShape.value as CropShapeName;
    viewer!.theme = cfgTheme.value as 'light' | 'dark';
    viewer!.toolbarPosition = cfgPos.value as 'top' | 'bottom';
    viewer!.showGrid = cfgGrid.checked;
    viewer!.showToolbar = cfgToolbar.checked;
    viewer!.showRotateSlider = cfgRotSl.checked;
    viewer!.showZoomSlider = cfgZoomSl.checked;
    viewer!.showShapeSelector = cfgShapeS.checked;
    viewer!.showRotateButton = cfgRotBtn.checked;
    viewer!.showFlipButton = cfgFlipBtn.checked;
    viewer!.keyboard = cfgKb.checked;
    viewer!.wheelZoom = cfgWheel.checked;
    viewer!.showBleedMargin = cfgBleed.checked;

    const attrs: string[] = [`  src="/photo.jpg"`];
    if (cfgShape.value !== 'free') attrs.push(`  crop-shape="${cfgShape.value}"`);
    if (cfgTheme.value !== 'dark') attrs.push(`  theme="${cfgTheme.value}"`);
    if (cfgPos.value !== 'bottom') attrs.push(`  toolbar-position="${cfgPos.value}"`);
    if (!cfgGrid.checked) attrs.push(`  show-grid="false"`);
    if (!cfgToolbar.checked) attrs.push(`  show-toolbar="false"`);
    if (!cfgRotSl.checked) attrs.push(`  show-rotate-slider="false"`);
    if (!cfgZoomSl.checked) attrs.push(`  show-zoom-slider="false"`);
    if (!cfgShapeS.checked) attrs.push(`  show-shape-selector="false"`);
    if (!cfgRotBtn.checked) attrs.push(`  show-rotate-button="false"`);
    if (!cfgFlipBtn.checked) attrs.push(`  show-flip-button="false"`);
    if (!cfgKb.checked) attrs.push(`  keyboard="false"`);
    if (!cfgWheel.checked) attrs.push(`  wheel-zoom="false"`);
    if (cfgBleed.checked) attrs.push(`  show-bleed-margin`);
    codeEl.textContent = `<sfx-crop\n${attrs.join('\n')}\n></sfx-crop>`;
    window.Prism?.highlightElement(codeEl);
  }

  const toggles: HTMLElement[] = [
    cfgShape, cfgTheme, cfgPos,
    cfgGrid, cfgToolbar, cfgRotSl, cfgZoomSl, cfgShapeS,
    cfgRotBtn, cfgFlipBtn, cfgKb, cfgWheel, cfgBleed,
  ];
  for (const t of toggles) t.addEventListener('change', apply);
  apply();
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

  '/examples/basic':          { render: renderExampleBasic,        hydrate: hydrateExampleBasic },
  '/examples/shapes':         { render: renderExampleShapes,       hydrate: hydrateExampleShapes },
  '/examples/transforms':     { render: renderExampleTransforms,   hydrate: hydrateExampleTransforms },
  '/examples/events':         { render: renderExampleEvents,       hydrate: hydrateExampleEvents },
  '/examples/export':         { render: renderExampleExport,       hydrate: hydrateExampleExport },
  '/examples/bleed-margin':   { render: renderExampleBleed,        hydrate: hydrateExampleBleed },
  '/examples/theming':        { render: renderExampleTheming,      hydrate: hydrateExampleTheming },
  '/examples/react':          { render: renderExampleReact },
  '/examples/configurator':   { render: renderExampleConfigurator, hydrate: hydrateExampleConfigurator },
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

function renderShell(path: string, pageHtml: string): string {
  const layout = layoutFor(path);
  const sidebar = renderSidebar(path);
  return `
    ${renderHeader(path)}
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

function navigate(): void {
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

  // Mobile sidebar toggle
  document.getElementById('demo-burger')?.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
  });
}

window.addEventListener('hashchange', navigate);
document.addEventListener('DOMContentLoaded', navigate);
// Fire immediately if DOM already loaded (Vite HMR)
if (document.readyState !== 'loading') navigate();
