// Optional full-route browser check. Requires Playwright and a local Vite server.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.STORY_TEST_BROWSER || 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(90000);
await page.route('**/src/main.js*', async route => {
  const response = await route.fetch();
  await route.fulfill({ response, body: await response.text() + '\nwindow.__campaignTest = { get game() { return activeGame; } };' });
});

try {
  await page.goto(process.env.STORY_TEST_URL || 'http://127.0.0.1:5183/');
  await page.locator('#titleStartButton').click();
  await page.locator('[data-action="skip"]').click();
  await page.locator('[data-character="akame"]').click();
  await page.locator('#characterConfirm').click();

  for (let stage = 1; stage <= 5; stage++) {
    const heading = await page.locator('.story-header h2').textContent();
    assert.ok(heading, `Missing chapter ${stage} briefing`);
    await page.locator('[data-action="skip"]').click();
    await page.waitForFunction(() => window.__campaignTest.game?.state === 'playing');
    await page.locator('#hud').waitFor({ state: 'visible' });
    await page.locator('#clock').waitFor({ state: 'visible' });
    const runtime = await page.evaluate(() => ({ stageId: window.__campaignTest.game.stageId, water: window.__campaignTest.game.isWaterStage }));
    assert.equal(runtime.stageId, stage);
    assert.equal(runtime.water, stage === 2 || stage === 4);
    assert.match(await page.locator('#chapterObjective').textContent(), new RegExp(`第${stage}章`));
    await page.keyboard.press('F3');
    await page.locator('#debugStageSelect').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-stage-id]').count(), 5);
    await page.locator('#debugSkipBattle').click();
    console.log(`Skipped battle ${stage}`);
    await page.locator('.story-player').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.story-header .story-chapter').textContent(), stage === 5 ? 'ENDING' : `CHAPTER 0${stage} — AFTER`);
    await page.locator('[data-action="skip"]').click();
    await page.locator('#result').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#resultTitle').textContent(), stage === 5 ? 'THE END' : `第${stage}章 完`);
    if (stage < 5) await page.locator('#nextStageButton').click();
  }

  assert.equal(await page.locator('#nextStageButton').isVisible(), false);
  await page.locator('#restartButton').click();
  await page.waitForFunction(() => window.__campaignTest !== undefined);
  await page.locator('#titleStartButton').click();
  await page.locator('[data-action="skip"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('F3');
  await page.locator('[data-stage-id="5"]').click();
  await page.locator('#characterConfirm').click();
  assert.equal(await page.locator('.story-header h2').textContent(), '防除線の向こう側');
  assert.deepEqual(errors, []);
  console.log('PASS: F3 battle skips, five chapter transitions, ending, and mobile chapter jump');
} finally {
  await browser.close();
}
