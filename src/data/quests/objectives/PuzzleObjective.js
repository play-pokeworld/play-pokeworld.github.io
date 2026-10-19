/**
 * @file PuzzleObjective.js
 * @brief Solve the puzzle `puzzle` (or any puzzle of the quest location when no puzzle is set) while the
 * quest is active (original puzzle: solved during the current run).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { PuzzleSolvedEvent } from '../../../core/events/PuzzleSolvedEvent.js';

export class PuzzleObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.PUZZLE;
  static EVENTS = [PuzzleSolvedEvent];

  /** @override */
  progressFor(event, context) {
    if (this.params.puzzle) return event.puzzleId === this.params.puzzle ? 1 : 0;
    return !this.quest.location || context.sameLocationGroup(event.locationId, this.quest.location) ? 1 : 0;
  }

  /** @override */
  describe() {
    return { count: this.count, puzzle: this.params.puzzle || null, location: this.quest.location || null };
  }
}
