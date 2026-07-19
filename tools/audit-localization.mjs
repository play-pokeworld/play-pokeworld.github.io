import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const src = path.join(root, 'src');
const reportPath = path.join(root, 'localization_audit_report.md');

function walk(dir, predicate = () => true) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out;
}

function loadLocalizationGlobals(language) {
  const dir = path.join(src, 'localization', language);
  const files = walk(dir, (f) => f.endsWith('.js')).sort();
  const context = { window: {}, console };
  context.globalThis = context.window;
  vm.createContext(context);
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    vm.runInContext(code, context, { filename: file });
  }
  return context.window;
}

function flattenKeys(obj, prefix = '') {
  const out = new Set();
  if (!obj || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    out.add(full);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const nested of flattenKeys(value, full)) out.add(nested);
    }
  }
  return out;
}

function collectHardcodedStrings() {
  const files = walk(src, (f) => f.endsWith('.js') || f.endsWith('.html')).filter((file) => !file.includes(`${path.sep}localization${path.sep}`));
  const results = [];
  const regex = /(['"`])([^'"`\n]{5,120})\1/g;
  for (const file of files) {
    const rel = path.relative(root, file).replaceAll(path.sep, '/');
    const text = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(text))) {
      const value = match[2].trim();
      if (!value) continue;
      if (/^(src\/|assets\/|type-|rank-|data-|http|[A-Za-z0-9_-]+)$/.test(value)) continue;
      if (/\.js$|\.css$|\.html$|^\.\.?\//.test(value)) continue;
      if (!/[A-Za-zÀ-ÿ]/.test(value)) continue;
      if (/^m\.[a-z_]+\./i.test(value)) continue;
      if (/^trainer_|^region_|^guide_|^tab_|^save_|^battle_|^queue_|^automation_/i.test(value)) continue;
      if (value.includes('${')) continue;
      if (value.includes('function')) continue;
      if (value.length < 8) continue;
      results.push({ file: rel, value });
    }
  }
  const uniq = [];
  const seen = new Set();
  for (const item of results) {
    const key = `${item.file}::${item.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(item);
  }
  return uniq;
}

const fr = loadLocalizationGlobals('fr');
const en = loadLocalizationGlobals('en');
const frFlat = Object.fromEntries(Object.entries(fr).filter(([k]) => k.startsWith('L_fr_')).map(([k, v]) => [k.replace(/^L_fr_/, ''), v]));
const enFlat = Object.fromEntries(Object.entries(en).filter(([k]) => k.startsWith('L_en_')).map(([k, v]) => [k.replace(/^L_en_/, ''), v]));

const sections = [...new Set([...Object.keys(frFlat), ...Object.keys(enFlat)])].sort();
const missing = [];
for (const section of sections) {
  const frKeys = flattenKeys(frFlat[section]);
  const enKeys = flattenKeys(enFlat[section]);
  const missingInEn = [...frKeys].filter((key) => !enKeys.has(key));
  const missingInFr = [...enKeys].filter((key) => !frKeys.has(key));
  if (missingInEn.length || missingInFr.length) {
    missing.push({ section, missingInEn, missingInFr });
  }
}

const hardcoded = collectHardcodedStrings();

let md = '# Localization audit\n\n';
md += '## Missing keys between FR and EN\n\n';
if (!missing.length) {
  md += '- No missing keys detected between FR and EN sections.\n';
} else {
  for (const entry of missing) {
    md += `### ${entry.section}\n`;
    if (entry.missingInEn.length) md += `- Missing in EN (${entry.missingInEn.length}): ${entry.missingInEn.slice(0, 20).join(', ')}\n`;
    if (entry.missingInFr.length) md += `- Missing in FR (${entry.missingInFr.length}): ${entry.missingInFr.slice(0, 20).join(', ')}\n`;
    md += '\n';
  }
}
md += '## Hardcoded candidate strings outside localization\n\n';
md += `Total candidates: ${hardcoded.length}\n\n`;
for (const item of hardcoded.slice(0, 250)) {
  md += `- \`${item.file}\` → ${item.value}\n`;
}

fs.writeFileSync(reportPath, md, 'utf8');
console.log(`Localization audit report written to ${path.relative(root, reportPath)}`);
