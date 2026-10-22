/**
 * @file SecretBaseNpcBattleResolvedEvent.js
 * @brief Carries a one-off secret-base NPC battle result without trainer settlement semantics.
 */
import { BaseEvent } from '../BaseEvent.js';

export class SecretBaseNpcBattleResolvedEvent extends BaseEvent {
  static TYPE = 'SecretBaseNpcBattleResolvedEvent';

  /** @param {string} visitId @param {Object} npc @param {boolean} visitorWon @param {boolean} [forfeit=false] */
  constructor(visitId, npc, visitorWon, forfeit = false) {
    super(SecretBaseNpcBattleResolvedEvent.TYPE);
    this.visitId = visitId;
    this.npc = npc;
    this.visitorWon = visitorWon === true;
    this.forfeit = forfeit === true;
  }
}
