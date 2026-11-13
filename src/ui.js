import { Config, UpgradePool, getUpgrade } from './config.js';
import { synergyHints } from './synergies.js';
import { clamp } from './math.js';
import { isFinalChapter } from './campaign.js';
import { getBossName } from './bosses.js';
import { xpBarState } from './reward-feedback.js';
import { resultRows } from './run-stats.js';

const UPGRADE_ICON_URLS = {
  damage: new URL('../assets/ui/upgrade-icons/damage.png', import.meta.url).href,
  speed: new URL('../assets/ui/upgrade-icons/speed.png', import.meta.url).href,
  seeds: new URL('../assets/ui/upgrade-icons/seeds.png', import.meta.url).href,
  pierce: new URL('../assets/ui/upgrade-icons/pierce.png', import.meta.url).href,
  move: new URL('../assets/ui/upgrade-icons/move.png', import.meta.url).href,
  hp: new URL('../assets/ui/upgrade-icons/hp.png', import.meta.url).href,
  mp: new URL('../assets/ui/upgrade-icons/mp.png', import.meta.url).href,
  regen: new URL('../assets/ui/upgrade-icons/regen.png', import.meta.url).href,
  birdCost: new URL('../assets/ui/upgrade-icons/birdCost.png', import.meta.url).href,
  dive: new URL('../assets/ui/upgrade-icons/dive.png', import.meta.url).href,
  pulse: new URL('../assets/ui/upgrade-icons/pulse.png', import.meta.url).href,
  pickupMagnet: new URL('../assets/ui/upgrade-icons/pickupMagnet.png', import.meta.url).href
};
// 切り残しのかけらを消して中央に寄せた版（2026-11-11）。Config.visuals.cleanedUpgradeIcons: false で元の絵に戻る。
const CLEANED_UPGRADE_ICON_URLS = {
  seeds: new URL('../assets/ui/upgrade-icons/seeds-clean.png', import.meta.url).href
};

const UPGRADE_CATEGORIES = {
  damage: '攻撃', speed: '攻撃', seeds: '攻撃', pierce: '攻撃',
  move: '移動', hp: '耐久', mp: '変身', regen: '変身',
  birdCost: '変身', dive: '鳥形態', pulse: '範囲攻撃', pickupMagnet: '回収'
};

const TUTORIAL_IMAGE_URLS = [
  new URL('../assets/ui/tutorial/move.gif', import.meta.url).href,
  new URL('../assets/ui/tutorial/attack.gif', import.meta.url).href,
  new URL('../assets/ui/tutorial/bird.gif', import.meta.url).href,
  new URL('../assets/ui/tutorial/burst.gif', import.meta.url).href,
  new URL('../assets/ui/tutorial/boss.gif', import.meta.url).href
];

