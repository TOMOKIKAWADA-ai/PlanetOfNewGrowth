import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/campaign.js';
import { BOSS_TYPES, DEFAULT_BOSS, getBossName, getBossType, isBossImplemented } from '../src/bosses.js';

test('every chapter names a boss and chapter one fights the mother egg', () => {
  for (const stage of Object.values(STAGES)) assert.equal(typeof stage.boss, 'string', `chapter ${stage.chapter}`);
  assert.equal(STAGES[1].boss, 'motherEgg');
  assert.ok(isBossImplemented('motherEgg'));
});

test('bosses that are not built yet fall back to the mother egg', () => {
  assert.equal(getBossType('pursuer'), BOSS_TYPES[DEFAULT_BOSS]);
  assert.equal(getBossType(undefined).id, 'motherEgg');
  assert.equal(isBossImplemented('pursuer'), false);
  for (const type of Object.values(BOSS_TYPES)) assert.equal(typeof type.update, 'function');
});

test('the displayed boss name falls back to the chapter name until the boss has its own', () => {
  assert.equal(getBossName(STAGES[1]), '母卵');
  assert.equal(getBossName(STAGES[6]), '白蓮の核');
  assert.equal(getBossName({ boss: 'pursuer', motherName: '母卵' }), '母卵');
});

test('the thirst mother drains the nearest eggs and heals only by those left alive', async () => {
  const { pickDrainTargets, drainHealAmount, updateThirstDrain } = await import('../src/bosses.js');
  const { Config } = await import('../src/config.js');
  const at = (x, z, extra = {}) => ({ position: { x, z }, dead: false, isMother: false, aquatic: false, ...extra });
  const eggs = [at(30, 0), at(3, 0), at(5, 0, { aquatic: true }), at(8, 0), at(1, 1, { dead: true }), at(6, 0)];
  const targets = pickDrainTargets(eggs, { x: 0, z: 0 }, 22, 2);
  assert.deepEqual(targets, [eggs[1], eggs[2]]);
  assert.equal(drainHealAmount(400, 3, 0.05), 60);

  const cfg = Config.boss.thirstMother;
  const calls = [];
  const game = {
    state: 'playing',
    eggs,
    consumeEggForBoss(egg) { egg.dead = true; calls.push('consume'); },
    onThirstDrainStart(_m, list) { calls.push(`start:${list.length}`); },
    onThirstDrainEnd(_m, consumed, total) { calls.push(`end:${consumed}/${total}`); }
  };
  const mother = { game, position: { x: 0, z: 0 }, hp: 100, maxHp: 400 };
  updateThirstDrain(mother, cfg.firstDelay + 0.01);
  assert.equal(mother.thirst.state, 'draining');
  mother.thirst.targets[0].dead = true; // the player broke one egg in time
  updateThirstDrain(mother, cfg.drainSeconds + 0.01);
  const drained = Math.min(cfg.count, 4) - 1;
  assert.equal(mother.hp, 100 + drainHealAmount(400, drained, cfg.healRatioPerEgg));
  assert.equal(calls.at(-1), `end:${drained}/${Math.min(cfg.count, 4)}`);
  assert.equal(mother.thirst.state, 'idle');
});

test('chapter five fights the thirst mother under its own name', () => {
  assert.ok(isBossImplemented('thirstMother'));
  assert.equal(getBossName(STAGES[5]), '渇きの母');
});
