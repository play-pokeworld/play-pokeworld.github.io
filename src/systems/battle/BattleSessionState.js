/**
 * @file BattleSessionState.js
 * @brief Captures/restores a finite BattleSession without replaying start or entry effects.
 * Owned Pokémon are uid references. Only generated NPCs are stored as Pokémon snapshots.
 */
import { BattleSnapshotValidator } from './BattleSnapshotValidator.js';
import { BattleSnapshotRules } from '../../config/BattleSnapshotRules.js';
import { SaveValues } from '../../data/core/SaveValues.js';
import { PokemonData } from '../../data/pokemon/PokemonData.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';

/** @param {Object} source @param {string[]} keys @returns {Object} */
const pick = (source, keys) => Object.fromEntries(keys.map((key) => [key, SaveValues.copy(source[key])]));
/** @param {Object} combatant @returns {Object} */
const combatantState = (combatant) => ({ ...pick(combatant, BattleSnapshotRules.COMBATANT_FIELDS),
  usedTriggers: [...combatant.usedTriggers] });
/** @param {Object} combatant @param {Object} state */
const applyCombatant = (combatant, state) => {
  for (const key of BattleSnapshotRules.COMBATANT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(state, key)) combatant[key] = SaveValues.copy(state[key]);
  }
  combatant.usedTriggers = new Set(SaveValues.ids(state.usedTriggers));
  combatant._talentEffects = null;
};

export class BattleSessionState {
  /** @param {Object} session @returns {Object|null} */
  static capture(session) {
    if (session._nextFoeFactory) return null; // Infinite overworld encounters are not persisted here.
    const foes = [...new Set([...session.sentFoes, ...session._reserves.map((entry) => entry.pokemon)])];
    return {
      version: BattleSnapshotRules.VERSION,
      ...pick(session, BattleSnapshotRules.SESSION_FIELDS),
      randomState: typeof session.random.getState === 'function' ? session.random.getState() : null,
      teamUids: session.team.map((member) => member.pokemon.uid),
      teamState: session.team.map(combatantState),
      foes: foes.map((pokemon) => pokemon.serialize()),
      foeIndex: foes.indexOf(session.foe.pokemon),
      foeState: combatantState(session.foe),
      sent: session.sentFoes.map((pokemon) => foes.indexOf(pokemon)),
      defeated: session.defeatedFoes.map((pokemon) => foes.indexOf(pokemon)),
      reserves: session._reserves.map((entry) => ({
        foeIndex: foes.indexOf(entry.pokemon), intro: SaveValues.copy(entry.intro), announceOnly: entry.announceOnly === true
      })),
      defeatedEncounters: session.defeatedEncounters.map(({ pokemon, ...entry }) => ({
        ...SaveValues.copy(entry), foeIndex: foes.indexOf(pokemon)
      })),
      field: { defaultWeather: session.field.defaultWeather, weather: session.field.weather,
        weatherTurns: session.field.weatherTurns === Infinity ? null : session.field.weatherTurns,
        terrain: session.field.terrain, terrainTurns: session.field.terrainTurns },
      bonuses: [...session.bonuses],
      switchRequests: [...session._switchRequests].map((member) => session.team.indexOf(member)),
      log: SaveValues.copy(session.log.entries),
      hits: SaveValues.copy(session._hits),
      capturePauseMs: Math.max(0, session._capturePauseUntil - Date.now())
    };
  }

  /**
   * Checks references before constructing any battle object. A malformed DTO never mutates
   * collection HP or the input save. Runtime functions are always supplied by the caller.
   * @param {Object} state @param {(uid:string)=>Object|null} resolvePokemon @returns {Object|null}
   */
  static prepare(state, resolvePokemon) {
    if (!BattleSnapshotValidator.isValid(state)) return null;
    const team = state.teamUids.map(resolvePokemon);
    if (team.some((pokemon) => !pokemon) || state.foes.some((raw) => !PokemonDB.getInstance().has(raw.species))) return null;
    const foes = state.foes.map((raw) => new PokemonData(raw));
    // PokemonData correctly clamps owned HP to base stats. NPCs may have a temporary battle
    // HP multiplier, so validate against that scale and restore their saved HP afterwards.
    for (let index = 0; index < foes.length; index++) {
      const maximum = Math.round(foes[index].getMaxHp() * (index === state.foeIndex ? state.foeState.hpMultiplier : 1));
      if (state.foes[index].hp > maximum) return null;
      foes[index].hp = state.foes[index].hp;
    }
    return { team, foe: foes[state.foeIndex], foes,
      reserves: state.reserves.map((entry) => ({ pokemon: foes[entry.foeIndex],
        intro: SaveValues.copy(entry.intro), announceOnly: entry.announceOnly === true })) };
  }

  /** @param {Object} session @param {Object} state @param {Object} prepared */
  static apply(session, state, prepared) {
    for (const key of BattleSnapshotRules.SESSION_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(state, key)) session[key] = SaveValues.copy(state[key]);
    }
    session.team.forEach((member, index) => applyCombatant(member, state.teamState[index]));
    applyCombatant(session.foe, state.foeState);
    session.sentFoes = state.sent.map((index) => prepared.foes[index]);
    session.defeatedFoes = state.defeated.map((index) => prepared.foes[index]);
    session.defeatedEncounters = (state.defeatedEncounters || []).map(({ foeIndex, ...entry }) => ({
      ...SaveValues.copy(entry), pokemon: prepared.foes[foeIndex]
    })).filter((entry) => entry.pokemon);
    session.bonuses = new Set(SaveValues.ids(state.bonuses));
    session._switchRequests = new Set((state.switchRequests || []).map((index) => session.team[index]).filter(Boolean));
    for (const key of BattleSnapshotRules.FIELD_FIELDS) session.field[key] = state.field[key];
    if (state.field.weatherTurns === null) session.field.weatherTurns = Infinity;
    session._capturePauseUntil = state.capturePauseMs > 0 ? Date.now() + state.capturePauseMs : 0;
    session.log.entries = SaveValues.copy(state.log) || [];
    session._hits = SaveValues.copy(state.hits) || [];
  }
}
