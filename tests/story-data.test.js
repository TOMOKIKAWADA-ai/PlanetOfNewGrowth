import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROLOGUE, STORY_CHARACTERS, CIVILIAN_ART, STORY_CHAPTER_COUNT, createBriefing, createAftermath
} from '../src/story-data.js';
import { CHARACTER_EXPRESSIONS } from '../src/character-portraits.js';
import { Config } from '../src/config.js';
import { STAGES } from '../src/campaign.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const soldiers = ['tsukimi', 'akame', 'kiichigo'];
const chapters = Array.from({ length: STORY_CHAPTER_COUNT }, (_, i) => i + 1);
const allScenes = id => chapters.flatMap(chapter => [createBriefing(id, chapter), createAftermath(id, chapter)]);
const textOf = scene => scene.lines.map(line => line.text).join('\n');

test('every scene has valid, short pages and known speakers/expressions', () => {
  const scenes = [PROLOGUE, ...soldiers.flatMap(allScenes)];
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

test('every chapter has a stage, a departure line for the selected soldier, and a return call', () => {
  assert.deepEqual(Object.keys(STAGES).map(Number), chapters);
  for (const chapter of chapters) for (const id of soldiers) {
    const briefing = createBriefing(id, chapter);
    assert.ok(briefing.lines.some(line => line.speaker === id && line.close), `chapter ${chapter}`);
    assert.equal(createAftermath(id, chapter).lines[1].speaker, id, `chapter ${chapter}`);
  }
  assert.ok(createBriefing('tsukimi').lines.some(line => line.speaker === 'tsukimi' && /ポンプ/.test(line.text)));
  assert.deepEqual(createBriefing('unknown'), createBriefing('tsukimi'));
  assert.deepEqual(createAftermath('unknown'), createAftermath('tsukimi'));
  assert.equal(createAftermath('tsukimi', STORY_CHAPTER_COUNT + 1), null);
});

test('soldier portraits and rooted civilian artwork remain distinct', () => {
  assert.deepEqual(Object.keys(STORY_CHARACTERS).filter(id => STORY_CHARACTERS[id].portrait), soldiers);
  for (const id of ['enju', 'minari', 'rindou', 'keshi', 'kunugi']) {
    assert.ok(STORY_CHARACTERS[id].role);
    assert.ok([...createBriefing('tsukimi').lines, ...createAftermath('tsukimi').lines].some(line => line.speaker === id));
  }
  for (const source of Object.values(CIVILIAN_ART)) assert.ok(existsSync(fileURLToPath(source)), source);
  for (const scene of [PROLOGUE, ...allScenes('tsukimi')]) for (const line of scene.lines) {
    for (const source of line.art ? (Array.isArray(line.art) ? line.art : [line.art]) : []) {
      assert.ok(Object.values(CIVILIAN_ART).includes(source));
    }
  }
});

test('the water chapter keeps its fish-form guidance', () => {
  for (const id of soldiers) {
    const scene = createBriefing(id, 3);
    assert.equal(scene.subtitle, '水底に残るもの');
    assert.ok(scene.lines.some(line => line.text.includes('魚形態')));
  }
});

test('chapter one preserves both the rescue and its cost', () => {
  const script = textOf(createAftermath('tsukimi'));
  for (const detail of ['六人', '温室', '三か月', '種の箱']) assert.ok(script.includes(detail));
  assert.match(script, /気味が悪い/);
  assert.match(script, /怖い/);
  assert.match(script, /ありがとう/);
});

test('the white lotus vault is planted in the prologue and paid off after chapter one', () => {
  const prologue = textOf(PROLOGUE);
  assert.match(prologue, /一年前の冬、黒い卵/);
  assert.match(prologue, /同じ冬、白蓮保管庫で三人/);
  for (const id of soldiers) {
    const lines = createAftermath(id).lines;
    const shell = lines.findIndex(line => line.text.includes('白蓮保管庫'));
    const reaction = lines.findIndex((line, index) => index > shell && line.speaker === id);
    const gag = createBriefing(id).lines.findIndex(line => /焦がした砂糖/.test(line.text));
    assert.ok(shell > 0 && reaction > shell, id);
    assert.ok(gag >= 0, 'the taste of eggs is set up before the battle');
    assert.ok(lines.some(line => line.speaker === 'enju' && /話すな/.test(line.text)));
    assert.equal(lines.at(-2).speaker, id, 'the selected soldier answers the taste question');
  }
});

test('the secrets planted early are answered later in the campaign', () => {
  const tsukimi = Object.fromEntries(chapters.map(c => [c, { brief: textOf(createBriefing('tsukimi', c)), after: textOf(createAftermath('tsukimi', c)) }]));
  // プロローグで叫んだ観測員が第2章で理由を明かし、エンディングで迎える。
  assert.match(textOf(PROLOGUE), /「触らないで！」/);
  assert.match(tsukimi[2].after, /卵と同じ匂いがした/);
  assert.match(tsukimi[6].after, /今日は、叫ばないわ/);
  // 第2章の記録が卵の出どころを示し、第3章で確かめる。
  assert.match(tsukimi[2].after, /白蓮保管庫/);
  assert.match(tsukimi[3].brief, /記録のとおり/);
  // エンジュは声だけの存在として置かれ、保管庫の制御室で姿を見せる。
  assert.match(tsukimi[3].brief, /エンジュの顔って見たことない/);
  assert.match(tsukimi[3].after, /一本の槐が根を張っていた/);
  // 「昔なにをしたのか」は第4章でケシが答え、第5章で足の意味が反転する。
  assert.match(textOf(PROLOGUE), /昔なにをしたのか/);
  assert.match(tsukimi[4].brief, /動けなければ、奪いに行けない/);
  assert.match(tsukimi[5].brief, /水を奪いに行く足/);
  assert.match(tsukimi[5].after, /奪う足じゃ、なかったのね/);
  // 守る順番は、三人が決め直す。
  assert.match(tsukimi[1].brief, /順番を決める/);
  assert.match(tsukimi[5].after, /順番は、私たちが決める/);
  // 水を止めた代償（ニレ）は、運んだ水で回収する。
  assert.match(tsukimi[4].after, /ポンプが止まった/);
  assert.match(tsukimi[5].after, /ニレの葉が一枚、ゆっくりと開いた/);
  // ハスノ区の戸口の外で待っていた三人が、最後に内側へ入る。
  assert.match(tsukimi[1].after, /外で待ちます/);
  assert.match(tsukimi[6].after, /靴は脱いで/);
  for (const id of soldiers) {
    const lines = createAftermath(id, 3).lines;
    assert.ok(lines.some(line => line.speaker === id && /黙って|言えなくて/.test(line.text)), 'the shard is confessed');
  }
});

test('the days count down without going backwards', () => {
  const kanji = { 六: 6, 五: 5, 四: 4, 三: 3, 二: 2, 一: 1 };
  const days = chapters.flatMap(chapter => [createBriefing('tsukimi', chapter), createAftermath('tsukimi', chapter)])
    .flatMap(scene => scene.lines)
    .flatMap(line => [...`${line.label ?? ''}${line.text}`.matchAll(/一斉孵化まで、あと(.)日/g)].map(match => kanji[match[1]]));
  assert.ok(days.length >= chapters.length);
  for (let i = 1; i < days.length; i++) assert.ok(days[i] <= days[i - 1], days.join(','));
});

test('rescue-side lines never go to the soldier left at the pump', () => {
  for (const id of soldiers) {
    const lines = createAftermath(id).lines;
    const sorry = lines.find(line => line.text.startsWith('……うるさかった？'));
    const seeds = lines.find(line => line.text.includes('種とは言われてない'));
    assert.notEqual(sorry.speaker, id);
    assert.notEqual(seeds.speaker, id);
  }
});

test('every briefing states the real stage timing', () => {
  const minutes = ['零', '一', '二', '三', '四', '五', '六'];
  for (const chapter of chapters) {
    const script = textOf(createBriefing('tsukimi', chapter));
    assert.ok(script.includes(`${minutes[Config.map.playSeconds / 60]}分`), `chapter ${chapter}`);
    assert.ok(script.includes(`${minutes[Config.map.motherSpawnSeconds / 60]}分`), `chapter ${chapter}`);
  }
});
