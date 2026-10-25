import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Enemy } from '../src/entities.js';
import { Config } from '../src/config.js';

const CLIP_LENGTHS = { idle: 4, walk: 1, attack: 0.7, hit: 0.37, die: 1.2 };

function createAnimatedModel() {
  const model = new THREE.Group();
  const hip = new THREE.Object3D();
  hip.name = 'Hip';
  model.add(hip);
  model.animations = Object.entries(CLIP_LENGTHS).map(([name, duration]) => new THREE.AnimationClip(name, duration, [
    new THREE.NumberKeyframeTrack('Hip.position[y]', [0, duration], [0, 0.1])
  ]));
  return model;
}

function createEnemy(type) {
  const player = {
    position: new THREE.Vector3(0, 0, 10),
    phaseTimer: 0,
    form: 'human',
    dead: false,
    visualHeight: 0,
    takeDamage: () => {},
    addBurst: () => {}
  };
  const game = {
    player,
    scene: new THREE.Scene(),
    effects: [],
    elapsed: 0,
    projectiles: 0,
    cloneGameplayModel: () => createAnimatedModel(),
    spawnHitSpark: () => {},
    playSfx: () => {},
    spawnXp: () => {},
    spawnRandomPickup: () => {},
    spawnEnemyDissolveEffect: () => {},
    spawnEnemyProjectile: () => { game.projectiles++; },
    spawnDust: () => {},
    countEggsNear: () => 0,
    findEggSpawnPosition: () => new THREE.Vector3(3, 0, 0),
    spawnEgg: () => ({})
  };
  return { game, player, enemy: new Enemy(game, type, new THREE.Vector3()) };
}

for (const type of ['chaser', 'shooter', 'sniper', 'guardian', 'spawner']) {
  test(`${type} walks while moving and idles while standing still`, () => {
    const { enemy } = createEnemy(type);
    assert.equal(enemy.activeModelAction, enemy.modelActions.walk);

    enemy.updateLocomotionAnimation(0.1);
    assert.equal(enemy.activeModelAction, enemy.modelActions.idle);

    enemy.position.z += enemy.speed * 0.1;
    enemy.updateLocomotionAnimation(0.1);
    assert.equal(enemy.activeModelAction, enemy.modelActions.walk);
  });

  test(`${type} flinches when damaged without restarting an ongoing flinch`, () => {
    const { enemy } = createEnemy(type);
    enemy.takeDamage(1);
    assert.equal(enemy.activeModelAction, enemy.modelActions.hit);
    enemy.updateModelAnimation(0.2);
    const remaining = enemy.modelAnimationTimer;
    enemy.takeDamage(1);
    assert.equal(enemy.modelAnimationTimer, remaining);
  });

  test(`killed ${type} leaves a corpse that plays the death clip and then disappears`, () => {
    const { enemy, game } = createEnemy(type);
    const model = enemy.model;
    enemy.takeDamage(enemy.maxHp);
    assert.equal(enemy.dead, true);
    assert.equal(enemy.activeModelAction, enemy.modelActions.die);
    assert.equal(game.effects.length, 1);
    const effect = game.effects[0];
    assert.equal(effect.dispose, false);
    assert.equal(model.parent, effect.object);
    assert.equal(effect.object.parent, game.scene);

    for (let t = 0; t < effect.duration; t += 0.1) effect.update(effect, 0.1);
    assert.ok(effect.life <= 0);
    assert.ok(model.position.y < -0.5);
  });
}

test('melee enemies attack on contact and return to their locomotion clip', () => {
  for (const type of ['chaser', 'guardian']) {
    const { enemy, player } = createEnemy(type);
    player.position.set(0, 0, 0.5);
    enemy.distanceSqToPlayer = 0.25;
    enemy.updateContactDamage();
    assert.equal(enemy.activeModelAction, enemy.modelActions.attack, type);

    enemy.updateModelAnimation(CLIP_LENGTHS.attack + 0.01);
    assert.equal(enemy.activeModelAction, enemy.modelActions.walk, type);
  }
});

test('shooter fires after the attack wind-up', () => {
  const { enemy, game } = createEnemy('shooter');
  enemy.beginShooterAttack(new THREE.Vector3(0, 0, 10));
  assert.equal(enemy.activeModelAction, enemy.modelActions.attack);
  assert.equal(game.projectiles, 0);
  for (let i = 0; i < 5; i++) enemy.updateShooter(0.05);
  assert.equal(game.projectiles, 1);
});

test('spawner plays its laying clip when an egg is laid', () => {
  const { enemy } = createEnemy('spawner');
  enemy.tryLayEgg();
  assert.equal(enemy.activeModelAction, enemy.modelActions.attack);
});

test('enemy animation speed follows each type setting', () => {
  const { enemy } = createEnemy('spawner');
  enemy.position.z += Config.enemy.spawner.walkAnimationSpeed * 0.1;
  enemy.updateLocomotionAnimation(0.1);
  assert.ok(Math.abs(enemy.modelActions.walk.timeScale - 1) < 1e-6);
});
