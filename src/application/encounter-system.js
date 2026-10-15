/**
 * PokeWorld Application — World Encounter Orchestration (ECS)
 *
 * Owns the player world-presence entity and drives the `world:encounter` ECS
 * system (src/application/ecs-gameplay-systems.js) for every wild spawn:
 *
 *   - the player presence entity carries `WorldLocation` (current route),
 *     `WildSpawnTable` (the route's spawn table + roaming legendary id),
 *     `EncounterCooldown` (spawn cadence + pending request), `Wallet` and
 *     `InventoryItems` — real component data, synced at the persistence
 *     boundary (G) exactly like the ECS-backed battle loop;
 *   - every spawn is resolved INSIDE the system (domain pick rule, factory
 *     port) as a NEW entity carrying `WildPokemon`/`PokemonRef`/`Stats`;
 *   - this orchestrator then applies the battle handoff (the former classic
 *     `spawnNextWild`/`exploreArea`/`startWildBattle` wiring, deleted from
 *     the legacy modules in this same wave).
 *
 * Cadence decision (§1.1, MIGRATION_STATUS.md): strict parity — after an
 * enemy K.O. in a chill battle the next wild Pokemon spawns immediately
 * (EncounterCooldown.intervalMs = 0). The cadence is modelled explicitly on
 * the component so a timed mode can be introduced by data.
 *
 * @module application/encounter-system
 */
import { getGameplayWorld } from './battle-loop.js';

let presenceEid = -1;
let lastWildEid = -1;

function gameState() {
  return typeof globalThis !== 'undefined' ? globalThis.G : null;
}

/**
 * Ensure the singleton player world-presence entity exists and return it.
 * @returns {number} entity id (-1 when no gameplay world is available)
 */
export function ensurePlayerPresence() {
  const { world } = getGameplayWorld();
  if (!world) return -1;
  if (presenceEid >= 0 && world._entities.has(presenceEid)) return presenceEid;
  presenceEid = world.create();
  world.add(presenceEid, 'WorldLocation', { id: null });
  world.add(presenceEid, 'WildSpawnTable', { entries: [], roamingId: 0 });
  world.add(presenceEid, 'EncounterCooldown', {
    elapsedMs: 0,
    intervalMs: 0, // strict parity: immediate K.O.-chain respawn (decision §1.1)
    pendingSpawn: false,
    pendingReason: null,
    lastSpawnEid: -1,
    lastOutcome: null,
  });
  world.add(presenceEid, 'Wallet', { money: 0, diamonds: 0 });
  world.add(presenceEid, 'InventoryItems', { counts: {} });
  return presenceEid;
}

/**
 * Sync the presence components from the persisted runtime state (G):
 * current location, its spawn table, the roaming legendary on the route,
 * the wallet and the bag contents.
 * @returns {number} presence entity id (-1 when unavailable)
 */
export function syncPlayerPresence() {
  const G = gameState();
  const eid = ensurePlayerPresence();
  const { world } = getGameplayWorld();
  if (!G || !world || eid < 0) return -1;

  const loc = typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(G.location) : null;
  world.get(eid, 'WorldLocation').id = G.location || null;
  const table = world.get(eid, 'WildSpawnTable');
  table.entries = loc && Array.isArray(loc.wild) ? loc.wild : [];
  // PASSE 38g/39d — les légendaires ERRANTS n'apparaissent JAMAIS en zone
  // donjon (retour joueur : « les roamings doivent se trouver uniquement sur
  // des routes ») : `getRoamingLegendaryForRoute` renvoie déjà null pour un
  // lieu de type dungeon, et on force en plus `roamingId = 0` dès que le
  // joueur est dans un donjon (lieu dungeon OU expédition en cours).
  let inDungeon = !!(loc && loc.type === 'dungeon');
  try {
    if (typeof globalThis.currentDungeonRun === 'function') {
      const run = globalThis.currentDungeonRun();
      if (run && run.active) inDungeon = true;
    }
  } catch (_) {}
  table.roamingId = inDungeon
    ? 0
    : typeof globalThis.getRoamingLegendaryForRoute === 'function'
      ? globalThis.getRoamingLegendaryForRoute(G.location) || 0
      : 0;
  // V7 · ROAM-01 (décision joueur 2026-10-14) — the roamer is ALSO on the
  // table during the offline catch-up (window.PW_FF): farming a legendary
  // AFK is the whole point of parking the team on its route. If the Nv. 75
  // roamer wipes the team, that is the player's call (the recap says so).

  // Wallet / Inventory are the market system state too — one player entity.
  world.get(eid, 'Wallet').money = Number(G.money) || 0;
  try {
    const w = typeof globalThis.ensureWallet === 'function' ? globalThis.ensureWallet() : null;
    world.get(eid, 'Wallet').diamonds = w && typeof w.diamonds === 'number' ? w.diamonds : 0;
  } catch (_) {
    world.get(eid, 'Wallet').diamonds = 0;
  }
  world.get(eid, 'InventoryItems').counts = Object.assign({}, G.inventory || {});
  return eid;
}

