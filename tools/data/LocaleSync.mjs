/**
 * @file LocaleSync.mjs
 * @brief Keeps a localization table in sync with a generated data table.
 * Existing texts always win (they may have been edited by hand); missing keys are added with
 * the default text extracted from the original data; keys unknown to the data are reported.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { PROJECT_ROOT } from './TableWriter.mjs';

/**
 * @param {string} file - Path relative to the project root
 * @returns {Promise<*>} The first export of the module, or null when the file does not exist
 */
export async function readLocaleTable(file) {
  const target = path.join(PROJECT_ROOT, file);
  if (!fs.existsSync(target)) return null;
  const module = await import(`${pathToFileURL(target).href}?t=${Date.now()}`);
  return Object.values(module)[0] ?? null;
}

/**
 * @param {Object} options
 * @param {string} options.file - Path relative to the project root
 * @param {string} options.name - Exported constant
 * @param {string} options.title - Header comment
 * @param {Object} options.defaults - key -> default value (string or {name, desc})
 * @param {function(*):Object} [options.convert] - Converts a legacy table shape (e.g. an array)
 * @param {boolean} [options.prune=false] - Drop keys that the data does not know
 * @param {function(string):boolean} [options.isPlaceholder] - Texts treated as missing (generic filler)
 * @returns {Promise<{added: number, unknown: string[]}>}
 */
export async function syncLocaleTable({ file, name, title, defaults, convert = (table) => table, prune = false, isPlaceholder = () => false }) {
  const existing = convert((await readLocaleTable(file)) || {});
  const merged = {};
  let added = 0;
  for (const [key, value] of Object.entries(defaults)) {
    const current = existing[key];
    if (current && typeof current === 'object' && value && typeof value === 'object') {
      const entry = { ...current };
      for (const [field, text] of Object.entries(value)) {
        if ((!entry[field] || isPlaceholder(entry[field])) && text) { entry[field] = text; added++; }
      }
      merged[key] = entry;
    } else if (current) {
      merged[key] = current;
    } else if (value) {
      merged[key] = value;
      added++;
    }
  }
  const unknown = Object.keys(existing).filter((key) => !(key in defaults));
  if (!prune) for (const key of unknown) merged[key] = existing[key];
  const sorted = Object.fromEntries(Object.keys(merged).sort().map((key) => [key, merged[key]]));
  const text = `// ===== ${title} =====\n// Keys come from the data tables (tools/data); texts can be edited by hand.\nexport const ${name} = ${JSON.stringify(sorted, null, 2)};\n`;
  fs.writeFileSync(path.join(PROJECT_ROOT, file), text);
  return { added, unknown };
}
