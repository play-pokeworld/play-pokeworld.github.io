/**
 * Wave 19 — remaining displays migration (visual checks in headless
 * Chromium: harness/visual-wave19.mjs, jsdom probe: harness/probe-wave19.mjs):
 *
 *  A. Pokédex DETAIL sheet (openDexEntry) is rebuilt from zero by the ECS
 *     DexDetailView — same language as the shared info panel (flat hero
 *     panel, canonical 96px sprite disc, framed .pw-panel sections, shared
 *     stat cards). The old hand-grown .dex-detail-* markup (144px
 *     radial-gradient orb, rgba boxes, 4-col mini stats) is deleted, CSS
 *     included. Contracts kept: .poke-detail-title close cross
 *     (close-poke-modal), legacy-call chips openMoveInfo/openAbilityInfo,
 *     evolution-methods DS block, dict chips, shiny ★.
 *  B. Notifications/toasts (#notif) harmonised on the design system: flat
 *     theme-token surface, NO inline background anymore — the historical
 *     colour argument is mapped (pwToastKind) to a kind bar on the left
 *     (crimson danger / positive green / accent info / neutral), with a
 *     short entrance animation. Same node, same 2.5s display contract.
 *
 * All DOM-free (source contracts + component HTML strings).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DexDetailView } from '../src/ui/views/DexDetailView.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CSS = R('src/assets/styles/design-system.css');
const CSS1 = CSS.replace(/\s+/g, ' '); // single-line for cross-line needles
const HTML_INDEX = R('index.html');
const POKEDEX_JS = R('src/ui/game/pokedex.js');
const UTIL_JS = R('src/core/game-utils.js');
const BRIDGE_JS = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');

/* ─── A. Pokédex detail view ───────────────────────────────────────────── */

function sampleModel(overrides = {}) {
  return Object.assign({
    id: 25,
    name: 'Pikachu',
    shiny: false,
    spriteHtml: '<div class="pw-poke-circle-wrap"><span class="pw-poke-circle-bg"></span><img class="pw-poke-circle-img sprite-img" src="x.png"></div>',
    typesHtml: '<span class="type-badge type-electric">Électrik</span>',
    flavorLabel: 'Description',
    flavor: 'Quand plusieurs de ces Pokémon se réunissent…',
    evolutionsHtml: '<div class="pw-evo-methods">Évolutions</div>',
    sourcesLabel: 'Où le trouver',
    sources: ['Route 1', 'Forêt de Jade'],
    movesLabel: 'Capacités',
    moves: [{ key: 'thunderbolt', label: 'Fatal-Foudre' }, { key: 'tackle', label: 'Charge' }],
    noMovesLabel: 'Aucune capacité listée.',
    talentsLabel: 'Talents',
    talents: [{ key: 'static', label: 'Statik' }],
    noTalentsLabel: 'Aucun talent listé.',
    statsLabel: 'Stats de base',
    stats: [
      { label: 'PV', value: 35 }, { label: 'ATK', value: 55 }, { label: 'DEF', value: 40 },
      { label: 'ASP', value: 50 }, { label: 'DSP', value: 50 }, { label: 'VIT', value: 90 },
    ],
  }, overrides);
}

test('wave19: DexDetailView renders the canonical header + ONE close cross (contract)', () => {
  const html = DexDetailView.toHTML(sampleModel());
  const closes = html.match(/data-action="close-poke-modal"/g) || [];
  assert.equal(closes.length, 1, 'exactly one close-poke-modal control');
  assert.ok(html.includes('class="modal-title poke-detail-title"'), 'kept title hook');
  assert.ok(html.includes('class="modal-close"'), 'close cross class kept');
  assert.ok(html.includes('#25 '), 'dex number in title');
  assert.ok(html.includes('Pikachu'), 'name in title');
});

test('wave19: DexDetailView — shiny ★ uses the unified shiny-tag, hidden when not shiny', () => {
  assert.ok(DexDetailView.toHTML(sampleModel({ shiny: true })).includes('<span class="shiny-tag">★</span>'), 'shiny star rendered');
  assert.ok(!DexDetailView.toHTML(sampleModel({ shiny: false })).includes('shiny-tag'), 'no star when not shiny');
});

