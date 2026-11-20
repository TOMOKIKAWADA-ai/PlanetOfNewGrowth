// 足跡（E8）の手応えを、人がよくやる動き方ごとに数値で確かめる（A23、2026-11-20）。
// ブラウザやボットを使わず、ゲームと同じ PlayerTrail / advanceFootprint で足跡 1 体を動かす。
// 使い方: node scripts/sim-footprint.mjs [--delay 2.6] [--speed 7.6] [--seconds 30] [--runs 40] [--count 1] [--spread 0]
// 出力: 動き方ごとの「触れた割合」「最初に触れるまでの秒」「30 秒で触れた回数」「見失った回数」。
import { Config } from '../src/config.js';
import { PlayerTrail, advanceFootprint } from '../src/footprints.js';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};

const base = Config.enemy.footprint;
const cfg = { ...base, delaySeconds: arg('delay', base.delaySeconds), speed: arg('speed', base.speed), delaySpread: arg('spread', base.delaySpread ?? 0) };
// 同時にいる足跡の数（遅れは delaySeconds〜delaySeconds+delaySpread に均等に散らす）
const count = arg('count', 1);
const seconds = arg('seconds', 30);
const runs = arg('runs', 40);
const playerSpeed = arg('player', Config.player.humanSpeed);
const dt = 1 / 60;
// ゲームの接触: 距離² 1.55 以内、0.75 秒ごと（Enemy.updateContactDamage）。
const contactSq = 1.55;
const contactCooldown = 0.75;

// 決まった乱数（毎回同じ結果になるように）
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 動き方。t 秒のプレイヤーの位置（と鳥で飛んでいるか）を返す。
const patterns = {
  // その場で撃ち続ける（少しだけ左右に揺れる）
  stand: () => (t) => ({ x: Math.sin(t * 1.3) * 0.6, z: 0, grounded: true }),
  // 狭い所で撃ちながら左右に 6 歩ずつ往復
  strafe: () => (t) => {
    const period = 12 / playerSpeed;
    const phase = (t % (2 * period)) / period;
    const x = phase < 1 ? -3 + 6 * phase : 3 - 6 * (phase - 1);
    return { x, z: 0, grounded: true };
  },
  // 円を描いて逃げる（半径 r）
  circle: (r) => (t) => {
    const w = playerSpeed / r;
    return { x: Math.cos(t * w) * r, z: Math.sin(t * w) * r, grounded: true };
  },
  // 走っては止まる（2 秒走って 2 秒撃つ。向きは毎回 90 度ずつ変える）
  stopgo: () => {
    const legs = [];
    let x = 0;
    let z = 0;
    for (let i = 0; i < 40; i++) {
      const angle = (i % 4) * Math.PI / 2;
      legs.push({ x, z, angle });
      x += Math.cos(angle) * playerSpeed * 2;
      z += Math.sin(angle) * playerSpeed * 2;
    }
    return (t) => {
      const leg = legs[Math.min(legs.length - 1, Math.floor(t / 4))];
      const run = Math.min(2, t % 4);
      return { x: leg.x + Math.cos(leg.angle) * playerSpeed * run, z: leg.z + Math.sin(leg.angle) * playerSpeed * run, grounded: true };
    };
  },
  // まっすぐ逃げ続ける
  straight: () => (t) => ({ x: t * playerSpeed, z: 0, grounded: true }),
  // 円（半径 6）を描きつつ、6 秒ごとに 1.5 秒だけ鳥で飛ぶ（道が途切れる）
  circleFly: () => (t) => {
    const r = 6;
    const w = playerSpeed / r;
    return { x: Math.cos(t * w) * r, z: Math.sin(t * w) * r, grounded: (t % 6) < 4.5 };
  }
};

