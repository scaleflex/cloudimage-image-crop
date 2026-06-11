// Headless probe: fetch demo.ts from dev server, execute in jsdom,
// trigger navigate(), then inspect #home-viewer.src and any console errors.
import { JSDOM, VirtualConsole } from 'jsdom';

const SERVER = 'http://localhost:5173';
const BASE = '/image-crop/';

const vc = new VirtualConsole();
const logs = [];
vc.on('error',   (e) => logs.push(['error', e?.stack || e?.message || String(e)]));
vc.on('warn',    (...a) => logs.push(['warn',  a.map(String).join(' ')]));
vc.on('log',     (...a) => logs.push(['log',   a.map(String).join(' ')]));
vc.on('jsdomError', (e) => logs.push(['jsdom', e?.stack || e?.message || String(e)]));

const html = await (await fetch(`${SERVER}${BASE}`)).text();

const dom = new JSDOM(html, {
  url: `${SERVER}${BASE}`,
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
});

// Wait for scripts to execute
await new Promise((r) => setTimeout(r, 5000));

const win = dom.window;
const doc = win.document;
const viewer = doc.querySelector('#home-viewer');
const hasCE = typeof win.customElements?.get === 'function';
const defined = hasCE ? win.customElements.get('sfx-crop') : null;

console.log('--- DOM snapshot ---');
console.log('viewer tag    :', viewer?.tagName);
console.log('viewer src    :', viewer?.src || viewer?.getAttribute?.('src'));
console.log('viewer constr :', viewer?.constructor?.name);
console.log('sfx-crop def  :', defined?.name || '(undefined)');
console.log('appHTML.len   :', doc.getElementById('app')?.innerHTML.length);

console.log('--- Logs (' + logs.length + ') ---');
for (const [lvl, msg] of logs.slice(0, 30)) {
  console.log(`[${lvl}] ${msg.slice(0, 400)}`);
}

dom.window.close();
