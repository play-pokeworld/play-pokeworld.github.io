/**
 * @file ConfirmDialog.js
 * @brief Reusable yes / no dialog (C++: class ConfirmDialog : public StaticModalPanel).
 * Replaces window.confirm(): `dialog.ask({ title, message, note, icon, cancelLabel, confirmLabel,
 * danger, onConfirm })`.
 *
 * Drawn as the catalogue's sheet (frames `confirm-relance`, `confirm-quitter`, `starter-confirm`):
 * a mark and the sentence, an optional second line in smaller type, then the two footer halves -
 * ghost on the left, light-on-dark (or danger red) on the right.
 */

import { StaticModalPanel } from './StaticModalPanel.js';
import { UIContainer } from './UIContainer.js';
import { UIText } from './UIText.js';
import { UIButton } from './UIButton.js';
import { UIIcon } from './UIIcon.js';
import { t } from '../localization/LocalizationManager.js';

export class ConfirmDialog extends StaticModalPanel {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.id='']
   */
  constructor(options = {}) {
    super({
      id: options.id,
      size: 'md',
      title: '',
      className: 'pw-sheet pw-confirm-sheet',
      name: options.name || 'ConfirmDialog'
    });
  }

  /**
   * Fills and opens the dialog.
   * @param {Object} request
   * @param {string} request.title          - Localized
   * @param {string} request.message        - Localized
   * @param {string} [request.note]         - Localized, second line in smaller type
   * @param {string} [request.icon]         - IconRegistry key (default 'info', 'exclamation' when danger)
   * @param {string} [request.cancelLabel]  - Localized, defaults to btn_cancel
   * @param {string} [request.confirmLabel] - Localized, defaults to btn_confirm
   * @param {boolean} [request.danger=false]
   * @param {Function} request.onConfirm
   */
  ask(request) {
    this.setTitle(request.title);
    this.clearChildren();

    const message = new UIContainer({ className: 'pw-sheet-message' });
    message.addChild(new UIIcon({ name: request.icon || (request.danger ? 'exclamation' : 'info') }));
    const copy = new UIContainer({ className: 'pw-flex-1' });
    copy.addChild(new UIText({ tagName: 'p', className: 'pw-sheet-message-text', text: request.message }));
    if (request.note) {
      copy.addChild(new UIText({ tagName: 'p', className: 'pw-sheet-note', text: request.note }));
    }
    message.addChild(copy);
    this.addChild(message);

    const confirmClass = request.danger ? 'pw-sheet-btn is-danger' : 'pw-sheet-btn is-primary';
    this.addChild(new UIContainer({
      className: 'pw-sheet-foot',
      children: [
        new UIButton({
          variant: 'ghost',
          className: 'pw-sheet-btn',
          text: request.cancelLabel || t('btn_cancel'),
          onClick: () => this.close()
        }),
        new UIButton({
          variant: 'ghost',
          className: confirmClass,
          text: request.confirmLabel || t('btn_confirm'),
          onClick: () => {
            this.close();
            request.onConfirm();
          }
        })
      ]
    }));
    this.open();
  }
}
