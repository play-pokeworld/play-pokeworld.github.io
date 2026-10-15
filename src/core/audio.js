// V7-R2 · SND-01/02/03 — MOTEUR AUDIO (WebAudio + <audio> pour les boucles).
//
// Règles (roadmap V7 §4b, décisions joueur) :
//  · un seul AudioContext, créé au PREMIER geste de l'utilisateur (autoplay) ;
//  · deux bus, « effets » et « musique », volume + coupure séparés, mémorisés
//    HORS sauvegarde (localStorage) ; défauts : effets ON, musique ON à 40 % ;
//  · AUCUN chargement audio au démarrage : une piste n'est créée qu'au moment
//    de la jouer (après un geste) ;
//  · onglet caché → musique en pause, reprise au retour (décision joueur :
//    « ne joue pas de musique si la page n'est pas visible ») ;
//  · effets 100 % procéduraux (oscillateurs / bruit filtré) : zéro fichier,
//    zéro réseau ; musiques CC0 (docs/CREDITS.md) en boucle, fondu 1 s,
//    reprise de position par piste ;
//  · le rattrapage hors-ligne ne joue rien (PW_FF — garde dans les liaisons).
//
// V7-R3 · SND-04 — « DROP-IN » : le manifeste src/assets/audio/manifest.json
// (tools/audio-manifest.mjs, régénéré par download_assets.bat / npm run build)
// inventorie les fichiers déposés par le joueur. Un fichier `sfx/<nom>.ogg`
// remplace la recette procédurale du même nom ; une musique `music/<clé>.mp3`
// est choisie par une CHAÎNE DE REPLI du plus précis au plus général
// (loc_<lieu> → map_<région> ; trainer_<champion> → battle_gym →
// battle_trainer ; battle_league / battle_legendary / battle_roaming →
// battle_boss ; dungeon_<lieu> → dungeon) ; les cris officiels des Pokémon
// (`cries/<dex>.ogg`, dépôt PokeAPI/cries — même amont que les sprites) sont
// joués à l'apparition, au K.O. et dans la fiche. Le manifeste est lu UNE fois,
// après le premier geste ; aucune sonde réseau à l'aveugle.
//
// Module sans import (core/*) : surface classique window/globalThis.

const AUDIO_PREFS_KEY = 'pokeworld_audio_prefs';
// V7-R3c · SND-07 — trois bus : effets (interface), musique, cris des Pokémon.
const AUDIO_DEFAULTS = Object.freeze({
  sfxOn: true,
  sfxVol: 0.8,
  musicOn: true,
  musicVol: 0.4,
  criesOn: true,
  criesVol: 0.6,
});
const AUDIO_BASE = 'src/assets/audio/';
const AUDIO_MUSIC_BASE = AUDIO_BASE + 'music/';
const AUDIO_MANIFEST_URL = AUDIO_BASE + 'manifest.json';
const AUDIO_FADE_MS = 1000;
const AUDIO_BUFFER_CACHE_MAX = 64; // tampons décodés gardés (effets fichier + cris)
/** Contexte musical → fichier (sans extension). Référence pour docs/CREDITS.md. */
const AUDIO_MUSIC_TRACKS = Object.freeze({
  menu: 'menu',
  map_kanto: 'map_kanto',
  map_johto: 'map_johto',
  map_hoenn: 'map_hoenn',
  battle_wild: 'battle_wild',
  battle_trainer: 'battle_trainer',
  dungeon: 'dungeon',
  battle_boss: 'battle_boss',
  // V7-R3b · SND-05 — bande-son complète (CC0, Juhani Junkala) : arène, Ligue,
  // légendaire, errant, villes par région, ambiances de donjon, Lavanville.
  battle_gym: 'battle_gym',
  battle_league: 'battle_league',
  battle_legendary: 'battle_legendary',
  battle_roaming: 'battle_roaming',
  town: 'town',
  town_johto: 'town_johto',
  town_hoenn: 'town_hoenn',
  dungeon_tower: 'dungeon_tower',
  dungeon_forest: 'dungeon_forest',
  dungeon_plant: 'dungeon_plant',
  dungeon_lair: 'dungeon_lair',
  loc_lavender: 'loc_lavender',
  // V7-R3c · SND-06 — diversité des lieux : villes natales / grandes villes /
  // villes côtières, chenaux, routes de nuit, Rosalia.
  town_home: 'town_home',
  town_city: 'town_city',
  town_coast: 'town_coast',
  sea: 'sea',
  map_night: 'map_night',
  loc_ecruteak: 'loc_ecruteak',
});

