// Optional integration check: uses an installed Playwright and local dev server.
// State access is injected only into intercepted test responses, never into the app.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { PROLOGUE } from '../src/story-data.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.STORY_TEST_BROWSER || 'msedge' });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const baseURL = process.env.STORY_TEST_URL || 'http://127.0.0.1:5183';
await mkdir('tmp/story-check', { recursive: true });
const errors = [];

async function newPage() {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/src/main.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nwindow.__storyTest = { get game() { return activeGame; }, story: storyPlayer, input: appInput, Config };' });
  });
  await page.addInitScript(() => {
    window.__padButtons = [];
    window.__padAxes = [0, 0];
    window.__padConnected = false;
    Object.defineProperty(navigator, 'getGamepads', { value: () => [{
      connected: window.__padConnected, id: 'Story test controller', axes: window.__padAxes,
      buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: window.__padButtons.includes(i), value: window.__padButtons.includes(i) ? 1 : 0 }))
    }] });
  });
  await page.goto(baseURL);
  await page.locator('#titleStartButton').click();
  return page;
}

async function pad(page, button, keepConnected = false) {
  await page.evaluate(index => { window.__padConnected = true; window.__padButtons = [index]; }, button);
  await page.waitForTimeout(120);
  await page.evaluate(() => { window.__padButtons = []; });
  await page.waitForTimeout(120);
  if (!keepConnected) {
    await page.evaluate(() => { window.__padConnected = false; });
    await page.waitForTimeout(60);
  }
}

async function startBattle(page, id, stage = 1) {
  await page.locator('[data-action="skip"]').click();
  if (stage === 2) {
    await page.keyboard.press('F3');
    await page.locator('[data-stage-id="2"]').click();
  }
  await page.locator(`[data-character="${id}"]`).click();
  assert.equal(await page.locator('#characterConfirm').isVisible(), true);
  await page.locator('#characterConfirm').click();
  assert.match(await page.locator('.story-header h2').textContent(), stage === 1 ? /守る順番/ : /水底に残るもの/);
  await page.locator('[data-action="skip"]').click();
  await page.waitForFunction(() => window.__storyTest.game?.state === 'playing', null, { timeout: 45000 });
  assert.equal(await page.locator('#game').evaluate(el => el.inert), false);
}

async function win(page) {
  await page.evaluate(() => {
    const { game } = window.__storyTest;
    if (!game.motherEgg) game.spawnMotherEgg();
    game.motherEgg.takeDamage(game.motherEgg.maxHp + 1, 'burst');
  });
}

