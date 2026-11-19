// Auto-play bot (backlog A1): plays the 4-minute stage in a real browser and writes metrics as JSON.
// Like check-story.mjs, state access is injected only into intercepted test responses, never into the app.
//
//   npm run dev -- --port 5183
//   node scripts/bot-play.mjs --runs 3 --character tsukimi --stage 1 --speed 4
//   node scripts/bot-play.mjs --runs 1 --stage 3 --start 170 --record promo/YYYY-MM-DD/raw
//   node scripts/bot-play.mjs --runs 3 --stage 2 --carry 1:pumpGuard
//
// --carry (backlog A17) starts the chapter with carry-over picks from earlier chapters, as if they had been chosen
// on the result screen: "<chapter>:<rewardId>[+<upgradeId>]" separated by commas, e.g. "1:waterLine+multishot,2:sharpSeeds".
// "1:+multishot" carries only the upgrade. The picks are written to localStorage before the page loads.
//
// --record <dir> (backlog B6-1) plays in real time, saves a WebM per run to <dir> and an events JSON
// (mother egg, bursts, dives, shockwave dodges, mimic stuns, crier cries, hand grabs) with offsets into the video, for scripts/promo/cut-highlights.mjs.
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
// --shake 0 keeps the bot from transforming to shake off a hand's grab (E11), to compare.
const shake = args.shake !== '0';
// --mimic 0 keeps the bot blind to mimic eggs (A15): it then dives onto them like any other egg, as before 2026-11-16.
const mimicAware = args.mimic !== '0';
// --bossRange <distance> is how far a human-form bot stands from the boss (A18, 2026-11-17). The egg shot only reaches
// Config.player.specialEggRange (6), so the old 9 left the boss untouched between bursts; --bossRange 9 gives the old behaviour.
const bossRange = Number(args.bossRange ?? 5);
// --chase 0 turns off the stronger pull back to a far-away boss (A18): without it the crowd pushes the bot 40-90 away
// from the boss for 20-30 s at a time and the boss's HP stands still.
const chase = args.chase !== '0';
// --thirst 1 makes the bot go for the eggs the thirst mother (chapter 5) is draining and break them in bird form on land
// or fish form in water, to deny her heal (A20, 2026-11-19). Off by default so the numbers stay comparable with older runs.
const thirstDeny = args.thirst === '1';
const recordDir = args.record ?? null;
// --start <seconds> skips the stage clock ahead (e.g. 170 to record or check a chapter's boss without the first three minutes).
const startAt = Number(args.start ?? 0);
const carrySpec = args.carry ?? '';
const carryEntries = Object.fromEntries(carrySpec.split(',').filter(Boolean).map(part => {
  const [chapter, picks = ''] = part.split(':');
  const [rewardId, upgradeId] = picks.split('+');
  return [chapter, { ...(rewardId ? { rewardId } : {}), ...(upgradeId ? { upgradeId } : {}) }];
}));
const baseURL = process.env.BOT_TEST_URL || 'http://127.0.0.1:5183';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Runs inside the page. Seeded Math.random keeps runs comparable; the bot reads game state and drives
// the same touch-input entry points the on-screen stick uses.
function installBot({ speed, seed, dodge, shake, mimicAware, realtime, startAt, bossRange, chase, thirstDeny }) {
  let state = seed >>> 0 || 1;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const { game, input, Config } = window.__botTest;
  const player = game.player;
  if (startAt > game.elapsed) game.elapsed = startAt;
  const stats = {
    samples: [], upgrades: [], damageTaken: 0, maxEggs: 0, maxEnemies: 0, birdSeconds: 0,
    transforms: 0, bursts: 0, frames: 0, realStart: performance.now(), motherSpawnedAt: null
  };
  stats.eggKills = {};
  // Player stats at the start, to confirm carry-over picks (--carry) took effect.
  stats.startStats = {
    maxHp: player.maxHp, maxMp: player.maxMp, shieldCharges: player.shieldCharges,
    humanSpeed: Math.round(player.humanSpeed * 100) / 100, autoDamage: Math.round(player.autoDamage * 100) / 100
  };
  stats.damageAfterMother = 0;
  stats.shockwaves = { fired: 0, reached: 0, dodged: 0, dodgeAttempts: 0 };
  // A15: mimic eggs seen (by their fast pulse, read as isMimic), dives called off during the warning, and mimics shot in human form.
  stats.mimic = { seen: 0, diveAborts: 0, shot: 0 };
  const seenMimics = new WeakSet();
  let lastMimicAbortAt = -Infinity;
  // The eggs the thirst mother is draining right now (only when --thirst 1). Nearest first.
  const drainTarget = () => {
    if (!thirstDeny) return null;
    const drainer = (game.bossEggs ?? []).find(body => !body.dead && body.thirst?.state === 'draining');
    if (!drainer) return null;
    let best = null;
    let bestD2 = Infinity;
    for (const egg of drainer.thirst.targets) {
      if (egg.dead) continue;
      const d2 = (egg.position.x - player.position.x) ** 2 + (egg.position.z - player.position.z) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = egg; }
    }
    if (best && game.thirstStats.drains !== lastDrain) {
      // Distance to the nearest drained egg when the drain starts, to see whether the eggs are reachable at all.
      lastDrain = game.thirstStats.drains;
      stats.thirstReach.push(Math.round(Math.sqrt(bestD2) * 10) / 10);
    }
    return best ? { egg: best, d2: bestD2 } : null;
  };
  let lastDrain = null;
  stats.thirstReach = [];
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
    if (egg.isMimic && source !== 'mimicBurst' && stats.mimic) stats.mimic.shot++;
    return onEggDestroyed.call(this, egg, source);
  };
  // Offsets are from navigation start, which is close to where Playwright's video begins.
  stats.events = [];
  const mark = (type, extra = {}) => stats.events.push({
    type, t: Math.round(game.elapsed * 10) / 10, video: Math.round(performance.now()) / 1000, ...extra
  });
  const onCrierCry = game.onCrierCry;
  game.onCrierCry = function (crier) {
    mark('crierCry');
    return onCrierCry.call(this, crier);
  };
  const onPlayerGrabbed = game.onPlayerGrabbed;
  game.onPlayerGrabbed = function (...args) {
    mark('handGrab');
    return onPlayerGrabbed.apply(this, args);
  };
  const onPlayerStunned = game.onPlayerStunned;
  game.onPlayerStunned = function (...args) {
    mark('mimicStun');
    return onPlayerStunned.apply(this, args);
  };
  // A2 diagnosis: where the player's HP goes (by enemy type or attack), kills and XP over time.
  // Enemy.update is wrapped lazily so damage dealt inside it is attributed to that enemy's type;
  // anything else falls back to the calling function's name from the stack.
  stats.kills = 0;
  stats.killsByType = {};
  stats.xpGained = 0;
  stats.damageBySource = {};
  stats.damageLog = [];
  let damageSource = null;
  const wrapEnemyPrototype = (enemy) => {
    const proto = Object.getPrototypeOf(enemy);
    if (!proto || proto.__botWrapped) return;
    proto.__botWrapped = true;
    const update = proto.update;
    proto.update = function (...args) {
      const previous = damageSource;
      damageSource = this.type;
      try { return update.apply(this, args); } finally { damageSource = previous; }
    };
    const die = proto.die;
    proto.die = function (reward, ...rest) {
      if (!this.dead && reward) {
        stats.kills++;
        stats.killsByType[this.type] = (stats.killsByType[this.type] ?? 0) + 1;
      }
      return die.call(this, reward, ...rest);
    };
  };
  const stackSource = () => {
    const frames = (new Error().stack ?? '').split('\n').slice(3);
    for (const frame of frames) {
      const name = frame.trim().match(/^at (?:async )?([\w$.<>]+) /)?.[1];
      if (!name || name.includes('takeDamage')) continue;
      if (name.includes('checkPlayerHit')) return 'projectile';
      if (/Shockwave/i.test(name)) return 'motherShockwave';
      if (/Inhale/i.test(name)) return 'lotusInhale';
      // The shockwave hits from its effect's update(), an object literal in main.js.
      if (name === 'Object.update' && frame.includes('/src/main.js')) return 'motherShockwave';
      return name.replace(/^Game\./, '');
    }
    return 'unknown';
  };
  const playerTakeDamage = player.takeDamage;
  player.takeDamage = function (...args) {
    const before = this.hp;
    const result = playerTakeDamage.apply(this, args);
    const lost = before - this.hp;
    if (lost > 0) {
      const source = damageSource ?? stackSource();
      stats.damageBySource[source] = (stats.damageBySource[source] ?? 0) + lost;
      stats.damageLog.push({ t: Math.round(game.elapsed * 10) / 10, source, amount: Math.round(lost * 10) / 10 });
    }
    return result;
  };
  const addXp = player.addXp;
  player.addXp = function (amount, ...rest) {
    stats.xpGained += amount;
    return addXp.call(this, amount, ...rest);
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
    // Caught by a vine: wiggle the stick left/right about 7 times a second, a human mashing pace.
    if (player.bindTimer > 0) {
      input.setTouchMovement(Math.floor(game.elapsed * 7) % 2 ? 1 : -1, 0);
      return;
    }
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
    // The swarm mother (chapter 4) has three bodies: go for the nearest one still standing.
    let mother = null;
    let motherBest = Infinity;
    // The white lotus (chapter 6): once the core has opened, go for the core rather than the petals left.
    const bossTargets = game.getBossTargets ? game.getBossTargets() : [];
    const openCore = bossTargets.find(body => body.lotusRole === 'core');
    for (const body of openCore ? [openCore] : bossTargets) {
      const d2 = (body.position.x - p.x) ** 2 + (body.position.z - p.z) ** 2;
      if (d2 < motherBest) { motherBest = d2; mother = body; }
    }
    let target = mother;
    const drain = drainTarget();
    if (drain) { target = drain.egg; mother = null; }
    if (!target) {
      let best = Infinity;
      for (const egg of game.eggs) {
        if (egg.dead) continue;
        const d2 = (egg.position.x - p.x) ** 2 + (egg.position.z - p.z) ** 2;
        if (mimicAware && egg.isMimic) {
          if (d2 < 225 && !seenMimics.has(egg)) { seenMimics.add(egg); stats.mimic.seen++; }
          // A bird must not drift over a mimic (the dive picks the nearest egg on its own); a human can shoot it safely.
          if (player.form !== 'human') {
            const range = Config.player.birdEggDetectRange + 1.5;
            if (d2 < range * range && d2 > 1e-4) {
              const d = Math.sqrt(d2);
              mx += ((p.x - egg.position.x) / d) * 2.5;
              mz += ((p.z - egg.position.z) / d) * 2.5;
            }
            continue;
          }
        }
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
      // On a water map a boss that lives on land is hugged closely: the ground there is land, where a transform gives bird form for the shockwave.
      const landHug = game.isWaterStage && mother && !flood;
      const desired = flood ? (flood.state === 'submerged' ? 0 : 4.5) : player.form === 'human' && mother ? (landHug ? 2.5 : bossRange) : 0;
      // The further the boss, the harder the bot heads back (up to 6x), so the crowd's push cannot carry it away.
      const chasePull = chase && mother ? Math.min(6, Math.max(1, (d - desired) / 6)) : 1;
      const pull = (d > desired ? chasePull : -0.6) * (flood?.state === 'submerged' ? 3 : 1);
      mx += (dx / d) * pull;
      mz += (dz / d) * pull;
    }
    // A shockwave is coming while in the water: a transform there gives fish form, which cannot dodge, so head for the
    // boss (it stands on land on water maps) to get out of the water first.
    const warner = (game.bossEggs ?? []).find(body => !body.dead && body.shockwaveState === 'warning');
    if (dodge && warner && game.isWaterStage && game.isWaterPosition(p)) {
      const dx = warner.position.x - p.x;
      const dz = warner.position.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      mx += (dx / d) * 8;
      mz += (dz / d) * 8;
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
    const nearbyEggs = game.eggs.filter(egg => !egg.dead && !(mimicAware && egg.isMimic)
      && (egg.position.x - player.position.x) ** 2 + (egg.position.z - player.position.z) ** 2 < 225).length;
    const bosses = (game.bossEggs ?? []).filter(body => !body.dead);
    const mother = bosses.find(body => body.shockwaveState === 'warning') ?? bosses.find(body => !body.swarmDown && (!game.getBossTargets || game.getBossTargets().includes(body))) ?? null;
    // Stay airborne until the released wave has finished travelling, not just through the warning.
    if (mother?.shockwaveState === 'warning') lastWarningAt = game.elapsed;
    const waveActive = mother?.shockwaveState === 'warning'
      || game.elapsed - lastWarningAt < Config.egg.motherShockwaveWarning + Config.egg.motherShockwaveDuration + 0.2;
    const shockwaveComing = dodge && waveActive
      && (mother.position.x - player.position.x) ** 2 + (mother.position.z - player.position.z) ** 2
        < (Config.egg.motherShockwaveRange + 2) ** 2;
    // Right after calling off a mimic dive, stay human for a moment (and shoot it) instead of taking off onto it again.
    // A stricter rule (never take off with a mimic within 5.5) cut bird time from ~70 s to ~25 s and the bot fell to bullets.
    const mimicClose = mimicAware && game.elapsed - lastMimicAbortAt < 2.5;
    const flood = mother?.floodgate;
    const nearMother = mother && (mother.position.x - player.position.x) ** 2 + (mother.position.z - player.position.z) ** 2 < 49;
    const drain = drainTarget();
    if (player.form === 'human') {
      if (drain && drain.d2 < 26 * 26 && player.mp > 5 && !shockwaveComing) {
        // A drained egg is close: take off (or dive in) to break it before the drain ends.
        stats.transforms++;
        mark('thirstDeny');
        press('transform');
      } else if (flood?.state === 'submerged' && nearMother && game.isWaterPosition(player.position) && player.mp > 8) {
        stats.transforms++;
        press('transform');
      } else if (shake && player.grabbedBy && player.mp > 5) {
        // Held by a hand (E11): transform to shake it off.
        stats.transforms++;
        press('transform');
      } else if (shockwaveComing && player.mp > 5) {
        stats.transforms++;
        stats.shockwaves.dodgeAttempts++;
        press('transform');
      } else if (player.burst >= 100 && player.burstCooldownTimer <= 0
        && !((mother?.pursuit || mother?.floodgate) && (mother.bossType?.damageScale?.(mother) ?? 1) < 1)
        && !bosses.some(body => body.lotusRole === 'core' && body.lotus?.state === 'closed')) {
        // Keep the burst while the boss shrugs hits off (the pursuer's closed shell, the floodgate mother under water),
        // and for the white lotus core until it opens.
        stats.bursts++;
        mark('burst');
        press('burst');
      } else if (player.mp > player.maxMp * 0.7 && nearbyEggs >= 3 && !mimicClose) {
        stats.transforms++;
        press('transform');
      }
    } else if (mimicAware && player.form === 'bird' && player.diveState === 'warning' && player.diveTarget?.isMimic) {
      // The target pulses fast: call the dive off by turning back to human (the dive warning is 0.55 s).
      stats.mimic.diveAborts++;
      lastMimicAbortAt = game.elapsed;
      mark('mimicAbort');
      press('transform');
    } else if (player.form === 'fish' && flood?.state === 'surfaced') {
      press('transform');
    } else if (player.form === 'bird' && flood?.state === 'submerged' && nearMother && player.diveState === 'ready') {
      press('transform');
    } else if (player.mp < player.maxMp * 0.2 && player.diveState === 'ready' && !shockwaveComing && !drain) {
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
    if (game.enemies.length) wrapEnemyPrototype(game.enemies[0]);
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
        mother: game.motherEgg ? Math.round(Math.max(0, game.motherEgg.hp)) : null,
        // Distance to the boss, to see whether the bot is inside the egg shot's reach (A18).
        bossDist: game.motherEgg ? Math.round(Math.hypot(game.motherEgg.position.x - player.position.x, game.motherEgg.position.z - player.position.z) * 10) / 10 : null,
        kills: stats.kills, xp: Math.round(stats.xpGained), damage: Math.round(stats.damageTaken),
        pacing: game.pacingState?.phase ?? null
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
    startStats: stats.startStats,
    events: stats.events,
    mimicStuns: game.mimicStuns ?? 0,
    mimic: stats.mimic.seen || stats.mimic.shot ? { ...stats.mimic } : null,
    thirst: game.thirstStats ? { ...game.thirstStats, healed: Math.round(game.thirstStats.healed), reach: stats.thirstReach ?? [] } : null,
    pursuer: game.pursuerStats?.lays ? { ...game.pursuerStats } : null,
    vine: game.vineStats?.windups ? { ...game.vineStats } : null,
    footprints: game.footprintStats?.spawned ? { ...game.footprintStats } : null,
    criers: game.crierStats?.spawned ? { ...game.crierStats } : null,
    hands: game.handStats?.spawned ? { ...game.handStats, heldSeconds: Math.round(game.handStats.heldSeconds * 10) / 10 } : null,
    splitshells: game.splitshellStats?.spawned ? { ...game.splitshellStats } : null,
    swarmbirds: game.swarmbirdStats?.flocks ? { ...game.swarmbirdStats, damage: Math.round(game.swarmbirdStats.damage) } : null,
    rootsuckers: game.rootsuckerStats?.spawned ? { ...game.rootsuckerStats, drySeconds: Math.round(game.rootsuckerStats.drySeconds * 10) / 10, dryMpLost: Math.round(game.rootsuckerStats.dryMpLost) } : null,
    synergies: game.synergyStats?.activated.length ? { ...game.synergyStats } : null,
    lotus: game.lotusStats ? { ...game.lotusStats, broken: game.motherEgg?.lotus?.broken ?? 0 } : null,
    swarm: game.motherEgg?.swarm ? { downs: game.motherEgg.swarm.downs, revives: game.motherEgg.swarm.revives } : null,
    floodgate: game.floodgateStats?.streams || game.floodgateStats?.bites ? { ...game.floodgateStats } : null,
    maxEggs: stats.maxEggs,
    maxEnemies: stats.maxEnemies,
    birdSeconds: Math.round(stats.birdSeconds),
    transforms: stats.transforms,
    bursts: stats.bursts,
    upgrades: stats.upgrades,
    kills: stats.kills,
    killsByType: stats.killsByType,
    xpGained: Math.round(stats.xpGained),
    damageBySource: Object.fromEntries(Object.entries(stats.damageBySource).map(([key, value]) => [key, Math.round(value)])),
    damageLog: stats.damageLog,
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
    if (carrySpec) {
      await page.addInitScript(value => {
        try { localStorage.setItem('searchSurvive.carryOver', value); } catch { /* ignore */ }
      }, JSON.stringify({ characterId, entries: carryEntries }));
    }
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
    await page.evaluate(installBot, { speed, seed: seedBase + run, dodge, shake, mimicAware, realtime: Boolean(recordDir), startAt, bossRange, chase, thirstDeny });
    await page.waitForFunction(() => Boolean(window.__botTest.game.outcome), null, { timeout: 15 * 60 * 1000, polling: 1000 });
    const result = await page.evaluate(summarize.toString().replace(/^function summarize/, '(function') + ')(window.__botTest.game, window.__botStats)');
    result.run = run + 1;
    result.seed = seedBase + run;
    result.errors = errors;
    result.carry = carrySpec || null;
    results.push(result);
    console.log(`run ${run + 1}: ${result.victory ? 'WIN' : 'LOSE'} at ${result.endedAt}s, level ${result.finalLevel}, damage ${result.damageTaken}, shockwave hit/dodged ${result.shockwaves.reached - result.shockwaves.dodged}/${result.shockwaves.dodged}, mimic stuns ${result.mimicStuns}${result.mimic ? ` (seen ${result.mimic.seen} aborts ${result.mimic.diveAborts} shot ${result.mimic.shot})` : ''}, ${result.thirst?.drains ? `thirst drains ${result.thirst.drains} eaten/denied ${result.thirst.eggsConsumed}/${result.thirst.eggsDenied} healed ${result.thirst.healed}, ` : ""}${result.pursuer ? `pursuer lays ${result.pursuer.lays} eggs ${result.pursuer.eggs}, ` : ''}${result.footprints ? `footprints ${result.footprints.spawned} lost ${result.footprints.lost} hits ${result.footprints.hits}, ` : ''}${result.criers ? `criers ${result.criers.spawned} cries ${result.criers.cries} hurried ${result.criers.eggsHurried} diveKills ${result.criers.diveKills}, ` : ''}${result.hands ? `hands ${result.hands.spawned} grabs ${result.hands.grabs}/${result.hands.windups} shaken ${result.hands.shaken} timeouts ${result.hands.timeouts} held ${result.hands.heldSeconds}s, ` : ''}${result.vine ? `vine windups/binds ${result.vine.windups}/${result.vine.binds} mash/cut/timeout ${result.vine.mashEscapes}/${result.vine.cuts}/${result.vine.timeouts}, ` : ''}maxEggs ${result.maxEggs}, maxEnemies ${result.maxEnemies}, fps ${result.renderFps}, real ${result.realSeconds}s${errors.length ? `, errors ${errors.length}` : ''}`);
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
  date: new Date().toISOString(), characterId, stageId, speed, runs, dodge, shake, mimicAware, bossRange, chase, thirstDeny, startAt, carry: carrySpec || null,
  winRate: wins.length / results.length,
  averageKillTime: average(wins, 'motherKilledAt'),
  averageDamage: average(results, 'damageTaken'),
  averageLevel: average(results, 'finalLevel'),
  deaths: results.filter(result => result.diedAt !== null).map(result => result.diedAt),
  results
};
const file = `tmp/bot/bot-${characterId}-stage${stageId}${carrySpec ? `-carry-${carrySpec.replace(/[^\w]+/g, '_')}` : ''}-${Date.now()}.json`;
await writeFile(file, JSON.stringify(report, null, 2));
console.log(`winRate ${report.winRate}, avgKill ${report.averageKillTime ?? "-"}s, avgDamage ${report.averageDamage}, avgLevel ${report.averageLevel}, deaths ${JSON.stringify(report.deaths)}`);
console.log(`saved ${file}`);
