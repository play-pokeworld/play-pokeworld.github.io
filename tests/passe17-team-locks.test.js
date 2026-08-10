import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { pokeFullCardHTML } from '../src/ui/components/poke-full-card.js';
import { moveButtonsBarHTML } from '../src/ui/components/move-buttons.js';
import { harnessIsEsm, harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Phase 17 — battle locks (Pokémon/move/item order) + drag & drop
// and click-swap of equipped moves ───────────────────────────────────────────
const TEAM = fs.readFileSync(new URL('../src/application/world/team.js', import.meta.url), 'utf8');
const TEAM_UI = fs.readFileSync(new URL('../src/ui/game/team-ui.js', import.meta.url), 'utf8');
const MOVE_LEARNING = fs.readFileSync(new URL('../src/ui/game/move-learning.js', import.meta.url), 'utf8');
const BATTLE_TEAM_UI = fs.readFileSync(new URL('../src/ui/game/battle-team-ui.js', import.meta.url), 'utf8');
const FR = fs.readFileSync(new URL('../src/localization/fr/ui.js', import.meta.url), 'utf8');
const EN = fs.readFileSync(new URL('../src/localization/en/ui.js', import.meta.url), 'utf8');
const CSS = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');

function makeSandbox(battleActive = false) {
  const G = {
    team: [
      { id: 25, name: 'Pika', uid: 'a', level: 20, currentHP: 40, maxHP: 40, heldItem: null, moves: [{ id: 'tackle' }, { id: 'watergun' }, { id: 'rockthrow' }, { id: 'quickattack' }] },
      { id: 4, name: 'Sala', uid: 'b', level: 20, currentHP: 40, maxHP: 40, heldItem: null, moves: [{ id: 'tackle' }] },
    ],
    teamSlotItems: [null, null],
    collection: {},
    hatchery: [],
    inventory: {},
  };
  const logs = [];
  const sandbox = {
    console, window: {}, G,
    battle: { active: battleActive },
    t: (k) => k, tr: (k) => k, getMoveName: (id) => 'NAME_' + id,
    notify: (msg) => logs.push(msg),
    saveGame: () => {}, renderTeamWindow: () => {}, openPokeModal: () => {},
    _logs: logs,
  };
  sandbox.window = sandbox;
  sandbox.PokeUI = sandbox.PokeUI || {}; sandbox.PokeUI.components = Object.assign({}, sandbox.PokeUI.components, { pokeFullCardHTML, moveButtonsBarHTML });
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle : classique = texte vm direct ;
  // converti ESM (move-learning, vague 41) = bundle isolé, globales via shim.
  for (const [label, src] of [
    ['src/application/world/team.js', TEAM],
    ['src/ui/game/move-learning.js', MOVE_LEARNING],
  ]) {
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([label]) : src, sandbox, { filename: label });
  }
  return sandbox;
}

