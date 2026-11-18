import test from 'node:test';
import assert from 'node:assert/strict';
import { shardScale, xpBarState, xpOrbScale, xpPullSpeedScale, xpPullStep } from '../src/reward-feedback.js';
import { Config } from '../src/config.js';

// A4 撃破と取得のフィードバック: 吸い込みの速さ・大きさ、経験値バーの予告、破片の消え方。
const pull = Config.feedbackFx.xpPull;

test('xp pull speeds up over time and is capped', () => {
  assert.equal(xpPullSpeedScale(0, pull), 1);
  assert.ok(xpPullSpeedScale(0.3, pull) > 1.5);
  assert.equal(xpPullSpeedScale(100, pull), 1 + pull.maxBoost);
  assert.equal(xpPullSpeedScale(5, null), 1);
});

test('xp orb shrinks only near the player', () => {
  assert.equal(xpOrbScale(pull.shrinkFrom * 2, pull), 1);
  assert.equal(xpOrbScale(0, pull), pull.minScale);
  const mid = xpOrbScale(pull.shrinkFrom / 2, pull);
  assert.ok(mid > pull.minScale && mid < 1);
});

test('xp pull never overshoots the player', () => {
  assert.equal(xpPullStep(0.2, 30, 0.1), 0.2);
  assert.ok(Math.abs(xpPullStep(5, 10, 0.1) - 1) < 1e-9);
});

test('xp bar warns just before a level up', () => {
  const near = Config.feedbackFx.xpBar.nearRatio;
  assert.deepEqual(xpBarState(5, 20, near), { ratio: 0.25, near: false, remain: 15 });
  const s = xpBarState(18, 20, near);
  assert.equal(s.near, true);
  assert.equal(s.remain, 2);
  assert.equal(xpBarState(30, 20, near).ratio, 1);
  assert.equal(xpBarState(3, 0, near).ratio, 0);
});

test('shards keep their size, then shrink away', () => {
  assert.equal(shardScale(0.3, 0.55), 1);
  assert.equal(shardScale(1, 0.55), 0);
  const s = shardScale(0.8, 0.55);
  assert.ok(s > 0 && s < 1);
});
