/**
 * Wave 18 — user's REAL-GAME feedback (3rd playtest round, verified in
 * headless Chromium against the live game — measurements in harness/
 * visual-wave18.mjs, 34/34 jsdom probe checks in harness/probe-wave18.mjs):
 *
 *  1. Double sprite circles ("double ronds") removed: the location wild
 *     cards + special-forms panel wrapped spriteImg output (which ALREADY
 *     carries its own disc) in a SECOND wrap+bg — two offset discs painted
 *     over the sprite. Plus a CSS safeguard so a nested disc can never
 *     paint again.
 *  2. PC box LOOKS like the Pokédex: same circular transparent tile, the
 *     level as a pill UNDER the sprite styled exactly like the dex number,
 *     and the ★ top-right (no inline ★ near the name).
 *  3. Filters/dropdowns (reported 3×): the blanket rule
 *     `select, option { background: #0c0a09 !important }` hard-locked
 *     EVERY menu in near-black on every theme. Theme token now.
 *  4. Summary/replay sprites were off-centre + overflowing their frame
 *     (72px canonical sprite in a 40px box); the ×N multiplier text was
 *     painted BEHIND the sprite disc (no z-index).
 *  5. Move charge bar: the track was flat near-black (invisible). It now
 *     shows the dimmed move-type colour and fills with the full type
 *     colour ("empty attack" → "charged attack").
 *  6. Info panels (move/item/ability) widened 360 → 560px.
 *  7. Shiny ★ is the Pokédex colour (var(--shiny), themed) EVERYWHERE:
 *     team, PC, info panel, location (was 4 different colours).
 *  8. Training "Abandonner"/"Retirer" = EXACT danger-family crimson
 *     (#D3425F), the wave-17 darkened color-mix is gone (all three danger
 *     rules unified).
 *  9. Secret-base "Ramasser" (removes a placed item) is a danger button.
 * 10. Drag strips: boundaries computed on VISIBLE windows only — a hidden
 *     last window (win-mine disabled) used to swallow the bottom-of-column
 *     strip onto an invisible element.
 * 11. Save-slot icon contained & centred (70px wrap inside the 74px box).
 *
 * All DOM-free (source contracts + component HTML strings).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CSS = R('src/assets/styles/design-system.css');
const CSS1 = CSS.replace(/\s+/g, ' '); // single-line for cross-line needles
const HTML_INDEX = R('index.html');

/* ─── 1. Double circles ────────────────────────────────────────────────── */

test('wave18: location wild cards do NOT wrap spriteHtml in a second circle', () => {
  const md = R('src/ui/components/map-dressing.js');
  assert.ok(!md.includes('pw-poke-circle-wrap pw-loc-wild-disc'), 'map-dressing: no second wrap');
  assert.ok(md.includes('h(\'div\', { class: \'pw-loc-wild-disc\' }, h.raw(e.spriteHtml || \'\'))'), 'wild disc is a plain slot, spriteImg provides the disc');
});

test('wave18: special-forms panel does NOT wrap spriteImg in an orb circle', () => {
  const li = R('src/ui/game/location-info.js');
  assert.ok(!li.includes('pw-manage-orb pw-poke-circle-wrap'), 'no outer orb circle left');
});

