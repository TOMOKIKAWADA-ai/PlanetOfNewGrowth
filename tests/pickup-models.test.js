import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PICKUP_TYPES = ['hp', 'mp', 'burst', 'magnet', 'shield', 'speed'];

// B1-1（2026-11-19）: Blender で手作りした拾うアイテム 6 種が、GLB として読めて、main.js から参照されている。
test('every pickup type has a hand-built GLB wired into PICKUP_MODELS', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  for (const type of PICKUP_TYPES) {
    const bytes = readFileSync(fileURLToPath(new URL(`../assets/pickups/pickup_${type}.glb`, import.meta.url)));
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'glTF', `pickup_${type}.glb is not a GLB`);
    assert.ok(bytes.length < 64 * 1024, `pickup_${type}.glb is larger than 64 KB`);
    assert.ok(main.includes(`../assets/pickups/pickup_${type}.glb`), `PICKUP_MODELS has no ${type}`);
  }
});
