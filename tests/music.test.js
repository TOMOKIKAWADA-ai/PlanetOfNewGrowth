import test from 'node:test';
import assert from 'node:assert/strict';
import { battleTrackKey, MusicPlayer, storyTrackKey } from '../src/music.js';
import { Config } from '../src/config.js';

function fakeAudio() {
  return {
    paused: true, volume: 1, currentTime: 0, plays: 0,
    play() { this.paused = false; this.plays += 1; return Promise.resolve(); },
    pause() { this.paused = true; }
  };
}

test('battle picks land, water or boss track', () => {
  assert.equal(battleTrackKey({ terrain: 'grass', bossActive: false }), 'battleLand');
  assert.equal(battleTrackKey({ terrain: 'water', bossActive: false }), 'battleWater');
  assert.equal(battleTrackKey({ terrain: 'water', bossActive: true }), 'boss');
  assert.equal(battleTrackKey({ terrain: undefined, bossActive: false }), 'battleLand');
});

test('the final aftermath plays the ending, other stories the story track', () => {
  assert.equal(storyTrackKey(), 'story');
  assert.equal(storyTrackKey({ finalAftermath: true }), 'ending');
});

test('music player switches tracks and ignores repeated calls', () => {
  const made = [];
  const player = new MusicPlayer({
    urls: { a: 'a.mp3', b: 'b.mp3' }, volume: 0.5, fadeSeconds: 0, target: null,
    createAudio: (url) => { const audio = fakeAudio(); audio.url = url; made.push(audio); return audio; }
  });
  player.play('a');
  player.play('a');
  assert.equal(made.length, 1);
  assert.equal(made[0].plays, 1);
  assert.equal(made[0].volume, 0.5);
  player.play('b');
  assert.equal(made.length, 2);
  assert.equal(made[0].paused, true);
  assert.equal(made[0].volume, 0);
  assert.equal(made[1].volume, 0.5);
  player.suspend();
  assert.equal(made[1].paused, true);
  player.play('b');
  assert.equal(made[1].paused, false);
  player.play(null);
  assert.equal(made[1].paused, true);
});

test('unknown tracks are skipped without error', () => {
  const player = new MusicPlayer({ urls: {}, fadeSeconds: 0, target: null, createAudio: fakeAudio });
  assert.doesNotThrow(() => player.play('title'));
});

test('the scene track set is on, with the old single track kept as the fallback', () => {
  assert.equal(Config.audio.bgmSet, true);
  assert.ok(Config.audio.bgmFadeSeconds >= 0);
});
