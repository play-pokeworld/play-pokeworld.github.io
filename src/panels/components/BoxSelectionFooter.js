/**
 * @file BoxSelectionFooter.js
 * @brief Generic fixed actions shown while the PC is serving a selection request.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIText } from '../../ui/UIText.js';

export class BoxSelectionFooter extends UIContainer {
  /**
   * @param {{label:string,cancelLabel:string,removeLabel?:string,removeDisabled?:boolean,onCancel:Function,onRemove?:Function}} options
   */
  constructor({ label, cancelLabel, removeLabel = '', removeDisabled = false, onCancel, onRemove }) {
    const actions = [new UIButton({
      className: 'pw-box-selection-cancel',
      variant: 'secondary',
      text: cancelLabel,
      onClick: onCancel
    })];
    if (removeLabel) {
      actions.push(new UIButton({
        className: 'pw-box-selection-remove',
        variant: 'danger',
        text: removeLabel,
        disabled: removeDisabled,
        onClick: onRemove
      }));
    }

    super({
      className: 'pw-box-selection-footer',
      name: 'BoxSelectionFooter',
      children: [
        new UIText({ tagName: 'div', className: 'pw-box-selection-footer-label', text: label }),
        new UIContainer({ className: 'pw-box-selection-footer-actions', children: actions })
      ]
    });
    this.setAttribute('role', 'group');
    this.setAriaLabel(label || cancelLabel);
  }
}