/**
 * Push the economy component state back to the persisted runtime state (G).
 * @returns {boolean} whether a write-back happened
 */
export function applyEconomyComponents() {
  const G = gameState();
  const eid = presenceEid;
  const { world } = getGameplayWorld();
  if (!G || !world || eid < 0 || !world._entities.has(eid)) return false;
  G.money = Number(world.get(eid, 'Wallet').money) || 0;
  try {
    const w = typeof globalThis.ensureWallet === 'function' ? globalThis.ensureWallet() : null;
    if (w) w.diamonds = Number(world.get(eid, 'Wallet').diamonds) || 0;
  } catch (_) {}
  const counts = world.get(eid, 'InventoryItems').counts || {};
  for (const key of Object.keys(counts)) {
    if (!(Number(counts[key]) > 0)) delete counts[key];
  }
  G.inventory = Object.assign({}, counts);
  return true;
}

/**
 * Resolve one wild spawn THROUGH the ECS system and return the spawned
 * Pokemon object (component `PokemonRef.poke` of the new wild entity).
 * The previously tracked wild entity is retired — its Pokemon object has
 * been handed to the battle state by the orchestrator.
 *
 * @param {'ko-chain'|'explore'|'wild-button'} reason
 * @returns {Object|null} spawned Pokemon, or null (empty table / no team)
 */
export function requestWildSpawn(reason) {
  const eid = syncPlayerPresence();
  const { world } = getGameplayWorld();
  if (!world || eid < 0) return null;

  if (lastWildEid >= 0 && world._entities.has(lastWildEid)) {
    world.destroy(lastWildEid);
    lastWildEid = -1;
  }

  const cd = world.get(eid, 'EncounterCooldown');
  cd.pendingSpawn = true;
  cd.intervalMs = 0; // strict parity cadence (see module header)
  cd.pendingReason = reason;
  world.run('world:encounter', 0);

  if (cd.lastOutcome !== 'spawned' || cd.lastSpawnEid < 0) return null;
  lastWildEid = cd.lastSpawnEid;
  const ref = world.get(lastWildEid, 'PokemonRef');
  return ref ? ref.poke : null;
}

/**
 * ECS-backed replacement of the retired classic `spawnNextWild` — the
 * K.O.-chain respawn inside a live battle. Same outcome, same calls, but the
 * wild Pokemon is now picked and spawned by the `world:encounter` system on
 * component data.
 */