test('wave19: DexDetailView — move/talent chips keep the legacy-call contracts', () => {
  const html = DexDetailView.toHTML(sampleModel());
  assert.ok(html.includes('data-action="legacy-call" data-call="openMoveInfo" data-call-args="\'thunderbolt\'"'), 'move chip contract');
  assert.ok(html.includes('data-action="legacy-call" data-call="openAbilityInfo" data-call-args="\'static\'"'), 'talent chip contract');
  assert.ok(html.includes('Fatal-Foudre'), 'move label rendered');
  assert.ok(html.includes('dict-chip-list'), 'chip list hook kept');
});

test('wave19: DexDetailView — empty moves/talents fall back to muted info lines', () => {
  const html = DexDetailView.toHTML(sampleModel({ moves: [], talents: [] }));
  assert.ok(html.includes('Aucune capacité listée.'), 'no-moves muted line');
  assert.ok(html.includes('Aucun talent listé.'), 'no-talents muted line');
  assert.ok(!html.includes('openMoveInfo'), 'no dead chips when empty');
});

test('wave19: DexDetailView — shared framed sections + stat cards (info-panel language)', () => {
  const html = DexDetailView.toHTML(sampleModel());
  assert.ok(html.includes('pw-panel pw-info-section'), 'framed sections');
  assert.ok(html.includes('pw-info-stat-cards pw-dex-stats'), 'shared stat cards grid');
  const cards = html.match(/pw-card-dark pw-center/g) || [];
  assert.equal(cards.length, 6, 'six base stat cards');
  assert.ok(html.includes('pw-panel pw-dex-hero'), 'flat hero panel');
  assert.ok(html.includes('type-badge type-electric'), 'type badges in hero');
  assert.ok(html.includes('pw-poke-circle-wrap'), 'canonical sprite disc fragment');
});

test('wave19: DexDetailView — flavor text is escaped (text node, not raw HTML)', () => {
  const html = DexDetailView.toHTML(sampleModel({ flavor: '<img src=x onerror=alert(1)>' }));
  assert.ok(!html.includes('<img src=x onerror'), 'flavor cannot inject markup');
  assert.ok(html.includes('&lt;img'), 'flavor escaped');
});

test('wave19: adapter openDexEntry shapes a model and delegates to DexDetailView', () => {
  assert.ok(POKEDEX_JS.includes('views.DexDetailView.toHTML({'), 'delegates to the ECS view');
  assert.ok(POKEDEX_JS.includes("throw new Error('[ui] PokeUI views not loaded (DexDetailView)')"), 'hard failure if UI missing (same as other panels)');
  assert.ok(POKEDEX_JS.includes("inner.classList.add('poke-detail-inner')"), 'host class contract kept');
  assert.ok(POKEDEX_JS.includes("size: 'team'"), 'canonical LARGE disc (team = 104px clamp, was a hard 120px)');
  assert.ok(!POKEDEX_JS.includes('dex-detail-orb'), 'legacy orb markup gone from the adapter');
  assert.ok(!POKEDEX_JS.includes('dex-detail-layout'), 'legacy layout markup gone from the adapter');
});

test('wave19: shiny ★ survives the modal universal colour hammers (Chromium discovery)', () => {
  // #poke-modal-inner * (specificity 1,0,0) repainted every in-modal ★
  // cream — the wave-18 unification only held OUTSIDE modals. A shiny
  // star is ALWAYS the shiny colour: the unified rule is now !important.
  const m = CSS1.match(/\.dex-shiny, \.box-shiny, \.shiny-tag, \.pw-poke-circle-shiny, \.pw-shiny-star \{[^}]*\}/);
  assert.ok(m, 'unified star rule exists');
  // wave 24: dead '#FF8F8F' fallback stripped (single truth = the --shiny token).
  assert.ok(m[0].includes('var(--shiny) !important'), 'star colour locked !important over the universal hammers');
  assert.ok(CSS1.includes('#poke-modal-inner *') && CSS1.includes('color: var(--light2)'), 'hammer documented (still governs the rest)');
});

