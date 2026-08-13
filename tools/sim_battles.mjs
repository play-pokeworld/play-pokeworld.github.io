#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Step 7 — Balance simulations ("beatable at the expected level")
// ═══════════════════════════════════════════════════════════════════════════
// HEADLESS simulator reusing the REAL battle engine of the game (battle-tick,
// battle-attack, battle-status, battle-init) in a vm sandbox:
//  • Opponent AI = the game's (move round-robin — 100% faithful);
//  • Player AI = "reasonable player" heuristic (best expected move each
//    action, switch to first alive);
//  • randomness (accuracy, crit, 85-100% variance) seeded by matchup ->
//    taux de victoire reproductibles.
// Player profiles:
//  • 'casual'  : plausible species of accessible zones (badgeReq ≤ badges),
//                level = opponent aces, natural moves for the level, 0 IV/EV;
//  • 'trained' : 6 Pokemon, legal optimal moves (natural ∪ TM), focused
//                EV/IV (≤ 18 each, project rule), type_boost item.
// Usage : node tools/sim_battles.mjs [--runs 200] [--group all|gyms|story|league|atoll]
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ecsGameplayBundleSource } from './ecs-loop-bundle.mjs';
import { harnessIsEsm, harnessBundleSource } from './harness-bundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const ARGS = process.argv.slice(2);
const argVal = (name, dflt) => { const i = ARGS.indexOf(`--${name}`); return i >= 0 ? ARGS[i + 1] : dflt; };
const RUNS = Number(argVal('runs', 200));
const GROUP = String(argVal('group', 'all'));
const STORY_PROFILE = String(argVal('story-profile', 'casual')); // casual | trained
const VERBOSE = ARGS.includes('--verbose');

