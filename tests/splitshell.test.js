import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy } from '../src/entities.js';
import { Config } from '../src/config.js';

const cfg = Config.enemy.splitshell;

function createGame() {
  const game = {
    player: { position: new THREE.Vector3(30, 0, 0), form: 'human', addBurst() {} },
    elapsed: 0,
    splits: [],
    cloneGameplayModel: () => null,
    spawnHitSpark() {},
    playSfx() {},
    spawnXp(position, amount) { game.xp = amount; },
    spawnRandomPickup() {},
    spawnEnemyDissolveEffect() {}
  };
  game.onSplitshellBurst = (shell) => { game.splits.push(shell); };
  return game;
}

test('a split shell splits only when a burst kills it', () => {
  const game = createGame();
  const shot = new Enemy(game, 'splitshell', new THREE.Vector3());
  shot.takeDamage(cfg.hp + 1, null);
  assert.ok(shot.dead);
  assert.equal(game.splits.length, 0, 'normal shots do not split it');

  const burst = new Enemy(game, 'splitshell', new THREE.Vector3());
  burst.takeDamage(cfg.hp + 1, null, true, false);
  assert.ok(burst.dead);
  assert.deepEqual(game.splits, [burst]);
});

test('a half is weaker, ignores bursts for a moment and never splits again', () => {
  const game = createGame();
  const half = new Enemy(game, 'splitshell', new THREE.Vector3());
  half.makeSplitHalf();
  assert.equal(half.maxHp, cfg.hp * cfg.halfScale);

  half.takeDamage(999, null, true, false);
  assert.equal(half.dead, false, 'immune to the burst that split it');

  half.burstImmuneTimer = 0;
  half.takeDamage(999, null, true, false);
  assert.ok(half.dead);
  assert.equal(game.splits.length, 0, 'halves do not split');
  assert.equal(game.xp, cfg.xp * cfg.halfScale);
});
