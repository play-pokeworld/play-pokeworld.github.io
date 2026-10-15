// V7-R2 · SND-02/03 — LIAISONS AUDIO : bus d'événements → effets, état du
// jeu → contexte musical.
//
// Chaque effet est UN abonnement au bus de jeu (window.EventBus) ; le moteur
// de combat n'importe rien d'audio : il émet seulement ses événements
// (`battle:enemy`, `catch:throw`, EVENTS.POKEMON_CAUGHT…). La musique suit un
// contexte recalculé à partir de l'état global (menu / carte par région /
// combat sauvage / dresseur / donjon / boss) — rafraîchi sur les événements de
// combat et par une horloge légère, jamais pendant le rattrapage hors-ligne.
//
// Module sans import statique (DBT-04) : tout passe par les globaux.

const AUDIO_EVENT_SFX = Object.freeze({
  // événements nommés du pont classique (EVENTS.*)
  pokemonCaught: (p) => (p && p.shiny ? 'shiny_catch' : 'catch'),
  wildDefeated: () => null, // déjà couvert par combat:enemy-fainted
  badgeEarned: () => 'badge',
  leagueWon: () => 'league',
  bossDefeated: () => 'boss',
  pokemonEvolved: () => 'evolve',
  pokemonHatched: () => 'hatch',
  mineSell: () => 'buy',
  itemObtained: () => 'treasure',
  // événements V7-R2
  'battle:enemy': (p) => (p && p.shiny ? 'shiny' : p && (p.roaming || p.boss) ? 'roamer' : null),
  'catch:throw': () => 'throw',
  'catch:fail': () => 'catch_fail',
  'combat:enemy-fainted': (p) => (p && p.boss ? 'boss' : 'ko'),
  'combat:player-fainted': () => 'faint',
  'pokemon:level-up': () => 'levelup',
  'ui:notify': (p) => (p && p.kind === 'danger' ? 'error' : 'notify'),
  'ui:window-open': () => 'open',
  'dungeon:chest': () => 'chest',
  'quest:completed': () => 'quest',
  PUZZLE_SOLVED: () => 'quest',
  'mine:treasure': () => 'treasure',
  'economy:item-bought': () => 'buy',
});
const AUDIO_REFRESH_EVENTS = Object.freeze(['battle:enemy', 'battle:end', 'quest:completed']);
const AUDIO_POLL_MS = 500;

let _audioBound = false;
let _audioPoll = null;

function _fn(name) {
  const f = globalThis[name];
  return typeof f === 'function' ? f : null;
}

/** V7-R3b · SND-05 / V7-R3d · SND-07 — ambiance d'un LIEU (`dungeon_<thème>`), appliquée
 *  en expédition comme en simple exploration : une tour hantée, une grotte de glace ou un
 *  volcan ne jouent plus le thème enjoué de la région. Thèmes : haunted (Tour Pokémon),
 *  tower (manoirs, épaves, tours brûlées), shrine (sanctuaires, ruines), forest, park
 *  (safaris, parc), plant, hideout, ice, water, fire, desert, crystal, cave (défaut), lair
 *  (fin de jeu), sky (lieux légendaires). */
