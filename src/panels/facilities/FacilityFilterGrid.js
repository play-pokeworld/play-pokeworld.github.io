/** @file FacilityFilterGrid.js @brief Shared slot filter controls; changes never remove existing queue entries. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIDropdown } from '../../ui/UIDropdown.js';
import { FacilityFilterData } from '../../data/save/FacilityFilterData.js';
import { FacilityFilterRules } from '../../config/FacilityFilterRules.js';
import { FacilityFilterUi } from '../../config/FacilityFilterUi.js';
import { FacilityUiRules } from '../../config/FacilityUiRules.js';
import { t } from '../../localization/LocalizationManager.js';
export class FacilityFilterGrid extends UIContainer {
  /** @param {'hatchery'|'training'} sector @param {Function} onChange */
  constructor(sector, onChange) {
    super({
      className: 'pw-facility-filter-grid hatchery-filter-row',
      name: 'FacilityFilterGrid',
    });
    this._controls = new Map();
    const model = new FacilityFilterData(sector);
    for (const key of sector === 'hatchery'
      ? FacilityFilterRules.HATCHERY_FIELDS
      : FacilityFilterRules.TRAINING_FIELDS) {
      const label = new UIContainer({
        tagName: 'label',
        className: 'pw-facility-filter-field',
      });
      const caption = new UIText({ text: t(FacilityFilterUi.LABELS[key]) });
      const select = new UIDropdown({
        skin: 'native',
        className: 'pw-facility-filter-select',
        options: model
          .values(key)
          .map((value) => ({ value, label: this._label(key, value) })),
      });
      select.setAttribute('data-filter-field', key);
      select.setOnChange((value) => onChange(key, value));
      label.addChildren([caption, select]);
      this.addChild(label);
      this._controls.set(key, select);
    }
  }
  /** @private @param {string} key @param {string} value @returns {string} */
  _label(key, value) {
    if (key === 'mode' && value === 'all') return t('training_auto_mode_all');
    if (key === 'mode' && FacilityUiRules.MODE_KEYS[value])
      return t(FacilityUiRules.MODE_KEYS[value]);
    if (key === 'filterRegion' && value !== 'all') return t(`region_${value}`);
    if (key === 'filterType' && value !== 'all') return t(`type.${value}`);
    return t(FacilityFilterUi.VALUES[value] || value);
  }
  /** @param {Object} filters @param {boolean} [disabled=false] */
  setFilters(filters, disabled = false) {
    for (const [key, select] of this._controls) {
      select.setValue(filters[key]);
      select.setEnabled(!disabled);
    }
  }
}
