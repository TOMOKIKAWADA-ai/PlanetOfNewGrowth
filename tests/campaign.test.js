import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINAL_CHAPTER, getStage, isFinalChapter, loadProgress, saveProgress, clearProgress, requestLaunch, takeLaunchRequest
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
