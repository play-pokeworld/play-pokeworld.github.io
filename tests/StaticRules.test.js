/**
 * @file StaticRules.test.js
 * @brief Enforces the architecture rules of Rules.md on the source tree.
 */

import fs from 'fs';
import path from 'path';
import { describe, assert } from './TestRunner.js';
import { listJsFiles, findMatches, findBrokenImports, stripComments } from './SourceScanner.js';

const SRC = path.resolve('src');
const ALL = listJsFiles(SRC);
/** Code files: localization tables and raw game data are content, not code. */
const CODE = listJsFiles(SRC, ['localization/fr', 'localization/en', 'data/raw']);

/** Files allowed to touch the global browser objects. */
const DOM_ALLOWED = (file) => file.startsWith('ui/') || file === 'main.js' || file === 'core/LocalStore.js';

describe('Static rules', (test) => {
  test('every relative import resolves to an existing export', () => {
    assert.empty(findBrokenImports(SRC, ALL), 'broken imports');
  });

  test('no HTML string injection (innerHTML / outerHTML / insertAdjacentHTML)', () => {
    assert.empty(findMatches(SRC, ALL, /\b(innerHTML|outerHTML|insertAdjacentHTML)\b/), 'HTML injection');
  });

  test('document / window are only used by src/ui, main.js and LocalStore', () => {
    const files = CODE.filter((file) => !DOM_ALLOWED(file));
    assert.empty(findMatches(SRC, files, /\b(document|window)\s*\./), 'DOM access outside the UI layer');
  });

  test('localStorage is only used by core/LocalStore.js', () => {
    const files = ALL.filter((file) => file !== 'core/LocalStore.js');
    assert.empty(findMatches(SRC, files, /\blocalStorage\b/), 'direct localStorage access');
  });

  test('no inline style assignment (styling goes through CSS classes and variables)', () => {
    assert.empty(findMatches(SRC, CODE, /\.style\.(?!setProperty|removeProperty|getPropertyValue)[A-Za-z]+\s*=|\.style\s*=|cssText/), 'inline styles');
  });

  test('pages are only imported by PageRegistry', () => {
    const pageFile = /from\s+['"][^'"]*\/(?!BasePage|PageIds|PageRegistry)[A-Za-z]+Page\.js['"]|from\s+['"]\.\/(?!BasePage|PageIds|PageRegistry)[A-Za-z]+Page\.js['"]/;
    const files = CODE.filter((file) => file !== 'pages/PageRegistry.js');
    assert.empty(findMatches(SRC, files, pageFile), 'page imported outside PageRegistry');
  });

  test('no literal text in console calls (debug logs are localized)', () => {
    assert.empty(findMatches(SRC, CODE, /console\.(log|info|warn|error|debug)\(\s*['"`]/), 'literal console text');
  });

  test('no emoji in code (icons come from IconRegistry)', () => {
    assert.empty(findMatches(SRC, CODE, /\p{Extended_Pictographic}/u), 'emoji in code');
  });

  test('no French comments in code (code is English-only)', () => {
    const hits = [];
    for (const file of ALL.filter((f) => !f.startsWith('localization/fr/') && !f.startsWith('localization/en/'))) {
      const code = fs.readFileSync(path.join(SRC, file), 'utf8');
      const comments = code.length - stripComments(code).length > 0 ? code.match(/\/\/.*|\/\*[\s\S]*?\*\//g) || [] : [];
      for (const comment of comments) {
        if (/\b(le|la|les|des|une|est|pour|avec|dans|sur|pas)\b.*\b(le|la|les|des|une|est|pour|avec|dans)\b/i.test(comment)
          && /[éèêàùç]/.test(comment)) {
          hits.push(`${file}: ${comment.trim().slice(0, 100)}`);
        }
      }
    }
    assert.empty(hits, 'French comments');
  });

  test('no legacy global surface (globalThis / window assignments)', () => {
    const files = ALL.filter((file) => file !== 'core/LocalStore.js');
    assert.empty(findMatches(SRC, files, /\bglobalThis\b|\bwindow\.[A-Za-z_$]+\s*=[^=]/), 'global surface');
  });

  test('assets are referenced from the root assets/ folder only', () => {
    assert.empty(findMatches(SRC, ALL, /src\/assets\//), 'src/assets path');
  });

  test('one class per file', () => {
    const offenders = CODE.filter((file) => {
      const code = stripComments(fs.readFileSync(path.join(SRC, file), 'utf8'));
      return (code.match(/^\s*(export\s+)?class\s+\w+/gm) || []).length > 1;
    });
    assert.empty(offenders, 'files declaring several classes');
  });

  test('pages never keep a reference to a panel or a modal', () => {
    const pages = CODE.filter((file) => file.startsWith('pages/'));
    assert.empty(findMatches(SRC, pages, /this\._\w+\s*=\s*new\s+\w+(Panel|Modal)\s*\(/), 'panel / modal stored by a page');
  });

  test('every dashboard panel receives its starting column', () => {
    const offenders = CODE.filter((file) => {
      const code = stripComments(fs.readFileSync(path.join(SRC, file), 'utf8'));
      return /extends DraggablePanel/.test(code) && !/constructor\(column\)[\s\S]*?\bcolumn,/.test(code);
    });
    assert.empty(offenders, 'DraggablePanel subclasses without constructor(column)');
  });

  test('dashboard windows never scroll internally (dashboard-layout.css)', () => {
    const css = fs.readFileSync(path.resolve('assets/css/dashboard-layout.css'), 'utf8');
    assert.ok(/\.dash-win > \.win-body \{[^}]*overflow: visible !important/.test(css), 'win-body overflow visible');
    assert.ok(/#main-dashboard \{[^}]*overflow-y: auto !important/.test(css), 'the dashboard is the scroll container');
    assert.ok(/@import url\("\.\/dashboard-layout\.css"\);\s*$/m.test(fs.readFileSync(path.resolve('assets/css/style.css'), 'utf8')), 'loaded by style.css');
  });
});
