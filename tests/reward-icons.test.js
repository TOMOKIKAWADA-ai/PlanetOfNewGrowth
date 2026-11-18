import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ChapterRewards } from '../src/config.js';
import { rewardIconUrl } from '../src/ui.js';

// B4-2 引き継ぎ強化のアイコン: 15 個すべてに、実在する絵が付いている。
test('every carry-over reward has an icon file', () => {
  const ids = Object.values(ChapterRewards).flat().map(reward => reward.id);
  assert.equal(ids.length, 15);
  for (const id of ids) {
    const url = rewardIconUrl(id);
    assert.ok(url, `no icon for ${id}`);
    assert.ok(existsSync(fileURLToPath(url)), `missing file for ${id}: ${url}`);
  }
});

test('unknown rewards get no icon', () => {
  assert.equal(rewardIconUrl('noSuchReward'), null);
});