function simulate(makePath, seed) {
  const random = makeRandom(seed);
  const path = makePath;
  const trail = new PlayerTrail(cfg.trailSeconds, cfg.trailSampleInterval);
  // 戦い始めて 4 秒は道だけ残し、そのあと 6〜12 離れた所に足跡が孵る。
  const warmup = 4;
  for (let t = 0; t < warmup; t += dt) {
    const p = path(t);
    trail.record(t, p.x, p.z, p.grounded);
  }
  const start = path(warmup);
  const bodies = [];
  for (let k = 0; k < count; k++) {
    const angle = random() * Math.PI * 2;
    const distance = 6 + random() * 6;
    const delay = cfg.delaySeconds + (count > 1 ? cfg.delaySpread * k / (count - 1) : 0);
    bodies.push({
      pos: { x: start.x + Math.cos(angle) * distance, z: start.z + Math.sin(angle) * distance },
      state: { cursor: null, rejoinTimer: 0, target: null, lostCount: 0, fresh: true, delay },
      tracking: false,
      attackTimer: 0
    });
  }
  let lost = 0;
  let firstHit = null;
  let hits = 0;
  for (let t = warmup; t < warmup + seconds; t += dt) {
    const p = path(t);
    trail.record(t, p.x, p.z, p.grounded);
    for (const body of bodies) {
      const pos = body.pos;
      const target = advanceFootprint(body.state, trail, t, dt, cfg, pos);
      const goal = target ?? p;
      const step = target ? cfg.speed : cfg.lostSpeed;
      const dx = goal.x - pos.x;
      const dz = goal.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        const move = Math.min(step * dt, d);
        pos.x += (dx / d) * move;
        pos.z += (dz / d) * move;
      }
      if (body.tracking && !target) lost += 1;
      body.tracking = !!target;
      body.attackTimer -= dt;
      const px = pos.x - p.x;
      const pz = pos.z - p.z;
      if (p.grounded && px * px + pz * pz <= contactSq && body.attackTimer <= 0) {
        body.attackTimer = contactCooldown;
        hits += 1;
        if (firstHit === null) firstHit = t - warmup;
      }
    }
  }
  return { firstHit, hits, lost };
}

const list = [
  ['その場で撃つ', patterns.stand()],
  ['左右に往復', patterns.strafe()],
  ['円 r=3', patterns.circle(3)],
  ['円 r=6', patterns.circle(6)],
  ['円 r=10', patterns.circle(10)],
  ['走って止まる', patterns.stopgo()],
  ['まっすぐ逃げる', patterns.straight()],
  ['円 r=6＋時々鳥', patterns.circleFly()]
];

console.log(`足跡 ${count} 体: 遅れ ${cfg.delaySeconds}〜${(cfg.delaySeconds + (count > 1 ? cfg.delaySpread : 0)).toFixed(1)} 秒・速さ ${cfg.speed}・プレイヤー ${playerSpeed}・${seconds} 秒 × ${runs} 回`);
console.log('動き方 | 触れた割合 | 最初に触れるまで（中央値） | 触れた回数（平均） | 見失い（平均）');
const rows = [];
for (const [name, path] of list) {
  const results = [];
  for (let i = 0; i < runs; i++) results.push(simulate(path, 1000 + i));
  const touched = results.filter((r) => r.firstHit !== null);
  const firsts = touched.map((r) => r.firstHit).sort((a, b) => a - b);
  const median = firsts.length ? firsts[Math.floor(firsts.length / 2)] : null;
  const avgHits = results.reduce((s, r) => s + r.hits, 0) / runs;
  const avgLost = results.reduce((s, r) => s + r.lost, 0) / runs;
  const row = { name, touchedRate: touched.length / runs, median, avgHits, avgLost };
  rows.push(row);
  console.log(`${name} | ${touched.length}/${runs} | ${median === null ? '—' : median.toFixed(1) + ' 秒'} | ${avgHits.toFixed(1)} | ${avgLost.toFixed(1)}`);
}
if (args.includes('--json')) console.log(JSON.stringify({ cfg: { delay: cfg.delaySeconds, speed: cfg.speed }, rows }));
