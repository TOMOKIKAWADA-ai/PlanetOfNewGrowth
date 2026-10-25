// 会話画面の動く立ち絵（Mesh Avatar Studio の <mesh-avatar>、MIT。src/vendor/mesh-avatar-element.js）。
// アバターは立ち絵 normal.png の上 1024×1100 から作っているので、静止画の上の部分に重ねて表示する。
// 読み込みに失敗したときは静止画のまま。
import { Config } from './config.js';

const AVATAR_URLS = Object.freeze({
  tsukimi: new URL('../assets/avatars/tsukimi.mavatar', import.meta.url).href,
  akame: new URL('../assets/avatars/akame.mavatar', import.meta.url).href,
  kiichigo: new URL('../assets/avatars/kiichigo.mavatar', import.meta.url).href
});

const EXPRESSIONS = Object.freeze({ normal: 'neutral', smile: 'smile', angry: 'angry', sad: 'sad', surprise: 'surprise' });

let elementReady = null;
function defineElement() {
  elementReady ??= import('./vendor/mesh-avatar-element.js').then(() => customElements.whenDefined('mesh-avatar'));
  return elementReady;
}

export function avatarPortraitsEnabled() {
  return Boolean(Config.story.avatarPortraits) && typeof customElements !== 'undefined';
}

// その表情の台詞をアバターで出すか。
export function avatarHandles(expression = 'normal') {
  return Config.story.avatarExpressions === 'all' ? Boolean(EXPRESSIONS[expression]) : expression === 'normal';
}

export class StoryAvatar {
  constructor(characterId, container) {
    this.loaded = false;
    this.element = document.createElement('mesh-avatar');
    this.element.className = 'story-actor-avatar';
    this.element.setAttribute('label', '');
    this.element.setAttribute('paused', '');
    container.append(this.element);
    defineElement()
      .then(() => this.element.load(AVATAR_URLS[characterId]))
      .then(() => {
        this.loaded = true;
        container.classList.add('has-avatar');
        this.apply();
      })
      .catch(() => this.element.remove());
  }

  // 表示中だけ動かす。話していない方はまばたきと呼吸だけ。
  set(visible, expression) {
    this.visible = visible;
    this.expression = expression;
    this.apply();
  }

  apply() {
    if (!this.loaded) return;
    this.element.paused = !this.visible;
    const avatar = this.element.avatar;
    if (!avatar) return;
    avatar.setExpression(EXPRESSIONS[this.expression] ?? 'neutral');
  }

  // 文字送りに合わせて口を動かす（会話には声がないので、文字ごとに口の開きを決める）。
  mouth(char) {
    const avatar = this.loaded ? this.element.avatar : null;
    if (!avatar) return;
    if (char === null) {
      avatar.setVoiceLevel(0);
      avatar.setSpeaking(false);
      return;
    }
    avatar.setSpeaking(true);
    avatar.setVoiceLevel(/[\s、。！？…ー―「」（）・]/.test(char) ? 0 : 0.35 + Math.random() * 0.45);
  }
}
