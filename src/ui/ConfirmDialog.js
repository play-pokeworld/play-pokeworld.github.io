/**
 * @file ConfirmDialog.js
 * @brief Reusable yes / no dialog (C++: class ConfirmDialog : public StaticModalPanel).
 * Replaces window.confirm(): `dialog.ask({ title, message, confirmLabel, danger, onConfirm })`.
 */

import { StaticModalPanel } from './StaticModalPanel.js';
import { UIContainer } from './UIContainer.js';
import { UIText } from './UIText.js';
import { UIButton } from './UIButton.js';
import { t } from '../localization/LocalizationManager.js';

export class ConfirmDialog extends StaticModalPanel {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.id='']
   */
  constructor(options = {}) {
    super({ id: options.id, size: 'sm', title: '', name: options.name || 'ConfirmDialog' });
  }

  /**
   * Fills and opens the dialog.
   * @param {Object} request
   * @param {string} request.title          - Localized
   * @param {string} request.message        - Localized
   * @param {string} [request.confirmLabel] - Localized, defaults to btn_confirm
   * @param {boolean} [request.danger=false]
   * @param {Function} request.onConfirm
   */
  ask(request) {
    this.setTitle(request.title);
    this.clearChildren();
    this.addChild(new UIContainer({
      className: 'pw-dialog-field',
      children: [new UIText({ tagName: 'p', className: 'pw-dialog-desc', text: request.message })]
    }));
    this.addChild(new UIContainer({
      className: 'pw-dialog-actions',
      children: [
        new UIButton({ className: 'hbtn', text: t('btn_cancel'), onClick: () => this.close() }),
        new UIButton({
          className: `hbtn ${request.danger ? 'pw-btn-danger' : 'pw-btn-primary'}`,
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