test('wave18: CSS safeguard — a nested disc can never paint', () => {
  assert.ok(/\.pw-poke-circle-wrap \.pw-poke-circle-wrap \.pw-poke-circle-bg \{\s*display:\s*none/.test(CSS1), 'nested disc hidden');
  assert.ok(/\.pw-poke-circle-wrap \.pw-poke-circle-wrap \{\s*width:\s*100% !important/.test(CSS1), 'nested wrap just fills its parent');
});

test('wave18: spriteImg/spriteSilhouette also emit .pw-poke-circle-img', () => {
  const sh = R('src/ui/game/sprite-helpers.js');
  const n = (sh.match(/pw-poke-circle-img sprite-img/g) || []).length;
  assert.ok(n >= 3, `expected ≥3 canonical img emissions, got ${n}`);
  // Vague 42 — convergence templates : le gabarit carte a rejoint la couche
  // composants (_pokemon-card-element.js_, corps inchangé) ; le verrou suit le
  // fichier (même intention : l'img du rendu standalone reste plafonnée).
  const tpl = R('src/ui/components/pokemon-card-element.js');
  assert.ok(tpl.includes("img.className = 'pw-poke-circle-img sprite-img pw-poke-img';"), 'legacy template img capped too (96px natural-size overflow)');
});

/* ─── 2. Box = dex look ────────────────────────────────────────────────── */

test('wave18: the canonical card renders the dex-language structure', async () => {
  const { pokeCardHTML } = await import('../src/ui/components/poke-card.js');
  const html = pokeCardHTML({ imgSrc: 'x.png', emoji: '⚡', name: 'Carapuce', levelLabel: 'Nv.7', shiny: true, size: 'standard' });
  assert.ok(html.includes('box-tile'), 'circular tile node');
  assert.ok(/class="box-level"[^>]*>Nv\.7/.test(html.replace(/\s+/g, ' ')), 'level pill inside the tile (under the sprite)');
  assert.ok(html.includes('box-shiny is-visible') && html.includes('★'), 'top-right ★ like .dex-shiny');
  assert.ok(!html.includes('shiny-tag'), 'no inline ★ next to the name anymore');
  const plain = pokeCardHTML({ imgSrc: 'x.png', name: 'Rattata', levelLabel: 'Nv.3' });
  assert.ok(plain.includes('box-shiny is-hidden'), 'non-shiny keeps the hidden ★ hook (dex contract)');
});

test('wave18: DS2818 box=dex CSS (transparent tile, bottom pill, dex density)', () => {
  assert.ok(/\.pw-poke-card \.box-tile \{[^}]*background:\s*transparent !important/.test(CSS1), 'tile transparent like .dex-entry');
  assert.ok(/\.pw-poke-card \.box-tile \{[^}]*width:\s*72px !important/.test(CSS1), 'tile = 72px circle (dex geometry)');
  assert.ok(/\.pw-poke-card \.box-level \{\s*top:\s*auto !important;\s*bottom:\s*-9px/.test(CSS1), 'box level pill UNDER the sprite (user rule; dex number sits on top)');
  assert.ok(/#usm-grid\.usm-modern-grid:has\(\.pw-poke-card\)[^{]*\{[^}]*minmax\(min\(108px/.test(CSS1), 'dex-like density only for Pokémon card grids (fossils/items keep 198px tracks)');
  assert.ok(/\.pw-poke-card\.box-card \{\s*background:\s*transparent !important/.test(CSS1), 'card is a transparent column');
});

/* ─── 3. Themed filters/dropdowns (3rd report) ─────────────────────────── */

test('wave18: select/option background follows the theme', () => {
  assert.ok(/select, option \{[^}]*background-color:\s*var\(--pw-bg-surface/.test(CSS1), 'theme surface token');
  assert.ok(!/select, option \{\s*background-color:\s*#0c0a09 !important/.test(CSS1), 'the fixed near-black is gone');
  assert.ok(/\.pw-automation-select \{[^}]*background:\s*color-mix\(in srgb, var\(--pw-bg-surface/.test(CSS1), 'automation selects themed');
});

/* ─── 4. Summary containment + ×N in front ─────────────────────────────── */

test('wave18: summary sprite box is 72px everywhere (was 40px)', () => {
  const hits = CSS.match(/\.pw-summary-sprite[\s{][^}]*width:\s*72px/g) || [];
  assert.ok(hits.length >= 2, `both style spots updated (got ${hits.length})`);
  assert.ok(!/pw-summary-sprite\{\s*width:\s*40px/.test(CSS1) && !/pw-summary-sprite \{\s*width:\s*40px/.test(CSS1), 'no 40px box left');
});

test('wave18: ×N counters paint in front of the sprite disc (z-index 3)', () => {
  assert.ok(/\.loot-item \.loot-count \{[^}]*z-index:\s*3 !important/.test(CSS1), 'loot ×N in front (was BEHIND the disc)');
  assert.ok(/\.pw-summary-count \{[^}]*z-index:\s*3/.test(CSS1), 'summary ×N in front');
  assert.ok(/\.loot-item \.pw-poke-circle-wrap \{[^}]*width:\s*56px !important/.test(CSS1), 'loot chips contain the canonical sprite');
});

/* ─── 5. Move charge bar ───────────────────────────────────────────────── */

test('wave18: charge track = dimmed type colour, fill = full type colour', () => {
  assert.ok(/\.auto-move \.am-bar-bg \{[^}]*background:\s*color-mix\(in srgb, var\(--type-color, #777\) 22%, rgba\(0, 0, 0, 0\.55\)\)/.test(CSS1), '"empty attack" typed track');
  assert.ok(/\.auto-move \.am-bar-fill \{[^}]*background:\s*var\(--type-color/.test(CSS1), 'fill keeps the exact type colour');
});

/* ─── 6/7/8. Panel width, ★ unification, danger unification ────────────── */

test('wave18: info panels widened to 560px', () => {
  assert.ok(CSS.includes('--pw-panel-w-info: 560px'), 'move/item/ability panels');
});

test('wave18: every shiny ★ uses the Pokédex colour var(--shiny)', () => {
  assert.ok(/\.dex-shiny, \.box-shiny, \.shiny-tag, \.pw-poke-circle-shiny, \.pw-shiny-star \{ color:\s*var\(--shiny/.test(CSS1), 'all ★ classes unified on the dex colour');
  assert.ok(/\.pw-loc-shiny-tag \{ color:\s*var\(--shiny/.test(CSS1), 'location shiny tag too');
  // The legacy cream .pw-shiny-star rules stay in the stylesheet but the
  // unified rule must come AFTER them — at equal specificity source order
  // decides (measured in Chromium: all four ★ = var(--shiny)).
  const idxUnified = CSS.indexOf('.dex-shiny, .box-shiny, .shiny-tag, .pw-poke-circle-shiny, .pw-shiny-star');
  const creamRe = /\.pw-shiny-star\s*\{\s*color:\s*var\(--light2\)/g;
  let m, lastCream = -1;
  while ((m = creamRe.exec(CSS))) lastCream = m.index;
  assert.ok(lastCream === -1 || idxUnified > lastCream, 'the dex-colour rule outranks every cream ★ rule');
});

test('wave18: ALL danger buttons share the EXACT family crimson (#D3425F)', () => {
  assert.ok(/button\[data-action\]\.pw-btn-danger,\s*button\[data-call\]\.pw-btn-danger,\s*\.hbtn\.pw-btn-danger \{\s*background:\s*#D3425F !important/.test(CSS1), 'Abandonner/Retirer with data-action');
  assert.ok(!/var\(--red\) 76%, #000 24%/.test(CSS), 'no darkened mix anywhere (incl. .pw-btn--danger)');
  assert.ok(/button\[data-action\]\.pw-btn-danger:hover[^{]*\{\s*background:\s*#E55575 !important/.test(CSS1), 'family hover colour too');
});

/* ─── 9. Secret-base pickup is danger ──────────────────────────────────── */

test('wave18: secret-base "Ramasser" is a danger-red button', () => {
  assert.ok(/id="base-ed-pickup"[^>]*class="hbtn pw-btn-danger"/.test(HTML_INDEX), 'removes a placed item → red like every destructive action');
});

/* ─── 10. Drag strips on visible windows only ──────────────────────────── */

test('wave18: drag boundaries ignore hidden windows (strip never swallowed)', () => {
  const wd = R('src/ui/game/win-drag.js');
  assert.ok(/function pwVisibleWinEls/.test(wd), 'visible-window filter defined');
  const uses = wd.match(/pwVisibleWinEls\(/g) || [];
  assert.ok(uses.length >= 3, `used in BOTH marker + drop-index paths (got ${uses.length})`);
  assert.ok(/if \(vi < vis\.length\) vis\[vi\]\.el\.classList\.add\('insert-above'\)/.test(wd), 'markers land on visible neighbours only');
  assert.ok(/insIdx = others\.indexOf\(vis\[vi\]\.id\)/.test(wd), 'drop index mapped back into the full array');
});

/* ─── 11. Save-slot icon containment ───────────────────────────────────── */

test('wave18: save-slot icon contained & centred (70px wrap in the 74px box)', () => {
  assert.ok(/\.save-slot-icon \.pw-poke-circle-wrap \{\s*width:\s*70px !important;\s*height:\s*70px !important/.test(CSS1), 'wrap cannot overflow the rounded box');
});