export function spawnNextWild() {
  const G = gameState();
  const battle = globalThis.battle;
  const loc =
    typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(G && G.location) : null;
  const wild = loc ? loc.wild : null;
  if (
    !wild ||
    !wild.length ||
    (typeof globalThis.aliveCount === 'function' && globalThis.aliveCount() === 0)
  ) {
    if (typeof globalThis.endBattle === 'function') globalThis.endBattle();
    return;
  }
  let wp = requestWildSpawn('ko-chain');
  if (!wp) {
    if (typeof globalThis.endBattle === 'function') globalThis.endBattle();
    return;
  }
  // PASSE 32 — donjons : la chaîne de combats est le mode NORMAL d'une
  // expédition. Le gardien doit donc pouvoir surgir ici aussi, sinon il ne
  // serait jamais rencontré sans quitter puis relancer un combat.
  wp = applyDungeonEncounterTuning(wp, G) || wp;
  battle.enemyPoke = wp;
  battle.enemyMods = { atk: 1, def: 1, spe: 1 };
  battle.playerMods = { atk: 1, def: 1, spe: 1 };
  battle.eMoveIdx = 0;
  battle.escaped = false;
  battle.attacksOnCurrentEnemy = 0;
  battle.enemyTurnsOnField = 0; // DORM-06 — balls spéciales
  globalThis.resetEnemyCd();
  globalThis.resetPlayerCd();
  G.pokedex[battle.enemyPoke.id] = Object.assign({}, G.pokedex[battle.enemyPoke.id] || {}, {
    seen: true,
  });
  try {
    const _encShiny = !!(wp.shiny || wp.shinyActive || wp._forceShiny);
    if (typeof globalThis.recordDexEncounter === 'function')
      globalThis.recordDexEncounter(wp.id, _encShiny);
    if (typeof globalThis.recordLocStat === 'function' && G.location)
      globalThis.recordLocStat(G.location, 'encountered', 1);
  } catch (_) {}
  globalThis.clearBattleLog();
  globalThis.triggerEntryTalents('both');
  globalThis.updateBattleUI();
  if (wp._isRoaming) {
    globalThis.addBattleLog(globalThis.tr('roaming_legendary_appeared', { name: wp.name }));
    // V7 · ROAM-01 — session counter read by the offline recap (how many
    // roamers showed up while the player was away, and which one last).
    battle.roamerSightings = (battle.roamerSightings || 0) + 1;
    battle.lastRoamer = {
      id: Number(wp.id),
      name: wp.name,
      level: Number(wp.level || 0),
      shiny: !!(wp.shiny || wp.shinyActive),
    };
  }
  if (battle.enemyPoke.shiny)
    globalThis.addBattleLog(
      `<span class="shiny-tag"></span>${globalThis.tr('wild_pokemon_shiny_appears', { name: battle.enemyPoke.name })}`
    );
  else
    globalThis.addBattleLog(globalThis.tr('wild_pokemon_appears', { name: battle.enemyPoke.name }));
  globalThis.renderMoveButtons();
  globalThis.renderEnemyMoveBars();
  globalThis.renderBattleTeamRow();
  globalThis.resumeBattleActions();
}

/**
 * ECS-backed replacement of the retired classic `exploreArea` (manual
 * "Explore" action): guards, then one system-resolved spawn handed to
 * `startBattle`.
 */
/**
 * PASSE 32 — le gardien du dernier palier. On ne crée pas une espèce spéciale :
 * on prend le tirage sauvage normal et on en fait un adversaire d'élite
 * (niveau relevé, PV renforcés), pour que le boss reste cohérent avec la faune
 * du donjon sans dupliquer une table de rencontres.
 */
/**
 * PASSE 33 — LA DIFFICULTÉ MONTE À CHAQUE PALIER.
 * Retour joueur : « je n'ai pas vu la difficulté monter à chaque palier, j'ai
 * eu l'impression d'affronter la route normale sans aucun changement. »
 * C'était exact : le donjon ne modifiait QUE le butin, jamais l'adversaire.
 * On renforce donc chaque rencontre proportionnellement à la profondeur :
 * +3 niveaux par palier au-delà du premier, et des PV majorés de 15 % par
 * palier. Le palier 1 reste identique à la route (prise en main douce), le
 * palier 5 devient nettement coriace.
 */
function applyDungeonFloorScaling(wp, run) {
  if (!wp || !run) return wp;
  const floor = Math.max(1, Number(run.floor) || 1);
  if (floor <= 1) return wp;
  const step = floor - 1;
  wp.level = Math.min(100, (Number(wp.level) || 5) + step * 3);
  try {
    if (typeof globalThis.recalcPokeStats === 'function') globalThis.recalcPokeStats(wp);
  } catch (_) {}
  wp.maxHP = Math.round((Number(wp.maxHP) || 20) * (1 + step * 0.15));
  wp.currentHP = wp.maxHP;
  wp.dungeonFloor = floor;
  return wp;
}

/**
 * Applique le renfort de palier OU le gardien, selon l'état de l'expédition.
 * Centralisé ici pour que l'exploration et la chaîne de combats se comportent
 * exactement pareil (la divergence entre les deux était le bug du gardien).
 */
