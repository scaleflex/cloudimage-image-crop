// Probe the live demo via Chrome's remote debugging protocol.
// Captures console, network errors, and canvas pixel statistics.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as wait } from 'node:timers/promises';
import http from 'node:http';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const URL = process.argv[2] || 'http://localhost:5175/js-cloudimage-crop/#/examples/basic';

const child = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-web-security',
    '--hide-scrollbars',
    '--window-size=1920,1080',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'ignore'], detached: false },
);

function httpJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: PORT, path, method: 'GET' }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForDebugger(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { return await httpJson('/json/version'); } catch {}
    await wait(250);
  }
  throw new Error('chrome never opened debug port');
}

await waitForDebugger();
const tabs = await httpJson('/json');
const page = tabs.find((t) => t.type === 'page');
if (!page) throw new Error('no page tab');

const WS = (await import('ws')).default;
const ws = new WS(page.webSocketDebuggerUrl);
await once(ws, 'open');

let msgId = 0;
const pending = new Map();
const logs = [];

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    logs.push(['console.' + msg.params.type, msg.params.args.map((a) => a.value ?? a.description ?? JSON.stringify(a)).join(' ')]);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const ex = msg.params.exceptionDetails;
    logs.push(['exception', (ex.exception?.description || ex.text || '') + ' @ ' + (ex.url || '')]);
  } else if (msg.method === 'Log.entryAdded') {
    logs.push(['log.' + msg.params.entry.level, msg.params.entry.text]);
  }
});

function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Page.navigate', { url: URL });
await wait(4000); // let dev server + Lit + <sfx-crop> settle, load image
await send('Page.navigate', { url: URL }); // force re-apply hash
await wait(4000);

const exec = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });

const probe = await exec(`
  (async () => {
    const host = document.querySelector('sfx-crop');
    if (!host) return { hostFound: false };
    const out = {
      hostFound: true,
      hostRect: host.getBoundingClientRect().toJSON(),
      shadowHas: !!host.shadowRoot,
    };
    const canvasHost = host.shadowRoot?.querySelector('sfx-crop-canvas');
    const canvas = canvasHost?.shadowRoot?.querySelector('canvas');
    if (canvas) {
      out.canvasW = canvas.width;
      out.canvasH = canvas.height;
      out.canvasStyle = canvas.style.cssText;
      out.canvasRect = canvas.getBoundingClientRect().toJSON();
      out.parentElementTag = canvas.parentElement?.tagName ?? null;
      out.parentNodeType = canvas.parentNode?.nodeType ?? null;
      // Sample some pixels to see if anything was drawn
      try {
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          const img = ctx.getImageData(
            Math.floor(canvas.width / 2),
            Math.floor(canvas.height / 2),
            1,
            1,
          );
          out.centerPixel = Array.from(img.data);
          const edge = ctx.getImageData(2, 2, 1, 1);
          out.edgePixel = Array.from(edge.data);
        } else out.pixelsSkipped = true;
      } catch (e) {
        out.pixelError = String(e);
      }
    } else {
      out.noCanvas = true;
    }
    out.toolbar = !!host.shadowRoot?.querySelector('sfx-crop-toolbar');
    out.zoomSlider = !!host.shadowRoot?.querySelector('sfx-crop-zoom');

    // Theme + computed CSS
    out.hostTheme = host.getAttribute('theme');
    out.hostCanvasBgVar = getComputedStyle(host).getPropertyValue('--sfx-cr-canvas-bg').trim();
    if (canvasHost) {
      out.canvasHostBg = getComputedStyle(canvasHost).backgroundColor;
      out.canvasHostCSSVar = getComputedStyle(canvasHost).getPropertyValue('--sfx-cr-canvas-bg').trim();
    }
    const container = host.shadowRoot?.querySelector('.sfx-cr-container');
    if (container) out.containerBg = getComputedStyle(container).backgroundColor;

    const parent = host.parentElement;
    if (parent) {
      out.parentTag = parent.tagName + '.' + (parent.className || '');
      out.parentClientW = parent.clientWidth;
      out.parentClientH = parent.clientHeight;
      out.parentRect = parent.getBoundingClientRect().toJSON();
    }
    out.hostStyleInline = host.getAttribute('style');
    out.hostInnerW = host.clientWidth;
    if (host.querySelector) {
      const img = { w: (host.__currentImage && host.__currentImage.naturalWidth) || null };
      out.imageInfo = img;
    }
    return out;
  })()
`);

console.log('--- probe ---');
console.log(JSON.stringify(probe.result.value, null, 2));

console.log('\n--- console logs (' + logs.length + ') ---');
for (const [lvl, m] of logs.slice(-30)) console.log('[' + lvl + '] ' + String(m).slice(0, 500));

ws.close();
child.kill();
