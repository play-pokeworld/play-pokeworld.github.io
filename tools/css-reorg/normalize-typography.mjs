/**
 * tools/css-reorg/normalize-typography.mjs
 * ---------------------------------------------------------------------------
 * Developer tool (not shipped): rewrites every px `font-size` of the stylesheet bundle
 * to a step of the typography scale declared once in `assets/css/core/tokens.css`.
 *
 * Two sheets are deliberately excluded:
 *   - components/ui-icon.css  : `font-size` there sizes a glyph, not text;
 *   - panels/save-menu.css    : the save menu is outside the rework (decision of §10 of
 *                               the passation), so its display sizes are left untouched.
 *
 * Relative sizes (em, rem, %, clamp(), var()) are never rewritten.
 * Usage: node tools/css-reorg/normalize-typography.mjs [--write]
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CSS_ROOT = path.join(ROOT, 'assets/css');
const WRITE = process.argv.includes('--write');

const SKIP = new Set(['components/ui-icon.css', 'panels/save-menu.css']);

/** px value -> scale step. Values are the ones actually present in the bundle. */
const STEPS = [
  [10, 'xs'], [10.5, 'xs'],
  [11, 'sm'], [11.5, 'sm'],
  [12, 'md'], [12.5, 'md'],
  [13, 'lg'], [13.5, 'lg'],
  [14, 'xl'], [15, 'xl'],
  [16, '2xl'],
  [17, '3xl'], [18, '3xl'],
  [19, '3xl'], [20, '4xl'], [21, '4xl'], [22, '4xl'], [24, '4xl'], [25, '4xl'],
  [26, '5xl'], [28, '5xl'],
  [30, 'display'], [32, 'display'], [34, 'display'], [38, 'display'], [40, 'display']
];
const BY_VALUE = new Map(STEPS);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

const report = { files: 0, rewritten: 0, kept: [], unmapped: [] };

for (const file of walk(CSS_ROOT)) {
  const relative = path.relative(CSS_ROOT, file).split(path.sep).join('/');
  if (SKIP.has(relative)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/font-size:\s*([0-9.]+)px(\s*!important)?/g, (match, value, bang) => {
    const step = BY_VALUE.get(Number(value));
    if (!step) {
      report.unmapped.push(`${relative}: ${match}`);
      return match;
    }
    report.rewritten += 1;
    return `font-size: var(--pw-font-size-${step})${bang || ''}`;
  });
  if (after !== before) {
    report.files += 1;
    if (WRITE) fs.writeFileSync(file, after, 'utf8');
  }
}

console.log(`${report.files} sheets touched, ${report.rewritten} declarations rewritten`);
if (report.unmapped.length) console.log('unmapped:\n' + report.unmapped.join('\n'));

// Any px font-size left in a non-excluded sheet is a hole in the scale.
const leftovers = [];
for (const file of walk(CSS_ROOT)) {
  const relative = path.relative(CSS_ROOT, file).split(path.sep).join('/');
  if (SKIP.has(relative)) continue;
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/font-size:\s*[0-9.]+px/g)) {
    leftovers.push(`${relative}: ${match[0]}`);
  }
}
console.log('px font sizes left outside the excluded sheets:', leftovers.length);
if (leftovers.length) console.log(leftovers.join('\n'));
