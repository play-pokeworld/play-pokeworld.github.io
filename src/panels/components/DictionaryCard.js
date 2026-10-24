/**
 * @file DictionaryCard.js
 * @brief Interactive card for a dictionary entry (item, move or talent).
 * Uses the canonical design system `.dict-entry` styling and components.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UIImage } from '../../ui/UIImage.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { t } from '../../localization/LocalizationManager.js';

export class DictionaryCard extends UIContainer {
  /**
   * @param {Object} entry - Entry from DictionaryCatalog
   * @param {(entry: Object) => void} onClick
   */
  constructor(entry, onClick) {
    super({
      tagName: 'button',
      className: `dict-entry${entry.owned ? ' owned' : ''}`,
      name: 'DictionaryCard',
    });

    this.setAttribute('type', 'button');
    this.setData('key', entry.id);
    this.setData('kind', entry.kind);
    this.setAttribute('role', 'button');

    if (entry.kind === 'move' && entry.type) {
      this._setCssVariable('--type-color', `var(--type-${entry.type})`);
    }

    const icon = new UIContainer({ className: 'dict-entry-icon' });
    if (entry.kind === 'item') {
      icon.addChild(
        new UIImage({
          src: ItemDB.getInstance().getImagePath(entry.id),
          alt: entry.name,
          className: 'dict-entry-item-img',
          pixelated: true,
        }),
      );
    } else if (entry.kind === 'move') {
      icon.addChild(
        new UIText({
          tagName: 'span',
          className: `type-badge type-${entry.type}`,
          text: t(`type.${entry.type}`),
        }),
      );
    } else if (entry.kind === 'talent') {
      icon.addChild(
        new UIIcon({ name: 'dumbbell', className: 'pw-dict-talent-icon' }),
      );
    }

    const title = new UIText({ tagName: 'b', text: entry.name });
    const subtitle = new UIText({ tagName: 'span', text: entry.subtitle });
    const textCluster = new UIContainer({
      className: 'dict-entry-text',
      children: [title, subtitle],
    });

    this.addChildren([icon, textCluster]);
    this.setAriaLabel(`${entry.name} — ${entry.subtitle}`);

    if (typeof onClick === 'function') {
      this.addDomListener('click', () => onClick(entry));
    }
  }
}