function applyDungeonEncounterTuning(wp, G) {
  try {
    if (typeof globalThis.currentDungeonRun !== 'function') return wp;
    const run = globalThis.currentDungeonRun();
    if (!run || run.loc !== (G && G.location)) return wp;
    const battle = globalThis.battle;
    // Le gardien est demandé explicitement par le choix de la case boss
    // (dungeonMoveTo → pendingNode + pendingDungeonBoss), ou déduit de l'état
    // (palier final déjà purgé) UNIQUEMENT SANS carte (chaîne historique).
    // PASSE 39 — avec la carte, plus d'inférence « palier purgé → gardien » :
    // un combat normal ne devient JAMAIS le boss tout seul (retour joueur).
    const flagged = !!(battle && battle.pendingDungeonBoss);
    const deduced =
      !run.map &&
      typeof globalThis.dungeonIsBossFloor === 'function' &&
      globalThis.dungeonIsBossFloor() &&
      typeof globalThis.dungeonFloorCleared === 'function' &&
      globalThis.dungeonFloorCleared();
    if (flagged || deduced) {
      if (battle) battle.pendingDungeonBoss = false;
      return applyDungeonBossBuff(wp, run);
    }
    // PASSE 36 — CARTE : la case ÉLITE est un adversaire corsé (+2 niveaux,
    // PV ×1,25) dont la victoire paie DOUBLE (voir dungeonOnWin). C'est
    // l'arbitrage risque/récompense de la carte ; une case ordinaire reste au
    // simple barème de palier.
    // PASSE 37 — grille : case élite (butin ×2) ou case boss de palier
    // (mini-boss corsé) selon la case engagée.
    let elite = false;
    let miniboss = false;
    try {
      const pn = run.pendingNode && run.map && run.map.tiles && run.map.tiles[run.pendingNode];
      elite = !!(pn && pn.type === 'elite');
      miniboss = !!(pn && pn.type === 'boss');
    } catch (_) {
      elite = false;
      miniboss = false;
    }
    if (battle) battle.dungeonElite = elite;
    if (miniboss) {
      const wp3 = applyDungeonFloorScaling(wp, run);
      wp3.level = Math.min(100, (Number(wp3.level) || 5) + 3);
      try {
        if (typeof globalThis.recalcPokeStats === 'function') globalThis.recalcPokeStats(wp3);
      } catch (_) {}
      wp3.maxHP = Math.round((Number(wp3.maxHP) || 20) * 2);
      wp3.currentHP = wp3.maxHP;
      return wp3;
    }
    if (elite) {
      const wp2 = applyDungeonFloorScaling(wp, run);
      wp2.level = Math.min(100, (Number(wp2.level) || 5) + 2);
      try {
        if (typeof globalThis.recalcPokeStats === 'function') globalThis.recalcPokeStats(wp2);
      } catch (_) {}
      wp2.maxHP = Math.round((Number(wp2.maxHP) || 20) * 1.25);
      wp2.currentHP = wp2.maxHP;
      return wp2;
    }
    return applyDungeonFloorScaling(wp, run);
  } catch (_) {
    return wp;
  }
}

/**
 * PASSE 35 — LE GARDIEN EST UN VRAI BOSS.
 * Retour joueur : « le boss final n'en est pas un, c'est décevant ». Il était
 * en effet un sauvage ordinaire à peine relevé (+10 niveaux, ×1,6 PV) : avec
 * une équipe calibrée pour le donjon, il tombait en deux attaques.
 * Trois leviers, cumulés, pour en faire un adversaire qui se combat :
 *   1. ESPÈCE D'ÉLITE — on ne prend plus le tirage sauvage courant, mais le
 *      Pokémon le PLUS FORT de la table du lieu (somme des stats de base),
 *      et sa dernière évolution si elle existe. Le gardien de la Forêt de Jade
 *      n'est plus un Aspicot mais un Dardargnan.
 *   2. STATURE — niveau 100 plafonné par la profondeur, PV ×4,5, attaque et
 *      défense majorées via les modificateurs de camp.
 *   3. FURIE — sous 50 % de PV, le gardien double sa cadence d'attaque
 *      (voir `dungeonBossEnrageCheck`, appelé par la boucle de combat).
 */
