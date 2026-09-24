import './story.css';
import { getCharacterPortrait } from './character-portraits.js';
import { STORY_CHARACTERS } from './story-data.js';

export class StoryPlayer {
  constructor() {
    this.root = document.createElement('section');
    this.root.className = 'story-player hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'ストーリー');
    this.root.innerHTML = `
      <div class="story-backdrop" aria-hidden="true"></div>
      <div class="story-vignette" aria-hidden="true"></div>
      <header class="story-header"><div><span class="story-chapter"></span><h2></h2></div>
        <nav aria-label="ストーリー操作">
          <button type="button" data-action="back" aria-label="前のページへ">BACK</button>
          <button type="button" data-action="log">LOG</button>
          <button type="button" data-action="auto" aria-pressed="false">AUTO</button>
          <button type="button" data-action="skip">SKIP <span>»</span></button>
        </nav>
      </header>
      <div class="story-cast" aria-hidden="true">${Object.keys(STORY_CHARACTERS).filter(id => STORY_CHARACTERS[id].portrait).map(id => `<img class="story-actor" data-actor="${id}" alt="" />`).join('')}</div>
      <div class="story-lower-shade" aria-hidden="true"></div>
      <div class="story-caption">
        <p class="story-location"></p>
        <p class="story-speaker"></p>
        <button class="story-advance" type="button" aria-label="文章を表示／次へ">
          <span class="story-text" aria-hidden="true"></span><span class="story-accessible sr-only" aria-live="polite"></span>
          <span class="story-next" aria-hidden="true">▾</span>
        </button>
      </div>
      <footer class="story-footer"><span class="story-count"></span><span><span class="story-keyboard-help">CLICK / ENTER / SPACE / </span>× <span class="story-hint">で次へ</span></span></footer>
      <section class="story-log hidden" aria-label="会話ログ"><div class="story-log-heading"><h3>これまでの会話</h3><button type="button" data-action="log-close">閉じる</button></div><div class="story-log-entries"></div></section>`;
    document.getElementById('app').appendChild(this.root);
    this.query = selector => this.root.querySelector(selector);
    this.root.addEventListener('click', event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'skip') this.finish();
      else if (action === 'back') this.previous();
      else if (action === 'auto') this.toggleAuto();
      else if (action === 'log' || action === 'log-close') this.toggleLog();
      else if (event.target.closest('.story-advance')) this.next();
    });
    window.addEventListener('keydown', event => {
      if (!this.active) return;
      if (event.code === 'Tab') {
        const scope = this.logOpen ? this.query('.story-log') : this.root;
        const buttons = [...scope.querySelectorAll('button')].filter(button => !button.disabled && button.getClientRects().length);
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        return;
      }
      if (event.repeat) return;
      if (event.code === 'Escape' && this.logOpen) { event.preventDefault(); this.toggleLog(); }
      if (['Enter', 'Space'].includes(event.code) && !this.logOpen &&
          (!event.target.closest('button') || event.target.closest('.story-advance'))) {
        event.preventDefault(); this.next();
      }
    });
  }

  show(scene, onDone) {
    clearTimeout(this.timer);
    this.returnFocus = document.activeElement;
    this.backgroundElements = [...this.root.parentElement.children]
      .filter(element => element !== this.root)
      .map(element => ({ element, inert: element.inert }));
    for (const { element } of this.backgroundElements) element.inert = true;
    this.scene = scene;
    this.onDone = onDone;
    this.index = 0;
    this.furthestIndex = 0;
    this.auto = false;
    this.logOpen = false;
    this.active = true;
    for (const selector of ['.story-header', '.story-advance']) this.query(selector).inert = false;
    this.query('.story-log').classList.add('hidden');
    this.query('[data-action="auto"]').setAttribute('aria-pressed', 'false');
    this.query('.story-chapter').textContent = scene.title;
    this.query('h2').textContent = scene.subtitle;
    this.root.classList.remove('hidden');
    this.render();
    this.query('.story-advance').focus({ preventScroll: true });
  }

  render() {
    clearTimeout(this.timer);
    const line = this.scene.lines[this.index];
    const character = STORY_CHARACTERS[line.speaker];
    this.characters = Array.from(line.text);
    this.revealed = matchMedia('(prefers-reduced-motion: reduce)').matches ? this.characters.length : 0;
    this.root.classList.toggle('is-narration', !character);
    this.root.classList.toggle('is-npc', Boolean(character && !character.portrait));
    this.root.classList.toggle('is-blackout', Boolean(line.blackout));
    this.root.classList.toggle('is-close', Boolean(line.close));
    this.root.style.setProperty('--speaker-color', character?.color ?? '#d1dfc5');
    const backdrop = this.query('.story-backdrop');
    if (line.background) backdrop.style.backgroundImage = `url("${line.background}")`;
    const speakerId = character?.portrait ? line.speaker : null;
    const portraitLines = this.scene.lines;
    const otherPortrait = speakerId && (
      portraitLines.slice(0, this.index).reverse().find(entry =>
        entry.speaker !== speakerId && STORY_CHARACTERS[entry.speaker]?.portrait)?.speaker
      ?? portraitLines.slice(this.index + 1).find(entry =>
        entry.speaker !== speakerId && STORY_CHARACTERS[entry.speaker]?.portrait)?.speaker
    );
    const firstAppearance = id => portraitLines.findIndex(entry => entry.speaker === id);
    const speakerSide = otherPortrait && firstAppearance(otherPortrait) < firstAppearance(speakerId) ? 'right' : 'left';
    for (const actor of this.root.querySelectorAll('.story-actor')) {
      const id = actor.dataset.actor;
      const src = getCharacterPortrait(id, id === line.speaker ? line.expression : 'normal');
      if (actor.getAttribute('src') !== src) actor.src = src;
      actor.dataset.side = id === speakerId ? speakerSide : speakerSide === 'left' ? 'right' : 'left';
      actor.classList.toggle('is-visible', id === speakerId || id === otherPortrait);
      actor.classList.toggle('is-speaking', id === speakerId);
    }
    this.query('.story-location').textContent = line.label ?? character?.role ?? '';
    this.query('.story-speaker').textContent = character?.name ?? '';
    this.query('.story-accessible').textContent = `${character ? character.name + '。' : ''}${line.text}`;
    this.query('.story-count').textContent = `${String(this.index + 1).padStart(2, '0')} / ${String(this.scene.lines.length).padStart(2, '0')}`;
    this.furthestIndex = Math.max(this.furthestIndex, this.index);
    this.query('[data-action="back"]').disabled = this.index === 0;
    this.tick();
  }

  tick() {
    if (!this.active || this.logOpen) return;
    this.query('.story-text').textContent = this.characters.slice(0, this.revealed).join('');
    const complete = this.revealed >= this.characters.length;
    this.root.classList.toggle('is-complete', complete);
    if (!complete) {
      const char = this.characters[this.revealed++];
      this.timer = setTimeout(() => this.tick(), /[、。！？…]/.test(char) ? 150 : 34);
    } else if (this.auto) {
      this.timer = setTimeout(() => this.next(), Math.max(2200, this.characters.length * 65));
    }
  }

  next() {
    if (!this.active || this.logOpen) return;
    clearTimeout(this.timer);
    if (!this.root.classList.contains('is-complete')) {
      this.revealed = this.characters.length;
      this.tick();
    } else if (this.index + 1 < this.scene.lines.length) {
      this.index++;
      this.render();
    } else this.finish();
  }

  toggleAuto() {
    this.auto = !this.auto;
    this.query('[data-action="auto"]').setAttribute('aria-pressed', String(this.auto));
    clearTimeout(this.timer);
    this.tick();
  }

  previous() {
    if (!this.active || this.logOpen || this.index === 0) return;
    this.index--;
    this.auto = false;
    this.query('[data-action="auto"]').setAttribute('aria-pressed', 'false');
    this.render();
    this.query('.story-advance').focus({ preventScroll: true });
  }

  toggleLog() {
    this.logOpen = !this.logOpen;
    clearTimeout(this.timer);
    this.query('.story-log').classList.toggle('hidden', !this.logOpen);
    for (const selector of ['.story-header', '.story-advance']) this.query(selector).inert = this.logOpen;
    if (this.logOpen) {
      const entries = this.query('.story-log-entries');
      entries.replaceChildren();
      for (const line of this.scene.lines.slice(0, this.furthestIndex + 1)) {
        const entry = document.createElement('p');
        const name = document.createElement('strong');
        name.textContent = STORY_CHARACTERS[line.speaker]?.name ?? 'STORY';
        entry.append(name, document.createTextNode(line.text));
        entries.append(entry);
      }
      this.query('[data-action="log-close"]').focus();
      entries.scrollTop = entries.scrollHeight;
    } else {
      this.query('.story-advance').focus({ preventScroll: true });
      this.tick();
    }
  }

  finish() {
    if (!this.active) return;
    clearTimeout(this.timer);
    this.active = false;
    this.root.classList.add('hidden');
    for (const { element, inert } of this.backgroundElements) element.inert = inert;
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    const callback = this.onDone;
    this.onDone = null;
    callback?.();
  }
}
