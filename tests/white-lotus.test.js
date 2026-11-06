import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOSS_TYPES, getBossName, linkLotus, lotusAttackStep, lotusInhalePull, lotusOnLethal, lotusTargetable, updateLotusMember
} from '../src/bosses.js';
import { Config } from '../src/config.js';

const cfg = Config.boss.whiteLotusCore;

// 核と花弁の代わり。花弁の産卵・壊れる・核が開く・攻撃の周期だけを、ゲーム全体なしで動かす。
function createLotus() {
  const game = {
    state: 'playing', broken: [], brood: [], attacks: [], inhales: 0,
    onLotusPetalBroken(petal, broken, opened) { this.broken.push({ broken, opened }); },
    spawnLotusBrood(petal, type) { const enemy = { type, dead: false }; this.brood.push(enemy); return enemy; },
    onLotusAttack(core, event) { this.attacks.push(event); },
    applyLotusInhale() { this.inhales += 1; }
  };
  const core = { game, dead: false, hp: 100, maxHp: 100 };
  const petals = Array.from({ length: cfg.petalCount }, () => ({ game, dead: false, hp: 10, maxHp: 10 }));
  const lotus = linkLotus(core, petals, cfg.petalSpecies);
  return { game, core, petals, lotus };
}

function step(bodies, seconds, dt = 0.1) {
  for (let t = 0; t < seconds; t += dt) for (const body of bodies) updateLotusMember(body, dt);
}

test('white lotus core is registered for the final chapter with its own name', () => {
  assert.equal(BOSS_TYPES.whiteLotusCore.spawnCount, 1 + cfg.petalCount);
  assert.equal(getBossName({ boss: 'whiteLotusCore', motherName: '白蓮の核' }), '白蓮の核');
  assert.equal(new Set(cfg.petalSpecies).size, cfg.petalCount);
});

test('petals hatch their own species, capped per petal; the closed core cannot be targeted', () => {
  const { game, core, petals } = createLotus();
  assert.equal(lotusTargetable(core), false);
  assert.equal(lotusTargetable(petals[0]), true);
  step(petals, cfg.petalFirstSpawnSeconds + cfg.petalCount + cfg.petalSpawnSeconds * 4);
  const types = new Set(game.brood.map((enemy) => enemy.type));
  assert.deepEqual([...types].sort(), [...cfg.petalSpecies].sort());
  for (const petal of petals) assert.equal(petal.lotusBrood.length, cfg.petalMaxAlive);
  assert.deepEqual(game.attacks, []);
});

test('breaking enough petals opens the core, which alternates shockwave and inhale', () => {
  const { game, core, petals, lotus } = createLotus();
  for (let i = 0; i < cfg.openAfterPetals; i++) assert.equal(lotusOnLethal(petals[i]), true);
  assert.equal(petals[0].dead, true);
  assert.deepEqual(game.broken.at(-1), { broken: cfg.openAfterPetals, opened: true });
  assert.equal(game.broken.filter((entry) => entry.opened).length, 1);
  assert.equal(lotus.state, 'open');
  assert.equal(lotusTargetable(core), true);
  assert.equal(lotusOnLethal(core), false);
  step([core], 40);
  const order = game.attacks.filter((event) => event === 'shockwave' || event === 'inhaleStart');
  assert.ok(order.length >= 4);
  order.forEach((event, i) => assert.equal(event, i % 2 === 0 ? 'shockwave' : 'inhaleStart'));
  assert.ok(game.inhales > 0);
});

test('the inhale pulls bird form much harder than human form and stops at the core', () => {
  const bird = lotusInhalePull(15, 'bird', 0.1);
  const human = lotusInhalePull(15, 'human', 0.1);
  assert.ok(bird > human * 3);
  assert.equal(lotusInhalePull(cfg.inhaleRadius + 1, 'bird', 0.1), 0);
  assert.equal(lotusInhalePull(cfg.inhaleBiteRadius * 0.5, 'bird', 0.1), 0);
  assert.ok(lotusInhalePull(cfg.inhaleBiteRadius * 0.7, 'bird', 1) <= cfg.inhaleBiteRadius * 0.1 + 1e-9);
});

test('a single step never yields two attack events', () => {
  const lotus = { state: 'open', attack: 'rest', attackTimer: 0, next: 'shockwave', stats: { shockwaves: 0, inhales: 0 } };
  assert.equal(lotusAttackStep(lotus, 0.1), 'shockwaveWarning');
  assert.equal(lotusAttackStep(lotus, 0.1), null);
});
