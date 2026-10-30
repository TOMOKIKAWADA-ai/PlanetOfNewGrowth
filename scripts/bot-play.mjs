// Auto-play bot (backlog A1): plays the 4-minute stage in a real browser and writes metrics as JSON.
// Like check-story.mjs, state access is injected only into intercepted test responses, never into the app.
//
//   npm run dev -- --port 5183
//   node scripts/bot-play.mjs --runs 3 --character tsukimi --stage 1 --speed 4
//
// --record <dir> (backlog B6-1) plays in real time, saves a WebM per run to <dir> and an events JSON
// (mother egg, bursts, dives, shockwave dodges, mimic stuns) with offsets into the video, for scripts/promo/cut-highlights.mjs.
//
// Env: PLAYWRIGHT_MODULE (path to playwright), BOT_TEST_URL, BOT_TEST_BROWSER (default msedge).
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, index, list) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), list[index + 1]]);
  return pairs;
}, []));
const runs = Number(args.runs ?? 3);
const characterId = args.character ?? 'tsukimi';
const stageId = Number(args.stage ?? 1);
// Simulation steps of 1/30 s per animation frame. Only the simulated time is measured; FPS is the real rAF rate.
const speed = Number(args.speed ?? 4);
const seedBase = Number(args.seed ?? 1);
// --dodge 0 disables switching to bird form during the mother egg's shockwave warning (to compare with older runs).
const dodge = args.dodge !== '0';
const recordDir = args.record ?? null;
const baseURL = process.env.BOT_TEST_URL || 'http://127.0.0.1:5183';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Runs inside the page. Seeded Math.random keeps runs comparable; the bot reads game state and drives
// the same touch-input entry points the on-screen stick uses.
function installBot({ speed, seed, dodge, realtime }) {
  let state = seed >>> 0 || 1;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const { game, input, Config } = window.__botTest;
  const player = game.player;
  const stats = {
    samples: [], upgrades: [], damageTaken: 0, maxEggs: 0, maxEnemies: 0, birdSeconds: 0,
    transforms: 0, bursts: 0, frames: 0, realStart: performance.now(), motherSpawnedAt: null
  };
  stats.eggKills = {};
  stats.damageAfterMother = 0;
  stats.shockwaves = { fired: 0, reached: 0, dodged: 0, dodgeAttempts: 0 };
  const spawnMotherShockwave = game.spawnMotherShockwave;
  game.spawnMotherShockwave = function (...args) {
    stats.shockwaves.fired++;
    return spawnMotherShockwave.apply(this, args);
  };
  const playSfx = game.playSfx;
  game.playSfx = function (name, ...rest) {
    if (name === 'motherImpact') stats.shockwaves.reached++;
    return playSfx.call(this, name, ...rest);
  };
  const showMessage = game.showMessage;
  game.showMessage = function (text, ...rest) {
    if (typeof text === 'string' && text.includes('衝撃波無効')) {
      stats.shockwaves.dodged++;
      stats.events?.push({ type: 'shockwaveDodge', t: Math.round(game.elapsed * 10) / 10, video: Math.round(performance.now()) / 1000 });
    }
    return showMessage.call(this, text, ...rest);
  };
  const onEggDestroyed = game.onEggDestroyed;
  game.onEggDestroyed = function (egg, source) {
    if (!egg.isMother) stats.eggKills[source ?? 'other'] = (stats.eggKills[source ?? 'other'] ?? 0) + 1;
    return onEggDestroyed.call(this, egg, source);
  };
  // Offsets are from navigation start, which is close to where Playwright's video begins.
  stats.events = [];
  const mark = (type, extra = {}) => stats.events.push({
    type, t: Math.round(game.elapsed * 10) / 10, video: Math.round(performance.now()) / 1000, ...extra
  });
  const onPlayerStunned = game.onPlayerStunned;
  game.onPlayerStunned = function (...args) {
    mark('mimicStun');
    return onPlayerStunned.apply(this, args);
  };
  let lastDiveState = player.diveState;
  let lastHp = player.hp;
  let nextSample = 0;
  let pendingRelease = null;
  let lastWarningAt = -Infinity;

  const press = (action) => {
    input.pressTouchAction(action);
    pendingRelease = action;
  };

  function steer() {
    const p = player.position;
    let mx = 0;
    let mz = 0;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dx = p.x - enemy.position.x;
      const dz = p.z - enemy.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 81 || d2 < 1e-4) continue;
      const w = 1 / d2;
      mx += dx * w * 6;
      mz += dz * w * 6;
    }
    const mother = game.motherEgg && !game.motherEgg.dead ? game.motherEgg : null;
    let target = mother;
    if (!target) {
      let best = Infinity;
      for (const egg of game.eggs) {
        if (egg.dead) continue;
        const d2 = (egg.position.x - p.x) ** 2 + (egg.position.z - p.z) ** 2;
        if (d2 < best) { best = d2; target = egg; }
      }
    }
    if (target) {
      const dx = target.position.x - p.x;
      const dz = target.position.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      // Humans shoot from range, so hold distance from the mother egg; birds dive onto targets.
      // The floodgate mother: swim right up to it while submerged (fish bites), stand within shot range while stunned.
      const flood = mother?.floodgate;
      const desired = flood ? (flood.state === 'submerged' ? 0 : 4.5) : player.form === 'human' && mother ? 9 : 0;
      const pull = (d > desired ? 1 : -0.6) * (flood?.state === 'submerged' ? 3 : 1);
      mx += (dx / d) * pull;
      mz += (dz / d) * pull;
    }
    const radius = Math.hypot(p.x, p.z);
    const limit = Config.map.radius;
    if (radius > limit * 0.75) {
      mx -= (p.x / radius) * 1.5;
      mz -= (p.z / radius) * 1.5;
    }
    const len = Math.hypot(mx, mz);
    if (len > 1e-3) input.setTouchMovement(mx / len, mz / len);
    else input.setTouchMovement(0, 0);
  }

  function decide() {
    if (pendingRelease) {
      input.releaseTouchAction(pendingRelease);
      pendingRelease = null;
      return;
    }
    const nearbyEggs = game.eggs.filter(egg => !egg.dead
      && (egg.position.x - player.position.x) ** 2 + (egg.position.z - player.position.z) ** 2 < 225).length;
    const mother = game.motherEgg && !game.motherEgg.dead ? game.motherEgg : null;
    // Stay airborne until the released wave has finished travelling, not just through the warning.
    if (mother?.shockwaveState === 'warning') lastWarningAt = game.elapsed;
    const waveActive = mother?.shockwaveState === 'warning'
      || game.elapsed - lastWarningAt < Config.egg.motherShockwaveWarning + Config.egg.motherShockwaveDuration + 0.2;
    const shockwaveComing = dodge && waveActive
      && (mother.position.x - player.position.x) ** 2 + (mother.position.z - player.position.z) ** 2
        < (Config.egg.motherShockwaveRange + 2) ** 2;
    const flood = mother?.floodgate;
    const nearMother = mother && (mother.position.x - player.position.x) ** 2 + (mother.position.z - player.position.z) ** 2 < 49;
    if (player.form === 'human') {
      if (flood?.state === 'submerged' && nearMother && game.isWaterPosition(player.position) && player.mp > 8) {
        stats.transforms++;
        press('transform');
      } else if (shockwaveComing && player.mp > 5) {
        stats.transforms++;
        stats.shockwaves.dodgeAttempts++;
        press('transform');
      } else if (player.burst >= 100 && player.burstCooldownTimer <= 0) {
        stats.bursts++;
        mark('burst');
        press('burst');
      } else if (player.mp > player.maxMp * 0.7 && nearbyEggs >= 3) {
        stats.transforms++;
        press('transform');
      }
    } else if (player.form === 'fish' && flood?.state === 'surfaced') {
      press('transform');
    } else if (player.form === 'bird' && flood?.state === 'submerged' && nearMother && player.diveState === 'ready') {
      press('transform');
    } else if (player.mp < player.maxMp * 0.2 && player.diveState === 'ready' && !shockwaveComing) {
      press('transform');
    }
  }

  function tick(dt) {
    if (game.state === 'levelup') {
      const buttons = [...document.querySelectorAll('#upgradeChoices .upgrade, .upgrade')];
      if (buttons.length) {
        const pick = buttons[Math.floor(Math.random() * buttons.length)];
        stats.upgrades.push({ at: game.elapsed, level: player.level, title: pick.querySelector('b')?.textContent });
        pick.click();
      }
      return;
    }
    if (game.state !== 'playing') return;
    steer();
    decide();
    if (player.form !== 'human') stats.birdSeconds += dt;
    if (player.hp < lastHp) {
      stats.damageTaken += lastHp - player.hp;
      if (game.motherEgg) stats.damageAfterMother += lastHp - player.hp;
    }
    lastHp = player.hp;
    stats.maxEggs = Math.max(stats.maxEggs, game.eggs.length);
    stats.maxEnemies = Math.max(stats.maxEnemies, game.enemies.length);
    if (stats.motherSpawnedAt === null && game.motherEgg) {
      stats.motherSpawnedAt = game.elapsed;
      mark('motherSpawn');
    }
    if (player.diveState === 'dive' && lastDiveState !== 'dive') mark(player.diveTarget?.isMother ? 'motherDive' : 'dive');
    lastDiveState = player.diveState;
    if (game.elapsed >= nextSample) {
      stats.samples.push({
        t: Math.round(game.elapsed), hp: Math.round(player.hp), level: player.level,
        eggs: game.eggs.length, enemies: game.enemies.length, form: player.form,
        mother: game.motherEgg ? Math.round(Math.max(0, game.motherEgg.hp)) : null
      });
      nextSample += 10;
    }
  }

  const step = 1 / 30;
  let lastFrameAt = performance.now();
  game.frame = function frame() {
    const now = performance.now();
    // Real-time mode for recording: one step per frame, sized to the actual frame time.
    const dt = realtime ? Math.min(0.05, (now - lastFrameAt) / 1000) : step;
    lastFrameAt = now;
    for (let i = 0; i < (realtime ? 1 : speed) && !this.outcome; i++) {
      tick(dt);
      this.update(dt);
    }
    this.render();
    stats.frames++;
    requestAnimationFrame(() => this.frame());
  };
  window.__botStats = stats;
}

