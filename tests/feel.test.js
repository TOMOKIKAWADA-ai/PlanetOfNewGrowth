import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy, Player } from '../src/entities.js';
import { Config } from '../src/config.js';

// A3 手触り: 被弾と撃破から、ゲーム側のヒットストップ・揺れ・赤い縁の入口が呼ばれることを確かめる。
function createGame() {
  const game = { state: 'playing', calls: [], player: { addBurst() {} } };
  game.onPlayerHurt = () => game.calls.push('hurt');
  game.feelHit = (kind) => game.calls.push(kind);
  game.playSfx = () => {};
  game.playVoice = () => {};
  game.showMessage = () => {};
  game.spawnRingEffect = () => {};
  game.spawnXp = () => {};
  game.spawnRandomPickup = () => {};
  game.spawnEnemyDissolveEffect = () => {};
  return game;
}

function createPlayer(game) {
  const player = Object.create(Player.prototype);
  Object.assign(player, {
    game, dead: false, hp: 100, invincibleTimer: 0, shieldCharges: 0, damageTakenMultiplier: 1,
    damageFlashTimer: 0, playOneShotAnimation() {}
  });
  return player;
}

function createEnemy(game, type) {
  const enemy = Object.create(Enemy.prototype);
  Object.assign(enemy, {
    game, type, dead: false, object: { visible: true }, position: new THREE.Vector3(),
    splitHalf: false, spawnDeathCorpse() {}
  });
  return enemy;
}

test('player hit calls onPlayerHurt, a shield block does not', () => {
  const game = createGame();
  const player = createPlayer(game);
  player.takeDamage(10);
  assert.deepEqual(game.calls, ['hurt']);
  player.invincibleTimer = 0;
  player.shieldCharges = 1;
  player.takeDamage(10);
  assert.deepEqual(game.calls, ['hurt']);
});

test('enemy kill uses bigKill for spawner and shadow, enemyKill otherwise', () => {
  const game = createGame();
  createEnemy(game, 'chaser').die(true);
  createEnemy(game, 'spawner').die(true);
  createEnemy(game, 'chaser').die(false);
  assert.deepEqual(game.calls, ['enemyKill', 'bigKill']);
});

test('feel config keeps the hit stop short', () => {
  const stop = Config.feel.hitStop;
  for (const key of ['enemyKill', 'bigKill', 'eggBreak', 'playerHit']) {
    assert.ok(stop[key] <= stop.maxSeconds, key);
  }
  assert.ok(stop.maxSeconds <= 0.12);
  assert.ok(stop.timeScale >= 0 && stop.timeScale < 1);
});
