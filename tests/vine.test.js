import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STAGES } from '../src/campaign.js';
import { Config } from '../src/config.js';
import { buildForecast } from '../src/forecast.js';
import { InputState } from '../src/input.js';
import { VineBindVisual, createVineEnemyModel } from '../src/vines.js';

test('the vine binder is forecast on its first chapter only', () => {
  const from = Config.enemy.vine.fromChapter;
  assert.ok(buildForecast(STAGES[from]).species.some(s => s.name === '縛り蔓'));
  assert.ok(!buildForecast(STAGES[from - 1]).species.some(s => s.name === '縛り蔓'));
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

test('escaping by mashing is noticeably faster than waiting', () => {
  const { bindSeconds, mashSeconds } = Config.enemy.vine;
  const mashesPerSecond = 7;
  const escapeSeconds = bindSeconds / (1 + mashesPerSecond * mashSeconds);
  assert.ok(escapeSeconds < bindSeconds * 0.5, `escape takes ${escapeSeconds.toFixed(2)}s`);
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
