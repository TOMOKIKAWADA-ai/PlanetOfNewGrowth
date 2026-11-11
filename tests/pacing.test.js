import test from 'node:test';
import assert from 'node:assert/strict';
import { averageHatchScale, buildWaveTimes, pacingPhase } from '../src/pacing.js';
import { Config } from '../src/config.js';

// A5 敵の出現の緩急: 波の時刻、波の直後の押し寄せと小休止、ボス戦では何もしない、全体の量は変えない。
const pacing = Config.pacing;
const waves = buildWaveTimes(Config.map.stageBeats, pacing);

test('wave times are sorted, merge beats and ripples, and stop before the boss', () => {
  const times = waves.map(wave => wave.at);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  assert.ok(times.every(at => at < pacing.untilSeconds));
  for (const ripple of pacing.ripples) assert.ok(times.includes(ripple.at));
  assert.ok(waves.find(wave => wave.at === 35).main);
  assert.equal(waves.find(wave => wave.at === pacing.ripples[0].at).main, false);
});

test('a wave is followed by a surge, then a lull, then calm', () => {
  const at = 110; // 前の波（70 秒）の小休止はもう終わっている
  assert.equal(pacingPhase(at - 0.1, waves, pacing).phase, 'calm');
  const surge = pacingPhase(at + 1, waves, pacing);
  assert.equal(surge.phase, 'surge');
  assert.equal(surge.hatchScale, pacing.surgeHatchScale);
  const lull = pacingPhase(at + pacing.surgeSeconds + 1, waves, pacing);
  assert.equal(lull.phase, 'lull');
  assert.equal(lull.hatchScale, pacing.lullHatchScale);
  assert.equal(pacingPhase(at + pacing.surgeSeconds + pacing.lullSeconds + 1, waves, pacing).phase, 'calm');
});

test('nothing happens before the first wave or once the boss is out', () => {
  assert.deepEqual(pacingPhase(0, waves, pacing), { phase: 'calm', hatchScale: 1 });
  assert.equal(pacingPhase(waves[0].at - 0.5, waves, pacing).hatchScale, 1);
  for (const t of [pacing.untilSeconds, 181, 200, 239]) {
    assert.deepEqual(pacingPhase(t, waves, pacing), { phase: 'calm', hatchScale: 1 });
  }
  assert.ok(pacing.untilSeconds <= Config.map.motherSpawnSeconds);
});

test('a new wave cuts a lull short', () => {
  // 140 秒の小さな波の小休止（148〜155）は、150 秒の波で切り上げられる。
  assert.equal(pacingPhase(149, waves, pacing).phase, 'lull');
  assert.equal(pacingPhase(150.5, waves, pacing).phase, 'surge');
});

test('surges and lulls roughly cancel out over the stage', () => {
  const average = averageHatchScale(waves, pacing);
  assert.ok(average > 0.95 && average < 1.08, `average hatch scale ${average}`);
});

test('ripples are small and use known enemy types', () => {
  for (const ripple of pacing.ripples) {
    assert.ok(ripple.enemies.length <= 3 && ripple.eggs <= 2);
    for (const type of ripple.enemies) assert.ok(Config.enemy[type], type);
  }
});
