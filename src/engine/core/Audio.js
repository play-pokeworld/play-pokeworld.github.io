/**
 * PokeEngine — Audio Manager
 * SFX + BGM with volume control, pool management, lazy load
 */
(function() {
'use strict';

class AudioManager {
  constructor() {
    this._enabled = true;
    this._sfxVolume = 0.5;
    this._bgmVolume = 0.3;
    this._pool = new Map();        // key -> HTMLAudioElement
    this._bgm = null;
    this._bgmKey = null;
    this._maxPool = 20;
  }

  // ─── SFX ───
  async play(key, url) {
    if (!this._enabled) return;
    try {
      let src = this._pool.get(key);
      if (!src && url) {
        src = new Audio(url);
        src.volume = this._sfxVolume;
        this._pool.set(key, src);
        // Pool cleanup
        if (this._pool.size > this._maxPool) {
          const first = this._pool.keys().next().value;
          this._pool.delete(first);
        }
      }
      if (src) {
        src.currentTime = 0;
        await src.play().catch(() => {});
      }
    } catch(e) { /* silent fail */ }
  }

  // ─── BGM ───
  async playBGM(key, url) {
    if (!this._enabled) return;
    try {
      this.stopBGM();
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = this._bgmVolume;
      this._bgm = audio;
      this._bgmKey = key;
      await audio.play().catch(() => {});
    } catch(e) { /* silent fail */ }
  }

  stopBGM() {
    if (this._bgm) { this._bgm.pause(); this._bgm = null; this._bgmKey = null; }
  }

  // ─── Volume ───
  setSFXVolume(v) { this._sfxVolume = Math.max(0, Math.min(1, v)); }
  setBGMVolume(v) { this._bgmVolume = Math.max(0, Math.min(1, v)); if (this._bgm) this._bgm.volume = this._bgmVolume; }
  getSFXVolume() { return this._sfxVolume; }
  getBGMVolume() { return this._bgmVolume; }

  // ─── Mute ───
  setEnabled(e) { this._enabled = e; if (!e) this.stopBGM(); }
  isEnabled() { return this._enabled; }

  // ─── Cleanup ───
  dispose() {
    this.stopBGM();
    this._pool.clear();
  }
}

window.PokeAudio = AudioManager;
if (!window.poke) window.poke = {};
window.poke.Audio = AudioManager;
})();