const AUDIO_PLACE_THEME = Object.freeze({
  // lieux hantés et tours
  pokemontower: 'haunted',
  burnedtower: 'tower',
  pokemonmansion: 'tower',
  mt_pyre: 'tower',
  abandoned_ship: 'tower',
  // sanctuaires, ruines, chambres scellées
  sprouttower: 'shrine',
  tintower: 'shrine',
  ruinsofalph: 'shrine',
  sealed_chamber: 'shrine',
  ancient_tomb: 'shrine',
  // forêts, parcs et safaris
  viridianforest: 'forest',
  ilexforest: 'forest',
  petalburg_woods: 'forest',
  safarizone: 'park',
  safari_zone_ho: 'park',
  nationalpark: 'park',
  // installations (centrale, labos) et planques
  powerplant: 'plant',
  weather_institute: 'plant',
  mossdeep_space_center: 'plant',
  aqua_hideout: 'hideout',
  // glace
  icepath: 'ice',
  seafoamislands: 'ice',
  shoal_cave: 'ice',
  island_cave: 'ice',
  // eau souterraine, puits, chutes
  whirlislands: 'water',
  tohjofalls: 'water',
  slowpokewell: 'water',
  seafloor_cavern: 'water',
  // feu et volcan
  mt_chimney: 'fire',
  fiery_path: 'fire',
  // désert
  desert_ruins: 'desert',
  // grottes de cristal et de météores
  granite_cave: 'crystal',
  meteor_falls: 'crystal',
  // grottes ordinaires (piste `dungeon` par défaut)
  mtmoon: 'cave',
  rocktunnel: 'cave',
  diglettscave: 'cave',
  diglettscave_2: 'cave',
  mtmortar: 'cave',
  darkcave: 'cave',
  unioncave: 'cave',
  rusturf_tunnel: 'cave',
  jroute44: 'cave',
  // repaires de fin de jeu
  ceruleancave: 'lair',
  victoryroad: 'lair',
  victoryroad_jo: 'lair',
  victoryroad_ho: 'lair',
  mtsilver: 'lair',
  hoenn_league: 'lair',
  // lieux légendaires
  sky_pillar: 'sky',
  cave_of_origin: 'sky',
  birth_island: 'sky',
  southern_island: 'sky',
  mirage_island: 'sky',
});
/** V7-R3c · SND-06 / V7-R3d · SND-07 — ambiance d'une ville sans piste dédiée (`town_<thème>`) :
 *  villes natales, grandes villes, villes côtières, bourgs de marché, petits villages,
 *  villes de montagne ; les autres suivent la région. */
const AUDIO_TOWN_THEME = Object.freeze({
  pallet: 'home',
  newbark: 'home',
  littleroot: 'home',
  saffron: 'city',
  celadon: 'city',
  goldenrod: 'city',
  mauville: 'city',
  slateport: 'city',
  lilycove: 'city',
  battle_frontier: 'city',
  vermilion: 'coast',
  cinnabar: 'coast',
  billshouse: 'coast',
  olivine: 'coast',
  cianwood: 'coast',
  dewford: 'coast',
  mossdeep: 'coast',
  sootopolis: 'coast',
  pacifidlog: 'coast',
  evergrande: 'coast',
  viridian: 'market',
  pewter: 'market',
  cerulean: 'market',
  fuchsia: 'market',
  violet: 'market',
  azalea: 'market',
  petalburg: 'market',
  rustboro: 'market',
  cherrygrove: 'new',
  oldale: 'new',
  verdanturf: 'new',
  fortree: 'new',
  blackthorn: 'mountain',
  mahogany: 'mountain',
  indigo: 'mountain',
  indigo_jo: 'mountain',
  lavaridge: 'mountain',
  fallarbor: 'mountain',
});
/** V7-R3d · SND-07 — routes à ambiance propre (`route_<thème>` puis `dungeon_<thème>`). */
const AUDIO_ROUTE_THEME = Object.freeze({
  route111: 'desert',
  route112: 'fire',
  route113: 'ice',
  route119: 'park',
  route120: 'park',
  route23: 'lair',
});
/** Une route sur deux (selon son identifiant) joue la seconde piste de région
 *  (`map_<r>_b` puis `map_b`) pour ne pas entendre toujours le même thème. */
function _audioRouteAlt(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) | 0;
  return h % 2 === 1;
}
/** Nuit (21 h – 6 h, ou phase forcée par le debug) : routes sur `map_night`. */
function _audioIsNight() {
  try {
    const f = globalThis.currentDaytimePhase;
    if (typeof f === 'function') return f() === 'night';
    if (typeof document !== 'undefined' && document.documentElement)
      return document.documentElement.getAttribute('data-daytime') === 'night';
  } catch (_) {}
  return false;
}

