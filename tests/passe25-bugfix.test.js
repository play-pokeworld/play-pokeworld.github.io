import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { pokeFullCardHTML } from '../src/ui/components/poke-full-card.js';
import { moveButtonsBarHTML } from '../src/ui/components/move-buttons.js';
import { AtollPanelView } from '../src/ui/views/AtollPanelView.js'; // wave 13: real DS view injected into the vm sandbox
import { AtollFactoryPrepView } from '../src/ui/views/AtollFactoryPrepView.js'; // wave 22: real DS view injected into the vm sandbox
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

// ── Passe 25: fixes for the 3 user reports ──────────────────────
//  #1 broken "hidden ability" button description (i18n keys
//     training_mode_hidden_desc/_done missing → raw label shown)
//  #2 item sheet opened from the EQUIPMENT selector: the back
//     button returned to the global bag instead of the item choice
//  #3 Factory (atoll): the pre-battle reorganization becomes a cloned panel
//     of the "Active Team" window (drag & drop, read-only:
//     no item / ability / moveset changes)
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const notifications = [];
  const sandbox = {
    console, window: {},
    document: { getElementById: () => null, querySelectorAll: () => [] },
    G: {
      team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {},
      unlockedTalents: {}, lang: 'fr', badges: [], defeatedChamps: {},
    },
    battle: { eMoveIdx: 0, pMoveIdx: 0, eCd: 0, pCd: 0, eCdMax: 0, pCdMax: 0, enemyPoke: null, playerMods: null, enemyMods: null },
    TYPE_COLORS: {},
    spriteImg: () => '<span class="sprite-stub"></span>',
    getHeldBuff: () => ({}),
    rand: (a, b) => a, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: (msg, color) => notifications.push(String(msg)),
    saveGame: () => {}, setMsg: () => {}, addBattleLog: () => {}, updateHeader: () => {},
    renderTeamWindow: () => {}, renderTrainingBattlePanel: () => {}, renderTrainingWindow: () => {},
    addStaffXp: () => {},
    _notifications: notifications,
  };
  sandbox.window = sandbox;
  sandbox.PokeUI = sandbox.PokeUI || {}; sandbox.PokeUI.components = Object.assign({}, sandbox.PokeUI.components, { pokeFullCardHTML, moveButtonsBarHTML });
  sandbox.PokeUI.views = Object.assign({}, sandbox.PokeUI.views, { AtollPanelView, AtollFactoryPrepView }); // wave 13 + wave 22 (legitimate moves)
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js',
    'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/talents-full.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/application/pokemon-factory.js',
    'src/data/atoll-sets-data.js', 'src/application/world/atoll-core.js',
    'src/localization/fr/types.js', 'src/localization/en/types.js',
    'src/localization/fr/talents.js', 'src/localization/en/talents.js',
    'src/localization/fr/move-descs.js',
    'src/localization/fr/ui.js', 'src/localization/en/ui.js',
    'src/ui/game/badge-helper.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/application/combat/training.js',
    'src/ui/game/battle-team-ui.js',
    'src/ui/game/team-manage.js',
    'src/ui/game/team-ui.js',
    'src/ui/game/fullscreen-panel.js',
  ]) {
    // T2-D (vague 37) : classiques évalués en vm directe (parité exacte,
    // const inter-fichiers préservés) ; les converts ESM sont bundlés à la volée.
    const __text = R(f);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
  }
  return sandbox;
}
const sb = makeSandbox();
const join = (a) => Array.from(a).join(',');

// Dummy mini-DOM to exercise the preparation panel in vm.
function makeFakeEl() {
  const classes = new Set();
  return {
    innerHTML: '', scrollTop: 0, style: {}, dataset: {},
    classList: {
      add(...a) { a.forEach((x) => classes.add(x)); },
      remove(...a) { a.forEach((x) => classes.delete(x)); },
      toggle(c, force) { if (force) classes.add(c); else classes.delete(c); },
      contains(c) { return classes.has(c); },
    },
    setAttribute() {}, addEventListener() {},
    querySelectorAll() { return []; },
  };
}

