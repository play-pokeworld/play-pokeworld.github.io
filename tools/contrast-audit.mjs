/**
 * @file tools/contrast-audit.mjs
 * @brief Reproducible WCAG contrast audit (developer tool, not shipped).
 *
 * Several CSS blocks in the design-system sheets claim "WCAG ≥ 4,5
 * (generated — tools/contrast-audit.mjs)". That file had been lost, so nobody
 * could re-check readability after a colour change (audit v1.16.9 §2.4).
 * This tool rebuilds it from the stylesheet itself — it does not hard-code the
 * colours it checks:
 *
 *   1. it reads every custom-property block of the stylesheet and rebuilds the
 *      four theme palettes (base `:root` + each theme override);
 *   2. it re-parses the `.type-badge.type-<x>` rules to find, for each type,
 *      the ink (`color`) and the effective background (the `--type-<x>` token,
 *      darkened by the `color-mix(in srgb, … P%, #000 Q%)` of the rule, if any);
 *   3. it computes the WCAG 2.1 contrast ratio of each declared pair and fails
 *      (`--check`) below AA 4.5 for normal text.
 *
 * Usage:
 *   node tools/contrast-audit.mjs           # report + exit 0
 *   node tools/contrast-audit.mjs --check   # exit 1 on any AA violation
 *   node tools/contrast-audit.mjs --verbose # list every audited pair
 *
 * Since 1.16.11 the stylesheets are split by role: the tool reads the bundle the
 * browser loads (assets/css/style.css manifest) instead of one legacy sheet.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readBundle, stylesheetOrder } from '../tests/CssBundle.js';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const CSS_PATH = path.join(PROJECT_ROOT, 'assets/css/style.css');
const AA_NORMAL = 4.5;
const DARK_INK = '#241F16';

/** @param {string} hex @returns {{r:number,g:number,b:number}|null} */
function parseHex(hex) {
  const value = String(hex || '').trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (short) return { r: parseInt(short[1] + short[1], 16), g: parseInt(short[2] + short[2], 16), b: parseInt(short[3] + short[3], 16) };
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (long) return { r: parseInt(long[1], 16), g: parseInt(long[2], 16), b: parseInt(long[3], 16) };
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: rgb[4] === undefined ? 1 : Number(rgb[4]) };
  return null;
}

/** @param {{r:number,g:number,b:number}} rgb @returns {number} Relative luminance (WCAG 2.1). */
function luminance({ r, g, b }) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** @param {Object} a @param {Object} b @returns {number} WCAG contrast ratio (1–21). */
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** @param {string} token @param {Object} env @param {number} [depth] @returns {string|null} */
function resolveToken(token, env, depth = 0) {
  const name = String(token || '').trim();
  if (!name.startsWith('--') || depth > 5) return null;
  const value = env[name];
  if (value === undefined) return null;
  const nested = /^var\(\s*(--[^,\s)]+)/.exec(value.trim());
  if (nested) return resolveToken(nested[1], env, depth + 1);
  return value;
}

/**
 * Resolves a CSS colour expression to an opaque RGB value.
 * Handles `#hex`, `rgb()`, `var(--token)` and the single supported
 * `color-mix(in srgb, X P%, #000 Q%)` darkening form used by the type badges.
 * @param {string} expression
 * @param {Object} env
 * @returns {{r:number,g:number,b:number}|null}
 */