function _dgBaseStatTotal(id) {
  try {
    const d = (typeof globalThis.PD !== 'undefined' ? globalThis.PD : PD)[id];
    if (!d) return 0;
    return (d[3] | 0) + (d[4] | 0) + (d[5] | 0) + (d[6] | 0) + (d[7] | 0) + (d[8] | 0);
  } catch (_) {
    return 0;
  }
}

/** Dernière évolution connue d'une espèce (chaîne suivie au plus 3 crans).
 *  On s'appuie sur `LEVEL_EVO_MAP` de progression.js — la seule table
 *  d'évolutions du projet — plus les évolutions par pierre en secours. */
function _dgFinalEvolution(id) {
  try {
    const lvlMap = globalThis.LEVEL_EVO_MAP || null;
    const stoneMap = globalThis.STONE_EVO || null;
    let cur = Number(id);
    for (let i = 0; i < 3; i++) {
      let next = lvlMap ? lvlMap[cur] : null;
      if (!next && stoneMap && stoneMap[cur]) {
        const vals = Object.values(stoneMap[cur]).map(Number).filter(Boolean);
        if (vals.length) next = vals[0];
      }
      const n = Number(next);
      if (!n || !Number.isFinite(n) || n === cur) break;
      cur = n;
    }
    return cur;
  } catch (_) {
    return id;
  }
}

/** L'espèce du gardien : le RARE de la faune locale (retour joueur 38f :
 *  « les rares de la zone doivent être les boss »). On prend l'espèce du
 *  lieu TELLE QUELLE — PAS son évolution finale : le gardien de la Forêt de
 *  Jade est Pikachu (rare de la zone), plus Raichu, qui n'y est pas
 *  disponible. Repli par palier : rare → peu commun → commun → plus forte
 *  évolution finale (l'ancienne règle, réservée aux tables sans étiquette).
 *  ATTENTION au format des tables : `loc.wild` est un tableau de TUPLES
 *  `[id, nivMin, nivMax, rareté]`, pas d'objets `{id}`. */
function _dgBossSpecies(G, fallbackId) {
  try {
    const loc =
      typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(G && G.location) : null;
    const wild = loc && Array.isArray(loc.wild) ? loc.wild : null;
    if (!wild || !wild.length) return fallbackId;
    const tuples = wild
      .map((w) => ({
        id: Number(Array.isArray(w) ? w[0] : w && w.id != null ? w.id : w),
        bucket: String((Array.isArray(w) ? w[3] : w && w.bucket) || 'common'),
      }))
      .filter((t) => Number.isFinite(t.id) && t.id > 0);
    if (!tuples.length) return fallbackId;
    const hasLabels = tuples.some((t) => t.bucket !== 'common');
    const pickBest = (list) =>
      list.reduce(
        (best, t) => (_dgBaseStatTotal(t.id) > _dgBaseStatTotal(best.id) ? t : best),
        list[0]
      ).id;
    if (hasLabels) {
      for (const bucket of ['rare', 'uncommon', 'common']) {
        const cand = tuples.filter((t) => t.bucket === bucket);
        if (cand.length) return pickBest(cand);
      }
      return fallbackId;
    }
    // Table sans étiquette de rareté : l'ancienne règle (faune locale évoluée
    // à fond) pour rester un vrai gardien.
    let best = tuples[0].id,
      bestScore = -1;
    for (const t of tuples) {
      const fin = _dgFinalEvolution(t.id);
      const sc = _dgBaseStatTotal(fin);
      if (sc > bestScore) {
        bestScore = sc;
        best = fin;
      }
    }
    return best || fallbackId;
  } catch (_) {
    return fallbackId;
  }
}

