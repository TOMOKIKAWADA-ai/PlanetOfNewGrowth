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
