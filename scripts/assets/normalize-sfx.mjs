// B2-2: assets/audio/sfx の効果音を、役割ごとの目標ラウドネスにそろえて assets/audio/sfx-normalized/ に書き出す。
// 元のファイルは変えない（Config.audio.normalizedSfx: false で元に戻る）。
// 1秒前後の短い音は loudnorm がうまく効かないので、測った値との差を一定の増減でかけ、
// 振り切れ（0 dBFS）を防ぐためにリミッター（-1 dB）を通す。
// 使い方: node scripts/assets/normalize-sfx.mjs [--ffmpeg <ffmpeg の bin フォルダ>] [--dry]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const argValue = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const dry = args.includes('--dry');
const ffmpegDir = argValue('--ffmpeg') ?? findFfmpeg();
const ffmpeg = path.join(ffmpegDir, 'ffmpeg');
const srcDir = 'assets/audio/sfx';
const outDir = 'assets/audio/sfx-normalized';

// 役割ごとの目標（LUFS、ファイルそのものの大きさ）。ゲーム内ではさらに playSfx の volume がかかる。
// よく鳴る小さな音とメニューは控えめに、操作の手応えは中くらい、大技とボスは大きめ。
const ROLES = {
  frequent: -18, // 射撃・命中・経験値・撃破（1秒に何度も鳴る）
  ui: -18,
  action: -15, // 変身・捕食・卵割り・被弾など、自分の操作への返事
  big: -12 // バースト・レベルアップ・ボス
};
const FILE_ROLES = {
  player_shot: 'frequent', projectile_hit: 'frequent', xp_pickup: 'frequent', enemy_die: 'frequent',
  button_confirm: 'ui', button_cancel: 'ui',
  bird_feed: 'action', transform_bird: 'action', transform_human: 'action', egg_break: 'action',
  item_pickup: 'action', player_hit: 'action', thirst_drain: 'action',
  crier_cry: 'frequent', hand_grab: 'action', root_dry: 'action',
  fish_bite: 'action', shell_crack: 'action', swarm_rise: 'big',
  burst_pre: 'big', burst_fire: 'big', burst_spread: 'big', tsukimi_burst: 'big', kiichigo_burst: 'big',
  level_up: 'big', mother_charge: 'big', mother_release: 'big', mother_impact: 'big'
};

function findFfmpeg() {
  const root = 'D:/AI/Irodori-TTS-v4_1/tools';
  const dir = existsSync(root) ? readdirSync(root).find(name => name.startsWith('ffmpeg-')) : null;
  if (!dir) throw new Error('ffmpeg not found; pass --ffmpeg <bin dir>');
  return path.join(root, dir, 'bin');
}

function measure(file) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const summary = result.stderr.slice(result.stderr.lastIndexOf('Summary:'));
  const lufs = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
  const peak = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  return { lufs, peak };
}

mkdirSync(outDir, { recursive: true });
const rows = [];
for (const file of readdirSync(srcDir).filter(name => name.endsWith('.wav')).sort()) {
  const name = file.replace(/\.wav$/, '');
  const role = FILE_ROLES[name];
  if (!role) {
    console.warn(`skip ${file}: no role in FILE_ROLES`);
    continue;
  }
  const source = path.join(srcDir, file);
  const before = measure(source);
  const gain = Math.round((ROLES[role] - before.lufs) * 10) / 10;
  const target = path.join(outDir, file);
  if (!dry) {
    const result = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', source,
      '-af', `volume=${gain}dB,alimiter=limit=0.89:level=false:latency=1`,
      '-c:a', 'pcm_s16le', target], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`ffmpeg failed for ${file}\n${result.stderr}`);
  }
  const after = dry ? { lufs: NaN, peak: NaN } : measure(target);
  rows.push({ file, role, before: before.lufs, beforePeak: before.peak, gain, after: after.lufs, afterPeak: after.peak });
}
console.log('file | role | before LUFS (peak) | gain dB | after LUFS (peak)');
for (const r of rows) console.log(`${r.file} | ${r.role} | ${r.before} (${r.beforePeak}) | ${r.gain > 0 ? '+' : ''}${r.gain} | ${r.after} (${r.afterPeak})`);