function applyDungeonBossBuff(wp, run) {
  if (!wp || !run) return wp;
  const G = gameState();
  const depth = Number(run.depth) || 5;

  // 2. Stature — le niveau du gardien, calculé UNE seule fois et appliqué que
  // l'on ait ou non pu changer d'espèce (sinon le bonus se comptait deux fois).
  const bossLevel = Math.min(100, (Number(wp.level) || 5) + 8 + depth * 2);

  // 1. Espèce d'élite — on remplace le tirage courant si on trouve mieux.
  try {
    const bossId = _dgBossSpecies(G, wp.id);
    if (bossId && bossId !== wp.id && typeof globalThis.createPoke === 'function') {
      const elite = globalThis.createPoke(bossId, bossLevel, false);
      if (elite) {
        elite.shiny = false;
        wp = elite;
      }
    }
  } catch (_) {}

  wp.isDungeonBoss = true;
  wp.level = bossLevel;
  try {
    if (typeof globalThis.recalcPokeStats === 'function') globalThis.recalcPokeStats(wp);
  } catch (_) {}
  wp.maxHP = Math.round((Number(wp.maxHP) || 20) * 4.5);
  wp.currentHP = wp.maxHP;
  wp._dgEnraged = false;
  // Les modificateurs de camp NE sont PAS posés ici : `startBattle` et
  // `spawnNextWild` réinitialisent `battle.enemyMods` juste après cet appel.
  // On mémorise l'intention sur le Pokémon ; `dungeonBossTick` l'installe au
  // premier tick, ce qui rend l'ordre des appels indifférent.
  wp._dgBossMods = { atk: 1.5, def: 1.35 };
  wp._dgBossModsApplied = false;
  try {
    const label = typeof globalThis.t === 'function' ? globalThis.t('dungeon_boss_prefix') : '';
    if (label && label !== 'dungeon_boss_prefix' && !String(wp.name).startsWith(label)) {
      wp.name = label + ' ' + wp.name;
    }
  } catch (_) {}
  return wp;
}

/**
 * Hook de boucle de combat pour le gardien. Appelé à chaque tick, il fait deux
 * choses, chacune une seule fois :
 *   - installe les modificateurs de camp du boss (après tout reset d'init) et
 *     annonce son arrivée dans le journal ;
 *   - 3. FURIE : sous la moitié de ses PV, le gardien redouble d'agressivité
 *     (attaque ×1,4, cadence ×1,6).
 * Sans effet si l'adversaire courant n'est pas un gardien.
 */
export function dungeonBossTick() {
  let changed = false;
  try {
    const b = globalThis.battle;
    const e = b && b.enemyPoke;
    if (!b || !e || !e.isDungeonBoss) return false;
    const log = (key) => {
      try {
        if (typeof globalThis.addBattleLog === 'function' && typeof globalThis.tr === 'function') {
          globalThis.addBattleLog(
            '<span class="pw-red">' + globalThis.tr(key, { name: e.name }) + '</span>'
          );
        }
      } catch (_) {}
    };
    if (!e._dgBossModsApplied) {
      e._dgBossModsApplied = true;
      const m = e._dgBossMods || { atk: 1.5, def: 1.35 };
      if (b.enemyMods) {
        b.enemyMods.atk = m.atk;
        b.enemyMods.def = m.def;
      }
      log('dungeon_boss_appears');
      changed = true;
    }
    if (!e._dgEnraged && Number(e.currentHP) <= Number(e.maxHP) * 0.5) {
      e._dgEnraged = true;
      if (b.enemyMods) {
        b.enemyMods.atk = (b.enemyMods.atk || 1) * 1.4;
        b.enemyMods.spe = (b.enemyMods.spe || 1) * 1.6;
      }
      log('dungeon_boss_enrage');
      changed = true;
    }
  } catch (_) {
    return false;
  }
  return changed;
}
if (typeof globalThis !== 'undefined') globalThis.dungeonBossTick = dungeonBossTick;

