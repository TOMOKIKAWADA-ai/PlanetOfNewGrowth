import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOSS_TYPES, linkLotus, lotusCoreDamageScale, lotusShadowDue, shadowFormOf, shadowMirrorStep, shadowVulnerable, updateLotusMember
} from '../src/bosses.js';
import { Config } from '../src/config.js';

const cfg = Config.boss.whiteLotusCore;
const shadowCfg = Config.enemy.shadow;

test('the shadow hatches once, when shadowAtRemaining seconds are left', () => {
  const lotus = { shadowHatched: false };
  const play = Config.map.playSeconds;
  assert.equal(lotusShadowDue(lotus, play - cfg.shadowAtRemaining - 0.1, play), false);
  assert.equal(lotusShadowDue(lotus, play - cfg.shadowAtRemaining, play), true);
  lotus.shadowHatched = true;
  assert.equal(lotusShadowDue(lotus, play - 1, play), false);
  assert.equal(lotusShadowDue(null, play, play), false);
});

test('the core hatches the shadow through the game and records the time', () => {
  const spawned = [];
  const game = { state: 'playing', elapsed: 0, spawnLotusShadow(core) { const s = { dead: false }; spawned.push(s); return s; }, onLotusAttack() {}, applyLotusInhale() {} };
  const core = { game, dead: false, hp: 100, maxHp: 100 };
  const petals = Array.from({ length: cfg.petalCount }, () => ({ game, dead: false, hp: 10, maxHp: 10 }));
  const lotus = linkLotus(core, petals, cfg.petalSpecies);
  game.elapsed = Config.map.playSeconds - cfg.shadowAtRemaining - 1;
  updateLotusMember(core, 0.1);
  assert.equal(spawned.length, 0);
  game.elapsed += 2;
  updateLotusMember(core, 0.1);
  updateLotusMember(core, 0.1);
  assert.equal(spawned.length, 1);
  assert.equal(lotus.shadow, spawned[0]);
  assert.equal(lotus.stats.shadowAt, Math.round(game.elapsed));
});

test('while the shadow lives the core takes less damage; petals are never guarded', () => {
  const core = { lotusRole: 'core', lotus: { shadow: { dead: false } } };
  const petal = { lotusRole: 'petal', lotus: core.lotus };
  assert.equal(lotusCoreDamageScale(core), cfg.shadowCoreDamageScale);
  assert.equal(BOSS_TYPES.whiteLotusCore.damageScale(core), cfg.shadowCoreDamageScale);
  assert.equal(lotusCoreDamageScale(petal), 1);
  core.lotus.shadow.dead = true;
  assert.equal(lotusCoreDamageScale(core), 1);
  core.lotus.shadow = null;
  assert.equal(lotusCoreDamageScale(core), 1);
});

test('the shadow copies the form late; fish counts as the bird side', () => {
  assert.equal(shadowFormOf('human'), 'human');
  assert.equal(shadowFormOf('bird'), 'bird');
  assert.equal(shadowFormOf('fish'), 'bird');
  const mirror = { form: 'human', pending: null, timer: 0 };
  assert.equal(shadowMirrorStep(mirror, 'bird', shadowCfg.mirrorDelay - 0.2), false);
  assert.equal(mirror.form, 'human');
  // switching back before the delay ends cancels the change
  assert.equal(shadowMirrorStep(mirror, 'human', 0.1), false);
  assert.equal(mirror.pending, null);
  assert.equal(shadowMirrorStep(mirror, 'bird', shadowCfg.mirrorDelay - 0.2), false);
  assert.equal(shadowMirrorStep(mirror, 'bird', 0.3), true);
  assert.equal(mirror.form, 'bird');
});

test('the shadow can be hurt only while its form differs from the player', () => {
  assert.equal(shadowVulnerable('human', 'human'), false);
  assert.equal(shadowVulnerable('bird', 'bird'), false);
  assert.equal(shadowVulnerable('bird', 'fish'), false);
  assert.equal(shadowVulnerable('human', 'bird'), true);
  assert.equal(shadowVulnerable('bird', 'human'), true);
  // a dive (warning + fall) lands before the shadow takes to the air
  assert.ok(Config.player.birdDiveWarn + Config.player.birdDiveDuration < shadowCfg.mirrorDelay);
});
