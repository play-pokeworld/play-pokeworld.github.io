/** @file TrainingLockedSlotCard.js @brief The original second-slot offer, backed by the shared upgrade command/model. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { PriceTag } from '../components/PriceTag.js';
import { FacilityManagementSystem } from '../../systems/FacilityManagementSystem.js';
import { t } from '../../localization/LocalizationManager.js';
export class TrainingLockedSlotCard extends UIContainer {
  constructor() {
    super({
      className: 'training-locked-slot',
      name: 'TrainingLockedSlotCard',
    });
    this._price = new PriceTag('questPoint', 0);
    this._buy = new UIButton({
      text: t('buy'),
      className: 'hbtn',
      onClick: () =>
        FacilityManagementSystem.getInstance().purchase('training', 'slots'),
    });
    this._buy.addChild(this._price);
    this._quote=new UIContainer({className:'pw-facility-price-quote'});
    this.addChildren([
      new UIText({ tagName: 'b', text: t('facility_training_slot_offer') }),
      new UIText({ text: t('facility_training_slot_offer_desc') }),
      this._quote,
      this._buy,
    ]);
  }
  /** @param {Object} model */
  setModel(model) {
    this.setVisible(Boolean(model && !model.owned));
    if (model) {
      const quoteOnly=!model.canAfford;
      const parent=quoteOnly?this._quote:this._buy;
      if(this._price.getParent()!==parent)parent.addChild(this._price);
      this._quote.setVisible(quoteOnly);this._buy.setVisible(!quoteOnly);
      this._price.setAmount(model.cost || 0);
      this._buy.setEnabled(!model.owned && model.canAfford);
    }
  }
}
