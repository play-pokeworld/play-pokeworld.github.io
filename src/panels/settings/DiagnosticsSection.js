/**
 * @file DiagnosticsSection.js
 * @brief Settings → browser error count, report export and clear action.
 */

import { SettingsSection } from './SettingsSection.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { BrowserDiagnostics } from '../../ui/BrowserDiagnostics.js';
import { DiagnosticsSystem, DIAGNOSTIC_LIMITS } from '../../systems/DiagnosticsSystem.js';
import { DiagnosticsChangedEvent } from '../../core/events/DiagnosticsChangedEvent.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import { t } from '../../localization/LocalizationManager.js';

export class DiagnosticsSection extends SettingsSection {
  constructor() {
    super({ id: 'diag-section', titleKey: 'diag_title', name: 'DiagnosticsSection' });
    this.listen(DiagnosticsChangedEvent, () => this.refresh());
  }

  /** @override */
  build() {
    const diagnostics = DiagnosticsSystem.getInstance();
    const count = diagnostics.getErrorCount();
    this.addChild(new UIContainer({
      className: 'settings-row',
      children: [new UIText({
        id: 'diag-count',
        className: 'diag-count',
        text: t('diag_errors_count', { n: count, max: DIAGNOSTIC_LIMITS.ERRORS })
      })]
    }));
    this.addChild(new UIContainer({
      className: 'settings-row',
      children: [
        new UIButton({
          id: 'diag-copy-btn',
          variant: 'hbtn',
          text: t('diag_copy_report'),
          onClick: () => this._copyReport()
        }),
        new UIButton({
          id: 'diag-clear-btn',
          variant: 'hbtn',
          text: t('diag_clear'),
          onClick: () => diagnostics.clearErrors()
        })
      ]
    }));
  }

  /** @private */
  async _copyReport() {
    const diagnostics = DiagnosticsSystem.getInstance();
    const count = diagnostics.getErrorCount();
    let copied = false;
    try {
      copied = await BrowserDiagnostics.copyErrorReport();
    } catch (_) {
      copied = false;
    }
    NotificationSystem.getInstance().notifyTemporary(
      t(copied ? 'diag_report_copied' : 'diag_report_copy_failed', { n: count }),
      {
        channel: NotificationChannels.SYSTEM,
        tone: copied ? NotificationTones.SUCCESS : NotificationTones.DANGER
      }
    );
  }
}
