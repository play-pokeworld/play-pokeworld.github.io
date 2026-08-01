// ═══════════════════════════════════════════════════════════════════════════
// ATOLL DE COMBAT — Moteur de rotation (passe 22, étape 6 du grand projet)
// ═══════════════════════════════════════════════════════════════════════════
// Règles validées avec l'utilisateur :
//  • Rotation toutes les 12 h (fenêtre UTC partagée avec les roamers), avec
//    minuteur affiché dans le menu Atoll ET sur les routes des roamers.
//  • 6 équipes par mode et par rang, en cycle de 3 jours (6 × 12 h), chaque
//    équipe tirée d'une GRAINER DÉTERMINISTE DATÉE (même date → même équipe
//    pour tous les joueurs). Cycle : fenêtre w → équipe n°(w % 6).
//  • Chaque mode a sa description affichée EN HAUT de sa page (couche UI).
//  • Mode « équipe prêtée » (Usine) : 6 équipes prêtées en rotation ; chaque
//    VICTOIRE impose de réorganiser l'ordre des Pokémon ET de leurs attaques
//    (mélange déterministe garanti non trivial), soin complet inclus.
//  • Les légendaires ne sont JAMAIS bannis de tous les modes à la fois : la
//    Tour Libre n'a jamais de ban ; Tour S / Finale Dôme bannissent un
//    sous-ensemble tournant (joueur ET adversaire). C'est LE vrai défi.
// Dépendances : ATOLL_SETS / ATOLL_STAT_PROFILES / ATOLL_LEGENDARIES
// (src/data/atoll-sets-data.js), MOVES, PD, ITEMS, createPoke, recalcPokeStats,
// getSpeciesFullLearnablePool, getSpeciesTalents, t/tr (i18n).
// ─────────────────────────────────────────────────────────────────────────────

// ——— Rotation 12 h (fenêtre UTC, graine datée) ———
const ATOLL_ROTATION_MS = 12 * 3600 * 1000;
const ATOLL_TEAMS_PER_CYCLE = 6; // 6 × 12 h = cycle de 3 jours

function getRotationWindow(nowOpt) {
 const now = (typeof nowOpt === 'number' && isFinite(nowOpt)) ? nowOpt : Date.now();
 return Math.floor(now / ATOLL_ROTATION_MS);
}
function getRotationTimeLeftMs(nowOpt) {
 const now = (typeof nowOpt === 'number' && isFinite(nowOpt)) ? nowOpt : Date.now();
 return (getRotationWindow(now) + 1) * ATOLL_ROTATION_MS - now;
}
function formatRotationCountdown(ms) {
 ms = Math.max(0, Number(ms) || 0);
 const s = Math.floor(ms / 1000);
 const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
 const p2 = (n) => String(n).padStart(2, '0');
 return `${p2(h)}:${p2(m)}:${p2(ss)}`;
}
function getAtollCycleInfo(windowOpt) {
 const w = (typeof windowOpt === 'number' && isFinite(windowOpt)) ? (windowOpt | 0) : getRotationWindow();
 const idx = ((w % ATOLL_TEAMS_PER_CYCLE) + ATOLL_TEAMS_PER_CYCLE) % ATOLL_TEAMS_PER_CYCLE;
 return { window: w, team: idx + 1, teamCount: ATOLL_TEAMS_PER_CYCLE, day: Math.floor(idx / 2) + 1, dayCount: 3 };
}

