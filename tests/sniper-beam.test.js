import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy, Projectile } from '../src/entities.js';
import { Config } from '../src/config.js';
import { horizontalPointSegmentDistanceSq } from '../src/math.js';

function createPlayer(form = 'human') {
  return {
    position: new THREE.Vector3(0, 0, 15),
    visualHeight: form === 'bird' ? Config.player.birdHeight : 0,
    form,
    dead: false,
    invincibleTimer: 0,
    damage: 0,
    takeDamage(amount) { this.damage += amount; }
  };
}

function createGame(player) {
  const game = {
    player,
    shots: [],
    cloneGameplayModel: () => null,
    findBuildingHit: () => null,
    releaseProjectile: (projectile) => {
      projectile.active = false;
      projectile.dead = true;
    },
    spawnSniperProjectile(origin, target, stats) {
      const projectile = new Projectile(game, new THREE.MeshBasicMaterial());
      const start = origin.clone();
      start.y = 1.4;
      projectile.reset(start, target, {
        kind: 'enemy',
        damage: stats.damage,
        speed: stats.bulletSpeed,
        radius: stats.bulletRadius,
        life: stats.bulletLife,
        homingTurnRate: stats.homingTurnRate,
        birdHitBonus: stats.birdHitBonus
      });
      game.shots.push(projectile);
    }
  };
  return game;
}

function createSniper(game) {
  const sniper = new Enemy(game, 'sniper', new THREE.Vector3());
  sniper.fireTimer = 0;
  return sniper;
}

// Runs one warning + shot cycle while the player keeps moving sideways.
function simulateShot(form, playerSpeed, { landAfter = Infinity } = {}) {
  const player = createPlayer(form);
  const game = createGame(player);
  const sniper = createSniper(game);
  const dt = 1 / 60;
  let time = 0;
  for (let i = 0; i < 240; i++) {
    time += dt;
    player.position.x += playerSpeed * dt;
    if (time >= landAfter && player.form === 'bird') {
      player.form = 'human';
      player.visualHeight = 0;
    }
    sniper.updateSniper(dt);
    for (const shot of game.shots) shot.update(dt);
  }
  return { player, game, sniper };
}

test('beam collision stops at its endpoint', () => {
  const start = { x: 0, z: 0 };
  const end = { x: 0, z: 20 };
  assert.equal(horizontalPointSegmentDistanceSq({ x: 0, z: 23 }, start, end), 9);
  assert.ok(Math.abs(horizontalPointSegmentDistanceSq({ x: 1.3, z: 10 }, start, end) - 1.69) < 1e-9);
});

test('sniper shows a warning line, locks, then fires exactly one shot', () => {
  const player = createPlayer('human');
  const game = createGame(player);
  const sniper = createSniper(game);
  sniper.updateSniper(0.1);
  assert.equal(sniper.beamState, 'warning');
  assert.equal(sniper.beamWarning.visible, true);
  assert.equal(sniper.beamLock.visible, false);
  assert.equal(game.shots.length, 0);

  player.position.x = 5;
  const steps = Math.round((Config.enemy.sniper.warningSeconds - Config.enemy.sniper.warningLockSeconds) / 0.05);
  for (let i = 0; i < steps; i++) sniper.updateSniper(0.05);
  assert.equal(sniper.beamLock.visible, true);
  assert.equal(sniper.beamWarning.visible, false);
  assert.ok(sniper.beamAim > 0);

  const lockedAim = sniper.beamAim;
  player.position.x = -5;
  sniper.updateSniper(0.05);
  assert.equal(sniper.beamAim, lockedAim);

  for (let i = 0; i < 10; i++) sniper.updateSniper(0.05);
  assert.equal(sniper.beamState, 'idle');
  assert.equal(sniper.beam.visible, false);
  assert.equal(game.shots.length, 1);
});

test('a standing human gets hit', () => {
  const { player, game } = simulateShot('human', 0);
  assert.equal(game.shots.length, 1);
  assert.equal(player.damage, Config.enemy.sniper.damage);
});

test('a running human dodges because the shot does not home on foot', () => {
  const { player, game } = simulateShot('human', Config.player.humanSpeed);
  assert.equal(game.shots.length, 1);
  assert.equal(game.shots[0].homingTurnRate, 0);
  assert.equal(player.damage, 0);
});

test('the same shot homes onto a flying bird', () => {
  const { player } = simulateShot('bird', Config.player.birdSpeed);
  assert.equal(player.damage, Config.enemy.sniper.damage);
});

test('landing mid-flight breaks the homing lock', () => {
  const lockSeconds = Config.enemy.sniper.warningSeconds + 0.05;
  const { player, game } = simulateShot('bird', Config.player.birdSpeed, { landAfter: lockSeconds });
  assert.equal(game.shots.length, 1);
  assert.equal(game.shots[0].homingTurnRate, 0);
  assert.equal(player.damage, 0);
});
