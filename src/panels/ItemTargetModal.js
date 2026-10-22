/**
 * @file ItemTargetModal.js
 * @brief Selects an eligible team/PC Pokémon for a supported bag item.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIImage } from '../ui/UIImage.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { ModalIds } from '../config/ModalIds.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemUseActions, ItemUseResults } from '../config/ItemUseRules.js';
import { ItemUseSystem } from '../systems/ItemUseSystem.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { InventoryChangedEvent } from '../core/events/InventoryChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class ItemTargetModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.ITEM_TARGET,
      title: t('item_use_modal_title'),
      size: 'md',
      bodyClassName: 'pw-item-target-modal',
      name: 'ItemTargetModal'
    });
    this._itemId = null;
    this._feedbackKey = null;
    for (const eventClass of [TeamChangedEvent, BoxChangedEvent, InventoryChangedEvent, BattleStartedEvent, BattleEndedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {{itemId?:string}} [params={}] */
  onEnter({ itemId } = {}) {
    super.onEnter();
    this._itemId = typeof itemId === 'string' ? itemId : null;
    this._feedbackKey = null;
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._itemId = null;
    this._feedbackKey = null;
  }

  /** @private */
  _render() {
    this.clearChildren();
    const definition = this._itemId ? ItemDB.getInstance().getById(this._itemId) : null;
    if (!definition) {
      this.addChild(new UIText({ className: 'pw-item-use-feedback is-error', text: t('item_use_unavailable') }));
      return;
    }
    const targets = ItemUseSystem.getInstance().getEligibleTargets(this._itemId);
    const action = ItemUseSystem.getInstance().getUseAction(this._itemId);
    this.addChild(new UIContainer({
      className: 'pw-item-use-header',
      children: [
        new UIImage({
          src: ItemDB.getInstance().getImagePath(this._itemId),
          alt: t(`item.${this._itemId}.name`),
          className: 'pw-item-use-icon',
          pixelated: true
        }),
        new UIContainer({
          className: 'pw-item-use-heading',
          children: [
            new UIText({ tagName: 'strong', text: t(`item.${this._itemId}.name`) }),
            new UIText({ tagName: 'span', text: t(`item.${this._itemId}.desc`) })
          ]
        })
      ]
    }));
    if (this._feedbackKey) {
      this.addChild(new UIText({ className: 'pw-item-use-feedback is-error', text: t(this._feedbackKey) }));
    }
    if (!action) {
      this.addChild(new UIText({ className: 'pw-item-use-feedback is-error', text: t('item_use_unavailable') }));
      return;
    }
    if (targets.length === 0) {
      this.addChild(new UIText({ className: 'pw-item-use-empty', text: t('item_use_no_targets') }));
      this.addChild(new UIButton({ variant: 'ghost', text: t('modal_close_btn'), onClick: () => this.close() }));
      return;
    }

    this.addChild(new UIText({ className: 'pw-item-use-instruction', text: t('item_use_choose_target') }));
    const list = new UIContainer({ className: 'pw-item-use-targets' });
    for (const target of targets) list.addChild(this._targetRow(target));
    this.addChild(list);
    this.addChild(new UIButton({ variant: 'ghost', text: t('modal_close_btn'), onClick: () => this.close() }));
  }

  /** @private @param {Object} target */
  _targetRow(target) {
    const displayName = target.nickname || t(`pokemon.${target.species}`);
    return new UIContainer({
      className: 'pw-item-use-target',
      children: [
        new UIPokemonSprite({
          species: target.species,
          form: target.form,
          shiny: target.shiny,
          alt: displayName,
          size: PokemonSpriteSizes.CONTEXT,
          className: 'pw-item-use-target-sprite'
        }),
        new UIContainer({
          className: 'pw-item-use-target-info',
          children: [
            new UIText({ tagName: 'strong', text: displayName }),
            new UIText({ tagName: 'span', text: t('item_use_target_meta', {
              level: target.level,
              location: t(target.location === 'team' ? 'item_use_team' : 'item_use_box')
            }) })
          ]
        }),
        new UIButton({
          variant: 'hbtn',
          size: 'sm',
          text: t('bag_item_use_button'),
          onClick: () => this._useOn(target)
        })
      ]
    });
  }

  /** @private @param {Object} target */
  _useOn(target) {
    const result = ItemUseSystem.getInstance().useOnPokemon(this._itemId, target.uid, target.location);
    if (result.result === ItemUseResults.SUCCESS) {
      this.close();
      if (result.action === ItemUseActions.UNLOCK_MOVE) {
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.POKEMON_INFO, {
          pokemonUid: target.uid,
          location: target.location
        }));
      }
      return;
    }
    const feedback = {
      [ItemUseResults.NO_SAVE]: 'item_use_no_save',
      [ItemUseResults.NOT_OWNED]: 'item_use_not_owned',
      [ItemUseResults.UNSUPPORTED]: 'item_use_unavailable',
      [ItemUseResults.BATTLE_ACTIVE]: 'item_use_battle_locked',
      [ItemUseResults.TARGET_INELIGIBLE]: 'item_use_target_invalid'
    }[result.result] || 'item_use_target_invalid';
    this._feedbackKey = feedback;
    this._render();
  }
}
