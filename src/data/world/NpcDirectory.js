/**
 * @file NpcDirectory.js
 * @brief Localized NPC identities and dialogue for a world location.
 *
 * The localization tables are kept as data resources. Stable ids are explicit for interactions
 * that affect progression; locations without explicit ids use a location/index fallback.
 */
import { LocalizationManager } from '../../localization/LocalizationManager.js';

const MAX_NPCS_PER_LOCATION = 64;
const MAX_DIALOGUE_LINES = 32;

export class NpcDirectory {
  /**
   * @param {string} locationId
   * @returns {ReadonlyArray<{id:string,locationId:string,index:number,name:string,lines:ReadonlyArray<string>}>>
   */
  static getByLocation(locationId) {
    if (typeof locationId !== 'string' || !locationId) return [];
    const localization = LocalizationManager.getInstance();
    const entries = [];
    for (let index = 0; index < MAX_NPCS_PER_LOCATION; index++) {
      const baseKey = `npc.${locationId}.${index}`;
      const nameKey = `${baseKey}.name`;
      if (!localization.has(nameKey)) break;
      const idKey = `${baseKey}.id`;
      const id = localization.has(idKey) ? localization.t(idKey) : `${locationId}:${index}`;
      const lines = [];
      for (let lineIndex = 0; lineIndex < MAX_DIALOGUE_LINES; lineIndex++) {
        const lineKey = `${baseKey}.lines.${lineIndex}`;
        if (!localization.has(lineKey)) break;
        lines.push(localization.t(lineKey));
      }
      entries.push(Object.freeze({
        id,
        locationId,
        index,
        name: localization.t(nameKey),
        lines: Object.freeze(lines)
      }));
    }
    return Object.freeze(entries);
  }

  /** @param {string} locationId @param {string} npcId */
  static getById(locationId, npcId) {
    return NpcDirectory.getByLocation(locationId).find((npc) => npc.id === npcId) ?? null;
  }
}