// ————————————————————————— #1 —————————————————————————
test('phase 25 #1: the "hidden ability" mode description is translated', () => {
  assert.equal(sb.t('training_mode_hidden_title'), 'Déblocage Talent Caché', 'FR title');
  assert.equal(sb.t('training_mode_hidden_desc'), 'Tente de débloquer le talent caché de ce Pokémon.', 'FR desc (no more raw key)');
  assert.equal(sb.t('training_mode_hidden_done'), 'Talent caché déjà débloqué.', 'FR "done" state');
  // The label actually used by the training buttons ('hidden' mode)
  assert.equal(sb.getTrainingModeLabel('hidden'), 'Déblocage Talent Caché', 'button label');
  assert.equal(sb.getTrainingModeDescription('hidden', true), 'Tente de débloquer le talent caché de ce Pokémon.', 'button description (canDo)');
  assert.equal(sb.getTrainingModeDescription('hidden', false), 'Talent caché déjà débloqué.', 'button description (done)');
  assert.ok(!String(sb.getTrainingModeDescription('hidden', true)).includes('training_mode_'), 'no more raw i18n key displayed');
  // English covered too
  assert.ok(R('src/localization/en/ui.js').includes('"training_mode_hidden_desc":"Attempts to unlock'), 'EN desc present');
  assert.ok(R('src/localization/en/ui.js').includes('"training_mode_hidden_done":"Hidden ability already unlocked."'), 'EN done present');
});

// ————————————————————————— #2 —————————————————————————
test('phase 25 #2: the item sheet opened from equipment returns there', () => {
  // Wrapper called by right-clicking the equipment selector rows.
  sb.openItemInfoFromEquip('leftovers', 2);
  assert.deepEqual(
    { kind: sb.window._pwInfoSource.kind, teamIdx: sb.window._pwInfoSource.teamIdx },
    { kind: 'equip-select', teamIdx: 2 },
    'the memorized return source is the equipment selector',
  );
  // The rendered selector does invoke this wrapper (right-click) with the aimed slot.
  const srcTeamUi = R('src/ui/game/team-ui.js');
  assert.ok(srcTeamUi.includes('data-context-call="openItemInfoFromEquip" data-context-args="\'${key}\', ${teamIdx}"'),
    'selector rows: right-click → wrapper with teamIdx');
  // The back navigation knows this kind: it reopens openItemSelector.
  const preflight = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
  assert.ok(preflight.includes("src.kind === 'equip-select'"), 'pwInfoBack/Label handle kind equip-select');
  assert.ok(preflight.includes("callGlobal('openItemSelector', src.teamIdx)"), 'back → equipment selector reopens');
  assert.ok(preflight.includes("key = 'back_to_equip_selector'"), 'dedicated back label');
  assert.ok(preflight.includes('window._pwEquipInfoFrom != null'), 'capture: selector hint read during construction (exact label)');
  assert.equal(sb.t('back_to_equip_selector'), "← Retour au choix d'objet", 'FR label');
});

