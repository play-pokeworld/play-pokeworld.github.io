/**
 * @file MapHelpModal.js
 * @brief Localized widget legend for the six semantic map-node colors.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { ModalIds } from '../config/ModalIds.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
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
      size: 'sm',
      bodyClassName: 'pw-map-help',
      className: 'pw-map-help-panel',
      name: 'MapHelpModal'
    });
    this.listen(LanguageChangedEvent, () => this._render());
    this._render();
  }

  /** @private */
  _render() {
    this.setTitle(t('map_legend_modal_title'));
    this.clearChildren();
    const rows = new UIContainer({ className: 'pw-map-help-body' });
    for (const rowData of MAP_LEGEND_ROWS) {
      const row = new UIContainer({ className: 'pw-map-help-row' });
      row.setData('mapLegendState', rowData.status);
      const swatch = new UIContainer({ className: `pw-map-help-swatch ${rowData.swatch}` });
      swatch.setAttribute('aria-hidden', 'true');
      const copy = new UIContainer({ className: 'pw-map-help-copy' });
      copy.addChildren([
        new UIText({ tagName: 'strong', className: 'pw-map-help-label', text: t(rowData.labelKey) }),
        new UIText({ className: 'pw-map-help-description', text: t(rowData.descriptionKey) })
      ]);
      row.addChildren([swatch, copy]);
      rows.addChild(row);
    }
    this.addChild(rows);
  }
}
