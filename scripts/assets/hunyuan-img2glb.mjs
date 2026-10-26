// Sends images to a running Hunyuan3D API (scripts/assets/start-hunyuan-api.bat) and saves shape-only GLBs.
//   node scripts/assets/hunyuan-img2glb.mjs <outDir> <image.png> [more.png ...]
// Env: HY3D_URL (default http://127.0.0.1:8081), HY3D_SEED (1234), HY3D_OCTREE (256), HY3D_STEPS (5).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [outDir, ...images] = process.argv.slice(2);
const api = process.env.HY3D_URL || 'http://127.0.0.1:8081';
await mkdir(outDir, { recursive: true });
for (const image of images) {
  const started = Date.now();
  const body = {
    image: (await readFile(image)).toString('base64'),
    seed: Number(process.env.HY3D_SEED ?? 1234),
    octree_resolution: Number(process.env.HY3D_OCTREE ?? 256),
    num_inference_steps: Number(process.env.HY3D_STEPS ?? 5),
    texture: false
  };
  const response = await fetch(`${api}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${image}: ${response.status} ${await response.text()}`);
  const file = path.join(outDir, `${path.basename(image, path.extname(image))}.glb`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  console.log(`${file} ${Math.round((Date.now() - started) / 1000)}s`);
}
