import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ─── Wave 15 (2026-08-05): user-screenshot feedback — source contracts ───
// Every test pins ONE fix from the feedback batch (see MIGRATION_STATUS).
const R = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('legend/map-help: locale "<b>X</b> — Y" rows split into {title, desc} (no escaped markup)', () => {
  const help = R('src/ui/game/map-help.js');
  assert.ok(help.includes('_mapHelpRowPair'), 'row splitter exists');
  assert.ok(/<\^?b>/.test('dummy') || help.includes('/^<b>(.*?)<\\/b>'), 'regex on the locale b-tags');
  const dressing = R('src/ui/components/map-dressing.js');
  assert.ok(dressing.includes('pw-map-help-strong'), 'real <b> rendered by the component');
  assert.ok(!dressing.includes('🕳'), 'no leading emoji before the secret-base alcoves');
});

test('battle cooldown: charge colour is EXACTLY the type token (no alpha, no JS write)', () => {
  const bui = R('src/ui/game/battle-ui.js');
  assert.ok(!bui.includes("'66'"), 'no 40%-alpha hex suffix left');
  assert.ok(!bui.includes("setProperty('--charge-color'"), 'JS never overrides the charge colour');
  const css = R('src/assets/styles/design-system.css');
  assert.ok(/\.pw-charge-move \{[^}]*--charge-color: var\(--type-color/.test(css), 'CSS owns the var = --type-color');
  assert.ok(/\.auto-move \.am-bar-fill \{\s*background: var\(--type-color/.test(css), 'auto-move fill = exact type colour');
});

test('type pills: 2 grouped --type-text rules cover the 18 types; poison/fighting tokens nudged', () => {
  const css = R('src/assets/styles/design-system.css');
  const ids = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
  const block = css.slice(css.indexOf('.type-bug, .type-electric'), css.indexOf('--type-text: #FFFFFF') + 60);
  for (const id of ids) assert.ok(block.includes('.type-' + id), `pill text rule covers ${id}`);
  assert.ok(css.includes('--type-poison: #BA68D2;'), 'poison brightened for dark-text contrast');
  assert.ok(css.includes('--type-fighting: #CE3E5A;'), 'fighting darkened for white-text contrast');
  assert.ok(/:is\(\.move-type, \.am-type, \.type-badge, \.pw-badge, \.move-desc-badge\)/.test(css), 'typed pill text override');
});

test('team/battle card texts: dark text on the light card surfaces (blanket-bug fix)', () => {
  const css = R('src/assets/styles/design-system.css');
  assert.ok(/\.poke-card span:not\(\.status-badge\)/.test(css.replace(/\s+/g, ' ')), 'poke-card spans re-coloured');
  assert.ok(css.includes('.poke-move span:not(.move-type):not(.move-eff-badge)'), 'move-row spans re-coloured');
  const card = R('src/ui/components/poke-full-card.js');
  assert.ok(card.includes("`type-${mv.typeCls}`"), 'the move row itself carries the type class');
});

test('PC box (screenshot): static TRI row gone, chips in the FilterBar, fossils via module setter', () => {
  const idx = R('index.html');
  assert.ok(!/>\s*<button[^>]*usm-sort-btn(?! usm-sort-chip)/.test(idx.replace(/<!--[\s\S]*?-->/g, '')), 'no live static sort row in the shell');
  const box = R('src/ui/game/box-selector.js');
  assert.ok(box.includes('function setUsmSubTab'), 'module setter exported');
  assert.ok(box.indexOf("grid.classList.add('usm-modern-grid')") < box.indexOf('no_pokemon_found'), 'modern class set before the empty-state return');
  const gh = R('src/data/game-helpers.js');
  assert.ok(gh.includes('usm-sort-btn usm-sort-chip'), 'sort chips rendered inside the FilterBar');
  assert.ok(gh.includes('sort: sc.sort'), 'chips carry data-sort');
  const bridge = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
  assert.ok(bridge.includes("callGlobal('setUsmSubTab'"), 'bridge routes through the setter');
});

test('bag counters: distinct-item counts per category (shadowed-variable bug)', () => {
  const inv = R('src/ui/game/inventory.js');
  assert.ok(inv.includes('counts[cat]=(counts[cat]||0)+1'), 'count keyed by the category id');
  assert.ok(!inv.includes('counts[c.id]=(counts[c.id]||0)+1'), 'no shadowed c.id access left');
});

test('shops: THE single MoneyRow component is rendered by shop AND market', () => {
  const comp = R('src/ui/components/money-row.js');
  assert.ok(comp.includes('pw-money-row') && comp.includes('moneyRowHTML'), 'component exists');
  for (const f of ['src/ui/game/shop-panel.js', 'src/ui/game/market-panel.js']) { // market panel moved to the UI layer (wave 33)
    const src = R(f);
    assert.ok(src.includes('comps.moneyRowHTML'), `${f} renders the DS MoneyRow`);
    assert.ok(!src.includes("filterBar.style.display = 'none'"), `${f} never hides the money slot`);
  }
  const css = R('src/assets/styles/design-system.css');
  assert.ok(css.includes('.pw-money-row {'), 'MoneyRow styles present');
});

test('modal widths: starter / preset editor / factory prep unified on the menu width', () => {
  const css = R('src/assets/styles/design-system.css');
  assert.ok(/#starter-modal-inner \{[^}]*width: min\(96vw, 980px\)/.test(css), 'starter = menu width');
  assert.ok(/#poke-modal\.preset-editor-modal #poke-modal-inner \{\s*width: min\(96vw, 980px\)/.test(css.replace(/\n/g, ' ')) || /preset-editor-modal #poke-modal-inner \{\n  width: min\(96vw, 980px\)/.test(css), 'preset editor = menu width');
  assert.ok(/atoll-prep-modal #poke-modal-inner \{ width:min\(96vw,980px\)/.test(css), 'factory prep = menu width');
});

test('settings: swatch ring unclipped, active language filled, inset focus ring', () => {
  const css = R('src/assets/styles/design-system.css');
  assert.ok(!/\.theme-swatch:hover \{[^}]*scale\(/.test(css), 'no clipped scale on hover');
  assert.ok(css.includes('box-shadow: inset 0 0 0 2px var(--light2)'), 'inset active ring');
  assert.ok(css.includes('button.pw-settings-choice.active'), 'active language visibly filled');
  assert.ok(css.includes('#settings-inner input:focus'), 'inputs keep an inset focus ring');
});

test('save context menu: one distinct colour class per action', () => {
  // Wave 16: the markup moved into THE DS save-extras component — the
  // adapter only passes intent keys; classes are owned by the component.
  const comp = R('src/ui/components/save-extras.js');
  assert.ok(comp.includes("it.intent === 'dl' && 'dl-item'"), 'download class in the component');
  assert.ok(comp.includes("it.intent === 'imp' && 'imp-item'"), 'import class in the component');
  assert.ok(comp.includes("it.intent === 'danger' && 'danger'"), 'delete class in the component');
  const save = R('src/application/save/save.js');
  assert.ok(save.includes('saveContextMenuHTML') && save.includes("intent: 'danger'"), 'adapter wires the three intents');
  const css = R('src/assets/styles/design-system.css');
  assert.ok(css.includes('.save-context-item.dl-item { color: var(--blue); }') && css.includes('.save-context-item.imp-item { color: var(--green); }') && css.includes('.save-context-item.danger { color: var(--red); }'), 'distinct colours wired');
});

test('mobile: page scrolls, bars sticky, quests folded into adventure, shortcuts top-level', () => {
  const idx = R('index.html');
  assert.ok(idx.includes('data-mobile-view="shortcuts"'), 'shortcuts top-level button');
  assert.ok(!idx.includes('data-mobile-view="quests"'), 'quests top button removed');
  assert.ok(!idx.includes('data-mobile-manage-view="shortcuts"'), 'shortcuts out of Gestion');
  const bridge = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
  assert.ok(bridge.includes("visible = ['win-map', 'win-tabs', 'win-story']"), 'adventure = map + lieu + quêtes');
  assert.ok(bridge.includes("view === 'shortcuts') visible = ['win-shortcuts']"), 'shortcuts view routed');
  const css = R('src/assets/styles/design-system.css');
  assert.ok(css.includes('overflow-x: hidden;\n    overflow-y: auto;'), 'page scrolls vertically');
  // documented supersede (wave 31): the rule now needs !important —
  // renderDashboardColumns writes an INLINE display:flex on every column,
  // which silently beat the plain `display: contents` (pokeworld_cols
  // layout restore) and pushed the single mobile window mid-screen.
  // The intent of THIS lock is unchanged: the columns must collapse.
  const colBlock = css.match(/body\.mobile-mode \.dash-col \{[\s\S]*?\}/);
  assert.ok(colBlock && /display:\s*contents !important/.test(colBlock[0]), 'single stacked flow (columns collapse, wave-31 hammer)');
  assert.ok(css.includes('#win-map { order: 10;') && css.includes('#win-story { order: 30;'), 'explicit stack order');
  const map = R('src/ui/game/map-logic.js');
  assert.ok(map.includes('mobile-mode'), 'updateFeatureWindows mobile guard');
});

test('header: sticky + explicit badge label before the numbers', () => {
  const css = R('src/assets/styles/design-system.css');
  assert.ok(css.includes('position: sticky;\n  top: 0;\n  z-index: 950;'), 'sticky header');
  const idx = R('index.html');
  assert.ok(idx.includes('badges_lbl">Badges</span>&nbsp;:'), 'label precedes 12/16');
  const fr = R('src/localization/fr/ui.js');
  assert.ok(fr.includes('"badges_lbl":"Badges"') && fr.includes('"mine_title":"Grand Souterrain"'), 'fr labels fixed');
  const en = R('src/localization/en/ui.js');
  assert.ok(en.includes('"mine_title":"Grand Underground"'), 'en mine label fixed');
});

test('ultrawide: sides absorb extra space until they match the centre', () => {
  const css = R('src/assets/styles/design-system.css');
  assert.ok(css.includes('min-aspect-ratio: 17/9'), 'media query present');
  assert.ok(css.includes('#main-dashboard #col-2 {\n    flex: 0 0 800px !important;'), 'centre kept at its 16:9 width while sides grow');
  assert.ok(css.includes('@media (min-aspect-ratio: 17/9) and (min-width: 2720px)'), 'equal columns beyond the breakpoint');
});

test('window drag: re-drop at origin is a no-op, markers above AND below, every column', () => {
  const drag = R('src/ui/game/win-drag.js');
  assert.ok(drag.includes('dragOrigin'), 'origin slot remembered');
  assert.ok(drag.includes('backHome'), 'drop at origin = no-op (window keeps its place)');
  assert.ok(drag.includes("classList.add('insert-above')") && drag.includes("classList.add('insert-below')"), 'both neighbours marked between two windows');
  const css = R('src/assets/styles/design-system.css');
  assert.ok(css.includes('.dash-win.insert-above') && css.includes('.dash-win.insert-below'), 'marker styles both ways');
});

test('sprites: canonical sizes bumped (user: out-of-team sprites too small)', async () => {
  const { SPRITE_SIZES } = await import('../src/core/design-tokens.js');
  assert.equal(SPRITE_SIZES.standard, 72); // wave 17: 64→72 (uniform with the dex circle)
  assert.equal(SPRITE_SIZES.team, 104);
  const css = R('src/assets/styles/design-system.css');
  assert.ok(css.includes('--pw-size-poke-sm: 72px') && css.includes('--pw-size-poke-lg: 104px'), 'CSS tokens in parity');
});
