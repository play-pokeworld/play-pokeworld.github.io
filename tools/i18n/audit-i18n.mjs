/**
 * @file audit-i18n.mjs
 * @brief Developer audit tool for the localization system (not shipped in the game).
 *
 * Usage: node tools/i18n/audit-i18n.mjs [--verbose]
 *
 * Reports, per category, everything that escapes the localization system:
 *   1. missing literal keys / dynamic keys derived from game data
 *   2. hardcoded player-visible strings in the UI, pages and systems
 *   3. text that loses its translation key (concatenation, template literals, String())
 *   4. translated text stored in state (data / systems / DTO payloads)
 *   5. views that build text once and never react to LanguageChangedEvent
 *   6. untranslated entries (EN identical to FR, FR leaking into EN)
 */

import fs from 'fs';
import path from 'path';
import { listJsFiles, stripComments } from '../../tests/SourceScanner.js';

const ROOT = path.resolve('.');
const SRC = path.join(ROOT, 'src');
const VERBOSE = process.argv.includes('--verbose');

const report = new Map();
const push = (category, entry) => {
  if (!report.has(category)) report.set(category, []);
  report.get(category).push(entry);
};

const files = listJsFiles(SRC);
const codeFiles = files.filter((f) => !f.startsWith('localization/fr/') && !f.startsWith('localization/en/') && !f.startsWith('data/raw/'));

/** Removes comments but keeps line count so reported lines stay accurate. */
const read = (file) => stripComments(fs.readFileSync(path.join(SRC, file), 'utf8'));

// ---------------------------------------------------------------- 1. keys
const { LocalizationManager } = await import('../../src/localization/LocalizationManager.js');
const manager = LocalizationManager.getInstance();
const tables = manager._tables;
const hasKey = (key) => key in tables.fr || key in tables.en;

