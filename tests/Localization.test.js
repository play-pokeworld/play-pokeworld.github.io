/**
 * @file Localization.test.js
 * @brief Localization integrity: no key collisions, FR/EN parity, every literal key used in code exists.
 */

import fs from 'fs';
import path from 'path';
import { describe, assert } from './TestRunner.js';
import { listJsFiles, stripComments } from './SourceScanner.js';
import { LocalizationManager } from '../src/localization/LocalizationManager.js';
import { GameConfig } from '../src/config/GameConfig.js';

const SRC = path.resolve('src');
const manager = LocalizationManager.getInstance();
const tables = manager._tables;
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Localization', (test) => {
  test('no key is defined twice in the same language', () => {
    assert.empty(manager.getCollisions(), 'collisions');
  });

  test('every supported language has a table', () => {
    for (const lang of GameConfig.SUPPORTED_LANGUAGES) assert.ok(Object.keys(tables[lang] || {}).length > 1000, `table ${lang}`);
  });

  test('FR and EN define exactly the same keys', () => {
    const fr = new Set(Object.keys(tables.fr));
    const en = new Set(Object.keys(tables.en));
    const missing = [...fr].filter((k) => !en.has(k)).map((k) => `en lacks ${k}`)
      .concat([...en].filter((k) => !fr.has(k)).map((k) => `fr lacks ${k}`));
    assert.empty(missing, 'parity');
  });

  test('FR and EN use the same {placeholders} for UI strings', () => {
    const contentPrefixes = ['move_desc.', 'item.', 'quests.', 'guide_', 'tutorial_'];
    const diff = Object.keys(tables.fr)
      .filter((k) => !contentPrefixes.some((p) => k.startsWith(p)))
      .filter((k) => placeholders(tables.fr[k]).join() !== placeholders(tables.en[k]).join())
      .map((k) => `${k}: fr {${placeholders(tables.fr[k])}} / en {${placeholders(tables.en[k])}}`);
    assert.empty(diff, 'placeholder mismatch');
  });

  test('every literal t("key") used in the code exists in FR and EN', () => {
    const missing = [];
    for (const file of listJsFiles(SRC, ['localization'])) {
      const code = stripComments(fs.readFileSync(path.join(SRC, file), 'utf8'));
      for (const m of code.matchAll(/\bt\(\s*['"]([^'"$]+)['"]/g)) {
        for (const lang of ['fr', 'en']) {
          if (!(m[1] in tables[lang])) missing.push(`${file}: ${m[1]} (${lang})`);
        }
      }
    }
    assert.empty(missing, 'missing keys');
  });

  test('t() interpolates parameters and returns the key when missing', () => {
    manager.setLanguage('en');
    assert.equal(manager.t('this.key.does.not.exist'), 'this.key.does.not.exist');
    const key = Object.keys(tables.en).find((k) => placeholders(tables.en[k]).length === 1 && !k.includes('.'));
    const name = placeholders(tables.en[key])[0];
    assert.ok(manager.t(key, { [name]: 'XYZ' }).includes('XYZ'), `interpolation of ${key}`);
  });

  test('setLanguage switches the active table', () => {
    manager.setLanguage('fr');
    assert.equal(manager.currentLang, 'fr');
    manager.setLanguage('en');
    assert.equal(manager.currentLang, 'en');
  });
});
