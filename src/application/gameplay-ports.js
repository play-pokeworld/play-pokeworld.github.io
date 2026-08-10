/**
 * PokeWorld Application — Gameplay Ports Bootstrap
 *
 * Installs the world-knowledge providers consumed by the ECS gameplay systems
 * (src/application/ecs-gameplay-systems.js). Every provider is a LAZY accessor
 * evaluated at call time: boot order of the historical data modules is
 * preserved and systems never import `window` themselves.
 *
 * @module application/gameplay-ports
 */
import { setGameplayPorts } from './ecs-gameplay-systems.js';

function locsTableFor(region) {
  const g = globalThis;
  if (region === 'hoenn') return g.LOCS_HOENN || g.LOCS || {};
  if (region === 'johto') return g.LOCS_JOHTO || g.LOCS || {};
  return g.LOCS || {};
}

/**
 * (Re)install all gameplay ports. Idempotent — safe to call at every boot.
 */
export function installGameplayPorts() {
  setGameplayPorts({
    // ── Pokemon factory / daycare mechanics ──────────────────────────────
    createPoke: (id, level, shiny) =>
      (typeof globalThis.createPoke === 'function' ? globalThis.createPoke(id, level, shiny) : null),
    levelUpPokemon: (poke) => {
      if (typeof globalThis.levelUp === 'function') globalThis.levelUp(poke);
    },
    getDaycareLevelUpFee: () =>
      (typeof globalThis.getHatcheryLevelUpFee === 'function' ? globalThis.getHatcheryLevelUpFee() : 0),

    // ── World / encounter knowledge ──────────────────────────────────────
    getLocationDef: (locationId) =>
      (typeof globalThis.getLocObj === 'function' ? globalThis.getLocObj(locationId) : null),
    getRoamingLegendaryForRoute: (locationId) =>
      (typeof globalThis.getRoamingLegendaryForRoute === 'function'
        ? globalThis.getRoamingLegendaryForRoute(locationId) : null),

    // ── Market knowledge ─────────────────────────────────────────────────
    getWildSpeciesIds: (region) => {
      const set = new Set();
      const locs = locsTableFor(region);
      try {
        for (const loc of Object.values(locs)) {
          for (const w of (loc && loc.wild) || []) set.add(Number(w[0]));
        }
      } catch (_) { /* tolerate partial data tables */ }
      return set;
    },
    getEvoTargetIds: () => {
      const set = new Set();
      try {
        const levelMap = globalThis.LEVEL_EVO_MAP || {};
        for (const target of Object.values(levelMap)) set.add(Number(target));
        const stoneMap = globalThis.STONE_EVO || {};
        for (const key of Object.keys(stoneMap)) {
          for (const target of Object.values(stoneMap[key])) set.add(Number(target));
        }
      } catch (_) { /* tolerate partial data tables */ }
      return set;
    },
    getPokemonData: () => globalThis.PD || {},

    // ── Economy knowledge ────────────────────────────────────────────────
    getItemDef: (key) => (globalThis.ITEMS || {})[key] || null,
    getShopBaseStock: (shopId) => ((globalThis.SHOPS || {})[shopId] || {}).items || [],
    getShopGeneratedStock: (shopId) => (globalThis.CTCS_SHOP_STOCK || {})[shopId] || [],
  });
}

installGameplayPorts();
