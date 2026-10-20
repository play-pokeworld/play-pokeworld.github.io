/**
 * @file BrowserDiagnostics.js
 * @brief Browser-only error hooks and clipboard adapter for DiagnosticsSystem.
 */

import { DiagnosticsSystem } from '../systems/DiagnosticsSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { GameConfig } from '../config/GameConfig.js';
import { t } from '../localization/LocalizationManager.js';

const ERROR_CONTEXT = 'window.onerror';
const REJECTION_CONTEXT = 'unhandledrejection';

export class BrowserDiagnostics {
  /** @private @type {WeakSet<object>} */
  static _installedTargets = new WeakSet();

  /**
   * Installs the browser's global error listeners once per target.
   * @param {Window|EventTarget|null} [target]
   * @returns {boolean}
   */
  static install(target = typeof window !== 'undefined' ? window : null) {
    if (!target || typeof target.addEventListener !== 'function' || BrowserDiagnostics._installedTargets.has(target)) {
      return false;
    }
    BrowserDiagnostics._installedTargets.add(target);
    target.addEventListener('error', (event) => {
      const error = event?.error;
      if (error && typeof error === 'object') {
        DiagnosticsSystem.getInstance().recordError(error, ERROR_CONTEXT);
        return;
      }
      const message = event?.message || 'Script error';
      const location = event?.filename
        ? ` @ ${event.filename}:${Number(event.lineno) || 0}:${Number(event.colno) || 0}`
        : '';
      DiagnosticsSystem.getInstance().recordError(`${message}${location}`, ERROR_CONTEXT);
    });
    target.addEventListener('unhandledrejection', (event) => {
      DiagnosticsSystem.getInstance().recordError(event?.reason || 'Unhandled promise rejection', REJECTION_CONTEXT);
    });
    return true;
  }

  /** @returns {string} Privacy-conscious JSON report for support/debugging. */
  static buildErrorReport() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const browser = typeof navigator !== 'undefined' ? navigator : null;
    const localization = typeof document !== 'undefined' ? document.documentElement?.lang : '';
    const report = {
      application: t('app_name'),
      build: GameConfig.VERSION,
      createdAt: new Date().toISOString(),
      userAgent: browser?.userAgent || '',
      language: localization || '',
      activeSave: save ? {
        region: save.player.region || '',
        location: save.player.location || '',
        teamSize: save.team.length,
        boxSize: save.box.length
      } : null,
      errors: DiagnosticsSystem.getInstance().getErrors()
    };
    return JSON.stringify(report, null, 2);
  }

  /**
   * Copies the current report using the Clipboard API, with a browser fallback.
   * @returns {Promise<boolean>}
   */
  static async copyErrorReport() {
    const text = BrowserDiagnostics.buildErrorReport();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      // Fall through to the compatibility copy path.
    }

    if (typeof document === 'undefined' || !document.body || typeof document.execCommand !== 'function') return false;
    let textarea = null;
    try {
      textarea = document.createElement('textarea');
      textarea.className = 'pw-clipboard-fallback';
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      return document.execCommand('copy') === true;
    } catch (_) {
      return false;
    } finally {
      textarea?.remove();
    }
  }
}
