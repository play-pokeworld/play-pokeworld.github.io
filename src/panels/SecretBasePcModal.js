/**
 * @file SecretBasePcModal.js
 * @brief Modal dialog for interacting with the secret base PC (rank, flag, message, records).
 */

import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UITextInput } from '../ui/UITextInput.js';
import { ModalIds } from '../config/ModalIds.js';
import { SecretBaseRules } from '../config/SecretBaseRules.js';
import { SecretBaseSystem } from '../systems/SecretBaseSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class SecretBasePcModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.SECRET_BASE_PC,
      title: t('pc.title'),
      size: 'md',
      bodyId: 'pw-secret-base-pc-body',
      bodyClassName: 'pw-secret-base-pc-body',
      className: 'pw-secret-base-pc-modal',
      name: 'SecretBasePcModal'
    });

    this.listen(ModalOpenRequestedEvent, (event) => {
      if (event.modalId === ModalIds.SECRET_BASE_PC) {
        this._render();
        this.open();
      }
    });
  }

  /** @private */
  _render() {
    this.clearChildren();
    const system = SecretBaseSystem.getInstance();
    const viewModel = system.getPcViewModel();
    const base = system.getBase();
    const save = SaveSystem.getInstance().getCurrentSave();

    const sections = [];

    // 1. Stats and rank summary
    if (viewModel) {
      sections.push(new UIContainer({
        className: 'pw-secret-base-pc-section',
        children: [
          new UIText({
            tagName: 'h4',
            text: t('pc.rank_summary', {
              rank: t(`flag.rank.${viewModel.rankId}`),
              count: viewModel.flagCount
            })
          }),
          new UIText({
            className: 'pw-secret-base-pc-records',
            text: t('edit.pc_record', {
              name: save?.player?.trainerName || '',
              v: viewModel.record?.visits || 0,
              w: viewModel.record?.wins || 0,
              l: viewModel.record?.losses || 0
            })
          })
        ]
      }));

      // Flag collection button (when visiting an eligible base)
      if (viewModel.canCollectFlag) {
        sections.push(new UIButton({
          className: 'hbtn pw-btn-primary',
          text: t('flag.collect'),
          onClick: () => {
            system.collectFlag();
            this._render();
          }
        }));
      }
    }

    // 2. PC Message editor (if own base)
    if (base) {
      const messageInput = new UITextInput({
        id: 'pw-base-pc-message-input',
        value: base.pcMessage || '',
        maxLength: SecretBaseRules.MAX_PC_MESSAGE_LENGTH,
        placeholder: t('pc.msg_placeholder')
      });

      sections.push(new UIContainer({
        className: 'pw-secret-base-pc-section',
        children: [
          new UIText({ tagName: 'strong', text: t('pc.msg_label') }),
          messageInput,
          new UIButton({
            variant: 'hbtn',
            text: t('panel.pc_message_save'),
            onClick: () => {
              system.setPcMessage(messageInput.getValue());
              this._render();
            }
          })
        ]
      }));
    }

    // 3. Close button
    sections.push(new UIContainer({
      className: 'pw-modal-actions',
      children: [
        new UIButton({
          variant: 'hbtn',
          text: t('dlg.close'),
          onClick: () => this.close()
        })
      ]
    }));

    this.addChild(new UIContainer({
      className: 'pw-secret-base-pc-container',
      children: sections
    }));
  }
}
