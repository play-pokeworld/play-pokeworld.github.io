/** @file FossilChoiceCard.js @brief Stable fossil selection card with canonical item/Pokémon media. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIItemSprite } from '../../ui/UIItemSprite.js';
import { UIPokemonSprite } from '../../ui/UIPokemonSprite.js';
import { t } from '../../localization/LocalizationManager.js';

export class FossilChoiceCard extends UIContainer {
  /** @param {Object} entry @param {Function} choose */
  constructor(entry, choose) {
    super({ className: 'pw-fossil-card', name: 'FossilChoiceCard' });
    this._quantity = new UIText({ className: 'pw-facility-subtle' });
    this._button = new UIButton({
      text: t('facility_choose'),
      size: 'sm',
      onClick: choose,
    });
    this.addChildren([
      new UIContainer({
        className: 'pw-facility-fossil-media',
        children: [
          new UIItemSprite({
            itemId: entry.itemId,
            alt: t(`item.${entry.itemId}.name`),
          }),
          new UIPokemonSprite({
            species: entry.speciesId,
            alt: t(`pokemon.${entry.speciesId}`),
          }),
        ],
      }),
      new UIText({ tagName: 'strong', text: t(`item.${entry.itemId}.name`) }),
      new UIText({ tagName: 'div', text: t(`pokemon.${entry.speciesId}`) }),
      this._quantity,
      this._button,
    ]);
    this.setEntry(entry);
  }
  /** @param {Object} entry */
  setEntry(entry) {
    this._quantity.setText(
      t('facility_fossil_stock', {
        available: entry.quantity,
        reserved: entry.reserved || 0,
      }),
    );
    this._button.setEnabled(entry.quantity > 0);
  }
}
