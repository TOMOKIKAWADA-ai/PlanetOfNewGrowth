import test from 'node:test';
import assert from 'node:assert/strict';
import { PROLOGUE, STORY_CHARACTERS, createBriefing, createAftermath } from '../src/story-data.js';
import { CHARACTER_EXPRESSIONS } from '../src/character-portraits.js';

const soldiers = ['tsukimi', 'akame', 'kiichigo'];

test('every scene has valid, short pages and known speakers/expressions', () => {
  const scenes = [PROLOGUE, ...soldiers.flatMap(id => [createBriefing(id), createBriefing(id, 2), createAftermath(id)])];
  for (const scene of scenes) {
    assert.ok(scene.title && scene.subtitle && scene.lines.length);
    assert.ok(scene.lines[0].background);
    for (const line of scene.lines) {
      assert.equal(typeof line.text, 'string');
      assert.ok(line.text.length > 0 && line.text.length <= 110, line.text);
      if (line.speaker) {
        assert.ok(STORY_CHARACTERS[line.speaker], line.speaker);
        assert.ok(CHARACTER_EXPRESSIONS.includes(line.expression), line.expression);
      }
    }
  }
});

test('chapter one gives each selected soldier the source assignment and return call', () => {
  for (const id of soldiers) {
    assert.ok(createBriefing(id).lines.some(line => line.speaker === id && /ポンプ/.test(line.text)));
    assert.equal(createAftermath(id).lines[1].speaker, id);
  }
  assert.deepEqual(createBriefing('unknown'), createBriefing('tsukimi'));
  assert.deepEqual(createAftermath('unknown'), createAftermath('tsukimi'));
});

test('only the three soldiers have portraits; the NPCs have distinct identities', () => {
  assert.deepEqual(Object.keys(STORY_CHARACTERS).filter(id => STORY_CHARACTERS[id].portrait), soldiers);
  for (const id of ['enju', 'minari', 'rindou']) {
    assert.ok(STORY_CHARACTERS[id].role);
    assert.ok([...createBriefing('tsukimi').lines, ...createAftermath('tsukimi').lines].some(line => line.speaker === id));
  }
});

test('water stage keeps its existing briefing without chapter one aftermath', () => {
  for (const id of soldiers) {
    const scene = createBriefing(id, 2);
    assert.equal(scene.subtitle, '水底に残るもの');
    assert.equal(scene.lines.at(-1).speaker, id);
    assert.ok(scene.lines.some(line => line.text.includes('魚形態')));
    assert.equal(createAftermath(id, 2), null);
  }
});

test('chapter one preserves both the rescue and its cost', () => {
  const script = createAftermath('tsukimi').lines.map(line => line.text).join('\n');
  for (const detail of ['六人', '温室', '三か月', '種の箱', '水が流れていた']) assert.ok(script.includes(detail));
});
