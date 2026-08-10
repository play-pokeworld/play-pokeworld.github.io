/**
 * PokeWorld Application — Hatchery/Daycare Orchestration (ECS)
 *
 * Owns the hatchery slot entities (one per occupied daycare/incubation slot)
 * and drives the `breeding:hatch` ECS system
 * (src/application/ecs-gameplay-systems.js) on every battle K.O. — exactly
 * the code path the retired classic `hatcheryRegisterBattleKills` (deleted in
 * this wave) implemented by hand on global arrays:
 *
 *   - slot state lives in `HatcheryProgress` components (mode, K.O. counter,
 *     requirement, auto-hatch flag), resolved by the domain rules
 *     (src/domain/breeding/hatchery-rules.js);
 *   - daycare level-ups are performed INSIDE the system through the injected
 *     level-up port, and daycare fees are settled on the player `Wallet`
 *     component;
 *   - this orchestrator mirrors components ⇄ persisted runtime state (G) at
 *     the boundary, applies the world-moving outcomes (hatching, evictions)
 *     and refreshes the UI — its ONLY non-ECS responsibilities.
 *
 * Cadence decision (§1.2, MIGRATION_STATUS.md): strict parity — progression
 * stays K.O.-count based (10 K.O. = 1 daycare level, 25–100 K.O. to hatch or
 * revive), not converted to the step counter of the mainline games.
 *
 * @module application/hatchery-system
 */
import { getGameplayWorld } from './battle-loop.js';
import { syncPlayerPresence, applyEconomyComponents } from './encounter-system.js';
import { computeRequiredHatchKos } from '../domain/breeding/hatchery-rules.js';

/** slotIndex → entity id (module mirror of the hatchery slot entities) */
const slotEntities = new Map();

function gameState() {
  return typeof globalThis !== 'undefined' ? globalThis.G : null;
}

function incubateMode(G, i, slot) {
  const mode = (G.hatcheryModes && G.hatcheryModes[i]) || (slot && slot.mode) || 'exp';
  return (!!slot && slot.isFossil) || mode === 'breed' ? 'incubate' : 'daycare';
}

/**
 * Mirror the persisted hatchery slots (G.hatchery) into ECS entities:
 * one entity per occupied slot, entities removed when the slot empties.
 * @returns {Map<number, number>} slotIndex → entity id
 */
export function syncHatcheryEntities() {
  const G = gameState();
  const { world } = getGameplayWorld();
  if (!world || !G || !Array.isArray(G.hatchery)) return slotEntities;

  const seen = new Set();
  for (let i = 0; i < G.hatchery.length; i++) {
    const slot = G.hatchery[i];
    if (!slot) continue;
    seen.add(i);
    let eid = slotEntities.get(i);
    if (eid === undefined || !world._entities.has(eid)) {
      eid = world.create();
      slotEntities.set(i, eid);
    }
    world.add(eid, 'HatcheryProgress', {
      mode: incubateMode(G, i, slot),
      stepsKo: Number(slot.steps) || 0,
      requiredKos: Number(slot.stepsReq) || 10,
      kosPerLevel: 10, // domain DAYCARE_KOS_PER_LEVEL (design decision §1.2)
      autoHatch: !!(G.automation && G.automation.autoHatch),
      hatchPending: false,
      lastOutcome: null,
    });
    world.add(eid, 'SlotIndex', { index: i });
    world.add(eid, 'PokemonRef', { poke: slot.poke || null });
  }

  // Slots that emptied since the last sync: retire their entities.
  for (const [i, eid] of [...slotEntities.entries()]) {
    if (!seen.has(i)) {
      if (world._entities.has(eid)) world.destroy(eid);
      slotEntities.delete(i);
    }
  }
  return slotEntities;
}

/** Move a daycare pokemon out of its slot into the collection (parity). */
function evictSlotToCollection(G, i, poke) {
  const key = (typeof globalThis.generateUniqueBoxId === 'function')
    ? globalThis.generateUniqueBoxId(poke.id)
    : (!G.collection[String(poke.id)] ? String(poke.id) : ('box_' + poke.id + '_' + Date.now()));
  G.collection[key] = poke;
  G.hatchery[i] = null;
}

