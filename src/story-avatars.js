// 会話画面の動く立ち絵。Config.story.avatarEngine で2種類を切り替える。
//   'rig'  : Anime2.5DRig（MIT。src/vendor/anime25d-player.js）。立ち絵 normal.png を See-through でパーツに分け、
//            閉じた目と開いた口を Codex で描き足したもの（assets/avatars/rig/<キャラ>.json・.png）。立ち絵全体に重ねる。
//   'mesh' : Mesh Avatar Studio の <mesh-avatar>（MIT。src/vendor/mesh-avatar-element.js）。
//            立ち絵 normal.png の上 1024×1100 から作っているので、静止画の上の部分に重ねて表示する。
// 読み込みに失敗したときは静止画のまま。
import { Config } from './config.js';

const MESH_URLS = Object.freeze({
  tsukimi: new URL('../assets/avatars/tsukimi.mavatar', import.meta.url).href,
  akame: new URL('../assets/avatars/akame.mavatar', import.meta.url).href,
  kiichigo: new URL('../assets/avatars/kiichigo.mavatar', import.meta.url).href
});
const RIG_URLS = Object.freeze({
  tsukimi: [new URL('../assets/avatars/rig/tsukimi.json', import.meta.url).href, new URL('../assets/avatars/rig/tsukimi.png', import.meta.url).href],
  akame: [new URL('../assets/avatars/rig/akame.json', import.meta.url).href, new URL('../assets/avatars/rig/akame.png', import.meta.url).href],
  kiichigo: [new URL('../assets/avatars/rig/kiichigo.json', import.meta.url).href, new URL('../assets/avatars/rig/kiichigo.png', import.meta.url).href]
});

// Mesh: 笑顔の 'smile' はこのアバターだと目が閉じきるので、通常の顔に目元の笑みを少しだけ足す（render-talk.mjs と同じ）。
const MESH_EXPRESSIONS = Object.freeze({ normal: 'neutral', smile: 'neutral', angry: 'angry', sad: 'sad', surprise: 'surprise' });
const MESH_EYE_SMILE = Object.freeze({ smile: 0.28 });
// Rig: 通常の表情だけ。ほかの表情は描き分けた静止画を出す（2026-11-06 に比べたところ、眉は前髪に隠れ、
// 目は元の絵のパーツが上にあるので、変形ではほとんど表情が変わらなかった）。
const RIG_EXPRESSIONS = Object.freeze({ normal: {} });

function engine() {
  const fromUrl = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('avatarEngine');
  return fromUrl === 'rig' || fromUrl === 'mesh' ? fromUrl : Config.story.avatarEngine;
}

// 比較用: URL に ?avatarExpressions=all（または normal）、?avatarEngine=rig（または mesh）を付けると Config より優先する。
function expressionMode() {
  const fromUrl = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('avatarExpressions');
  return fromUrl === 'all' || fromUrl === 'normal' ? fromUrl : Config.story.avatarExpressions;
}

let meshReady = null;
function defineMeshElement() {
  meshReady ??= import('./vendor/mesh-avatar-element.js').then(() => customElements.whenDefined('mesh-avatar'));
  return meshReady;
}
let rigModule = null;
const loadRigModule = () => (rigModule ??= import('./vendor/anime25d-player.js'));

export function avatarPortraitsEnabled() {
  if (!Config.story.avatarPortraits) return false;
  return engine() === 'rig' ? typeof WebGLRenderingContext !== 'undefined' : typeof customElements !== 'undefined';
}

// その表情の台詞をアバターで出すか。
export function avatarHandles(expression = 'normal') {
  if (engine() === 'rig') return Boolean(RIG_EXPRESSIONS[expression]);
  return expressionMode() === 'all' ? Boolean(MESH_EXPRESSIONS[expression]) : expression === 'normal';
}

// 文字送りに合わせた口の開き（会話には声がないので、文字ごとに決める）。null は口を閉じる。
function mouthLevel(char) {
  if (char === null) return 0;
  return /[\s、。！？…ー―「」（）・]/.test(char) ? 0 : 0.35 + Math.random() * 0.45;
}

class MeshStoryAvatar {
  constructor(characterId, container) {
    this.loaded = false;
    this.element = document.createElement('mesh-avatar');
    this.element.className = 'story-actor-avatar';
    this.element.setAttribute('label', '');
    this.element.setAttribute('paused', '');
    container.append(this.element);
    defineMeshElement()
      .then(() => this.element.load(MESH_URLS[characterId]))
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
    avatar.setExpression(MESH_EXPRESSIONS[this.expression] ?? 'neutral');
    avatar.setParameters(MESH_EYE_SMILE[this.expression] ? { eyeSmile: MESH_EYE_SMILE[this.expression] } : {});
  }

  mouth(char) {
    const avatar = this.loaded ? this.element.avatar : null;
    if (!avatar) return;
    avatar.setSpeaking(char !== null);
    avatar.setVoiceLevel(mouthLevel(char));
  }
}

class RigStoryAvatar {
  constructor(characterId, container) {
    this.player = null;
    this.element = document.createElement('canvas');
    this.element.className = 'story-actor-avatar is-rig';
    this.element.setAttribute('aria-hidden', 'true');
    container.append(this.element);
    loadRigModule()
      .then(async ({ loadRig, RigPlayer }) => new RigPlayer(this.element, await loadRig(...RIG_URLS[characterId])))
      .then(player => {
        this.player = player;
        container.classList.add('has-avatar', 'avatar-rig');
        this.apply();
      })
      .catch(() => this.element.remove());
  }

  set(visible, expression) {
    this.visible = visible;
    this.expression = expression;
    this.apply();
  }

  apply() {
    if (!this.player) return;
    this.player.setParams(RIG_EXPRESSIONS[this.expression] ?? {});
    if (this.visible) this.player.start();
    else this.player.stop();
  }

  mouth(char) {
    this.player?.setMouth(mouthLevel(char));
  }
}

export class StoryAvatar {
  constructor(characterId, container) {
    return engine() === 'rig' ? new RigStoryAvatar(characterId, container) : new MeshStoryAvatar(characterId, container);
  }
}