const _audio = {
  prefs: null,
  ctx: null,
  sfxGain: null,
  criesGain: null, // V7-R3c · SND-07 — bus séparé pour les cris
  unlocked: false,
  installed: false,
  hidden: false,
  musicKey: null, // piste en cours (clé de AUDIO_MUSIC_TRACKS)
  pendingKey: null, // contexte demandé avant le déverrouillage
  elements: new Map(), // clé → HTMLAudioElement (position conservée)
  fades: new Map(), // élément → id de minuterie de fondu
  lastSfxAt: new Map(), // nom → horodatage (anti-rafale)
  manifest: null, // V7-R3 · SND-04 — inventaire des fichiers déposés (lu après le geste)
  manifestState: 'idle', // idle | loading | ready | failed
  musicContext: null, // dernier contexte demandé (ré-évalué quand le manifeste arrive)
  buffers: new Map(), // url → AudioBuffer | null (échec) | Promise
};

function _audioStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch (_) {
    return null;
  }
}
function _clamp01(v, dflt) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(0, Math.min(1, n));
}

/** Préférences (lecture paresseuse, fusion avec les défauts). */
function audioPrefs() {
  if (_audio.prefs) return _audio.prefs;
  let saved = null;
  try {
    const st = _audioStorage();
    const raw = st ? st.getItem(AUDIO_PREFS_KEY) : null;
    saved = raw ? JSON.parse(raw) : null;
  } catch (_) {
    saved = null;
  }
  const p = Object.assign({}, AUDIO_DEFAULTS, saved && typeof saved === 'object' ? saved : {});
  p.sfxOn = p.sfxOn !== false;
  p.musicOn = p.musicOn !== false;
  p.criesOn = p.criesOn !== false;
  p.sfxVol = _clamp01(p.sfxVol, AUDIO_DEFAULTS.sfxVol);
  p.musicVol = _clamp01(p.musicVol, AUDIO_DEFAULTS.musicVol);
  p.criesVol = _clamp01(p.criesVol, AUDIO_DEFAULTS.criesVol);
  _audio.prefs = p;
  return p;
}
function audioSavePrefs() {
  const st = _audioStorage();
  if (!st) return false;
  try {
    st.setItem(AUDIO_PREFS_KEY, JSON.stringify(audioPrefs()));
    return true;
  } catch (_) {
    return false;
  }
}
function audioIsUnlocked() {
  return _audio.unlocked;
}
function audioIsHidden() {
  return _audio.hidden;
}

/** Premier geste : crée le contexte WebAudio et lance la musique en attente. */
function audioUnlock() {
  if (_audio.unlocked) return true;
  _audio.unlocked = true;
  try {
    const AC =
      typeof globalThis.AudioContext === 'function'
        ? globalThis.AudioContext
        : typeof globalThis.webkitAudioContext === 'function'
          ? globalThis.webkitAudioContext
          : null;
    if (AC) {
      _audio.ctx = new AC();
      _audio.sfxGain = _audio.ctx.createGain();
      _audio.sfxGain.connect(_audio.ctx.destination);
      _audio.criesGain = _audio.ctx.createGain();
      _audio.criesGain.connect(_audio.ctx.destination);
      _applySfxGain();
      if (_audio.ctx.state === 'suspended' && typeof _audio.ctx.resume === 'function')
        _audio.ctx.resume().catch(() => {});
    }
  } catch (_) {
    _audio.ctx = null;
    _audio.sfxGain = null;
    _audio.criesGain = null;
  }
  audioLoadManifest();
  if (_audio.pendingKey) {
    const key = _audio.pendingKey;
    _audio.pendingKey = null;
    audioSetMusicContext(key);
  }
  return true;
}

