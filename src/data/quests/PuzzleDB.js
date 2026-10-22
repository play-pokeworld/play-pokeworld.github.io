/**
 * @file PuzzleDB.js
 * @brief Read-only repository of exploration puzzle definitions.
 * Puzzle state is stored in StatisticsData; localized text lives in the en/fr puzzles domains.
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { KANTO_PUZZLES } from '../content/KantoPuzzleContent.js';
import { JOHTO_HOENN_PUZZLES } from '../content/JohtoHoennPuzzleContent.js';
import { LocationDB } from '../world/LocationDB.js';
import { ItemDB } from '../items/ItemDB.js';
import { PokemonDB } from '../pokemon/PokemonDB.js';
import { LocalizationManager } from '../../localization/LocalizationManager.js';
import { IconRegistry } from '../../ui/icons/IconRegistry.js';
import { PuzzleTypes } from '../../config/PuzzleTypes.js';
import { PuzzleRules } from '../../config/PuzzleRules.js';

export class PuzzleDB extends DataRepository {
  /** @type {PuzzleDB|null} */
  static _instance = null;

  /** @returns {PuzzleDB} */
  static getInstance() {
    if (!PuzzleDB._instance) PuzzleDB._instance = new PuzzleDB();
    return PuzzleDB._instance;
  }

  constructor() {
    super('PuzzleDB');
  }

  /** @protected @override */
  _build() {
    for (const definition of [...KANTO_PUZZLES, ...JOHTO_HOENN_PUZZLES]) {
      this._entries.set(definition.id, deepFreeze({ ...definition }));
    }
  }

  /** @param {string} locationId @returns {Readonly<Object>[]} */
  getByLocation(locationId) {
    return this.getAll().filter((puzzle) => puzzle.locationId === locationId);
  }

  /** @override */
  validate() {
    const problems = [];
    const locations = LocationDB.getInstance();
    const items = ItemDB.getInstance();
    const species = PokemonDB.getInstance();
    const localization = LocalizationManager.getInstance();
    for (const puzzle of this._entries.values()) {
      if (!locations.has(puzzle.locationId)) problems.push(this._problem(puzzle.id, 'locationId', puzzle.locationId));
      if (locations.getById(puzzle.locationId)?.region !== puzzle.region) problems.push(this._problem(puzzle.id, 'region', puzzle.region));
      if (puzzle.icon && !IconRegistry.has(puzzle.icon)) problems.push(this._problem(puzzle.id, 'icon', puzzle.icon));
      if (!Object.values(PuzzleTypes).includes(puzzle.type)) problems.push(this._problem(puzzle.id, 'type', puzzle.type));
      for (const key of [puzzle.titleKey, puzzle.summaryKey, puzzle.clueKey, puzzle.successTextKey]) {
        if (!localization.has(key)) problems.push(this._problem(puzzle.id, 'localization', key));
      }
      for (const prerequisite of puzzle.requires || []) {
        if (!this.has(prerequisite)) problems.push(this._problem(puzzle.id, 'requires', prerequisite));
      }
      if (puzzle.type === PuzzleTypes.SEQUENCE) {
        const options = Array.isArray(puzzle.options) ? puzzle.options : [];
        const optionKeys = new Set(options.map((option) => option.key));
        if (!Array.isArray(puzzle.solutionKeys) || !puzzle.solutionKeys.length || puzzle.solutionKeys.some((key) => !optionKeys.has(key))) {
          problems.push(this._problem(puzzle.id, 'solutionKeys', puzzle.solutionKeys));
        }
        for (const option of options) {
          if (!localization.has(option.labelKey)) problems.push(this._problem(puzzle.id, 'options.labelKey', option.labelKey));
        }
      }
      if ([PuzzleTypes.CODE, PuzzleTypes.BRAILLE].includes(puzzle.type) && !puzzle.acceptedAnswers?.length) {
        problems.push(this._problem(puzzle.id, 'acceptedAnswers', puzzle.acceptedAnswers));
      }
      if (puzzle.type === PuzzleTypes.BRAILLE && !puzzle.brailleCells?.length) {
        problems.push(this._problem(puzzle.id, 'brailleCells', puzzle.brailleCells));
      }
      if (puzzle.type === PuzzleTypes.WAIT && !(Number(puzzle.waitSeconds) > 0)) {
        problems.push(this._problem(puzzle.id, 'waitSeconds', puzzle.waitSeconds));
      }
      if (puzzle.type === PuzzleTypes.PARTY) {
        if (!Array.isArray(puzzle.partyNeed) || puzzle.partyNeed.length === 0) {
          problems.push(this._problem(puzzle.id, 'partyNeed', puzzle.partyNeed));
        } else {
          for (const speciesId of puzzle.partyNeed) {
            if (!species.has(speciesId)) problems.push(this._problem(puzzle.id, 'partyNeed', speciesId));
          }
        }
      }
      if (puzzle.dynamicAnswer && puzzle.dynamicAnswer !== PuzzleRules.DYNAMIC_ANSWER_REGI_SEALS_PARTIAL) {
        problems.push(this._problem(puzzle.id, 'dynamicAnswer', puzzle.dynamicAnswer));
      }
      for (const itemId of Object.keys(puzzle.rewards.items)) {
        if (!items.has(itemId)) problems.push(this._problem(puzzle.id, 'rewards.items', itemId));
      }
      if (!(Number(puzzle.rewards.money) > 0)) problems.push(this._problem(puzzle.id, 'rewards.money', puzzle.rewards.money));
    }
    for (const puzzle of this._entries.values()) {
      const seen = new Set([puzzle.id]);
      const visit = (id) => {
        const current = this.getById(id);
        for (const prerequisite of current?.requires || []) {
          if (seen.has(prerequisite)) {
            problems.push(this._problem(puzzle.id, 'requires.cycle', prerequisite));
            return;
          }
          seen.add(prerequisite);
          visit(prerequisite);
          seen.delete(prerequisite);
        }
      };
      visit(puzzle.id);
    }
    return problems;
  }
}
