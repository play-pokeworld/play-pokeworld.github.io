/**
 * @file ObjectiveRegistry.js
 * @brief Objective type -> objective class (C++: class ObjectiveRegistry, static factory).
 * Adding an objective type: write the class (static TYPE / EVENTS + progressFor or stateProgress),
 * add it to OBJECTIVE_CLASSES, and map the original quest type in tools/data/gen-quests.mjs.
 */
import { BadgeObjective } from './BadgeObjective.js';
import { BaseEstablishObjective } from './BaseEstablishObjective.js';
import { BaseVisitObjective } from './BaseVisitObjective.js';
import { BossObjective } from './BossObjective.js';
import { CatchObjective } from './CatchObjective.js';
import { DexRegionObjective } from './DexRegionObjective.js';
import { FossilObjective } from './FossilObjective.js';
import { HatchObjective } from './HatchObjective.js';
import { HatcheryLevelObjective } from './HatcheryLevelObjective.js';
import { ItemObjective } from './ItemObjective.js';
import { KillObjective } from './KillObjective.js';
import { MineDigObjective } from './MineDigObjective.js';
import { MineSellObjective } from './MineSellObjective.js';
import { OwnSpeciesObjective } from './OwnSpeciesObjective.js';
import { PuzzleObjective } from './PuzzleObjective.js';
import { RegionWinsObjective } from './RegionWinsObjective.js';
import { TalkObjective } from './TalkObjective.js';
import { TrainingObjective } from './TrainingObjective.js';

/** @type {ReadonlyArray<typeof import('./QuestObjective.js').QuestObjective>} */
const OBJECTIVE_CLASSES = Object.freeze([
  BadgeObjective,
  BaseEstablishObjective,
  BaseVisitObjective,
  BossObjective,
  CatchObjective,
  DexRegionObjective,
  FossilObjective,
  HatchObjective,
  HatcheryLevelObjective,
  ItemObjective,
  KillObjective,
  MineDigObjective,
  MineSellObjective,
  OwnSpeciesObjective,
  PuzzleObjective,
  RegionWinsObjective,
  TalkObjective,
  TrainingObjective
]);

const BY_TYPE = new Map(OBJECTIVE_CLASSES.map((objectiveClass) => [objectiveClass.TYPE, objectiveClass]));

export class ObjectiveRegistry {
  /**
   * @param {Readonly<Object>} quest - QuestDB definition
   * @returns {import('./QuestObjective.js').QuestObjective|null} null for an unknown type
   */
  static create(quest) {
    const objectiveClass = BY_TYPE.get(quest?.objective?.type);
    return objectiveClass ? new objectiveClass(quest) : null;
  }

  /**
   * @param {string} type
   * @returns {boolean}
   */
  static has(type) {
    return BY_TYPE.has(type);
  }

  /** @returns {Function[]} Every event class an objective listens to (deduplicated) */
  static allEvents() {
    return [...new Set(OBJECTIVE_CLASSES.flatMap((objectiveClass) => objectiveClass.EVENTS))];
  }
}