function resolveColor(expression, env) {
  const value = String(expression || '').trim();
  if (!value) return null;
  const direct = parseHex(value);
  if (direct) return direct.a !== undefined && direct.a < 1 ? null : direct;
  const asToken = /^var\(\s*(--[^,\s)]+)\s*\)$/.exec(value);
  if (asToken) return resolveColor(resolveToken(asToken[1], env) || '', env);
  const mix = /^color-mix\(\s*in srgb\s*,\s*([^,]+?)\s+(\d+(?:\.\d+)?)%\s*,\s*([^,]+?)\s+(\d+(?:\.\d+)?)%\s*\)$/i.exec(value);
  if (mix) {
    const from = resolveColor(mix[1], env);
    const to = resolveColor(mix[3], env);
    if (!from || !to) return null;
    const weight = Number(mix[2]) / (Number(mix[2]) + Number(mix[4]));
    return {
      r: Math.round(from.r * weight + to.r * (1 - weight)),
      g: Math.round(from.g * weight + to.g * (1 - weight)),
      b: Math.round(from.b * weight + to.b * (1 - weight))
    };
  }
  return null;
}

/** @param {string} css @returns {Array<{selector:string, body:string}>} Flat rule list. */
function parseRules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = pattern.exec(stripped)) !== null) {
    rules.push({ selector: match[1].trim().replace(/\s+/g, ' '), body: match[2] });
  }
  return rules;
}

/** @param {string} body @param {string} property @returns {string|null} */
function declaredValue(body, property) {
  const pattern = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i');
  const match = pattern.exec(body);
  return match ? match[1].trim() : null;
}

/** @param {string} body @returns {Object} Custom properties declared by the rule. */
function customProperties(body) {
  const out = {};
  const pattern = /(--[\w-]+)\s*:\s*([^;]+)/g;
  let match;
  while ((match = pattern.exec(body)) !== null) out[match[1]] = match[2].trim();
  return out;
}

/** @param {string} css @returns {Array<{label:string, env:Object}>} Base palette + one env per theme block. */
function themeEnvironments(rules) {
  const baseRule = rules.find((rule) => /^:root$/.test(rule.selector) && declaredValue(rule.body, '--pw-bg-surface'));
  const base = baseRule ? customProperties(baseRule.body) : {};
  const environments = [{ label: 'base :root', env: { ...base } }];
  for (const rule of rules) {
    if (rule === baseRule) continue;
    const props = customProperties(rule.body);
    const isPalette = props['--pw-bg-surface'] && props['--pw-text-primary'] && props['--dark1'];
    if (!isPalette) continue;
    environments.push({ label: rule.selector.slice(0, 60), env: { ...base, ...props } });
  }
  return environments;
}

/**
 * Effective ink + background of each type pill, rebuilt from the stylesheet.
 *
 * The stylesheet applies the pill text colour through `--type-text`
 * (`.type-<x> { --type-text: #241F16 | #FFFFFF }`, consumed by
 * `:is(…):is(.type-<x>) { color: var(--type-text, #fff) }`) and the
 * background through `.type-<x> { background: … }` / the generated
 * `.type-badge.type-<x>` block. Later declarations win (equal specificity),
 * except `!important` beats a plain declaration — both rules that matter here
 * are `!important`, so source order is the correct model.
 * @param {Array<{selector:string, body:string}>} rules
 * @param {Object} env
 * @returns {Array<{type:string, ink:string, background:string}>}
 */
function typePairs(rules, env) {
  const inks = new Map();
  const backgrounds = new Map();
  for (const rule of rules) {
    for (const raw of rule.selector.split(',')) {
      const selector = raw.trim();
      if (!/^\.type-[a-z_]+$/i.test(selector)) continue;
      const type = selector.slice('.type-'.length).toLowerCase();
      const text = declaredValue(rule.body, '--type-text');
      if (text) inks.set(type, text);
    }
    for (const raw of rule.selector.split(',')) {
      const selector = raw.trim();
      const badge = /^\.type-badge\.type-([a-z_]+)$/i.exec(selector);
      const plain = /^\.type-([a-z_]+)$/i.exec(selector);
      const type = (badge?.[1] || plain?.[1] || '').toLowerCase();
      if (!type) continue;
      const background = declaredValue(rule.body, 'background') || declaredValue(rule.body, 'background-color');
      if (background) backgrounds.set(type, background);
    }
  }
  const types = new Set([...inks.keys(), ...backgrounds.keys()]);
  return [...types].sort().map((type) => ({
    type,
    // `var(--type-text, #fff)` is the fallback of the rule that paints the pill text.
    ink: inks.get(type) || '#FFFFFF',
    background: backgrounds.get(type) || `var(--type-${type})`
  }));
}

