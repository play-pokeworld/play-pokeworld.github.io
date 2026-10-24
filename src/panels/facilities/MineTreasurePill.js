/** @file MineTreasurePill.js @brief Current-layer treasure marker; buried/collected presentation matches the reference. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { t } from '../../localization/LocalizationManager.js';

export class MineTreasurePill extends UIContainer {
  constructor() {
    super({ className: 'pw-mine-treasure', name: 'MineTreasurePill' });
    this._icon = new UIImage({
      loading: 'eager',
      className: 'pw-mine-treasure-icon',
      pixelated: true,
    });
    this._label = new UIText({ className: 'pw-mine-treasure-name' });
    this.addChildren([this._icon, this._label]);
  }
  /** @param {Object} entry */
  setEntry(entry) {
    this._icon.setVisible(entry.collected);
    if (entry.collected) {
      this._icon.setSource(ItemDB.getInstance().getImagePath(entry.itemId));
      this._icon.setAlt(t(`item.${entry.itemId}.name`));
    }
    const name = t(`item.${entry.itemId}.name`);
    this._label.setText(name);
    const description = t('mine_treasure_state', {
      name,
      state: t(
        entry.collected ? 'mine_treasure_found' : 'mine_treasure_buried',
      ),
    });
    this.setTooltip(description);
    this.setAriaLabel(description);
    this.toggleClass('is-collected', entry.collected);
  }
}