// ————————————————————————— #3 —————————————————————————
test('phase 25 #3: the Factory preparation panel clones the Active Team', () => {
  sb.G.championTitle = true; // atoll accessible
  sb.G.atoll = null;
  sb.prepareAtollFactoryBattle('factory_c');
  const run = sb.getAtollFactoryRun();
  assert.ok(run && Array.isArray(run.team) && run.team.length > 1, 'Factory streak created');

  // Mini-DOM: the panel render produces the SAME cards as the Active Team.
  const realDoc = sb.document;
  const els = { 'poke-modal': makeFakeEl(), 'poke-modal-inner': makeFakeEl() };
  sb.document = { getElementById: (id) => els[id] || null, querySelectorAll: () => [] };
  try {
    assert.equal(sb.renderAtollFactoryPrep(), true, 'panel rendered');
    const html = els['poke-modal-inner'].innerHTML;
    assert.ok(html.includes('poke-card'), 'Pokémon cards identical to the Active Team');
    assert.ok(html.includes('id="atoll-prep-body" class="team-view"'), '.team-view container (Team look)');
    assert.ok(html.includes('data-atoll-move-drag='), 'moves reorderable by drag & drop');
    assert.ok(!html.includes('data-move-drag="'), 'no move drag bound to G.team');
    assert.ok(!html.includes('data-call="switchBattlePoke"'), 'no battle switch on the sprite');
    assert.ok(!html.includes('data-call="openPokeModal"'), 'no editable sheet (ability/moveset/item frozen)');
    assert.ok(!html.includes('data-call="openItemSelector"'), 'no item change');
    assert.ok(!html.includes('poke-item-badge empty'), 'no equipment "+" badge');
    assert.ok(html.includes('data-call="atollFactoryPrepFight"'), 'Battle button');
    assert.ok(html.includes('data-call="atollFactoryPrepAbandon"'), 'Forfeit button');
    assert.ok(html.includes('data-context-call="openMoveInfo"'), 'move info always available (right-click)');
    assert.ok(!html.includes("',-1\""), 'context-less move sheet "closes and forgets": back returns to preparation');

    sb.openAtollFactoryPrep();
    assert.ok(els['poke-modal'].classList.contains('open'), 'panel opened');
    assert.ok(els['poke-modal'].classList.contains('atoll-prep-modal'), 'dedicated width class');
    assert.equal(sb.window._atollPrepOpen, true, '"info panel" source armed for sheets');
    sb.closeAtollFactoryPrep();
    assert.equal(sb.window._atollPrepOpen, false, 'close: flag purged');
    assert.ok(!els['poke-modal'].classList.contains('open'), 'close: modal closed again');
  } finally {
    sb.document = realDoc;
  }

  // Reorganization by swaps (what drag & drop invokes).
  const orderBefore = join(run.team.map((p) => p.id));
  const last = run.team.length - 1;
  sb.atollFactorySwapPoke(0, last);
  const after = run.team.map((p) => p.id);
  assert.notEqual(join(after), orderBefore, 'ends swap: order changed');
  sb.atollFactorySwapPoke(last, 0);
  assert.equal(join(run.team.map((p) => p.id)), orderBefore, 'reverse swap: order restored');
  sb.atollFactorySwapPoke(0, 0); // identity: no-op
  assert.equal(join(run.team.map((p) => p.id)), orderBefore, 'identity swap ignored');

  // Without a streak: openings close cleanly, without crash.
  sb.G.atoll = null;
  assert.equal(sb.getAtollFactoryRun(), null);
  assert.doesNotThrow(() => sb.openAtollFactoryPrep(), 'opening without a streak: no crash');
});

test('phase 25 #3: back navigation and i18n of the preparation panel', () => {
  const preflight = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
  assert.ok(preflight.includes("return { kind: 'atoll-prep' };"), 'source capture: preparation panel detected');
  assert.ok(preflight.includes("src.kind === 'atoll-prep'"), 'pwInfoBack/Label handle kind atoll-prep');
  assert.ok(preflight.includes("callGlobal('openAtollFactoryPrep')"), 'back → preparation reopens');
  assert.ok(preflight.includes("key = 'back_to_atoll_prep'"), 'dedicated back label');
  assert.ok(preflight.includes('window._atollPrepOpen = false'), 'generic closes: flag purged');
  assert.ok([R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n').includes('window._atollPrepOpen = false'), 'postboot : purge aussi');
  const fsSrc = R('src/ui/game/fullscreen-panel.js');
  assert.ok(!fsSrc.includes('atollFactoryMovePoke'), 'old arrow editor removed');
  assert.ok(fsSrc.includes('window._atollPrepOpen = false'), 'openFullscreenPanel purges the preparation');
  assert.ok(fsSrc.includes('openAtollFactoryPrep();'), 'prepareAtollFactoryBattle opens the panel');
  const cardSrc = R('src/ui/game/battle-team-ui.js');
  assert.ok(cardSrc.includes('noSpriteHandlers') && cardSrc.includes('itemReadonly') && cardSrc.includes("data-' + moveDragAttr"),
    'generatePokeCardHTML: readonly options + alternate drag attribute');
  assert.equal(sb.t('atoll_factory_prep_open'), "⚙ Organiser l'équipe prêtée", 'FR access button');
  assert.equal(sb.t('back_to_atoll_prep'), '← Retour à la préparation', 'FR back label');
});


