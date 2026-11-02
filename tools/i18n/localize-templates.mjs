/**
 * @file localize-templates.mjs
 * @brief One-shot codemod: prefixes with `lt` every template literal that interpolates a translated
 *        text, so the composed text keeps the keys of its parts (developer tool).
 *
 * Usage: node tools/i18n/localize-templates.mjs [--dry]
 *
 * A template literal such as
 *     `${t('level_word')} ${level}`
 * produces a plain string: the language change can no longer reach it. Rewritten as
 *     lt`${t('level_word')} ${level}`
 * every translated part is resolved again in the active language.
 */

import fs from 'fs';
import path from 'path';
import { listJsFiles } from '../../tests/SourceScanner.js';

const DRY = process.argv.includes('--dry');
const SRC = path.resolve('src');
const files = listJsFiles(SRC).filter(
  (file) => !file.startsWith('localization/') && !file.startsWith('data/raw/')
);

/** Returns the [start, end] span of the template literal starting at `index` of a backtick. */
function findLiteralEnd(code, start) {
  let depth = 0;
  for (let i = start + 1; i < code.length; i++) {
    const c = code[i];
    if (c === '\\') { i++; continue; }
    if (c === '`' && depth === 0) return i;
    if (c === '$' && code[i + 1] === '{') { depth++; i++; continue; }
    if (c === '}' && depth > 0) { depth--; continue; }
  }
  return -1;
}

const changed = [];
for (const file of files) {
  const original = fs.readFileSync(path.join(SRC, file), 'utf8');
  let code = '';
  let index = 0;
  let edits = 0;

  while (index < original.length) {
    const backtick = original.indexOf('`', index);
    if (backtick < 0) { code += original.slice(index); break; }
    code += original.slice(index, backtick);

    const end = findLiteralEnd(original, backtick);
    if (end < 0) { code += original.slice(backtick); break; }

    const body = original.slice(backtick, end + 1);
    const isAlreadyTagged = /[A-Za-z_$][\w$.]*$/.test(code) && /(^|[^\w$.])(lt|compose)$/.test(code.trimEnd());
    const interpolates = /\$\{[^}]*\bt\(/.test(body) || /\$\{[^}]*\b(compose|lt)\(/.test(body);

    if (interpolates && !isAlreadyTagged) {
      code += `lt${body}`;
      edits++;
    } else {
      code += body;
    }
    index = end + 1;
  }

  if (!edits) continue;
  changed.push(`${file}: ${edits}`);

  // Import `lt` where it is now used.
  const importLine = "import { lt } from '";
  const depth = file.split('/').length - 1;
  const relative = '../'.repeat(depth) + 'localization/LocalizationManager.js';
  if (!/LocalizationManager\.js';/.test(code)) {
    const lastImport = [...code.matchAll(/^import .*;$/gm)].pop();
    const anchor = lastImport ? lastImport.index + lastImport[0].length : 0;
    code = `${code.slice(0, anchor)}\n${importLine}${relative}';${code.slice(anchor)}`;
  } else {
    code = code.replace(/import \{([^}]*)\} from '((?:\.\.\/)*localization\/LocalizationManager\.js)';/, (match, names, from) => {
      const list = names.split(',').map((name) => name.trim()).filter(Boolean);
      if (!list.includes('lt')) list.push('lt');
      return `import { ${list.join(', ')} } from '${from}';`;
    });
  }

  if (!DRY) fs.writeFileSync(path.join(SRC, file), code);
}

console.log(changed.join('\n'));
console.log(`\n${changed.length} files ${DRY ? 'would be' : 'were'} updated`);
