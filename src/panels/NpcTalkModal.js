/**
 * @file NpcTalkModal.js
 * @brief Localized NPC choices and dialogue for the current location.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { NpcDirectory } from '../data/world/NpcDirectory.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { t } from '../localization/LocalizationManager.js';

export class NpcTalkModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.NPC_TALK,
      title: t('npc_talk_title'),
      size: 'sm',
      bodyClassName: 'pw-npc-talk',
      name: 'NpcTalkModal'
    });
    /** @private @type {string|null} */
    this._locationId = null;
    /** @private @type {string|null} */
    this._selectedNpcId = null;
    /** @private @type {boolean} */
    this._genericConversation = false;
    this.listen(LocationChangedEvent, () => {
      if (this.isOpen()) this.close();
    });
  }

  /** @override @param {{locationId?:string}} [params={}] */
  onEnter({ locationId } = {}) {
    super.onEnter();
    this._locationId = LocationDB.getInstance().has(locationId)
      ? locationId
      : LocationSystem.getInstance().getCurrentLocationId();
    this._selectedNpcId = null;
    this._genericConversation = false;
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._locationId = null;
    this._selectedNpcId = null;
    this._genericConversation = false;
  }

  /** @private */
  _render() {
    this.clearChildren();
    const locationName = t(`location.${this._locationId}`);
    this.addChild(new UIText({
      className: 'pw-npc-talk-location',
      text: t('npc_talk_at_location', { location: locationName })
    }));

    if (this._genericConversation) {
      this.addChildren([
        new UIText({ className: 'pw-npc-talk-speaker', text: t('npc_talk_generic_name') }),
        new UIText({ className: 'pw-npc-talk-line', text: t('npc_talk_generic_line') }),
        this._dialogueActions()
      ]);
      return;
    }

    if (this._selectedNpcId) {
      const npc = NpcDirectory.getById(this._locationId, this._selectedNpcId);
      if (npc) {
        this.addChild(new UIText({ className: 'pw-npc-talk-speaker', text: npc.name }));
        for (const line of npc.lines) {
          this.addChild(new UIText({ tagName: 'p', className: 'pw-npc-talk-line', text: line }));
        }
        if (npc.lines.length === 0) {
          this.addChild(new UIText({ className: 'pw-npc-talk-line', text: t('npc_talk_generic_line') }));
        }
        this.addChild(this._dialogueActions());
        return;
      }
      this._selectedNpcId = null;
    }

    this.addChild(new UIText({ className: 'pw-npc-talk-prompt', text: t('npc_talk_choose') }));
    const npcs = NpcDirectory.getByLocation(this._locationId);
    if (npcs.length === 0) {
      this.addChild(new UIText({ className: 'pw-npc-talk-empty', text: t('npc_talk_empty') }));
      this.addChild(new UIButton({
        variant: 'secondary',
        icon: 'chat',
        text: t('npc_talk_generic'),
        onClick: () => this._talkGenerically()
      }));
    } else {
      const choices = new UIContainer({ className: 'pw-npc-talk-choices' });
      for (const npc of npcs) {
        choices.addChild(new UIButton({
          variant: 'secondary',
          icon: 'chat',
          text: npc.name,
          onClick: () => this._talkTo(npc.id)
        }));
      }
      this.addChild(choices);
    }
    this.addChild(new UIButton({ variant: 'secondary', text: t('close_btn'), onClick: () => this.close() }));
  }

  /** @private @param {string} npcId */
  _talkTo(npcId) {
    if (!LocationSystem.getInstance().talkToNpc(npcId)) return;
    this._selectedNpcId = npcId;
    this._render();
  }

  /** @private */
  _talkGenerically() {
    if (!LocationSystem.getInstance().talkToNpc()) return;
    this._genericConversation = true;
    this._render();
  }

  /** @private @returns {UIContainer} */
  _dialogueActions() {
    return new UIContainer({
      className: 'pw-npc-talk-actions',
      children: [
        new UIButton({ variant: 'secondary', text: t('npc_talk_back'), onClick: () => {
          this._selectedNpcId = null;
          this._genericConversation = false;
          this._render();
        } }),
        new UIButton({ variant: 'secondary', text: t('close_btn'), onClick: () => this.close() })
      ]
    });
  }
}
