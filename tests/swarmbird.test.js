import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy } from '../src/entities.js';
import { Config } from '../src/config.js';
import { horizontalDistanceSq } from '../src/math.js';

const cfg = Config.enemy.swarmbird;

function createGame() {
  const game = {
    elapsed: 0,
    hunts: 0,
    hits: 0,
    player: {
      position: new THREE.Vector3(0, 0, 0),
      form: 'human',
      visualHeight: 0,
      phaseTimer: 0,
      damage: 0,
      takeDamage(amount) { this.damage += amount; }
    },
    cloneGameplayModel: () => null
  };
  game.onSwarmbirdHunt = () => { game.hunts += 1; };
  game.onSwarmbirdHit = () => { game.hits += 1; };
  return game;
}

// update() 全体はゲームの多くの部品を使うので、群れ鳥の動きと接触だけを進める。
function step(bird, seconds, dt = 0.05) {
  for (let t = 0; t < seconds; t += dt) {
    bird.game.elapsed += dt;
    bird.attackTimer = Math.max(0, bird.attackTimer - dt);
    bird.updateSwarmbird(dt);
    bird.distanceSqToPlayer = horizontalDistanceSq(bird.position, bird.game.player.position);
    bird.updateContactDamage();
  }
}

test('a swarm bird circles a human player at a distance and never hits', () => {
  const game = createGame();
  const bird = new Enemy(game, 'swarmbird', new THREE.Vector3(0.5, 0, 0));
  step(bird, 4);
  const distance = Math.sqrt(horizontalDistanceSq(bird.position, game.player.position));
  assert.ok(distance > cfg.orbitRadius - 2, `keeps its distance (${distance.toFixed(2)})`);
  assert.equal(bird.swarm.mode, 'orbit');
  assert.ok(Math.abs(bird.swarm.height - cfg.orbitHeight) < 0.01);
  assert.equal(game.player.damage, 0);
  assert.equal(game.hunts, 0);
});

test('a swarm bird hunts a bird-form player after noticing, and backs off when they land', () => {
  const game = createGame();
  const bird = new Enemy(game, 'swarmbird', new THREE.Vector3(cfg.orbitRadius, 0, 0));
  game.player.form = 'bird';
  game.player.visualHeight = Config.player.birdHeight;
  step(bird, cfg.noticeSeconds * 0.5);
  assert.equal(bird.swarm.mode, 'orbit', 'takes a moment to notice');
  step(bird, 3);
  assert.equal(bird.swarm.mode, 'hunt');
  assert.equal(game.hunts, 1);
  assert.ok(game.player.damage > 0, 'hits the bird-form player once it climbs to their height');
  assert.ok(game.hits >= 1);

  game.player.form = 'human';
  game.player.visualHeight = 0;
  const damage = game.player.damage;
  step(bird, 2);
  assert.equal(bird.swarm.mode, 'orbit');
  assert.equal(game.player.damage, damage, 'no hits on a human player');
});
