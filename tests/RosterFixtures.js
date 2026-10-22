/**
 * @file RosterFixtures.js
 * @brief Test helpers for the schema 16 Pokémon model: one owned collection, the party and the
 * daycare referencing it by uid. Fixtures build rosters through the save data API instead of
 * assigning the derived `save.team` getter.
 */
import { PokemonCollectionData } from '../src/data/save/PokemonCollectionData.js';
import { TeamMembersData } from '../src/data/save/TeamMembersData.js';

/**
 * Replaces the whole owned collection: `team` members form the party (in order), `others` are
 * owned Pokémon outside the party (shown by the PC with the party).
 * @param {import('../src/data/save/SaveData.js').SaveData} save
 * @param {Object[]} [team=[]]
 * @param {Object[]} [others=[]]
 */
export function setRoster(save, team = [], others = []) {
  save.collection = new PokemonCollectionData();
  for (const pokemon of [...team, ...others]) {
    if (!save.collection.add(pokemon)) throw new Error(`fixture Pokémon rejected: ${pokemon?.uid}`);
  }
  save.teamMembers = new TeamMembersData();
  if (!save.teamMembers.setUids(team.map((pokemon) => pokemon.uid))) throw new Error('fixture party rejected');
  for (const [index, slot] of save.hatchery.slots.entries()) {
    if (slot?.kind === 'daycare' && !save.collection.has(slot.pokemonUid)) save.hatchery.setSlot(index, null);
  }
}

/** @param {Object} save @param {Object[]} pokemon - Adds owned Pokémon outside the party */
export function addOwned(save, ...pokemon) {
  for (const entry of pokemon) {
    if (!save.collection.add(entry)) throw new Error(`fixture Pokémon rejected: ${entry?.uid}`);
  }
}

/** @param {Object} save @returns {Object[]} Owned Pokémon used by no party nor daycare slot */
export function storedOnly(save) {
  const daycare = new Set(save.hatchery.getDaycareUids());
  return save.collection.getAll().filter((pokemon) => !save.teamMembers.includes(pokemon.uid) && !daycare.has(pokemon.uid));
}

/** @param {Object} raw - Serialized schema 16 save @returns {Object[]} Party entries of the raw collection */
export function rawTeam(raw) {
  const byUid = new Map((raw.collection ?? []).map((pokemon) => [pokemon.uid, pokemon]));
  return (raw.team ?? []).map((uid) => byUid.get(uid)).filter(Boolean);
}

/** @param {Object} raw @param {number} slotIndex @returns {Object|null} Raw daycare Pokémon of a slot */
export function rawDaycare(raw, slotIndex) {
  const uid = raw.hatchery?.slots?.[slotIndex]?.pokemonUid;
  return (raw.collection ?? []).find((pokemon) => pokemon.uid === uid) ?? null;
}

/** @param {Object} raw @returns {Object[]} Raw collection entries outside the party and daycare */
export function rawStored(raw) {
  const used = new Set([
    ...(raw.team ?? []),
    ...(raw.hatchery?.slots ?? []).filter((slot) => slot?.kind === 'daycare').map((slot) => slot.pokemonUid)
  ]);
  return (raw.collection ?? []).filter((pokemon) => !used.has(pokemon.uid));
}
