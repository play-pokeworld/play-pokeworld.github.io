/** @file MarketCategoryView.js @brief Stable category title and keyed native market cards. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIKeyedList } from '../../ui/UIKeyedList.js';
import { MarketPokemonCard } from './MarketPokemonCard.js';
import { t } from '../../localization/LocalizationManager.js';
export class MarketCategoryView extends UIContainer {
  /** @param {string} category @param {Function} onSelect */
  constructor(category, onSelect) {
    super({ className: 'pw-market-category', name: 'MarketCategoryView' });
    this.setData('category', category);
    this._category = category;
    this._title = new UIText({
      tagName: 'div',
      className: 'pw-manage-title pw-market-cat',
    });
    this._cards = new UIKeyedList({
      className: 'pw-market-grid',
      key: (entry) => entry.key,
      create: (entry) => new MarketPokemonCard(entry, onSelect),
      update: (card, entry) => card.setOffer(entry, entry.selected),
    });
    this.addChildren([this._title, this._cards]);
  }
  /** @param {Object[]} offers @param {string|null} selected */
  setOffers(offers, selected) {
    this._title.setText(t(`market_cat_${this._category}`));
    this.setVisible(offers.length > 0);
    this._cards.setEntries(
      offers.map((offer) => ({ ...offer, selected: offer.key === selected })),
    );
  }
}
