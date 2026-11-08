// Summarises bot-play.mjs results for the balance diagnosis (backlog A2) as Markdown tables.
//
//   node scripts/bot-report.mjs tmp/bot/a2            # every bot-*.json in the folder
//   node scripts/bot-report.mjs a.json b.json > out.md
//
// Needs results recorded with the A2 counters (kills, xpGained, damageBySource, damageLog in each run).
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const inputs = process.argv.slice(2);
if (!inputs.length) {
  console.error('usage: node scripts/bot-report.mjs <dir|file.json>...');
  process.exit(1);
}
const files = [];
for (const input of inputs) {
  if ((await stat(input)).isDirectory()) {
    for (const name of (await readdir(input)).sort()) if (/^bot-.*\.json$/.test(name)) files.push(path.join(input, name));
  } else files.push(input);
}

const runs = [];
for (const file of files) {
  const report = JSON.parse(await readFile(file, 'utf8'));
  for (const result of report.results) {
    if (!result.damageLog) continue; // older result without the A2 counters
    // Results recorded before bot-play.mjs named it: the shockwave hits from an object literal's update() in main.js.
    if (result.damageBySource['Object.update']) {
      result.damageBySource.motherShockwave = (result.damageBySource.motherShockwave ?? 0) + result.damageBySource['Object.update'];
      delete result.damageBySource['Object.update'];
    }
    for (const entry of result.damageLog) if (entry.source === 'Object.update') entry.source = 'motherShockwave';
    runs.push({ ...result, characterId: report.characterId, stageId: report.stageId, startAt: report.startAt ?? 0 });
  }
}
if (!runs.length) {
  console.error('no runs with A2 counters found');
  process.exit(1);
}

