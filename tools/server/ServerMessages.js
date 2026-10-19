/**
 * @file ServerMessages.js
 * @brief Loads the localized console / HTTP messages of the local server.
 * Texts live with the game translations: src/localization/<lang>/server.js.
 * Language: POKEWORLD_LANG env variable, otherwise the OS locale, otherwise English.
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const SUPPORTED_LANGUAGES = ['fr', 'en'];
const FALLBACK_LANGUAGE = 'en';

/** @returns {string} */
function detectLanguage() {
  const requested = String(process.env.POKEWORLD_LANG || '').toLowerCase();
  if (SUPPORTED_LANGUAGES.includes(requested)) return requested;

  const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
  const osLanguage = locale.slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(osLanguage) ? osLanguage : FALLBACK_LANGUAGE;
}

/**
 * @param {string} rootDir - Game root directory
 * @returns {Promise<Object>} Flat key -> text table
 */
export async function loadServerMessages(rootDir) {
  const lang = detectLanguage();
  const file = path.join(rootDir, 'src', 'localization', lang, 'server.js');
  const module = await import(pathToFileURL(file).href);
  return module.server;
}

/**
 * Replaces {name} placeholders.
 * @param {string} text
 * @param {Object} [params={}]
 * @returns {string}
 */
export function format(text, params = {}) {
  return String(text).replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}
