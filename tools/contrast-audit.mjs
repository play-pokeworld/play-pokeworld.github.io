#!/usr/bin/env node
/**
 * PokéWorld — contrast audit & auto-fix generator.
 * Reads :root tokens from design-system.css, computes WCAG contrast ratios
 * and prints: (1) a table of known text/background pairs, (2) a ready CSS
 * override block giving every light type badge a readable dark text color.
 */
import fs from 'node:fs';

const CSS = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');

// ── token extraction (first :root block with the game palette) ──────────
const rootBlocks = [...CSS.matchAll(/:root\s*\{([\s\S]*?)\}/g)].map((m) => m[1]);
const vars = {};
for (const body of rootBlocks) {
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b/g)) {
    if (!(m[1] in vars)) vars[m[1]] = m[2];
  }
}

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function luminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function ratio(hexA, hexB) {
  const [la, lb] = [luminance(hexToRgb(hexA)), luminance(hexToRgb(hexB))];
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = '#ffffff';
const INK = '#241F16'; // dark warm ink matching the theme
const dark1 = vars['dark1'] || '#36342F';
const dark2 = vars['dark2'] || '#444138';

console.log('── Type badges: white text vs dark ink ──');
const overrides = [];
for (const [name, hex] of Object.entries(vars)) {
  if (!name.startsWith('type-')) continue;
  const sel = `.type-badge.${name}, .${name}.type-badge, .pw-badge.${name}, span.${name}`;
  const rWhite = ratio(WHITE, hex);
  if (rWhite >= 4.5) continue;
  const rInk = ratio(INK, hex);
  if (rInk >= 4.5) {
    console.log(`  --${name} ${hex}  white=${rWhite.toFixed(2)}  ⇒  dark ink ${rInk.toFixed(2)}`);
    overrides.push(`${sel} { color: ${INK} !important; text-shadow: none !important; }`);
  } else {
    // Neither white nor ink passes: darken the badge background until white passes.
    let pct = 4;
    while (pct <= 40 && ratio(WHITE, mix(hex, '#000000', pct)) < 4.5) pct += 2;
    console.log(`  --${name} ${hex}  white=${rWhite.toFixed(2)}, ink=${rInk.toFixed(2)}  ⇒  darken bg ${pct}% + white`);
    overrides.push(`${sel} { background: color-mix(in srgb, var(--${name}) ${100 - pct}%, #000 ${pct}%) !important; color: ${WHITE} !important; }`);
  }
}

function mix(hexA, hexB, pctB) {
  const a = hexToRgb(hexA); const b = hexToRgb(hexB);
  const r = Math.round(a[0] * (100 - pctB) / 100 + b[0] * pctB / 100);
  const g = Math.round(a[1] * (100 - pctB) / 100 + b[1] * pctB / 100);
  const bl = Math.round(a[2] * (100 - pctB) / 100 + b[2] * pctB / 100);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

console.log('\n── Common pairs ──');
const pairs = [
  ['light1 on dark2', vars['light1'], dark2],
  ['light2 on dark1', vars['light2'], dark1],
  ['light2 on dark2', vars['light2'], dark2],
  ['green on dark1', vars['green'], dark1],
  ['red on dark1', vars['red'], dark1],
  ['gold on dark1', vars['gold'], dark1],
  ['blue on dark1', vars['blue'], dark1],
  ['shiny on dark2', vars['shiny'], dark2],
  ['white on red', WHITE, vars['red']],
  ['white on green', WHITE, vars['green']],
  ['white on blue', WHITE, vars['blue']],
  ['white on gold', WHITE, vars['gold']],
];
for (const [label, fg, bg] of pairs) {
  if (!fg || !bg) continue;
  const r = ratio(fg, bg);
  console.log(`  ${r >= 4.5 ? 'OK ' : 'BAD'} ${label}: ${r.toFixed(2)} (${fg} on ${bg})`);
}

console.log('\n── CSS override block ──');
console.log(overrides.join('\n'));
