/**
 * @file BrowserLauncher.js
 * @brief Opens the default web browser on a URL (Windows / macOS / Linux).
 */

import { exec } from 'node:child_process';

/**
 * @param {string} targetUrl
 * @param {Function} onFailure - Called when the browser could not be opened
 */
export function openBrowser(targetUrl, onFailure) {
  const command = process.platform === 'win32' ? `start "" "${targetUrl}"`
    : process.platform === 'darwin' ? `open "${targetUrl}"`
    : `xdg-open "${targetUrl}"`;

  try {
    exec(command, (err) => {
      if (err) onFailure();
    });
  } catch (_) {
    onFailure();
  }
}
