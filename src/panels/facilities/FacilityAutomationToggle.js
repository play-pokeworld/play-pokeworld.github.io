/** @file FacilityAutomationToggle.js @brief Compact owned toggle or actual module purchase; no fake locked action. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UIButton } from '../../ui/UIButton.js';
import { UISwitch } from '../../ui/UISwitch.js';
import { PriceTag } from '../components/PriceTag.js';
import { t } from '../../localization/LocalizationManager.js';
export class FacilityAutomationToggle extends UIContainer {
  /** @param {Object} options */
  constructor(options) {
    super({
      className: 'automation-card pw-facility-auto-card',
      name: 'FacilityAutomationToggle',
    });
    this._switch = new UISwitch({
      onLabel: t('automation_enabled'),
      offLabel: t('automation_disabled'),
      onChange: options.onToggle,
    });
    this._switch.setAriaLabel(t(options.titleKey));
    this._fee = new PriceTag(options.currency || 'money', 0);
    this._fee.setTooltip(t('facility_per_operation'));
    this._buy = new UIButton({
      text: t('buy'),
      className: 'hbtn',
      onClick: options.onBuy,
    });
    if (options.price)
      this._buy.addChild(
        new PriceTag(options.price.currency, options.price.amount),
      );
    this._buy.setAriaLabel(t('buy'));
    this._locked = new UIText({
      text: t('automation_locked_upgrade'),
      className: 'pw-facility-subtle',
    });
    this._hasBuy = Boolean(options.onBuy);
    this.addChildren([
      new UIContainer({
        className: 'pw-facility-title-row automation-card-head',
        children: [
          new UIIcon({ name: options.icon || 'refresh' }),
          new UIText({ tagName: 'b', text: t(options.titleKey) }),
          this._switch,
          this._buy,
        ],
      }),
      new UIText({
        tagName: 'small',
        text: t(options.descriptionKey),
        className: 'pw-facility-subtle',
      }),
      this._locked,
      this._fee,
    ]);
  }
  /** @param {Object} model */
  setModel(model) {
    this._switch.setVisible(model.purchased);
    this._switch.setChecked(model.enabled);
    this._buy.setVisible(!model.purchased && this._hasBuy);
    this._locked.setVisible(!model.purchased && !this._hasBuy);
    this._fee.setVisible(model.purchased && model.fee != null);
    if (model.fee != null) this._fee.setAmount(model.fee);
    this.toggleClass('is-owned', model.purchased);
    this.toggleClass('is-on', model.purchased && model.enabled);
    this.toggleClass('is-off', model.purchased && !model.enabled);
  }
}
