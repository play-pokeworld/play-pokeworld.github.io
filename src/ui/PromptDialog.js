/**
 * @file PromptDialog.js
 * @brief Reusable single text field dialog (C++: class PromptDialog : public StaticModalPanel).
 * Replaces window.prompt(): `dialog.ask({ title, label, value, maxLength, onSubmit })`.
 */

import { StaticModalPanel } from './StaticModalPanel.js';
import { UIContainer } from './UIContainer.js';
import { UIText } from './UIText.js';
import { UIButton } from './UIButton.js';
import { UITextInput } from './UITextInput.js';
import { t } from '../localization/LocalizationManager.js';

export class PromptDialog extends StaticModalPanel {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.id='']
   */
  constructor(options = {}) {
    super({ id: options.id, size: 'sm', title: '', name: options.name || 'PromptDialog' });
  }

  /**
   * Fills and opens the dialog. Empty values are refused (field flagged invalid).
   * @param {Object} request
   * @param {string} request.title  - Localized
   * @param {string} request.label  - Localized
   * @param {string} [request.value='']
   * @param {number} [request.maxLength=0]
   * @param {Function} request.onSubmit - (value) => void
   */
  ask(request) {
    this.setTitle(request.title);
    this.clearChildren();

    const input = new UITextInput({ value: request.value || '', maxLength: request.maxLength || 0, onSubmit: () => submit() });
    const submit = () => {
      const value = input.getValue();
      if (!value) {
        input.setInvalid(true);
        input.focus();
        return;
      }
      this.close();
      request.onSubmit(value);
    };

    this.addChild(new UIContainer({
      className: 'pw-dialog-field',
      children: [new UIText({ tagName: 'label', className: 'pw-dialog-label', text: request.label }), input]
    }));
    this.addChild(new UIContainer({
      className: 'pw-dialog-actions',
      children: [
        new UIButton({ className: 'hbtn', text: t('btn_cancel'), onClick: () => this.close() }),
        new UIButton({ className: 'hbtn pw-btn-primary', text: t('btn_confirm'), onClick: submit })
      ]
    }));
    this.open();
    input.focus();
    input.selectAll();
  }
}