for (const file of codeFiles) {
  const code = read(file);
  code.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\bt\(\s*`([^`]*)`/g)) {
      // Dynamic template key: the static prefix is checked, the variable part is listed for review
      const prefix = m[1].split('${')[0];
      if (prefix && !prefix.endsWith('.')) push('dynamic-key-unknown-prefix', `${file}:${i + 1}: ${m[0]}`);
      push('dynamic-keys', `${file}:${i + 1}: ${m[0].slice(0, 100)}`);
    }
    for (const m of line.matchAll(/\bt\(\s*([A-Za-z_$][\w$.]*)\s*[,)]/g)) {
      push('variable-keys', `${file}:${i + 1}: ${m[0].slice(0, 100)}`);
    }
  });
}

// ------------------------------------------------- 2. hardcoded UI strings
const PROSE = /[A-Za-zÀ-ÿ]{2,}/;
const CSS_OR_ID = /^(pw-|dash-|win-|btn-|is-|has-|col-|[a-z0-9-]+$)/;
const ALLOWED_LITERALS = new Set(['', ' ', 'button', 'label', 'div', 'span', 'img', 'p', 'h1', 'h2', 'h3', 'h4', 'li', 'ul', 'a', 'input', 'select', 'option', 'left', 'right', 'center', 'top', 'bottom', 'md', 'sm', 'lg', 'xs', 'xl', 'default', 'primary', 'secondary', 'danger', 'success', 'ghost', 'tab', 'hbtn', 'native', 'true', 'false', 'none', 'auto', 'hidden', 'default']);

for (const file of codeFiles) {
  const code = read(file);
  code.split('\n').forEach((line, i) => {
    // Player-visible widget option receiving a raw literal
    for (const m of line.matchAll(/\b(text|label|title|placeholder|alt|tooltip|closeLabel|cancelLabel|confirmLabel|removeLabel|header|subtitle|description|message)\s*:\s*(['"])(.*?)\2/g)) {
      const value = m[3];
      if (ALLOWED_LITERALS.has(value) || CSS_OR_ID.test(value)) continue;
      if (/^[a-z_][a-z0-9_.]*$/.test(value)) continue; // key-like lowercase, reported elsewhere
      if (PROSE.test(value)) push('hardcoded-ui-option', `${file}:${i + 1}: ${m[0]}`);
    }
    for (const m of line.matchAll(/\.set(Text|RichText|Tooltip|Placeholder|Label)\(\s*(['"])(.*?)\2/g)) {
      const value = m[3];
      if (ALLOWED_LITERALS.has(value) || CSS_OR_ID.test(value)) continue;
      if (PROSE.test(value)) push('hardcoded-ui-setter', `${file}:${i + 1}: ${m[0]}`);
    }
  });
}

// ------------------------------- 3. text that loses its translation key
// A text built with `+`, a bare template literal, String(), a string method or Array.join() becomes a
// plain string: the language change can no longer reach it. Use t(key, params), compose() or lt``.
for (const file of codeFiles) {
  const code = read(file);
  code.split('\n').forEach((line, i) => {
    if (/\bt\([^)]*\)\s*\+|\+\s*t\(/.test(line)) push('concat', `${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    if (/\bt\([^)]*\)\.(trim|replace|toUpperCase|toLowerCase|slice|split|padStart|padEnd)\(/.test(line)) {
      push('string-method-on-text', `${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
    // A bare template literal (not prefixed by `lt`) that interpolates a translated text
    if (/(^|[^\w$.])`[^`]*\$\{\s*t\(/.test(line)) push('untagged-template', `${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    if (/String\(\s*t\(/.test(line)) push('string-cast', `${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    if (/\.join\(\s*['"]/.test(line) && !/className|classes|filter\(Boolean\)|join\('\|'\)/.test(line)) {
      push('array-join', `${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
    if (/===\s*t\(|\.includes\(\s*t\(|\.indexOf\(\s*t\(/.test(line)) {
      push('identity-comparison', `${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
}

// ------------------------- 4. translated text stored in state / payloads
for (const file of files.filter((f) => /^(systems|data|core)\//.test(f) && !f.startsWith('localization'))) {
  const code = read(file);
  code.split('\n').forEach((line, i) => {
    if (/\b(name|label|title|desc|description|text|message|body|tooltip)\s*:\s*t\(/.test(line)) {
      push('localized-text-in-payload', `${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
}

// --------------------------- 5. views that never react to a language change
// Since v1.17.0 the widgets bind their texts (LocalizedTextBinder): a view only needs its own
// LanguageChangedEvent listener when it derives *structure* from the text (map labels, sorting…).
// This list is therefore informational: check that a view without listener builds no text itself.
for (const file of files.filter((f) => /^(panels|pages|ui)\//.test(f))) {
  const code = read(file);
  const usesText = /\bt\(/.test(code);
  const listens = /LanguageChangedEvent/.test(code);
  if (usesText && !listens) push('view-relying-on-the-binder', file);
}

// ------------------------------------------- 6. untranslated / identical
const accents = /[àâäéèêëîïôöùûüçœ]/i;
for (const key of Object.keys(tables.fr)) {
  const fr = tables.fr[key];
  const en = tables.en[key];
  if (en === undefined) continue;
  if (fr === en && accents.test(fr)) push('en-identical-to-fr', `${key}: ${fr.slice(0, 80)}`);
  else if (fr === en && fr.split(' ').length > 3) push('identical-strings', `${key}: ${fr.slice(0, 80)}`);
  if (en && accents.test(en) && !/pok[eé]mon|Pok[eé]ball/i.test(en)) push('en-with-french-accents', `${key}: ${en.slice(0, 80)}`);
}

// --------------------------------------------------------------- summary
const out = [];
for (const [category, entries] of [...report.entries()].sort()) {
  out.push(`\n${category}: ${entries.length}`);
  const shown = VERBOSE ? entries : entries.slice(0, 8);
  for (const entry of shown) out.push(`  - ${entry}`);
  if (!VERBOSE && entries.length > shown.length) out.push(`  … ${entries.length - shown.length} more (--verbose)`);
}
console.log(out.join('\n'));
