// 章ごとのボスの種類。ステージ設定（src/campaign.js の STAGES）の `boss` でここの種類を選ぶ。
// ボスの体は今のところすべて母卵の卵（Egg の isMother）を使い、動きだけを種類ごとに差し替える。
// 新しいボスは docs/enemy-boss-design.md の表に沿って、ここに1種ずつ足す。
import { Config } from './config.js';

export const BOSS_TYPES = Object.freeze({
  // 第1章のボス。一定の間隔で地面を走る衝撃波を出す。鳥形態なら当たらない。
  motherEgg: Object.freeze({
    id: 'motherEgg',
    // 出撃前の孵化予報（src/forecast.js）に出す一言。
    forecast: '動かない。地面を走る衝撃波は、鳥形態で浮けば当たらない',
    update(egg, dt) {
      egg.updateMotherShockwave(dt);
    }
  }),
  // 第5章のボス。衝撃波に加えて、近くの卵を光の管でつないで吸い、吸いきると回復する。
  // 吸い終わる前にプレイヤーが卵を壊せば（陸は鳥、水中は魚で食べるのが速い）、その分は回復できない。
  thirstMother: Object.freeze({
    id: 'thirstMother',
    name: '渇きの母',
    forecast: '周りの卵を吸って回復する。光の管でつながった卵を、鳥や魚で先に食べよう',
    update(egg, dt) {
      egg.updateMotherShockwave(dt);
      updateThirstDrain(egg, dt);
    }
  }),
  // 第2章のボス。衝撃波は出さず、プレイヤーをゆっくり追う。数秒ごとに立ち止まって卵を産み、そのあいだだけ殻が開く。
  // 殻が閉じているあいだは攻撃がほとんど効かない。触れるとダメージ（鳥形態で浮いていれば当たらない）。
  pursuer: Object.freeze({
    id: 'pursuer',
    name: '追い手',
    forecast: 'ゆっくり追ってくる。立ち止まって卵を産むあいだだけ殻が開く。止まった瞬間に撃とう',
    update(egg, dt) {
      updatePursuer(egg, dt);
    },
    damageScale(egg) {
      return pursuerDamageScale(egg.pursuit?.state, Config.boss.pursuer);
    }
  })
});

export const DEFAULT_BOSS = 'motherEgg';

// まだ作っていないボス（追い手・水門の母など）を指定した章は、母卵の動きで戦う。
export function getBossType(id) {
  return BOSS_TYPES[id] ?? BOSS_TYPES[DEFAULT_BOSS];
}

export function isBossImplemented(id) {
  return Object.hasOwn(BOSS_TYPES, id);
}

// 画面に出すボスの名前。種類に `name` があればそれ（例: 追い手）、なければ章の motherName（母卵・白蓮の核）。
// 各ボスを作るときに `name` を足す（2026-10-25 ユーザー承認）。
export function getBossName(stage) {
  const type = isBossImplemented(stage?.boss) ? BOSS_TYPES[stage.boss] : null;
  return type?.name ?? stage?.motherName ?? '母卵';
}

// 渇きの母が吸う卵: 近い順に count 個まで。第5章は水辺なので、水中の卵（魚で噛める）も吸う。
export function pickDrainTargets(eggs, center, range, count) {
  const rangeSq = range * range;
  const candidates = [];
  for (const egg of eggs) {
    if (egg.dead || egg.isMother) continue;
    const dx = egg.position.x - center.x;
    const dz = egg.position.z - center.z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq <= rangeSq) candidates.push({ egg, distanceSq });
  }
  candidates.sort((a, b) => a.distanceSq - b.distanceSq);
  return candidates.slice(0, count).map((entry) => entry.egg);
}

export function drainHealAmount(maxHp, consumedCount, healRatioPerEgg) {
  return maxHp * healRatioPerEgg * consumedCount;
}

// idle → (間隔が来たら近くの卵を選ぶ) → draining → (吸い終わりに残っている卵だけ回復に変える) → idle
export function updateThirstDrain(mother, dt) {
  const game = mother.game;
  if (game.state !== 'playing') return;
  const cfg = Config.boss.thirstMother;
  const thirst = mother.thirst ??= { state: 'idle', timer: cfg.firstDelay, targets: [] };
  thirst.timer -= dt;
  if (thirst.timer > 0) return;
  if (thirst.state === 'draining') {
    const consumed = thirst.targets.filter((egg) => !egg.dead);
    for (const egg of consumed) game.consumeEggForBoss(egg);
    const heal = Math.min(drainHealAmount(mother.maxHp, consumed.length, cfg.healRatioPerEgg), mother.maxHp - mother.hp);
    mother.hp += heal;
    game.onThirstDrainEnd(mother, consumed.length, thirst.targets.length, heal);
    thirst.state = 'idle';
    thirst.targets = [];
    thirst.timer = cfg.interval;
    return;
  }
  const targets = pickDrainTargets(game.eggs, mother.position, cfg.range, cfg.count);
  if (targets.length === 0) {
    thirst.timer = cfg.retryDelay;
    return;
  }
  thirst.state = 'draining';
  thirst.timer = cfg.drainSeconds;
  thirst.targets = targets;
  game.onThirstDrainStart(mother, targets, cfg.drainSeconds);
}

export function pursuerDamageScale(state, cfg) {
  return state === 'laying' ? cfg.openDamageScale : cfg.closedDamageScale;
}

// 追い手の一歩: プレイヤーへ向かって step だけ進む。建物に当たるなら x・z の片方だけで滑る。どちらも塞がれていれば止まる。
export function pursuerStep(from, target, step, stopDistance, isBlocked) {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= stopDistance || distance === 0) return null;
  const move = Math.min(step, distance - stopDistance);
  const mx = dx / distance * move;
  const mz = dz / distance * move;
  for (const [x, z] of [[mx, mz], [mx, 0], [0, mz]]) {
    if (x === 0 && z === 0) continue;
    const next = { x: from.x + x, z: from.z + z };
    if (!isBlocked(next)) return next;
  }
  return null;
}

// chasing → (間隔が来たら立ち止まって後ろに卵を産む) → laying（殻が開く） → chasing
export function updatePursuer(mother, dt) {
  const game = mother.game;
  if (game.state !== 'playing') return;
  const cfg = Config.boss.pursuer;
  const pursuit = mother.pursuit ??= { state: 'chasing', timer: cfg.firstLayDelay, contactTimer: 0, walk: 0 };
  const player = game.player;
  pursuit.timer -= dt;
  pursuit.contactTimer = Math.max(0, pursuit.contactTimer - dt);
  if (pursuit.state === 'laying') {
    if (pursuit.timer <= 0) {
      pursuit.state = 'chasing';
      pursuit.timer = cfg.layInterval;
      game.onPursuerLayEnd?.(mother);
    }
  } else if (pursuit.timer <= 0) {
    pursuit.state = 'laying';
    pursuit.timer = cfg.layDuration;
    game.onPursuerLayStart?.(mother, cfg.layDuration);
  } else if (player && !player.dead) {
    const limit = Config.map.radius - cfg.mapMargin;
    const next = pursuerStep(mother.position, player.position, cfg.speed * dt, cfg.stopDistance,
      (point) => Math.hypot(point.x, point.z) > limit || game.isBlockedByBuilding(point, cfg.bodyRadius));
    if (next) {
      mother.position.x = next.x;
      mother.position.z = next.z;
      pursuit.walk += dt;
    }
  }
  if (player && !player.dead && player.form !== 'bird' && pursuit.contactTimer <= 0) {
    const dx = player.position.x - mother.position.x;
    const dz = player.position.z - mother.position.z;
    if (dx * dx + dz * dz <= cfg.contactRadius * cfg.contactRadius) {
      pursuit.contactTimer = cfg.contactCooldown;
      player.takeDamage(cfg.contactDamage);
    }
  }
}
