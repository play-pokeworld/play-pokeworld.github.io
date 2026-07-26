import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 17 — verrous combat (ordre Pokémon/attaques/objets) + drag & drop
// et clic-swap des attaques équipées ────────────────────────────────────────
const TEAM = fs.readFileSync(new URL('../src/game/world/team.js', import.meta.url), 'utf8');
const TEAM_UI = fs.readFileSync(new URL('../src/game/display/team-ui.js', import.meta.url), 'utf8');
const MOVE_LEARNING = fs.readFileSync(new URL('../src/game/combat/move-learning.js', import.meta.url), 'utf8');
const BATTLE_TEAM_UI = fs.readFileSync(new URL('../src/game/combat/battle-team-ui.js', import.meta.url), 'utf8');
const FR = fs.readFileSync(new URL('../src/localization/fr/ui.js', import.meta.url), 'utf8');
const EN = fs.readFileSync(new URL('../src/localization/en/ui.js', import.meta.url), 'utf8');
const CSS = fs.readFileSync(new URL('../src/assets/styles/cleaned-components.css', import.meta.url), 'utf8');

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
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(TEAM, sandbox, { filename: 'team.js' });
  vm.runInContext(MOVE_LEARNING, sandbox, { filename: 'move-learning.js' });
  return sandbox;
}

