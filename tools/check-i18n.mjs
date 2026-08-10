import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(__filename, '..', '..');

const EXCLUDED_DIRS = new Set(['data', 'localization', 'legacy-es']);

function scanDirectory(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        scanDirectory(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html'))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

let errorCount = 0;

// 1. Audit index.html for hardcoded aria-label without data-i18n-aria-label
const htmlPath = path.join(ROOT, 'index.html');
if (fs.existsSync(htmlPath)) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const lines = htmlContent.split('\n');
  lines.forEach((line, index) => {
    // Detect aria-label="Something" where Something has word characters and no data-i18n-aria-label on the same tag
    const ariaMatch = line.match(/aria-label=["']([A-Za-zÀ-ÿ\s]{3,})["']/);
    if (ariaMatch && !line.includes('data-i18n-aria-label')) {
      console.error(`[i18n check] index.html:${index + 1}: hardcoded aria-label "${ariaMatch[1]}" without data-i18n-aria-label`);
      errorCount++;
    }
  });
}

// 2. Audit src/ JS files for unlocalized notify() / alert() / confirm() strings
const srcDir = path.join(ROOT, 'src');
if (fs.existsSync(srcDir)) {
  const jsFiles = scanDirectory(srcDir);
  const literalNotifyRegex = /\b(notify|alert|confirm)\s*\(\s*["']([^"']{3,})["']/g;
  for (const file of jsFiles) {
    if (!file.endsWith('.js')) continue;
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(ROOT, file);
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      let match;
      literalNotifyRegex.lastIndex = 0;
      while ((match = literalNotifyRegex.exec(line)) !== null) {
        // Skip if it contains a CSS var or variable-like syntax
        const str = match[2];
        if (str.startsWith('var(') || str.startsWith('.')) continue;
        console.error(`[i18n check] ${relPath}:${index + 1}: Hardcoded string in ${match[1]}(): "${str}"`);
        errorCount++;
      }
    });
  }
}

// 3. Audit user-facing calls whose message literal is NESTED INSIDE A TERNARY
// — the known bypass pattern:
//   notify(typeof t==='function' ? t('some.key') : "Une phrase en français !")
// The translation dictionaries are the only allowed source of UI sentences:
// a fallback branch must never carry a sentence (call t('some.key') directly).
// Detection rule (deliberately scoped): on a notify()/setMsg()/alert()/confirm()
// line containing a ternary `?` AND a t()/tr() call, any quoted literal AFTER
// that call that is written as a `:` fallback branch and contains a sentence
// (word characters + whitespace) is a violation. This does not flag legitimate
// inline bilingual helpers (en ? 'EN' : 'FR'), CSS vars (var(--red)) or
// i18n keys, which carry no sentence after a t()/tr() call.
const ternaryCallLine = /\b(notify|setMsg|alert|confirm)\s*\(/;
// Exact bypass structure: `? … t('key') : "sentence fallback"`. The sentence
// (word characters + whitespace) sits on the fallback branch of a ternary
// whose tested/positive branch is a t()/tr() call. CSS vars (var(--red)),
// keys and symbol strings never match (no whitespace sentence).
const ternaryFallbackRegex = /\?[^?\n]*?\bt(?:r)?\s*\([^)\n]*\)\s*:\s*["'`]([^"'`\n]*[A-Za-zÀ-ÿ][^"'`\n]*\s[^"'`\n]*)["'`]/g;

if (fs.existsSync(srcDir)) {
  const jsFiles = scanDirectory(srcDir);
  for (const file of jsFiles) {
    if (!file.endsWith('.js')) continue;
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(ROOT, file);
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (!ternaryCallLine.test(line)) return;
      let match;
      ternaryFallbackRegex.lastIndex = 0;
      while ((match = ternaryFallbackRegex.exec(line)) !== null) {
        const str = match[1];
        // Ignore pure-symbol strings (×4 …) and interpolation holders.
        if (/^[×+|★:;/\-,.!?\s0-9¼½&%]*$/.test(str)) continue;
        if (str.includes('${')) continue;
        console.error(`[i18n check] ${relPath}:${index + 1}: Sentence literal nested in a ternary fallback: "${str.slice(0, 80)}" — call t()/tr() directly (dictionaries already carry both languages).`);
        errorCount++;
      }
    });
  }
}

if (errorCount > 0) {
  console.error(`\n[i18n check] FAILED: ${errorCount} hardcoded string(s) detected. All user-facing text must be localized via t() or tr().`);
  process.exit(1);
} else {
  console.log('[i18n check] OK: No unlocalized hardcoded strings detected in audited targets.');
  process.exit(0);
}
