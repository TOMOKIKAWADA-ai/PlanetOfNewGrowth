import test from 'node:test';
import assert from 'node:assert/strict';
import { activeSynergies, fullWaterScale, ownsUpgrade, pierceDamageScale, synergyHints } from '../src/synergies.js';
import { Config, getUpgrade } from '../src/config.js';

// A6 強化の相乗効果: 2 つそろうと働く、ヒントの出し分け、無効にすると何も起きない、数字。
const synergy = Config.synergy;
const basePlayer = () => ({
  seedCount: 1, pierce: 0, birdDiveBonus: 0, birdMotherDiveBonus: 0, pulseLevel: 0, pulseDamage: 10, pulseRange: 4,
  maxMp: 100, mp: 100, baseMaxMp: 100, humanRegenMp: 5, baseHumanRegenMp: 5,
  syncSeeds() {}
});
const take = (player, ...ids) => {
  for (const id of ids) getUpgrade(id).apply({ player });
  return player;
};

test('every synergy joins two different upgrades that exist and can be detected', () => {
  const ids = new Set();
  for (const entry of synergy.list) {
    assert.equal(entry.parts.length, 2);
    assert.notEqual(entry.parts[0], entry.parts[1]);
    assert.ok(entry.title && entry.body);
    assert.ok(!ids.has(entry.id));
    ids.add(entry.id);
    for (const part of entry.parts) {
      assert.ok(getUpgrade(part), part);
      assert.equal(ownsUpgrade(basePlayer(), part), false, `${part} before`);
      assert.equal(ownsUpgrade(take(basePlayer(), part), part), true, `${part} after`);
    }
  }
});

test('a synergy is active only with both parts', () => {
  assert.deepEqual(activeSynergies(basePlayer(), synergy), []);
  for (const entry of synergy.list) {
    assert.deepEqual(activeSynergies(take(basePlayer(), entry.parts[0]), synergy), []);
    assert.deepEqual(activeSynergies(take(basePlayer(), entry.parts[1]), synergy), []);
    assert.deepEqual(activeSynergies(take(basePlayer(), ...entry.parts), synergy), [entry.id]);
  }
});

test('turning synergies off gives no effects and no hints', () => {
  const off = { ...synergy, enabled: false };
  const player = take(basePlayer(), 'seeds', 'pierce', 'dive', 'pulse', 'mp', 'regen');
  assert.equal(activeSynergies(player, synergy).length, synergy.list.length);
  assert.deepEqual(activeSynergies(player, off), []);
  assert.deepEqual(synergyHints('seeds', player, off), []);
});

test('hints say partner, completes or active', () => {
  const hint = player => synergyHints('pierce', player, synergy)[0];
  assert.equal(hint(basePlayer()).state, 'partner');
  assert.equal(hint(basePlayer()).partner, 'seeds');
  assert.equal(hint(take(basePlayer(), 'pierce')).state, 'partner');
  assert.equal(hint(take(basePlayer(), 'seeds')).state, 'completes');
  assert.equal(hint(take(basePlayer(), 'seeds', 'pierce')).state, 'active');
  assert.deepEqual(synergyHints('hp', basePlayer(), synergy), []);
});

test('piercing rain grows with each enemy pierced; full water needs high MP', () => {
  const gain = synergy.piercingRain.gain;
  assert.equal(pierceDamageScale(0, gain), 1);
  assert.equal(pierceDamageScale(1, gain), 1 + gain);
  assert.ok(Math.abs(pierceDamageScale(2, gain) - (1 + gain) ** 2) < 1e-9);
  const cfg = synergy.fullWater;
  assert.equal(fullWaterScale(100, 100, cfg), cfg.damageScale);
  assert.equal(fullWaterScale(cfg.mpRatio * 100, 100, cfg), cfg.damageScale);
  assert.equal(fullWaterScale(cfg.mpRatio * 100 - 1, 100, cfg), 1);
  assert.equal(fullWaterScale(0, 0, cfg), 1);
});
