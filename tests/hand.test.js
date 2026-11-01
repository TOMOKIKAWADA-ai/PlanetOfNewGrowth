import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy, Player } from '../src/entities.js';
import { Config } from '../src/config.js';

const cfg = Config.enemy.hand;

// Player の掴まれ処理だけを、ゲーム全体なしで動かす。
function createPlayer(game) {
  const player = Object.create(Player.prototype);
  Object.assign(player, {
    game,
    position: new THREE.Vector3(0, 0, 0),
    form: 'human',
    dead: false,
    phaseTimer: 0,
    mp: 50,
    grabbedBy: null,
    grabTimer: 0,
    damage: 0,
    takeDamage(amount) { this.damage += amount; }
  });
  return player;
}

function createGame() {
  const game = { elapsed: 0, windups: 0, misses: 0, releases: [], cloneGameplayModel: () => null };
  game.onHandWindup = () => { game.windups += 1; };
  game.onHandMiss = () => { game.misses += 1; };
  game.onPlayerReleased = (hand, reason) => { game.releases.push(reason); };
  game.player = createPlayer(game);
  return game;
}

function step(hand, seconds, dt = 0.05) {
  for (let t = 0; t < seconds; t += dt) {
    hand.updateHand(dt);
    hand.game.player.updateGrab(dt);
  }
}

test('hand winds up, grabs a human player, and lets go when the player transforms', () => {
  const game = createGame();
  const hand = new Enemy(game, 'hand', new THREE.Vector3(cfg.reach - 1, 0, 0));
  hand.hand.cooldown = 0;
  hand.updateHand(0.05);
  assert.equal(hand.hand.state, 'windup');
  assert.equal(game.windups, 1);
  step(hand, cfg.windupSeconds + 0.1);
  assert.equal(game.player.grabbedBy, hand, 'grabbed after the wind-up');
  assert.equal(game.player.damage, cfg.grabDamage);
  assert.ok(hand.arm.visible, 'arm reaches the player while holding');

  game.player.form = 'bird';
  step(hand, 0.1);
  assert.equal(game.player.grabbedBy, null);
  assert.deepEqual(game.releases, ['shaken']);
  assert.equal(hand.hand.state, 'approach');
  assert.ok(hand.hand.cooldown > 0, 'rests before reaching again');
});

test('hand misses a bird and lets go of a human after holdSeconds', () => {
  const game = createGame();
  const hand = new Enemy(game, 'hand', new THREE.Vector3(2, 0, 0));
  hand.hand.cooldown = 0;
  hand.updateHand(0.05);
  game.player.form = 'bird';
  step(hand, cfg.windupSeconds + 0.1);
  assert.equal(game.player.grabbedBy, null, 'a bird in the air cannot be grabbed');
  assert.equal(game.misses, 1);

  game.player.form = 'human';
  hand.hand.cooldown = 0;
  step(hand, cfg.windupSeconds + 0.2);
  assert.equal(game.player.grabbedBy, hand);
  step(hand, cfg.holdSeconds + 0.1);
  assert.equal(game.player.grabbedBy, null);
  assert.deepEqual(game.releases, ['timeout']);
});