test('verrous : helpers isTeamStructureLocked / notifyTeamStructureLocked définis + exportés', () => {
  assert.ok(/function isTeamStructureLocked\(/.test(TEAM), 'isTeamStructureLocked défini');
  assert.ok(/function notifyTeamStructureLocked\(/.test(TEAM), 'notify défini');
  assert.ok(TEAM.includes('window.isTeamStructureLocked = isTeamStructureLocked'), 'export lock');
  // Sites verrouillés : objets + ordre Pokémon
  assert.ok(TEAM.includes('function equipItemOn(teamIdx, key){\n if(typeof isTeamStructureLocked'), 'equipItemOn verrouillé');
  assert.ok(TEAM.includes('function unequipItem(teamIdx){\n if(typeof isTeamStructureLocked'), 'unequipItem verrouillé');
  for (const fn of ['openItemSelector', 'equipItemDirect', 'removeItemFromPokemon', 'unequipItemFromPokemon']) {
    // guard dans les 3 premières lignes du corps (tolère un commentaire)
    const m = TEAM_UI.match(new RegExp(`function ${fn}\\([^)]*\\)\\{\\n(?:[^\\n]*\\n){0,2}[^\\n]*isTeamStructureLocked`));
    assert.ok(m, `${fn} verrouillé`);
  }
  assert.ok(TEAM_UI.includes('function teamDrop(ev, targetIdx) {\n  ev.preventDefault();\n  // Passe 17'), 'teamDrop verrouillé');
  assert.ok(TEAM_UI.includes("ev.target.closest('.poke-move')) return;"), 'le drag carte cède la priorité au drag attaque');
});

test('swapTeamMoves : échange hors combat, refus pendant un combat', () => {
  let sb = makeSandbox(false);
  assert.equal(sb.swapTeamMoves(0, 0, 2), true, 'swap accepté hors combat');
  const moves = [...sb.G.team[0].moves.map((m) => m.id)];
  assert.deepEqual(moves, ['rockthrow', 'watergun', 'tackle', 'quickattack'], 'positions échangées');
  assert.ok(sb._logs.some((m) => String(m).includes('moves_swapped')), 'notification échange');

  sb = makeSandbox(true); // combat en cours
  assert.equal(sb.swapTeamMoves(0, 0, 2), false, 'swap refusé en combat');
  assert.deepEqual([...sb.G.team[0].moves.map((m) => m.id)], ['tackle', 'watergun', 'rockthrow', 'quickattack'], 'ordre inchangé');
  assert.ok(sb._logs.some((m) => String(m).includes('action_blocked_in_battle')), 'notification verrou combat');
});

test('mode remplacement : clic sur une 2e attaque équipée échange les positions', () => {
  const sb = makeSandbox(false);
  sb.toggleMoveSelect(0, 1); // sélectionne l'attaque #1 (mode remplacement)
  assert.equal(sb.moveReplaceSlot, 1, 'slot 1 sélectionné');
  sb.toggleMoveSelect(0, 3); // clic sur une autre attaque équipée → swap
  assert.deepEqual([...sb.G.team[0].moves.map((m) => m.id)], ['tackle', 'quickattack', 'rockthrow', 'watergun'], 'attaques 1 et 3 échangées');
  assert.equal(sb.moveReplaceSlot, null, 'mode remplacement quitté après échange');
  // Re-cliquer la même attaque = désélection simple (pas de swap)
  sb.toggleMoveSelect(0, 0);
  assert.equal(sb.moveReplaceSlot, 0);
  sb.toggleMoveSelect(0, 0);
  assert.equal(sb.moveReplaceSlot, 0 === 0 ? null : undefined, 're-clic = désélection');
});

test('attaques verrouillées pendant un combat (toggleMoveSelect / learnMove / forgetMove)', () => {
  const sb = makeSandbox(true);
  sb.toggleMoveSelect(0, 1);
  assert.equal(sb.moveReplaceSlot, null, 'pas de sélection en combat');
  sb.learnMove(0, 'newmove');
  sb.forgetMove(0, 0);
  assert.equal(sb.G.team[0].moves.length, 4, 'aucune modification en combat');
});

test('box : swap au 2e clic aussi côté PC', () => {
  const sb = makeSandbox(false);
  sb.G.collection['box_1'] = { id: 7, name: 'Cara', uid: 'c', moves: [{ id: 'tackle' }, { id: 'watergun' }, { id: 'rockthrow' }] };
  sb.toggleBoxMoveSelect('box_1', 0);
  assert.equal(sb.window.boxMoveReplaceSlot, 0, 'slot box sélectionné');
  sb.toggleBoxMoveSelect('box_1', 2);
  assert.deepEqual([...sb.G.collection['box_1'].moves.map((m) => m.id)], ['rockthrow', 'watergun', 'tackle'], 'swap box effectué');
  assert.equal(sb.window.boxMoveReplaceSlot, null, 'slot box réinitialisé');
});

test('drag & drop Party : attributs draggable générés + installation déléguée + CSS', () => {
  assert.ok(BATTLE_TEAM_UI.includes('movesDraggable = false'), 'option movesDraggable');
  assert.ok(BATTLE_TEAM_UI.includes("' draggable=\"true\" data-move-drag=\"' + i + '|' + mi + '\""), 'attributs data-move-drag');
  assert.ok(TEAM_UI.includes('movesDraggable: !(typeof isTeamStructureLocked'), 'cards non draggables en combat');
  assert.ok(/function installMoveDragDrop\(\)/.test(TEAM_UI), 'installMoveDragDrop défini');
  assert.ok(TEAM_UI.includes('window.installMoveDragDrop = installMoveDragDrop'), 'exporté');
  assert.ok(TEAM_UI.includes("swapTeamMoves(_pwMoveDrag.teamIdx"), 'le drop délègue à swapTeamMoves');
  assert.ok(TEAM_UI.includes('installMoveDragDrop();'), 'installé depuis renderTeamWindow');
  assert.ok(CSS.includes('.poke-move.pw-move-drop-hover'), 'styles drag présents');
  // génération HTML effective
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
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext('var _pwSetHtmlSafe=function(el,h){el.innerHTML=h;};', sandbox);
  vm.runInContext('var TYPE_COLORS = {"Normal":"#888","Eau":"#36c"};', sandbox);
  sandbox.TYPE_COLORS = { Normal: '#888', Eau: '#36c' }; // compat selon binding
  vm.runInContext(BATTLE_TEAM_UI, sandbox, { filename: 'battle-team-ui.js' });
  const p = { id: 25, name: 'Pika', level: 20, currentHP: 40, maxHP: 40, xp: 0, xpNext: 100, heldItem: null, moves: [{ id: 'tackle' }, { id: 'watergun' }] };
  const html = sandbox.generatePokeCardHTML(p, 2, { movesDraggable: true, showMoves: true, movesAsBars: false });
  assert.ok(html.includes('data-move-drag="2|0"'), 'attaque 0 draggable avec teamIdx');
  assert.ok(html.includes('data-move-drag="2|1"'), 'attaque 1 draggable avec teamIdx');
  const htmlLocked = sandbox.generatePokeCardHTML(p, 2, { movesDraggable: false, showMoves: true, movesAsBars: false });
  assert.ok(!htmlLocked.includes('data-move-drag'), 'pas de drag quand verrouillé');
});

test('i18n : clé moves_swapped présente en fr et en', () => {
  assert.ok(FR.includes('"moves_swapped"'), 'fr');
  assert.ok(EN.includes('"moves_swapped"'), 'en');
});