// ── V7-R3 · SND-04 — manifeste « drop-in » ───────────────────────────────────
/** Lit le manifeste UNE fois (après le premier geste). Retourne la promesse. */
function audioLoadManifest() {
  if (_audio.manifestState !== 'idle') return Promise.resolve(_audio.manifest);
  if (typeof globalThis.fetch !== 'function') {
    _audio.manifestState = 'failed';
    return Promise.resolve(null);
  }
  _audio.manifestState = 'loading';
  return globalThis
    .fetch(AUDIO_MANIFEST_URL, { cache: 'no-cache' })
    .then((r) => (r && r.ok ? r.json() : null))
    .then((m) => {
      audioSetManifest(m);
      return _audio.manifest;
    })
    .catch(() => {
      _audio.manifestState = 'failed';
      return null;
    });
}
/** Installe un manifeste (lecture réseau ou tests) et ré-évalue la musique. */
function audioSetManifest(m) {
  const ok = m && typeof m === 'object';
  _audio.manifest = ok
    ? {
        music: m.music && typeof m.music === 'object' ? m.music : {},
        sfx: m.sfx && typeof m.sfx === 'object' ? m.sfx : {},
        cries: m.cries && typeof m.cries === 'object' ? m.cries : {},
      }
    : null;
  _audio.manifestState = ok ? 'ready' : 'failed';
  // La piste jouée a pu être un repli : le contexte est redemandé tel quel.
  if (ok && _audio.musicContext) audioSetMusicContext(_audio.musicContext);
  return _audio.manifest;
}
function _manifestHas(kind, key) {
  const m = _audio.manifest;
  return !!(m && m[kind] && Object.prototype.hasOwnProperty.call(m[kind], key) && m[kind][key]);
}
/** Les clés musicales disponibles : manifeste si lu, sinon les pistes livrées. */
function _musicAvailable(key) {
  if (!key) return false;
  if (_audio.manifest) return _manifestHas('music', key);
  return !!AUDIO_MUSIC_TRACKS[key];
}

/** Tampon décodé (fichier d'effet ou cri), mis en cache ; null si illisible. */
function _bufferFor(url) {
  const cached = _audio.buffers.get(url);
  if (cached !== undefined) return cached instanceof Promise ? cached : Promise.resolve(cached);
  if (typeof globalThis.fetch !== 'function' || !_audio.ctx) return Promise.resolve(null);
  const p = globalThis
    .fetch(url)
    .then((r) => (r && r.ok ? r.arrayBuffer() : null))
    .then((ab) => (ab ? _audio.ctx.decodeAudioData(ab) : null))
    .catch(() => null)
    .then((buf) => {
      _audio.buffers.set(url, buf || null);
      if (_audio.buffers.size > AUDIO_BUFFER_CACHE_MAX) {
        const first = _audio.buffers.keys().next().value;
        if (first !== url) _audio.buffers.delete(first);
      }
      return buf || null;
    });
  _audio.buffers.set(url, p);
  return p;
}
/** Joue un tampon sur un bus (gain relatif, vitesse de lecture).
 *  @param {'sfx'|'cries'} [bus] bus de sortie (effets par défaut) */
function _playBuffer(url, gain, rate, bus) {
  const out = bus === 'cries' ? _audio.criesGain : _audio.sfxGain;
  if (!_audio.ctx || !out) return false;
  const ctx = _audio.ctx;
  _bufferFor(url).then((buf) => {
    const p = audioPrefs();
    if (!buf || _audio.hidden || !(bus === 'cries' ? p.criesOn : p.sfxOn)) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      if (rate && rate !== 1) src.playbackRate.value = rate;
      const g = ctx.createGain();
      g.gain.value = Math.max(0, Math.min(1, gain == null ? 1 : gain));
      src.connect(g);
      g.connect(out);
      src.start();
    } catch (_) {}
  });
  return true;
}
/** V7-R3 — cri officiel d'un Pokémon (fichier cries/<dex>.ogg du manifeste).
 *  @param {number|string} dexId numéro du Pokédex (une forme utilise son espèce)
 *  @param {{gain?:number, rate?:number}} [opts] rate 0.75 = cri « K.O. » ralenti */
function audioPlayCry(dexId, opts) {
  const id = String(parseInt(String(dexId).split('-')[0], 10) || 0);
  if (id === '0' || !_manifestHas('cries', id)) return false;
  if (!_audio.unlocked || !_audio.ctx || !_audio.criesGain || _audio.hidden) return false;
  const p = audioPrefs();
  if (!p.criesOn || p.criesVol <= 0) return false; // V7-R3c · SND-07 — bus « cris »
  const now = Date.now();
  if (now - (_audio.lastSfxAt.get('cry:' + id) || 0) < 120) return false;
  _audio.lastSfxAt.set('cry:' + id, now);
  const o = opts || {};
  return _playBuffer(
    AUDIO_BASE + 'cries/' + _audio.manifest.cries[id],
    o.gain == null ? 0.9 : o.gain,
    o.rate || 1,
    'cries'
  );
}

