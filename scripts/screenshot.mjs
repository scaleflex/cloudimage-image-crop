// Headless screenshot via CDP.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as wait } from 'node:timers/promises';
import http from 'node:http';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9224;
const URL = process.argv[2] || 'http://localhost:5175/image-crop/';
const OUT = process.argv[3] || 'scripts/home-screenshot.png';

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
  { stdio: ['ignore', 'ignore', 'ignore'] },
);

function httpJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: PORT, path, method: 'GET' }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitFor(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { return await httpJson('/json/version'); } catch {}
    await wait(250);
  }
  throw new Error('chrome never opened debug port');
}

await waitFor();
const tabs = await httpJson('/json');
const page = tabs.find((t) => t.type === 'page');
const WS = (await import('ws')).default;
const ws = new WS(page.webSocketDebuggerUrl);
await once(ws, 'open');

let msgId = 0;
const pending = new Map();
ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  }
});

function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: URL });
await wait(6000);

// Scroll to the live demo section so the crop editor is in the viewport.
await send('Runtime.evaluate', {
  expression: "document.querySelector('cloudimage-crop')?.scrollIntoView({ block: 'center' })",
});
await wait(1000);

// Open the tilt/rotate popover so the ruler is visible in the screenshot.
await send('Runtime.evaluate', {
  expression: `
    (() => {
      const crop = document.querySelector('cloudimage-crop');
      const toolbar = crop?.shadowRoot?.querySelector('cloudimage-crop-toolbar');
      const rotate = toolbar?.shadowRoot?.querySelector('cloudimage-crop-rotate');
      const trigger = rotate?.shadowRoot?.querySelector('.ci-crop-rotate-trigger');
      trigger?.click();
    })();
  `,
});
await wait(500);

const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
writeFileSync(OUT, Buffer.from(r.data, 'base64'));
console.log('wrote', OUT);

ws.close();
child.kill();
