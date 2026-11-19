import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STAGES } from '../src/campaign.js';
import { Config } from '../src/config.js';
import { buildForecast } from '../src/forecast.js';
import { InputState } from '../src/input.js';
import { VineBindVisual, createVineEnemyModel, vineAliveCap, vineStatsForChapter } from '../src/vines.js';

test('the vine binder is forecast on its first chapter only', () => {
  const from = Config.enemy.vine.fromChapter;
  assert.ok(buildForecast(STAGES[from]).species.some(s => s.name === '縛り蔓'));
  assert.ok(!buildForecast(STAGES[from + 1]).species.some(s => s.name === '縛り蔓'));
});

test('the vine binder starts rare and weak in chapter 1 and grows more threatening each chapter', () => {
  const chapters = Object.keys(STAGES).map(Number).sort((a, b) => a - b);
  const tiers = chapters.map(vineStatsForChapter);
  for (let i = 1; i < tiers.length; i++) {
    const [prev, next] = [tiers[i - 1], tiers[i]];
    assert.ok(next.bindSeconds > prev.bindSeconds && next.mashSeconds <= prev.mashSeconds, `chapter ${chapters[i]} binds longer`);
    assert.ok(next.spawnChance > prev.spawnChance && next.maxAlive >= prev.maxAlive, `chapter ${chapters[i]} has more vines`);
    assert.ok(next.windupSeconds < prev.windupSeconds && next.leadMax > prev.leadMax, `chapter ${chapters[i]} aims better`);
  }
  const first = tiers[0];
  assert.equal(first.maxAlive, 1);
  assert.ok(first.bindSeconds / (1 + 7 * first.mashSeconds) < 0.6, 'a few taps shake off a chapter 1 vine');
  // 共通の値も引き継ぐ
  assert.equal(first.grabRadius, Config.enemy.vine.grabRadius);
  assert.equal(vineStatsForChapter(99).bindSeconds, tiers.at(-1).bindSeconds);
});

test('within a match the vine cap grows from one to the chapter maximum', () => {
  const stats = vineStatsForChapter(6);
  assert.equal(vineAliveCap(stats, stats.introAt), 1);
  assert.equal(vineAliveCap(stats, stats.fullAt), stats.maxAlive);
  assert.equal(vineAliveCap(stats, 240), stats.maxAlive);
  const middle = vineAliveCap(stats, (stats.introAt + stats.fullAt) / 2);
  assert.ok(middle > 1 && middle < stats.maxAlive);
  assert.equal(vineAliveCap(vineStatsForChapter(1), 240), 1);
});

test('mashing counts new stick directions and button presses, but not pause or a held stick', () => {
  const input = new InputState(new EventTarget());
  input.setTouchMovement(1, 0);
  assert.equal(input.mashCount(), 1);
  input.endFrame();
  input.setTouchMovement(1, 0.1);
  assert.equal(input.mashCount(), 0);
  input.setTouchMovement(-1, 0);
  input.pressTouchAction('transform');
  input.pressTouchAction('pause');
  assert.equal(input.mashCount(), 2);
  input.endFrame();
  assert.equal(input.mashCount(), 0);
});

test('a key tapped down and up between two frames still counts as a mash', () => {
  const target = new EventTarget();
  const input = new InputState(target);
  const key = (type, code, repeat = false) => target.dispatchEvent(Object.assign(new Event(type), { code, repeat }));
  key('keydown', 'KeyA');
  key('keyup', 'KeyA');
  key('keydown', 'KeyD');
  key('keydown', 'KeyD', true);
  key('keyup', 'KeyD');
  key('keydown', 'KeyR');
  assert.equal(input.mashCount(), 2);
  input.endFrame();
  assert.equal(input.mashCount(), 0);
});

test('escaping by mashing is noticeably faster than waiting in every chapter', () => {
  for (const chapter of Object.keys(STAGES).map(Number)) {
    const { bindSeconds, mashSeconds } = vineStatsForChapter(chapter);
    const mashesPerSecond = 7;
    const escapeSeconds = bindSeconds / (1 + mashesPerSecond * mashSeconds);
    assert.ok(escapeSeconds < bindSeconds * 0.5, `chapter ${chapter}: escape takes ${escapeSeconds.toFixed(2)}s`);
  }
});

test('vine models share geometry between enemies and the bind visual cleans up after itself', () => {
  const a = createVineEnemyModel();
  const b = createVineEnemyModel();
  assert.ok(a.getObjectByName('VineHead') && a.getObjectByName('VineStalk2'));
  assert.equal(a.getObjectByName('VineBud').geometry, b.getObjectByName('VineBud').geometry);

  const scene = new THREE.Scene();
  const visual = new VineBindVisual(scene, new THREE.Vector3(2, 0, 3), new THREE.Vector3(8, 0, 3));
  assert.equal(scene.children.length, 1);
  visual.update(0.1, 0);
  visual.update(1, 0.5);
  for (const part of visual.parts) assert.equal(part.geometry.drawRange.count, part.indexCount - part.indexCount % 6);
  visual.dispose();
  assert.equal(scene.children.length, 0);
});