const TUTORIAL_STEPS = [
  { label: '\u79fb\u52d5', title: '\u307e\u305a\u306f\u79fb\u52d5', body: '\u5730\u9762\u306e\u4e0a\u3092\u81ea\u7531\u306b\u79fb\u52d5\u3057\u3066\u3001\u5371\u967a\u306a\u653b\u6483\u3092\u907f\u3051\u307e\u3057\u3087\u3046\u3002', control: '画面左のスティック / WASD / 左スティック' },
  { label: '攻撃', title: '自動で攻撃', body: '人間形態では近くの敵や卵を自動で撃ちます。敵を避けながら移動し、卵が増えるのを抑えましょう。', control: '攻撃は自動 / 操作は移動と変身' },
  { label: '鳥形態', title: '鳥形態で飛ぶ', body: '画面右の変身ボタン、Qまたは△で鳥形態に変身。MPを消費しながら飛び続けます。卵に特攻があり、一撃で倒せるうえ捕食することでHPを回復できます。もう一度押すと戻れます。', control: '変身ボタン / Q / △  =  形態切り替え' },
  { label: 'バースト技', title: 'バースト技を放つ', body: '敵や卵を倒すとゲージが溜まります。満タンになったら画面右のバーストボタン、E、□、R1のいずれかで強力な範囲攻撃を発動できます。キャラクターによりバースト技は異なります。', control: 'バーストボタン / E / □ / R1' },
  { label: '\u76ee\u6a19', title: '\u30a8\u30ea\u30a2\u3092\u53d6\u308a\u623b\u3059', body: '\u5375\u306e\u5897\u6b96\u3092\u98df\u3044\u6b62\u3081\u3001\u6700\u5f8c\u306b\u73fe\u308c\u308b\u30dc\u30b9\u3092\u7834\u58ca\u3057\u307e\u3057\u3087\u3046\u3002\u30a8\u30ea\u30a2\u3092\u5fa9\u65e7\u3067\u304d\u308c\u3070\u52dd\u5229\u3067\u3059\u3002', control: 'AREA RESTORED  =  Victory' }
];
let tutorialGuideInstance = null;
export class TutorialGuide {
  constructor() {
    const [overlay, stepLabel, stepCount, icon, title, body, control, dots, backButton, nextButton, skipButton] = ['tutorial', 'tutorialStepLabel', 'tutorialStepCount', 'tutorialIcon', 'tutorialTitle', 'tutorialBody', 'tutorialControl', 'tutorialDots', 'tutorialBack', 'tutorialNext', 'tutorialSkip'].map((id) => document.getElementById(id));
    Object.assign(this, { overlay, stepLabel, stepCount, icon, title, body, control, dots, backButton, nextButton, skipButton });
    this.screenshot = document.getElementById('tutorialScreenshot');
    this.index = 0;
    this.onDone = null;
    this.backButton?.addEventListener('click', () => this.previous());
    this.nextButton?.addEventListener('click', () => this.next());
    this.skipButton?.addEventListener('click', () => this.finish());
  }
  show(onDone = null) {
    if (!this.overlay) return;
    this.onDone = onDone;
    this.index = 0;
    this.overlay.classList.remove('hidden');
    this.render();
    this.nextButton?.focus();
  }
  hide() { this.overlay?.classList.add('hidden'); }
  next() {
    if (this.index >= TUTORIAL_STEPS.length - 1) { this.finish(); return; }
    this.index += 1;
    this.render();
  }
  previous() {
    if (this.index <= 0) return;
    this.index -= 1;
    this.render();
  }
  finish() {
    const callback = this.onDone;
    this.onDone = null;
    this.hide();
    callback?.();
  }
  render() {
    const step = TUTORIAL_STEPS[this.index];
    this.screenshot.src = TUTORIAL_IMAGE_URLS[this.index];
    this.stepLabel.textContent = step.label;
    this.stepCount.textContent = (this.index + 1) + ' / ' + TUTORIAL_STEPS.length;
    this.icon.textContent = String(this.index + 1).padStart(2, '0');
    this.title.textContent = step.title;
    this.body.textContent = step.body;
    this.control.textContent = step.control;
    this.backButton.disabled = this.index === 0;
    this.nextButton.textContent = this.index === TUTORIAL_STEPS.length - 1 ? '\u30b2\u30fc\u30e0\u3092\u958b\u59cb' : '\u6b21\u3078';
    this.dots.replaceChildren();
    TUTORIAL_STEPS.forEach((_, index) => {
      const dot = document.createElement('span');
      dot.className = index === this.index ? 'active' : '';
      this.dots.appendChild(dot);
    });
  }
}
export function getTutorialGuide() {
  if (!tutorialGuideInstance) tutorialGuideInstance = new TutorialGuide();
  return tutorialGuideInstance;
}
export class Hud {
  constructor(game) {
    this.game = game;
    this.hpBar = document.getElementById('hpBar');
    this.mpBar = document.getElementById('mpBar');
    this.burstBar = document.getElementById('burstBar');
    this.burstMeter = this.burstBar.closest('.meter');
    this.hpText = document.getElementById('hpText');
    this.mpText = document.getElementById('mpText');
    this.burstText = document.getElementById('burstText');
    this.xpMeter = document.getElementById('xpMeter');
    this.xpBar = document.getElementById('xpBar');
    this.xpLevel = document.getElementById('xpLevel');
    this.xpText = document.getElementById('xpText');
    this.xpGainTimer = 0;
    this.lastXpKey = '';
    this.clock = document.getElementById('clock');
    this.statsLine = document.getElementById('statsLine');
    this.hintLine = document.getElementById('hintLine');
    this.centerMessage = document.getElementById('centerMessage');
    this.levelUp = document.getElementById('levelUp');
    this.upgradeChoices = document.getElementById('upgradeChoices');
    this.result = document.getElementById('result');
    this.resultTitle = document.getElementById('resultTitle');
    this.resultBody = document.getElementById('resultBody');
    this.resultStats = document.getElementById('resultStats');
    this.carryOver = document.getElementById('carryOver');
    this.restartButton = document.getElementById('restartButton');
    this.replayStoryButton = document.getElementById('replayStoryButton');
    this.deathBlackout = document.getElementById('deathBlackout');
    this.damageEdge = document.getElementById('damageEdge');
    this.pause = document.getElementById('pause');
    this.pauseResumeButton = document.getElementById('pauseResumeButton');
    this.motherPanel = document.getElementById('motherPanel');
    this.motherBar = document.getElementById('motherBar');
    this.motherAlert = document.getElementById('motherAlert');
    this.tutorial = getTutorialGuide();
    this.messageTimer = 0;
    this.nextChapterButton = document.getElementById('nextChapterButton');
    this.retryButton = document.getElementById('retryButton');
    const motherTitle = this.motherPanel?.querySelector('.mother-title');
    if (motherTitle) motherTitle.textContent = getBossName(game.stage);
    this.restartButton.addEventListener('click', () => window.location.reload());
    this.replayStoryButton.addEventListener('click', () => this.game.replayAftermath());
    this.nextChapterButton.addEventListener('click', () => this.game.launchChapter(this.game.stageId + 1));
    this.retryButton.addEventListener('click', () => this.game.launchChapter(this.game.stageId));
    // A7: R retries from the defeat screen without reaching for the button.
    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyR' || event.repeat || this.game.state !== 'result') return;
      if (!this.game.resultsConfig.enabled || this.retryButton.classList.contains('hidden')) return;
      if (this.result.classList.contains('hidden')) return;
      event.preventDefault();
      this.retryButton.click();
    });
    this.pauseResumeButton.addEventListener('click', () => {
      if (this.game.state !== 'paused') return;
      this.game.state = 'playing';
      this.game.playSfx('buttonConfirm', { volume: 0.75 });
    });
  }

  update(dt) {
    const player = this.game.player;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    this.updateDamageEdge(dt, player);
    if (this.messageTimer <= 0) this.centerMessage.classList.remove('show', 'boss-warning');
    this.setBar(this.hpBar, player.hp / player.maxHp);
    this.setBar(this.mpBar, player.mp / player.maxMp);
    this.mpBar.parentElement?.parentElement?.classList.toggle('dry', Boolean(player.onDryGround) && player.mp < player.maxMp);
    this.setBar(this.burstBar, player.burst / Config.player.burstMax);
    const burstReady = player.burst >= Config.player.burstMax && player.burstCooldownTimer <= 0;
    this.burstMeter?.classList.toggle('ready', burstReady);
    document.getElementById('touchBurst')?.classList.toggle('ready', burstReady);
    this.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    this.mpText.textContent = `${Math.floor(player.mp)} / ${player.maxMp}`;
    const burstCooldownText = player.burstCooldownTimer > 0 ? `  CD ${player.burstCooldownTimer.toFixed(1)}s` : '';
    this.burstText.textContent = `${Math.floor(player.burst)} / ${Config.player.burstMax}${burstCooldownText}`;
    this.updateXpBar(dt, player);
    const remain = Math.max(0, Config.map.playSeconds - this.game.elapsed);
    const minutes = Math.floor(remain / 60);
    const seconds = Math.floor(remain % 60).toString().padStart(2, '0');
    const pickupStatusText = player.shieldCharges > 0
      ? `防護膜 x${player.shieldCharges}`
      : player.speedBoostTimer > 0
        ? `加速 ${player.speedBoostTimer.toFixed(1)}s`
        : player.pickupMagnetTimer > 0
          ? `吸引 ${player.pickupMagnetTimer.toFixed(1)}s`
          : '';
    this.clock.textContent = `${minutes}:${seconds}`;
    const statusText = player.invincibleTimer > 0
      ? `保護 ${player.invincibleTimer.toFixed(1)}s`
      : player.burstCooldownTimer > 0
        ? `バースト再使用 ${player.burstCooldownTimer.toFixed(1)}s`
        : player.burst >= Config.player.burstMax
          ? 'E / □ / R1: バースト使用可能'
          : this.game.spawnPauseTimer > 0
            ? `出現停止 ${this.game.spawnPauseTimer.toFixed(1)}s`
            : '';
    this.statsLine.textContent = `Lv ${player.level}  XP ${Math.floor(player.xp)} / ${player.nextXp}  卵 ${this.game.eggs.length}  敵 ${this.game.enemies.length}`;
    if (!this.game.devVisible) this.statsLine.textContent = this.statsLine.textContent.replace(/\s+\S+\s+\d+\s+\S+\s+\d+$/, '');
    if (this.game.devVisible && this.game.spawnPauseTimer > 0) {
      this.statsLine.textContent += `  \u51fa\u73fe\u505c\u6b62 ${this.game.spawnPauseTimer.toFixed(1)}s`;
    }
    const visibleStatusText = this.game.spawnPauseTimer > 0 ? '' : statusText;
    this.hintLine.textContent = this.game.hint || pickupStatusText || visibleStatusText;
    this.updateMother();
    this.pause.classList.toggle('hidden', this.game.state !== 'paused');
  }

  // A4: 経験値バーとレベルアップ直前の予告（Config.feedbackFx.xpBar）
  updateXpBar(dt, player) {
    if (!this.xpMeter) return;
    const enabled = Boolean(this.game.feedbackFxEnabled);
    this.xpMeter.classList.toggle('hidden', !enabled);
    this.xpMeter.parentElement?.parentElement?.classList.toggle('xp-on', enabled);
    if (!enabled) return;
    const state = xpBarState(player.xp, player.nextXp, Config.feedbackFx.xpBar.nearRatio);
    const key = `${player.level}:${Math.floor(player.xp)}`;
    if (key !== this.lastXpKey) {
      if (this.lastXpKey) this.xpGainTimer = 0.12;
      this.lastXpKey = key;
      this.setBar(this.xpBar, state.ratio);
      this.xpLevel.textContent = `Lv ${player.level}`;
      this.xpText.textContent = state.near ? `まもなく Lv ${player.level + 1}` : `あと ${state.remain}`;
      this.xpMeter.classList.toggle('near', state.near);
    }
    this.xpGainTimer = Math.max(0, this.xpGainTimer - dt);
    this.xpMeter.classList.toggle('gain', this.xpGainTimer > 0);
  }

  setBar(element, ratio) {
    element.style.width = `${clamp(ratio, 0, 1) * 100}%`;
  }

  showMessage(text, seconds = 1.25) {
    this.centerMessage.classList.remove('boss-warning');
    this.centerMessage.textContent = text;
    this.centerMessage.classList.add('show');
    this.messageTimer = seconds;
  }

  showBossWarning(seconds, form = 'human') {
    const hint = form === 'bird' ? '\u98db\u3093\u3067\u3044\u308c\u3070\u5730\u3092\u9019\u3046\u6ce2\u306f\u5c4a\u304b\u306a\u3044' : '\u9ce5\u5f62\u614b\u3067\u98db\u3079\u3070\u304b\u308f\u305b\u308b';
    this.showMessage(`WARNING\n\u6bcd\u5375\u306e\u885d\u6483\u6ce2\n${hint}`, seconds);
    this.centerMessage.classList.add('boss-warning');
  }

  nearestBossTarget() {
    const player = this.game.player?.position;
    let best = null;
    let bestDistance = Infinity;
    for (const mother of this.game.getBossTargets()) {
      const distance = player ? mother.position.distanceToSquared(player) : 0;
      if (distance < bestDistance) { best = mother; bestDistance = distance; }
    }
    return best;
  }

  updateMother() {
    // The swarm mother has three bodies: the bar is their total and the arrow points at the nearest standing one.
    const mother = this.nearestBossTarget() ?? this.game.motherEgg;
    const active = mother && !mother.dead;
    this.motherPanel.classList.toggle('hidden', !active);
    this.motherAlert.classList.toggle('hidden', true);
    if (!active) return;
    this.setBar(this.motherBar, this.game.getBossHpRatio());
    const ndc = mother.position.clone().project(this.game.camera);
    const onscreen = ndc.z >= -1 && ndc.z <= 1 && Math.abs(ndc.x) <= 0.92 && Math.abs(ndc.y) <= 0.88;
    if (onscreen) return;
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.5;
    const dx = ndc.x;
    const dy = -ndc.y;
    const angle = Math.atan2(dy, dx);
    const radiusX = window.innerWidth * 0.44;
    const radiusY = window.innerHeight * 0.42;
    const x = cx + Math.cos(angle) * radiusX;
    const y = cy + Math.sin(angle) * radiusY;
    this.motherAlert.style.left = `${x}px`;
    this.motherAlert.style.top = `${y}px`;
    this.motherAlert.style.setProperty('--arrow-angle', `${angle}rad`);
    this.motherAlert.classList.toggle('hidden', false);
  }

  showLevelUp(choices, onPick) {
    this.levelUp.classList.remove('hidden');
    this.upgradeChoices.replaceChildren();
    for (const [index, upgrade] of choices.entries()) {
      const button = document.createElement('button');
      button.className = 'upgrade';
      button.type = 'button';
      button.setAttribute('aria-label', `${index + 1}番 ${UPGRADE_CATEGORIES[upgrade.id] ?? '強化'}：${upgrade.title}。${upgrade.body}`);
      const iconUrl = (Config.visuals.cleanedUpgradeIcons && CLEANED_UPGRADE_ICON_URLS[upgrade.id]) || UPGRADE_ICON_URLS[upgrade.id];
      if (iconUrl) {
        const icon = document.createElement('img');
        icon.className = 'upgrade-icon';
        icon.src = iconUrl;
        icon.alt = '';
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);
      }
      const copy = document.createElement('div');
      copy.className = 'upgrade-copy';
      const kind = document.createElement('span');
      kind.className = 'upgrade-kind';
      kind.textContent = UPGRADE_CATEGORIES[upgrade.id] ?? '強化';
      const title = document.createElement('b');
      title.textContent = upgrade.title;
      const body = document.createElement('span');
      body.textContent = upgrade.body;
      copy.append(kind, title, body);
      // A6: 相乗効果のヒント（Config.synergy.hints）。そろうものを優先して 1 行だけ出す。
      const synergy = this.game.synergyConfig;
      const hint = synergy?.hints ? synergyHints(upgrade.id, this.game.player, synergy)[0] : null;
      if (hint) {
        const line = document.createElement('span');
        line.className = `upgrade-synergy ${hint.state}`;
        line.textContent = hint.state === 'completes'
          ? `相乗効果「${hint.title}」がそろう：${hint.body}`
          : hint.state === 'active'
            ? `相乗効果「${hint.title}」が働いている`
            : `「${getUpgrade(hint.partner)?.title ?? hint.partner}」と合わせると「${hint.title}」`;
        copy.appendChild(line);
        button.classList.toggle('synergy-ready', hint.state === 'completes');
        button.setAttribute('aria-label', `${button.getAttribute('aria-label')} ${line.textContent}`);
      }
      button.appendChild(copy);
      const number = document.createElement('span');
      number.className = 'upgrade-index';
      number.textContent = String(index + 1).padStart(2, '0');
      button.appendChild(number);
      button.addEventListener('click', () => {
        this.levelUp.classList.add('hidden');
        onPick(upgrade);
      });
      this.upgradeChoices.appendChild(button);
    }
    this.upgradeChoices.querySelector('button')?.focus();
  }

  hideLevelUp() {
    this.levelUp.classList.add('hidden');
  }

  showResult(victory, body) {
    const { stage } = this.game;
    const finale = victory && isFinalChapter(this.game.stageId);
    this.result.classList.toggle('victory', victory);
    this.result.classList.toggle('defeat', !victory);
    this.resultTitle.textContent = finale ? 'END' : victory ? `${stage.label} 完` : 'Defeat';
    this.replayStoryButton.textContent = finale ? 'エンディングを見返す' : '帰還後の会話を読み返す';
    this.replayStoryButton.classList.toggle('hidden', !victory);
    this.nextChapterButton.classList.toggle('hidden', !victory || finale);
    this.retryButton.classList.toggle('hidden', victory);
    this.resultBody.textContent = body;
    this.renderResultStats(victory);
    this.result.classList.remove('hidden');
    this.renderCarryOver();
    const firstChoice = this.carryOver.querySelector('button:not(.selected)');
    (firstChoice ?? (victory && !finale ? this.nextChapterButton : victory ? this.restartButton : this.retryButton)).focus();
  }

  // A7: kills, eggs, time, best streak and level under the result text.
  renderResultStats(victory) {
    const { resultsConfig, runStats, elapsed, player } = this.game;
    this.resultStats.replaceChildren();
    const show = Boolean(resultsConfig.enabled && runStats);
    this.resultStats.classList.toggle('hidden', !show);
    this.retryButton.querySelector('.retry-key')?.classList.toggle('hidden', !show);
    if (!show) return;
    for (const row of resultRows(runStats, { elapsed: runStats.endedAt ?? elapsed, level: player?.level ?? 1, victory })) {
      const item = document.createElement('div');
      const label = document.createElement('dt');
      const value = document.createElement('dd');
      label.textContent = row.label;
      value.textContent = row.value;
      item.append(label, value);
      this.resultStats.append(item);
    }
  }

  // After a cleared chapter: pick one upgrade taken this chapter and one of the chapter's rewards to carry on.
  renderCarryOver() {
    const options = this.game.getCarryOverOptions();
    this.carryOver.replaceChildren();
    this.carryOver.classList.toggle('hidden', !options);
    this.nextChapterButton.disabled = false;
    if (!options) return;
    const groups = [
      { kind: 'upgrade', key: 'upgradeId', heading: 'この章で取った強化から1つ', items: options.upgrades },
      { kind: 'reward', key: 'rewardId', heading: `${this.game.stage.label}の強化から1つ`, items: options.rewards }
    ].filter(group => group.items.length);
    const lead = document.createElement('p');
    lead.className = 'carry-over-lead';
    lead.textContent = '次の章へ持っていく強化を選ぶ（以降の章でもずっと有効）';
    this.carryOver.appendChild(lead);
    for (const group of groups) {
      const section = document.createElement('section');
      section.className = 'carry-over-group';
      const heading = document.createElement('h2');
      heading.textContent = group.heading;
      const list = document.createElement('div');
      list.className = 'carry-over-choices';
      for (const item of group.items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'carry-over-choice';
        const selected = options.choice[group.key] === item.id;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', String(selected));
        const title = document.createElement('b');
        title.textContent = item.count > 1 ? `${item.title} ×${item.count}` : item.title;
        const body = document.createElement('span');
        body.textContent = group.kind === 'upgrade' ? `${item.body}（1回分を引き継ぐ）` : item.body;
        button.append(title, body);
        button.addEventListener('click', () => {
          this.game.chooseCarryOver(group.kind, item.id);
          this.renderCarryOver();
          const next = this.carryOver.querySelector('.carry-over-group:not(.done) button');
          (next ?? this.nextChapterButton).focus();
        });
        list.appendChild(button);
      }
      section.classList.toggle('done', Boolean(options.choice[group.key]));
      section.append(heading, list);
      this.carryOver.appendChild(section);
    }
    this.nextChapterButton.disabled = groups.some(group => !options.choice[group.key]);
  }

  // A3: red screen edge right after a hit, and a faint pulse while HP is low (Config.feel.damageEdge).
  updateDamageEdge(dt, player) {
    if (!this.damageEdge) return;
    const cfg = Config.feel?.damageEdge;
    if (!cfg?.enabled || !this.game.feelEnabled || !player) {
      this.damageEdge.style.opacity = '0';
      return;
    }
    this.game.damageEdgeTimer = Math.max(0, (this.game.damageEdgeTimer ?? 0) - dt);
    const hit = cfg.seconds > 0 ? this.game.damageEdgeTimer / cfg.seconds * cfg.strength : 0;
    const ratio = player.hp / player.maxHp;
    const low = !player.dead && ratio > 0 && ratio < cfg.lowHpRatio
      ? cfg.lowHpStrength * (0.6 + 0.4 * Math.sin(performance.now() / 1000 * Math.PI * 2 * 0.9))
      : 0;
    this.damageEdge.style.opacity = Math.max(hit, low, 0).toFixed(3);
  }

  showDeathBlackout(show) {
    this.deathBlackout?.classList.toggle('show', show);
  }
  showTutorial(onDone) { this.tutorial.show(onDone); }
  skipTutorial() { this.tutorial.finish(); }
}

export function pickUpgradeChoices(count = 3) {
  const pool = [...UpgradePool];
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }
  return choices;
}
