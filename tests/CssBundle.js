/**
 * @file CssBundle.js
 * @brief Reads the stylesheet bundle the way the browser does (developer helper for tests and tools).
 *
 * Since 1.16.14 the stylesheets are one file per object (`core/`, `layout/`, `components/`,
 * `panels/`) and `assets/css/style.css` is a pure manifest: one `@import` per sheet, whose order is
 * the cascade. Tests and tools must not hard-code one sheet any more — a rule may legitimately live
 * in `components/ui-button.css` or in `panels/team.css` — so they read the resolved bundle.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRY = 'assets/css/style.css';

/**
 * Ordered list of the sheets, resolved recursively from the manifest.
 * @returns {string[]} Paths relative to the project root
 */
export function stylesheetOrder() {
  const seen = new Set();
  const order = [];
  const walk = (relative) => {
    if (seen.has(relative)) throw new Error(`stylesheet imported twice: ${relative}`);
    seen.add(relative);
    const text = fs.readFileSync(path.join(PROJECT_ROOT, relative), 'utf8');
    for (const match of text.matchAll(/@import url\("\.\/([^"]+)"\);/g)) {
      walk(path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1])));
    }
    if (!relative.endsWith('style.css')) order.push(relative);
  };
  walk(ENTRY);
  return order;
}

/**
 * The whole cascade, in the browser's order, as one string.
 * @returns {string}
 */
export function readBundle() {
  return stylesheetOrder()
    .map((relative) => fs.readFileSync(path.join(PROJECT_ROOT, relative), 'utf8'))
    .join('\n');
}

/**
 * One sheet by its path suffix, e.g. `readSheet('ui-button.css')`.
 * @param {string} suffix
 * @returns {string}
 */
export function readSheet(suffix) {
  const relative = stylesheetOrder().find((entry) => entry.endsWith(suffix));
  if (!relative) throw new Error(`unknown stylesheet: ${suffix}`);
  return fs.readFileSync(path.join(PROJECT_ROOT, relative), 'utf8');
}

/** @returns {string} The manifest itself (imports only, no rules). */
export function readManifest() {
  return fs.readFileSync(path.join(PROJECT_ROOT, ENTRY), 'utf8');
}

export { PROJECT_ROOT };

/**
 * Absolute path of a sheet, wherever it now lives in the tree.
 * @param {string} suffix - e.g. 'ui-button.css'
 * @returns {string}
 */
export function sheetPath(suffix) {
  const relative = stylesheetOrder().find((entry) => entry.endsWith(suffix));
  if (!relative) throw new Error(`unknown stylesheet: ${suffix}`);
  return path.join(PROJECT_ROOT, relative);
}
