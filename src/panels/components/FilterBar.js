/**
 * @file FilterBar.js
 * @brief Unified filter toolbar of the full-screen panels (original components/filter-bar.js):
 * chip row, labelled selects, then search field and reset button at the end.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIChip } from '../../ui/UIChip.js';
import { UIDropdown } from '../../ui/UIDropdown.js';
import { UITextInput } from '../../ui/UITextInput.js';
import { t } from '../../localization/LocalizationManager.js';

export class FilterBar extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} [options.className=''] - Screen modifier (e.g. 'inv-toolbar')
   * @param {Array<{text: string, count?: number, active: boolean, onClick: Function, className?: string, focusKey?: string, data?: Object, ariaLabel?: string}>} [options.chips=[]]
   * @param {Array<{label: string, options: Array<{value: string, label: string}>, value: string, onChange: Function}>} [options.fields=[]]
   * @param {{value: string, placeholder: string, onInput: Function}|null} [options.search=null]
   * @param {{text: string, onClick: Function}|null} [options.reset=null]
   * @param {boolean} [options.mobileDrawer=false] - Collapse the toolbar behind an accessible mobile toggle.
   * @param {{open:string,close:string}|null} [options.mobileDrawerLabels=null] - Optional panel-specific accessible toggle labels.
   */
  constructor({ className = '', chips = [], fields = [], search = null, reset = null, mobileDrawer = false, mobileDrawerLabels = null }) {
    super({ className: `box-filter-panel ui-control-toolbar pw-ui-toolbar pw-filterbar ${className}`.trim(), name: 'FilterBar' });
    this._mobileDrawerOpen = false;
    this._drawerToggle = null;
    this._mobileDrawerLabels = mobileDrawerLabels || {
      open: t('bag_filters_open'),
      close: t('bag_filters_close')
    };
    if (mobileDrawer) {
      this._drawerToggle = new UIButton({
        className: 'pw-drawer-toggle',
        variant: 'hbtn',
        size: 'sm',
        onClick: () => this._toggleMobileDrawer()
      });
      this._drawerToggle.setAttribute('aria-expanded', 'false');
      this._setDrawerToggleLabel(false);
      this.addChild(this._drawerToggle);
    }
    if (chips.length) {
      this.addChild(new UIContainer({
        className: 'pw-chip-row inv-tabs',
        children: chips.map((chip) => {
          const button = new UIChip({ ...chip, count: chip.count ?? null });
          if (chip.className) {
            for (const className of String(chip.className).split(/\s+/).filter(Boolean)) button.addClass(className);
          }
          if (chip.focusKey) button.setData('focusKey', chip.focusKey);
          if (chip.ariaLabel) button.setAriaLabel(chip.ariaLabel);
          if (chip.data && typeof chip.data === 'object') {
            for (const [key, value] of Object.entries(chip.data)) {
              if (value !== null && value !== undefined) button.setData(key, value);
            }
          }
          return button;
        })
      }));
    }
    if (fields.length) {
      this.addChild(new UIContainer({
        className: 'pw-filter-fields',
        children: fields.map((field) => new UIContainer({
          className: 'pw-filter-field',
          children: [
            new UIText({ className: 'pw-filter-label', text: field.label }),
            new UIDropdown({ className: 'pw-filter-select', options: field.options, value: field.value, onChange: field.onChange })
          ]
        }))
      }));
    }
    if (search || reset) {
      const end = new UIContainer({ className: 'pw-filter-end' });
      if (search) {
        /** @type {UITextInput|null} */
        this.searchInput = new UITextInput({ className: 'box-filter-search pw-filter-input', value: search.value, placeholder: search.placeholder, onInput: search.onInput });
        end.addChild(this.searchInput);
      }
      if (reset) end.addChild(new UIButton({ variant: 'hbtn', className: 'pw-filter-reset', text: reset.text, onClick: reset.onClick }));
      this.addChild(end);
    }
  }

  /** @private */
  _toggleMobileDrawer() {
    if (!this._drawerToggle) return;
    this._mobileDrawerOpen = !this._mobileDrawerOpen;
    this.toggleClass('mobile-drawer-open', this._mobileDrawerOpen);
    this._drawerToggle.setAttribute('aria-expanded', this._mobileDrawerOpen);
    this._setDrawerToggleLabel(this._mobileDrawerOpen);
  }

  /** @private @param {boolean} open */
  _setDrawerToggleLabel(open) {
    if (!this._drawerToggle) return;
    const label = open ? this._mobileDrawerLabels.close : this._mobileDrawerLabels.open;
    this._drawerToggle.setAttribute('aria-label', label);
    this._drawerToggle.setAttribute('title', label);
  }
}
