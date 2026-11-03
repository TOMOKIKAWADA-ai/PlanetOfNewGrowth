import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy } from '../src/entities.js';
import { Config } from '../src/config.js';
import { PlayerTrail } from '../src/footprints.js';

const cfg = Config.enemy.footprint;

// プレイヤーが x 方向へ秒速 5 で歩いた道（bird の区間は飛んでいる）
function walkTrail(seconds, birdFrom = Infinity, birdTo = -Infinity) {
  const trail = new PlayerTrail(cfg.trailSeconds, cfg.trailSampleInterval);
  for (let t = 0; t <= seconds + 1e-9; t += 0.05) {
    trail.record(t, t * 5, 0, !(t >= birdFrom && t < birdTo));
  }
  return trail;
}

test('trail interpolates walked points and returns null inside a flight gap', () => {
  const trail = walkTrail(10, 4, 6);
  const point = trail.sampleAt(2.05);
  assert.ok(Math.abs(point.x - 10.25) < 1e-6);
  assert.equal(trail.sampleAt(5), null);
  assert.ok(trail.sampleAt(7));
  assert.ok(Math.abs(trail.nearestTime(15, 0, 9, 1) - 3) < 0.06);
});

test('trail forgets samples older than its window', () => {
  const trail = walkTrail(30);
  assert.ok(trail.oldestTime >= 30 - cfg.trailSeconds - cfg.trailSampleInterval);
  assert.equal(trail.sampleAt(1), null);
});

function createFootprint(game, position) {
  return new Enemy(game, 'footprint', position);
}

test('footprint walks the trail a few seconds behind and loses it at a flight gap', () => {
  const player = { position: new THREE.Vector3(50, 0, 0), form: 'human' };
  const game = { player, elapsed: 0, playerTrail: null, footprintStats: { spawned: 0, lost: 0, hits: 0 }, cloneGameplayModel: () => null };
  game.playerTrail = walkTrail(10, 8, 10);
  const footprint = createFootprint(game, new THREE.Vector3(5, 0, 1));

  // 道に乗るまで、記録が古い分だけ早くなぞる。乗ったあとは delaySeconds 前の地点に重なる。
  for (let t = 4; t <= 7.5; t += 0.05) {
    game.elapsed = t;
    footprint.updateFootprint(0.05);
  }
  assert.equal(footprint.footprint.tracking, true);
  const expected = game.playerTrail.sampleAt(7.5 - cfg.delaySeconds);
  assert.ok(Math.abs(footprint.position.x - expected.x) < 0.6, `x ${footprint.position.x} vs ${expected.x}`);
  assert.ok(Math.abs(footprint.position.z) < 0.2);

  // 道が途切れた（鳥形態の区間）所まで来ると見失う
  for (let t = 7.55; t <= 11.5; t += 0.05) {
    game.elapsed = t;
    footprint.updateFootprint(0.05);
  }
  assert.equal(footprint.footprint.tracking, false);
  assert.equal(game.footprintStats.lost, 1);
});
