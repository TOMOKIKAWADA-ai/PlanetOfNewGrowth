import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy } from '../src/entities.js';
import { Config } from '../src/config.js';
import { horizontalPointSegmentDistanceSq } from '../src/math.js';

function createSniper(player) {
  const game = { player, cloneGameplayModel: () => null };
  return new Enemy(game, 'sniper', new THREE.Vector3());
}

test('beam collision stops at its endpoint', () => {
  const start = { x: 0, z: 0 };
  const end = { x: 0, z: 20 };
  assert.equal(horizontalPointSegmentDistanceSq({ x: 0, z: 23 }, start, end), 9);
  assert.ok(Math.abs(horizontalPointSegmentDistanceSq({ x: 1.3, z: 10 }, start, end) - 1.69) < 1e-9);
});

test('sniper warns before firing and tracks the player', () => {
  const player = {
    position: new THREE.Vector3(0, 0, 15),
    visualHeight: 0,
    form: 'human',
    takeDamage: () => {}
  };
  const sniper = createSniper(player);
  sniper.fireTimer = 0;
  sniper.updateSniper(0.1);
  assert.equal(sniper.beamState, 'warning');
  assert.equal(sniper.beamWarning.visible, true);
  assert.equal(sniper.beamCore.visible, false);

  player.position.x = 5;
  for (let i = 0; i < 12; i++) sniper.updateSniper(0.1);
  assert.equal(sniper.beamState, 'firing');
  assert.equal(sniper.beamCore.visible, true);
  assert.ok(sniper.beamAim > 0);
});

test('ground target trails a moving player while bird tracking stays immediate', () => {
  const player = {
    position: new THREE.Vector3(0, 0, 15),
    visualHeight: 0,
    form: 'human',
    takeDamage: () => {}
  };
  const sniper = createSniper(player);
  sniper.fireTimer = 0;
  sniper.updateSniper(0.1);
  player.position.x = 6;
  sniper.updateSniper(0.1);
  const groundAim = sniper.beamAim;

  sniper.beamAim = 0;
  player.form = 'bird';
  player.visualHeight = 8.5;
  sniper.updateSniper(0.1);
  assert.ok(groundAim > 0);
  assert.ok(sniper.beamAim > groundAim * 2);
  assert.equal(sniper.beamTrackedTarget.x, player.position.x);
});

test('a moving ground player can outrun the beam while the same path catches a bird', () => {
  const simulate = (form) => {
    let damage = 0;
    const player = {
      position: new THREE.Vector3(0, 0, 15),
      visualHeight: form === 'bird' ? 8.5 : 0,
      form,
      takeDamage: (amount) => { damage += amount; }
    };
    const sniper = createSniper(player);
    sniper.fireTimer = 0;
    sniper.updateSniper(0.05);
    for (let i = 0; i < 36; i++) {
      player.position.x += 0.3;
      sniper.updateSniper(0.05);
    }
    return damage;
  };

  assert.equal(simulate('human'), 0);
  assert.ok(simulate('bird') > 0);
});

test('bird form is easier to catch at the edge of the beam', () => {
  let damage = 0;
  const player = {
    position: new THREE.Vector3(1.3, 0, 10),
    visualHeight: 0,
    form: 'human',
    takeDamage: (amount) => { damage += amount; }
  };
  const sniper = createSniper(player);
  sniper.beamState = 'firing';
  sniper.beamTimer = 0.5;
  sniper.beamAim = 0;
  sniper.fireTimer = 5;
  sniper.updateSniper(0.001);
  assert.equal(damage, 0);

  player.form = 'bird';
  player.visualHeight = 8.5;
  sniper.beamAim = 0;
  sniper.updateSniper(0.001);
  assert.equal(damage, Config.enemy.sniper.damage);
});
