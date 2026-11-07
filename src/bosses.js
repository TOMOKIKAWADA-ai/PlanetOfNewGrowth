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
  }),
  // 第3章のボス。水の中に潜っているあいだは攻撃が効かず、プレイヤーへ向けてオタマジャクシの列を流す。
  // 魚形態で3回噛みつくと浮上して気絶し、そのあいだは攻撃がよく効く（人間形態で撃つ・バースト）。
  floodgateMother: Object.freeze({
    id: 'floodgateMother',
    name: '水門の母',
    forecast: '潜っているあいだは攻撃が効かない。魚形態で3回噛みつくと浮上して気絶する',
    prefersWater: true,
    update(egg, dt) {
      updateFloodgate(egg, dt);
    },
    damageScale(egg) {
      return floodgateDamageScale(egg.floodgate?.state, Config.boss.floodgateMother);
    },
    fishBite(egg) {
      return floodgateBite(egg);
    }
  }),
  // 第4章のボス。光の糸でつながった三つ子（体は母卵を3つ。spawnCount だけ並べて置く）。
  // 1体を倒しても倒れるだけで、reviveSeconds 以内に残りを全部倒さないと起き上がる。衝撃波は立っている姉妹が順番に出す。
  swarmMother: Object.freeze({
    id: 'swarmMother',
    name: '群れの母',
    forecast: '光の糸でつながった三つ子。1体だけ倒しても、10秒以内に残りを倒さないと起き上がる',
    spawnCount: Config.boss.swarmMother.count,
    update(egg, dt) {
      updateSwarmMember(egg, dt);
    },
    onLethal(egg) {
      return swarmOnLethal(egg);
    }
  }),
  // 最終章のボス（E15 の第1・第2段階）。核の周りに6枚の花弁（体は母卵を小さくしたもの）。
  // 第1段階: 核は閉じていて狙えない。花弁はそれぞれ、それまでの章の新種を産み続ける。
  // 第2段階: 花弁を openAfterPetals 枚壊すと核が開き、衝撃波（鳥で避ける）と吸い込み（人間で踏みとどまる）を交互に出す。
  whiteLotusCore: Object.freeze({
    id: 'whiteLotusCore',
    name: '白蓮の核',
    forecast: '6枚の花弁が、これまでの新種を産む。花弁を壊すと核が開き、衝撃波と吸い込みを交互に出す',
    spawnCount: 1 + Config.boss.whiteLotusCore.petalCount,
    update(egg, dt) {
      updateLotusMember(egg, dt);
    },
    onLethal(egg) {
      return lotusOnLethal(egg);
    },
    // 第3段階（E16）: 影法師が生きているあいだ、核へのダメージは shadowCoreDamageScale 倍。
    damageScale(egg) {
      return lotusCoreDamageScale(egg);
    }
  })
});

export const DEFAULT_BOSS = 'motherEgg';

// まだ作っていないボス（白蓮の核など）を指定した章は、母卵の動きで戦う。
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

export function floodgateDamageScale(state, cfg) {
  return state === 'surfaced' ? cfg.surfacedDamageScale : cfg.submergedDamageScale;
}

function floodgateState(mother, cfg) {
  return mother.floodgate ??= { state: 'submerged', timer: 0, bites: 0, streamTimer: cfg.firstStreamDelay, surfaces: 0 };
}

// 魚形態の噛みつき。潜っているときだけ数え、bitesToSurface 回で浮上する。噛めたら true（噛みつきの間隔は呼び出し側）。
export function floodgateBite(mother) {
  const cfg = Config.boss.floodgateMother;
  const flood = floodgateState(mother, cfg);
  if (flood.state !== 'submerged') return false;
  flood.bites += 1;
  if (flood.bites >= cfg.bitesToSurface) {
    flood.state = 'surfaced';
    flood.timer = cfg.stunSeconds;
    flood.bites = 0;
    flood.surfaces += 1;
    mother.game.onFloodgateSurface?.(mother, cfg.stunSeconds);
  } else {
    mother.game.onFloodgateBite?.(mother, flood.bites, cfg.bitesToSurface);
  }
  return true;
}

