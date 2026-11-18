import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunStats, formatClock, recordEggBreak, recordKill, resultRows } from '../src/run-stats.js';
import { Config } from '../src/config.js';

test('kills within the window extend the streak; a gap starts a new one', () => {
  const stats = createRunStats();
  const window = 1.5;
  [10, 10.5, 11.9, 13.3].forEach(at => recordKill(stats, at, window));
  assert.equal(stats.streak, 4);
  recordKill(stats, 20, window);
  assert.equal(stats.streak, 1);
  recordKill(stats, 21, window);
  assert.equal(stats.kills, 6);
  assert.equal(stats.bestStreak, 4);
});

test('the first kill is a streak of one', () => {
  const stats = createRunStats();
  assert.equal(recordKill(stats, 0, 1.5), 1);
  assert.equal(stats.bestStreak, 1);
});

test('clock and result rows', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(65.9), '1:05');
  assert.equal(formatClock(-3), '0:00');
  const stats = createRunStats();
  recordEggBreak(stats);
  recordEggBreak(stats);
  recordKill(stats, 3, 1.5);
  const defeat = resultRows(stats, { elapsed: 125, level: 7, victory: false });
  assert.deepEqual(defeat.map(row => row.value), ['2:05', '1', '2', '1', 'Lv 7']);
  assert.equal(defeat[0].label, '持ちこたえた時間');
  assert.equal(resultRows(stats, { elapsed: 1, level: 1, victory: true })[0].label, '戦った時間');
});

test('config has the switches to turn it off', () => {
  assert.equal(typeof Config.results.enabled, 'boolean');
  assert.equal(typeof Config.results.quickRetry, 'boolean');
  assert.ok(Config.results.streakWindow > 0);
});
