import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINAL_CHAPTER, getStage, isFinalChapter, loadProgress, saveProgress, clearProgress, requestLaunch, takeLaunchRequest,
  startCarryOver, saveCarryOver, loadCarryOver
} from '../src/campaign.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
}

test('stages reuse the two existing maps and end on the final chapter', () => {
  assert.equal(FINAL_CHAPTER, 6);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(id => getStage(id).terrain), ['grass', 'grass', 'water', 'grass', 'water', 'water']);
  assert.equal(getStage(99).chapter, 1);
  assert.ok(isFinalChapter(6) && !isFinalChapter(5));
  assert.equal(getStage(6).label, '最終章');
  for (let chapter = 2; chapter <= FINAL_CHAPTER; chapter++) {
    assert.ok(getStage(chapter).motherHpScale >= getStage(chapter - 1).motherHpScale);
  }
});

test('progress is saved, validated, and cleared', () => {
  const storage = memoryStorage();
  assert.equal(loadProgress(storage), null);
  saveProgress(3, 'akame', storage);
  assert.deepEqual(loadProgress(storage), { chapter: 3, characterId: 'akame' });
  saveProgress(9, 'akame', storage);
  assert.equal(loadProgress(storage), null);
  storage.setItem('searchSurvive.campaign', '{broken');
  assert.equal(loadProgress(storage), null);
  saveProgress(2, 'kiichigo', storage);
  clearProgress(storage);
  assert.equal(loadProgress(storage), null);
});

test('a launch request is consumed once', () => {
  const storage = memoryStorage();
  requestLaunch(2, 'tsukimi', storage);
  assert.deepEqual(takeLaunchRequest(storage), { chapter: 2, characterId: 'tsukimi' });
  assert.equal(takeLaunchRequest(storage), null);
});

test('storage failures do not throw', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.doesNotThrow(() => saveProgress(2, 'akame', broken));
  assert.equal(loadProgress(broken), null);
  assert.equal(takeLaunchRequest(broken), null);
});

test('carry-over choices stack by chapter and drop on retry or character change', () => {
  const storage = memoryStorage();
  assert.deepEqual(startCarryOver(1, 'akame', storage), []);
  saveCarryOver(1, 'akame', { upgradeId: 'damage' }, storage);
  saveCarryOver(1, 'akame', { rewardId: 'pumpGuard' }, storage);
  saveCarryOver(2, 'akame', { upgradeId: 'seeds', rewardId: 'shirayuriRecord' }, storage);
  assert.deepEqual(startCarryOver(3, 'akame', storage), [
    { chapter: 1, upgradeId: 'damage', rewardId: 'pumpGuard' },
    { chapter: 2, upgradeId: 'seeds', rewardId: 'shirayuriRecord' }
  ]);
  // Retrying chapter 2 forgets what was chosen after clearing it.
  assert.deepEqual(startCarryOver(2, 'akame', storage), [{ chapter: 1, upgradeId: 'damage', rewardId: 'pumpGuard' }]);
  assert.deepEqual(loadCarryOver('akame', storage), { 1: { upgradeId: 'damage', rewardId: 'pumpGuard' } });
  assert.deepEqual(startCarryOver(2, 'kiichigo', storage), []);
  assert.deepEqual(loadCarryOver('akame', storage), {});
  storage.setItem('searchSurvive.carryOver', '{broken');
  assert.deepEqual(startCarryOver(3, 'akame', storage), []);
});
