/**
 * @file UIItemSprite.js
 * @brief Item media resolved by ItemDB inside the canonical shared sprite frame.
 */
import { UISpriteFrame } from './UISpriteFrame.js';
import { ItemDB } from '../data/items/ItemDB.js';

export class UIItemSprite extends UISpriteFrame {
  /** @param {{itemId:string,alt?:string,className?:string}} options */
  constructor(options = {}) {
    super({ ...options, src: ItemDB.getInstance().getImagePath(options.itemId),
      imageClassName: 'pw-item-circle-img', name: 'UIItemSprite' });
    this.addClass('pw-item-sprite');
  }
  /** @param {string} itemId */
  setItem(itemId) { this.setSource(ItemDB.getInstance().getImagePath(itemId)); }
}
