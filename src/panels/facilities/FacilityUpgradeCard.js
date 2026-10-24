/** @file FacilityUpgradeCard.js @brief Stable horizontal purchase row with a genuine currency sprite inside its action. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIText } from '../../ui/UIText.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { PriceTag } from '../components/PriceTag.js';
import { t } from '../../localization/LocalizationManager.js';
export class FacilityUpgradeCard extends UIContainer {
  /** @param {Object} model @param {Function} onBuy */
  constructor(model, onBuy) {
    super({
      className: 'pw-facility-upgrade upgrade-row',
      name: 'FacilityUpgradeCard',
    });
    this._title = new UIText({
      className: 'pw-facility-card-title',
      tagName: 'b',
    });
    this._description = new UIText({
      className: 'pw-facility-card-description',
    });
    this._status = new UIText({ className: 'pw-facility-card-status' });
    this._icon = new UIIcon({ name: 'plus' });
    this._buy = new UIButton({
      text: t('buy'),
      className: 'hbtn pw-facility-buy',
      onClick: onBuy,
    });
    this._price = new PriceTag(model.currency, model.cost || 0);
    this._buy.addChild(this._price);
    this._quote=new UIContainer({className:'pw-facility-price-quote'});
    this.addChildren([
      this._icon,
      new UIContainer({
        className: 'pw-facility-upgrade-info',
        children: [this._title, this._description, this._status],
      }),
      this._quote,
      this._buy,
    ]);
    this.setModel(model);
  }
  /** @param {Object} model */
  setModel(model) {
    this._title.setText(t(model.labelKey, model.labelParams || {}));
    const description =
      model.value != null
        ? t('facility_upgrade_value', {
            value: model.value,
            max: model.maximum ?? model.value,
          })
        : model.energyCost != null
          ? t('mine_tool_cost_hint', {
              cost: model.energyCost,
              power: model.power,
            })
          : t('facility_upgrade_module');
    this._description.setText(description);
    this._title.setTooltip(description);
    this._description.setVisible(model.value != null);
    const quoteOnly=!model.owned&&!model.canAfford;
    const parent=quoteOnly?this._quote:this._buy;
    if(this._price.getParent()!==parent)parent.addChild(this._price);
    this._quote.setVisible(quoteOnly);this._buy.setVisible(!quoteOnly);
    this._price.setVisible(!model.owned);
    this._price.setAmount(model.cost || 0);
    this._buy.setText(t(model.owned ? 'purchased' : 'buy'));
    this._buy.setEnabled(!model.owned && model.canAfford);
    this._buy.toggleClass('is-owned', model.owned);
    this._buy.setAriaLabel(t(model.owned ? 'purchased' : 'buy'));
    this._status.setVisible(model.owned);
    this._status.setText(t('purchased'));
    this.toggleClass('is-owned', model.owned);
    this.setData('upgradeId', model.id);
  }
}