export function exploreArea() {
  const G = gameState();
  if (
    typeof globalThis.hasActiveTrainingBattle === 'function' &&
    globalThis.hasActiveTrainingBattle()
  ) {
    globalThis.notify(globalThis.t('training_in_progress_no_battle'), 'var(--red)');
    return;
  }
  if (!G || !G.team.length) {
    globalThis.setMsg(globalThis.t('no_pokemon_in_team'));
    return;
  }
  const loc = typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(G.location) : null;
  if (!loc || !loc.wild || !loc.wild.length) {
    globalThis.setMsg(globalThis.t('no_wild_pokemon_here'));
    return;
  }
  // PASSE 32 — donjons : le péage n'achète plus un accès mais une EXPÉDITION
  // (descente par paliers, sac d'expédition, remontée volontaire). Le péage
  // est donc prélevé UNE FOIS à l'ouverture de la session, plus à chaque
  // exploration ; les combats suivants de la même descente sont gratuits.
  // Voir src/application/world/dungeon-run.js et docs/PROPOSITION-DONJONS.md.
  if (loc.type === 'dungeon') {
    const hasRun =
      typeof globalThis.isDungeonRunAt === 'function' && globalThis.isDungeonRunAt(G.location);
    if (!hasRun) {
      if (typeof globalThis.startDungeonRun === 'function') {
        // Le péage, ses contrôles et sa notification vivent dans startDungeonRun.
        if (!globalThis.startDungeonRun(G.location)) return;
      } else {
        const toll =
          typeof globalThis.dungeonToll === 'function'
            ? globalThis.dungeonToll(loc.badgeReq || 0)
            : 0;
        if (toll > 0) {
          const w =
            typeof globalThis.ensureWallet === 'function' ? globalThis.ensureWallet() : null;
          if (!w || (w.dungeonTokens || 0) < toll) {
            globalThis.notify(
              globalThis.tr('dungeon_toll_blocked', {
                need: formatNumber(toll),
                have: w ? formatNumber(w.dungeonTokens || 0) : '0',
              }),
              'var(--red)'
            );
            return;
          }
          if (typeof globalThis.spendDungeonTokens === 'function')
            globalThis.spendDungeonTokens(toll);
          globalThis.notify(
            globalThis.tr('dungeon_toll_paid', { toll: formatNumber(toll) }),
            'var(--blue)'
          );
          G.dungeonsExplored = (G.dungeonsExplored || 0) + 1;
        }
      }
    }
    // PASSE 39 — avec la carte quadrillée, ENTRER dans un donjon n'engage
    // AUCUN combat : le joueur arrive sur sa première case (toujours vide)
    // et choisit sa direction. Retour joueur : « lancer le donjon lance un
    // combat directement ». Les combats ne naissent que du choix d'une case.
    // EXCEPTION : quand `dungeonFight()` (déclenché par un clic sur une case
    // combat) appelle exploreArea(), `run.pendingNode` est POSÉ — on laisse
    // alors le combat démarrer, il solde la case à la victoire.
    if (typeof globalThis.isDungeonRunAt === 'function' && globalThis.isDungeonRunAt(G.location)) {
      let _pn = null;
      try {
        const _run =
          typeof globalThis.currentDungeonRun === 'function'
            ? globalThis.currentDungeonRun()
            : null;
        _pn = _run && _run.pendingNode;
      } catch (_) {}
      if (!_pn) return;
    }
  }
  let wp = requestWildSpawn('explore');
  if (!wp) return;
  // Dernier palier : le combat suivant est le GARDIEN du donjon. Le battre
  // clôt la session et verse le bonus de complétion.
  try {
    wp = applyDungeonEncounterTuning(wp, G) || wp;
  } catch (_) {}
  globalThis.startBattle(wp, false);
}

/**
 * ECS-backed replacement of the retired classic `startWildBattle`. The
 * legacy implementation rolled a UNIFORM entry ignoring rarity buckets —
 * consciously aligned on the canonical bucket rule (pickWildFromTable) that
 * every other spawn path uses; documented in MIGRATION_STATUS.md.
 */
export function startWildBattle() {
  const G = gameState();
  if (
    typeof globalThis.hasActiveTrainingBattle === 'function' &&
    globalThis.hasActiveTrainingBattle()
  ) {
    globalThis.notify(globalThis.t('training_in_progress_no_battle'), 'var(--red)');
    return;
  }
  const loc =
    typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(G && G.location) : null;
  const wild = loc ? loc.wild : null;
  if (!wild || !wild.length || !G || !G.team.length) return;
  const wp = requestWildSpawn('wild-button');
  if (wp) globalThis.startBattle(wp, false);
}

if (typeof window !== 'undefined') {
  // Same public surface as the retired classic modules — every entry now
  // goes through the ECS world.
  window.spawnNextWild = spawnNextWild;
  window.exploreArea = exploreArea;
  window.startWildBattle = startWildBattle;
}
if (typeof globalThis !== 'undefined') {
  globalThis.spawnNextWild = spawnNextWild;
  globalThis.exploreArea = exploreArea;
  globalThis.startWildBattle = startWildBattle;
}
