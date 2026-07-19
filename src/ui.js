import { Config, UpgradePool } from './config.js';
import { clamp } from './math.js';

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

const TUTORIAL_IMAGE_URLS = [
  new URL('../assets/ui/tutorial/move.gif', import.meta.url).href,
  new URL('../assets/ui/tutorial/attack.gif', import.meta.url).href,
  new URL('../assets/ui/tutorial/bird.gif', import.meta.url).href,
  new URL('../assets/ui/tutorial/burst.gif', import.meta.url).href,
  new URL('../assets/ui/tutorial/boss.gif', import.meta.url).href
];

const TUTORIAL_STEPS = [
  { label: '\u79fb\u52d5', title: '\u307e\u305a\u306f\u79fb\u52d5', body: '\u5730\u9762\u306e\u4e0a\u3092\u81ea\u7531\u306b\u79fb\u52d5\u3057\u3066\u3001\u5371\u967a\u306a\u653b\u6483\u3092\u907f\u3051\u307e\u3057\u3087\u3046\u3002', control: 'W A S D  /  Arrow Keys' },
  { label: '攻撃', title: '攻撃', body: '自動で近くの敵を攻撃します。異界の種子（通称：卵）や敵を倒しましょう。', control: 'Auto attack  =  nearby targets' },
  { label: '鳥形態', title: '鳥形態で飛ぶ', body: 'Qで鳥形態に変身。MPを消費しながら飛び続けます。卵に特攻があり、一撃で倒せるうえ捕食することでHPを回復できます。Qをもう一度押すと戻れます。', control: 'Q  =  Bird form / Return' },
  { label: 'バースト技', title: 'バースト技を放つ', body: '敵や卵を倒すとゲージが溜まります。満タンになったらEで強力な範囲攻撃を発動できます。キャラクターによりバースト技は異なります。', control: 'E  =  Burst when the gauge is full' },
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
    this.clock = document.getElementById('clock');
    this.statsLine = document.getElementById('statsLine');
    this.hintLine = document.getElementById('hintLine');
    this.centerMessage = document.getElementById('centerMessage');
    this.levelUp = document.getElementById('levelUp');
    this.upgradeChoices = document.getElementById('upgradeChoices');
    this.result = document.getElementById('result');
    this.resultTitle = document.getElementById('resultTitle');
    this.resultBody = document.getElementById('resultBody');
    this.restartButton = document.getElementById('restartButton');
    this.deathBlackout = document.getElementById('deathBlackout');
    this.pause = document.getElementById('pause');
    this.motherPanel = document.getElementById('motherPanel');
    this.motherBar = document.getElementById('motherBar');
    this.motherAlert = document.getElementById('motherAlert');
    this.tutorial = getTutorialGuide();
    this.messageTimer = 0;
    this.restartButton.addEventListener('click', () => window.location.reload());
  }

  update(dt) {
    const player = this.game.player;
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    if (this.messageTimer <= 0) this.centerMessage.classList.remove('show', 'boss-warning');
    this.setBar(this.hpBar, player.hp / player.maxHp);
    this.setBar(this.mpBar, player.mp / player.maxMp);
    this.setBar(this.burstBar, player.burst / Config.player.burstMax);
    const burstReady = player.burst >= Config.player.burstMax && player.burstCooldownTimer <= 0;
    this.burstMeter?.classList.toggle('ready', burstReady);
    this.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    this.mpText.textContent = `${Math.floor(player.mp)} / ${player.maxMp}`;
    const burstCooldownText = player.burstCooldownTimer > 0 ? `  CD ${player.burstCooldownTimer.toFixed(1)}s` : '';
    this.burstText.textContent = `${Math.floor(player.burst)} / ${Config.player.burstMax}${burstCooldownText}`;
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
          ? 'E: バースト使用可能'
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

  setBar(element, ratio) {
    element.style.width = `${clamp(ratio, 0, 1) * 100}%`;
  }

  showMessage(text, seconds = 1.25) {
    this.centerMessage.classList.remove('boss-warning');
    this.centerMessage.textContent = text;
    this.centerMessage.classList.add('show');
    this.messageTimer = seconds;
  }

  showBossWarning(seconds) {
    this.showMessage('WARNING\n\u6bcd\u5375\u306e\u885d\u6483\u6ce2', seconds);
    this.centerMessage.classList.add('boss-warning');
  }

  updateMother() {
    const mother = this.game.motherEgg;
    const active = mother && !mother.dead;
    this.motherPanel.classList.toggle('hidden', !active);
    this.motherAlert.classList.toggle('hidden', true);
    if (!active) return;
    this.setBar(this.motherBar, mother.hp / mother.maxHp);
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
    for (const upgrade of choices) {
      const button = document.createElement('button');
      button.className = 'upgrade';
      const iconUrl = UPGRADE_ICON_URLS[upgrade.id];
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
      const title = document.createElement('b');
      title.textContent = upgrade.title;
      const body = document.createElement('span');
      body.textContent = upgrade.body;
      copy.append(title, body);
      button.appendChild(copy);
      button.addEventListener('click', () => {
        this.levelUp.classList.add('hidden');
        onPick(upgrade);
      });
      this.upgradeChoices.appendChild(button);
    }
  }

  hideLevelUp() {
    this.levelUp.classList.add('hidden');
  }

  showResult(victory, body) {
    this.result.classList.toggle('victory', victory);
    this.result.classList.toggle('defeat', !victory);
    this.resultTitle.textContent = victory ? 'AREA RESTORED' : 'Defeat';
    this.resultBody.textContent = body;
    this.result.classList.remove('hidden');
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
