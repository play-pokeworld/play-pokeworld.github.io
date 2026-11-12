/**
 * @file MapHelpModal.js
 * @brief Localized widget legend for the six semantic map-node colors.
 *
 * Laid out as the catalogue's sheet (frame `map-help`): one row per legend entry, the colour swatch
 * in the 34 px chip, the label on the first line and the meaning on the second. The legend entries
 * are the ones the map really paints - the catalogue frame was drawn with four invented rows, so its
 * grammar is kept and its data is not.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIButton } from '../ui/UIButton.js';
import { SheetRow } from './components/SheetRow.js';
import { ModalIds } from '../config/ModalIds.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { RoamingSystem } from '../systems/RoamingSystem.js';
import { t } from '../localization/LocalizationManager.js';

const MAP_LEGEND_ROWS = Object.freeze([
  Object.freeze({ status: 'quest', swatch: 'is-green', labelKey: 'map_legend_quest', descriptionKey: 'map_help_green_desc' }),
  Object.freeze({ status: 'roaming', swatch: 'is-purple', labelKey: 'map_legend_roaming', descriptionKey: 'map_help_purple_desc' }),
  Object.freeze({ status: 'catch', swatch: 'is-blue', labelKey: 'map_legend_catch', descriptionKey: 'map_help_blue_desc' }),
  Object.freeze({ status: 'shiny', swatch: 'is-yellow', labelKey: 'map_legend_shiny', descriptionKey: 'map_help_yellow_desc' }),
  Object.freeze({ status: 'locked', swatch: 'is-gray', labelKey: 'map_legend_locked', descriptionKey: 'map_help_gray_desc' }),
  Object.freeze({ status: 'complete', swatch: 'is-transparent', labelKey: 'map_legend_complete', descriptionKey: 'map_help_transparent_desc' })
]);

export class MapHelpModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.MAP_HELP,
      title: t('map_legend_modal_title'),
      size: 'md',
      bodyClassName: 'pw-map-help',
      className: 'pw-sheet pw-map-help-panel',
      name: 'MapHelpModal'
    });
    this.listen(LanguageChangedEvent, () => this._render());
    this._render();
  }

  /**
   * Legend rows actually reachable in this build: a switched-off feature must not advertise a colour
   * that no node can ever carry.
   * @returns {ReadonlyArray<Object>}
   */
  static legendRows() {
    return MAP_LEGEND_ROWS.filter((row) => row.status !== 'roaming' || RoamingSystem.isEnabled());
  }

  /** @private */
  _render() {
    this.setTitle(t('map_legend_modal_title'));
    this.clearChildren();
    for (const rowData of MapHelpModal.legendRows()) {
      const swatch = new UIContainer({ className: `pw-map-help-swatch ${rowData.swatch}` });
      swatch.setAttribute('aria-hidden', 'true');
      const row = new SheetRow({
        iconNode: swatch,
        title: t(rowData.labelKey),
        meta: t(rowData.descriptionKey),
        className: 'pw-map-help-row',
        nameClass: 'pw-map-help-label',
        metaClass: 'pw-map-help-description'
      });
      row.setData('mapLegendState', rowData.status);
      this.addChild(row);
    }
    this.addChild(new UIButton({
      text: t('close_btn'),
      variant: 'ghost',
      className: 'pw-sheet-btn',
      onClick: () => this.close()
    }));
  }
}
