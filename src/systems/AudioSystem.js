/**
 * @file AudioSystem.js
 * @brief Centralized sound effects, cries, and background music manager (C++: class AudioSystem : public BaseSystem).
 * Plays contextual music with smooth cross-fading, loads sound effects from audio assets,
 * provides procedural synthesis fallbacks via Web Audio API, and synchronizes with player preferences.
 */

import { BaseSystem } from './BaseSystem.js';
import { PreferencesSystem } from './PreferencesSystem.js';
import { EventBus } from '../core/EventBus.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { AudioBusChangedEvent } from '../core/events/AudioBusChangedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { BattleFoeKnockedOutEvent } from '../core/events/BattleFoeKnockedOutEvent.js';
import { PokemonCaughtEvent } from '../core/events/PokemonCaughtEvent.js';
import { CaptureAttemptResolvedEvent } from '../core/events/CaptureAttemptResolvedEvent.js';
import { EggHatchedEvent } from '../core/events/EggHatchedEvent.js';
import { FossilRevivedEvent } from '../core/events/FossilRevivedEvent.js';
import { QuestCompletedEvent } from '../core/events/QuestCompletedEvent.js';
import { AchievementUnlockedEvent } from '../core/events/AchievementUnlockedEvent.js';
import { ShopPurchaseCompletedEvent } from '../core/events/ShopPurchaseCompletedEvent.js';
import { MarketPurchaseCompletedEvent } from '../core/events/MarketPurchaseCompletedEvent.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { PokedexEntryOpenedEvent } from '../core/events/PokedexEntryOpenedEvent.js';
import { NotificationDispatchedEvent } from '../core/events/NotificationDispatchedEvent.js';

const FADE_DURATION_MS = 800;
const SFX_COOLDOWN_MS = 40;
const CRY_COOLDOWN_MS = 120;

/** Music fallback contexts */
const MUSIC_TRACKS = Object.freeze({
  menu: 'menu',
  map_kanto: 'map_kanto',
  map_johto: 'map_johto',
  map_hoenn: 'map_hoenn',
  battle_wild: 'battle_wild',
  battle_wild_johto: 'battle_wild_johto',
  battle_wild_hoenn: 'battle_wild_hoenn',
  battle_trainer: 'battle_trainer',
  battle_gym: 'battle_gym',
  battle_league: 'battle_league',
  battle_legendary: 'battle_legendary',
  battle_roaming: 'battle_roaming',
  battle_boss: 'battle_boss',
  town: 'town',
  town_johto: 'town_johto',
  town_hoenn: 'town_hoenn',
  town_home: 'town_home',
  town_city: 'town_city',
  town_coast: 'town_coast',
  town_market: 'town_market',
  sea: 'sea',
  loc_lavender: 'loc_lavender',
  loc_ecruteak: 'loc_ecruteak',
  dungeon: 'dungeon',
  dungeon_tower: 'dungeon_tower',
  dungeon_forest: 'dungeon_forest',
  dungeon_plant: 'dungeon_plant',
  dungeon_lair: 'dungeon_lair',
  dungeon_ice: 'dungeon_ice',
  dungeon_water: 'dungeon_water',
  dungeon_fire: 'dungeon_fire',
  dungeon_desert: 'dungeon_desert'
});

export class AudioSystem extends BaseSystem {
  /** @private @type {AudioSystem|null} */
  static _instance = null;

  /** @returns {AudioSystem} */
  static getInstance() {
    if (!AudioSystem._instance) {
      AudioSystem._instance = new AudioSystem();
    }
    return AudioSystem._instance;
  }

  constructor() {
    super('AudioSystem', 'System');
    this._unlocked = false;
    this._hidden = false;
    /** @private @type {AudioContext|null} */
    this._ctx = null;
    /** @private @type {GainNode|null} */
    this._sfxGain = null;
    /** @private @type {GainNode|null} */
    this._criesGain = null;
    /** @private @type {string|null} */
    this._currentTrackKey = null;
    /** @private @type {HTMLAudioElement|null} */
    this._currentAudio = null;
    /** @private @type {string|null} */
    this._pendingContext = null;
    /** @private @type {string|null} */
    this._activeContext = null;
    /** @private @type {string|null} */
    this._savedLocationContext = null;
    /** @private @type {Map<string, HTMLAudioElement>} */
    this._audioPool = new Map();
    /** @private @type {Map<string, number>} */
    this._lastSfxTimes = new Map();
    /** @private @type {any} */
    this._fadeInterval = null;

    this._registerEventListeners();
  }

