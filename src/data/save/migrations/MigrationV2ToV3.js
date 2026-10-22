/**
 * @file MigrationV2ToV3.js
 * @brief Save migration 2 -> 3 (v1.3 -> v1.4 data model) (C++: struct MigrationV2ToV3 : SaveMigration).
 *  - Pokémon: derived values dropped (maxHp, maxExp, types, name, sprite); experience becomes a
 *    running total on the original curve; HP keeps its ratio; uid / talent / IVs / EVs added;
 *  - player: badges become badge ids (a v1 badge COUNT cannot be mapped to ids: it is reset —
 *    no rework build ever awarded a badge); totalBadges dropped; legacy portrait file names
 *    ('npcs/Youngster.png') become file stems;
 *  - `saveId` / `slotId` dropped (the library order is the slot order);
 *  - new domains: inventory, quests, statistics;
 *  - a PC box carried from an original export (`box`) gets the same Pokémon conversion.
 */
import { PokemonDB } from '../../pokemon/PokemonDB.js';
import { StatCalculator } from '../../pokemon/StatCalculator.js';
import { ExperienceCurve } from '../../pokemon/ExperienceCurve.js';
import { PokemonFactory } from '../../pokemon/PokemonFactory.js';
import { Random } from '../../../core/Random.js';
import { PokemonRules } from '../../../config/PokemonRules.js';
import { PlayerDefaults } from '../../../config/PlayerDefaults.js';

/**
 * @param {Object} pokemon - v2 team entry
 * @returns {Object} Schema 3 PokemonData
 */
function convertPokemon(pokemon) {
  const species = PokemonDB.getInstance().getById(String(pokemon?.species || '').toLowerCase());
  const level = Math.max(PokemonRules.MIN_LEVEL, Math.min(PokemonRules.MAX_LEVEL, Math.floor(Number(pokemon?.level) || 5)));
  const start = ExperienceCurve.levelStart(level);
  const span = ExperienceCurve.levelStart(level + 1) - start;
  const ratio = (value, max) => (max > 0 ? Math.max(0, Math.min(1, value / max)) : 1);
  const exp = Number.isFinite(pokemon?.totalExp)
    ? Math.max(start, pokemon.totalExp)
    : start + Math.floor(ratio(Number(pokemon?.exp) || 0, Number(pokemon?.maxExp) || 0) * span);
  const shiny = pokemon?.shiny === true;
  const ivs = StatCalculator.clampSpread(pokemon?.ivs, PokemonRules.IV_MAX);
  const evs = StatCalculator.clampSpread(pokemon?.evs, PokemonRules.EV_MAX, PokemonRules.EV_TOTAL_MAX);
  const maxHp = species ? StatCalculator.all(species.baseStats, level, { shiny, ivs, evs }).hp : 1;
  const hpRatio = ratio(Number(pokemon?.hp ?? pokemon?.maxHp) || 0, Number(pokemon?.maxHp) || 0);
  return {
    uid: pokemon?.uid,
    species: species ? species.id : pokemon?.species,
    form: pokemon?.form || '',
    nickname: pokemon?.nickname || '',
    level,
    exp,
    hp: Math.round(maxHp * hpRatio),
    shiny,
    favorite: pokemon?.favorite === true || pokemon?.fav === true,
    locked: pokemon?.locked === true,
    // Deterministic (pure migration): the first common talent of the species.
    talent: pokemon?.talent || (species ? PokemonFactory.rollTalent(species, Random.sequence([0])) : null),
    heldItem: pokemon?.heldItem || null,
    moves: (pokemon?.moves || []).map((move) => (typeof move === 'string' ? move : move?.id)).filter(Boolean),
    ivs,
    evs
  };
}

/** @param {*} raw @returns {Object|undefined} */
function convertHatchery(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const slots = Array.isArray(raw.slots) ? raw.slots.map((slot) => {
    if (!slot || typeof slot !== 'object' || slot.kind !== 'daycare' || !slot.pokemon) return slot ?? null;
    return { ...slot, pokemon: convertPokemon(slot.pokemon) };
  }) : [];
  return { ...raw, slots };
}

/**
 * @param {*} value - Legacy portrait value ('trainer-0.png', 'npcs/Youngster.png', stem)
 * @returns {string}
 */
function portraitStem(value) {
  if (!value) return PlayerDefaults.TRAINER_SPRITE;
  return String(value).replace(/^.*\//, '').replace(/\.png$/i, '') || PlayerDefaults.TRAINER_SPRITE;
}

export const MigrationV2ToV3 = Object.freeze({
  from: 2,
  to: 3,
  /**
   * @param {Object} raw
   * @returns {Object}
   */
  migrate(raw) {
    const { saveId, slotId, ...rest } = raw;
    const player = raw.player || {};
    return {
      ...rest,
      id: raw.id || saveId,
      version: 3,
      player: {
        trainerName: player.trainerName,
        trainerSprite: portraitStem(player.trainerSprite || player.profileIcon || player.trainerAvatar),
        region: player.region,
        location: player.location,
        playTimeSeconds: player.playTimeSeconds,
        badges: Array.isArray(player.badges) ? player.badges : []
      },
      team: (raw.team || []).map(convertPokemon),
      ...(Array.isArray(raw.box) ? { box: raw.box.map(convertPokemon) } : {}),
      ...(raw.hatchery ? { hatchery: convertHatchery(raw.hatchery) } : {}),
      inventory: raw.inventory || {},
      quests: raw.quests || {},
      statistics: raw.statistics || {}
    };
  }
});
