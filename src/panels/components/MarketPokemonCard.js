/** @file MarketPokemonCard.js @brief Native market card: species sprite, real ownership ball, types and quest-point quote. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIPokemonSprite } from '../../ui/UIPokemonSprite.js';
import { UIImage } from '../../ui/UIImage.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { MarketRules } from '../../config/MarketRules.js';
import { PriceTag } from './PriceTag.js';
import { t } from '../../localization/LocalizationManager.js';

export class MarketPokemonCard extends UIContainer {
  /** @param {Object} offer @param {(offer:Object)=>void} onSelect */
  constructor(offer, onSelect) {
    super({
      tagName: 'button',
      className: 'shop-item pw-manage-card pw-market-row',
      name: 'MarketPokemonCard',
    });
    this.setAttribute('type', 'button');
    this._offer = offer;
    this._sprite = new UIPokemonSprite({
      loading: 'eager',
      species: '',
      size: 'context',
      className: 'pw-market-sprite',
    });
    this._ball = new UIImage({ loading: 'eager', className: 'pw-market-ball' });
    this._name = new UIText({});
    this._number = new UIText({ className: 'pw-manage-sub' });
    this._owned = new UIText({ className: 'pw-text-sm pw-green' });
    this._types = offer.types.map(
      (type) => new UIText({ className: `type-badge type-${type}` }),
    );
    this._price = new PriceTag(offer.currency, offer.unitPrice, '', {
      compact: true,
    });
    this.addChildren([
      new UIContainer({
        className: 'pw-manage-orb pw-market-orb',
        children: [
          new UIContainer({
            className: 'pw-manage-sprite',
            children: [this._sprite],
          }),
          this._ball,
        ],
      }),
      new UIContainer({
        className: 'pw-flex-1',
        children: [
          new UIContainer({
            className: 'pw-manage-name',
            children: [this._name, this._number],
          }),
          new UIContainer({
            className: 'pw-manage-desc',
            children: this._types,
          }),
          this._owned,
        ],
      }),
      new UIContainer({
        className: 'pw-manage-level pw-market-price',
        children: [this._price],
      }),
    ]);
    this.addDomListener('click', () => onSelect(this._offer));
    this.setOffer(offer, false);
  }
  /** @param {Object} offer @param {boolean} selected */
  setOffer(offer, selected) {
    this._offer = offer;
    const name = offer.seen
      ? t(`pokemon.${offer.speciesId}`)
      : t('market_unknown_name');
    const ball = offer.owned ? (offer.shiny ? 'shiny' : 'owned') : 'none';
    this.setData('offerKey', offer.key);
    this.setData('speciesId', offer.speciesId);
    this.setAttribute('aria-pressed', selected ? 'true' : 'false');
    this.setAriaLabel(t('market_offer_label', { name, number: offer.dex }));
    this.toggleClass('selected', selected);
    this._name.setText(name);
    this._number.setText(t('market_species_number', { number: offer.dex }));
    this._owned.setText(t('bought'));
    this._owned.setVisible(offer.owned);
    offer.types.forEach((type, index) =>
      this._types[index].setText(t(`type.${type}`)),
    );
    this._sprite.setSpecies(offer.speciesId, '', offer.shiny);
    this._sprite.setAlt(name);
    this._ball.setSource(AssetPaths.pokeball(MarketRules.BALLS[ball]));
    this._ball.setAlt(
      t(
        offer.owned
          ? offer.shiny
            ? 'caught_status_shiny'
            : 'caught_status_caught'
          : 'caught_status_not_caught',
      ),
    );
    this._price.setAmount(offer.unitPrice);
  }
}
