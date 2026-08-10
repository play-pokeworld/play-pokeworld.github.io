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
  world.add(presenceEid, 'Wallet', { money: 0 });
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
  table.entries = (loc && Array.isArray(loc.wild)) ? loc.wild : [];
  table.roamingId = (typeof globalThis.getRoamingLegendaryForRoute === 'function')
    ? (globalThis.getRoamingLegendaryForRoute(G.location) || 0)
    : 0;

  // Wallet / Inventory are the market system state too — one player entity.
  world.get(eid, 'Wallet').money = Number(G.money) || 0;
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
  const loc = typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(G && G.location) : null;
  const wild = loc ? loc.wild : null;
  if (!wild || !wild.length || (typeof globalThis.aliveCount === 'function' && globalThis.aliveCount() === 0)) {
    if (typeof globalThis.endBattle === 'function') globalThis.endBattle();
    return;
  }
  const wp = requestWildSpawn('ko-chain');
  if (!wp) {
    if (typeof globalThis.endBattle === 'function') globalThis.endBattle();
    return;
  }
  battle.enemyPoke = wp;
  battle.enemyMods = { atk: 1, def: 1, spe: 1 };
  battle.playerMods = { atk: 1, def: 1, spe: 1 };
  battle.eMoveIdx = 0;
  battle.escaped = false;
  globalThis.resetEnemyCd();
  globalThis.resetPlayerCd();
  G.pokedex[battle.enemyPoke.id] = Object.assign({}, G.pokedex[battle.enemyPoke.id] || {}, { seen: true });
  globalThis.clearBattleLog();
  globalThis.triggerEntryTalents('both');
  globalThis.updateBattleUI();
  if (wp._isRoaming) globalThis.addBattleLog(globalThis.tr('roaming_legendary_appeared', { name: wp.name }));
  if (battle.enemyPoke.shiny) globalThis.addBattleLog(`<span class="shiny-tag"></span>${globalThis.tr('wild_pokemon_shiny_appears', { name: battle.enemyPoke.name })}`);
  else globalThis.addBattleLog(globalThis.tr('wild_pokemon_appears', { name: battle.enemyPoke.name }));
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
export function exploreArea() {
  const G = gameState();
  if (typeof globalThis.hasActiveTrainingBattle === 'function' && globalThis.hasActiveTrainingBattle()) {
    globalThis.notify(globalThis.t('training_in_progress_no_battle'), 'var(--red)');
    return;
  }
  if (!G || !G.team.length) { globalThis.setMsg(globalThis.t('no_pokemon_in_team')); return; }
  const loc = typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(G.location) : null;
  if (!loc || !loc.wild || !loc.wild.length) { globalThis.setMsg(globalThis.t('no_wild_pokemon_here')); return; }
  const wp = requestWildSpawn('explore');
  if (wp) globalThis.startBattle(wp, false);
}

/**
 * ECS-backed replacement of the retired classic `startWildBattle`. The
 * legacy implementation rolled a UNIFORM entry ignoring rarity buckets —
 * consciously aligned on the canonical bucket rule (pickWildFromTable) that
 * every other spawn path uses; documented in MIGRATION_STATUS.md.
 */
export function startWildBattle() {
  const G = gameState();
  if (typeof globalThis.hasActiveTrainingBattle === 'function' && globalThis.hasActiveTrainingBattle()) {
    globalThis.notify(globalThis.t('training_in_progress_no_battle'), 'var(--red)');
    return;
  }
  const loc = typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(G && G.location) : null;
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