function summarize(game, stats) {
  const realSeconds = (performance.now() - stats.realStart) / 1000;
  return {
    victory: game.outcome?.victory ?? false,
    outcome: game.outcome?.body ?? null,
    endedAt: Math.round(game.elapsed * 10) / 10,
    diedAt: game.player.dead ? Math.round(game.elapsed * 10) / 10 : null,
    motherSpawnedAt: stats.motherSpawnedAt,
    motherKilledAt: game.outcome?.victory ? Math.round(game.elapsed * 10) / 10 : null,
    finalLevel: game.player.level,
    damageTaken: Math.round(stats.damageTaken),
    damageAfterMother: Math.round(stats.damageAfterMother),
    shockwaves: stats.shockwaves,
    eggKills: stats.eggKills,
    events: stats.events,
    mimicStuns: game.mimicStuns ?? 0,
    thirst: game.thirstStats ? { ...game.thirstStats, healed: Math.round(game.thirstStats.healed) } : null,
    pursuer: game.pursuerStats?.lays ? { ...game.pursuerStats } : null,
    footprints: game.footprintStats?.spawned ? { ...game.footprintStats } : null,
    floodgate: game.floodgateStats?.streams || game.floodgateStats?.bites ? { ...game.floodgateStats } : null,
    maxEggs: stats.maxEggs,
    maxEnemies: stats.maxEnemies,
    birdSeconds: Math.round(stats.birdSeconds),
    transforms: stats.transforms,
    bursts: stats.bursts,
    upgrades: stats.upgrades,
    realSeconds: Math.round(realSeconds),
    renderFps: Math.round(stats.frames / realSeconds * 10) / 10,
    samples: stats.samples
  };
}

