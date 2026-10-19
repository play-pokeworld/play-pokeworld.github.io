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

export class FilterBar extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} [options.className=''] - Screen modifier (e.g. 'inv-toolbar')
   * @param {Array<{text: string, count?: number, active: boolean, onClick: Function}>} [options.chips=[]]
   * @param {Array<{label: string, options: Array<{value: string, label: string}>, value: string, onChange: Function}>} [options.fields=[]]
   * @param {{value: string, placeholder: string, onInput: Function}|null} [options.search=null]
   * @param {{text: string, onClick: Function}|null} [options.reset=null]
   */
  constructor({ className = '', chips = [], fields = [], search = null, reset = null }) {
    super({ className: `box-filter-panel ui-control-toolbar pw-ui-toolbar pw-filterbar ${className}`.trim(), name: 'FilterBar' });
    if (chips.length) {
      this.addChild(new UIContainer({ className: 'pw-chip-row inv-tabs', children: chips.map((chip) => new UIChip({ ...chip, count: chip.count ?? null })) }));
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
}
