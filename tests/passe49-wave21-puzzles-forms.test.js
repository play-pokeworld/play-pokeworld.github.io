/**
 * Wave 21 — remaining displays migration (Chromium measures in
 * harness/visual-wave21.mjs, jsdom probe harness/probe-wave21.mjs):
 *
 *  A. Secret explorations (puzzle list + puzzle sheet) rebuilt from zero
 *     by the ECS PuzzleListView / PuzzleExplorationView: NO greyed-out
 *     dead lock button anymore (informative lock line — same DS rule as
 *     the quest cards), every inline style removed (status tones are
 *     .pw-puzzle-status is-locked/is-done/is-open classes), theme-blind
 *     rgba surfaces tokenized, the modal-title gradient flattened and the
 *     paint-dead wait bar (markup NEVER rendered #puzzle-wait-fill/lab —
 *     gradient CSS inside) deleted. Sequence/braille/wait/party wiring
 *     contracts unchanged.
 *  B. Special-forms panel (Morphéo/Deoxys) rebuilt from zero by the ECS
 *     SpecialFormsView: the adapter only shapes localized models; buy
 *     contract (`buySpecialFormPokemon` with UNQUOTED numeric args),
 *     locked empty state, owned badge state and canonical 72px sprites
 *     unchanged.
 *
 * All DOM-free (source contracts + component HTML strings).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PuzzleListView, PuzzleExplorationView, SpecialFormsView } from '../src/ui/views/PuzzleViews.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CSS = R('src/assets/styles/design-system.css');
const CSS1 = CSS.replace(/\s+/g, ' ');
const PUZZLE_JS = R('src/application/world/puzzle-explorations.js');
const LOCINFO_JS = R('src/ui/game/location-info.js');

/* ─── A. Puzzle list view ───────────────────────────────────────────────── */

test('wave21: PuzzleListView — cards, status tones, NO dead lock button', () => {
  const html = PuzzleListView.toHTML({
    hint: 'Astuce',
    cards: [
      { icon: '📜', name: 'Première tablette', summary: 'Résumé', statusKind: 'open', statusText: 'Intact', action: { callArgs: "'sealed_braille_a'", label: "S’approcher" } },
      { icon: '🔒', name: 'Tablette scellée', summary: 'Résumé 2', statusKind: 'locked', statusText: 'Scelle', lockText: '🔒 La voie est scellée pour l’instant.' },
      { icon: '📜', name: 'Tablette lue', summary: 'Résumé 3', statusKind: 'done', statusText: 'Déjà percé', done: true, action: { callArgs: "'x'", label: 'Revenir' } },
    ],
    closeLabel: 'Fermer',
  });
  assert.ok(html.includes('pw-view" data-view="PuzzleListView"'), 'ECS view stamp');
  assert.ok(!/button[^>]*disabled/.test(html) && !html.includes('hbtn disabled'), 'ZERO greyed-out dead button');
  assert.ok(html.includes('class="pw-puzzle-lock-line"'), 'sealed card → informative lock line');
  assert.ok(html.includes('pw-puzzle-status is-locked') && html.includes('pw-puzzle-status is-done') && html.includes('pw-puzzle-status is-open'), 'status tones are classes (no inline colour)');
  assert.ok(!/style="[^"]*(color|margin|justify|opacity|cursor)/.test(html), 'ZERO inline style left');
  assert.ok(html.includes('data-action="legacy-call" data-call="openPuzzleExploration" data-call-args="\'sealed_braille_a\'"'), 'open contract (quoted id)');
  assert.ok(html.includes('data-call="closeFullscreenPanel"'), 'close contract');
  assert.ok(html.includes('class="pw-green"'), 'done ✓ suffix on the pw-green class');
});

