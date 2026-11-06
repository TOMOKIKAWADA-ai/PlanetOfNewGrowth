import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/campaign.js';
import { Config } from '../src/config.js';
import { buildForecast } from '../src/forecast.js';

test('the forecast names the chapter boss and its hint, falling back to the mother egg for unbuilt bosses', () => {
  const first = buildForecast(STAGES[1]);
  assert.equal(first.boss.name, '母卵');
  assert.match(first.boss.hint, /鳥形態/);
  assert.equal(buildForecast(STAGES[5]).boss.name, '渇きの母');
  assert.match(buildForecast(STAGES[5]).boss.hint, /卵を吸って/);
  assert.equal(buildForecast({ ...STAGES[6], boss: 'notBuiltYet' }).boss.hint, first.boss.hint);
  assert.match(buildForecast(STAGES[6]).boss.hint, /花弁/);
  assert.equal(buildForecast(STAGES[3]).boss.name, '水門の母');
  assert.equal(buildForecast(STAGES[2]).boss.name, '追い手');
  assert.equal(buildForecast(STAGES[6]).boss.name, '白蓮の核');
});

test('a new species is forecast only on the chapter it first appears and only while enabled', () => {
  const from = Config.egg.mimic.fromChapter;
  // 第5章は吸水根（E13）も同じ章から出る
  const sameChapter = Config.enemy.rootsucker.fromChapter === from ? ['吸水根'] : [];
  assert.deepEqual(buildForecast(STAGES[from]).species.map(s => s.name), ['擬態卵', ...sameChapter]);
  assert.equal(buildForecast(STAGES[1]).species.length, 0);
  if (STAGES[from + 1]) assert.equal(buildForecast(STAGES[from + 1]).species.length, 0);
  Config.egg.mimic.enabled = false;
  try {
    assert.deepEqual(buildForecast(STAGES[from]).species.map(s => s.name), sameChapter);
  } finally {
    Config.egg.mimic.enabled = true;
  }
});

test('what the eggs learned is empty until E6 records it', () => {
  assert.deepEqual(buildForecast(STAGES[1]).learned, []);
  assert.deepEqual(buildForecast(STAGES[1], ['空を見上げる卵が増えた']).learned, ['空を見上げる卵が増えた']);
});
