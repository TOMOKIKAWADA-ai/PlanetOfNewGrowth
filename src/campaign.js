// 章ごとの戦闘マップと、章をまたぐ進行の保存。
// ゲームは結果画面からページを再読み込みして作り直すため、次に始める章は sessionStorage で受け渡す。

// 既存の草原・水没マップを使い回し、光の色と明るさで時間帯と場所を変える。
const DAYLIGHT = Object.freeze({ exposure: 1, sky: 0xcfe0ff, ground: 0x26342b, sun: 0xfff0cf, fill: 0xaec8ff });

export const STAGES = Object.freeze({
  1: Object.freeze({
    chapter: 1, label: '第1章', title: '守る順番', terrain: 'grass', worldColor: 0x15201d, fog: 0.012,
    motherHpScale: 1, motherName: '母卵', light: DAYLIGHT
  }),
  2: Object.freeze({
    chapter: 2, label: '第2章', title: 'シラユリの記録', terrain: 'grass', worldColor: 0x2a1a12, fog: 0.016,
    motherHpScale: 1.1, motherName: '母卵',
    light: Object.freeze({ exposure: 0.8, sky: 0xffc89a, ground: 0x2b2016, sun: 0xffa866, fill: 0x8fa6d8 })
  }),
  3: Object.freeze({
    chapter: 3, label: '第3章', title: '水底に残るもの', terrain: 'water', worldColor: 0x173a43, fog: 0.017,
    motherHpScale: 1.2, motherName: '母卵', light: DAYLIGHT
  }),
  4: Object.freeze({
    chapter: 4, label: '第4章', title: '根の誓い', terrain: 'grass', worldColor: 0x070d1a, fog: 0.02,
    motherHpScale: 1.3, motherName: '母卵',
    light: Object.freeze({ exposure: 0.5, sky: 0x6f8fd0, ground: 0x0d1424, sun: 0x9fb8ff, fill: 0x5d79c4 })
  }),
  5: Object.freeze({
    chapter: 5, label: '第5章', title: '水を運ぶ足', terrain: 'water', worldColor: 0x3a2412, fog: 0.018,
    motherHpScale: 1.45, motherName: '母卵',
    light: Object.freeze({ exposure: 0.7, sky: 0xffc27a, ground: 0x3a2412, sun: 0xff9a48, fill: 0x9db2d8 })
  }),
  6: Object.freeze({
    chapter: 6, label: '最終章', title: '白蓮', terrain: 'water', worldColor: 0x2a0b12, fog: 0.022,
    motherHpScale: 1.6, motherName: '白蓮の核',
    light: Object.freeze({ exposure: 0.62, sky: 0xffc2c2, ground: 0x2a0b12, sun: 0xff8f7a, fill: 0xd9e4ff })
  })
});

export const FINAL_CHAPTER = Math.max(...Object.keys(STAGES).map(Number));

export function getStage(stageId) {
  return STAGES[stageId] ?? STAGES[1];
}

export function isFinalChapter(stageId) {
  return Number(stageId) === FINAL_CHAPTER;
}

const SOLDIERS = ['tsukimi', 'akame', 'kiichigo'];
const PROGRESS_KEY = 'searchSurvive.campaign';
const LAUNCH_KEY = 'searchSurvive.launch';

function validEntry(value) {
  if (!value || !SOLDIERS.includes(value.characterId)) return null;
  const chapter = Number(value.chapter);
  if (!STAGES[chapter]) return null;
  return { chapter, characterId: value.characterId };
}

function read(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw ? validEntry(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function write(storage, key, value) {
  try {
    if (value) storage?.setItem(key, JSON.stringify(value));
    else storage?.removeItem(key);
  } catch {
    // 保存できない環境でも、今回のプレイは続けられる。
  }
}

const localStore = () => { try { return window.localStorage; } catch { return null; } };
const sessionStore = () => { try { return window.sessionStorage; } catch { return null; } };

// 「つづきから」で始める章。クリア済みの場合は null。
export function loadProgress(storage = localStore()) {
  return read(storage, PROGRESS_KEY);
}

export function saveProgress(chapter, characterId, storage = localStore()) {
  write(storage, PROGRESS_KEY, validEntry({ chapter, characterId }));
}

export function clearProgress(storage = localStore()) {
  write(storage, PROGRESS_KEY, null);
}

// 再読み込み直後に、タイトルを飛ばして始める章。
export function requestLaunch(chapter, characterId, storage = sessionStore()) {
  write(storage, LAUNCH_KEY, validEntry({ chapter, characterId }));
}

export function takeLaunchRequest(storage = sessionStore()) {
  const launch = read(storage, LAUNCH_KEY);
  write(storage, LAUNCH_KEY, null);
  return launch;
}

// 章をクリアしたときに選んだ引き継ぎ強化。{ characterId, entries: { [クリアした章]: { upgradeId, rewardId } } }
const CARRY_KEY = 'searchSurvive.carryOver';

function readCarry(storage) {
  try {
    const raw = storage?.getItem(CARRY_KEY);
    const value = raw ? JSON.parse(raw) : null;
    if (!value || !SOLDIERS.includes(value.characterId) || typeof value.entries !== 'object' || !value.entries) return null;
    return value;
  } catch {
    return null;
  }
}

function writeCarry(storage, value) {
  try {
    if (value && Object.keys(value.entries).length) storage?.setItem(CARRY_KEY, JSON.stringify(value));
    else storage?.removeItem(CARRY_KEY);
  } catch {
    // 保存できなくても、今回のプレイは続けられる。
  }
}

function cleanEntry(entry) {
  const result = {};
  if (typeof entry?.upgradeId === 'string') result.upgradeId = entry.upgradeId;
  if (typeof entry?.rewardId === 'string') result.rewardId = entry.rewardId;
  return result;
}

// 章を始めるときに呼ぶ。それより前の章で選んだ分を章の順に返し、その章以降の分（やり直し前の選択）は消す。
export function startCarryOver(chapter, characterId, storage = localStore()) {
  const saved = readCarry(storage);
  if (!saved || saved.characterId !== characterId) {
    writeCarry(storage, null);
    return [];
  }
  const entries = {};
  for (const [key, entry] of Object.entries(saved.entries)) {
    if (Number(key) < chapter && STAGES[Number(key)]) entries[key] = cleanEntry(entry);
  }
  writeCarry(storage, { characterId, entries });
  return Object.keys(entries).map(Number).sort((a, b) => a - b).map(key => ({ chapter: key, ...entries[key] }));
}

// クリアした章の選択を保存する。upgradeId と rewardId は片方ずつ渡してよい。
export function saveCarryOver(chapter, characterId, choice, storage = localStore()) {
  if (!STAGES[chapter] || !SOLDIERS.includes(characterId)) return;
  const saved = readCarry(storage);
  const entries = saved?.characterId === characterId ? { ...saved.entries } : {};
  for (const key of Object.keys(entries)) if (Number(key) > chapter) delete entries[key];
  entries[chapter] = { ...cleanEntry(entries[chapter]), ...cleanEntry(choice) };
  writeCarry(storage, { characterId, entries });
}

export function loadCarryOver(characterId, storage = localStore()) {
  const saved = readCarry(storage);
  return saved?.characterId === characterId ? saved.entries : {};
}
