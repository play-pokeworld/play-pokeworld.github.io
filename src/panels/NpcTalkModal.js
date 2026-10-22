/**
 * @file NpcTalkModal.js
 * @brief Localized NPC choices and dialogue for the current location.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { NpcDirectory } from '../data/world/NpcDirectory.js';
import { NpcQuestCard } from './components/NpcQuestCard.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { LOCAL_QUEST_BATTLE_NPC_ID } from '../config/LocalQuestBattleRules.js';
import { REPEATABLE_BOARD_HELP_LINES } from '../config/NpcDialogueRules.js';
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
    /** @private @type {{locationId:string,questKey:string}|null} */
    this._pendingLocalQuestBattle = null;
    this.listen(LocationChangedEvent, () => {
      if (this.isOpen()) this.close();
    });
  }

  /** @override @param {{locationId?:string,npcId?:string}} [params={}] */
  onEnter({ locationId, npcId } = {}) {
    super.onEnter();
    this._locationId = LocationDB.getInstance().has(locationId)
      ? locationId
      : LocationSystem.getInstance().getCurrentLocationId();
    this._genericConversation = false;
    this._pendingLocalQuestBattle = null;
    const localQuestBattle = npcId === LOCAL_QUEST_BATTLE_NPC_ID
      ? QuestSystem.getInstance().getLocalDefeatBattleState(this._locationId)
      : null;
    if (localQuestBattle) {
      this._selectedNpcId = LOCAL_QUEST_BATTLE_NPC_ID;
      this._pendingLocalQuestBattle = {
        locationId: this._locationId,
        questKey: localQuestBattle.quest.key
      };
      this._render();
      return;
    }
    this._selectedNpcId = NpcDirectory.getById(this._locationId, npcId)?.id ?? null;
    if (this._selectedNpcId && !LocationSystem.getInstance().talkToNpc(this._selectedNpcId)) {
      this._selectedNpcId = null;
    }
    this._render();
  }

  /** @override */
  onExit() {
    const pending = this._pendingLocalQuestBattle;
    super.onExit();
    this._locationId = null;
    this._selectedNpcId = null;
    this._genericConversation = false;
    this._pendingLocalQuestBattle = null;
    if (pending) {
      queueMicrotask(() => QuestSystem.getInstance().requestLocalDefeatBattle(pending.locationId, pending.questKey));
    }
  }

  /** @private */
  _render() {
    this.clearChildren();
    const locationName = t(`location.${this._locationId}`);
    this.addChild(new UIText({
      className: 'pw-npc-talk-location',
      text: t('npc_talk_at_location', { location: locationName })
    }));

    if (this._selectedNpcId === LOCAL_QUEST_BATTLE_NPC_ID) {
      const state = this._pendingLocalQuestBattle
        ? QuestSystem.getInstance().getLocalDefeatBattleState(this._locationId)
        : null;
      const quest = state?.quest.key === this._pendingLocalQuestBattle?.questKey ? state.quest : null;
      const questTitle = quest ? t(`quests.${quest.category}.${quest.id}.title`) : '';
      this.addChildren([
        new UIText({ className: 'pw-npc-talk-speaker', text: t('local_quest_battle_npc_name') }),
        new UIText({
          tagName: 'p',
          className: 'pw-npc-talk-line',
          text: quest
            ? t('local_quest_battle_npc_line', { quest: questTitle })
            : t('quest_battle_none')
        }),
        quest && new UIText({
          className: 'pw-npc-talk-close-hint',
          text: t('local_quest_battle_npc_close_hint')
        }),
        new UIContainer({
          className: 'pw-npc-talk-actions',
          children: [new UIButton({ variant: 'primary', text: t('close_btn'), onClick: () => this.close() })]
        })
      ]);
      return;
    }

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
        const gatedLines = QuestSystem.getInstance().isRepeatableUnlocked()
          ? null
          : REPEATABLE_BOARD_HELP_LINES[npc.id];
        const visibleLines = npc.lines.filter((_, index) => !gatedLines?.includes(index));
        for (const line of visibleLines) {
          this.addChild(new UIText({ tagName: 'p', className: 'pw-npc-talk-line', text: line }));
        }
        if (visibleLines.length === 0) {
          this.addChild(new UIText({ className: 'pw-npc-talk-line', text: t('npc_talk_generic_line') }));
        }
        const questActions = this._npcQuestActions(npc.id);
        if (questActions) this.addChild(questActions);
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

  /** @private @param {string} npcId @returns {UIContainer|null} */
  _npcQuestActions(npcId) {
    const state = QuestSystem.getInstance().getNpcQuestState(npcId);
    if (!state) return null;
    const actions = new UIContainer({ className: 'pw-npc-quest-list' });
    if (state.main) actions.addChild(new NpcQuestCard({ status: state.main, onAccept: () => {} }));
    if (state.side) actions.addChild(new NpcQuestCard({
      status: state.side,
      onAccept: (questKey) => {
        if (QuestSystem.getInstance().accept(questKey)) this._render();
      }
    }));
    if (state.repeatableBoard && state.repeatableUnlocked) {
      actions.addChild(new UIButton({
        variant: 'hbtn',
        icon: 'book',
        text: t('repeatable_board_open'),
        onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.REPEATABLE_QUESTS))
      }));
    }
    return actions.getChildren().length ? actions : null;
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
