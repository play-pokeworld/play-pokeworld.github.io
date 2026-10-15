/**
 * PokeWorld Application — Gameplay Bundle Entry
 *
 * Single aggregation point for every ECS-driven gameplay orchestrator:
 *   - battle loop          (combat:tick)          — battle-loop.js
 *   - world encounters     (world:encounter)      — encounter-system.js
 *   - hatchery/daycare     (breeding:hatch)       — hatchery-system.js
 *   - economy/market/shops (economy:market)       — market-system.js
 *
 * Importing this module installs the gameplay ports and exposes the exact
 * same window surface the retired classic modules provided — every entry now
 * backed by the ECS world. Used by main.js at boot and by
 * tools/ecs-loop-bundle.mjs to give vm test sandboxes the SAME production
 * code the browser executes.
 *
 * @module application/gameplay-bundle
 */
import './gameplay-ports.js';
import './encounter-system.js';
import './hatchery-system.js';
import './market-system.js';
export * from './battle-loop.js';
