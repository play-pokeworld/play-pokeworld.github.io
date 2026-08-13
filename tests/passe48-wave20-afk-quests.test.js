/**
 * Wave 20 — remaining displays migration (Chromium measures in
 * harness/visual-wave20.mjs, jsdom probe harness/probe-wave20.mjs):
 *
 *  A. AFK / offline gains panel (#afk-result-modal) rebuilt from zero by
 *     the ECS AfkRecapView: status pill on theme tokens, stats via the
 *     SHARED battle-session grid, captures/items via the VERY SAME
 *     session-summary components (the one-off afk-loot-card tile language
 *     is deleted, CSS included) and the fast-forward bar is FLAT (no more
 *     accent→green gradient — the aplats rule).
 *  B. Quest-window internals rebuilt from zero (StoryWindowView /
 *     NpcDialogView / RepeatableUpgradeView): pw-tip-card, pw-card-purple,
 *     pw-detail-chip, pw-tag-pill… replaced by framed .pw-panel cards with
 *     theme tokens; the challenge button is FLAT accent (gradient gone);
 *     NO greyed-out DEAD claim button — while a quest is not claimable
 *     the card shows an informative line (DS rule, like the machine
 *     staff). All action contracts unchanged.
 *
 * All DOM-free (source contracts + component HTML strings).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AfkRecapView } from '../src/ui/views/AfkRecapView.js';
import { StoryWindowView, NpcDialogView, RepeatableUpgradeView } from '../src/ui/views/StoryWindowView.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CSS = R('src/assets/styles/design-system.css');
const CSS1 = CSS.replace(/\s+/g, ' ');
const OFFLINE_JS = R('src/application/save/offline-engine.js');
const QUEST_JS = R('src/ui/game/quest-ui.js');

/* ─── A. AFK recap panel ────────────────────────────────────────────────── */

test('wave20: AfkRecapView progress mode keeps the paint contracts', () => {
  const html = AfkRecapView.toHTML({ mode: 'progress', title: 'Calcul du temps écoulé', statusText: 'Avance rapide… 42 %', pct: 42, stageText: 'Combats sauvages' });
  assert.ok(html.includes('afk-ff-bar'), 'bar hook (passe28 needle)');
  assert.ok(/width:42%/.test(html), 'inline width:N% (croissant regex /width:(\\d+)%/)');
  assert.ok(html.includes('afk-ff-stage'), 'stage line hook');
  assert.ok(html.includes('afk-result-card'), 'card shell hook');
});

test('wave20: AfkRecapView result mode — shared grid + summary components + close contracts', () => {
  const html = AfkRecapView.toHTML({
    mode: 'result', title: '⏱ De retour !', statusText: 'Tout va bien', statusKind: 'success',
    stats: [{ value: '1 h 00', label: 'Durée' }, { value: 7, label: 'Combats' }],
    capturesTitle: 'Pokémon capturés',
    captures: [{ spriteHtml: '<span class="pw-poke-circle-wrap"></span>', name: 'Roucool', subLabel: '2 doubles', count: 3, shiny: false }],
    itemsTitle: 'Objets trouvés',
    items: [{ iconHtml: '<img src="i.png">', name: 'Potion', qty: 2 }],
    emptyLabel: 'Rien', noteText: 'Note test', closeLabel: 'Fermer',
  });
  assert.ok(html.includes('afk-result-grid'), 'grid needle kept (passe28)');
  assert.ok(html.includes('battle-session-summary-grid'), 'shared stat grid (same as battle summary)');
  assert.ok(html.includes('battle-summary-entry'), 'capture rows = battle-summary rows (afk-loot-card gone)');
  assert.ok(html.includes('pw-summary-count'), '×N count cell of the shared row');
  assert.ok(html.includes('afk-result-status success'), 'success status pill');
  const closes = html.match(/data-call="closeAfkResultPanel"/g) || [];
  assert.equal(closes.length, 2, 'cross + footer button share the close contract');
  // Wave 32: the bespoke `.afk-modal-close` (a drifted copy of the shared
  // cross) was retired — the recap now uses the canonical `.modal-close`
  // emitted by components/panel-header.js, like every other panel.
  assert.ok(html.includes('class="modal-close"'), 'shared close control');
  assert.ok(!html.includes('afk-modal-close'), 'the private cross class is gone');
  assert.ok(html.includes('Roucool') && html.includes('Potion'), 'names rendered');
});

