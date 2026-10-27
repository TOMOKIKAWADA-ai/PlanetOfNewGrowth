// Print the currently implemented story text; redirect it only when an export is needed.
import { STORY_CHARACTERS, PROLOGUE, createBriefing, createAftermath } from '../src/story-data.js';
import { CAMPAIGN_STAGES } from '../src/campaign.js';

const characterIds = ['tsukimi', 'akame', 'kiichigo'];
const characterName = id => STORY_CHARACTERS[id]?.name ?? id;
const sameLine = (a, b) => a?.speaker === b?.speaker && a?.text === b?.text && a?.label === b?.label;

function formattedLine(line, indent = '') {
  const who = line.speaker ? characterName(line.speaker) : 'ナレーション';
  const label = line.label ? `［${line.label}］\n${indent}` : '';
  const lines = line.text.split('\n');
  return `${label}${who}：${lines.join(`\n${indent}    `)}`;
}

function section(title, scenes) {
  const [first, ...other] = scenes;
  const out = ['', `■ ${title}`, ''];
  first.lines.forEach((line, index) => {
    const same = other.every(scene => sameLine(line, scene.lines[index]));
    out.push(`${String(index + 1).padStart(2, '0')}. ${same ? formattedLine(line, '    ') : '［選択キャラによる分岐］'}`);
    if (!same) scenes.forEach((scene, branch) => {
      out.push(`    ${characterName(characterIds[branch])}を選択：${formattedLine(scene.lines[index], '        ')}`);
    });
    out.push('');
  });
  return out.join('\n');
}

process.stdout.write([
  '実装版ストーリー台本',
  '出典: src/story-data.js',
  '※ 地の文とセリフを表示順に記載。表情・背景画像などの演出指定は省略。',
  '※ 一般市民と深淵の花々の（ ）は、揮発性物質による会話を端末が言葉に変えた表記。',
  section('プロローグ「防除線のこちら側」', [PROLOGUE]),
  ...CAMPAIGN_STAGES.flatMap(stage => [
    section(`第${stage.id}章「${stage.title}」・戦闘前`, characterIds.map(id => createBriefing(id, stage.id))),
    section(stage.id === 5 ? 'エンディング（巨大母卵撃破時）' : `第${stage.id}章「${createAftermath('tsukimi', stage.id).subtitle}」・戦闘後（母卵撃破時）`, characterIds.map(id => createAftermath(id, stage.id)))
  ])
].join('\n').trimEnd() + '\n');
