/**
 * @file MigrationV15ToV16.js
 * @brief Save migration 15 -> 16: one owned-Pokémon collection referenced by uid.
 *
 * Before: the Pokémon data lived in three places (`team`, `box`, daycare `slot.pokemon`).
 * After:  `collection` holds every owned Pokémon once; `team` is an ordered uid list and a
 *         daycare slot stores `pokemonUid`. `box` is removed: the PC shows the whole collection.
 *
 * Pure function: a Pokémon without uid, or whose uid is already taken, receives a deterministic
 * one so that every Pokémon is kept and can be referenced.
 */

const UID_PREFIX = 'p_v16_';

/** @param {*} value @returns {Object[]} Plain Pokémon objects of a legacy list */
function pokemonList(value) {
  return Array.isArray(value) ? value.filter((pokemon) => pokemon && typeof pokemon === 'object') : [];
}

export const MigrationV15ToV16 = Object.freeze({
  from: 15,
  to: 16,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const { box, ...rest } = source;
    const collection = [];
    const usedUids = new Set();
    /** @param {Object} pokemon @returns {string} uid under which the Pokémon is stored */
    const register = (pokemon) => {
      let uid = typeof pokemon.uid === 'string' && pokemon.uid.trim() ? pokemon.uid.trim() : '';
      for (let suffix = collection.length; !uid || usedUids.has(uid); suffix++) uid = `${UID_PREFIX}${suffix}`;
      usedUids.add(uid);
      collection.push({ ...pokemon, uid });
      return uid;
    };

    const team = pokemonList(source.team).map(register);
    for (const pokemon of pokemonList(box)) register(pokemon);

    const hatcherySource = source.hatchery && typeof source.hatchery === 'object' ? source.hatchery : null;
    const hatchery = hatcherySource
      ? {
        ...hatcherySource,
        slots: (Array.isArray(hatcherySource.slots) ? hatcherySource.slots : []).map((slot) => {
          if (!slot || typeof slot !== 'object') return null;
          const pokemon = slot.pokemon || slot.poke;
          if (slot.kind !== 'daycare' && !(pokemon && !slot.kind)) return { ...slot };
          if (!pokemon || typeof pokemon !== 'object') return null;
          const { pokemon: _pokemon, poke: _poke, ...slotRest } = slot;
          return { ...slotRest, kind: 'daycare', pokemonUid: register(pokemon) };
        })
      }
      : null;

    return {
      ...rest,
      version: 16,
      collection,
      team,
      ...(hatchery ? { hatchery } : {})
    };
  }
});
