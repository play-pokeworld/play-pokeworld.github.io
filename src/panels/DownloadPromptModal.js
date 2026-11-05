/** @file DownloadPromptModal.js — startup prompt pointing to the current device's release page. */
import { UIModal } from '../ui/UIModal.js';
import { DownloadOptionsView } from '../ui/downloads/DownloadOptionsView.js';
import { ModalIds } from '../config/ModalIds.js';
import { t } from '../localization/LocalizationManager.js';

export class DownloadPromptModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.DOWNLOAD_PROMPT,
      title: t('download_prompt_title'),
      size: 'sm',
      className: 'pw-download-prompt-modal',
      overlayClassName: 'pw-download-prompt-backdrop',
      name: 'DownloadPromptModal'
    });
    this.setBodyClass('pw-download-prompt-body');
    this.addChild(new DownloadOptionsView());
  }
}
