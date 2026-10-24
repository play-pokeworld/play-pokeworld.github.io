/** @file MineTileButton.js @brief Stable rock/partially exposed treasure tile, including accessible tool targeting. */
import { UIButton } from '../../ui/UIButton.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { MineUiRules } from '../../config/MineUiRules.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { t } from '../../localization/LocalizationManager.js';

export class MineTileButton extends UIButton {
  /** @param {{x:number,y:number,onDig:Function,onAim:Function}} options */
  constructor(options) {
    super({
      variant: 'ghost',
      className: 'mine-tile pw-mine-tile',
      onClick: options.onDig,
    });
    this._depthValue = -1;
    this._itemSkin = '';
    this._depth = new UIText({ className: 'pw-slot-label pw-mine-tile-depth' });
    this._item = new UIImage({
      loading: 'eager',
      className: 'pw-mine-tile-item',
      pixelated: true,
    });
    this.addChildren([this._depth, this._item]);
    this.setData('mineX', options.x);
    this.setData('mineY', options.y);
    this.addDomListener('pointerenter', () =>
      options.onAim(options.x, options.y),
    );
    this.addDomListener('pointerleave', () => options.onAim(null, null));
    this.addDomListener('focus', () => options.onAim(options.x, options.y));
    this.addDomListener('blur', () => options.onAim(null, null));
  }
  /** @param {Object} tile @param {boolean} canDig */
  setTile(tile, canDig) {
    if (tile.depth !== this._depthValue) {
      this.removeClass(`mine-tile--d${this._depthValue}`);
      this._depthValue = tile.depth;
      this.addClass(`mine-tile--d${tile.depth}`);
    }
    this._depth.setText(tile.itemId ? '' : String(tile.depth));
    this._item.setVisible(!!tile.itemId && tile.itemCenter);
    if (tile.itemId && tile.itemCenter) {
      this._item.setSource(ItemDB.getInstance().getImagePath(tile.itemId));
      this._item.setAlt(t(`item.${tile.itemId}.name`));
    }
    if (this._itemSkin) this.removeClass(`mine-tile--item-${this._itemSkin}`);
    this._itemSkin = tile.itemId
      ? MineUiRules.ITEM_SKINS[tile.itemId] || tile.itemId
      : '';
    if (this._itemSkin) this.addClass(`mine-tile--item-${this._itemSkin}`);
    this.setEnabled(canDig);
    this.toggleClass('mine-tile-clickable', canDig);
    this.toggleClass('mine-tile-revealed-item', !!tile.itemId);
    this.toggleClass('is-collected', tile.collected);
    this.setTooltip(
      t('mine_tile_hint', {
        x: tile.x + 1,
        y: tile.y + 1,
        durability: tile.depth,
      }),
    );
    this.setAriaLabel(
      t('mine_tile_hint', {
        x: tile.x + 1,
        y: tile.y + 1,
        durability: tile.depth,
      }),
    );
  }
}
