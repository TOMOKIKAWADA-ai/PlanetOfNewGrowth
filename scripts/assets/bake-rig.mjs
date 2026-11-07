// Bake an Anime2.5DRig PSD into what the game loads: <name>.json (parts, anchors, hair strands) and
// <name>.png (every part packed into one image). The game then needs neither the PSD nor the PSD parser.
// Usage: node scripts/assets/bake-rig.mjs <in.psd> <out_dir> <name> [--source 1024x1536]
//   --source: size of the portrait the PSD was made from (See-through pads it to a square and scales it).
//             The baked view is that portrait's area, so the avatar lines up with the still image.
// Needs Anime2.5DRig (MIT, RIG_DIR, default D:/AI/Anime2_5DRig) and pngjs (PNGJS, default from mesh-avatar-studio).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const RIG_DIR = process.env.RIG_DIR || 'D:/AI/Anime2_5DRig';
const agPsd = require(`${RIG_DIR}/lib/ag-psd.min.js`);
const Rigger = require(`${RIG_DIR}/lib/rigger.js`);
const { PNG } = require(process.env.PNGJS || 'D:/AI/Live2D_AI/mesh-avatar-studio/node_modules/pngjs');

const args = process.argv.slice(2);
const [inPsd, outDir, name] = args;
const sourceArg = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
if (!inPsd || !outDir || !name) {
  console.error('usage: bake-rig.mjs <in.psd> <out_dir> <name> [--source WxH]');
  process.exit(1);
}

agPsd.initializeCanvas(undefined, (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }));
const buffer = readFileSync(inPsd);
const options = { useImageData: true, skipThumbnail: true, skipCompositeImageData: true };
const psd = agPsd.readPsd(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength), options);
Rigger.cleanPsdLayers(psd);
const rig = Rigger.buildRig(psd, {});

// Shelf-pack the parts (tallest first) into one image no wider than 2048 px.
const MAX_W = 2048, GAP = 2;
const order = rig.layers.map((L, i) => i).sort((a, b) => rig.layers[b].h - rig.layers[a].h);
let x = 0, y = 0, shelf = 0, width = 0;
const at = [];
for (const i of order) {
  const L = rig.layers[i];
  if (x + L.w > MAX_W) { x = 0; y += shelf + GAP; shelf = 0; }
  at[i] = { ax: x, ay: y };
  x += L.w + GAP; shelf = Math.max(shelf, L.h); width = Math.max(width, x);
}
const height = y + shelf;
const atlas = new PNG({ width, height });
rig.layers.forEach((L, i) => {
  const { ax, ay } = at[i], src = L.img.data;
  for (let r = 0; r < L.h; r++) {
    atlas.data.set(src.subarray(r * L.w * 4, (r + 1) * L.w * 4), ((ay + r) * width + ax) * 4);
  }
});

let view = { x: 0, y: 0, w: rig.canvas.w, h: rig.canvas.h };
if (sourceArg) {
  const [sw, sh] = sourceArg.split('x').map(Number), side = Math.max(sw, sh), s = rig.canvas.w / side;
  view = { x: Math.round((side - sw) / 2 * s), y: Math.round((side - sh) / 2 * s), w: Math.round(sw * s), h: Math.round(sh * s) };
}

const round = v => Math.round(v * 1000) / 1000;
const out = {
  format: 'anime25d-baked', version: 1,
  canvas: rig.canvas, view,
  anchors: JSON.parse(JSON.stringify(rig.anchors), (k, v) => (typeof v === 'number' ? round(v) : v)),
  layers: rig.layers.map((L, i) => ({
    name: L.name, x: L.x, y: L.y, w: L.w, h: L.h, z: L.z, depth: L.depth, group: L.group,
    phys: L.phys, opacity: L.opacity, fade: L.fade, side: L.side,
    strands: L.strands ? L.strands.map(s => ({ x: round(s.x), rootY: round(s.rootY), tipY: round(s.tipY) })) : null,
    ...at[i]
  }))
};
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${name}.json`), JSON.stringify(out));
writeFileSync(join(outDir, `${name}.png`), PNG.sync.write(atlas, { colorType: 6 }));
console.log(`${name}: ${out.layers.length} parts, atlas ${width}x${height}, view ${JSON.stringify(view)}`);
if (rig.warnings?.length) console.log('warnings:', rig.warnings.join(' / '));