function _applySfxGain() {
  const p = audioPrefs();
  try {
    if (_audio.sfxGain) _audio.sfxGain.gain.value = p.sfxOn ? p.sfxVol : 0;
    if (_audio.criesGain) _audio.criesGain.gain.value = p.criesOn ? p.criesVol : 0;
  } catch (_) {}
}

// ── Réglages ────────────────────────────────────────────────────────────────
/** Bus : 'sfx' (effets d'interface), 'music', 'cries' (cris des Pokémon). */
function _busOnKey(bus) {
  return bus === 'music' ? 'musicOn' : bus === 'cries' ? 'criesOn' : 'sfxOn';
}
function _busVolKey(bus) {
  return bus === 'music' ? 'musicVol' : bus === 'cries' ? 'criesVol' : 'sfxVol';
}
function audioSetEnabled(bus, on) {
  const p = audioPrefs();
  p[_busOnKey(bus)] = !!on;
  if (bus === 'music') {
    if (!p.musicOn) _pauseCurrent();
    else _resumeCurrent();
  } else _applySfxGain();
  audioSavePrefs();
  return p;
}
function audioToggle(bus) {
  const p = audioPrefs();
  return audioSetEnabled(bus, !p[_busOnKey(bus)]);
}
/** @param {number} v volume 0–1 ; un curseur passe `{ percent: true }` (0–100).
 *  V7-R3c — plus d'heuristique « > 1 » : 1 % n'est plus confondu avec 100 %. */
function audioSetVolume(bus, v, opts) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = 0;
  if (opts && opts.percent) n = n / 100;
  n = Math.max(0, Math.min(1, n));
  const p = audioPrefs();
  p[_busVolKey(bus)] = n;
  if (bus === 'music') {
    const el = _audio.musicKey ? _audio.elements.get(_audio.musicKey) : null;
    if (el && !_audio.fades.has(el)) el.volume = n;
  } else _applySfxGain();
  audioSavePrefs();
  return n;
}

