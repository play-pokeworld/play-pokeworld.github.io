// Wave 27 — contracts for the autonomous-audit fixes (DOM-free, text-level).
//
// What this locks (all root causes measured in Chromium, see MIGRATION_STATUS):
//  1. Save menu geometry: scroll buttons use .is-invisible (visibility only).
//     The generic `.is-hidden { display:none !important }` utility ejected the
//     buttons from the .save-menu-list-shell grid; the remaining list item then
//     fell into the 44px button track and the empty state crushed to ~44px.
//  2. Battle team row: empty move cells are painted invisible (DOM stays —
//     the 60fps ticker iterates .poke-moves children by index).
//  3. .poke-level chip keeps its own token pair: the readability blanket has
//     (0,7,1) via a 6-deep :not chain, so the chip is EXCLUDED at the source
//     instead of fighting it with !important.
//  4. French is the native boot language everywhere: currentLang() falls back
//     to 'fr', and all three initial-state factories seed lang 'fr'.
//  5. Map title can no longer paint the RAW "{region}" template: the node has
//     no data-i18n attribute, and both writers produce the same format because
//     fr map_title_name was unified with map_title_prefix ("Carte : {region}").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const R = (rel) => readFileSync(path.join(new URL('..', import.meta.url).pathname, rel), 'utf8');
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const css = stripComments(R('src/assets/styles/design-system.css'));
const saveJs = R('src/application/save/save.js');
const i18nJs = R('src/localization/i18n.js');
const frUi = R('src/localization/fr/ui.js');
const enUi = R('src/localization/en/ui.js');
const indexHtml = R('index.html');
const initialState = R('src/domain/game/initial-state.js');
const bridge = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');

test('scroll buttons toggle is-invisible, never is-hidden', () => {
  assert.match(saveJs, /toggle\('is-invisible', !overflow\)/);
  // the old pairing with the display:none utility is gone from the toggler:
  assert.ok(!saveJs.includes("toggle('is-hidden', !overflow)"),
    'updateSaveMenuScrollButtons must not use the display:none !important utility');
});

test('CSS pairs the scroll buttons with a visibility-only state class', () => {
  assert.match(css, /\.save-menu-scroll-btn\.is-invisible\s*\{\s*visibility:\s*hidden\s*;?\s*\}/);
  assert.ok(!/\.save-menu-scroll-btn\.is-hidden/.test(css),
    'the is-hidden pairing (display:none ejects the buttons from the shell grid) must stay deleted');
});

test('shell grid keeps its 44px | 1fr | 44px tracks definition', () => {
  assert.match(css, /\.save-menu-list-shell\s*\{[^}]*grid-template-columns:\s*44px minmax\(0(?:px)?,\s*1fr\) 44px/);
});

test('empty move cells are hidden but kept in the DOM (ticker anchors)', () => {
  assert.match(css, /\.poke-move\.empty\s*\{[^}]*visibility:\s*hidden/);
  assert.ok(!/\.poke-move\.empty\s*\{[^}]*display:\s*none/.test(css),
    'display:none would drop the node and shift the 60fps ticker indexes');
});

test('the readability blanket excludes the .poke-level dark chip', () => {
  // chip excluded from the span :not chain …
  assert.match(css, /\.poke-card span:not\(\.status-badge\):not\(\.buff-badge\):not\(\.pw-badge\):not\(\.move-type\):not\(\.move-eff-badge\):not\(\.hp-text\):not\(\.poke-level\)/);
  // … and the old blanket line ".poke-card .poke-level, .poke-card .hp-text," is gone
  assert.ok(!/\.poke-card\s*\n?\.poke-card b, \.poke-card strong, \.poke-card \.poke-name,\s*\n\.poke-card \.poke-level,/.test(css),
    'the blanket must not ink the dark chip (measured dark-on-dark)');
  // the wave-17 pw-text-primary blanket also excludes the chip (gameboy dark-on-dark):
  assert.match(css, /\.poke-card span:not\(\.poke-level\), \.poke-card small, \.poke-card p, \.poke-card \.hp-text,/);
  assert.match(css, /\.pw-poke-card span:not\(\.poke-level\), \.pw-poke-card small, \.pw-poke-level \{/);
  // base chip rule still owns its token pair:
  assert.match(css, /\.poke-level\s*\{[^}]*background:\s*var\(--dark2\)[^}]*color:\s*var\(--light2\)/s);
});

test('currentLang() defaults to fr (native), explicit G.lang still wins', () => {
  assert.match(i18nJs, /G\.lang\) \? G\.lang : 'fr'/);
  assert.ok(!/G\.lang\) \? G\.lang : 'en'/.test(i18nJs), 'no en fallback at boot');
});

test('all three initial-state factories seed lang fr', () => {
  assert.match(initialState, /lang: 'fr'/);
  assert.ok(!/lang: 'en'/.test(initialState));
  for (const src of [saveJs, bridge]) {
    assert.ok(!/lang:'en'/.test(src), 'inline fallback objects seed fr');
    assert.match(src, /lang:'fr'/);
  }
});

test('map-win-title can no longer paint the raw {region} template', () => {
  const m = indexHtml.match(/<span id="map-win-title"[^>]*>/);
  assert.ok(m, 'map-win-title node exists');
  assert.ok(!/data-i18n/.test(m[0]), 'data-i18n removed (label pass painted the raw template)');
  const paintable = indexHtml.replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(!paintable.includes('{region}'), 'no raw template literal ships in rendered markup');
});

test('map title writers share one format (fr unified with the prefix writer)', () => {
  assert.match(frUi, /"map_title_prefix":"Carte : "/);
  assert.match(frUi, /"map_title_name":"Carte : \{region\}"/);
  assert.match(enUi, /"map_title_name":"Map: \{region\}"/);
});

test('fr save-menu family stays complete (regression net for fallback chains)', () => {
  for (const key of ['save_menu_new', 'save_menu_import', 'save_menu_empty_title', 'save_menu_empty_desc']) {
    assert.match(frUi, new RegExp('"' + key + '":"[^"]+'), 'fr must have ' + key);
  }
});

test('save menu empty state stretches the whole list row', () => {
  assert.match(css, /\.save-menu-empty\s*\{[^}]*flex:\s*1 0 100%/);
});

test('wave 26 guards stay intact (CSS blanket edits did not regress them)', () => {
  // full-bleed band blocks from wave 26 still present (marker is a comment → raw css)
  assert.match(R('src/assets/styles/design-system.css'), /DS2826 — WAVE 26/);
  assert.match(css, /#move-buttons/);
  assert.match(css, /\.poke-card-top\s*\{[^}]*border-radius:\s*11px 11px 0 0/s);
});
