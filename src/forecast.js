// 朝の孵化予報（docs/enemy-boss-design.md の「朝：孵化予報」）。出撃前会話のあと、戦闘の前に一枚だけ出す。
// 出すのは実際にその章で出てくるものだけ（まだ作っていない新種・ボスは予報しない）。
// 「卵が覚えたこと」は E6（卵は学ぶ）の記録ができてから埋める。空なら欄ごと出さない。
import { Config } from './config.js';
import { BOSS_TYPES, DEFAULT_BOSS, getBossName, isBossImplemented } from './bosses.js';

// 新種ごとの予報。chapter はその新種が初めて出る章（その章だけ「今日の新種」に出す）。
const NEW_SPECIES = Object.freeze([
  Object.freeze({
    id: 'mimic',
    name: '擬態卵',
    trait: '普通の卵とほぼ同じ見た目。脈が少し速い',
    form: '人間形態で撃つ（鳥形態で食べると、少しのあいだ動けない）',
    chapter: () => Config.egg.mimic.fromChapter,
    enabled: () => Config.egg.mimic.enabled
  }),
  Object.freeze({
    id: 'footprint',
    name: '足跡',
    trait: '通った道を、数秒遅れでなぞって歩く',
    form: 'どちらでも（同じ所を回らない。鳥で飛ぶと道が途切れる）',
    chapter: () => Config.enemy.footprint.fromChapter,
    enabled: () => Config.enemy.footprint.enabled
  }),
  Object.freeze({
    id: 'crier',
    name: '鳴き',
    trait: '動かない。膨らんで鳴くと、周りの卵が早く孵る',
    form: '鳥形態の急降下で潰す',
    chapter: () => Config.enemy.crier.fromChapter,
    enabled: () => Config.enemy.crier.enabled
  })
]);

export function buildForecast(stage, learned = []) {
  const bossType = isBossImplemented(stage?.boss) ? BOSS_TYPES[stage.boss] : BOSS_TYPES[DEFAULT_BOSS];
  return {
    label: stage?.label ?? '',
    title: stage?.title ?? '',
    species: NEW_SPECIES
      .filter(species => species.enabled() && species.chapter() === stage?.chapter)
      .map(({ name, trait, form }) => ({ name, trait, form })),
    boss: { name: getBossName(stage), hint: bossType.forecast ?? '' },
    learned: [...learned]
  };
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export class ForecastCard {
  constructor(parent = document.getElementById('app') ?? document.body) {
    this.root = document.createElement('div');
    this.root.id = 'forecast';
    this.root.className = 'screen forecast-screen hidden';
    this.root.setAttribute('aria-labelledby', 'forecastTitle');
    parent.append(this.root);
    this.active = false;
    this.onDone = null;
    this.root.addEventListener('click', (event) => {
      if (event.target.closest('#forecastStart')) this.finish();
    });
  }

  show(forecast, onDone) {
    this.onDone = onDone;
    this.active = true;
    const species = forecast.species.length
      ? forecast.species.map(s => `<li><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.trait)}</span><em>${escapeHtml(s.form)}</em></li>`).join('')
      : '<li class="forecast-none"><span>新しい種類はいない</span></li>';
    const learned = forecast.learned.length
      ? `<section class="forecast-block"><h2>卵が覚えたこと</h2><ul>${forecast.learned.map(text => `<li><span>${escapeHtml(text)}</span></li>`).join('')}</ul></section>`
      : '';
    this.root.innerHTML = `
      <section class="forecast-panel" role="dialog" aria-modal="true">
        <p class="forecast-meta">${escapeHtml(forecast.label)}　${escapeHtml(forecast.title)}</p>
        <h1 id="forecastTitle">孵化予報</h1>
        <section class="forecast-block"><h2>今日の新種</h2><ul>${species}</ul></section>
        <section class="forecast-block forecast-boss"><h2>今日のボス</h2><ul><li><strong>${escapeHtml(forecast.boss.name)}</strong><span>${escapeHtml(forecast.boss.hint)}</span></li></ul></section>
        ${learned}
        <button id="forecastStart" type="button">出撃</button>
      </section>`;
    this.root.classList.remove('hidden');
    this.root.querySelector('#forecastStart').focus({ preventScroll: true });
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    this.root.classList.add('hidden');
    const callback = this.onDone;
    this.onDone = null;
    callback?.();
  }
}
