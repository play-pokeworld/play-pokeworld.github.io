/**
 * @file NpcQuestDirectory.js
 * @brief Read-only links from stable NPC identities to quest content across all regions.
 *
 * NPC identities are stored with localized dialogue records; quest links remain language-neutral.
 */
import { NPC_QUEST_LINKS } from '../content/NpcQuestLinks.js';

export class NpcQuestDirectory {
  /** @param {string} npcId @returns {Readonly<Object>|null} */
  static get(npcId) {
    return NPC_QUEST_LINKS[npcId] || null;
  }

  /** @param {string} questKey @returns {string|null} First mapped NPC id, retained for callers that need one identity. */
  static getNpcIdForQuest(questKey) {
    return this.getNpcIdsForQuest(questKey)[0] ?? null;
  }

  /** @param {string} questKey @returns {ReadonlyArray<string>} All NPCs explicitly linked to a quest. */
  static getNpcIdsForQuest(questKey) {
    if (typeof questKey !== 'string' || !questKey) return Object.freeze([]);
    const ids = [];
    for (const [npcId, link] of Object.entries(NPC_QUEST_LINKS)) {
      if (link.mainQuestKey === questKey || link.sideQuestKey === questKey) ids.push(npcId);
    }
    return Object.freeze(ids);
  }

  /** @returns {ReadonlyArray<string>} */
  static getIds() {
    return Object.freeze(Object.keys(NPC_QUEST_LINKS));
  }
}