test('wave19: legacy .dex-detail-* CSS deleted (gradient orb included), DS replacements present', () => {
  assert.ok(!/\.dex-detail-orb\s*\{/.test(CSS), 'orb rule deleted');
  assert.ok(!/\.dex-detail-layout\s*\{/.test(CSS), 'layout rule deleted');
  assert.ok(!/\.dex-flavor\s*\{[^}]*rgba\(0,0,0/.test(CSS1), 'rgba flavor box deleted');
  assert.ok(!/\.dex-stat-mini\s*\{/.test(CSS), 'mini stats rule deleted');
  assert.ok(CSS1.includes('.pw-dex-hero { display:flex'), 'flat hero rule present');
  assert.ok(CSS1.includes('.pw-info-stat-cards.pw-dex-stats { grid-template-columns: repeat(3, 1fr)'), '3-col stat grid tie-break present');
});

/* ─── B. Notifications / toasts ────────────────────────────────────────── */

test('wave19: notify() maps the historical colour to a DS kind class (no inline background)', () => {
  assert.ok(UTIL_JS.includes('function pwToastKind(color)'), 'single kind mapper in util.js');
  assert.ok(UTIL_JS.includes("el.className='pw-toast pw-toast--' + pwToastKind(color)"), 'toast kind class applied');
  assert.ok(!/el\.style\.background\s*=/.test(UTIL_JS), 'no inline background left in util notify');
  // Vague 41 — lock recâblé (intention 'exposé aux autres realms' préservée) :
// la pose window est devenue le shim canonique gardé globalThis.
assert.ok(UTIL_JS.includes("globalThis.pwToastKind = pwToastKind"), 'kind helper exposed for other realms');
  // Same 2.5s lifetime + display contract
  assert.ok(UTIL_JS.includes("el.style.display='block'"), 'display contract kept');
  assert.ok(UTIL_JS.includes('2500'), 'lifetime kept');
});

test('wave19: the boot bridge copy of notify delegates to the same DS toast', () => {
  const m = BRIDGE_JS.match(/window\.notify = function \(message, color\) \{[\s\S]*?\};/);
  assert.ok(m, 'bridge notify found');
  assert.ok(m[0].includes('window.pwToastKind'), 'bridge delegates to the kind mapper');
  assert.ok(m[0].includes('pw-toast--'), 'bridge applies the kind class');
  assert.ok(!/element\.style\.background\s*=/.test(m[0]), 'no inline background left in the bridge copy');
});

test('wave19: toast CSS is a flat DS surface with a kind bar (button colour language)', () => {
  assert.ok(CSS1.includes('#notif, .pw-toast {'), 'toast base rule (id + class — class needed for preview/demo hosts)');
  // wave 24: dead fallbacks stripped; the rendered truth (surface rgb(36,34,30) = #24221E,
  // text rgb(236,222,183) = #ECDEB7) is measured identical in harness/visual-wave24.mjs.
  assert.ok(CSS1.includes('background: var(--pw-bg-surface); color: var(--pw-text-primary)'), 'themed flat surface + readable text');
  assert.ok(CSS1.includes('border-left: 4px solid var(--green)'), 'success kind bar (default)');
  // Kind rules must carry the id selector too — the bare #notif in the
  // base group (1,0,0) would otherwise beat the kind classes and paint
  // every bar green (measured in Chromium via the bundle path).
  assert.ok(CSS1.includes('#notif.pw-toast--danger, .pw-toast--danger { border-left-color: var(--red)'), 'danger kind bar (id + class, beats the base id)');
  assert.ok(CSS1.includes('#notif.pw-toast--info, .pw-toast--info { border-left-color: var(--accent)'), 'info kind bar (id + class)');
  assert.ok(CSS1.includes('#notif.pw-toast--neutral, .pw-toast--neutral { border-left-color: var(--light2)'), 'neutral kind bar (id + class)');
  assert.ok(CSS1.includes('.pw-toast.is-visible { animation: pwToastIn'), 'entrance animation');
  assert.ok(!/#notif\s*\{[^}]*background:\s*var\(--green\)[^}]*color:\s*white/.test(CSS1), 'old solid-green white-text rule deleted');
});

test('wave19: #notif node carries the pw-toast class in the static markup', () => {
  assert.ok(HTML_INDEX.includes('<div id="notif" class="pw-toast"></div>'), 'static class present');
});

test('wave19: kind mapping — full matrix documented and locked', () => {
  // Locked by source inspection of pwToastKind (util.js is a legacy realm
  // module — asserted here as source contract, runtime probe checks the
  // actual DOM classes).
  assert.ok(UTIL_JS.includes('return \'danger\''), 'danger kind exists');
  assert.ok(UTIL_JS.includes('return \'info\''), 'info kind exists');
  assert.ok(UTIL_JS.includes('return \'neutral\''), 'neutral kind exists');
  assert.ok(UTIL_JS.includes("return c ? 'neutral' : 'success'"), 'default stays success (historical var(--green))');
});
