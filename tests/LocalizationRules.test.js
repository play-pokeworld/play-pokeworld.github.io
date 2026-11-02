/**
 * @file LocalizationRules.test.js
 * @brief Static rules of the localization system (v1.16.1): the patterns that make a text freeze in
 *        one language are rejected at build time, before they reach a player.
 *
 * The runtime counterpart (`LocalizationRuntime.test.js`) checks the behaviour on real views.
 */

import fs from 'fs';
import path from 'path';
import { describe, assert } from './TestRunner.js';
import { listJsFiles, stripComments, findMatches } from './SourceScanner.js';
import { LocalizationManager } from '../src/localization/LocalizationManager.js';

const SRC = path.resolve('src');
const ALL = listJsFiles(SRC);
/** Code files: translation tables and raw game data are content, not code. */
const CODE = listJsFiles(SRC, ['localization/fr', 'localization/en', 'data/raw']);
const tables = LocalizationManager.getInstance()._tables;

describe('Localization rules', (test) => {
  test('every translation file of a language is registered in the catalog and exists in every language', () => {
    const languages = fs.readdirSync(path.join(SRC, 'localization')).filter((entry) =>
      fs.statSync(path.join(SRC, 'localization', entry)).isDirectory()
    );
    const catalog = fs.readFileSync(path.join(SRC, 'localization', 'LocaleCatalog.js'), 'utf8');
    // `server.js` feeds the launcher console (tools/server/), it never reaches the game catalog.
    const OUTSIDE_CATALOG = new Set(['server.js']);
    const problems = [];
    for (const lang of languages) {
      for (const file of fs.readdirSync(path.join(SRC, 'localization', lang))) {
        if (!file.endsWith('.js') || OUTSIDE_CATALOG.has(file)) continue;
        const imported = catalog.includes(`./${lang}/${file}`);
        if (!imported) problems.push(`${lang}/${file} is not imported by LocaleCatalog`);
        for (const other of languages) {
          if (!fs.existsSync(path.join(SRC, 'localization', other, file))) {
            problems.push(`${other}/${file} is missing`);
          }
        }
      }
    }
    assert.empty(problems, 'unregistered or missing translation files');
  });

  test('a translated text is never concatenated with +', () => {
    assert.empty(findMatches(SRC, CODE, /\bt\([^)]*\)\s*\+\s*[^=]|\+\s*t\(/), 'string concatenation of t()');
  });

  test('a translated text is never converted by a string method (the key would be lost)', () => {
    assert.empty(
      findMatches(SRC, CODE, /\bt\(\s*'[^']*'(?:\s*,\s*[^()]*)?\)\.(trim|replace|toUpperCase|toLowerCase|slice|split|padStart|padEnd)\(/),
      'string method applied to a translation'
    );
  });

  test('a template literal interpolating a translation is tagged with lt', () => {
    const offenders = [];
    for (const file of CODE) {
      const code = stripComments(fs.readFileSync(path.join(SRC, file), 'utf8'));
      code.split('\n').forEach((line, index) => {
        // Bare template literal, or a template nested inside an interpolation of another one: both
        // flatten the text into a plain string.
        const bare = /(^|[^\w$.])`[^`]*\$\{\s*t\(/.test(line);
        const nested = /\$\{[^`}]*`[^`]*\$\{\s*t\(/.test(line);
        if (bare || nested) offenders.push(`${file}:${index + 1}: ${line.trim().slice(0, 110)}`);
      });
    }
    assert.empty(offenders, 'untagged template literals');
  });

  test('a translated text is never compared by identity', () => {
    assert.empty(findMatches(SRC, CODE, /===\s*t\(|\.includes\(\s*t\(|\.indexOf\(\s*t\(/), 'identity comparison');
  });

  test('no player-visible literal in a widget option (text, label, title, tooltip)', () => {
    const allowed = /^(|pw-[\w-]+|[\w-]+|[a-z][\w.]*|left|right|center|top|bottom|sm|md|lg|xs|xl|primary|secondary|danger|success|ghost|tab|hbtn|native)$/;
    const offenders = [];
    for (const file of CODE) {
      const code = stripComments(fs.readFileSync(path.join(SRC, file), 'utf8'));
      code.split('\n').forEach((line, index) => {
        for (const match of line.matchAll(/\b(text|label|title|placeholder|alt|tooltip|closeLabel|cancelLabel|confirmLabel|removeLabel)\s*:\s*(['"])(.*?)\2/g)) {
          const value = match[3];
          if (allowed.test(value)) continue;
          // Arrows, crosses, escaped glyphs (\u2715) and punctuation carry no language.
          if (!/[a-zà-ÿ]/i.test(value.replace(/\\u\{?[0-9a-f]{2,6}\}?/gi, ''))) continue;
          offenders.push(`${file}:${index + 1}: ${match[0]}`);
        }
      });
    }
    assert.empty(offenders, 'hardcoded widget text');
  });

  test('the localization API exposed to the components is the documented one', () => {
    const manager = LocalizationManager.getInstance();
    for (const method of ['t', 'tOr', 'text', 'compose', 'join', 'resolve', 'has']) {
      assert.equal(typeof manager[method], 'function', `LocalizationManager.${method}()`);
    }
    // t() keeps its key: it is a String that can be resolved again in another language.
    manager.setLanguage('fr');
    const token = manager.t('btn_cancel');
    assert.ok(token.key === 'btn_cancel', 't() returns a token carrying its key');
    manager.setLanguage('en');
    assert.equal(manager.resolve(token), tables.en.btn_cancel, 'the same token resolves in the new language');
    manager.setLanguage('fr');
    assert.equal(manager.resolve(token), tables.fr.btn_cancel, 'and back in the previous one');
  });

  test('tOr falls back without losing the key of the fallback', () => {
    const manager = LocalizationManager.getInstance();
    manager.setLanguage('fr');
    const fallback = manager.t('btn_cancel');
    assert.equal(manager.resolve(manager.tOr('this.key.does.not.exist', fallback)), tables.fr.btn_cancel);
    assert.equal(manager.resolve(manager.tOr('this.key.does.not.exist', 'raw-id')), 'raw-id');
  });

  test('compose and join keep every part translatable', () => {
    const manager = LocalizationManager.getInstance();
    manager.setLanguage('fr');
    const title = manager.t('btn_cancel');
    const composed = manager.compose(title, ' · ', manager.t('btn_confirm'));
    manager.setLanguage('en');
    assert.equal(
      manager.resolve(composed),
      `${tables.en.btn_cancel} · ${tables.en.btn_confirm}`,
      'a composed text follows the language change'
    );
    assert.equal(
      manager.resolve(manager.join(', ', [manager.t('btn_cancel'), manager.t('btn_confirm')])),
      `${tables.en.btn_cancel}, ${tables.en.btn_confirm}`,
      'a joined list follows the language change'
    );
    manager.setLanguage('fr');
  });
});
