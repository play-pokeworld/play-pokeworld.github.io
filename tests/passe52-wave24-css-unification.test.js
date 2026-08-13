// Wave 24 — global CSS unification: one canonical stylesheet, one truth per
// rule. Locks the invariants the wave established (file removal, save-bg
// single-definition, dead-fallback-free palette, real pseudo-rules fixed).
// Rendering proof (pixel-identical) lives in tests/harness/ (scenario-
// savemenu.mjs — shipped INSIDE the repo, run manually with npx playwright).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const R = (rel) => fs.readFileSync(path.join(new URL('..', import.meta.url).pathname, rel), 'utf8');
const DS = R('src/assets/styles/design-system.css');
const IDX = R('index.html');

const REMOVED = [
  'cleaned-components.css', 'extracted-index.css', 'extracted-templates.css',
  'extracted-bridges.css', 'mobile-accessibility.css', 'pw-unified.css', 'pw-static.css',
];

test('wave24: design-system.css is the ONLY stylesheet left in src/assets/styles', () => {
  const files = fs.readdirSync(path.join(new URL('..', import.meta.url).pathname, 'src/assets/styles'));
  assert.deepEqual(files, ['design-system.css'], `single canonical stylesheet, got: ${files}`);
  for (const f of REMOVED) assert.ok(!files.includes(f), `${f} removed`);
});

test('wave24: index.html loads exactly the canonical stylesheet (no other <link>)', () => {
  const links = [...IDX.matchAll(/<link[^>]*stylesheet[^>]*>/g)].map((m) => m[0]);
  assert.equal(links.length, 1, `exactly one stylesheet link, got ${links.length}`);
  assert.ok(links[0].includes('src/assets/styles/design-system.css'), 'canonical path');
});

test('wave24: no dead-source "=== Source:" markers; neutral section titles instead', () => {
  assert.ok(!/=== Source:/.test(DS), 'zero Source marker left');
  for (const h of [
    '=== Section: legacy app shell & core layout (history merged in wave 24) ===',
    '=== Section: mobile & accessibility ===',
    '=== Section: extracted index statics ===',
    '=== Section: extracted template styles ===',
    '=== Section: extracted bridge styles ===',
    '=== Section: component rules ===',
    '=== Section: pw-static utilities ===',
    '=== Section: universal contrast, panels & unified components ===',
  ]) assert.ok(DS.includes(h), `section header: ${h}`);
});

test('wave24: save backgrounds have ONE definition block — the live era design', () => {
  const eras = ['classic', 'goldsilver', 'emerald', 'diamondpearl', 'blackwhite', 'xy', 'forest'];
  for (const era of eras) {
    // exactly one rule mentioning the class at all: the canonical one
    const all = DS.match(new RegExp('[^}]*\\.save-bg-' + era + '\\s*\\{[^}]*\\}', 'g')) || [];
    assert.equal(all.length, 1, `.save-bg-${era}: exactly 1 rule (got ${all.length})`);
    // (the match window may include the preceding comment — anchor on the selector)
    assert.ok(all[0].includes('.save-slot.save-bg-'), 'canonical live selector');
    assert.ok(/gradient\(/.test(all[0]), 'era gradient present');
    assert.ok(!all[0].includes('!important'), '!important no longer needed (hammer target gone)');
  }
});

test('wave24: no undefined tokens remain — --card surfaces tokenized', () => {
  assert.ok(!/var\(--card\)/.test(DS), 'no var(--card) anywhere (was invalid-at-computed-value)');
  assert.ok(DS.includes('.pw-static-050{display:flex;flex-wrap:wrap;border-bottom:2px solid var(--pw-border-color);flex-shrink:0}'),
    '#tabs strip border uses the canonical border token');
  assert.ok(DS.includes('.extracted-style-050{display:flex;flex-wrap:wrap;border-bottom:2px solid var(--pw-border-color);flex-shrink:0}'),
    'legacy extracted mirror rule tokenized too');
  for (const tok of ['pw-bg-surface-alt', 'gold']) {
    assert.ok(!new RegExp('var\\(--' + tok + '[,)]').test(DS), `no var(--${tok}, …) wrapper (token never existed)`);
  }
  assert.ok(DS.includes('rgba(0,0,0,.28)'), 'literal fallback kept where the fake token wrapped it');
  assert.ok(DS.includes('#ffd700'), 'literal gold kept');
});

test('wave24: zero dead fallbacks on universal tokens (defined on :root in every theme)', () => {
  const UNIVERSAL = ['pw-text-primary', 'pw-text-secondary', 'light1', 'light2', 'yellow', 'blue',
    'accent', 'shiny', 'dark1', 'dark2', 'dark3', 'pw-bg-surface', 'pw-border-color', 'pw-bg-header',
    'pw-bg-sprite', 'pw-circle-bg', 'pw-radius', 'pw-size-poke-sm', 'pw-border'];
  let n = 0;
  for (const tok of UNIVERSAL) {
    const re = new RegExp('var\\(--' + tok + '\\s*,', 'g');
    n += (DS.match(re) || []).length;
  }
  assert.equal(n, 0, 'all universal-token var()s are fallback-free');
});

test('wave24: scoped per-instance token APIs are PRESERVED (not stripped by the sweep)', () => {
  for (const frag of ['var(--pct', 'var(--bg,', 'var(--chip-color', 'var(--type-color,', 'var(--status-color',
    'var(--mine-item-color', 'var(--starter-color']) {
    assert.ok(DS.includes(frag), `component API kept: ${frag}`);
  }
});

test('wave24: #tabs hidden for good — the w23 comment claimed a rule that never existed', () => {
  assert.ok(IDX.includes('id="tabs" class="pw-static-050 pw-win-tabs"'), 'strip carries the hiding class');
  assert.ok(/\.pw-win-tabs\{display:none\}/.test(DS), '.pw-win-tabs{display:none} rule REALLY exists now');
});

test('wave24: legacy file readers migrated — savemenu scenario + all test files read DS only', () => {
  // Harness shipped in-repo at tests/harness/ (manual Playwright scenarios,
  // excluded from `npm test` by naming — not *.test.js files).
  assert.ok(R('tests/harness/scenario-savemenu.mjs').includes("readFileSync('/home/user/pokeworld/src/assets/styles/design-system.css'"),
    'scenario-savemenu reads the canonical stylesheet');
  for (const t of ['fixes-phase1', 'johto-names-fossils', 'passe14-gen3-fossils', 'passe17-team-locks',
    'passe26-features', 'passe27-features', 'passe28-offline-engine', 'passe35-base-window', 'passe51-wave23']) {
    const body = R(`tests/${t}.test.js`);
    for (const dead of ['cleaned-components.css', 'pw-unified.css', 'pw-static.css']) {
      assert.ok(!body.includes(`styles/${dead}'`), `${t} no longer reads ${dead}`);
    }
  }
});

