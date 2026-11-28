// Cuts a short highlight reel (backlog B6-1) from a play video recorded with
//   node scripts/bot-play.mjs --runs 1 --record promo/YYYY-MM-DD/raw
// using the events JSON written next to the WebM. Outputs a 9:16 and a 16:9 MP4 with a caption per scene.
//
//   node scripts/promo/cut-highlights.mjs promo/YYYY-MM-DD/raw/page@xxx.webm --out promo/YYYY-MM-DD --seconds 28
//
// Env: FFMPEG (default: the FFmpeg bundled with Irodori-TTS, see docs/dev-cycle/asset-pipeline.md).
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const [videoArg, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.reduce((pairs, arg, index, list) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), list[index + 1]]);
  return pairs;
}, []));
if (!videoArg) {
  console.error('usage: node scripts/promo/cut-highlights.mjs <video.webm> [--out dir] [--seconds 28] [--boss 群れの母]');
  process.exit(1);
}
const video = path.resolve(videoArg);
const outDir = path.resolve(args.out ?? path.dirname(path.dirname(video)));
const targetSeconds = Number(args.seconds ?? 28);
const ffmpeg = process.env.FFMPEG ?? findBundledFfmpeg();
const { events } = JSON.parse(readFileSync(video.replace(/\.webm$/, '.events.json'), 'utf8'));

// Scene types in order of priority: [seconds before the event, seconds after, caption]. {boss} is --boss (default 母卵).
// B6-6 (2026-11-28): scenes with the boss in frame come first (the kill, a sister or petal falling, the boss close by);
// motherSpawn is shown further down because the boss appears far from the player and is not in frame.
// The recording stops about a second after the outcome, so the kill scene is cut mostly from before it.
const bossName = args.boss ?? '母卵';
const SCENES = {
  motherKill: [3.6, 0.8, '{boss}を撃破'],
  bossDown: [2.2, 1.8, '{boss}を崩す'],
  shockwaveDodge: [2.6, 1.6, '衝撃波は空へ逃げる'],
  motherDive: [1.2, 2.4, '{boss}へ急降下'],
  bossNear: [0.4, 3.4, '{boss}に迫る'],
  motherSpawn: [1, 4, '残り1分、{boss}が出現'],
  burst: [0.8, 3.4, 'バースト'],
  mimicStun: [1.6, 2.4, '擬態卵に注意'],
  dive: [1.4, 2.6, '鳥になって卵を食べる']
};

function findBundledFfmpeg() {
  const tools = 'D:/AI/Irodori-TTS-v4_1/tools';
  const dir = readdirSync(tools).find(name => name.startsWith('ffmpeg-'));
  return dir ? `${tools}/${dir}/bin/ffmpeg.exe` : 'ffmpeg';
}

// When the boss shows up in the recording, egg dives are left out: they are shot from the high bird camera, where the
// stage is dark and the eggs are dots. Within a kind, scenes in human form (the low camera) come first.
const BOSS_SCENES = ['motherKill', 'bossDown', 'bossNear', 'motherDive'];
const hasBossScenes = events.some(item => BOSS_SCENES.includes(item.type));

function pickScenes() {
  const picked = [];
  let total = 0;
  for (const [type, [before, after, caption]] of Object.entries(SCENES)) {
    if (type === 'dive' && hasBossScenes) continue;
    const ofType = events.filter(item => item.type === type)
      .sort((a, b) => (a.form === 'human' ? 0 : 1) - (b.form === 'human' ? 0 : 1));
    for (const event of ofType) {
      if (total >= targetSeconds) break;
      const start = Math.max(0, event.video - before);
      const end = event.video + after;
      // Keep scenes apart so the reel does not show the same moment twice.
      if (picked.some(scene => start < scene.end + 3 && end > scene.start - 3)) continue;
      // At most two scenes of a kind, so one busy stretch does not fill the reel.
      if (picked.filter(scene => scene.type === type).length >= 2) continue;
      picked.push({ type, start, end, caption: caption.replace('{boss}', bossName) });
      total += end - start;
    }
  }
  return picked.sort((a, b) => a.start - b.start);
}

function render(scenes, name, frameFilter) {
  const parts = scenes.map((scene, index) => {
    const caption = scene.caption.replace(/'/g, '');
    return `[0:v]trim=${scene.start.toFixed(2)}:${scene.end.toFixed(2)},setpts=PTS-STARTPTS,${frameFilter},`
      + `drawtext=fontfile=YuGothB.ttc:text='${caption}':fontsize=h/22:fontcolor=white:borderw=4:bordercolor=black@0.7:`
      + `x=(w-text_w)/2:y=h*0.80,fade=t=in:st=0:d=0.15[v${index}]`;
  });
  const concat = scenes.map((_, index) => `[v${index}]`).join('') + `concat=n=${scenes.length}:v=1:a=0[out]`;
  const output = path.join(outDir, name);
  // Run from the Windows font folder so drawtext gets a plain file name (drive colons break filter syntax).
  const result = spawnSync(ffmpeg, [
    '-y', '-loglevel', 'error', '-i', video, '-filter_complex', [...parts, concat].join(';'),
    '-map', '[out]', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', output
  ], { cwd: 'C:/Windows/Fonts', stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${name}`);
  console.log(`wrote ${output}`);
}

mkdirSync(outDir, { recursive: true });
const scenes = pickScenes();
console.log(scenes.map(scene => `${scene.start.toFixed(1)}-${scene.end.toFixed(1)}s ${scene.type}`).join('\n'));
// The camera follows the player, so a centre crop keeps the character in a vertical frame.
render(scenes, 'highlight-9x16.mp4', 'crop=ih*9/16:ih,scale=1080:1920');
render(scenes, 'highlight-16x9.mp4', 'crop=iw:iw*9/16,scale=1280:720');
