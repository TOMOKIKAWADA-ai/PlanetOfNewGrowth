// How heavy the moving portraits (B5-2, three <mesh-avatar> WebGL canvases) are on a phone-like setup (backlog B5-5).
// Opens the prologue conversation with AUTO on, on a 390×844 touch viewport with the CPU slowed down,
// once with Config.story.avatarPortraits as it is and once forced to false, and compares frame rate,
// long tasks, load time and memory. The app itself is not changed: config.js is rewritten only in the test response.
//
//   npm run dev -- --port 5183
//   PLAYWRIGHT_MODULE=.../playwright node scripts/check-avatar-weight.mjs [--cpu 4] [--seconds 8] [--modes on,off]
//   (built: npm run build && npx vite preview --port 5184, then STORY_TEST_URL=http://127.0.0.1:5184 ... --modes on,on)
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, list) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), list[index + 1]]);
  return pairs;
}, []));
const cpu = Number(args.cpu ?? 4);
const seconds = Number(args.seconds ?? 8);
// --modes on (e.g. for a built preview, where config.js is bundled and cannot be rewritten).
const modes = (args.modes ?? 'on,off,on,off').split(',').map(mode => mode === 'on');
const baseURL = process.env.STORY_TEST_URL || 'http://127.0.0.1:5183';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function measure(browser, avatars) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true
  });
  const page = await context.newPage();
  const warnings = [];
  page.on('console', message => { if (message.type() === 'warning' || message.type() === 'error') warnings.push(message.text().slice(0, 120)); });
  if (!avatars) {
    await page.route('**/src/config.js*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('avatarPortraits: true', 'avatarPortraits: false') });
    });
  }
  await page.addInitScript(() => {
    window.__longTasks = [];
    new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__longTasks.push(entry.duration); })
      .observe({ type: 'longtask', buffered: true });
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.goto(baseURL);
  const clickedAt = Date.now();
  await page.locator('#titleStartButton').click();
  await page.locator('.story-advance').waitFor({ state: 'visible' });
  let loadMs = null;
  if (avatars) {
    await page.waitForFunction(() => document.querySelectorAll('.story-actor-figure.has-avatar').length >= 3, null, { timeout: 60000 });
    loadMs = Date.now() - clickedAt;
  } else await page.waitForTimeout(1500);
  await page.locator('[data-action="auto"]').click();
  await page.waitForTimeout(500);
  const result = await page.evaluate(async duration => {
    window.__longTasks.length = 0;
    const gaps = [];
    let last = performance.now();
    const end = last + duration * 1000;
    await new Promise(resolve => {
      const frame = now => {
        gaps.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    gaps.shift();
    const sorted = [...gaps].sort((a, b) => a - b);
    return {
      fps: Math.round(gaps.length / duration * 10) / 10,
      frameP50: Math.round(sorted[Math.floor(sorted.length * 0.5)] * 10) / 10,
      frameP95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
      framesOver50ms: gaps.filter(gap => gap > 50).length,
      longTasks: window.__longTasks.length,
      longTaskMs: Math.round(window.__longTasks.reduce((sum, value) => sum + value, 0)),
      canvases: document.querySelectorAll('mesh-avatar').length,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
    };
  }, seconds);
  await mkdir('tmp/avatar-weight', { recursive: true });
  await page.screenshot({ path: `tmp/avatar-weight/${avatars ? 'on' : 'off'}.png` });
  await context.close();
  return { avatars, loadMs, ...result, warnings: [...new Set(warnings)] };
}

const browser = await chromium.launch({ headless: true, channel: process.env.STORY_TEST_BROWSER || 'msedge' });
const results = [];
try {
  for (const avatars of modes) {
    const result = await measure(browser, avatars);
    results.push(result);
    console.log(JSON.stringify(result));
  }
} finally {
  await browser.close();
}
await writeFile(`tmp/avatar-weight/result-cpu${cpu}-${new URL(baseURL).port}.json`, JSON.stringify({ date: new Date().toISOString(), cpu, seconds, results }, null, 2));
