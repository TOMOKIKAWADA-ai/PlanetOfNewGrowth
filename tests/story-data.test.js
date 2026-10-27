import test from 'node:test';
import assert from 'node:assert/strict';
import { PROLOGUE, STORY_CHARACTERS, CIVILIAN_ART, createBriefing, createAftermath } from '../src/story-data.js';
import { CAMPAIGN_STAGES, FINAL_STAGE_ID, getCampaignStage, getNextCampaignStage } from '../src/campaign.js';
import { CHARACTER_EXPRESSIONS, getCharacterPortrait } from '../src/character-portraits.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const soldiers = ['tsukimi', 'akame', 'kiichigo'];

test('every scene has valid, short pages and known speakers/expressions', () => {
  const scenes = [PROLOGUE, ...soldiers.flatMap(id => CAMPAIGN_STAGES.flatMap(stage => [createBriefing(id, stage.id), createAftermath(id, stage.id)]))];
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

test('soldier portraits and rooted civilian artwork remain distinct', () => {
  assert.deepEqual(Object.keys(STORY_CHARACTERS).filter(id => STORY_CHARACTERS[id].portrait), [...soldiers, 'sayo', 'yura']);
  for (const id of ['sayo', 'yura']) {
    assert.ok(existsSync(fileURLToPath(getCharacterPortrait(STORY_CHARACTERS[id].portraitId))), id);
  }
  for (const id of ['enju', 'minari', 'rindou', 'keshi', 'kunugi', 'fuki', 'ibara', 'kinu', 'yoru', 'nemu', 'gaia']) {
    assert.ok(STORY_CHARACTERS[id].role);
    assert.ok(CAMPAIGN_STAGES.some(stage => [...createBriefing('tsukimi', stage.id).lines, ...createAftermath('tsukimi', stage.id).lines].some(line => line.speaker === id)));
  }
  for (const source of Object.values(CIVILIAN_ART)) assert.ok(existsSync(fileURLToPath(source)), source);
  const scenes = [PROLOGUE, ...CAMPAIGN_STAGES.flatMap(stage => [createBriefing('tsukimi', stage.id), createAftermath('tsukimi', stage.id)])];
  for (const scene of scenes) for (const line of scene.lines) {
    for (const source of line.art ? (Array.isArray(line.art) ? line.art : [line.art]) : []) {
      assert.ok(Object.values(CIVILIAN_ART).includes(source));
    }
  }
});

test('five playable chapters connect to an ending', () => {
  assert.deepEqual(CAMPAIGN_STAGES.map(stage => stage.id), [1, 2, 3, 4, 5]);
  assert.equal(FINAL_STAGE_ID, 5);
  for (const stage of CAMPAIGN_STAGES) {
    assert.equal(getCampaignStage(stage.id), stage);
    assert.equal(getNextCampaignStage(stage.id)?.id ?? null, stage.id < FINAL_STAGE_ID ? stage.id + 1 : null);
    assert.ok(stage.objective && stage.result && stage.bossScale > 0);
    for (const id of soldiers) {
      assert.equal(createBriefing(id, stage.id).subtitle, stage.title);
      assert.ok(createAftermath(id, stage.id).lines.length >= 10);
    }
  }
  assert.equal(CAMPAIGN_STAGES[1].terrain, 'water');
  assert.equal(CAMPAIGN_STAGES[3].terrain, 'water');
  assert.equal(createAftermath('akame', 5).title, 'ENDING');
  const ending = createAftermath('akame', 5).lines.map(line => line.text).join('\n');
  for (const detail of ['焼却命令を取り消します', '通れた', '世界は続いていた']) assert.ok(ending.includes(detail));
});

test('civilian messages use volatile substances and full-width parentheses', () => {
  for (const character of Object.values(STORY_CHARACTERS)) {
    if (character.artwork) assert.equal(character.communication, 'volatile');
  }
  const scenes = CAMPAIGN_STAGES.flatMap(stage => [createBriefing('tsukimi', stage.id), createAftermath('tsukimi', stage.id)]);
  for (const scene of scenes) for (const line of scene.lines) {
    if (!line.speaker) continue;
    if (STORY_CHARACTERS[line.speaker].communication === 'volatile') {
      assert.match(line.text, /^（[\s\S]+）$/, line.speaker);
    } else {
      assert.ok(!line.text.startsWith('（'), line.speaker);
    }
  }
  assert.match(PROLOGUE.lines.map(line => line.text).join('\n'), /一般市民は、揮発性物質でしか会話できない/);
});

test('missing soldiers choose their flower partners and the choice changes the later conflict', () => {
  const chapterTwo = [createBriefing('tsukimi', 2), createAftermath('tsukimi', 2)];
  const encounter = chapterTwo.flatMap(scene => scene.lines).map(line => line.text).join('\n');
  for (const detail of ['行方不明', 'サヨ', 'ユラ', 'ヨル', 'ネム', '信頼も愛情も性愛も', '私たちに近い']) {
    assert.ok(encounter.includes(detail), detail);
  }
  for (const id of ['tsukimi', 'akame', 'kiichigo']) {
    assert.ok(chapterTwo.flatMap(scene => scene.lines).some(line => line.speaker === id && /敵|花|市民/.test(line.text)), id);
  }
  for (const id of ['yoru', 'nemu']) {
    assert.equal(STORY_CHARACTERS[id].communication, 'volatile');
    assert.ok(chapterTwo.flatMap(scene => scene.lines).some(line => line.speaker === id && /^（[\s\S]+）$/.test(line.text)));
  }
  for (const detail of ['追討対象', '中央から外された']) {
    assert.ok([encounter, CAMPAIGN_STAGES[1].result].some(text => text.includes(detail)), detail);
  }
  const later = [3, 4, 5].flatMap(stage => [createBriefing('tsukimi', stage), createAftermath('tsukimi', stage)])
    .flatMap(scene => scene.lines).map(line => line.text).join('\n');
  for (const detail of ['クーデター', '植物人類を終わらせよう', '旧人類の遺伝子を移植', 'エンジュの発令権を停止', 'ヨル', 'ネム']) {
    assert.ok(later.includes(detail), detail);
  }
});

test('the three protagonists defend citizens and reconciled flowers against every attacker', () => {
  for (const id of soldiers) {
    const pledge = createAftermath(id, 3).lines.map(line => line.text).join('\n');
    for (const detail of ['キヌさんたちは市民', '人と和解したヨルたちも守る', '中央の追討隊', '暴走卵', '襲う花', 'すべてと戦う']) {
      assert.ok(pledge.includes(detail), detail);
    }
  }
  const chapterFour = createBriefing('tsukimi', 4).lines.map(line => line.text).join('\n');
  assert.match(chapterFour, /襲う花は止める。ヨルたちまで焼かせない/);
  const finale = createBriefing('tsukimi', 5).lines.map(line => line.text).join('\n');
  assert.match(finale, /植物人類は、この街の市民/);
  assert.match(finale, /和解した花々も、共に生きる仲間/);
});

test('chapter one preserves both the rescue and its cost', () => {
  const script = createAftermath('tsukimi').lines.map(line => line.text).join('\n');
  for (const detail of ['六人', '温室', '三か月', '種の箱', '水が届く']) assert.ok(script.includes(detail));
  assert.match(script, /気味が悪い/);
  assert.match(script, /怖い/);
  assert.match(script, /ありがとう/);
});