test('wave21: PuzzleExplorationView — sequence contracts (ids, keys, ONE cross)', () => {
  const html = PuzzleExplorationView.toHTML({
    icon: '✦', title: 'Murmures sous la roche', summary: 'Résumé', clue: 'Les anciens <montraient> la falaise …',
    clueLabel: 'Sur place', kind: 'sequence',
    seqOptions: [{ key: 'rock', label: 'Montagne' }, { key: 'lake', label: 'Source' }],
    confirmCallArgs: "'cerulean_sigil_a'", cancelLabel: 'S’éloigner', confirmLabel: 'Confirmer',
    beenBeforeText: '✓ Vous êtes déjà passe par ici.',
  });
  assert.ok(html.includes('id="puzzle-seq-progress"'), 'sequence progress slot (wiring hook)');
  assert.ok((html.match(/class="hbtn puzzle-seq-btn" data-seq-key="/g) || []).length === 2, 'data-seq-key contract on every option');
  assert.ok(html.includes('id="puzzle-answer-input" type="hidden"'), 'hidden answer input (sequence mode)');
  assert.ok(html.includes('&lt;montraient&gt;'), 'clue escaped as text (vdom serializer, no raw HTML injection)');
  assert.equal((html.match(/data-call="closePuzzleExploration"/g) || []).length, 2, 'exactly ONE cross + the cancel button (both closePuzzleExploration)');
  assert.ok(html.includes('modal-close'), 'cross keeps .modal-close');
  assert.ok(html.includes('pw-btn-cancel'), 'cancel keeps .pw-btn-cancel (neutral colour language)');
  assert.ok(html.includes('data-call="submitPuzzleAnswer" data-call-args="\'cerulean_sigil_a\'"'), 'confirm contract (quoted id)');
});

test('wave21: PuzzleExplorationView — braille/wait/party variants', () => {
  const br = PuzzleExplorationView.toHTML({ icon: '✦', title: 'T', summary: 'S', kind: 'code', brailleText: '⠃⠗', inputLabel: 'Votre lecture', confirmCallArgs: "'p'" });
  assert.ok(br.includes('pw-puzzle-braille') && br.includes('type="text"'), 'code/braille → braille block + text input');
  const wt = PuzzleExplorationView.toHTML({ icon: '✦', title: 'T', summary: 'S', kind: 'wait', waitHint: 'Le seuil écoute.', inputLabel: 'Votre action', confirmCallArgs: "'p'" });
  assert.ok(wt.includes('type="text"') && !wt.includes('pw-puzzle-braille'), 'wait → text input, no braille');
  const pa = PuzzleExplorationView.toHTML({ icon: '✦', title: 'T', summary: 'S', kind: 'party', partyHint: 'Compagnons requis', confirmCallArgs: "'p'" });
  assert.ok(pa.includes('id="puzzle-answer-input" type="hidden" value="PARTY"'), 'party → hidden PARTY input (submit contract)');
  assert.ok(!/puzzle-wait-fill|puzzle-wait-label/.test(br + wt + pa), 'paint-dead wait-fill/label NEVER rendered (kept contract)');
});

test('wave21: puzzle adapter delegates + paint-dead wait ticker removed', () => {
  assert.ok(PUZZLE_JS.includes('viewsL.PuzzleListView.toHTML(model)'), 'list adapter delegates to PuzzleListView');
  assert.ok(PUZZLE_JS.includes('viewsP.PuzzleExplorationView.toHTML(model)'), 'modal adapter delegates to PuzzleExplorationView');
  assert.ok(PUZZLE_JS.includes('PokeUI views not loaded (PuzzleListView)') && PUZZLE_JS.includes('PokeUI views not loaded (PuzzleExplorationView)'), 'strict view guards (like the other panels)');
  assert.ok(!PUZZLE_JS.includes('hbtn disabled'), 'no more dead lock button in the adapter');
  assert.ok(!PUZZLE_JS.includes('pw-puzzle-wait-fill') && !PUZZLE_JS.includes('pw-puzzle-wait-label'), 'paint-dead wait ticker REMOVED (documented — elements never rendered, waitTouched never set)');
  assert.ok(!/style=\\?"/.test(PUZZLE_JS.replace(/modal\.style\.cssText/g, '')), 'no inline style building left in the puzzle UI builders');
});

test('wave21: puzzle CTI — gradient/dead CSS deleted, surfaces tokenized', () => {
  assert.ok(!/\.pw-puzzle-wait-bar\s*\{/.test(CSS), 'wait-bar CSS deleted (never rendered)');
  assert.ok(!/\.pw-puzzle-wait-fill\s*\{/.test(CSS), 'wait-fill CSS deleted (gradient inside)');
  assert.ok(!/\.pw-puzzle-shell \.modal-title\s*\{[^}]*linear-gradient/.test(CSS1), 'modal-title gradient flattened');
  assert.ok(!/\.pw-puzzle-inscribe\s*\{[^}]*rgba\(0,0,0/.test(CSS1) && !/\.pw-puzzle-card\s*\{[^}]*rgba\(0,0,0/.test(CSS1) && !/\.pw-puzzle-input\s*\{[^}]*rgba\(0,0,0/.test(CSS1) && !/\.pw-puzzle-braille\s*\{[^}]*rgba\(0,0,0/.test(CSS1), 'theme-blind rgba black surfaces tokenized');
  assert.ok(!/\.pw-puzzle-seq-btns \.hbtn\s*\{[^}]*!important/.test(CSS1), 'seq buttons follow the universal flat-control paint (override deleted)');
  assert.ok(CSS1.includes('.pw-puzzle-status.is-locked { color: var(--light1)'), 'status tones tokenized');
  assert.ok(CSS1.includes('.pw-puzzle-lock-line {'), 'lock line class declared');
});

/* ─── B. Special forms view ─────────────────────────────────────────────── */

test('wave21: SpecialFormsView — locked empty state', () => {
  const html = SpecialFormsView.toHTML({ title: '🌤️ Labo Météo — Formes de Morphéo', emptyLabel: 'Morphéo doit être dans la Boîte PC…' });
  assert.ok(html.includes('pw-manage-title'), 'title hook kept');
  assert.ok(html.includes('class="pw-empty-state-lg"'), 'locked → empty state (.pw-empty-state-lg contract)');
  assert.ok(!html.includes('pw-manage-card'), 'no card while locked');
});

test('wave21: SpecialFormsView — rows, UNQUOTED buy args, owned badge, 72px sprite', () => {
  const spr = '<span class="pw-poke-circle-wrap" style="width:72px;height:72px"><span class="pw-poke-circle-bg"></span><img class="pw-poke-circle-img sprite-img" width="72" height="72"></span>';
  const html = SpecialFormsView.toHTML({
    title: 'T',
    rows: [
      { spriteHtml: spr, nameLabel: '☀️ Morphéo Solaire', owned: false, descText: 'Forme stabilisée…', sideText: '20 000₽', callArgs: '387,20000' },
      { spriteHtml: spr, nameLabel: '❄️ Morphéo Blizzard', owned: true, ownedText: 'Acheté — forme déjà obtenue…', sideText: '✓' },
    ],
  });
  assert.ok(html.includes('data-action="legacy-call" data-call="buySpecialFormPokemon" data-call-args="387,20000"'), 'buy contract — UNQUOTED numeric args (exact)');
  assert.ok((html.match(/pw-manage-card/g) || []).length === 2, 'two cards rendered');
  assert.ok((html.match(/pw-owned/g) || []).length === 1, 'owned badge state (.pw-owned contract)');
  const ownedPos = html.indexOf('pw-owned');
  assert.ok(html.indexOf('data-call="buySpecialFormPokemon"', ownedPos) === -1, 'owned card is NOT actionable');
  assert.ok(html.includes('pw-text-sm pw-green'), 'owned line keeps the green class');
  assert.ok(html.includes('pw-flex-1') && html.includes('pw-manage-sprite') && html.includes('pw-manage-level'), 'row anatomy unchanged');
});

test('wave21: forms adapter delegates + shapes localized models', () => {
  assert.ok(LOCINFO_JS.includes('views.SpecialFormsView.toHTML(model)'), 'adapter delegates to SpecialFormsView');
  assert.ok(LOCINFO_JS.includes('PokeUI views not loaded (SpecialFormsView)'), 'strict view guard');
  assert.ok(LOCINFO_JS.includes('callArgs: f.id + \',\' + f.price'), 'unquoted numeric args shaped in the adapter');
  assert.ok(LOCINFO_JS.includes('fs-panel-filters'), 'money filter-slot behaviour preserved');
  assert.ok(!/renderCastformFormsPanel[\s\S]{0,120}innerHTML\s*=\s*html/.test(LOCINFO_JS), 'no raw-HTML accumulation left on the forms panel path');
});

test('wave21: views exported by the registry', () => {
  const idx = R('src/ui/views/index.js');
  assert.ok(idx.includes("export { PuzzleListView, PuzzleExplorationView, SpecialFormsView } from './PuzzleViews.js';"), 'PuzzleViews.js exports wired');
});
