/**
 * @file PuzzleSystem.js
 * @brief DOM-free rules and rewards for Kanto, Johto, and Hoenn exploration puzzles.
 * Prerequisites and first-clear rewards follow main-reference; replay pays 10% of the listed
 * money (at least ₽200), and a puzzle emits one typed progress event per successful solve.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { PuzzleDB } from '../data/quests/PuzzleDB.js';
import { PuzzleRules } from '../config/PuzzleRules.js';
import { BonusSystem } from './BonusSystem.js';
import { BonusTypes } from '../config/BonusRules.js';
import { PuzzleTypes } from '../config/PuzzleTypes.js';
import { TeamSystem } from './TeamSystem.js';
import { Random } from '../core/Random.js';
import { EventBus } from '../core/EventBus.js';
import { PuzzleSolvedEvent } from '../core/events/PuzzleSolvedEvent.js';
import { grantItem } from './inventory/ItemGrant.js';

export const PuzzleOutcomes = Object.freeze({
  NO_SAVE: 'no-save',
  NOT_FOUND: 'not-found',
  WRONG_LOCATION: 'wrong-location',
  LOCKED: 'locked',
  OPEN: 'open',
  SOLVED: 'solved',
  INVALID_ATTEMPT: 'invalid-attempt',
  INCORRECT: 'incorrect',
  SOLVED_FIRST: 'solved-first',
  SOLVED_AGAIN: 'solved-again'
});

/** @param {*} answer @returns {string} Same normalization used by the original puzzle handler. */
function normalizeAnswer(answer) {
  return String(answer || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9, ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class PuzzleSystem extends BaseSystem {
  /** @private @type {PuzzleSystem|null} */
  static _instance = null;

  /** @returns {PuzzleSystem} */
  static getInstance() {
    if (!PuzzleSystem._instance) PuzzleSystem._instance = new PuzzleSystem();
    return PuzzleSystem._instance;
  }

  constructor() {
    super('PuzzleSystem', 'System');
    /** @private @type {Random} */
    this._random = Random.default;
  }

  /** @param {Random} random */
  setRandom(random) {
    if (random && typeof random.int === 'function') this._random = random;
  }

  /** @param {string} puzzleId @returns {Readonly<Object>|null} */
  getPuzzle(puzzleId) {
    return PuzzleDB.getInstance().getById(puzzleId);
  }

  /** @param {string} locationId @returns {Array<{puzzle:Readonly<Object>,status:string}>} */
  getPuzzlesAtLocation(locationId) {
    return PuzzleDB.getInstance().getByLocation(locationId)
      .map((puzzle) => ({ puzzle, status: this.getStatus(puzzle.id) }));
  }

  /** @param {string} puzzleId @returns {string} */
  getStatus(puzzleId) {
    const puzzle = this.getPuzzle(puzzleId);
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!puzzle) return PuzzleOutcomes.NOT_FOUND;
    if (!save) return PuzzleOutcomes.NO_SAVE;
    if (!puzzle.requires.every((requiredId) => save.statistics.solvedPuzzles.includes(requiredId))) {
      return PuzzleOutcomes.LOCKED;
    }
    return save.statistics.solvedPuzzles.includes(puzzleId) ? PuzzleOutcomes.SOLVED : PuzzleOutcomes.OPEN;
  }

  /** @param {string} puzzleId @returns {ReadonlyArray<Object>} Shuffled sequence options. */
  getShuffledOptions(puzzleId) {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle || puzzle.type !== PuzzleTypes.SEQUENCE) return [];
    const result = [...puzzle.options];
    for (let index = result.length - 1; index > 0; index--) {
      const other = this._random.int(0, index);
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  }

  /** @param {string} puzzleId @param {string[]} selectedKeys */
  solveSequence(puzzleId, selectedKeys) {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle || puzzle.type !== PuzzleTypes.SEQUENCE || !Array.isArray(selectedKeys) ||
        selectedKeys.some((key) => typeof key !== 'string')) {
      return { result: PuzzleOutcomes.INVALID_ATTEMPT };
    }
    const correct = selectedKeys.length === puzzle.solutionKeys.length &&
      selectedKeys.every((key, index) => key === puzzle.solutionKeys[index]);
    return correct ? this._complete(puzzle) : this._attemptFailed(puzzle);
  }

  /** @param {string} puzzleId @param {string} answer */
  solveCode(puzzleId, answer) {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle || ![PuzzleTypes.CODE, PuzzleTypes.BRAILLE].includes(puzzle.type) || typeof answer !== 'string') {
      return { result: PuzzleOutcomes.INVALID_ATTEMPT };
    }
    const normalized = normalizeAnswer(answer);
    const correct = this._isAcceptedAnswer(puzzle, normalized);
    return normalized.length > 0 && correct
      ? this._complete(puzzle)
      : this._attemptFailed(puzzle);
  }

  /**
   * Completes a wait puzzle after the player has remained in its interaction for long enough.
   * @param {string} puzzleId
   * @param {number} startedAtMs
   */
  solveWait(puzzleId, startedAtMs) {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle || puzzle.type !== PuzzleTypes.WAIT || !Number.isFinite(Number(startedAtMs))) {
      return { result: PuzzleOutcomes.INVALID_ATTEMPT };
    }
    const preflight = this._preflight(puzzle);
    if (preflight) return { result: preflight };
    const startedAt = Number(startedAtMs);
    const elapsed = Date.now() - startedAt;
    if (startedAt <= 0 || startedAt > Date.now() || elapsed < puzzle.waitSeconds * 1000) {
      return { result: PuzzleOutcomes.INCORRECT, puzzle, remainingMs: Math.max(0, puzzle.waitSeconds * 1000 - elapsed) };
    }
    return this._complete(puzzle);
  }

  /** @param {string} puzzleId */
  solveParty(puzzleId) {
    const puzzle = this.getPuzzle(puzzleId);
    if (!puzzle || puzzle.type !== PuzzleTypes.PARTY) return { result: PuzzleOutcomes.INVALID_ATTEMPT };
    const preflight = this._preflight(puzzle);
    if (preflight) return { result: preflight };
    const teamSpecies = new Set(TeamSystem.getInstance().getTeam().map((pokemon) => pokemon.species));
    const ready = puzzle.partyNeed.every((speciesId) => teamSpecies.has(speciesId));
    return ready ? this._complete(puzzle) : { result: PuzzleOutcomes.INCORRECT, puzzle };
  }

  /** @private @param {Readonly<Object>} puzzle @param {string} answer */
  _isAcceptedAnswer(puzzle, answer) {
    if (puzzle.dynamicAnswer === PuzzleRules.DYNAMIC_ANSWER_REGI_SEALS_PARTIAL) {
      const solved = SaveSystem.getInstance().getCurrentSave()?.statistics.solvedPuzzles || [];
      const completedSeals = Number(solved.includes('regirock_name')) + Number(solved.includes('registeel_name'));
      const expected = String(6 + completedSeals);
      return answer === expected || answer === expected.padStart(2, '0');
    }
    return puzzle.acceptedAnswers.map(normalizeAnswer).includes(answer);
  }

  /** @private @param {Readonly<Object>} puzzle */
  _attemptFailed(puzzle) {
    const preflight = this._preflight(puzzle);
    if (preflight) return { result: preflight };
    return { result: PuzzleOutcomes.INCORRECT, puzzle };
  }

  /** @private @param {Readonly<Object>} puzzle */
  _complete(puzzle) {
    const preflight = this._preflight(puzzle);
    if (preflight) return { result: preflight };
    const save = SaveSystem.getInstance().getCurrentSave();
    const firstTime = !save.statistics.solvedPuzzles.includes(puzzle.id);
    const listedMoney = Number(puzzle.rewards.money) || PuzzleRules.REPLAY_FALLBACK_BASE_MONEY;
    const baseMoney = firstTime
      ? listedMoney
      : Math.max(PuzzleRules.REPLAY_MIN_MONEY, Math.floor(listedMoney * PuzzleRules.REPLAY_MONEY_RATE));
    const money = BonusSystem.getInstance().applyMultiplier(baseMoney, BonusTypes.MONEY);
    const items = {};
    let overflowMoney = 0;

    save.currencies.add(BonusTypes.MONEY, money);
    if (firstTime) {
      for (const [itemId, quantity] of Object.entries(puzzle.rewards.items)) {
        const grant = grantItem(save, itemId, quantity, { deferSave: true });
        if (grant.added > 0) items[itemId] = grant.added;
        overflowMoney += grant.money;
      }
    }

    save.statistics.recordPuzzle(puzzle.id);
    EventBus.getInstance().dispatch(new PuzzleSolvedEvent(puzzle.id, puzzle.locationId, {
      deferSave: true,
      firstTime
    }));
    SaveSystem.getInstance().saveCurrent();
    return {
      result: firstTime ? PuzzleOutcomes.SOLVED_FIRST : PuzzleOutcomes.SOLVED_AGAIN,
      puzzle,
      firstTime,
      money: money + overflowMoney,
      items
    };
  }

  /** @private @param {Readonly<Object>} puzzle @returns {string|null} */
  _preflight(puzzle) {
    if (!SaveSystem.getInstance().getCurrentSave()) return PuzzleOutcomes.NO_SAVE;
    if (LocationSystem.getInstance().getCurrentLocationId() !== puzzle.locationId) return PuzzleOutcomes.WRONG_LOCATION;
    if (!puzzle.requires.every((requiredId) => SaveSystem.getInstance().getCurrentSave().statistics.solvedPuzzles.includes(requiredId))) {
      return PuzzleOutcomes.LOCKED;
    }
    return null;
  }
}
