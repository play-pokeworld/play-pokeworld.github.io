/** @file StaffCard.js @brief Staff portrait, progression, hiring and explicit legacy-bonus disclosure. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { StaffRules } from '../../config/StaffRules.js';
import { FacilityStaffSystem } from '../../systems/FacilityStaffSystem.js';
import { PriceTag } from '../components/PriceTag.js';
import { t } from '../../localization/LocalizationManager.js';

export class StaffCard extends UIContainer {
  /** @param {Object} model */
  constructor(model) {
    super({
      className: 'staff-card pw-facility-staff-card',
      name: 'StaffCard',
    });
    this._staffId = model.id;
    this._owned = false;
    this._level = new UIText({ className: 'staff-level' });
    this._xpText = new UIText({ className: 'pw-facility-subtle' });
    this._xp = new UIProgressBar({ variant: 'exp', size: 'sm' });
    this._bonus = new UIText({ tagName: 'div', className: 'staff-bonus' });
    this._disclosure = new UIText({
      tagName: 'small',
      className: 'pw-facility-legacy-note',
      text: t('facility_legacy_unused_short'),
    });
    this._disclosure.setTooltip(t('facility_legacy_unused'));
    this._status = new UIText({
      tagName: 'div',
      className: 'pw-facility-subtle',
    });
    this._price = new PriceTag(model.currency, model.cost);
    this._button = new UIButton({
      text: t('facility_hire'),
      className: 'hbtn',
      onClick: () => {
        const system = FacilityStaffSystem.getInstance();
        if (this._owned) system.toggle(this._staffId);
        else system.hire(this._staffId);
      },
    });
    this._button.addChild(this._price);
    this._quote = new UIContainer({ className: 'pw-staff-price-quote' });
    this._footer=new UIContainer({className:'pw-staff-card-footer',children:[this._quote,this._button]});
    this.addChildren([
      new UIContainer({
        className: 'staff-card-head',
        children: [
          new UIImage({
            loading: 'eager',
            src: AssetPaths.trainerSprite(model.sprite),
            alt: t(`staff_name_${model.id}`),
            className: 'staff-portrait',
            pixelated: true,
          }),
          new UIContainer({
            className: 'staff-card-head-text',
            children: [
              new UIText({ tagName: 'h3', text: t(`staff_name_${model.id}`) }),
              new UIText({
                tagName: 'small',
                className: 'staff-card-location',
                text: t(`location.${model.locationId}`),
              }),
              this._level,
            ],
          }),
        ],
      }),
      new UIText({
        tagName: 'p',
        className: 'pw-facility-subtle',
        text: t(`staff_desc_${model.id}`),
      }),
      this._xpText,
      this._xp,
      this._bonus,
      this._disclosure,
      this._status,
      this._footer,
    ]);
    this.setData('staffId', model.id);
    this.setModel(model, false);
  }
  /** @param {Object} model @param {boolean} anotherActive */
  setModel(model, anotherActive) {
    this._owned = model.owned;
    this._level.setText(t('staff_level_short', { level: model.level }));
    this._level.setVisible(model.owned);
    this._xp.setVisible(model.owned);
    this._xpText.setVisible(model.owned);
    this._xp.setValue(
      model.level >= StaffRules.MAX_LEVEL ? model.xpNeeded : model.xp,
      model.xpNeeded,
    );
    this._xpText.setText(
      model.level >= StaffRules.MAX_LEVEL
        ? t('facility_level_max')
        : t('staff_xp_bar', { xp: model.xp, need: model.xpNeeded }),
    );
    const quoteOnly = !model.owned && (!model.unlocked || !model.canAfford);
    const priceParent = quoteOnly ? this._quote : this._button;
    if (this._price.getParent() !== priceParent)
      priceParent.addChild(this._price);
    this._quote.setVisible(quoteOnly);
    this._price.setVisible(!model.owned);
    this._price.setAmount(model.cost);
    const formatKey =
      model.bonus === 'training_kill_reduction'
        ? 'facility_staff_ko_bonus'
        : model.bonus === 'mine_extra_items' ||
            model.bonus === 'mine_energy_max'
          ? 'facility_staff_points_bonus'
          : 'facility_staff_percent_bonus';
    this._bonus.setVisible(model.owned);
    this._bonus.setText(
      t(formatKey, {
        label: t(`staff_bonus_${model.bonus}`),
        value: model.bonusDisplay,
      }),
    );
    this._disclosure.setVisible(!model.effectImplemented);
    this._status.setVisible(model.owned||!model.unlocked);
    this._status.setText(model.owned?t(model.active?'staff_active_on':'staff_active_off'):model.unlocked?'':t('staff_unlock_at',{loc:t(`location.${model.locationId}`)}));
    this._button.setVisible(model.owned || (model.unlocked && model.canAfford));
    this._button.setText(
      t(
        model.owned
          ? model.active
            ? 'facility_deactivate'
            : 'facility_activate'
          : 'facility_hire',
      ),
    );
    this._button.setAriaLabel(
      t(
        model.owned
          ? model.active
            ? 'facility_deactivate'
            : 'facility_activate'
          : 'facility_hire',
      ),
    );
    this._button.setEnabled(
      model.owned ? model.active || !anotherActive : model.canAfford,
    );
    this._button.setTooltip(
      model.owned && anotherActive && !model.active
        ? t('staff_active_limit', { count: StaffRules.MAX_ACTIVE })
        : '',
    );
    this.toggleClass('is-owned', model.owned);
    this.toggleClass('is-active', model.active);
    this.toggleClass('is-locked', !model.owned && !model.unlocked);
  }
}
