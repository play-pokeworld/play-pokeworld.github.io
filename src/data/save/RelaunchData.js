/** @file RelaunchData.js @brief Per-save relaunch ownership/preferences; no transient deadlines are serialized. */
import { BaseModel } from '../core/BaseModel.js';
import { RelaunchRules } from '../../config/RelaunchRules.js';
import { DungeonAutoRules } from '../../config/DungeonAutoRules.js';
export class RelaunchData extends BaseModel {
  constructor(data = {}) {
    super('RelaunchData', 'Data');
    this.deserialize(data);
  }
  /** @override */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    for (const kind of Object.keys(RelaunchRules.UPGRADES)) {
      const source =
        raw[kind] && typeof raw[kind] === 'object' ? raw[kind] : {};
      this[kind] = {
        purchased: source.purchased === true,
        enabled: source.purchased === true && source.enabled !== false,
      };
    }
    this.dungeon.mode = DungeonAutoRules.MODES.includes(raw.dungeon?.mode)
      ? raw.dungeon.mode
      : RelaunchRules.DEFAULT_MODE;
  }
  /** @override */
  serialize() {
    return { wild: { ...this.wild }, dungeon: { ...this.dungeon } };
  }
}
