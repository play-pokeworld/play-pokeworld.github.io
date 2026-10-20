/**
 * @file DataValidator.js
 * @brief Runs the validation of every game data repository (C++: class DataValidator, static).
 * Used by the test suite (the generated tables must have zero problems) and by the debug tools.
 * Problems are data records, never text (see DataRepository.DataProblem).
 */
import { PokemonDB } from '../pokemon/PokemonDB.js';
import { TalentDB } from '../pokemon/TalentDB.js';
import { MoveDB } from '../battle/MoveDB.js';
import { ItemDB } from '../items/ItemDB.js';
import { MineLootDB } from '../items/MineLootDB.js';
import { TrainingOpponentDB } from '../training/TrainingOpponentDB.js';
import { LocationDB } from '../world/LocationDB.js';
import { QuestDB } from '../quests/QuestDB.js';
import { TrainerDB } from '../trainers/TrainerDB.js';
import { LeagueDB } from '../trainers/LeagueDB.js';
import { ShopDB } from '../shops/ShopDB.js';

export class DataValidator {
  /** @returns {import('./DataRepository.js').DataRepository[]} Every repository, dependencies first */
  static repositories() {
    return [
      TalentDB.getInstance(),
      MoveDB.getInstance(),
      PokemonDB.getInstance(),
      ItemDB.getInstance(),
      MineLootDB.getInstance(),
      TrainingOpponentDB.getInstance(),
      TrainerDB.getInstance(),
      LeagueDB.getInstance(),
      ShopDB.getInstance(),
      LocationDB.getInstance(),
      QuestDB.getInstance()
    ];
  }

  /** @returns {import('./DataRepository.js').DataProblem[]} */
  static validateAll() {
    return DataValidator.repositories().flatMap((repository) => repository.validate());
  }
}