test('locks: isTeamStructureLocked / notifyTeamStructureLocked helpers defined + exported', () => {
  assert.ok(/function isTeamStructureLocked\(/.test(TEAM), 'isTeamStructureLocked defined');
  assert.ok(/function notifyTeamStructureLocked\(/.test(TEAM), 'notify defined');
  assert.ok(TEAM.includes('window.isTeamStructureLocked = isTeamStructureLocked'), 'export lock');
  // Locked sites: items + Pokémon order
  assert.ok(TEAM.includes('function equipItemOn(teamIdx, key){\n if(typeof isTeamStructureLocked'), 'equipItemOn locked');
  assert.ok(TEAM.includes('function unequipItem(teamIdx){\n if(typeof isTeamStructureLocked'), 'unequipItem locked');
  for (const fn of ['openItemSelector', 'equipItemDirect', 'removeItemFromPokemon', 'unequipItemFromPokemon']) {
    // guard in the first 3 lines of the body (tolerates a comment)
    const m = TEAM_UI.match(new RegExp(`function ${fn}\\([^)]*\\)\\{\\n(?:[^\\n]*\\n){0,2}[^\\n]*isTeamStructureLocked`));
    assert.ok(m, `${fn} locked`);
  }
  assert.ok(TEAM_UI.includes('function teamDrop(ev, targetIdx) {\n  ev.preventDefault();\n  // Phase 17'), 'teamDrop locked');
  assert.ok(TEAM_UI.includes("ev.target.closest('.poke-move')) return;"), 'card drag yields priority to move drag');
});

test('swapTeamMoves: swap out of battle, refusal during battle', () => {
  let sb = makeSandbox(false);
  assert.equal(sb.swapTeamMoves(0, 0, 2), true, 'swap accepted out of battle');
  const moves = [...sb.G.team[0].moves.map((m) => m.id)];
  assert.deepEqual(moves, ['rockthrow', 'watergun', 'tackle', 'quickattack'], 'positions swapped');
  assert.ok(sb._logs.some((m) => String(m).includes('moves_swapped')), 'swap notification');

  sb = makeSandbox(true); // battle in progress
  assert.equal(sb.swapTeamMoves(0, 0, 2), false, 'swap refused in battle');
  assert.deepEqual([...sb.G.team[0].moves.map((m) => m.id)], ['tackle', 'watergun', 'rockthrow', 'quickattack'], 'order unchanged');
  assert.ok(sb._logs.some((m) => String(m).includes('action_blocked_in_battle')), 'notification verrou combat');
});

test('replace mode: clicking a 2nd equipped move swaps the positions', () => {
  const sb = makeSandbox(false);
  sb.toggleMoveSelect(0, 1); // selects move #1 (replacement mode)
  assert.equal(sb.moveReplaceSlot, 1, 'slot 1 selected');
  sb.toggleMoveSelect(0, 3); // click on another equipped move → swap
  assert.deepEqual([...sb.G.team[0].moves.map((m) => m.id)], ['tackle', 'quickattack', 'rockthrow', 'watergun'], 'moves 1 and 3 swapped');
  assert.equal(sb.moveReplaceSlot, null, 'replacement mode exited after swap');
  // Re-clicking the same move = simple deselect (no swap)
  sb.toggleMoveSelect(0, 0);
  assert.equal(sb.moveReplaceSlot, 0);
  sb.toggleMoveSelect(0, 0);
  assert.equal(sb.moveReplaceSlot, 0 === 0 ? null : undefined, 're-click = deselect');
});

test('moves locked during battle (toggleMoveSelect / learnMove / forgetMove)', () => {
  const sb = makeSandbox(true);
  sb.toggleMoveSelect(0, 1);
  assert.equal(sb.moveReplaceSlot, null, 'no selection in battle');
  sb.learnMove(0, 'newmove');
  sb.forgetMove(0, 0);
  assert.equal(sb.G.team[0].moves.length, 4, 'no modification during battle');
});

test('box: swap on 2nd click on the PC side too', () => {
  const sb = makeSandbox(false);
  sb.G.collection['box_1'] = { id: 7, name: 'Cara', uid: 'c', moves: [{ id: 'tackle' }, { id: 'watergun' }, { id: 'rockthrow' }] };
  sb.toggleBoxMoveSelect('box_1', 0);
  assert.equal(sb.window.boxMoveReplaceSlot, 0, 'box slot selected');
  sb.toggleBoxMoveSelect('box_1', 2);
  assert.deepEqual([...sb.G.collection['box_1'].moves.map((m) => m.id)], ['rockthrow', 'watergun', 'tackle'], 'box swap done');
  assert.equal(sb.window.boxMoveReplaceSlot, null, 'box slot reset');
});

test('Party drag & drop: generated draggable attributes + delegated install + CSS', () => {
  assert.ok(BATTLE_TEAM_UI.includes('movesDraggable = false'), 'option movesDraggable');
  assert.ok(BATTLE_TEAM_UI.includes("data-move-drag"), 'attributs data-move-drag (DS PokeFullCard)');
  assert.ok(TEAM_UI.includes('movesDraggable: !(typeof isTeamStructureLocked'), 'cards not draggable in battle');
  assert.ok(/function installMoveDragDrop\(\)/.test(TEAM_UI), 'installMoveDragDrop defined');
  assert.ok(TEAM_UI.includes('window.installMoveDragDrop = installMoveDragDrop'), 'exported');
  // Phase 50: the drop goes through _pwDragSwapMoves, which delegates to swapTeamMoves
  // for the active team and to the declared context for presets / NPC / Atoll
  // (a SINGLE drag & drop mechanism in the whole game).
  assert.ok(TEAM_UI.includes('_pwDragSwapMoves(_pwMoveDrag.teamIdx'), 'the drop delegates to the context');
  assert.ok(TEAM_UI.includes('if (typeof swapTeamMoves === \'function\') return swapTeamMoves(pi, a, b);'),
    'active team: always swapTeamMoves');
  assert.ok(TEAM_UI.includes('function pwSetMoveDragContext'), 'shared context exposed');
  assert.ok(TEAM_UI.includes('installMoveDragDrop();'), 'installed from renderTeamWindow');
  assert.ok(CSS.includes('.poke-move.pw-move-drop-hover'), 'drag styles present');
  // effective HTML generation
  const sandbox = {
    console, window: {},
    G: { team: [], collection: {}, inventory: {}, teamSlotItems: [] },
    battle: { active: false, pMoveIdx: 0, pCdMax: 0, pCd: 0, eMoveIdx: 0, eCdMax: 0, eCd: 0, playerMods: null, enemyMods: null },
    ITEMS: {}, MOVES: { tackle: { type: 'Normal', power: 40, cat: 'physique' }, watergun: { type: 'Eau', power: 40, cat: 'spéciale' } },
    TYPE_COLORS: { Normal: '#888', Eau: '#36c' },
    t: (k) => k, tr: (k) => k, getMoveName: (id) => id, getPokeName: (id) => 'P' + id,
    spriteImg: () => '', itemSpriteHtml: () => '', typeEff: () => 1,
    legacyClickAttributes: () => '', legacyContextAttributes: () => '',
    xpForLevel: () => 100, getHeldBuff: () => ({ atk: 0, def: 0, spe: 0, hpMax: 0, spa: 0, spd: 0 }),
    battleMoveEffBadgeHtml: () => '', statusLabel: (x) => x,
    getActivePlayerPoke: () => null, getHeldItemForPokemon: () => null,
  };
  sandbox.window = sandbox;
  sandbox.PokeUI = sandbox.PokeUI || {}; sandbox.PokeUI.components = Object.assign({}, sandbox.PokeUI.components, { pokeFullCardHTML, moveButtonsBarHTML });
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext('var _pwSetHtmlSafe=function(el,h){el.innerHTML=h;};', sandbox);
  vm.runInContext('var TYPE_COLORS = {"Normal":"#888","Eau":"#36c"};', sandbox);
  sandbox.TYPE_COLORS = { Normal: '#888', Eau: '#36c' }; // compat selon binding
  // Vague 41 — hybride individuelle (battle-team-ui ESM = bundle isolé).
  vm.runInContext(
    harnessIsEsm(BATTLE_TEAM_UI) ? harnessBundleSource(['src/ui/game/battle-team-ui.js']) : BATTLE_TEAM_UI,
    sandbox,
    { filename: 'battle-team-ui.js' }
  );
  const p = { id: 25, name: 'Pika', level: 20, currentHP: 40, maxHP: 40, xp: 0, xpNext: 100, heldItem: null, moves: [{ id: 'tackle' }, { id: 'watergun' }] };
  const html = sandbox.generatePokeCardHTML(p, 2, { movesDraggable: true, showMoves: true, movesAsBars: false });
  assert.ok(html.includes('data-move-drag="2|0"'), 'move 0 draggable with teamIdx');
  assert.ok(html.includes('data-move-drag="2|1"'), 'move 1 draggable with teamIdx');
  const htmlLocked = sandbox.generatePokeCardHTML(p, 2, { movesDraggable: false, showMoves: true, movesAsBars: false });
  assert.ok(!htmlLocked.includes('data-move-drag'), 'no drag when locked');
});

test('i18n: moves_swapped key present in fr and en', () => {
  assert.ok(FR.includes('"moves_swapped"'), 'fr');
  assert.ok(EN.includes('"moves_swapped"'), 'en');
});