const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const mean = list => list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : 0;
const pct = (part, whole) => whole ? `${Math.round(part / whole * 100)}%` : '-';
const groupBy = (list, key) => list.reduce((map, item) => map.set(key(item), [...(map.get(key(item)) ?? []), item]), new Map());
const out = [];
const table = (head, rows) => {
  out.push(`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(row => `| ${row.join(' | ')} |`), '');
};

// 1. Outcome per chapter and character.
out.push('## 結果（章 × キャラ）', '');
const byStageChar = groupBy(runs, run => `${run.stageId}|${run.characterId}`);
table(['章', 'キャラ', '回数', '勝ち', '終了(秒)', '被ダメージ', 'Lv', '撃破数', '母卵の出現'], [...byStageChar].sort().map(([key, list]) => {
  const [stage, character] = key.split('|');
  return [stage, character, list.length, list.filter(run => run.victory).length,
    list.map(run => run.endedAt).join(' / '), round(mean(list.map(run => run.damageTaken)), 0),
    list.map(run => run.finalLevel).join('/'), round(mean(list.map(run => run.kills)), 0),
    list.map(run => run.motherSpawnedAt === null ? '-' : Math.round(run.motherSpawnedAt)).join('/')];
}));

// 2. Where the HP went, per chapter (all characters together).
out.push('## 被ダメージの内訳（章ごと、全キャラ合計）', '');
const byStage = groupBy(runs, run => run.stageId);
const sourceRows = [];
for (const [stage, list] of [...byStage].sort((a, b) => a[0] - b[0])) {
  const totals = {};
  for (const run of list) for (const [source, value] of Object.entries(run.damageBySource)) totals[source] = (totals[source] ?? 0) + value;
  const whole = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source, value]) => `${source} ${pct(value, whole)}`);
  sourceRows.push([stage, list.length, round(whole / list.length, 0), top.join('、')]);
}
table(['章', '回数', '1回あたり', '多い順（上位5）'], sourceRows);

// 3. Quiet stretches: 10 s windows with almost no kills, no damage and no level-up, before the boss.
out.push('## 静かな時間帯（10 秒ごと。撃破がその回の中央値の 3 割未満、被ダメージ 0、レベルアップなし）', '');
const windowStats = new Map();
for (const run of runs) {
  const samples = run.samples;
  const kills = [];
  for (let i = 1; i < samples.length; i++) kills.push(samples[i].kills - samples[i - 1].kills);
  const median = [...kills].sort((a, b) => a - b)[Math.floor(kills.length / 2)] ?? 0;
  for (let i = 1; i < samples.length; i++) {
    const from = samples[i - 1];
    const to = samples[i];
    const window = `${from.t}–${to.t}`;
    const entry = windowStats.get(window) ?? { from: from.t, runs: 0, quiet: 0, kills: 0, xp: 0, damage: 0 };
    const k = to.kills - from.kills;
    const quiet = k < median * 0.3 && to.damage === from.damage && to.level === from.level;
    entry.runs++;
    entry.quiet += quiet ? 1 : 0;
    entry.kills += k;
    entry.xp += to.xp - from.xp;
    entry.damage += to.damage - from.damage;
    windowStats.set(window, entry);
  }
}
table(['時間帯(秒)', '回数', '静かだった回', '撃破/回', '経験値/回', '被ダメージ/回'],
  [...windowStats].sort((a, b) => a[1].from - b[1].from).map(([window, entry]) => [
    window, entry.runs, `${entry.quiet}（${pct(entry.quiet, entry.runs)}）`,
    round(entry.kills / entry.runs), round(entry.xp / entry.runs, 0), round(entry.damage / entry.runs, 0)
  ]));

// 4. Deaths: how fast the HP went and what took it.
out.push('## 倒れた回（最後の 10 秒）', '');
const deathRows = [];
for (const run of runs.filter(run => run.diedAt !== null)) {
  const last = run.damageLog.filter(entry => entry.t > run.diedAt - 10);
  const lastTotal = last.reduce((sum, entry) => sum + entry.amount, 0);
  const bySource = {};
  for (const entry of last) bySource[entry.source] = (bySource[entry.source] ?? 0) + entry.amount;
  const top = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([source, value]) => `${source} ${pct(value, lastTotal)}`);
  // Peak damage within any 3 s span of the run.
  let peak = 0;
  for (let i = 0, j = 0, sum = 0; j < run.damageLog.length; j++) {
    sum += run.damageLog[j].amount;
    while (run.damageLog[j].t - run.damageLog[i].t > 3) sum -= run.damageLog[i++].amount;
    peak = Math.max(peak, sum);
  }
  const hpBefore = [...run.samples].reverse().find(sample => sample.t <= run.diedAt - 10)?.hp ?? '-';
  deathRows.push([run.stageId, run.characterId, run.seed, run.diedAt, hpBefore, round(lastTotal, 0), round(peak, 0), top.join('、')]);
}
table(['章', 'キャラ', 'seed', '倒れた(秒)', '10 秒前の HP', '最後の 10 秒の被ダメージ', '3 秒の最大', '内訳'], deathRows);

// 5. Upgrades: the bot picks at random, so compare runs that took an upgrade with those that did not.
out.push('## 強化（ボットはランダムに選ぶ。取った回と取らなかった回の比較）', '');
const titles = new Set(runs.flatMap(run => run.upgrades.map(upgrade => upgrade.title)));
const upgradeRows = [];
for (const title of titles) {
  const withIt = runs.filter(run => run.upgrades.some(upgrade => upgrade.title === title));
  const without = runs.filter(run => !run.upgrades.some(upgrade => upgrade.title === title));
  if (withIt.length < 3 || without.length < 3) continue;
  const end = list => mean(list.map(run => run.endedAt - run.startAt));
  const damage = list => mean(list.map(run => run.damageTaken));
  const kills = list => mean(list.map(run => run.kills));
  upgradeRows.push({
    title, n: withIt.length,
    endDiff: end(withIt) - end(without),
    damageDiff: damage(withIt) - damage(without),
    killsDiff: kills(withIt) - kills(without)
  });
}
upgradeRows.sort((a, b) => b.endDiff - a.endDiff);
table(['強化', '取った回', '生存(秒)の差', '被ダメージの差', '撃破数の差'],
  upgradeRows.map(row => [row.title, row.n, round(row.endDiff), round(row.damageDiff, 0), round(row.killsDiff, 0)]));

console.log(`${runs.length} 回（${files.length} ファイル）\n`);
console.log(out.join('\n'));
