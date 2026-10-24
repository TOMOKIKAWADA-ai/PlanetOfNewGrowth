// Calls a running Forge API (scripts/assets/start-forge-api.bat) and saves PNGs plus a JSON of the settings.
//   node scripts/assets/forge-txt2img.mjs jobs.json assets_src/illust/2026-10-21
// jobs.json: [{ "name": "...", "model": "softsketchIllustrious_v125", "prompt": "...", "negative": "...",
//               "seed": 1, "width": 1344, "height": 768, "steps": 28, "cfg": 6, "sampler": "Euler a" }]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [jobsFile, outDir] = process.argv.slice(2);
const api = process.env.FORGE_URL || 'http://127.0.0.1:7865';
const jobs = JSON.parse(await readFile(jobsFile, 'utf8'));
await mkdir(outDir, { recursive: true });

async function call(route, body) {
  const response = await fetch(`${api}${route}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(`${route} ${response.status}: ${await response.text()}`);
  return response.json();
}

const models = await call('/sdapi/v1/sd-models');
for (const job of jobs) {
  const model = models.find(item => item.model_name === job.model || item.title.startsWith(job.model));
  if (!model) throw new Error(`model not found: ${job.model}`);
  const started = Date.now();
  const payload = {
    prompt: job.prompt,
    negative_prompt: job.negative ?? '',
    seed: job.seed ?? -1,
    width: job.width ?? 1024,
    height: job.height ?? 1024,
    steps: job.steps ?? 28,
    cfg_scale: job.cfg ?? 6,
    sampler_name: job.sampler ?? 'Euler a',
    batch_size: 1,
    override_settings: { sd_model_checkpoint: model.title },
    override_settings_restore_afterwards: false
  };
  const result = await call('/sdapi/v1/txt2img', payload);
  const info = JSON.parse(result.info);
  const file = path.join(outDir, `${job.name}.png`);
  await writeFile(file, Buffer.from(result.images[0], 'base64'));
  await writeFile(path.join(outDir, `${job.name}.json`), JSON.stringify({ ...payload, seed: info.seed, model: model.title }, null, 2));
  console.log(`${file} seed ${info.seed} ${Math.round((Date.now() - started) / 1000)}s`);
}
