/**
 * @file SecretBaseAccessSystem.js
 * @brief Resolves the legacy Hoenn secret-base milestone from the main quest chain.
 * No persistent flag is introduced; migrated `unlockedSecretBaseHoenn` becomes progress through
 * SecretBaseRules.UNLOCK_QUEST_KEY.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { QuestDB } from '../data/quests/QuestDB.js';
import { SecretBaseRules } from '../config/SecretBaseRules.js';

export class SecretBaseAccessSystem extends BaseSystem {
  /** @private @type {SecretBaseAccessSystem|null} */
  static _instance = null;

  /** @returns {SecretBaseAccessSystem} */
  static getInstance() {
    if (!SecretBaseAccessSystem._instance) SecretBaseAccessSystem._instance = new SecretBaseAccessSystem();
    return SecretBaseAccessSystem._instance;
  }

  constructor() {
    super('SecretBaseAccessSystem', 'System');
  }

  /** @returns {number} First main-step value after completing the unlock quest. */
  getUnlockStep() {
    const chain = QuestDB.getInstance().getMainChain(SecretBaseRules.REGION);
    const index = chain.findIndex((quest) => quest.key === SecretBaseRules.UNLOCK_QUEST_KEY);
    return index < 0 ? Number.POSITIVE_INFINITY : index + 1;
  }

  /** @param {Object|null} [save] @returns {boolean} */
  isUnlocked(save = SaveSystem.getInstance().getCurrentSave()) {
    return !!save && save.quests.getMainStep(SecretBaseRules.REGION) >= this.getUnlockStep();
  }
}