// ——— Graine déterministe (FNV-1a → mulberry32) ———
function atollHashSeed() {
 let h = 0x811c9dc5;
 const s = Array.prototype.join.call(arguments, '|');
 for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
 return h >>> 0;
}
function atollRng(seed) {
 let a = (seed >>> 0) || 0x9e3779b9;
 return function () {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}
function atollShuffle(arr, rng) {
 for (let i = arr.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
 }
 return arr;
}

// ——— Modes (données déplacées depuis fullscreen-panel.js, valeurs inchangées) ———
const ATOLL_RANK_SEQUENCE = ['E', 'D', 'C', 'B', 'A', 'S'];
const ATOLL_MODES = {
 tower_e:      { key: 'tower_e',      group: 'tower',   maxRank: 'E', reward: 8,  level: 100, size: 4, label: 'atoll_tower_e',      pool: [10,11,13,14,129,191] },
 tower_d:      { key: 'tower_d',      group: 'tower',   maxRank: 'D', reward: 12, level: 100, size: 4, label: 'atoll_tower_d',      pool: [10,11,13,14,16,19,21,23,41,43,50,54,60,72,74,81,86,90,96,100,102,104,109,116,118,129,161,163,165,167,172,173,174,175,187,191,194,220,236,238,239,240,246] },
 tower_c:      { key: 'tower_c',      group: 'tower',   maxRank: 'C', reward: 18, level: 100, size: 5, label: 'atoll_tower_c',      pool: [18,26,45,57,62,71,73,85,89,97,99,105,117,119,162,164,168,171,195,210,224,237] },
 tower_b:      { key: 'tower_b',      group: 'tower',   maxRank: 'B', reward: 26, level: 100, size: 6, label: 'atoll_tower_b',      pool: [18,26,45,57,62,65,73,85,89,94,97,99,105,112,117,119,121,123,130,137,162,164,168,171,195,196,197,199,205,208,210,224,237] },
 tower_a:      { key: 'tower_a',      group: 'tower',   maxRank: 'A', reward: 38, level: 100, size: 6, label: 'atoll_tower_a',      pool: [65,94,112,115,121,123,127,130,131,143,181,184,196,197,199,205,208,212,214,217,229,230,242] },
 tower_s:      { key: 'tower_s',      group: 'tower',   maxRank: 'S', reward: 55, level: 100, size: 6, label: 'atoll_tower_s',      pool: [59,65,94,103,112,130,131,143,149,150,151,181,197,208,212,229,230,242,243,244,245,248,249,250,251] },
 tower_free:   { key: 'tower_free',   group: 'tower',              reward: 70, level: 100, size: 6, label: 'atoll_tower_free',   pool: [59,65,94,103,112,130,131,143,149,150,151,181,197,208,212,229,230,242,243,244,245,248,249,250,251] },
 factory_c:    { key: 'factory_c',    group: 'factory', maxRank: 'C', reward: 22, level: 100, size: 4, borrowed: true, label: 'atoll_factory_c',  pool: [83,97,122,124,127,132,137,143,185,196,197,199,214,217] },
 factory_a:    { key: 'factory_a',    group: 'factory', maxRank: 'A', reward: 42, level: 100, size: 5, borrowed: true, label: 'atoll_factory_a',  pool: [65,94,115,121,123,127,130,131,143,181,184,197,199,205,208,212,214,217,229] },
 arena_three:  { key: 'arena_three',  group: 'arena',   maxRank: 'B', reward: 24, statScale: 0.5, level: 100, size: 3, playerCap: 3, label: 'atoll_arena_three',   pool: [26,45,62,65,73,94,121,123,130,181,184,197,205] },
 arena_no_item:{ key: 'arena_no_item',group: 'arena',   maxRank: 'A', reward: 30, statScale: 0.5, level: 100, size: 3, playerCap: 3, noItems: true, label: 'atoll_arena_no_item', pool: [59,65,89,94,112,121,130,181,197,208,229] },
 arena_type:   { key: 'arena_type',   group: 'arena',   maxRank: 'A', reward: 34, statScale: 0.5, level: 100, size: 3, playerCap: 3, label: 'atoll_arena_type',    pool: [71,73,94,95,121,123,130,181,197,205,208,212,229] },
 dome_quarter: { key: 'dome_quarter', group: 'dome',    maxRank: 'A', reward: 42, level: 100, size: 6, label: 'atoll_dome_quarter', pool: [18,59,65,94,112,121,130,131,181,197,205,208,212,229] },
 dome_final:   { key: 'dome_final',   group: 'dome',    maxRank: 'S', reward: 85, level: 100, size: 6, label: 'atoll_dome_final',   pool: [59,65,94,103,112,130,131,143,149,150,181,197,208,212,229,230,242,243,244,245,248,249,250] }
};

// ——— Bans tournants de légendaires ———
// Nombre de légendaires bannis par rotation, par mode. tower_free n'a JAMAIS
// de ban (refuge garanti) → aucun légendaire n'est jamais banni partout.
const ATOLL_BAN_RULES = { tower_s: 4, dome_final: 3 };
function getAtollBannedLegendaries(modeKey, windowOpt) {
 const count = ATOLL_BAN_RULES[modeKey] || 0;
 if (!count) return [];
 const w = (typeof windowOpt === 'number' && isFinite(windowOpt)) ? (windowOpt | 0) : getRotationWindow();
 const rng = atollRng(atollHashSeed('atoll-ban', modeKey, w));
 return atollShuffle((ATOLL_LEGENDARIES || []).slice(), rng).slice(0, count).sort((a, b) => a - b);
}

// ——— Sélection d'espèces (6 équipes tournantes, graine datée) ———
function getAtollSpeciesList(modeKey, windowOpt, kind) {
 const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c;
 const w = (typeof windowOpt === 'number' && isFinite(windowOpt)) ? (windowOpt | 0) : getRotationWindow();
 const kindKey = kind === 'rental' ? 'rental' : 'enemy';
 const banned = kindKey === 'enemy' ? getAtollBannedLegendaries(modeKey, w) : [];
 const src = (mode.pool || []).filter((id) => !banned.includes(id));
 const rng = atollRng(atollHashSeed('atoll-team', kindKey, modeKey, w));
 return atollShuffle(src.slice(), rng).slice(0, Math.min(mode.size, src.length));
}
// Les 6 équipes du cycle courant (indices 0-5), base = début du cycle de 3 jours.
function getAtollRotationTeams(modeKey, windowOpt, kind) {
 const w = (typeof windowOpt === 'number' && isFinite(windowOpt)) ? (windowOpt | 0) : getRotationWindow();
 const base = w - (((w % ATOLL_TEAMS_PER_CYCLE) + ATOLL_TEAMS_PER_CYCLE) % ATOLL_TEAMS_PER_CYCLE);
 const out = [];
 for (let i = 0; i < ATOLL_TEAMS_PER_CYCLE; i++) out.push(getAtollSpeciesList(modeKey, base + i, kind));
 return out;
}

// ——— Construction des Pokémon (sets curated ATOLL_SETS + repli légal) ———
function buildFallbackSetSpec(id, rng) {
 // Repli déterministe pour les espèces des rangs E/D sans set curated :
 // attaques légales (pool naturel ∪ CT), talent du pool réel, pas d'objet.
 const legal = (typeof getSpeciesFullLearnablePool === 'function' ? getSpeciesFullLearnablePool(id) : []).filter((m) => typeof MOVES !== 'undefined' && MOVES[m]);
 const damage = legal.filter((m) => ((MOVES[m] && MOVES[m].power) || 0) >= 60);
 const backup = legal.filter((m) => ((MOVES[m] && MOVES[m].power) || 0) > 0);
 const status = legal.filter((m) => !((MOVES[m] && MOVES[m].power) > 0));
 const useDmg = atollShuffle((damage.length >= 3 ? damage : backup).slice(), rng);
 const moves = useDmg.slice(0, 3);
 if (status.length && rng() < 0.5) moves.push(atollShuffle(status.slice(), rng)[0]);
 else if (useDmg.length > 3) moves.push(useDmg[3]);
 while (moves.length < 4 && moves.length < legal.length) {
  const extra = legal[Math.floor(rng() * legal.length)];
  if (!moves.includes(extra)) moves.push(extra);
 }
 const talents = (typeof getSpeciesTalents === 'function' ? (getSpeciesTalents(id) || []) : []).map((x) => (x && x.id) || x);
 const talent = talents.length ? talents[Math.floor(rng() * talents.length)] : null;
 const pd = (typeof PD !== 'undefined') ? PD[id] : null;
 const prof = pd && (pd[4] || 0) >= (pd[6] || 0) ? 'phys' : 'spec'; // PD[4]=atk, PD[6]=spa
 return { t: talent, i: 0, m: moves.slice(0, 4), prof };
}
function getAtollSetSpec(id, rng) {
 const cur = (typeof ATOLL_SETS !== 'undefined') ? ATOLL_SETS[id] : null;
 if (cur) return { t: cur[0], i: cur[1] || 0, m: (cur[2] || []).slice(0, 4), prof: cur[3] || 'phys' };
 return buildFallbackSetSpec(id, rng || atollRng(atollHashSeed('atoll-set', id)));
}
function buildAtollPoke(id, level, seedParts, statScale) {
 if (typeof createPoke !== 'function') return null;
 const p = createPoke(id, level || 100, false);
 if (!p) return null;
 const rng = atollRng(atollHashSeed.apply(null, ['atoll-poke', id].concat(seedParts || [])));
 const spec = getAtollSetSpec(id, rng);
 const legalMoves = (spec.m || []).filter((m) => typeof MOVES !== 'undefined' && MOVES[m]).slice(0, 4);
 if (legalMoves.length) p.moves = legalMoves.map((m) => ({ id: m }));
 if (spec.t) p.talent = spec.t;
 if (spec.i && typeof ITEMS !== 'undefined' && ITEMS[spec.i]) p.heldItem = spec.i;
 const prof = (typeof ATOLL_STAT_PROFILES !== 'undefined' && ATOLL_STAT_PROFILES[spec.prof]) || { evs: { atk: 10, spe: 8 }, ivs: { hp: 4, def: 4, spd: 4, spe: 6 } };
 // statScale (passe 23 — équilibrage par mode) : l'Arène 3v3 utilise des
 // budgets réduits (×0.5 → 18/18, niveau campagne) ; Tour/Dôme restent à 36/36.
 const sc = (typeof statScale === 'number' && statScale > 0 && statScale !== 1) ? statScale : 1;
 const scaleMap = (m) => { const o = {}; for (const k of Object.keys(m || {})) o[k] = Math.round((m[k] || 0) * sc); return o; };
 p.evs = Object.assign({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, sc !== 1 ? scaleMap(prof.evs) : prof.evs);
 p.ivs = Object.assign({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, sc !== 1 ? scaleMap(prof.ivs) : prof.ivs);
 p.name = (typeof getPokeName === 'function' ? getPokeName(id) : p.name);
 try { if (typeof recalcPokeStats === 'function') { recalcPokeStats(p); p.currentHP = p.maxHP; } } catch (_) {}
 return p;
}
function buildAtollTeam(modeKey, windowOpt, kind) {
 const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c;
 const w = (typeof windowOpt === 'number' && isFinite(windowOpt)) ? (windowOpt | 0) : getRotationWindow();
 const kindKey = kind === 'rental' ? 'rental' : 'enemy';
 const ids = getAtollSpeciesList(modeKey, w, kindKey);
 return ids.map((id, i) => buildAtollPoke(id, mode.level, [kindKey, modeKey, w, i], mode.statScale || 1)).filter(Boolean);
}

// ——— Usine Combat : série d'équipe prêtée ———
function getAtollFactoryRun() {
 const st = (typeof ensureAtollState === 'function') ? ensureAtollState() : (typeof G !== 'undefined' ? (G || {}).atoll : null);
 return (st && st.factoryRun) || null;
}
function createAtollFactoryRun(modeKey, windowOpt) {
 const st = (typeof ensureAtollState === 'function') ? ensureAtollState() : null;
 const w = (typeof windowOpt === 'number' && isFinite(windowOpt)) ? (windowOpt | 0) : getRotationWindow();
 const team = buildAtollTeam(modeKey, w, 'rental');
 const run = { modeKey, seedWindow: w, streak: 0, team };
 if (st) st.factoryRun = run;
 return run;
}
function abandonAtollFactoryRun() {
 const st = (typeof ensureAtollState === 'function') ? ensureAtollState() : null;
 if (st && st.factoryRun) delete st.factoryRun;
}
// Fenêtre de l'équipe adverse au « palier » courant de la série : la série
// grimpe LA table de rotation (équipe (w+streak) % 6) → toujours des styles
// différents, jamais deux fois la même équipe dans un cycle.
function getAtollFactoryOpponentWindow(run, windowOpt) {
 const w = (typeof windowOpt === 'number' && isFinite(windowOpt)) ? (windowOpt | 0) : getRotationWindow();
 const streak = (run && run.streak) || 0;
 return w + streak;
}
// Réorganisation forcée après victoire : soin complet + mélange déterministe
// (graine = fenêtre de départ de la série × série) de l'ordre des Pokémon ET
// de l'ordre des attaques de chacun — changement visible GARANTI.
function reorganizeAtollFactoryTeam(team, seedWindow, streak) {
 const out = (team || []).filter(Boolean).map((p) => {
  try { if (typeof recalcPokeStats === 'function') { recalcPokeStats(p); } } catch (_) {}
  p.currentHP = p.maxHP; p.status = null;
  return p;
 });
 if (out.length < 2 && !(out[0] && out[0].moves && out[0].moves.length > 1)) return out;
 const rng = atollRng(atollHashSeed('atoll-reorg', seedWindow, streak));
 atollShuffle(out, rng);
 if (out.length > 1 && out.every((p, i) => p === team[i])) out.push(out.shift()); // anti-identité
 out.forEach((p) => {
  if (!p || !Array.isArray(p.moves) || p.moves.length < 2) return;
  const before = p.moves.map((m) => m.id).join(',');
  atollShuffle(p.moves, rng);
  if (p.moves.map((m) => m.id).join(',') === before) p.moves.push(p.moves.shift());
 });
 return out;
}
function applyAtollFactoryVictory(rentalTeam) {
 const run = getAtollFactoryRun();
 if (!run) return null;
 run.streak = (run.streak || 0) + 1;
 run.team = reorganizeAtollFactoryTeam(rentalTeam, run.seedWindow, run.streak);
 return run;
}
// Prime de jetons Usine : +25 % par palier de série (arrondi), sans impact ₽.
function computeAtollFactoryReward(base, streakBefore) {
 return Math.max(1, Math.round((Number(base) || 0) * (1 + 0.25 * Math.max(0, streakBefore || 0))));
}

// ——— État Atoll (centralisé ici, utilisé par le panneau UI) ———
function ensureAtollState() {
 if (typeof G === 'undefined' || !G) return { tokens: 0, streak: 0, bestStreak: 0, winsByMode: {} };
 if (!G.atoll || typeof G.atoll !== 'object') G.atoll = { tokens: 0, streak: 0, bestStreak: 0, winsByMode: {} };
 if (!G.atoll.winsByMode) G.atoll.winsByMode = {};
 if (typeof G.atoll.tokens !== 'number') G.atoll.tokens = 0;
 if (typeof G.atoll.streak !== 'number') G.atoll.streak = 0;
 if (typeof G.atoll.bestStreak !== 'number') G.atoll.bestStreak = 0;
 return G.atoll;
}

// ——— Minuteur affiché (menu Atoll + routes roamers) ———
// Les éléments <span data-rotation-timer="atoll|roam"> sont rafraîchis 1×/s.
let _atollTickerFallback = null;
function _rotationTickerTick() {
 if (typeof document === 'undefined' || !document.querySelectorAll) return;
 const els = document.querySelectorAll('[data-rotation-timer]');
 if (!els || !els.length) return;
 const time = formatRotationCountdown(getRotationTimeLeftMs());
 for (const el of els) {
  const kind = el.getAttribute('data-rotation-timer');
  const key = kind === 'roam' ? 'roaming_rotation_timer' : kind === 'mirage' ? 'mirage_rotation_timer' : 'atoll_rotation_timer';
  el.textContent = (typeof tr === 'function') ? tr(key, { time }) : time;
 }
}
function startRotationTicker() {
 if (typeof appTimer === 'function') { appTimer('rotationTicker', _rotationTickerTick, 1000); return; } // registre nommé : idempotent
 if (_atollTickerFallback) return;
 if (typeof setInterval === 'function') _atollTickerFallback = setInterval(_rotationTickerTick, 1000);
}

// --- Globals exposés ---
if (typeof window !== 'undefined') {
 window.ATOLL_ROTATION_MS = ATOLL_ROTATION_MS;
 window.ATOLL_TEAMS_PER_CYCLE = ATOLL_TEAMS_PER_CYCLE;
 window.ATOLL_RANK_SEQUENCE = ATOLL_RANK_SEQUENCE;
 window.ATOLL_MODES = ATOLL_MODES;
 window.ATOLL_BAN_RULES = ATOLL_BAN_RULES;
 window.getRotationWindow = getRotationWindow;
 window.getRotationTimeLeftMs = getRotationTimeLeftMs;
 window.formatRotationCountdown = formatRotationCountdown;
 window.getAtollCycleInfo = getAtollCycleInfo;
 window.atollHashSeed = atollHashSeed;
 window.atollRng = atollRng;
 window.atollShuffle = atollShuffle;
 window.getAtollBannedLegendaries = getAtollBannedLegendaries;
 window.getAtollSpeciesList = getAtollSpeciesList;
 window.getAtollRotationTeams = getAtollRotationTeams;
 window.buildFallbackSetSpec = buildFallbackSetSpec;
 window.getAtollSetSpec = getAtollSetSpec;
 window.buildAtollPoke = buildAtollPoke;
 window.buildAtollTeam = buildAtollTeam;
 window.getAtollFactoryRun = getAtollFactoryRun;
 window.createAtollFactoryRun = createAtollFactoryRun;
 window.abandonAtollFactoryRun = abandonAtollFactoryRun;
 window.getAtollFactoryOpponentWindow = getAtollFactoryOpponentWindow;
 window.reorganizeAtollFactoryTeam = reorganizeAtollFactoryTeam;
 window.applyAtollFactoryVictory = applyAtollFactoryVictory;
 window.computeAtollFactoryReward = computeAtollFactoryReward;
 window.ensureAtollState = ensureAtollState;
 window.startRotationTicker = startRotationTicker;
}

