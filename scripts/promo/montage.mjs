// Joins hand-picked scenes from several play recordings into one vertical (9:16) MP4 with a caption per scene
// (backlog B6-2, weekly progress reel). Unlike cut-highlights.mjs it takes the scenes on the command line,
// so clips from different chapters can be mixed.
//
//   node scripts/promo/montage.mjs promo/YYYY-MM-DD/weekly-9x16.mp4 \
//     "promo/.../ch2/page@a.webm|12.5|19|追い手：止まった時だけ殻が開く" \
//     "promo/.../ch3/page@b.webm|30|37|水門の母：魚で噛むと浮上"
//
// Each scene is "video|start seconds|end seconds|caption". The whole 16:9 frame is kept (a centre crop cut bosses off)
// and set in the middle of the vertical canvas, with MONTAGE_TITLE above it and the caption below.
// Env: MONTAGE_TITLE, FFMPEG (default: the FFmpeg bundled with Irodori-TTS).
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const [outArg, ...sceneArgs] = process.argv.slice(2);
if (!outArg || !sceneArgs.length) {
  console.error('usage: node scripts/promo/montage.mjs <out.mp4> "video|start|end|caption" ...');
  process.exit(1);
}

function findBundledFfmpeg() {
  const tools = 'D:/AI/Irodori-TTS-v4_1/tools';
  const dir = readdirSync(tools).find(name => name.startsWith('ffmpeg-'));
  return dir ? `${tools}/${dir}/bin/ffmpeg.exe` : 'ffmpeg';
}

const ffmpeg = process.env.FFMPEG ?? findBundledFfmpeg();
const scenes = sceneArgs.map((arg) => {
  const [video, start, end, caption = ''] = arg.split('|');
  return { video: path.resolve(video), start: Number(start), end: Number(end), caption: caption.replace(/[':]/g, '') };
});
const inputs = scenes.flatMap(scene => ['-i', scene.video]);
const title = (process.env.MONTAGE_TITLE ?? '').replace(/[':]/g, '');
const parts = scenes.map((scene, index) =>
  `[${index}:v]trim=${scene.start.toFixed(2)}:${scene.end.toFixed(2)},setpts=PTS-STARTPTS,fps=30,scale=1080:-2,pad=1080:1920:0:(oh-ih)/2:color=0x181e1b,`
  + (title ? `drawtext=fontfile=YuGothB.ttc:text='${title}':fontsize=64:fontcolor=white:x=(w-text_w)/2:y=h*0.25-text_h,` : '')
  + `drawtext=fontfile=YuGothB.ttc:text='${scene.caption}':fontsize=46:fontcolor=0xf0e6ff:borderw=4:bordercolor=black@0.6:`
  + `x=(w-text_w)/2:y=h*0.72,fade=t=in:st=0:d=0.2[v${index}]`);
const concat = scenes.map((_, index) => `[v${index}]`).join('') + `concat=n=${scenes.length}:v=1:a=0[out]`;
const output = path.resolve(outArg);
// Run from the Windows font folder so drawtext gets a plain file name (drive colons break filter syntax).
const result = spawnSync(ffmpeg, [
  '-y', '-loglevel', 'error', ...inputs, '-filter_complex', [...parts, concat].join(';'),
  '-map', '[out]', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', output
], { cwd: 'C:/Windows/Fonts', stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`wrote ${output}`);