  /** @private */
  _registerEventListeners() {
    const bus = EventBus.getInstance();

    bus.subscribe(AudioBusChangedEvent, (event) => {
      this._onBusChanged(event.busId, event.state);
    });

    bus.subscribe(LocationChangedEvent, (event) => {
      this._onLocationChanged(event.locationId, event.region);
    });

    bus.subscribe(BattleStartedEvent, (event) => {
      this._onBattleStarted(event);
    });

    bus.subscribe(BattleEndedEvent, () => {
      this._onBattleEnded();
    });

    bus.subscribe(BattleFoeKnockedOutEvent, () => {
      this.playSfx('ko');
    });

    bus.subscribe(PokemonCaughtEvent, (event) => {
      if (event.shiny) {
        this.playSfx('shiny_catch');
      } else {
        this.playSfx('catch');
      }
    });

    bus.subscribe(CaptureAttemptResolvedEvent, (event) => {
      if (event.caught) {
        if (event.shiny) this.playSfx('shiny_catch');
        else this.playSfx('catch');
      } else if (event.escaped) {
        this.playSfx('catch_fail');
      }
    });

    bus.subscribe(EggHatchedEvent, () => {
      this.playSfx('hatch');
    });

    bus.subscribe(FossilRevivedEvent, () => {
      this.playSfx('treasure');
    });

    bus.subscribe(QuestCompletedEvent, () => {
      this.playSfx('quest');
    });

    bus.subscribe(AchievementUnlockedEvent, () => {
      this.playSfx('badge');
    });

    bus.subscribe(ShopPurchaseCompletedEvent, () => {
      this.playSfx('buy');
    });

    bus.subscribe(MarketPurchaseCompletedEvent, () => {
      this.playSfx('buy');
    });

    bus.subscribe(ModalOpenRequestedEvent, () => {
      this.playSfx('open');
    });

    bus.subscribe(PokedexEntryOpenedEvent, (event) => {
      if (event.speciesId) this.playCry(event.speciesId);
    });

    bus.subscribe(NotificationDispatchedEvent, () => {
      this.playSfx('notify');
    });
  }

  /**
   * Unlocks audio playback after the first user gesture.
   */
  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;

    try {
      const AudioCtx = typeof AudioContext !== 'undefined' ? AudioContext
        : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
      if (AudioCtx) {
        this._ctx = new AudioCtx();
        this._sfxGain = this._ctx.createGain();
        this._sfxGain.connect(this._ctx.destination);
        this._criesGain = this._ctx.createGain();
        this._criesGain.connect(this._ctx.destination);
        this._applyBusGains();

        if (this._ctx.state === 'suspended' && typeof this._ctx.resume === 'function') {
          this._ctx.resume().catch(() => {});
        }
      }
    } catch (_) {
      this._ctx = null;
    }