// submerged（攻撃が効かない。streamInterval ごとに列を流す） → (3回噛まれる) → surfaced（気絶） → submerged
export function updateFloodgate(mother, dt) {
  const game = mother.game;
  if (game.state !== 'playing') return;
  const cfg = Config.boss.floodgateMother;
  const flood = floodgateState(mother, cfg);
  if (flood.state === 'surfaced') {
    flood.timer -= dt;
    if (flood.timer <= 0) {
      flood.state = 'submerged';
      flood.streamTimer = cfg.streamAfterSubmerge;
      game.onFloodgateSubmerge?.(mother);
    }
    return;
  }
  flood.streamTimer -= dt;
  if (flood.streamTimer <= 0) {
    flood.streamTimer = cfg.streamInterval;
    game.onFloodgateStream?.(mother, cfg.streamCount);
  }
}

// 群れの母の姉妹をつなぐ。members の順に衝撃波の番が回る。
export function linkSwarm(members) {
  const swarm = { members, shockwaveOwner: members[0] ?? null, downs: 0, revives: 0 };
  for (const egg of members) {
    egg.swarm = swarm;
    egg.swarmDown = false;
    egg.swarmDownTimer = 0;
  }
  return swarm;
}

export function swarmStanding(swarm, except = null) {
  return swarm.members.filter((egg) => egg !== except && !egg.dead && !egg.swarmDown);
}

// 姉妹の HP が 0 になったとき。ほかに立っている姉妹がいれば倒れるだけ（true を返し、壊れない）。
// 最後の1体なら、倒れている姉妹もまとめて壊し、false を返して通常の撃破（勝利）に進ませる。
export function swarmOnLethal(egg) {
  const swarm = egg.swarm;
  if (!swarm) return false;
  const cfg = Config.boss.swarmMother;
  const standing = swarmStanding(swarm, egg);
  if (standing.length > 0) {
    egg.swarmDown = true;
    egg.swarmDownTimer = cfg.reviveSeconds;
    egg.hp = 0;
    swarm.downs += 1;
    if (swarm.shockwaveOwner === egg) handOverShockwave(swarm, standing, cfg);
    egg.game.onSwarmMemberDown?.(egg, standing.length, cfg.reviveSeconds);
    return true;
  }
  for (const sister of swarm.members) {
    if (sister === egg || sister.dead) continue;
    sister.dead = true;
    sister.game.onSwarmMemberFinish?.(sister);
  }
  return false;
}

function handOverShockwave(swarm, standing, cfg) {
  const order = swarm.members;
  const from = order.indexOf(swarm.shockwaveOwner);
  let next = null;
  for (let i = 1; i <= order.length && !next; i++) {
    const candidate = order[(from + i) % order.length];
    if (standing.includes(candidate)) next = candidate;
  }
  swarm.shockwaveOwner = next;
  if (next) {
    next.shockwaveState = 'idle';
    next.shockwaveTimer = Math.max(next.shockwaveTimer ?? 0, cfg.handoverDelay);
  }
}

// 倒れている姉妹は起き上がりを待つ。立っている姉妹は、衝撃波の番なら母卵と同じ衝撃波を出し、出し終えたら次の姉妹へ番を渡す。
export function updateSwarmMember(egg, dt) {
  const game = egg.game;
  if (game.state !== 'playing' || !egg.swarm) return;
  const swarm = egg.swarm;
  const cfg = Config.boss.swarmMother;
  if (egg.swarmDown) {
    egg.swarmDownTimer -= dt;
    if (egg.swarmDownTimer > 0) return;
    egg.swarmDown = false;
    egg.swarmDownTimer = 0;
    egg.hp = egg.maxHp * cfg.reviveHpRatio;
    swarm.revives += 1;
    if (!swarm.shockwaveOwner) {
      swarm.shockwaveOwner = egg;
      egg.shockwaveState = 'idle';
      egg.shockwaveTimer = cfg.handoverDelay;
    }
    game.onSwarmMemberRevive?.(egg);
    return;
  }
  if (swarm.shockwaveOwner !== egg) return;
  const wasWarning = egg.shockwaveState === 'warning';
  egg.updateMotherShockwave(dt);
  if (wasWarning && egg.shockwaveState === 'idle') {
    const interval = egg.shockwaveTimer;
    handOverShockwave(swarm, swarmStanding(swarm), cfg);
    if (swarm.shockwaveOwner && swarm.shockwaveOwner !== egg) swarm.shockwaveOwner.shockwaveTimer = interval;
  }
}