/**
 * Runs the full audit.
 * @param {{cssPath?: string}} [options]
 * @returns {{rows: Array<Object>, failures: Array<Object>}}
 */
export function auditContrast(options = {}) {
  const css = options.cssPath ? fs.readFileSync(options.cssPath, 'utf8') : readBundle();
  const rules = parseRules(css);
  const environments = themeEnvironments(rules);
  const baseEnv = environments[0].env;
  const rows = [];

  const textPairs = [
    { label: 'text-primary / bg-surface', fg: '--pw-text-primary', bg: '--pw-bg-surface' },
    { label: 'text-secondary / bg-surface', fg: '--pw-text-secondary', bg: '--pw-bg-surface' },
    { label: 'text-primary / bg-header', fg: '--pw-text-primary', bg: '--pw-bg-header' },
    { label: 'text-primary / bg-sprite', fg: '--pw-text-primary', bg: '--pw-bg-sprite' },
    { label: 'light2 / dark1 (legacy pair)', fg: '--light2', bg: '--dark1' }
  ];

  for (const { label, env } of environments) {
    for (const pair of textPairs) {
      const fg = resolveColor(`var(${pair.fg})`, env);
      const bg = resolveColor(`var(${pair.bg})`, env);
      if (!fg || !bg) continue;
      rows.push({
        scope: label,
        pair: pair.label,
        foreground: `${pair.fg} ${env[pair.fg]}`,
        background: `${pair.bg} ${env[pair.bg]}`,
        ratio: contrastRatio(fg, bg)
      });
    }
    for (const badge of typePairs(rules, env)) {
      const fg = resolveColor(badge.ink, env);
      const bg = resolveColor(badge.background, env);
      if (!fg || !bg) continue;
      rows.push({
        scope: label,
        pair: `type badge ${badge.type}`,
        foreground: `${badge.ink}`,
        background: `${badge.background}`,
        ratio: contrastRatio(fg, bg)
      });
    }
  }

  const failures = rows.filter((row) => row.ratio < AA_NORMAL);
  return { rows, failures };
}

export { stylesheetOrder };

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const verbose = process.argv.includes('--verbose');
  const check = process.argv.includes('--check');
  const { rows, failures } = auditContrast();
  if (verbose) {
    for (const row of [...rows].sort((a, b) => a.ratio - b.ratio)) {
      console.log(`${row.ratio.toFixed(2).padStart(6)}  ${row.pair.padEnd(32)} ${row.foreground.padEnd(22)} on ${row.background.padEnd(24)} [${row.scope}]`);
    }
  }
  const scopes = new Map();
  for (const row of rows) {
    const current = scopes.get(row.scope) ?? { min: row, count: 0 };
    current.count += 1;
    if (row.ratio < current.min.ratio) current.min = row;
    scopes.set(row.scope, current);
  }
  for (const [scope, info] of scopes) {
    console.log(`${scope.padEnd(26)} ${String(info.count).padStart(3)} pairs — worst: ${info.min.ratio.toFixed(2)} (${info.min.pair})`);
  }
  console.log(`\naudited pairs: ${rows.length} in ${scopes.size} palettes — AA (≥ ${AA_NORMAL}): ${rows.length - failures.length} — below AA: ${failures.length}`);
  if (failures.length) {
    console.log('\nBELOW AA:');
    for (const row of failures) console.log(`  - ${row.pair} ${row.ratio.toFixed(2)} [${row.scope}] (${row.foreground} on ${row.background})`);
  }
  if (check && failures.length) process.exitCode = 1;
}
