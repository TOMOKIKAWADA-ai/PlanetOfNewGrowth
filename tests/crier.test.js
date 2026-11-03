import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy } from '../src/entities.js';
import { Config } from '../src/config.js';

const cfg = Config.enemy.crier;

function createGame() {
  const player = { position: new THREE.Vector3(30, 0, 0), form: 'human' };
  const game = { player, elapsed: 0, swells: 0, cries: 0, cloneGameplayModel: () => null };
  game.onCrierSwell = () => { game.swells += 1; };
  game.onCrierCry = () => { game.cries += 1; };
  return game;
}

test('crier stays put, swells before it cries, and cries every interval', () => {
  const game = createGame();
  const crier = new Enemy(game, 'crier', new THREE.Vector3(0, 0, 0));
  const start = crier.position.clone();
  const baseScale = crier.model.scale.x;
  crier.crier.timer = cfg.swellSeconds + 0.5;

  let maxScale = baseScale;
  for (let t = 0; t < 0.5 + cfg.swellSeconds - 0.05; t += 0.05) {
    crier.updateCrier(0.05);
    maxScale = Math.max(maxScale, crier.model.scale.x);
  }
  assert.equal(game.swells, 1);
  assert.equal(game.cries, 0);
  assert.ok(maxScale > baseScale * (1 + cfg.swellScale * 0.7), `swelled to ${maxScale}`);

  crier.updateCrier(0.1);
  assert.equal(game.cries, 1);
  assert.ok(Math.abs(crier.model.scale.x - baseScale) < 1e-6, 'shrinks back after crying');

  for (let t = 0; t < cfg.cryInterval; t += 0.05) crier.updateCrier(0.05);
  assert.equal(game.cries, 2);
  assert.equal(game.swells, 2);
  assert.ok(crier.position.distanceTo(start) < 1e-9);
});
