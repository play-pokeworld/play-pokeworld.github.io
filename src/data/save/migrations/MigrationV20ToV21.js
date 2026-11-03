/**
 * @file MigrationV20ToV21.js
 * @brief Adds the save-card portrait (`player.avatarPokemonUid`) — the Pokémon shown on a save card.
 *
 * Before 1.16.9 the card showed the lead Pokémon of the team, unless the player had picked an NPC
 * portrait in the settings (that choice took precedence). The main game shows an owned Pokémon there,
 * chosen by the player, so the NPC portrait is dropped from the card and the choice is stored as an
 * owned-Pokémon uid.
 *
 * Existing saves must keep the exact Pokémon they display today: the migration therefore seeds the
 * field with the lead team member (the old default), then with the first owned Pokémon. `''` means
 * "never chosen": the card applies the same fallback at render time, so a save whose Pokémon are all
 * released still renders something sensible instead of breaking.
 */
export const MigrationV20ToV21 = Object.freeze({
  from: 20,
  to: 21,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const player = source.player && typeof source.player === 'object' ? source.player : {};
    /** Owned Pokémon are serialized as a flat array, each entry carrying its own uid. */
    const owned = Array.isArray(source.collection) ? source.collection : [];
    const isOwned = (uid) => typeof uid === 'string' && uid !== '' && owned.some((entry) => entry && entry.uid === uid);
    const team = Array.isArray(source.team) ? source.team : [];
    const lead = team.find((uid) => isOwned(uid));
    const firstOwned = owned.length > 0 && owned[0] && typeof owned[0].uid === 'string' ? owned[0].uid : '';
    const chosen = isOwned(player.avatarPokemonUid) ? player.avatarPokemonUid : '';
    return {
      ...source,
      version: 21,
      player: {
        ...player,
        avatarPokemonUid: chosen || lead || firstOwned || ''
      }
    };
  }
});
