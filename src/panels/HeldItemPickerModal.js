/**
 * @file HeldItemPickerModal.js
 * @brief Modal picker for held items owned in the bag.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIImage } from '../ui/UIImage.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { HeldItemSystem } from '../systems/HeldItemSystem.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { InventoryChangedEvent } from '../core/events/InventoryChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { LocalizationManager, t } from '../localization/LocalizationManager.js';

export class HeldItemPickerModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.HELD_ITEM_PICKER,
      title: t('held_item_picker_title'),
      size: 'md',
      className: 'pw-held-item-picker',
      name: 'HeldItemPickerModal'
    });
    this._teamIndex = 0;
    for (const eventClass of [TeamChangedEvent, InventoryChangedEvent, BattleStartedEvent, BattleEndedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {Object} [params={}] */
  open(params = {}) {
    if (Number.isInteger(Number(params.teamIndex))) this._teamIndex = Number(params.teamIndex);
    if (this.isOpen()) {
      this._render();
      return;
    }
    super.open(params);
  }

  /** @override */
  onEnter() {
    super.onEnter();
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const team = TeamSystem.getInstance().getTeam();
    const pokemon = team[this._teamIndex];
    if (!pokemon) {
      this.addChild(new UIText({ tagName: 'p', className: 'pw-empty-center', text: t('pokemon_info_no_pokemon') }));
      return;
    }

    const locked = HeldItemSystem.getInstance().isLocked();
    const save = SaveSystem.getInstance().getCurrentSave();
    const currentItem = pokemon.heldItem ? ItemDB.getInstance().getById(pokemon.heldItem) : null;
    const currentName = currentItem ? this._itemName(pokemon.heldItem) : t('pokemon_info_no_item');
    this.addChild(new UIContainer({
      className: 'pw-held-item-picker-owner',
      children: [
        new UIPokemonSprite({
          species: pokemon.species,
          form: pokemon.form,
          shiny: pokemon.shiny,
          alt: pokemon.getDisplayName(),
          size: PokemonSpriteSizes.STANDARD
        }),
        new UIContainer({
          className: 'pw-col',
          children: [
            new UIText({ tagName: 'strong', text: pokemon.getDisplayName() }),
            new UIText({ tagName: 'span', className: 'pw-text-sm pw-light1', text: currentName })
          ]
        })
      ]
    }));

    if (locked) {
      this.addChild(new UIText({ tagName: 'p', className: 'pw-held-item-lock-note', text: t('held_item_battle_locked') }));
    }

    if (pokemon.heldItem) {
      const removeButton = new UIButton({
        text: t('held_item_remove_btn'),
        variant: 'secondary',
        size: 'sm',
        className: 'pw-held-item-remove-btn',
        disabled: locked,
        onClick: () => this._unequip()
      });
      this.addChild(removeButton);
    }

    const options = HeldItemSystem.getInstance().getOptions(this._teamIndex);
    if (!options.length) {
      this.addChild(new UIText({ tagName: 'p', className: 'poke-detail-empty', text: t('held_item_picker_empty') }));
      return;
    }

    const list = new UIContainer({ className: 'pw-held-item-list' });
    for (const option of options) {
      const item = ItemDB.getInstance().getById(option.itemId);
      if (!item) continue;
      const name = this._itemName(option.itemId);
      const descriptionKey = `item.${option.itemId}.desc`;
      const description = LocalizationManager.getInstance().has(descriptionKey) ? t(descriptionKey) : '';
      const holder = option.heldByIndex >= 0 ? save?.team[option.heldByIndex] : null;
      const isCurrent = pokemon.heldItem === option.itemId;
      const buttonText = holder
        ? t('held_item_equipped_elsewhere', { name: holder.getDisplayName() })
        : isCurrent
          ? t('held_item_current')
          : t('held_item_equip_btn');
      const action = new UIButton({
        text: buttonText,
        variant: isCurrent ? 'secondary' : 'hbtn',
        size: 'sm',
        disabled: locked || isCurrent || !!holder,
        onClick: () => this._equip(option.itemId)
      });
      list.addChild(new UIContainer({
        className: 'pw-held-item-option',
        children: [
          new UIContainer({
            className: 'poke-detail-held-icon',
            children: [new UIImage({ src: ItemDB.getInstance().getImagePath(option.itemId), alt: name, pixelated: true })]
          }),
          new UIContainer({
            className: 'poke-detail-held-text',
            children: [
              new UIText({ tagName: 'strong', text: name }),
              new UIText({ tagName: 'span', className: 'pw-text-sm pw-light1', text: t('held_item_quantity', {
                count: TextFormatter.formatNumber(option.quantity)
              }) }),
              description && new UIText({ tagName: 'span', className: 'pw-text-sm pw-light1', text: description })
            ]
          }),
          action
        ]
      }));
    }
    this.addChild(list);
  }

  /** @private @param {string} itemId @returns {string} */
  _itemName(itemId) {
    const key = `item.${itemId}.name`;
    return LocalizationManager.getInstance().has(key) ? t(key) : itemId;
  }

  /** @private */
  _equip(itemId) {
    if (HeldItemSystem.getInstance().equip(this._teamIndex, itemId)) this.close();
    else this._render();
  }

  /** @private */
  _unequip() {
    if (HeldItemSystem.getInstance().unequip(this._teamIndex)) this.close();
    else this._render();
  }
}
