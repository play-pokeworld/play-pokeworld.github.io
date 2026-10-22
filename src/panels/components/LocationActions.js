/**
 * @file LocationActions.js
 * @brief Location action tiles assembled from location data and read-only system queries.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIActionTile, ActionTileVariants } from '../../ui/UIActionTile.js';
import { BattleSystem } from '../../systems/BattleSystem.js';
import { DungeonSystem } from '../../systems/DungeonSystem.js';
import { TrainerSystem } from '../../systems/TrainerSystem.js';
import { ShopSystem } from '../../systems/ShopSystem.js';
import { QuestSystem } from '../../systems/QuestSystem.js';
import { PuzzleSystem, PuzzleOutcomes } from '../../systems/PuzzleSystem.js';
import { SecretBaseSystem } from '../../systems/SecretBaseSystem.js';
import { ChallengeStates } from '../../systems/trainers/ChallengeStates.js';
import { DungeonRules } from '../../config/DungeonRules.js';
import { ModalIds } from '../../config/ModalIds.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { LocationKinds } from '../../data/world/LocationKinds.js';
import { NpcDirectory } from '../../data/world/NpcDirectory.js';
import { NpcQuestDirectory } from '../../data/quests/NpcQuestDirectory.js';
import { PuzzleDB } from '../../data/quests/PuzzleDB.js';
import { LOCAL_QUEST_BATTLE_NPC_ID } from '../../config/LocalQuestBattleRules.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

export class LocationActions extends UIContainer {
  /**
   * @param {Readonly<Object>|null} location - LocationDB definition
   * @param {number} encounterCount - Regular wild encounter entries at the location
   * @param {boolean} [hasRoamingEncounter=false] - Whether an active roaming Pokémon is here
   * @param {{quest:Readonly<Object>,progress:number,count:number,remaining:number}|null} [localQuestBattle=null]
   */
  constructor(location, encounterCount, hasRoamingEncounter = false, localQuestBattle = null) {
    super({ className: 'pw-loc-action-grid', name: 'LocationActions' });
    if (!location) return;

    for (const npc of NpcDirectory.getByLocation(location.id)) {
      this.addChild(LocationActions._npcTile(location, npc));
    }

    if (localQuestBattle) {
      const npcName = t('local_quest_battle_npc_name');
      const quest = localQuestBattle.quest;
      const title = t(`quests.${quest.category}.${quest.id}.title`);
      const tile = new UIActionTile({
        text: t('local_quest_battle_npc_action', { quest: title }),
        icon: 'chat',
        variant: ActionTileVariants.NPC,
        onClick: () => EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.NPC_TALK, {
            locationId: location.id,
            npcId: LOCAL_QUEST_BATTLE_NPC_ID
          })
        )
      });
      tile.setAttribute('data-npc-id', LOCAL_QUEST_BATTLE_NPC_ID);
      tile.setAttribute('data-quest-key', quest.key);
      const accessibleLabel = t('npc_action_talk_aria', { name: `${npcName} — ${title}` });
      tile.setAttribute('aria-label', accessibleLabel);
      tile.setTooltip(accessibleLabel);
      this.addChild(tile);
    }

    const secretBase = SecretBaseSystem.getInstance();
    if (secretBase.canUseAt(location.id)) {
      const base = secretBase.getBase();
      const baseLocationId = secretBase.getBaseLocationId();
      for (const layoutId of secretBase.getAlcoveLayoutIds(location.id)) {
        const ownRoom = base?.isEstablished?.() && baseLocationId === location.id && base.layoutId === layoutId;
        const roomName = t(`win.layout.${layoutId}`);
        const action = new UIActionTile({
          text: ownRoom
            ? t('action.visit_base', { name: roomName })
            : t('action.preview_alcove', { name: roomName }),
          icon: ownRoom ? 'home' : 'door',
          variant: ownRoom ? ActionTileVariants.QUEST : ActionTileVariants.DEFAULT,
          onClick: () => {
            const result = ownRoom
              ? secretBase.startOwnVisit()
              : secretBase.startAlcoveVisit(location.id, layoutId);
            if (result.ok) EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SECRET_BASE_VISIT));
          }
        });
        action.setAttribute('data-secret-base-layout', layoutId);
        this.addChild(action);
      }
    }

    if (location.kind === LocationKinds.DUNGEON) {
      const dungeon = DungeonSystem.getInstance();
      const run = dungeon.getRun();
      const elsewhere = run?.active && run.locationId !== location.id;
      const inProgressHere = run?.active && run.locationId === location.id;
      const toll = dungeon.entryToll(location.id);
      const depth = DungeonRules.depthFor(location.badgesRequired, location.id);
      const entryLabel = depth > 1
        ? t('dungeon_enter_btn', { depth: String(depth) })
        : t('dungeon_enter_btn_single');
      const label = elsewhere
        ? t('dungeon_other_run_action')
        : inProgressHere
          ? t('dungeon_resume_action')
          : toll > 0
            ? entryLabel
            : t('explore_btn');
      const richText = !run?.active && toll > 0
        ? `${entryLabel} — {dungeonToken} ${TextFormatter.formatNumber(toll)}`
        : null;
      this.addChild(new UIActionTile({
        text: label,
        ...(richText ? { richText } : {}),
        icon: 'sparkle',
        variant: elsewhere ? ActionTileVariants.DEFAULT : ActionTileVariants.DUNGEON,
        // DungeonSystem is the Rework boundary for both a paid entry and a same-place resume.
        onClick: elsewhere ? null : () => dungeon.enter(location.id)
      }));
    } else if (location.kind !== LocationKinds.TOWN && (encounterCount > 0 || hasRoamingEncounter)) {
      this.addChild(new UIActionTile({
        text: t('explore_btn'),
        icon: 'swords',
        onClick: () => BattleSystem.getInstance().startBattle(location.id)
      }));
    }

    const puzzles = PuzzleDB.getInstance().getByLocation(location.id);
    if (puzzles.length > 0) {
      const solved = PuzzleSystem.getInstance().getPuzzlesAtLocation(location.id)
        .filter(({ status }) => status === PuzzleOutcomes.SOLVED).length;
      this.addChild(new UIActionTile({
        text: t('loc_puzzle_progress_action', { done: solved, total: puzzles.length }),
        icon: 'bookOpen',
        variant: ActionTileVariants.QUEST,
        onClick: () => EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.PUZZLES, { locationId: location.id })
        )
      }));
    }

    if (location.shop) this.addChild(LocationActions._shopTile(location));
    if (location.champion) {
      const tile = LocationActions._championTile(location);
      if (tile) this.addChild(tile);
    }
  }

  /** @private @param {Readonly<Object>} location @param {Readonly<Object>} npc */
  static _npcTile(location, npc) {
    const questState = QuestSystem.getInstance().getNpcQuestState(npc.id);
    const link = NpcQuestDirectory.get(npc.id);
    const linkedCategory = link?.sideQuestKey ? 'side' : link?.mainQuestKey ? 'main' : null;
    const linkedStatus = linkedCategory ? questState?.[linkedCategory] ?? null : null;
    const sourceState = linkedStatus?.state ?? (linkedCategory ? 'offer' : null);
    let badgeIcon = null;
    let badgeKind = '';
    let questBadge = null;
    let statusLabel = null;
    let icon = 'chat';

    if (linkedCategory === 'side') {
      // The reference gives an NPC's side-quest link precedence over mainTalk.
      // A ready-but-unclaimed side quest remains an active side quest indicator.
      if (sourceState === 'completed') {
        badgeIcon = 'check';
        badgeKind = 'completed';
        questBadge = 'completed';
        statusLabel = t('npc_quest_completed');
      } else if (sourceState === 'active' || sourceState === 'ready') {
        badgeIcon = 'hourglass';
        badgeKind = 'active';
        questBadge = 'active';
        statusLabel = t('npc_quest_active');
      } else {
        badgeIcon = 'exclamation';
        badgeKind = 'offer';
        questBadge = 'offer';
        statusLabel = t('npc_quest_offer');
      }
    } else if (linkedCategory === 'main') {
      // mainTalk is an offer marker until claimed; it is not a side-quest timer.
      if (sourceState === 'completed') {
        badgeIcon = 'check';
        badgeKind = 'completed';
        questBadge = 'completed';
        statusLabel = t('npc_quest_completed');
      } else {
        badgeIcon = 'exclamation';
        badgeKind = 'offer';
        questBadge = 'offer';
        statusLabel = t('npc_quest_offer');
      }
    }

    const accessibleLabel = statusLabel
      ? t('npc_action_person_status', { name: npc.name, status: statusLabel })
      : t('npc_action_talk_aria', { name: npc.name });
    const tile = new UIActionTile({
      text: npc.name,
      icon,
      variant: ActionTileVariants.NPC,
      status: badgeIcon ? {
        icon: badgeIcon,
        className: badgeKind ? `pw-loc-action-status--${badgeKind}` : ''
      } : null,
      onClick: () => EventBus.getInstance().dispatch(
        new ModalOpenRequestedEvent(ModalIds.NPC_TALK, { locationId: location.id, npcId: npc.id })
      )
    });
    tile.setAttribute('data-npc-id', npc.id);
    if (linkedCategory) tile.setAttribute('data-quest-category', linkedCategory);
    if (sourceState) tile.setAttribute('data-quest-state', sourceState);
    if (questBadge) tile.setAttribute('data-quest-badge', questBadge);
    if (linkedCategory) tile.addClass(questBadge === 'completed' ? 'pw-npc-done' : `pw-npc-quest-${questBadge}`);
    tile.setAttribute('aria-label', accessibleLabel);
    tile.setTooltip(accessibleLabel);
    return tile;
  }

  /** @private @param {Readonly<Object>} location */
  static _shopTile(location) {
    if (ShopSystem.getInstance().isLocked(location.id)) {
      return new UIActionTile({ text: t('loc_shop_locked_label', { shop: t('tab_shop'), locked: t('locked') }), icon: 'store' });
    }
    return new UIActionTile({
      text: t('tab_shop'),
      icon: 'store',
      onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SHOP))
    });
  }

  /** @private @param {Readonly<Object>} location */
  static _championTile(location) {
    const trainers = TrainerSystem.getInstance();
    const challenge = trainers.getChallenge(location.champion);
    if (!challenge) return null;
    const prefix = challenge.league ? 'league' : 'arena';
    const champion = t(`trainer.${challenge.id}.name`);
    if (challenge.state === ChallengeStates.LOCKED) {
      return new UIActionTile({ text: t(`${prefix}_locked_label`, { champion, badges: challenge.badgesRequired }), icon: 'trophy' });
    }
    const rematch = challenge.state === ChallengeStates.REMATCH;
    return new UIActionTile({
      text: t(`${prefix}_${rematch ? 'rematch' : 'challenge'}_label`, { champion }),
      icon: rematch ? 'refresh' : 'swords',
      variant: rematch ? ActionTileVariants.GYM : ActionTileVariants.DEFAULT,
      onClick: () => trainers.challenge(challenge.id, { locationId: location.id })
    });
  }
}