// 姉妹を置く場所: center を囲む正三角形（count 体）。isBlocked なら少し内側へ寄せ、だめなら center に置く。
export function swarmPositions(center, count, spread, rotation, isBlocked) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const angle = rotation + i / count * Math.PI * 2;
    let point = null;
    for (const scale of [1, 0.75, 0.5]) {
      const candidate = { x: center.x + Math.sin(angle) * spread * scale, z: center.z + Math.cos(angle) * spread * scale };
      if (!isBlocked(candidate)) { point = candidate; break; }
    }
    points.push(point ?? { x: center.x, z: center.z });
  }
  return points;
}

// 列の並び: 母からプレイヤーの方へ、start から spacing おきに count 匹。プレイヤーと重なっていれば +z 向き。
export function floodgateStreamPoints(from, toward, count, start, spacing) {
  let dx = toward.x - from.x;
  let dz = toward.z - from.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.01) { dx = 0; dz = 1; } else { dx /= length; dz /= length; }
  const points = [];
  for (let i = 0; i < count; i++) {
    const distance = start + i * spacing;
    points.push({ x: from.x + dx * distance, z: from.z + dz * distance });
  }
  return { direction: { x: dx, z: dz }, points };
}

// ---- 白蓮の核（最終章） ----
// 核と花弁をつなぐ。花弁 i は species[i] を産む。最初の産卵は少しずつずらす。
export function linkLotus(core, petals, species, cfg = Config.boss.whiteLotusCore) {
  const lotus = {
    core, petals, state: 'closed', broken: 0,
    attack: 'rest', attackTimer: 0, next: 'shockwave', inhaleBiteTimer: 0,
    shadow: null, shadowHatched: false,
    stats: { spawned: 0, shockwaves: 0, inhales: 0, bites: 0, openedAt: null, shadowAt: null, shadowDownAt: null }
  };
  core.lotus = lotus;
  core.lotusRole = 'core';
  petals.forEach((petal, i) => {
    petal.lotus = lotus;
    petal.lotusRole = 'petal';
    petal.lotusSpecies = species[i % species.length];
    petal.lotusSpawnTimer = cfg.petalFirstSpawnSeconds + i * 0.8;
    petal.lotusBrood = [];
  });
  return lotus;
}

// 核が閉じているあいだは狙えない（弾も当たらない）。
export function lotusTargetable(egg) {
  return !(egg.lotusRole === 'core' && egg.lotus?.state === 'closed');
}

// 花弁の HP が 0 になったとき: 花弁は壊れる（勝利にはならない）。true を返して通常の撃破を止める。
// 核なら false（通常の撃破＝勝利へ）。
export function lotusOnLethal(egg, cfg = Config.boss.whiteLotusCore) {
  const lotus = egg.lotus;
  if (!lotus || egg.lotusRole !== 'petal') return false;
  egg.dead = true;
  egg.hp = 0;
  lotus.broken += 1;
  const opened = lotus.state === 'closed' && lotus.broken >= cfg.openAfterPetals;
  if (opened) {
    lotus.state = 'open';
    lotus.attack = 'rest';
    lotus.attackTimer = cfg.openRestSeconds;
    lotus.next = 'shockwave';
  }
  egg.game.onLotusPetalBroken?.(egg, lotus.broken, opened);
  return true;
}

// 開いた核の攻撃の周期。休み → 衝撃波の予兆 → 衝撃波 → 休み → 吸い込みの予兆 → 吸い込み → 休み …
// 起きたことを返す（'shockwaveWarning' | 'shockwave' | 'inhaleWarning' | 'inhaleStart' | 'inhaleEnd' | null）。
export function lotusAttackStep(lotus, dt, cfg = Config.boss.whiteLotusCore) {
  if (lotus.state !== 'open') return null;
  lotus.attackTimer -= dt;
  if (lotus.attackTimer > 0) return null;
  switch (lotus.attack) {
    case 'rest':
      if (lotus.next === 'shockwave') {
        lotus.attack = 'shockwaveWarning';
        lotus.attackTimer = cfg.shockwaveWarning;
        return 'shockwaveWarning';
      }
      lotus.attack = 'inhaleWarning';
      lotus.attackTimer = cfg.inhaleWarning;
      return 'inhaleWarning';
    case 'shockwaveWarning':
      lotus.attack = 'rest';
      lotus.attackTimer = cfg.restSeconds;
      lotus.next = 'inhale';
      lotus.stats.shockwaves += 1;
      return 'shockwave';
    case 'inhaleWarning':
      lotus.attack = 'inhale';
      lotus.attackTimer = cfg.inhaleSeconds;
      lotus.inhaleBiteTimer = 0;
      lotus.stats.inhales += 1;
      return 'inhaleStart';
    case 'inhale':
    default:
      lotus.attack = 'rest';
      lotus.attackTimer = cfg.restSeconds;
      lotus.next = 'shockwave';
      return 'inhaleEnd';
  }
}