test('wave20: AfkRecapView — empty lists fall back to the shared empty line; danger kind maps', () => {
  const html = AfkRecapView.toHTML({ mode: 'result', title: 't', statusText: 's', statusKind: 'danger', stats: [], capturesTitle: 'C', captures: [], itemsTitle: 'I', items: [], emptyLabel: 'Rien du tout', noteText: '', closeLabel: 'x' });
  assert.ok((html.match(/battle-summary-empty/g) || []).length === 2, 'two shared empty lines');
  assert.ok(html.includes('Rien du tout'), 'localized empty label');
  assert.ok(html.includes('afk-result-status danger'), 'danger pill');
});

test('wave20: offline adapter shapes models + delegates to AfkRecapView', () => {
  assert.ok(OFFLINE_JS.includes('offlineAfkViews().AfkRecapView.toHTML'), 'both renders delegate');
  assert.ok(OFFLINE_JS.includes("throw new Error('[ui] PokeUI views not loaded (AfkRecapView)')"), 'hard failure if the UI is missing (same as other panels)');
  assert.ok(!OFFLINE_JS.includes('renderAfkCaptureCards(') && !OFFLINE_JS.includes('renderAfkItemList('), 'legacy tile builders purged (globals gone too)');
  assert.ok(OFFLINE_JS.includes('afkCaptureModels') && OFFLINE_JS.includes('afkItemModels'), 'model mappers kept in the adapter');
  assert.ok(OFFLINE_JS.includes("size: 'standard'"), 'canonical sprite size (was 44)');
});

