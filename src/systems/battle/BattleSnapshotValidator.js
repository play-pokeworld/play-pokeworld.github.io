/** @file BattleSnapshotValidator.js @brief Validates untrusted finite-battle JSON before constructing runtime objects. */
import { BattleSnapshotRules as Rules } from '../../config/BattleSnapshotRules.js';
import { BattleSides } from '../../config/BattleSides.js';
import { Weathers, Terrains } from '../../data/battle/BattleFields.js';
import { StatusConditions } from '../../data/battle/StatusConditions.js';
import { TypeChart } from '../../data/core/TypeChart.js';
import { MODIFIABLE_STATS } from './BattleCombatant.js';

const record = (value) => value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const number = (value, minimum = 0, maximum = Rules.MAX_NUMBER) => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
const integer = (value, minimum = 0, maximum = Rules.MAX_NUMBER) => Number.isInteger(value) && number(value, minimum, maximum);
const list = (value, maximum = Rules.MAX_RECORDS) => Array.isArray(value) && value.length <= maximum;
const ids = (value, maximum) => list(value, maximum) && value.every((id) => typeof id === 'string' && id.length > 0);
const unique = (value) => new Set(value).size === value.length;
const keys = (value, allowed) => record(value) && Object.keys(value).every((key) => allowed.includes(key));
const nullable = (value, allowed) => value === null || allowed.includes(value);
const type = (value) => value === null || TypeChart.normalize(value) === value;

/** Only finite, bounded JSON; never prototype-bearing dictionaries, functions or runtime objects. */
function json(value, depth = 0) {
  if (depth > Rules.MAX_JSON_DEPTH) return false;
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return list(value) && value.every((entry) => json(entry, depth + 1));
  return record(value) && Object.entries(value).every(([key, entry]) =>
    !['__proto__', 'constructor', 'prototype'].includes(key) && json(entry, depth + 1));
}

function combatant(value, side) {
  if (!keys(value, [...Rules.COMBATANT_FIELDS, 'usedTriggers']) || value.side !== side || value.npc !== (side === BattleSides.FOE)) return false;
  if (!['hiddenTalentActive', 'dungeonBoss', 'dungeonEnraged', 'legendaryBoss', 'seedBoost', 'flinched'].every((key) => typeof value[key] === 'boolean')) return false;
  if (!number(value.hpMultiplier, 1, Rules.MAX_HP_MULTIPLIER) || (side === BattleSides.PLAYER && value.hpMultiplier !== 1)) return false;
  if (!['_baseStatMultipliers', 'statMods', 'statModTurns'].every((key) => keys(value[key], MODIFIABLE_STATS) &&
    Object.values(value[key]).every((entry) => number(entry)))) return false;
  if (!['heldQuantity', 'statusTurns', 'accuracyPenalty', 'moveIndex', 'consecutiveUses'].every((key) => integer(value[key]))) return false;
  return nullable(value.status, Object.values(StatusConditions)) && type(value.addedType) && type(value.typeOverride) && type(value.lastCrossType) &&
    (value.lastMoveId === null || typeof value.lastMoveId === 'string') &&
    (value.nextDamageMult === null || number(value.nextDamageMult)) && ids(value.usedTriggers) && unique(value.usedTriggers);
}

export class BattleSnapshotValidator {
  /** @param {Object} state @returns {boolean} */
  static isValid(state) {
    if (!record(state) || !json(state) || state.version !== Rules.VERSION) return false;
    if (!ids(state.teamUids, Rules.MAX_TEAM_SIZE) || !state.teamUids.length || !unique(state.teamUids) ||
      !list(state.teamState, Rules.MAX_TEAM_SIZE) || state.teamState.length !== state.teamUids.length ||
      !state.teamState.every((entry) => combatant(entry, BattleSides.PLAYER)) || !combatant(state.foeState, BattleSides.FOE)) return false;
    if (!list(state.foes, Rules.MAX_FOES) || !state.foes.length || !state.foes.every((entry) => record(entry) && number(entry.hp))) return false;
    const index = (value) => integer(value, 0, state.foes.length - 1);
    if (!index(state.foeIndex) || !integer(state.activeIndex, 0, state.teamUids.length - 1) ||
      !['training', 'healBetweenFoes', '_pendingFoeAdvance'].every((key) => typeof state[key] === 'boolean')) return false;
    if (![null, 'victory', 'defeat'].includes(state.outcome) ||
      !['playerKOs', 'foeTurns', 'playerAttacks'].every((key) => integer(state[key])) ||
      !['playerCooldownMs', 'foeCooldownMs', 'playerCooldownTotalMs', 'foeCooldownTotalMs'].every((key) => number(state[key], -Rules.MAX_NUMBER))) return false;
    if (state.randomState !== null && !integer(state.randomState, 1, 0xffffffff)) return false;
    if (!list(state.sent) || !list(state.defeated) || !list(state.reserves) || !list(state.defeatedEncounters) ||
      !state.sent.every(index) || !unique(state.sent) || !state.sent.includes(state.foeIndex) ||
      !state.defeated.every((entry) => index(entry) && state.sent.includes(entry)) || !unique(state.defeated) ||
      !state.reserves.every((entry) => record(entry) && index(entry.foeIndex) && !state.sent.includes(entry.foeIndex)) ||
      !unique(state.reserves.map((entry) => entry.foeIndex)) ||
      !state.defeatedEncounters.every((entry) => record(entry) && index(entry.foeIndex) && state.defeated.includes(entry.foeIndex))) return false;
    if (!ids(state.bonuses) || !list(state.switchRequests, state.teamUids.length) || !unique(state.switchRequests) ||
      !state.switchRequests.every((entry) => integer(entry, 0, state.teamUids.length - 1)) ||
      !list(state.log) || !list(state.hits) || !number(state.capturePauseMs)) return false;
    const field = state.field;
    return keys(field, Rules.FIELD_FIELDS) && Object.keys(field).length === Rules.FIELD_FIELDS.length &&
      nullable(field.defaultWeather, Object.values(Weathers)) && nullable(field.weather, Object.values(Weathers)) &&
      (field.weatherTurns === null ? !!field.weather : integer(field.weatherTurns)) &&
      nullable(field.terrain, Object.values(Terrains)) && integer(field.terrainTurns);
  }
}