try {
  const page = await newPage();
  assert.equal(await page.locator('.story-count').textContent(), `01 / ${String(PROLOGUE.lines.length).padStart(2, '0')}`);
  assert.equal(await page.locator('[data-action="back"]').isDisabled(), true);
  await page.evaluate(() => { window.__padConnected = true; });
  await page.waitForFunction(() => document.documentElement.dataset.inputMode === 'gamepad');
  assert.equal(await page.locator('.story-player .menu-cursor').count(), 1);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__storyTest.story.index), 0, 'Keyboard must not advance story while controller is connected');
  await page.evaluate(() => { window.__padConnected = false; });
  await page.waitForFunction(() => document.documentElement.dataset.inputMode === 'keyboard');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__storyTest.story.index), 1);
  await page.locator('[data-action="back"]').click();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'log');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.story-log-entries p').count(), 2); // Back does not erase read history.
  await pad(page, 1);
  assert.equal(await page.locator('.story-log').isVisible(), false);
  await pad(page, 0);
  assert.equal(await page.evaluate(() => window.__storyTest.story.index), 1);
  await page.locator('[data-action="auto"]').click();
  await page.waitForFunction(() => window.__storyTest.story.index >= 2);
  await page.locator('[data-action="auto"]').click();

  // Typewriter: first click reveals; second advances.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { window.__storyTest.story.index = 0; window.__storyTest.story.render(); });
  await page.locator('.story-advance').click();
  assert.equal(await page.evaluate(() => window.__storyTest.story.index), 0);
  assert.equal(await page.locator('.story-player').evaluate(el => el.classList.contains('is-complete')), true);
  await page.locator('.story-advance').click();
  assert.equal(await page.evaluate(() => window.__storyTest.story.index), 1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-action="skip"]').click();
  for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(size);
    await page.locator('#characterConfirm').scrollIntoViewIfNeeded();
    const layout = await page.evaluate(() => {
      const panel = document.querySelector('.select-panel');
      const cards = [...document.querySelectorAll('.character-card')];
      return { panelRight: panel.getBoundingClientRect().right,
        cardLeft: Math.min(...cards.map(card => card.getBoundingClientRect().left)),
        cardRight: Math.max(...cards.map(card => card.getBoundingClientRect().right)) };
    });
    assert.ok(layout.cardLeft >= 0 && layout.cardRight <= size.width && layout.panelRight <= size.width + 1, `Character overflow at ${size.width}x${size.height}`);
    await page.screenshot({ path: `tmp/story-check/select-${size.width}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('[data-character="tsukimi"]').focus();
  await pad(page, 15, true);
  assert.equal(await page.locator('[data-character="akame"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.character-card.selected').count(), 1);
  assert.equal(await page.locator('.menu-cursor').count(), 1);
  assert.equal(await page.locator('[data-character="akame"]').evaluate(button => button.classList.contains('menu-cursor')), true);
  await pad(page, 14, true);
  assert.equal(await page.locator('[data-character="tsukimi"]').getAttribute('aria-pressed'), 'true');
  await pad(page, 0, true); // First Cross selects the character.
  assert.match(await page.locator('#characterSelectionSummary').textContent(), /ツキミ/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'characterConfirm');
  assert.equal(await page.locator('.story-player').isVisible(), false);
  await pad(page, 0); // Second Cross starts the briefing.
  assert.equal(await page.locator('.story-actor').count(), 3);
  await page.evaluate(() => { const story = window.__storyTest.story; story.index = 1; story.render(); });
  const facing = await page.evaluate(() => {
    const actors = [...document.querySelectorAll('.story-actor.is-visible')];
    return actors.map(actor => ({ id: actor.dataset.actor, side: actor.dataset.side,
      xScale: Number(getComputedStyle(actor).transform.match(/^matrix\(([^,]+)/)?.[1]) }));
  });
  assert.equal(facing.length, 2);
  assert.deepEqual(facing.map(actor => actor.side).sort(), ['left', 'right']);
  assert.ok(facing.find(actor => actor.side === 'left').xScale > 0);
  assert.ok(facing.find(actor => actor.side === 'right').xScale < 0);

  // Check every briefing/aftermath page at desktop, near-square, phone, and landscape sizes.
  for (const size of [{ width: 1280, height: 800 }, { width: 1270, height: 1136 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    const problems = await page.evaluate(async () => {
      const { story } = window.__storyTest;
      const { createAftermath } = await import('/src/story-data.js');
      const original = story.scene;
      const failures = [];
      for (const scene of [original, createAftermath('tsukimi')]) {
        story.scene = scene;
        for (let i = 0; i < scene.lines.length; i++) {
          story.index = i;
          story.render();
          const header = story.query('.story-header').getBoundingClientRect();
          const caption = story.query('.story-caption').getBoundingClientRect();
          const footer = story.query('.story-footer').getBoundingClientRect();
          const text = story.query('.story-text').getBoundingClientRect();
          const nav = story.query('.story-header nav').getBoundingClientRect();
          if (caption.top < header.bottom || caption.bottom > footer.top || text.right > innerWidth || text.left < 0 || nav.right > innerWidth || story.query('.story-caption').scrollHeight > story.query('.story-caption').clientHeight + 1) failures.push(`${scene.title} page ${i + 1}`);
        }
      }
      story.scene = original;
      story.index = 1;
      story.render();
      return failures;
    });
    assert.deepEqual(problems, [], `Text overlap at ${size.width}x${size.height}`);
    await page.waitForFunction(() => [...document.querySelectorAll('.story-actor')].every(img => img.complete && img.naturalWidth));
    await page.screenshot({ path: `tmp/story-check/briefing-${size.width}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { const s = window.__storyTest.story; s.index = 7; s.render(); });
  assert.equal(await page.locator('.story-speaker').textContent(), 'ミナリ');
  assert.equal(await page.locator('.story-player').evaluate(el => el.classList.contains('is-npc')), true);
  await page.screenshot({ path: 'tmp/story-check/minari.png' });
  await page.locator('[data-action="skip"]').click();
  await page.waitForFunction(() => window.__storyTest.game?.state === 'playing', null, { timeout: 45000 });
  assert.match(await page.locator('#clock').textContent(), /^(?:05:00|4:5\d)$/);
  assert.equal(await page.evaluate(() => window.__storyTest.Config.map.playSeconds), 300);
  assert.equal(await page.evaluate(() => window.__storyTest.Config.map.motherSpawnSeconds), 240);
  assert.equal(await page.evaluate(() => typeof window.__storyTest.game.player.tryMelee), 'undefined');
  await page.evaluate(() => { window.__padConnected = true; });
  await page.waitForFunction(() => document.documentElement.dataset.inputMode === 'gamepad');
  await page.keyboard.down('Escape');
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'playing', 'Keyboard pause must be blocked while controller is connected');
  await page.keyboard.up('Escape');
  await page.keyboard.down('KeyW');
  assert.equal(await page.evaluate(() => window.__storyTest.input.down('KeyW')), false);
  await page.keyboard.up('KeyW');
  await page.evaluate(() => { window.__padConnected = false; });
  await page.waitForFunction(() => document.documentElement.dataset.inputMode === 'keyboard');
  await page.evaluate(() => { window.__storyTest.game.elapsed = 240; });
  await page.waitForFunction(() => window.__storyTest.game.motherEgg !== null);
  assert.equal(await page.evaluate(() => window.__storyTest.game.motherEgg !== null), true);
  await page.keyboard.down('Escape');
  await page.waitForFunction(() => window.__storyTest.game.state === 'paused');
  await page.keyboard.up('Escape');
  await page.locator('#pause').waitFor({ state: 'visible' });
  assert.match(await page.locator('#pause').textContent(), /人間形態.*MPを回復/s);
  assert.match(await page.locator('#pause').textContent(), /鳥形態.*卵を壊す/s);
  const pausedAt = await page.evaluate(() => window.__storyTest.game.elapsed);
  for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(size);
    await page.locator('#pauseResumeButton').scrollIntoViewIfNeeded();
    const bounds = await page.locator('.pause-panel').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= size.width, `Pause overflow at ${size.width}x${size.height}`);
    await page.screenshot({ path: `tmp/story-check/pause-${size.width}.png` });
  }
  assert.equal(await page.evaluate(() => window.__storyTest.game.elapsed), pausedAt);
  await page.locator('#pauseResumeButton').click();
  await page.waitForFunction(() => window.__storyTest.game.state === 'playing');
  await pad(page, 9, true); // OPTIONS opens the guide.
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'paused');
  assert.equal(await page.locator('#pause .menu-cursor').count(), 1);
  await pad(page, 0); // Cross activates the resume button.
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'playing');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => window.__storyTest.game.showLevelUp());
  assert.equal(await page.locator('#upgradeChoices button').count(), 3);
  await page.evaluate(() => { window.__padConnected = true; });
  await page.waitForFunction(() => document.documentElement.dataset.inputMode === 'gamepad');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'levelup', 'Keyboard must not pick an upgrade while controller is connected');
  await page.evaluate(() => { window.__padConnected = false; });
  await page.waitForFunction(() => document.documentElement.dataset.inputMode === 'keyboard');
  for (const size of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(size);
    await page.locator('#upgradeChoices button').last().scrollIntoViewIfNeeded();
    const bounds = await page.locator('#upgradeChoices button').last().boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= size.width, `Upgrade overflow at ${size.width}x${size.height}`);
    await page.screenshot({ path: `tmp/story-check/levelup-${size.width}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('#upgradeChoices button')), true);
  assert.equal(await page.locator('#upgradeChoices button').first().evaluate(button => getComputedStyle(button).outlineWidth), '3px');
  await pad(page, 13, true); // D-pad down must move even when choices are laid out horizontally.
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelectorAll('#upgradeChoices button')[1]), true);
  assert.equal(await page.locator('.menu-cursor').count(), 1);
  await pad(page, 0); // Cross confirms the focused upgrade.
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'playing');
  assert.equal(await page.locator('#levelUp').isVisible(), false);
  await page.evaluate(() => window.__storyTest.game.showLevelUp());
  await page.evaluate(() => { window.__padConnected = true; window.__padAxes = [0, 0.9]; });
  await page.waitForFunction(() => document.activeElement === document.querySelectorAll('#upgradeChoices button')[2], null, { timeout: 3000 });
  await page.evaluate(() => { window.__padAxes = [0, 0]; window.__padConnected = false; });
  await page.waitForTimeout(120);
  await pad(page, 0);
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'playing');
  await page.evaluate(() => { window.__padConnected = true; window.__padAxes = [0, 0.9]; });
  await page.waitForTimeout(120); // Movement stick is already held when leveling up.
  await page.evaluate(() => window.__storyTest.game.showLevelUp());
  await page.waitForFunction(() => document.activeElement === document.querySelectorAll('#upgradeChoices button')[1]);
  await page.screenshot({ path: 'tmp/story-check/levelup-focus.png' });
  await page.evaluate(() => { window.__padAxes = [0, 0]; window.__padConnected = false; });
  await page.waitForTimeout(120);
  await pad(page, 0);
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'playing');
  await win(page);
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'story');
  assert.equal(await page.locator('#result').isVisible(), false);
  const frozen = await page.evaluate(() => ({ elapsed: window.__storyTest.game.elapsed, hp: window.__storyTest.game.player.hp }));
  await page.keyboard.press('Escape');
  await page.keyboard.press('q');
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(() => ({ elapsed: window.__storyTest.game.elapsed, hp: window.__storyTest.game.player.hp })), frozen);
  await pad(page, 0);
  assert.equal(await page.evaluate(() => window.__storyTest.story.index), 1);
  await page.locator('[data-action="log"]').click();
  await pad(page, 1);
  assert.equal(await page.locator('.story-log').isVisible(), false);
  await page.evaluate(() => window.__storyTest.game.finish(false, 'duplicate finish'));
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'story');
  // Finish naturally, not just through SKIP.
  await page.evaluate(() => { const s = window.__storyTest.story; while (s.active) s.next(); });
  assert.equal(await page.locator('#resultTitle').textContent(), '第1章 完');
  assert.equal(await page.evaluate(() => window.__storyTest.game.stageId), 1);
  assert.equal(await page.locator('#debugStageSelect').isVisible(), false);
  assert.equal(await page.locator('#game').evaluate(el => el.inert), false);
  await page.screenshot({ path: 'tmp/story-check/result.png' });
  await page.locator('#replayStoryButton').click();
  assert.equal(await page.evaluate(() => window.__storyTest.story.index), 0);
  await page.locator('[data-action="skip"]').click();
  assert.equal(await page.evaluate(() => window.__storyTest.game.state), 'result');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'restartButton');
  await page.locator('#restartButton').click();
  await page.locator('#titleStartButton').waitFor({ state: 'visible' });
  await page.close();
  console.log('PASS: story controls, layout, NPC display, victory, frozen gameplay, replay, title return');

  for (const scenario of [
    { id: 'akame', stage: 1, outcome: 'victory' },
    { id: 'kiichigo', stage: 1, outcome: 'death' },
    { id: 'kiichigo', stage: 1, outcome: 'timeout' },
    { id: 'tsukimi', stage: 2, outcome: 'victory' }
  ]) {
    const other = await newPage();
    await startBattle(other, scenario.id, scenario.stage);
    if (scenario.outcome === 'victory') await win(other);
    else await other.evaluate(outcome => {
      const { game, Config } = window.__storyTest;
      if (outcome === 'death') {
        game.player.takeDamage(game.player.maxHp + 1, { ignoreInvincibility: true });
        game.deathTimer = 0.01;
      } else game.elapsed = Config.map.playSeconds;
    }, scenario.outcome);
    if (scenario.stage === 1 && scenario.outcome === 'victory') {
      await other.waitForFunction(() => window.__storyTest.game.state === 'story');
      await other.keyboard.press('Enter');
      assert.equal(await other.locator('.story-speaker').textContent(), 'アカメ');
      await other.locator('[data-action="skip"]').click();
    } else {
      await other.locator('#result').waitFor({ state: 'visible' });
      assert.equal(await other.locator('.story-player').isVisible(), false);
      assert.equal(await other.locator('#replayStoryButton').isVisible(), false);
      assert.equal(await other.locator('#resultTitle').textContent(), scenario.outcome === 'victory' ? 'AREA RESTORED' : 'Defeat');
    }
    await other.close();
    console.log(`PASS: ${scenario.id} / stage ${scenario.stage} / ${scenario.outcome}`);
  }
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('All story integration checks passed. Screenshots: tmp/story-check/');
} finally {
  await browser.close();
}