// ── Effets procéduraux ──────────────────────────────────────────────────────
function _tone(freq, at, dur, type, gain, slideTo) {
  const ctx = _audio.ctx;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type || 'square';
  const t0 = ctx.currentTime + at;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain || 0.2, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(_audio.sfxGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
function _noise(at, dur, gain, filterFreq) {
  const ctx = _audio.ctx;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const flt = ctx.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.value = filterFreq || 1200;
  const g = ctx.createGain();
  const t0 = ctx.currentTime + at;
  g.gain.setValueAtTime(gain || 0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(flt);
  flt.connect(g);
  g.connect(_audio.sfxGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}
function _arp(notes, step, dur, type, gain) {
  notes.forEach((f, i) => _tone(f, i * step, dur, type, gain));
}
/** Recettes : nom d'effet → notes. Une entrée = un effet (≈ 20). */
const AUDIO_SFX = Object.freeze({
  click: () => _tone(1200, 0, 0.04, 'square', 0.06),
  open: () => _arp([660, 990], 0.05, 0.07, 'triangle', 0.1),
  notify: () => _arp([880, 1320], 0.07, 0.1, 'sine', 0.12),
  error: () => _tone(220, 0, 0.18, 'sawtooth', 0.12, 110),
  buy: () => _arp([988, 1319], 0.08, 0.12, 'square', 0.1),
  ko: () => {
    _noise(0, 0.18, 0.25, 600);
    _tone(160, 0, 0.22, 'triangle', 0.18, 50);
  },
  faint: () => _tone(520, 0, 0.35, 'square', 0.1, 120),
  levelup: () => _arp([523, 659, 784, 1047], 0.07, 0.14, 'square', 0.1),
  evolve: () => _arp([392, 494, 587, 784, 988, 1175], 0.09, 0.2, 'triangle', 0.1),
  hatch: () => _arp([1047, 1319, 1047, 1568], 0.08, 0.1, 'sine', 0.12),
  throw: () => _noise(0, 0.25, 0.18, 900),
  catch: () => _arp([784, 988, 1175, 1568], 0.1, 0.22, 'square', 0.1),
  catch_fail: () => {
    _noise(0, 0.08, 0.2, 2000);
    _tone(440, 0.06, 0.2, 'square', 0.08, 180);
  },
  badge: () => _arp([523, 659, 784, 1047, 784, 1047], 0.11, 0.25, 'square', 0.1),
  league: () => _arp([523, 659, 784, 1047, 1319, 1047, 1319, 1568], 0.12, 0.3, 'triangle', 0.11),
  // Décision joueur : un son quand un BRILLANT apparaît, un autre à sa capture.
  shiny: () => {
    _arp([1568, 2093, 2637, 3136, 2637, 3136, 3951], 0.045, 0.16, 'sine', 0.1);
    _noise(0.05, 0.3, 0.05, 6000);
  },
  shiny_catch: () => {
    _arp([784, 988, 1175, 1568], 0.1, 0.22, 'square', 0.1);
    _arp([2093, 2637, 3136, 3951, 3136, 3951, 4186], 0.05, 0.18, 'sine', 0.08);
  },
  boss: () => {
    _tone(110, 0, 0.5, 'sawtooth', 0.16, 55);
    _noise(0, 0.35, 0.12, 300);
  },
  chest: () => _arp([659, 988, 1319], 0.07, 0.14, 'triangle', 0.1),
  quest: () => _arp([659, 784, 1047, 1319], 0.09, 0.18, 'square', 0.1),
  treasure: () => _arp([1319, 1760, 2093], 0.06, 0.12, 'sine', 0.1),
  roamer: () => _arp([440, 554, 659, 880], 0.08, 0.3, 'sawtooth', 0.08),
});

/** Joue un effet (ignoré : pas de geste, bus coupé, onglet caché, rafale < 40 ms). */
function audioPlaySfx(name) {
  const recipe = AUDIO_SFX[name];
  const fileSfx = _manifestHas('sfx', name); // V7-R3 · SND-04 — fichier déposé prioritaire
  if (!recipe && !fileSfx) return false;
  if (!_audio.unlocked || !_audio.ctx || !_audio.sfxGain || _audio.hidden) return false;
  const p = audioPrefs();
  if (!p.sfxOn || p.sfxVol <= 0) return false;
  const now = Date.now();
  if (now - (_audio.lastSfxAt.get(name) || 0) < 40) return false;
  _audio.lastSfxAt.set(name, now);
  try {
    if (_audio.ctx.state === 'suspended' && typeof _audio.ctx.resume === 'function')
      _audio.ctx.resume().catch(() => {});
    if (fileSfx) return _playBuffer(AUDIO_BASE + _audio.manifest.sfx[name], 1, 1);
    recipe();
    return true;
  } catch (_) {
    return false;
  }
}

// ── Musiques en boucle ──────────────────────────────────────────────────────
/** V7-R3 · SND-04 — chaîne de repli d'un contexte (du plus précis au plus
 *  général). Contextes composés : `map:<région>:<lieu>[:town[:<thème>]|:sea|:night]`, `battle:wild`,
 *  `battle:trainer[:<champion>]`, `battle:gym[:<champion>]`, `battle:league`,
 *  `battle:legendary`, `battle:roaming`, `battle:boss`, `dungeon:<lieu>[:<thème>]`
 *  (thème : tower, forest, plant, lair), `menu` ; une clé simple (`map_kanto`,
 *  `battle_wild`) reste acceptée. */
function audioMusicChain(context) {
  if (!context) return [];
  const c = String(context);
  if (c.indexOf(':') < 0) {
    if (/^map_/.test(c)) return [c, 'map_hoenn'];
    return [c];
  }
  const parts = c.split(':');
  const kind = parts[0];
  const sub = parts[1] || '';
  const id = parts[2] || '';
  const extra = parts[3] || ''; // V7-R3b · SND-05 — `town` (lieu) / thème de donjon
  if (kind === 'map') {
    // V7-R3c · SND-06 — `map:<r>:<lieu>:town[:<thème>]` (home / city / coast),
    // `map:<r>:<lieu>:sea` (chenaux), `map:<r>:<lieu>:night` (routes la nuit).
    const theme = parts[4] || '';
    const out = [];
    if (id) out.push('loc_' + id);
    if (extra === 'town') {
      if (theme) out.push('town_' + theme);
      if (sub) out.push('town_' + sub);
      out.push('town');
    } else if (extra === 'sea') {
      if (sub) out.push('sea_' + sub);
      out.push('sea');
    } else if (extra === 'night') {
      if (sub) out.push('map_' + sub + '_night');
      out.push('map_night');
    }
    if (sub) out.push('map_' + sub);
    if (sub !== 'hoenn') out.push('map_hoenn');
    return out;
  }
  if (kind === 'dungeon') {
    if (!sub) return ['dungeon'];
    return ['dungeon_' + sub].concat(id ? ['dungeon_' + id] : [], ['dungeon']);
  }
  if (kind === 'battle') {
    if (sub === 'wild') return ['battle_wild'];
    if (sub === 'gym')
      return (id ? ['trainer_' + id] : []).concat(['battle_gym', 'battle_trainer']);
    if (sub === 'trainer') return (id ? ['trainer_' + id] : []).concat(['battle_trainer']);
    if (sub === 'league') return ['battle_league', 'battle_boss'];
    if (sub === 'legendary') return ['battle_legendary', 'battle_boss'];
    if (sub === 'roaming') return ['battle_roaming', 'battle_legendary', 'battle_boss'];
    if (sub === 'boss') return ['battle_boss'];
    return ['battle_wild'];
  }
  return [c];
}
/** Contexte → clé de piste disponible (pure ; null = silence). */
function audioMusicTrackFor(context) {
  for (const key of audioMusicChain(context)) if (_musicAvailable(key)) return key;
  return null;
}
function _musicUrl(key) {
  if (_audio.manifest && _manifestHas('music', key)) return AUDIO_BASE + _audio.manifest.music[key];
  return AUDIO_MUSIC_BASE + (AUDIO_MUSIC_TRACKS[key] || key) + '.mp3';
}
function _element(key) {
  let el = _audio.elements.get(key);
  if (el) return el;
  if (typeof globalThis.Audio !== 'function') return null;
  el = new globalThis.Audio(_musicUrl(key));
  el.loop = true;
  el.preload = 'auto';
  el.volume = 0;
  _audio.elements.set(key, el);
  return el;
}
function _fadeTo(el, target, ms, then) {
  const old = _audio.fades.get(el);
  if (old) globalThis.clearInterval(old);
  const start = el.volume;
  const steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  const id = globalThis.setInterval(() => {
    i++;
    const v = start + (target - start) * (i / steps);
    try {
      el.volume = Math.max(0, Math.min(1, v));
    } catch (_) {}
    if (i >= steps) {
      globalThis.clearInterval(id);
      _audio.fades.delete(el);
      if (then) then();
    }
  }, 50);
  if (id && typeof id.unref === 'function') id.unref();
  _audio.fades.set(el, id);
}
function _playEl(el) {
  try {
    const pr = el.play();
    if (pr && typeof pr.catch === 'function') pr.catch(() => {});
  } catch (_) {}
}
function _pauseCurrent() {
  const el = _audio.musicKey ? _audio.elements.get(_audio.musicKey) : null;
  if (!el) return;
  try {
    el.pause();
  } catch (_) {}
}
function _resumeCurrent() {
  if (_audio.hidden || !_audio.unlocked) return;
  const p = audioPrefs();
  if (!p.musicOn) return;
  // Piste demandée pendant la coupure / l'onglet caché : créée ici, au retour.
  const el = _audio.musicKey ? _element(_audio.musicKey) : null;
  if (!el) return;
  el.volume = p.musicVol;
  _playEl(el);
}

/**
 * Demande un contexte musical ; fondu enchaîné 1 s, reprise de position.
 * Avant le premier geste, la demande est simplement mémorisée.
 */
function audioSetMusicContext(context) {
  _audio.musicContext = context || null;
  const key = audioMusicTrackFor(context);
  if (!_audio.unlocked) {
    _audio.pendingKey = context || null;
    return false;
  }
  if (key === _audio.musicKey) {
    if (key && !_audio.hidden && audioPrefs().musicOn) {
      const cur = _audio.elements.get(key);
      if (cur && cur.paused) _resumeCurrent();
    }
    return false;
  }
  const prevKey = _audio.musicKey;
  _audio.musicKey = key;
  const prev = prevKey ? _audio.elements.get(prevKey) : null;
  if (prev)
    _fadeTo(prev, 0, AUDIO_FADE_MS, () => {
      try {
        prev.pause();
      } catch (_) {}
    });
  if (!key) return true;
  const p = audioPrefs();
  if (!p.musicOn || _audio.hidden) return true; // la piste démarrera à la reprise
  const el = _element(key);
  if (!el) return false;
  el.volume = 0;
  _playEl(el);
  _fadeTo(el, p.musicVol, AUDIO_FADE_MS);
  return true;
}
function audioStopMusic() {
  _pauseCurrent();
  _audio.musicKey = null;
  _audio.pendingKey = null;
  _audio.musicContext = null;
}
function audioCurrentMusic() {
  return _audio.musicKey;
}

/** Visibilité : onglet caché → pause ; visible → reprise (si activée). */
function audioSetHidden(hidden) {
  _audio.hidden = !!hidden;
  if (_audio.hidden) _pauseCurrent();
  else _resumeCurrent();
}

/** Installe les écouteurs (premier geste + visibilité). Idempotent, sans réseau. */
function audioInstall() {
  if (_audio.installed || typeof document === 'undefined') return false;
  _audio.installed = true;
  const once = () => {
    audioUnlock();
    for (const ev of ['pointerdown', 'keydown', 'touchstart'])
      document.removeEventListener(ev, once, true);
  };
  for (const ev of ['pointerdown', 'keydown', 'touchstart'])
    document.addEventListener(ev, once, true);
  document.addEventListener('visibilitychange', () => {
    audioSetHidden(document.visibilityState === 'hidden');
  });
  _audio.hidden = document.visibilityState === 'hidden';
  return true;
}

/** État interne (réglages, tests). */
function audioState() {
  return {
    unlocked: _audio.unlocked,
    hasContext: !!_audio.ctx,
    hidden: _audio.hidden,
    musicKey: _audio.musicKey,
    pendingKey: _audio.pendingKey,
    loadedTracks: Array.from(_audio.elements.keys()),
    prefs: Object.assign({}, audioPrefs()),
    manifestState: _audio.manifestState,
    musicContext: _audio.musicContext,
    fileSfx: _audio.manifest ? Object.keys(_audio.manifest.sfx).length : 0,
    cries: _audio.manifest ? Object.keys(_audio.manifest.cries).length : 0,
    buffers: _audio.buffers.size,
  };
}

const _audioGlobals = {
  AUDIO_PREFS_KEY,
  AUDIO_DEFAULTS,
  AUDIO_MUSIC_TRACKS,
  AUDIO_MUSIC_BASE,
  AUDIO_BASE,
  AUDIO_MANIFEST_URL,
  AUDIO_FADE_MS,
  AUDIO_SFX,
  audioLoadManifest,
  audioSetManifest,
  audioMusicChain,
  audioPlayCry,
  audioPrefs,
  audioSavePrefs,
  audioIsUnlocked,
  audioIsHidden,
  audioUnlock,
  audioSetEnabled,
  audioToggle,
  audioSetVolume,
  audioPlaySfx,
  audioMusicTrackFor,
  audioSetMusicContext,
  audioStopMusic,
  audioCurrentMusic,
  audioSetHidden,
  audioInstall,
  audioState,
};
if (typeof window !== 'undefined') Object.assign(window, _audioGlobals);
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _audioGlobals);
audioInstall();

export {
  AUDIO_PREFS_KEY,
  AUDIO_DEFAULTS,
  AUDIO_MUSIC_TRACKS,
  AUDIO_MUSIC_BASE,
  AUDIO_BASE,
  AUDIO_MANIFEST_URL,
  AUDIO_FADE_MS,
  AUDIO_SFX,
  audioLoadManifest,
  audioSetManifest,
  audioMusicChain,
  audioPlayCry,
  audioPrefs,
  audioSavePrefs,
  audioIsUnlocked,
  audioIsHidden,
  audioUnlock,
  audioSetEnabled,
  audioToggle,
  audioSetVolume,
  audioPlaySfx,
  audioMusicTrackFor,
  audioSetMusicContext,
  audioStopMusic,
  audioCurrentMusic,
  audioSetHidden,
  audioInstall,
  audioState,
};