await mkdir('tmp/bot', { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BOT_TEST_BROWSER || 'msedge' });
const results = [];
try {
  for (let run = 0; run < runs; run++) {
    const viewport = { width: 1280, height: 800 };
    const context = await browser.newContext({
      viewport, reducedMotion: 'reduce', ...(recordDir ? { recordVideo: { dir: recordDir, size: viewport } } : {})
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/src/main.js*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: await response.text() + '\nwindow.__botTest = { get game() { return activeGame; }, input: appInput, Config };' });
    });
    await page.goto(baseURL);
    await page.locator('#titleStartButton').click();
    await page.locator('[data-action="skip"]').click();
    if (stageId !== 1) {
      await page.keyboard.press('F2');
      await page.locator(`[data-stage-id="${stageId}"]`).click();
    }
    await page.locator(`[data-character="${characterId}"]`).click();
    await page.locator('#characterConfirm').click();
    await page.locator('[data-action="skip"]').click();
    if (await page.locator('#forecastStart').isVisible()) await page.locator('#forecastStart').click(); // 朝の孵化予報（Config.forecast.enabled）
    await page.waitForFunction(() => window.__botTest.game?.state === 'playing', null, { timeout: 60000 });
    await page.evaluate(installBot, { speed, seed: seedBase + run, dodge, realtime: Boolean(recordDir) });
    await page.waitForFunction(() => Boolean(window.__botTest.game.outcome), null, { timeout: 15 * 60 * 1000, polling: 1000 });
    const result = await page.evaluate(summarize.toString().replace(/^function summarize/, '(function') + ')(window.__botTest.game, window.__botStats)');
    result.run = run + 1;
    result.seed = seedBase + run;
    result.errors = errors;
    results.push(result);
    console.log(`run ${run + 1}: ${result.victory ? 'WIN' : 'LOSE'} at ${result.endedAt}s, level ${result.finalLevel}, damage ${result.damageTaken}, shockwave hit/dodged ${result.shockwaves.reached - result.shockwaves.dodged}/${result.shockwaves.dodged}, mimic stuns ${result.mimicStuns}, ${result.thirst?.drains ? `thirst drains ${result.thirst.drains} eaten/denied ${result.thirst.eggsConsumed}/${result.thirst.eggsDenied} healed ${result.thirst.healed}, ` : ""}${result.pursuer ? `pursuer lays ${result.pursuer.lays} eggs ${result.pursuer.eggs}, ` : ''}${result.footprints ? `footprints ${result.footprints.spawned} lost ${result.footprints.lost} hits ${result.footprints.hits}, ` : ''}maxEggs ${result.maxEggs}, maxEnemies ${result.maxEnemies}, fps ${result.renderFps}, real ${result.realSeconds}s${errors.length ? `, errors ${errors.length}` : ''}`);
    if (run === 0) await page.screenshot({ path: 'tmp/bot/last-run.png' }).catch(() => {});
    const video = page.video();
    await context.close();
    if (video) {
      result.video = await video.path();
      await writeFile(result.video.replace(/\.webm$/, '.events.json'), JSON.stringify({ seed: result.seed, stageId, characterId, endedAt: result.endedAt, events: result.events }, null, 2));
      console.log(`video ${result.video}`);
    }
  }
} finally {
  await browser.close();
}

const wins = results.filter(result => result.victory);
const average = (list, key) => list.length ? Math.round(list.reduce((sum, item) => sum + (item[key] ?? 0), 0) / list.length * 10) / 10 : null;
const report = {
  date: new Date().toISOString(), characterId, stageId, speed, runs, dodge,
  winRate: wins.length / results.length,
  averageKillTime: average(wins, 'motherKilledAt'),
  averageDamage: average(results, 'damageTaken'),
  averageLevel: average(results, 'finalLevel'),
  deaths: results.filter(result => result.diedAt !== null).map(result => result.diedAt),
  results
};
const file = `tmp/bot/bot-${characterId}-stage${stageId}-${Date.now()}.json`;
await writeFile(file, JSON.stringify(report, null, 2));
console.log(`winRate ${report.winRate}, avgKill ${report.averageKillTime ?? "-"}s, avgDamage ${report.averageDamage}, avgLevel ${report.averageLevel}, deaths ${JSON.stringify(report.deaths)}`);
console.log(`saved ${file}`);