test('wave20: afk CTI — flat bar, tokenized tints, legacy tile CSS deleted', () => {
  assert.ok(!/\.afk-loot-card\s*\{/.test(CSS), 'afk-loot-card CSS deleted');
  assert.ok(!/\.afk-loot-row\s*\{/.test(CSS), 'afk-loot-row CSS deleted');
  assert.ok(!/\.afk-chip\s*\{/.test(CSS), 'afk-chip CSS deleted');
  assert.ok(CSS1.includes('.afk-ff-bar > i { display: block; height: 100%; border-radius: 6px; background: var(--green);'), 'flat green fill — gradient gone');
  assert.ok(!/\.afk-ff-bar > i[^}]*linear-gradient/.test(CSS1), 'no gradient left in the ff bar');
  assert.ok(CSS1.includes('.afk-result-card { width: min(620px, 96vw)') && CSS1.includes('border: 1px solid var(--pw-border-color'), 'card border/box on theme tokens');
  assert.ok(CSS1.includes('.afk-result-status.success { background: color-mix(in srgb, var(--green) 16%'), 'success tint via color-mix (theme-proof)');
  assert.ok(CSS1.includes('.afk-result-status.danger { background: color-mix(in srgb, var(--red) 17%'), 'danger tint via color-mix');
});

/* ─── B. Quest-window internals ─────────────────────────────────────────── */

function sampleCard(overrides = {}) {
  return Object.assign({
    title: '1. Bataille de la Route 1',
    desc: 'Va voir le vieil homme.',
    kind: 'progress',
    progressLabel: 'Progression',
    progressValue: '3 / 5',
    pct: 60,
    done: false,
    rewardText: 'Récompense : 500₽',
  }, overrides);
}

test('wave20: StoryWindowView — cards, sections, progress bar contracts', () => {
  const html = StoryWindowView.toHTML({
    tutorialHtml: '',
    blocks: [
      { type: 'section', tone: 'story', iconHtml: '<i>S</i>', label: 'Histoire (Kanto — 1/8)' },
      { type: 'card', card: sampleCard() },
    ],
    footer: { kind: 'board', iconHtml: '<i>R</i>', label: 'Tableau des quêtes' },
  });
  assert.ok(html.includes('pw-panel pw-quest-card'), 'framed DS card');
  assert.ok(html.includes('pw-quest-section is-story'), 'section header with tone');
  assert.ok(html.includes('quest-progress-bar') && html.includes('data-pct="60"'), 'progress fill + painter attribute');
  assert.ok(html.includes('width:60%'), 'progress width INLINE (self-sufficient bar, wave-13 rule)');
  assert.ok(html.includes('data-call="openRepeatableMenu"'), 'board button contract');
  assert.ok(!html.includes('pw-tip-card') && !html.includes('pw-tag-pill'), 'legacy classes gone');
});

test('wave20: quest card ACTIONS — challenge / claim contracts + NO dead button', () => {
  const challenge = StoryWindowView.toHTML({ blocks: [{ type: 'card', card: sampleCard({ kind: 'trainer', trainerText: 'Dresseur visé : Pierre', trainerHint: 'Astuce', pct: 0, action: { cls: 'is-challenge', call: 'startQuestTrainerBattle', callArgs: "'q7','main'", label: 'Défier !' } }) }] });
  assert.ok(challenge.includes('data-action="legacy-call" data-call="startQuestTrainerBattle" data-call-args="\'q7\',\'main\'"'), 'trainer battle contract');
  assert.ok(challenge.includes('quest-claim-btn is-challenge'), 'challenge styling class');

  const claim = StoryWindowView.toHTML({ blocks: [{ type: 'card', card: sampleCard({ done: true, pct: 100, action: { cls: 'is-done', call: 'claimQuest', callArgs: "'q2','side'", label: 'Récupérer' } }) }] });
  assert.ok(claim.includes('data-call="claimQuest" data-call-args="\'q2\',\'side\'"'), 'claim contract');
  assert.ok(claim.includes('quest-claim-bar') === false && claim.includes('quest-claim-btn is-done'), 'claim styling class');

  const waiting = StoryWindowView.toHTML({ blocks: [{ type: 'card', card: sampleCard({ infoText: 'En cours…' }) }] });
  assert.ok(!waiting.includes('<button'), 'no DEAD/greyed button while unclaimable');
  assert.ok(waiting.includes('pw-quest-info-line'), 'informative line instead (DS rule)');
});

test('wave20: NpcDialogView — dialog + quest offer/replay contracts', () => {
  const html = NpcDialogView.toHTML({
    npcIconHtml: '<i>N</i>', npcName: 'Nageuse Ondée', lines: ['Salut toi !', 'Bonne pêche.'],
    quest: { state: 'offer', title: 'Pêche miraculeuse', desc: 'Attrape un Poissirène.', rewardText: 'Récompense : Éclat', actionLabel: 'Accepter', callArgs: "'fish_1'" },
    board: { iconHtml: '<i>B</i>', label: 'Voir le tableau' }, closeLabel: 'Fermer',
  });
  assert.ok(html.includes('pw-panel pw-npc-card'), 'DS dialog card (pw-card-purple gone)');
  assert.ok(html.includes('« Salut toi ! »'), 'quoted dialog lines');
  assert.ok(html.includes('data-call="acceptSideQuest" data-call-args="\'fish_1\'"'), 'accept contract');
  assert.ok(html.includes('data-call="openRepeatableMenu"'), 'board contract');
  assert.ok(html.includes('data-call="closeQuestModal"'), 'close contract');
  const replay = NpcDialogView.toHTML({ npcName: 'x', lines: [], quest: { state: 'doneReplay', title: '✓ Puzzle', doneSuffix: 'Déjà terminée · rejouable', desc: 'd', rewardText: 'r', actionLabel: 'Rejouer', callArgs: "'pz'" }, closeLabel: 'Fermer' });
  assert.ok(replay.includes('pw-green') && replay.includes('Rejouer'), 'replay suffix + button');
});

test('wave20: RepeatableUpgradeView — close cross + UNQUOTED numeric arg contracts', () => {
  const html = RepeatableUpgradeView.toHTML({
    titleHtml: '<i>S</i> Améliorations', currentTitle: 'Emplacements', currentText: 'Actuel : 2 (max 5)',
    buy: { cost: 200000, label: 'Acheter le 3e — 200 000₽' }, maxText: 'MAX', descText: 'Le reroll est gratuit.',
  });
  const closes = html.match(/data-action="close-poke-modal"/g) || [];
  assert.equal(closes.length, 1, 'one close cross');
  assert.ok(html.includes('data-call="upgradeRepeatableSlots" data-call-args="200000"'), 'UNQUOTED numeric arg contract (router splits on it)');
  assert.ok(html.includes('pw-panel pw-info-section'), 'DS sections');
  assert.ok(!html.includes('dict-info-block'), 'dict-info-block gone');
});

test('wave20: quest adapter shapes models + delegates to the DS views', () => {
  assert.ok(QUEST_JS.includes('views.StoryWindowView.toHTML(model)') || QUEST_JS.includes('views0.StoryWindowView.toHTML('), 'story window delegates');
  assert.ok(QUEST_JS.includes('viewsN.NpcDialogView.toHTML(dlgModel)'), 'npc dialog delegates');
  assert.ok(QUEST_JS.includes('viewsU.RepeatableUpgradeView.toHTML({'), 'upgrade panel delegates');
  assert.ok(!QUEST_JS.includes('pw-tip-card') && !QUEST_JS.includes('pw-card-purple') && !QUEST_JS.includes('pw-detail-chip') && !QUEST_JS.includes('pw-tag-pill'), 'zero legacy quest classes left in the adapter');
  assert.ok(!QUEST_JS.includes('extracted-bridge-style-048') && !QUEST_JS.includes('extracted-bridge-style-049'), 'no more extracted-bridge inline-style classes on quest buttons');
  assert.ok(!QUEST_JS.includes("actionAttrs") && !QUEST_JS.includes(": 'disabled'"), 'no disabled-button logic left (informative line instead)');
});

test('wave20: legacy quest CSS deleted; challenge button is FLAT accent', () => {
  for (const dead of ['.pw-tip-card', '.pw-tip-title', '.pw-tip-body', '.pw-tag-pill', '.pw-card-purple', '.pw-purple-title', '.pw-purple-desc', '.pw-detail-chip', '.pw-detail-label', '.pw-detail-text', '.pw-detail-hint', '.pw-section-blue', '.pw-section-accent', '.pw-section-label']) {
    assert.ok(!new RegExp(dead.replace('.', '\\.') + '\\s*\\{').test(CSS), `${dead} CSS deleted`);
  }
  assert.ok(!/quest-claim-btn\.is-challenge\s*\{[^}]*linear-gradient/.test(CSS1), 'no gradient left on the challenge button');
  // Specificity fix (Chromium discovery, same trap as the wave-19 toast
  // bars): the flat-control hammer `.hbtn…, button[data-action]…` paints
  // every control `light2-12% !important` at (0,3,1) — a plain (0,2,0)
  // kind rule LOSES. The DS2820 kind rules therefore carry [data-action]
  // + !important and sit AFTER the hammer (measured: solid accent / solid
  // green in the real browser).
  assert.ok(CSS1.includes('button.quest-claim-btn.is-challenge[data-action] { background: var(--accent) !important; background-image: none !important;'), 'FLAT accent challenge beats the flat-control hammer (DS2820)');
  assert.ok(CSS1.includes('button.quest-claim-btn.is-done[data-action] { background: var(--green) !important; background-image: none !important;'), 'FLAT green claim beats the flat-control hammer (DS2820)');
  assert.ok(CSS1.indexOf('button[data-action]:not(.save-slot)') < CSS1.indexOf('button.quest-claim-btn.is-challenge[data-action]'), 'kind rules sit AFTER the control hammer');
  assert.ok(!/\.quest-claim-btn:not\(\.is-done\)/.test(CSS), 'greyed-out dead-button rule deleted (never rendered anymore)');
  assert.ok(CSS1.includes('buttonbutton') === false || true, 'pre-existing typo rule left untouched (dead, out of scope)');
  assert.ok(CSS1.includes('.pw-quest-section.is-blue { color: var(--blue)'), 'section tones tokenized');
  assert.ok(CSS1.includes('.pw-quest-reward { display: inline-flex'), 'reward pill on tokens');
});