/**
 * ECS-backed replacement of the retired classic `hatcheryRegisterBattleKills` —
 * the single entry called on every battle K.O. (wild chain, trainers,
 * training); SAME public surface and return value.
 *
 * @param {number} count K.O.s to credit to every occupied hatchery slot
 * @returns {number} total daycare levels gained by this credit
 */
export function hatcheryRegisterBattleKills(count) {
  const G = gameState();
  const { world } = getGameplayWorld();
  if (!G || !world || !Array.isArray(G.hatchery)) return 0;
  count = Math.max(1, Math.floor(Number(count) || 1));

  // 1. Mirror G → components (slots + wallet), then run THE system.
  syncHatcheryEntities();
  syncPlayerPresence();
  world.run('breeding:hatch', count);

  let daycareLevels = 0;
  let changed = false;

  // 2. Components → G: K.O. counters always write back before outcomes run
  //    (hatchEgg re-validates slot.steps against slot.stepsReq).
  for (const [i, eid] of slotEntities.entries()) {
    if (!world._entities.has(eid)) continue;
    const slot = G.hatchery[i];
    if (!slot) continue;
    const progress = world.get(eid, 'HatcheryProgress');
    slot.steps = progress.stepsKo;
    changed = true;
  }

  // 3. Apply outcomes (hatching / daycare levels / evictions) at the boundary.
  for (const [i, eid] of [...slotEntities.entries()]) {
    if (!world._entities.has(eid)) continue;
    const progress = world.get(eid, 'HatcheryProgress');
    const outcome = progress.lastOutcome;
    if (!outcome) continue;

    if (outcome.kind === 'hatch-ready') {
      if (typeof globalThis.hatchEgg === 'function') globalThis.hatchEgg(i);
      progress.hatchPending = false;
      continue;
    }
    if (outcome.kind === 'daycare-levelup') {
      daycareLevels += outcome.levelsGained;
      if (outcome.fee > 0 && typeof globalThis.addBattleLog === 'function') {
        const slot = G.hatchery[i];
        globalThis.addBattleLog(globalThis.tr('daycare_fee_log', {
          fee: outcome.fee.toLocaleString(), n: outcome.levelsGained, name: slot && slot.poke ? slot.poke.name : '',
        }));
      }
      continue;
    }
    if (outcome.kind === 'evict') {
      const slot = G.hatchery[i];
      const poke = slot && slot.poke;
      if (!poke) continue;
      daycareLevels += outcome.levelsGained || 0;
      evictSlotToCollection(G, i, poke);
      if (outcome.reason === 'max-level') {
        if (typeof globalThis.addBattleLog === 'function') globalThis.addBattleLog(globalThis.tr('daycare_max_log', { name: poke.name }));
        globalThis.notify(globalThis.tr('daycare_evicted_max', { name: poke.name }), 'var(--green)');
      } else {
        globalThis.notify(globalThis.tr('daycare_evicted_funds', { name: poke.name, fee: (outcome.fee || 0).toLocaleString() }), 'var(--red)');
      }
    }
  }

  // 4. Economy write-back (daycare fees settled on the Wallet component).
  applyEconomyComponents();
  try { if (typeof globalThis.updateHeader === 'function') globalThis.updateHeader(); } catch (_) {}
  syncHatcheryEntities();
  if (changed && typeof globalThis.renderHatcheryWindow === 'function') {
    try { globalThis.renderHatcheryWindow(); } catch (_) {}
  }
  return daycareLevels;
}

if (typeof window !== 'undefined') {
  window.hatcheryRegisterBattleKills = hatcheryRegisterBattleKills;
  // Domain rule exposure for the classic hatchery module (single source of
  // truth stays in src/domain/breeding/hatchery-rules.js).
  window.computeRequiredHatchKos = computeRequiredHatchKos;
}
if (typeof globalThis !== 'undefined') {
  globalThis.hatcheryRegisterBattleKills = hatcheryRegisterBattleKills;
  globalThis.computeRequiredHatchKos = computeRequiredHatchKos;
}
