/**
 * @file QuestObjective.js
 * @brief Base class of the quest objectives (C++: class QuestObjective, abstract).
 *
 * An objective turns game events into quest progress. Each subclass declares:
 *   static TYPE        ObjectiveTypes value it implements;
 *   static EVENTS      event classes that can change its progress (QuestSystem subscribes to
 *                      the union of every EVENTS list, and only asks the matching objectives);
 *   static AUTO_CLAIM  the main quest is claimed as soon as it is complete (talk);
 * and implements ONE of:
 *   progressFor(event, context)  COUNTER objective: progress added by one event (0 = ignored);
 *   stateProgress(context)       STATE objective: progress read from the save (badge owned…).
 *
 * Objectives are stateless: progress is stored in QuestProgressData by QuestSystem.
 * `context` is a QuestContext (read-only view of the save, see systems/quests/QuestContext.js).
 */
export class QuestObjective {
  /** @type {string} */
  static TYPE = '';
  /** @type {Function[]} */
  static EVENTS = [];
  /** @type {boolean} */
  static AUTO_CLAIM = false;

  /**
   * @param {Readonly<Object>} quest - QuestDB definition owning this objective
   */
  constructor(quest) {
    /** @type {Readonly<Object>} */
    this.quest = quest;
    /** @type {Readonly<Object>} the `objective` record of the quest */
    this.params = quest.objective;
  }

  /** @returns {number} Progress needed */
  get count() {
    return Math.max(1, Number(this.params.count) || 1);
  }

  /** @returns {boolean} true for state objectives (stateProgress() is used) */
  isStateBased() {
    return false;
  }

  /**
   * @param {import('../../../core/BaseEvent.js').BaseEvent} event
   * @param {import('../../../systems/quests/QuestContext.js').QuestContext} context
   * @returns {number} Progress added by this event
   */
  progressFor(event, context) {
    return 0;
  }

  /**
   * @param {import('../../../systems/quests/QuestContext.js').QuestContext} context
   * @returns {number} Current progress read from the save
   */
  stateProgress(context) {
    return 0;
  }

  /**
   * Values the objective needs to be displayed (`quest_objective_<type>` localization args).
   * @returns {Object}
   */
  describe() {
    return { count: this.count };
  }
}