/** Contexte musical courant déduit de l'état global (pure vis-à-vis de l'audio).
 *  V7-R3 · SND-04 — contexte COMPOSÉ (`map:<région>:<lieu>`, `battle:gym:<champion>`,
 *  `dungeon:<lieu>`…) : le moteur descend la chaîne de repli jusqu'à une piste
 *  présente (cf. audioMusicChain), ce qui permet au joueur de déposer une
 *  musique par lieu / par champion sans toucher au code. */
function audioCurrentContext() {
  if (globalThis.PW_FF) return null; // rattrapage hors-ligne : on ne change rien
  if (globalThis.PokeWorldGameStarted !== true) return 'menu';
  const g = globalThis.G;
  const regF = _fn('regionOfLoc');
  let region = (g && g.region) || 'kanto';
  try {
    if (regF && g && g.location) region = regF(g.location) || region;
  } catch (_) {}
  if (region === 'atoll') region = 'hoenn';
  const b = globalThis.battle;
  if (b && b.active) {
    const e = b.enemyPoke || {};
    if (b.isLeague) return 'battle:league';
    if (b.legendaryQuest) return 'battle:legendary';
    if (e._isRoaming) return 'battle:roaming';
    if (e.isDungeonBoss) return 'battle:boss';
    if (b.isChamp) return 'battle:gym' + (b.champId ? ':' + b.champId : '');
    if (
      b.isTraining ||
      b.isAtollBattle ||
      b.isBaseNpcBattle ||
      b.isQuestTrainerBattle ||
      b.isQuestDefeatBattle
    )
      return 'battle:trainer';
    // V7-R3d · SND-07 — thème de combat sauvage propre à la région.
    return 'battle:wild:' + region;
  }
  const runF = _fn('currentDungeonRun');
  const run = runF ? runF() : null;
  if (run && run.active) {
    if (!run.loc) return 'dungeon';
    const theme = AUDIO_PLACE_THEME[run.loc];
    return 'dungeon:' + run.loc + (theme ? ':' + theme : '');
  }
  if (!g || !g.location) return 'map:' + region;
  const locF = _fn('getLocObj');
  let loc = null;
  try {
    loc = locF ? locF(g.location) : null;
  } catch (_) {}
  // V7-R3b · SND-05 / V7-R3c · SND-06 / V7-R3d · SND-07 — lieux à ambiance (grottes,
  // tours, forêts… même hors expédition), villes (thème puis région), chenaux (`sea`),
  // routes à thème (désert, volcan…), nuit, puis alternance de deux pistes de région.
  const base = 'map:' + region + ':' + g.location;
  const type = loc ? loc.type : '';
  const place = AUDIO_PLACE_THEME[g.location];
  if (place || type === 'dungeon') return base + ':place' + (place ? ':' + place : '');
  if (type === 'town') {
    const theme = AUDIO_TOWN_THEME[g.location];
    return base + ':town' + (theme ? ':' + theme : '');
  }
  if (type === 'sea') return base + ':sea';
  const routeTheme = AUDIO_ROUTE_THEME[g.location];
  if (routeTheme) return base + ':route:' + routeTheme;
  if (_audioIsNight()) return base + ':night';
  if (_audioRouteAlt(g.location)) return base + ':alt';
  return base;
}

/** V7-R3 · SND-04 — cri officiel du Pokémon d'un événement (dex de l'espèce). */
function _cryOf(payload, opts) {
  const cry = _fn('audioPlayCry');
  if (!cry || globalThis.PW_FF || !payload) return false;
  const p = payload.poke || payload.enemy || payload;
  const dex = p && (p.dex != null ? p.dex : p.id != null ? p.id : p.species);
  if (dex == null) return false;
  return cry(dex, opts);
}
const AUDIO_EVENT_CRY = Object.freeze({
  'battle:enemy': (p) => _cryOf(p, { gain: 0.9 }),
  'combat:enemy-fainted': (p) => _cryOf(p, { gain: 0.8, rate: 0.75 }),
  'combat:player-fainted': (p) => _cryOf(p, { gain: 0.8, rate: 0.75 }),
  'combat:player-sent': (p) => _cryOf(p, { gain: 0.8 }),
  'ui:poke-detail': (p) => _cryOf(p, { gain: 0.8 }),
});

