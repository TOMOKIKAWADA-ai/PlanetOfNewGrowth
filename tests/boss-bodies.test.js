import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Egg } from '../src/entities.js';
import { Config } from '../src/config.js';
import { isMotherCharging, linkSwarm, motherBeatSqueeze } from '../src/bosses.js';

const BODY_CLIPS = { idle: 2, walk: 1.2, attack: 2.6, hit: 0.37, die: 1.4, revive: 1, surface: 0.8, stun: 1.6 };

function createBody(animated = true) {
  const model = new THREE.Group();
  const joint = new THREE.Object3D();
  joint.name = 'Joint';
  model.add(joint);
  if (animated) {
    model.animations = Object.entries(BODY_CLIPS).map(([name, duration]) => new THREE.AnimationClip(name, duration, [
      new THREE.NumberKeyframeTrack('Joint.position[y]', [0, duration], [0, 0.1])
    ]));
  }
  return model;
}

function createMother(boss, { animated = true, tripo = true } = {}) {
  const requested = [];
  const game = {
    state: 'playing',
    stage: { boss },
    player: { position: new THREE.Vector3(0, 0, 20), dead: false, form: 'human', takeDamage: () => {} },
    tripoEnemyModelsEnabled: tripo,
    isWaterPosition: () => false,
    isBlockedByBuilding: () => false,
    cloneGameplayModel: (key) => {
      requested.push(key);
      return key === 'motherEgg' ? new THREE.Group() : createBody(animated);
    },
    hud: { showBossWarning: () => {} },
    spawnMotherShockwaveWarning: () => {},
    spawnMotherShockwave: () => {},
    playSfx: () => {},
    spawnHitSpark: () => {},
    onPursuerLayStart(mother, seconds) {
      const clip = mother.creatureActions?.attack?.getClip();
      if (clip) mother.playCreatureOneShot('attack', { timeScale: clip.duration / seconds });
    },
    onPursuerLayEnd: () => {},
    onSwarmMemberDown: () => {},
    onSwarmMemberRevive: () => {}
  };
  const mother = new Egg(game, new THREE.Vector3(), true);
  return { game, mother, requested };
}

test('bone-less mothers beat harder while charging a move', () => {
  const peak = (charge) => Math.max(...Array.from({ length: 64 }, (_, i) => Math.abs(motherBeatSqueeze(i / 64 * Math.PI * 2, charge))));
  assert.ok(peak(1) > peak(0) * 2, 'the charge beat is much bigger than the resting beat');
  assert.ok(peak(1) < 0.15, 'even the charge beat keeps the shape');
  assert.equal(isMotherCharging({ shockwaveState: 'idle' }), false);
  assert.equal(isMotherCharging({ shockwaveState: 'warning' }), true);
  assert.equal(isMotherCharging({ shockwaveState: 'idle', thirst: { state: 'draining' } }), true);
});

test('the chapter-one mother egg keeps its egg body and beats', () => {
  const { mother, requested } = createMother('motherEgg');
  assert.deepEqual(requested, ['motherEgg']);
  assert.equal(mother.creatureModel, undefined);
  const before = mother.model.scale.y;
  mother.update(0.3);
  assert.notEqual(mother.model.scale.y, before);
});

test('bosses with a body key wear their Tripo body, and keep the egg when Tripo bodies are off', () => {
  for (const [boss, key] of [['pursuer', 'pursuerBody'], ['floodgateMother', 'floodgateMotherBody'], ['swarmMother', 'swarmMotherBody']]) {
    const { mother, requested } = createMother(boss);
    assert.ok(requested.includes(key), boss);
    assert.equal(mother.creatureModel, true, boss);
    const off = createMother(boss, { tripo: false });
    assert.ok(!off.requested.includes(key), boss);
  }
  // 渇きの母の繭は骨が無いので、生き物の体にはならず拍動する
  const { mother, requested } = createMother('thirstMother', { animated: false });
  assert.ok(requested.includes('thirstMotherBody'));
  assert.equal(mother.creatureModel, undefined);
});

test('the pursuer body walks while chasing and plays its laying move for the whole stop', () => {
  const { mother } = createMother('pursuer');
  mother.update(0.1);
  assert.equal(mother.creatureBase, 'walk');
  mother.pursuit.timer = 0.01;
  mother.update(0.05);
  assert.equal(mother.pursuit.state, 'laying');
  assert.equal(mother.creatureOneShot, mother.creatureActions.attack);
  const layScale = BODY_CLIPS.attack / Config.boss.pursuer.layDuration;
  assert.ok(Math.abs(mother.creatureActions.attack.timeScale - layScale) < 1e-6);
  for (let i = 0; i < 5; i++) mother.update(0.1);
  assert.equal(mother.creatureBase, 'idle', 'standing still while laying');
});

test('the floodgate body sinks while submerged and reels while surfaced', () => {
  const { mother } = createMother('floodgateMother');
  mother.floodgate = { state: 'submerged', timer: 0, bites: 0, streamTimer: 99, surfaces: 0 };
  mother.update(0.1);
  const sunk = mother.model.position.y;
  assert.equal(mother.creatureBase, 'idle');
  mother.floodgate.state = 'surfaced';
  mother.floodgate.timer = 5;
  for (let i = 0; i < 10; i++) mother.update(0.1);
  assert.equal(mother.creatureBase, 'stun');
  assert.ok(mother.model.position.y > sunk + 1);
});

test('a fallen swarm sister holds her die pose until she rises again', () => {
  const sisters = [createMother('swarmMother').mother, createMother('swarmMother').mother];
  linkSwarm(sisters);
  const [sister] = sisters;
  sister.swarmDown = true;
  sister.swarmDownTimer = 10;
  sister.update(0.1);
  assert.equal(sister.creatureOneShot, sister.creatureActions.die);
  for (let i = 0; i < 20; i++) sister.update(0.1);
  assert.equal(sister.creatureOneShot, sister.creatureActions.die, 'still down after the clip ends');
  sister.swarmDownTimer = 0.01;
  sister.update(0.05);
  assert.equal(sister.swarmDown, false);
  sister.update(0.01);
  assert.equal(sister.creatureOneShot, sister.creatureActions.revive);
  for (let i = 0; i < 15; i++) sister.update(0.1);
  assert.equal(sister.creatureOneShot, null);
});
