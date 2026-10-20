/**
 * @file LocationActions.js
 * @brief Action tiles of the location window (original location-info.js actions, same order):
 * talk, explore (wild areas only), shop (info row while league-locked), gym / league champion
 * (info row while locked, rematch once beaten).
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIActionTile, ActionTileVariants } from '../../ui/UIActionTile.js';
import { BattleSystem } from '../../systems/BattleSystem.js';
import { DungeonSystem } from '../../systems/DungeonSystem.js';
import { TrainerSystem } from '../../systems/TrainerSystem.js';
import { ShopSystem } from '../../systems/ShopSystem.js';
import { ChallengeStates } from '../../systems/trainers/ChallengeStates.js';
import { ModalIds } from '../../config/ModalIds.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { LocationKinds } from '../../data/world/LocationKinds.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

export class LocationActions extends UIContainer {
  /**
   * @param {Readonly<Object>|null} location - LocationDB definition
   * @param {number} encounterCount - Wild species of the location
   */
  constructor(location, encounterCount) {
    super({ className: 'pw-loc-action-grid', name: 'LocationActions' });
    if (!location) return;
    this.addChild(new UIActionTile({
      text: t('btn_talk'),
      icon: 'chat',
      variant: ActionTileVariants.NPC,
      onClick: () => EventBus.getInstance().dispatch(
        new ModalOpenRequestedEvent(ModalIds.NPC_TALK, { locationId: location.id })
      )
    }));
    if (location.kind === LocationKinds.DUNGEON) {
      const run = DungeonSystem.getInstance().getRun();
      const elsewhere = run?.active && run.locationId !== location.id;
      const label = elsewhere
        ? t('dungeon_other_run_action')
        : run?.active
          ? t('dungeon_resume_action')
          : t('dungeon_enter_action', {
            cost: TextFormatter.formatNumber(DungeonSystem.getInstance().entryToll(location.id)),
            currency: t('currency_dungeon_tokens')
          });
      this.addChild(new UIActionTile({
        text: label,
        icon: 'door',
        onClick: elsewhere ? null : () => DungeonSystem.getInstance().enter(location.id)
      }));
    } else if (encounterCount > 0) {
      this.addChild(new UIActionTile({ text: t('explore_btn'), icon: 'swords', onClick: () => BattleSystem.getInstance().startBattle(location.id) }));
    }
    if (location.shop) this.addChild(LocationActions._shopTile(location));
    if (location.champion) {
      const tile = LocationActions._championTile(location);
      if (tile) this.addChild(tile);
    }
  }

  /** @private */
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

  /** @private */
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