    if (this._pendingContext) {
      const ctx = this._pendingContext;
      this._pendingContext = null;
      this.setMusicContext(ctx);
    }
  }

  /**
   * Updates pause/resume when document visibility changes.
   * @param {boolean} hidden
   */
  setHidden(hidden) {
    this._hidden = !!hidden;
    if (this._hidden) {
      if (this._currentAudio) {
        try { this._currentAudio.pause(); } catch (_) {}
      }
    } else {
      this._resumeMusic();
    }
  }

  /**
   * Plays a sound effect by name.
   * @param {string} name
   * @returns {boolean}
   */
  playSfx(name) {
    const preferences = PreferencesSystem.getInstance();
    const bus = preferences.getAudioBus('sfx');
    if (!bus.on || bus.volume <= 0 || this._hidden) return false;

    const now = Date.now();
    const last = this._lastSfxTimes.get(name) || 0;
    if (now - last < SFX_COOLDOWN_MS) return false;
    this._lastSfxTimes.set(name, now);

    if (typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(AssetPaths.sfx(name));
        audio.volume = Math.max(0, Math.min(1, bus.volume / 100));
        const p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        return true;
      } catch (_) {}
    }

    return this._playProceduralSfx(name);
  }

  /**
   * Plays a Pokémon species cry.
   * @param {string|number} dexOrSpecies
   * @returns {boolean}
   */
  playCry(dexOrSpecies) {
    const preferences = PreferencesSystem.getInstance();
    const bus = preferences.getAudioBus('cries');
    if (!bus.on || bus.volume <= 0 || this._hidden) return false;

    let dex = Number(dexOrSpecies);
    if (!Number.isFinite(dex) || dex <= 0) {
      const species = PokemonDB.getInstance().getById(String(dexOrSpecies));
      dex = species ? species.dex : 0;
    }
    if (!dex || dex <= 0 || dex > 386) return false;

    const now = Date.now();
    const key = `cry_${dex}`;
    const last = this._lastSfxTimes.get(key) || 0;
    if (now - last < CRY_COOLDOWN_MS) return false;
    this._lastSfxTimes.set(key, now);

    if (typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(AssetPaths.cry(dex));
        audio.volume = Math.max(0, Math.min(1, bus.volume / 100));
        const p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        return true;
      } catch (_) {}
    }
    return false;
  }

  /**
   * Requests a music context (e.g. 'town', 'map_kanto', 'battle_wild').
   * Fades smoothly from previous track.
   * @param {string} context
   * @returns {boolean}
   */
  setMusicContext(context) {
    if (!context) return false;
    this._activeContext = context;

    if (!this._unlocked) {
      this._pendingContext = context;
      return false;
    }

    const trackKey = this._resolveTrack(context);
    if (!trackKey) return false;

    if (trackKey === this._currentTrackKey && this._currentAudio) {
      if (this._currentAudio.paused && !this._hidden) {
        this._resumeMusic();
      }
      return true;
    }

    this._transitionToTrack(trackKey);
    return true;
  }

  /**
   * Stops current music playback.
   */
  stopMusic() {
    if (this._currentAudio) {
      try { this._currentAudio.pause(); } catch (_) {}
      this._currentAudio = null;
    }
    this._currentTrackKey = null;
    this._activeContext = null;
    this._pendingContext = null;
  }

  /** @returns {string|null} */
  getCurrentMusicTrack() {
    return this._currentTrackKey;
  }

  /** @private @param {string} trackKey */
  _transitionToTrack(trackKey) {
    const preferences = PreferencesSystem.getInstance();
    const bus = preferences.getAudioBus('music');
    const targetVolume = bus.on ? Math.max(0, Math.min(1, bus.volume / 100)) : 0;

    const prevAudio = this._currentAudio;
    if (prevAudio) {
      this._fadeAudio(prevAudio, 0, FADE_DURATION_MS, () => {
        try { prevAudio.pause(); } catch (_) {}
      });
    }

    this._currentTrackKey = trackKey;
    if (typeof Audio === 'undefined') return;

    let nextAudio = this._audioPool.get(trackKey);
    if (!nextAudio) {
      nextAudio = new Audio(AssetPaths.music(trackKey));
      nextAudio.loop = true;
      this._audioPool.set(trackKey, nextAudio);
    }

    this._currentAudio = nextAudio;
    if (this._hidden || !bus.on) return;

    try {
      nextAudio.volume = 0;
      const playPromise = nextAudio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
      this._fadeAudio(nextAudio, targetVolume, FADE_DURATION_MS);
    } catch (_) {}
  }

  /** @private */
  _resumeMusic() {
    if (this._hidden || !this._currentAudio) return;
    const bus = PreferencesSystem.getInstance().getAudioBus('music');
    if (!bus.on) return;

    try {
      this._currentAudio.volume = Math.max(0, Math.min(1, bus.volume / 100));
      const p = this._currentAudio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }

  /** @private @param {HTMLAudioElement} audio @param {number} target @param {number} duration @param {Function} [onDone] */
  _fadeAudio(audio, target, duration, onDone) {
    if (!audio) return;
    const start = Number.isFinite(audio.volume) ? audio.volume : 0;
    const steps = Math.max(1, Math.round(duration / 50));
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const next = start + (target - start) * (currentStep / steps);
      try {
        audio.volume = Math.max(0, Math.min(1, next));
      } catch (_) {}

      if (currentStep >= steps) {
        clearInterval(interval);
        try { audio.volume = Math.max(0, Math.min(1, target)); } catch (_) {}
        if (typeof onDone === 'function') onDone();
      }
    }, 50);
  }

  /** @private @param {string} busId @param {{on:boolean,volume:number}} state */
  _onBusChanged(busId, state) {
    if (busId === 'music') {
      if (!state.on) {
        if (this._currentAudio) {
          try { this._currentAudio.pause(); } catch (_) {}
        }
      } else {
        if (this._currentAudio) {
          this._currentAudio.volume = Math.max(0, Math.min(1, state.volume / 100));
          if (this._currentAudio.paused && !this._hidden) {
            try { this._currentAudio.play(); } catch (_) {}
          }
        } else if (this._activeContext) {
          this.setMusicContext(this._activeContext);
        }
      }
    } else {
      this._applyBusGains();
    }
  }

  /** @private */
  _applyBusGains() {
    if (!this._ctx) return;
    const preferences = PreferencesSystem.getInstance();
    const sfx = preferences.getAudioBus('sfx');
    const cries = preferences.getAudioBus('cries');
    try {
      if (this._sfxGain) {
        this._sfxGain.gain.value = sfx.on ? Math.max(0, Math.min(1, sfx.volume / 100)) : 0;
      }
      if (this._criesGain) {
        this._criesGain.gain.value = cries.on ? Math.max(0, Math.min(1, cries.volume / 100)) : 0;
      }
    } catch (_) {}
  }

  /** @private @param {string} locationId @param {string} region */
  _onLocationChanged(locationId, region) {
    const locations = LocationDB.getInstance();
    const loc = locations.getById(locationId);
    let context = 'map_' + (region || 'kanto');

    if (locationId === 'lavender') context = 'loc_lavender';
    else if (locationId === 'ecruteak') context = 'loc_ecruteak';
    else if (loc && (loc.type === 'town' || loc.type === 'city')) {
      context = region === 'johto' ? 'town_johto' : region === 'hoenn' ? 'town_hoenn' : 'town';
    } else if (loc && loc.type === 'sea') {
      context = 'sea';
    } else if (loc && (loc.type === 'cave' || loc.type === 'dungeon')) {
      context = 'dungeon';
    }

    this._savedLocationContext = context;
    this.setMusicContext(context);
  }

  /** @private @param {BattleStartedEvent} event */
  _onBattleStarted(event) {
    const foe = event.foe;
    if (foe) {
      this.playCry(foe.species || foe.id);
      this.playSfx('throw');
    }

    let battleContext = 'battle_wild';
    if (event.isTrainer || foe?.trainer) {
      if (event.isLeague) battleContext = 'battle_league';
      else if (event.isGym) battleContext = 'battle_gym';
      else battleContext = 'battle_trainer';
    } else if (foe?.roaming || event.isRoaming) {
      battleContext = 'battle_roaming';
    } else if (foe?.legendaryBoss || foe?.isLegendary || event.isLegendary) {
      battleContext = 'battle_legendary';
    } else {
      const region = foe?.region;
      if (region === 'johto') battleContext = 'battle_wild_johto';
      else if (region === 'hoenn') battleContext = 'battle_wild_hoenn';
      else battleContext = 'battle_wild';
    }

    this.setMusicContext(battleContext);
  }

  /** @private */
  _onBattleEnded() {
    if (this._savedLocationContext) {
      this.setMusicContext(this._savedLocationContext);
    }
  }

  /** @private @param {string} context @returns {string|null} */
  _resolveTrack(context) {
    if (!context) return null;
    if (MUSIC_TRACKS[context]) return MUSIC_TRACKS[context];

    const parts = context.split(':');
    for (const part of parts) {
      if (MUSIC_TRACKS[part]) return MUSIC_TRACKS[part];
    }
    return MUSIC_TRACKS.map_kanto || null;
  }

  /** @private @param {string} name @returns {boolean} */
  _playProceduralSfx(name) {
    if (!this._ctx || !this._sfxGain) return false;
    try {
      const t0 = this._ctx.currentTime;
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.connect(gain);
      gain.connect(this._sfxGain);

      if (name === 'click') {
        osc.frequency.setValueAtTime(1000, t0);
        gain.gain.setValueAtTime(0.08, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
        osc.start(t0);
        osc.stop(t0 + 0.05);
      } else if (name === 'open') {
        osc.frequency.setValueAtTime(600, t0);
        osc.frequency.exponentialRampToValueAtTime(1000, t0 + 0.08);
        gain.gain.setValueAtTime(0.1, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
        osc.start(t0);
        osc.stop(t0 + 0.1);
      } else if (name === 'ko') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t0);
        osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.2);
        gain.gain.setValueAtTime(0.18, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        osc.start(t0);
        osc.stop(t0 + 0.23);
      } else {
        osc.frequency.setValueAtTime(800, t0);
        gain.gain.setValueAtTime(0.1, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
        osc.start(t0);
        osc.stop(t0 + 0.12);
      }
      return true;
    } catch (_) {
      return false;
    }
  }
}
