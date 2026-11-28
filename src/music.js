// BGM for each scene (2026-11-29, made with Magnific / Google Lyria 3 Pro).
// One looping track plays at a time; a change of scene fades the old track out and the new one in.
// Config.audio.bgmSet = false (or ?bgmSet=0) keeps the single battle-only bgm.mp3 from before.

export const MUSIC_TRACKS = ['title', 'story', 'battleLand', 'battleWater', 'boss', 'ending'];

// Which track a battle plays: the boss track while the boss is up, otherwise land or water by the map.
export function battleTrackKey({ terrain, bossActive }) {
  if (bossActive) return 'boss';
  return terrain === 'water' ? 'battleWater' : 'battleLand';
}

// The track for a story scene: the final chapter's aftermath is the ending.
export function storyTrackKey({ finalAftermath = false } = {}) {
  return finalAftermath ? 'ending' : 'story';
}

export class MusicPlayer {
  constructor({ urls, volume = 0.42, fadeSeconds = 1.2, createAudio = (url) => new Audio(url), target = globalThis.window } = {}) {
    this.urls = urls ?? {};
    this.volume = volume;
    this.fadeSeconds = fadeSeconds;
    this.createAudio = createAudio;
    this.target = target;
    this.tracks = new Map();
    this.current = null;
    this.suspended = false;
    this.awaitingGesture = false;
    this.fadeTimer = null;
    this.unlock = () => {
      this.removeUnlock();
      this.awaitingGesture = false;
      if (this.current && !this.suspended) this.start(this.current);
    };
  }

  track(key) {
    if (!this.urls[key]) return null;
    if (!this.tracks.has(key)) {
      const audio = this.createAudio(this.urls[key]);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;
      this.tracks.set(key, audio);
    }
    return this.tracks.get(key);
  }

  // Switch to a track (null = fade to silence). Calling it again with the same key does nothing,
  // so the game can call it every frame.
  play(key) {
    if (this.suspended) this.resume();
    if (key === this.current) return;
    this.current = key ?? null;
    if (this.current) this.start(this.current);
    this.runFade();
  }

  start(key) {
    const audio = this.track(key);
    if (!audio || !audio.paused) return;
    try {
      const promise = audio.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => this.waitForGesture());
    } catch {
      this.waitForGesture();
    }
  }

  // Pause in place (the pause menu); resume() or the next play() carries on from the same spot.
  suspend() {
    if (this.suspended) return;
    this.suspended = true;
    for (const audio of this.tracks.values()) if (!audio.paused) audio.pause();
  }

  resume() {
    if (!this.suspended) return;
    this.suspended = false;
    if (this.current) this.start(this.current);
    this.runFade();
  }

  setVolume(volume) {
    this.volume = volume;
    this.runFade();
  }

  // Steps every track's volume toward its goal: the current one up to the set volume, the others down.
  runFade() {
    if (this.fadeTimer) return;
    const stepMs = 50;
    const step = this.fadeSeconds > 0 ? (this.volume * stepMs) / (this.fadeSeconds * 1000) : 1;
    const tick = () => {
      let moving = false;
      for (const [key, audio] of this.tracks) {
        const goal = key === this.current && !this.suspended ? this.volume : 0;
        const next = audio.volume < goal ? Math.min(goal, audio.volume + step) : Math.max(goal, audio.volume - step);
        audio.volume = next;
        if (next === 0 && key !== this.current && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
        if (next !== goal) moving = true;
      }
      if (moving) this.fadeTimer = setTimeout(tick, stepMs);
      else this.fadeTimer = null;
    };
    tick();
  }

  waitForGesture() {
    if (this.awaitingGesture || !this.target) return;
    this.awaitingGesture = true;
    this.target.addEventListener('pointerdown', this.unlock, { once: true });
    this.target.addEventListener('keydown', this.unlock, { once: true });
  }

  removeUnlock() {
    if (!this.target) return;
    this.target.removeEventListener('pointerdown', this.unlock);
    this.target.removeEventListener('keydown', this.unlock);
  }
}