// 吸い込みで引き寄せる量（この dt の間に核へ近づく距離）。鳥形態は大きく、人間・魚形態は少しだけ。範囲外は 0。
// 核に重なるほど近ければそれ以上は引かない。
export function lotusInhalePull(distance, form, dt, cfg = Config.boss.whiteLotusCore) {
  if (distance > cfg.inhaleRadius || distance <= cfg.inhaleBiteRadius * 0.6) return 0;
  const speed = form === 'bird' ? cfg.inhalePullBird : cfg.inhalePullHuman;
  return Math.min(speed * dt, distance - cfg.inhaleBiteRadius * 0.6);
}

// 花弁が産んだ敵のうち、まだ生きている数。
export function lotusBroodAlive(petal) {
  petal.lotusBrood = petal.lotusBrood.filter((enemy) => !enemy.dead);
  return petal.lotusBrood.length;
}

export function updateLotusMember(egg, dt, cfg = Config.boss.whiteLotusCore) {
  const game = egg.game;
  if (game.state !== 'playing' || !egg.lotus || egg.dead) return;
  const lotus = egg.lotus;
  if (egg.lotusRole === 'petal') {
    egg.lotusSpawnTimer -= dt;
    if (egg.lotusSpawnTimer > 0) return;
    egg.lotusSpawnTimer = cfg.petalSpawnSeconds;
    if (lotusBroodAlive(egg) >= cfg.petalMaxAlive) return;
    const spawned = game.spawnLotusBrood?.(egg, egg.lotusSpecies);
    if (spawned) {
      egg.lotusBrood.push(spawned);
      lotus.stats.spawned += 1;
    }
    return;
  }
  if (lotusShadowDue(lotus, game.elapsed, Config.map.playSeconds, cfg)) {
    lotus.shadowHatched = true;
    lotus.stats.shadowAt = Math.round(game.elapsed);
    lotus.shadow = game.spawnLotusShadow?.(egg) ?? null;
  }
  const event = lotusAttackStep(lotus, dt, cfg);
  if (event) game.onLotusAttack?.(egg, event);
  if (lotus.attack === 'inhale') game.applyLotusInhale?.(egg, dt);
}

// ---- 影法師（E16、白蓮の第3段階） ----
// 残り時間が shadowAtRemaining 秒になったら、核から1度だけ孵る（花弁が残っていても、核が閉じていても）。
export function lotusShadowDue(lotus, elapsed, playSeconds, cfg = Config.boss.whiteLotusCore) {
  if (!lotus || lotus.shadowHatched || Config.enemy.shadow?.enabled === false) return false;
  return elapsed >= playSeconds - cfg.shadowAtRemaining;
}

// 影法師が生きているあいだは核が守られる。
export function lotusCoreDamageScale(egg, cfg = Config.boss.whiteLotusCore) {
  if (egg.lotusRole !== 'core') return 1;
  const shadow = egg.lotus?.shadow;
  return shadow && !shadow.dead ? cfg.shadowCoreDamageScale : 1;
}

// 影法師の形態は「人間」か「鳥」の2つ。プレイヤーの魚形態は鳥と同じ側に数える。
export function shadowFormOf(playerForm) {
  return playerForm === 'human' ? 'human' : 'bird';
}

// プレイヤーの形態を delay 秒遅れで写す。mirror = { form, pending, timer }。形態が変わった瞬間に true を返す。
export function shadowMirrorStep(mirror, playerForm, dt, delay = Config.enemy.shadow.mirrorDelay) {
  const target = shadowFormOf(playerForm);
  if (target === mirror.form) {
    mirror.pending = null;
    mirror.timer = 0;
    return false;
  }
  if (mirror.pending !== target) {
    mirror.pending = target;
    mirror.timer = delay;
  }
  mirror.timer -= dt;
  if (mirror.timer > 0) return false;
  mirror.form = target;
  mirror.pending = null;
  mirror.timer = 0;
  return true;
}

// 逆の形態のときだけ傷つく（同じ形態のときは、こちらを傷つけられる）。
export function shadowVulnerable(shadowForm, playerForm) {
  return shadowForm !== shadowFormOf(playerForm);
}