// ── PRNG déterministe (idem atoll-core) ─────────────────────────────────────
function hashSeed() {
  let h = 0x811c9dc5;
  const s = Array.prototype.join.call(arguments, '|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Bac à sable moteur ───────────────────────────────────────────────────────
const TYPES = ['Normal','Fire','Water','Grass','Electric','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
const TYPE_CHART = { Normal:{Rock:.5,Steel:.5,Ghost:0}, Fire:{Fire:.5,Water:.5,Rock:.5,Dragon:.5,Grass:2,Ice:2,Bug:2,Steel:2}, Water:{Water:.5,Grass:.5,Dragon:.5,Fire:2,Ground:2,Rock:2}, Grass:{Fire:.5,Grass:.5,Poison:.5,Flying:.5,Bug:.5,Dragon:.5,Steel:.5,Water:2,Ground:2,Rock:2}, Electric:{Grass:.5,Electric:.5,Dragon:.5,Ground:0,Water:2,Flying:2}, Ice:{Water:.5,Ice:.5,Fire:2,Fighting:2,Rock:2,Steel:2,Grass:2,Ground:2,Flying:2,Dragon:2}, Fighting:{Poison:.5,Bug:.5,Psychic:.5,Flying:.5,Fairy:.5,Ghost:0,Normal:2,Ice:2,Rock:2,Dark:2,Steel:2}, Poison:{Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Grass:2,Fairy:2}, Ground:{Grass:.5,Bug:.5,Flying:0,Fire:2,Electric:2,Poison:2,Rock:2,Steel:2}, Flying:{Electric:.5,Rock:.5,Steel:.5,Grass:2,Fighting:2,Bug:2}, Psychic:{Psychic:.5,Steel:.5,Dark:0,Fighting:2,Poison:2}, Bug:{Fire:.5,Fighting:.5,Flying:.5,Ghost:.5,Steel:.5,Fairy:.5,Grass:2,Psychic:2,Dark:2}, Rock:{Fighting:.5,Ground:.5,Steel:.5,Fire:2,Ice:2,Flying:2,Bug:2}, Ghost:{Normal:0,Fighting:0,Ghost:2,Psychic:2}, Dragon:{Steel:.5,Fairy:0,Dragon:2}, Dark:{Fighting:.5,Dark:.5,Fairy:.5,Psychic:2,Ghost:2}, Steel:{Fire:.5,Water:.5,Electric:.5,Steel:.5,Ice:2,Rock:2,Fairy:2}, Fairy:{Fire:.5,Poison:.5,Steel:.5,Fighting:2,Dragon:2,Dark:2} };
function normType(t) { if (!t) return null; const s = String(t).toLowerCase(); return TYPES.find((n) => n.toLowerCase() === s) || null; }
function typeEffect(atk, d1, d2) { const a = normType(atk), t1 = normType(d1), t2 = normType(d2); const f = (TYPE_CHART[a] || {})[t1] ?? 1; const s2 = t2 ? ((TYPE_CHART[a] || {})[t2] ?? 1) : 1; return f * s2; }

const ENGINE_FILES = [
  'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
  'src/data/poke-talents-data.js',
  'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
  'src/application/world/team.js', 'src/application/pokemon-factory.js',
  'src/data/champions-data.js', 'src/data/official-teams-data.js',
  'src/data/atoll-sets-data.js', 'src/application/world/atoll-core.js',
  'src/application/combat/battle-init.js', 'src/application/combat/battle-attack.js',
  'src/application/combat/battle-status.js',
  'src/application/combat/progression.js',
];

function makeEngineSandbox() {
  const sandbox = {
    console,
    t: (k) => k, tr: (k) => k,
    getPokeName: (id) => 'P' + id, getMoveName: (id) => id, getTalentName: (id) => id, getItemName: (id) => id,
    getLocName: (id) => id,
    notify: () => {}, saveGame: () => {}, setMsg: () => {},
  };
  const myG = { team: [], teamSlotItems: [], collection: {}, inventory: {}, unlockedTalents: {}, pokedex: {}, lang: 'fr', region: 'kanto', badges: [] };
  const myBattle = { log: [] };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.G = myG;
  sandbox.battle = myBattle;
  // Core + domain (type charts faithful to file-preflight.js)
  let vmMath = null; // handle on the vm realm Math object (captured after createContext)
  sandbox.PokeWorldCore = {
    storage: { get: () => null, set: () => {} },
    randomInt: (a, b) => a + Math.floor(vmMath.random() * (b - a + 1)),
    chancePercent: (p) => vmMath.random() * 100 < p,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  };
  sandbox.PokeWorldDomain = { typeSystem: { TYPES, TYPE_COLORS: {}, TYPE_CHART, typeEffect, effectivenessText: () => '' } };
  sandbox.PokeWorldState = { gameState: myG };
  sandbox.PokeWorldBattleState = { battleState: myBattle };
  // Vague 41 — stub DOM headless : les fichiers de combat étant de vrais
  // modules ESM, leurs fonctions visuelles ne sont plus patchables via le
  // global (elles vivent dans la fermeture du module). Avec getElementById/
  // querySelector → null, tous les chemins visuels terminent en early-return
  // exactement comme le monkey-patch d'avant les neutralisait.
  const __pwNullEl = () => ({
    className: '', id: '', textContent: '', value: '',
    innerHTML: '',
    style: { setProperty() {} },
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, append() {}, remove() {}, insertBefore() {}, replaceChildren() {},
  });
  sandbox.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: __pwNullEl,
    body: { appendChild() {}, append() {} },
    head: { appendChild() {}, append() {} },
  };
  vm.createContext(sandbox);
  vmMath = vm.runInContext('Math', sandbox);
  sandbox._vmMath = vmMath;
  // Vague 41 — hybride individuelle (game-state est formellement ESM : export {}).
  {
    const gsSrc = R('src/application/game-state.js');
    vm.runInContext(harnessIsEsm(gsSrc) ? harnessBundleSource(['src/application/game-state.js']) : gsSrc, sandbox, { filename: 'state.js' });
  }
  // Vague 41 — hybride individuelle (game-utils est ESM depuis la vague 41).
  {
    const utilSrc = R('src/core/game-utils.js');
    vm.runInContext(harnessIsEsm(utilSrc) ? harnessBundleSource(['src/core/game-utils.js']) : utilSrc, sandbox, { filename: 'util.js' });
  }
  // Vague 40 — boucle hybride (T2-D) : fichiers restés classiques = texte vm
  // direct (parité exacte, un runInContext par fichier comme avant) ; fichiers
  // convertis ESM (src/data/* vague 40) = bundle isolé, globales via leur shim.
  for (const f of ENGINE_FILES) {
    const src = R(f);
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([f]) : src, sandbox, {
      filename: harnessIsEsm(src) ? f + ' [iife]' : f,
    });
  }
  // The real battle loop is ECS-driven (battle-tick.js deleted): inject the
  // same production bundle the browser gets through Vite (engine ECS core +
  // gameplay systems + domain tick), which exposes battleTick/runBattleTick.
  vm.runInContext(ecsGameplayBundleSource(), sandbox, { filename: 'src/application/gameplay-bundle.js [esbuild iife]' });
  // Neutralisation headless : visuels/DOM/log → no-ops
  for (const fn of ['spawnBattleFloat','spawnBattleChip','playAttackAnim','playHitAnim','visualDamage','visualHeal',
    'visualStatus','visualTalent','visualItem','visualMoveUsed','visualStatusChanges','addBattleTimeline',
    'ensureBattleTimeline','updateBattleUI','flashMoveFiring','updateMoveBars','addBattleLog','clearBattleLog']) sandbox[fn] = () => {};
  return sandbox;
}

const sb = makeEngineSandbox();

// ── Outils de construction ───────────────────────────────────────────────────
const ACTIVE_TALENTS = ['levitate','intimidate','multiscale','filter','solidrock','ironFist','static','scrappy','magicGuard','waterAbsorb','voltAbsorb','thickFat','naturalCure','synchronize','technician','skillLink','swarm','hyperCutter','bigPecks','guts','ownTempo','insomnia','limber','poisonPoint','flameBody','effectSpore','chlorophyll','swiftSwim','rainDish','moxie','reckless','hexerei','dauntingLook','faeRush','solid','flareAbsorb','iceBody','waterVeil'];
function bestTalentFor(id) {
  const pool = (sb.getSpeciesTalents(id) || []).map((x) => (x && x.id) || x);
  for (const t of ACTIVE_TALENTS) if (pool.includes(t)) return t;
  return pool[0] || null;
}
const BOOST_BY_TYPE = { Fighting:'black_belt', Dark:'black_glasses', Fire:'charcoal', Dragon:'dragon_fang', Grass:'miracle_seed', Water:'mystic_water', Ice:'never_melt_ice', Flying:'sharp_beak', Poison:'poison_barb', Ghost:'spell_tag', Rock:'hard_stone', Electric:'magnet', Normal:'silk_scarf', Psychic:'twisted_spoon', Steel:'metal_coat' };

function topLegalMoves(id, n = 4) {
  const natural = new Set(sb.getSpeciesFullLearnablePool(id) || []);
  const ctcs = new Set(Object.keys(sb.getCtCsMoveIds(id) || {}));
  const d = sb.PD[id];
  const legal = [...new Set([...natural, ...ctcs])].filter((m) => sb.MOVES[m] && (sb.MOVES[m].power || 0) > 0);
  legal.sort((a, b) => {
    const sa = (sb.MOVES[a].power * ((d[1] === sb.MOVES[a].type || d[2] === sb.MOVES[a].type) ? 1.5 : 1));
    const sc = (sb.MOVES[b].power * ((d[1] === sb.MOVES[b].type || d[2] === sb.MOVES[b].type) ? 1.5 : 1));
    return sc - sa;
  });
  return legal.slice(0, n);
}

// Best NATURAL moves accessible at the given level (PokeChill pool,
// learning level 1 + idx·7) — models a player who learned their best
// moves via the learning menu, without TMs.
function _bestNaturalMovesAtLevel(id, level, n = 4) {
  const pool = (sb.getSpeciesMovePool(id) || []).filter((m) => sb.MOVES[m]);
  const atLevel = pool.filter((m) => (sb.getMoveLearnLevel(id, m) || 999) <= level && (sb.MOVES[m].power || 0) > 0);
  const d = sb.PD[id];
  atLevel.sort((a, b) => {
    const sa = sb.MOVES[a].power * ((d[1] === sb.MOVES[a].type || d[2] === sb.MOVES[a].type) ? 1.5 : 1);
    const sc = sb.MOVES[b].power * ((d[1] === sb.MOVES[b].type || d[2] === sb.MOVES[b].type) ? 1.5 : 1);
    return sc - sa;
  });
  const picked = atLevel.slice(0, n);
  if (picked.length < n) {
    for (const m of pool) {
      if ((sb.MOVES[m].power || 0) > 0 && !picked.includes(m)) picked.push(m);
      if (picked.length >= n) break;
    }
  }
  return picked.slice(0, n);
}

// Level-up evolution (game LEVEL_EVO_MAP/EVO_LEVELS): the prepared player
// fields the evolved form reachable at their level.
function evolvedFormAt(id, level) {
  let cur = Number(id);
  let guard = 0;
  while (sb.LEVEL_EVO_MAP && sb.LEVEL_EVO_MAP[cur] && (sb.EVO_LEVELS[cur] || 999) <= level && guard++ < 4) cur = sb.LEVEL_EVO_MAP[cur];
  return cur;
}

function buildPlayerPoke(id, level, { trained = false } = {}) {
  const finalId = evolvedFormAt(id, level);
  const p = sb.createPoke(finalId, level, false);
  if (!p) return null;
  p.talent = bestTalentFor(finalId);
  if (trained) {
    const mv = topLegalMoves(finalId, 4);
    if (mv.length) p.moves = mv.map((m) => ({ id: m }));
    const spec = (p.spa || 0) > (p.atk || 0);
    p.evs = Object.assign({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, spec ? { spa: 10, spe: 8 } : { atk: 10, spe: 8 });
    p.ivs = Object.assign({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, { hp: 4, def: 4, spd: 4, spe: 6 });
    p.heldItem = BOOST_BY_TYPE[p.type1] || 'silk_scarf';
  } else {
    // "Realistic" casual (phase 23): the player uses the game's learning
    // menu — COMPLETE legal pool (natural ∪ TM/HM) — but invests in neither
    // IV/EV nor held item. The "knows the game, unoptimized" model.
    const mv = topLegalMoves(finalId, 4);
    if (mv.length) p.moves = mv.map((m) => ({ id: m }));
  }
  sb.recalcPokeStats(p);
  p.currentHP = p.maxHP;
  return p;
}

// Capture-plausible species: wild tables of locations with badgeReq ≤ badges.
function wildSpeciesByBadges(region, badgeCount) {
  const locs = region === 'johto' ? sb.LOCS_JOHTO : sb.LOCS;
  const set = new Set();
  for (const loc of Object.values(locs || {})) {
    if ((loc.badgeReq || 0) > badgeCount) continue;
    for (const w of (loc.wild || [])) set.add(w[0]);
  }
  return [...set];
}
function badgeGuessForAce(ace) {
  if (ace <= 15) return 1;
  if (ace <= 21) return 2;
  if (ace <= 25) return 3;
  if (ace <= 32) return 4;
  if (ace <= 40) return 5;
  if (ace <= 45) return 6;
  if (ace <= 50) return 7;
  return 8;
}
function bstOf(id) { const d = sb.PD[id]; return d ? (d[3] + d[4] + d[5] + d[6] + d[7] + d[8]) : 0; }

function buildCasualTeam(region, ace, badges, size = 6, counterTypes = null) {
  const avail = wildSpeciesByBadges(region, badges !== undefined ? badges : badgeGuessForAce(ace));
  // The prepared player evolves their captures at the reached level and
  // favors species whose STAB hits the gym's weakness (type adaptation).
  const enemyTypes = counterTypes || [];
  const effBonus = (id) => {
    if (!enemyTypes.length) return 0;
    const d = sb.PD[evolvedFormAt(id, ace)];
    let best = 0;
    for (const t of [d[1], d[2]]) {
      if (!t) continue;
      for (const et of enemyTypes) best = Math.max(best, typeEffect(t, et, null));
    }
    return best >= 2 ? 300 : 0;
  };
  const evoRank = (id) => bstOf(evolvedFormAt(id, ace)) + effBonus(id);
  const ranked = avail.map((id) => [id, evoRank(id)]).filter(([, b]) => b >= 150).sort((a, b) => b[1] - a[1]);
  const mons = [];
  const seenTypes = new Set();
  for (const [id] of ranked) {
    const d = sb.PD[evolvedFormAt(id, ace)];
    if (mons.length < size && !seenTypes.has(d[1])) { mons.push(buildPlayerPoke(id, ace)); seenTypes.add(d[1]); }
    if (mons.length >= size) break;
  }
  while (mons.length < size && ranked[mons.length]) mons.push(buildPlayerPoke(ranked[mons.length][0], ace));
  return mons.filter(Boolean);
}
function buildTrainedTeam(speciesIds, level) {
  return speciesIds.map((id) => buildPlayerPoke(id, level, { trained: true })).filter(Boolean);
}

// ── Headless battle loop ────────────────────────────────────────────────
function expectedScore(p, e, mid) {
  const mv = sb.MOVES[mid];
  if (!mv) return 0;
  const pow = mv.power || 0;
  if (!pow) return 0;
  const d = sb.PD[p.id];
  const stab = (d[1] === mv.type || d[2] === mv.type) ? 1.5 : 1;
  const eff = typeEffect(mv.type, e.type1, e.type2);
  const acc = (mv.acc || 100) / 100;
  const burnHalve = (p.status === 'burn' && mv.cat === 'phys') ? 0.5 : 1;
  return pow * stab * eff * acc * burnHalve;
}
function bestMoveIndex(p, e) {
  let bi = 0, bs = -1;
  (p.moves || []).forEach((m, i) => { const s = expectedScore(p, e, m.id); if (s > bs) { bs = s; bi = i; } });
  return bi;
}

async function simulateBattle(playerTeam, enemyTeam, rng, { maxTicks = 6000 } = {}) {
  // Seeded RNG for rate reproducibility
  const vmMath = sb._vmMath;
  const realRandom = vmMath.random;
  vmMath.random = rng;
  const G = sb.G, battle = sb.battle;
  G.team = playerTeam;
  G.teamSlotItems = playerTeam.map((p) => p.heldItem || null);
  // Battle state reset (mirror of startBattle, without DOM)
  Object.keys(battle).forEach((k) => delete battle[k]);
  battle.log = [];
  battle.active = true;
  battle.isChamp = true;
  battle.champId = 'sim';
  battle.champTeam = enemyTeam.map((p) => ({ ...p, currentHP: p.maxHP, status: null, moves: (p.moves || []).map((m) => ({ ...m })) }));
  battle.enemyPoke = { ...battle.champTeam[0] };
  battle.champPokeIdx = 0;
  const firstAlive = G.team.findIndex((p) => p && p.currentHP > 0);
  battle.playerPokeIdx = firstAlive;
  battle.playerMods = { atk: 1, def: 1, spe: 1 };
  battle.enemyMods = { atk: 1, def: 1, spe: 1 };
  battle.weather = 'none'; battle.weatherTurns = 0;
  battle.terrain = 'none'; battle.terrainTurns = 0;
  battle.speed = 1;
  battle.pMoveIdx = 0; battle.eMoveIdx = 0;
  battle.paused = false; battle.resolvingKO = false;
  battle.sessionDamageByPokemon = {};
  battle._simResult = null;

  // KO flow override: headless version
  sandbox_onEnemyFaint(sb, battle);
  sandbox_onPlayerPokeFaint(sb, battle, G);

  try {
    sb.resetPlayerCd();
    sb.resetEnemyCd();
    sb.triggerEntryTalents('both');
    let ticks = 0;
    while (battle.active && ticks < maxTicks && battle._simResult === null) {
      ticks++;
      const b = battle;
      if (b.paused || b.resolvingKO) { await Promise.resolve(); continue; }
      if (sb.resolveBattleStateAnomalies()) { await Promise.resolve(); continue; }
      const dt = 100;
      b.pCd -= dt; b.eCd -= dt;
      if (b.pCd <= 0) {
        const p = G.team[b.playerPokeIdx], e = b.enemyPoke;
        if (p && e && p.currentHP > 0 && e.currentHP > 0) b.pMoveIdx = bestMoveIndex(p, e);
        sb.doPlayerMove();
        await Promise.resolve();
        if (!b.active || b._simResult) break;
      }
      if (sb.resolveBattleStateAnomalies()) { await Promise.resolve(); continue; }
      if (b.eCd <= 0) { sb.doEnemyMove(); await Promise.resolve(); }
    }
    if (battle._simResult === null) return { result: 'timeout', ticks };
    return { result: battle._simResult, ticks };
  } finally {
    vmMath.random = realRandom;
    battle.active = false;
  }
}
function sandbox_onEnemyFaint(sb, battle) {
  sb.onEnemyFaint = function () {
    battle.champPokeIdx += 1;
    if (battle.champTeam && battle.champPokeIdx < battle.champTeam.length) {
      battle.enemyPoke = battle.champTeam[battle.champPokeIdx];
      sb.resetEnemyCd();
      sb.triggerEntryTalents('enemy');
    } else {
      battle._simResult = 'win';
      battle.active = false;
    }
    battle.paused = false; // headless: the UI pause does not exist
  };
}
function sandbox_onPlayerPokeFaint(sb, battle, G) {
  sb.onPlayerPokeFaint = function () {
    const idx = G.team.findIndex((p) => p && p.currentHP > 0);
    if (idx >= 0) {
      battle.playerPokeIdx = idx;
      sb.resetPlayerCd();
      sb.triggerEntryTalents('player');
    } else {
      battle._simResult = 'loss';
      battle.active = false;
    }
    battle.paused = false; // headless: the UI pause does not exist
  };
}

// ── Win-rate measurement ───────────────────────────────────────────────
async function winRate(label, playerFactory, enemyFactory, { runs = RUNS, seedKey = label } = {}) {
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    const rng = mulberry32(hashSeed('sim', seedKey, i));
    const { result } = await simulateBattle(playerFactory(), enemyFactory(), rng);
    if (result === 'win') wins++;
  }
  return { label, wins, runs, rate: wins / runs };
}

// ── Rapport ──────────────────────────────────────────────────────────────────
function aceOf(entry) {
  const team = entry.variantsByStarter ? entry.variantsByStarter[Object.keys(entry.variantsByStarter)[0]] : entry.team;
  return Math.max(...team.map((p) => p.level));
}
function teamSpecs(entry) {
  return entry.variantsByStarter ? entry.variantsByStarter[Object.keys(entry.variantsByStarter)[0]] : entry.team;
}

const GYMS = Object.entries(sb.OFFICIAL_TEAMS).filter(([, e]) => e.kind === 'gym');
const RIVALS = Object.entries(sb.OFFICIAL_TEAMS).filter(([, e]) => e.kind === 'rival');
const STORY = Object.entries(sb.OFFICIAL_TEAMS).filter(([, e]) => ['team_enemy', 'boss', 'quest'].includes(e.kind));
const LEAGUE = Object.entries(sb.OFFICIAL_TEAMS).filter(([, e]) => e.kind === 'league');
// Équipe endgame « entraînée » plausible (couverture mixte Kanto/Johto évoluées)
const ENDGAME_IDS = [6, 94, 130, 149, 212, 243];
const STORY_TRAINED_IDS = [131, 143, 76, 128, 59, 184];

async function main() {
  const out = [];
  const say = (s) => { out.push(s); if (VERBOSE) console.log(s); };

  if (GROUP === 'all' || GROUP === 'gyms') {
    say('\n══ ARÈNES (joueur préparé 6 Pokémon évolués, niveau = as adverse, adaptation type) ══');
    let gIdx = -1; let lastRegion = 'kanto';
    for (const [key, entry] of GYMS) {
      if (entry.region !== lastRegion) { gIdx = -1; lastRegion = entry.region; }
      gIdx++;
      const ace = aceOf(entry);
      const counterTypes = [...new Set(teamSpecs(entry).map((p) => sb.PD[p.id] && sb.PD[p.id][1]).filter(Boolean))];
      const r = await winRate(`gym:${key}`, () => buildCasualTeam(entry.region, ace, gIdx, 6, counterTypes), () => sb.getOfficialTeam(key), { seedKey: 'gym:' + key });
      say(`  ${entry.region.padEnd(6)} ${key.padEnd(10)} as ${String(ace).padStart(2)} → victoires ${(r.rate * 100).toFixed(1)} % (${r.wins}/${r.runs})`);
      r.kind = 'gym'; r.region = entry.region; results.push(r);
    }
  }

  if (GROUP === 'all' || GROUP === 'story') {
    say('\n══ RIVAL / ROCKET / BOSSES / QUÊTES (joueur ' + STORY_PROFILE + ' au niveau de l\'as) ══');
    for (const [key, entry] of RIVALS.concat(STORY)) {
      const ace = aceOf(entry);
      const factory = STORY_PROFILE === 'trained'
        ? () => buildTrainedTeam(STORY_TRAINED_IDS, ace)
        : () => buildCasualTeam(entry.region, ace);
      const r = await winRate(`${entry.kind}:${key}`, factory, () => sb.getOfficialTeam(key), { seedKey: entry.kind + ':' + key });
      say(`  ${entry.kind.padEnd(11)} ${key.padEnd(24)} as ${String(ace).padStart(2)} → ${(r.rate * 100).toFixed(1)} % (${r.wins}/${r.runs})`);
      r.kind = entry.kind; results.push(r);
    }
  }

  if (GROUP === 'all' || GROUP === 'league') {
    say('\n══ LIGUES (joueur entraîné 6 Pokémon, as adverse) ══');
    for (const [key, entry] of LEAGUE) {
      const ace = aceOf(entry);
      const r = await winRate(`league:${key}`, () => buildTrainedTeam(ENDGAME_IDS, ace), () => sb.getOfficialTeam(key), { seedKey: 'league:' + key });
      say(`  ${entry.region.padEnd(6)} ${key.padEnd(14)} as ${String(ace).padStart(2)} → ${(r.rate * 100).toFixed(1)} % (${r.wins}/${r.runs})`);
      r.kind = 'league'; r.region = entry.region; results.push(r);
    }
  }

  if (GROUP === 'all' || GROUP === 'atoll') {
    say('\n══ ATOLL (passe 23 : joueur lv 100 entraîné × 8 fenêtres de rotation — benchmark non adapté) ══');
    const MODES = Object.keys(sb.ATOLL_MODES);
    const WINDOWS = [40, 41, 42, 43, 44, 45, 46, 47];
    for (const mk of MODES) {
      const mode = sb.ATOLL_MODES[mk];
      let wins = 0, runs = 0;
      const perW = [];
      for (const w of WINDOWS) {
        const enemy = sb.buildAtollTeam(mk, w, 'enemy');
        const playerFactory = mode.borrowed
          ? () => sb.buildAtollTeam(mk, w, 'rental')
          : () => buildTrainedTeam(ENDGAME_IDS, 100).slice(0, mode.playerCap || 6).map((p) => mode.noItems ? { ...p, heldItem: null } : p);
        const rr = await winRate(`atoll:${mk}@${w}`, playerFactory, () => enemy, { runs: Math.max(12, Math.floor(RUNS / 8)), seedKey: `atoll:${mk}@${w}` });
        wins += rr.wins; runs += rr.runs; perW.push(`${w}:${(rr.rate * 100).toFixed(0)}`);
      }
      const rate = wins / runs;
      const r = { label: `atoll:${mk}`, wins, runs, rate, kind: 'atoll' };
      say(`  ${mk.padEnd(15)} ${mode.borrowed ? '(prêtée vs palier)' : mode.playerCap ? `(${mode.playerCap} entraînés lv100)` : '(6 entraînés lv100)'} → ${(rate * 100).toFixed(1)} % (${wins}/${runs})  [${perW.join(' ')}]`);
      results.push(r);
    }
  }

  console.log(out.join('\n'));
  if (ARGS.includes('--json')) console.log('\nJSON:' + JSON.stringify(results));
  return results;
}

const results = [];
export { sb, winRate, buildCasualTeam, buildTrainedTeam, mulberry32, hashSeed, ENDGAME_IDS, STORY_TRAINED_IDS };
export const __simExports = { get results() { return results; } };

// CLI execution only (the module is also imported by tests/passe23-simulations.test.js)
const isMain = (() => { try { return import.meta.url === pathToFileURL(process.argv[1]).href; } catch (_) { return false; } })();
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });


