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
