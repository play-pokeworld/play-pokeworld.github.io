/**
 * @file TrainerTeamRules.js
 * @brief Picks the team a trainer uses (members as data, not Pokémon yet).
 *  - rematch: `teams.rematch` when the data defines one, else the first-battle team;
 *  - starter variants (`teams.byStarter`, rivals / Champion): the variant of the player's starter,
 *    found like the original getPlayerStarterSpecies(): a starter in the team, else a caught one,
 *    else the first variant.
 */
export class TrainerTeamRules {
  /**
   * @param {Readonly<Object>} trainer - TrainerDB definition
   * @param {Object} options
   * @param {boolean} [options.rematch=false]
   * @param {(species: string) => boolean} [options.inTeam] - Species is in the player team
   * @param {(species: string) => boolean} [options.caught] - Species is in the player Pokédex
   * @returns {Readonly<Object>[]} Members
   */
  static select(trainer, { rematch = false, inTeam = () => false, caught = () => false } = {}) {
    if (rematch && trainer.teams.rematch?.length) return trainer.teams.rematch;
    const variants = Object.keys(trainer.teams.byStarter);
    if (!variants.length) return trainer.teams.default;
    const starter = variants.find(inTeam) ?? variants.find(caught) ?? variants[0];
    return trainer.teams.byStarter[starter];
  }
}
