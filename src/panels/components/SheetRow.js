/**
 * @file SheetRow.js
 * @brief One row of a sheet: icon chip, title, meta line and a trailing slot (counter, button or
 *        badge). Catalogue grammar `.row` (34 px chip, 12.5/600 title, 11/400 meta).
 *
 * The same row serves the map legend, the dialogue chooser, the repeatable board, the ball picker
 * and the preset list: a row is a component, not a screen layout.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIIcon } from '../../ui/UIIcon.js';

export class SheetRow extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} [options.title='']       - Localized, first line
   * @param {string} [options.meta='']        - Localized, second line (optional)
   * @param {string} [options.icon='']        - IconRegistry key used when no node is given
   * @param {import('../../ui/UIElement.js').UIElement} [options.iconNode] - Chip content (swatch, sprite)
   * @param {import('../../ui/UIElement.js').UIElement|Array} [options.trailing] - Right-aligned content
   * @param {string} [options.className='']
   * @param {string} [options.nameClass='']   - Extra class on the title line (screen-specific hook)
   * @param {string} [options.metaClass='']   - Extra class on the meta line
   * @param {Function} [options.onClick]      - Makes the whole row the button
   * @param {string} [options.name='SheetRow']
   */
  constructor(options = {}) {
    super({ className: `pw-sheet-row ${options.onClick ? 'is-action' : 'is-static'} ${options.className || ''}`.trim(), name: options.name || 'SheetRow' });

    let chipContent = options.iconNode || null;
    if (!chipContent && options.icon) chipContent = new UIIcon({ name: options.icon, className: 'pw-icon--md' });
    const chip = new UIContainer({ className: 'pw-sheet-row-av', name: 'SheetRow:chip' });
    if (chipContent) chip.addChild(chipContent);

    const text = new UIContainer({ className: 'pw-sheet-row-txt', name: 'SheetRow:text' });
    text.addChild(new UIText({
      tagName: 'span',
      className: `pw-sheet-row-name ${options.nameClass || ''}`.trim(),
      text: options.title || ''
    }));
    if (options.meta) {
      text.addChild(new UIText({
        tagName: 'span',
        className: `pw-sheet-row-meta ${options.metaClass || ''}`.trim(),
        text: options.meta
      }));
    }

    this.addChild(chip);
    this.addChild(text);

    const trailing = Array.isArray(options.trailing)
      ? options.trailing
      : (options.trailing ? [options.trailing] : []);
    if (trailing.length) {
      const end = new UIContainer({ className: 'pw-sheet-row-end', name: 'SheetRow:end' });
      for (const child of trailing) end.addChild(child);
      this.addChild(end);
    }

    if (options.onClick) {
      this.addDomListener('click', options.onClick);
      this.setAttribute('role', 'button');
      this.setAttribute('tabindex', '0');
      this.addDomListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          options.onClick(event);
        }
      });
    }
  }
}
