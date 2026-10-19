/**
 * @file HeldItemPower.js
 * @brief Power of a held item (C++: double heldItemPower(...)). Player items scale with the
 * owned quantity of that item (level 1..6, original heldPowerLevel); NPC and wild Pokémon use
 * the canonical values of the original npcHeldItemMult, and a fixed level for berries.
 */
import { BattleRules } from '../../config/BattleRules.js';
import { BERRY_EFFECT_KINDS } from '../../data/items/HeldEffectKinds.js';

/**
 * @param {number} quantity - Copies of the item in the player's inventory
 * @returns {number} Power level 1..6
 */
export function heldPowerLevel(quantity) {
  const owned = Math.max(0, Number(quantity) || 0);
  const step = BattleRules.HELD_POWER_LEVELS.find(([minimum]) => owned >= minimum);
  return step ? step[1] : 1;
}

/**
 * @param {Readonly<Object>|null} item - ItemDB entry
 * @param {{npc: boolean, ownedQuantity: number}} owner
 * @returns {number} 1 when the item has no power formula
 */
export function heldItemPower(item, { npc, ownedQuantity }) {
  const effect = item?.effect;
  if (!effect?.power) return 1;
  if (npc && !BERRY_EFFECT_KINDS.has(effect.kind)) return BattleRules.NPC_HELD_POWER[effect.kind] ?? 1;
  const level = npc ? BattleRules.NPC_BERRY_LEVEL : heldPowerLevel(ownedQuantity);
  return effect.power.base + effect.power.perLevel * level;
}