/** Applique le contexte courant à la musique (sans effet si inchangé). */
function audioRefreshContext() {
  const ctx = audioCurrentContext();
  if (ctx === null) return null;
  const set = _fn('audioSetMusicContext');
  if (set) set(ctx);
  return ctx;
}

function _onEvent(name, payload) {
  const pick = AUDIO_EVENT_SFX[name];
  const play = _fn('audioPlaySfx');
  if (pick && play && !globalThis.PW_FF) {
    const sfx = pick(payload);
    if (sfx) play(sfx);
  }
  const cry = AUDIO_EVENT_CRY[name];
  if (cry) cry(payload); // après l'effet (brillant / errant), jamais sous PW_FF
  if (AUDIO_REFRESH_EVENTS.includes(name)) audioRefreshContext();
}

/** Abonne les effets au bus et démarre l'horloge de contexte. Idempotent. */
function audioBindGameEvents() {
  if (_audioBound) return false;
  const bus = globalThis.EventBus;
  if (!bus || typeof bus.on !== 'function') return false;
  _audioBound = true;
  for (const name of Object.keys(AUDIO_EVENT_SFX)) bus.on(name, (p) => _onEvent(name, p));
  for (const name of Object.keys(AUDIO_EVENT_CRY))
    if (!AUDIO_EVENT_SFX[name]) bus.on(name, (p) => _onEvent(name, p));
  for (const name of AUDIO_REFRESH_EVENTS)
    if (!AUDIO_EVENT_SFX[name] && !AUDIO_EVENT_CRY[name]) bus.on(name, (p) => _onEvent(name, p));
  if (typeof document !== 'undefined') {
    // Clic sur un bouton : effet générique (capture, sans dépendre de chaque vue).
    document.addEventListener(
      'click',
      (ev) => {
        const t = ev.target;
        if (!t || typeof t.closest !== 'function' || globalThis.PW_FF) return;
        if (!t.closest('button, .hbtn, .poke-card, .pw-shop-item, .map-loc')) return;
        const play = _fn('audioPlaySfx');
        if (play) play('click');
      },
      true
    );
  }
  if (!_audioPoll) {
    _audioPoll = globalThis.setInterval(audioRefreshContext, AUDIO_POLL_MS);
    if (_audioPoll && typeof _audioPoll.unref === 'function') _audioPoll.unref();
  }
  audioRefreshContext();
  return true;
}

const _audioBindingsGlobals = {
  AUDIO_EVENT_SFX,
  AUDIO_EVENT_CRY,
  AUDIO_POLL_MS,
  AUDIO_PLACE_THEME,
  AUDIO_TOWN_THEME,
  AUDIO_ROUTE_THEME,
  audioCurrentContext,
  audioRefreshContext,
  audioBindGameEvents,
};
if (typeof window !== 'undefined') Object.assign(window, _audioBindingsGlobals);
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _audioBindingsGlobals);
// Le bus classique (window.EventBus) est installé par le pont APRÈS l'évaluation
// des modules : on réessaie brièvement jusqu'à sa présence (≤ 20 s), puis on
// abandonne en silence (harnais sans pont).
if (!audioBindGameEvents() && typeof window !== 'undefined') {
  let tries = 0;
  const retry = globalThis.setInterval(() => {
    if (audioBindGameEvents() || ++tries > 100) globalThis.clearInterval(retry);
  }, 200);
  if (retry && typeof retry.unref === 'function') retry.unref();
}

export {
  AUDIO_EVENT_SFX,
  AUDIO_EVENT_CRY,
  AUDIO_POLL_MS,
  AUDIO_PLACE_THEME,
  AUDIO_TOWN_THEME,
  AUDIO_ROUTE_THEME,
  audioCurrentContext,
  audioRefreshContext,
  audioBindGameEvents,
};
