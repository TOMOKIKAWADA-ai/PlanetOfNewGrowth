import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy, Player } from '../src/entities.js';
import { Config } from '../src/config.js';

const cfg = Config.enemy.rootsucker;

function createGame() {
  const player = { position: new THREE.Vector3(30, 0, 0), form: 'human' };
  const game = { player, elapsed: 0, rooted: 0, cloneGameplayModel: () => null };
  game.onRootsuckerRooted = () => { game.rooted += 1; };
  return game;
}

function step(enemy, seconds, dt = 0.05) {
  for (let t = 0; t < seconds; t += dt) {
    enemy.game.elapsed += dt;
    enemy.updateRootsucker(dt);
  }
}

test('rootsucker roots after a delay and its dry circle grows to the max radius', () => {
  const game = createGame();
  const root = new Enemy(game, 'rootsucker', new THREE.Vector3(0, 0, 0));
  const near = new THREE.Vector3(cfg.dryRadiusStart - 0.5, 0, 0);
  const far = new THREE.Vector3(cfg.dryRadiusMax - 0.5, 0, 0);

  step(root, cfg.rootSeconds - 0.2);
  assert.equal(game.rooted, 0);
  assert.equal(root.dryRadius, 0);
  assert.equal(root.coversDryGround(near), false, 'no dry ground before rooting');

  step(root, 0.4);
  assert.equal(game.rooted, 1);
  assert.ok(root.coversDryGround(near));
  assert.equal(root.coversDryGround(far), false, 'starts small');

  step(root, cfg.growSeconds + 1);
  assert.ok(Math.abs(root.dryRadius - cfg.dryRadiusMax) < 1e-6);
  assert.ok(root.coversDryGround(far));
  assert.equal(game.rooted, 1, 'roots only once');

  root.die(false);
  assert.equal(root.dryRadius, 0, 'the circle goes away when it dies');
  assert.equal(root.coversDryGround(near), false);
});

test('human MP does not regenerate on dry ground but still does elsewhere', () => {
  let dry = true;
  const player = Object.create(Player.prototype);
  Object.assign(player, {
    game: { isOnDryGround: () => dry },
    position: new THREE.Vector3(),
    form: 'human',
    mp: 20,
    maxMp: 100,
    humanRegenMp: 6
  });
  player.updateFormResources(1);
  assert.equal(player.mp, 20 + 6 * cfg.dryRegenScale);
  assert.equal(player.onDryGround, true);

  dry = false;
  const before = player.mp;
  player.updateFormResources(1);
  assert.equal(player.mp, before + 6);
  assert.equal(player.onDryGround, false);
});
