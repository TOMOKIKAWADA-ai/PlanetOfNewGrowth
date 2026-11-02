import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_TYPES, getBossName, linkSwarm, swarmOnLethal, swarmPositions, updateSwarmMember } from '../src/bosses.js';
import { Config } from '../src/config.js';

const cfg = Config.boss.swarmMother;

// 姉妹の卵の代わり。倒れる・起き上がる・衝撃波の番だけを、ゲーム全体なしで動かす。
function createSwarm() {
  const game = { state: 'playing', downs: [], revives: [], finished: [] };
  game.onSwarmMemberDown = (egg, standing) => game.downs.push(standing);
  game.onSwarmMemberRevive = (egg) => game.revives.push(egg);
  game.onSwarmMemberFinish = (egg) => game.finished.push(egg);
  const members = [0, 1, 2].map((i) => ({
    id: i, game, dead: false, hp: 100, maxHp: 100, shockwaveState: 'idle', shockwaveTimer: 4.5, waves: 0,
    updateMotherShockwave(dt) {
      this.shockwaveTimer -= dt;
      if (this.shockwaveTimer > 0) return;
      if (this.shockwaveState === 'warning') {
        this.shockwaveState = 'idle';
        this.shockwaveTimer = 10;
        this.waves += 1;
      } else {
        this.shockwaveState = 'warning';
        this.shockwaveTimer = 1.6;
      }
    }
  }));
  return { game, members, swarm: linkSwarm(members) };
}

function step(members, seconds, dt = 0.1) {
  for (let t = 0; t < seconds; t += dt) for (const egg of members) updateSwarmMember(egg, dt);
}

test('swarm mother is registered for chapter 4 with its own name', () => {
  assert.equal(BOSS_TYPES.swarmMother.spawnCount, 3);
  assert.equal(getBossName({ boss: 'swarmMother', motherName: '母卵' }), '群れの母');
});

test('a fallen sister stands up again unless the rest fall in time', () => {
  const { game, members } = createSwarm();
  assert.equal(swarmOnLethal(members[0]), true);
  assert.equal(members[0].swarmDown, true);
  assert.deepEqual(game.downs, [2]);
  step(members, cfg.reviveSeconds + 0.2);
  assert.equal(members[0].swarmDown, false);
  assert.equal(members[0].hp, members[0].maxHp * cfg.reviveHpRatio);
  assert.equal(game.revives.length, 1);
});

test('felling all three within the window breaks them together', () => {
  const { game, members } = createSwarm();
  assert.equal(swarmOnLethal(members[0]), true);
  step(members, 3);
  assert.equal(swarmOnLethal(members[1]), true);
  step(members, 3);
  assert.equal(swarmOnLethal(members[2]), false, 'the last one is destroyed normally');
  assert.equal(members[0].dead, true);
  assert.equal(members[1].dead, true);
  assert.deepEqual(game.finished, [members[0], members[1]]);
});

test('only one standing sister charges the shockwave, taking turns', () => {
  const { swarm, members } = createSwarm();
  step(members, 6.5);
  assert.deepEqual(members.map((egg) => egg.waves), [1, 0, 0]);
  assert.equal(swarm.shockwaveOwner, members[1]);
  swarmOnLethal(members[1]);
  assert.equal(swarm.shockwaveOwner, members[2], 'a fallen owner hands the turn on');
});

test('sisters are placed around the spot, pulled in when blocked', () => {
  const points = swarmPositions({ x: 0, z: 0 }, 3, 6, 0, (point) => point.z > 5);
  assert.equal(points.length, 3);
  assert.ok(Math.abs(points[0].z - 4.5) < 1e-9, 'the blocked one moves inward');
  assert.ok(Math.abs(Math.hypot(points[1].x, points[1].z) - 6) < 1e-9);
});
