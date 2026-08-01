import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 6 : attaques de niveau débloquées / apprentissage en boîte ────────
// Bug remonté : un Pokémon niveau 100 d'une ancienne save n'avait « aucune
// attaque apprenable ». Cause : isMoveTrainingLocked verrouillait TOUTES les
// attaques non connues (sauf dressage/CT) — le niveau n'était jamais pris en
// compte. Et learnBoxMove / toggleBoxMoveSelect (appelés par la fiche box)
// n'existaient pas -> l'apprentissage en boîte était un no-op silencieux.

const TRAINING = fs.readFileSync(new URL('../src/game/combat/training.js', import.meta.url), 'utf8');
const MOVE_LEARNING = fs.readFileSync(new URL('../src/game/combat/move-learning.js', import.meta.url), 'utf8');
const POKE_MODAL = fs.readFileSync(new URL('../src/game/display/poke-modal.js', import.meta.url), 'utf8');

function extractFrom(src, signature) {
  const re = new RegExp('function ' + signature + '\\s*\\{[\\s\\S]*?\\n\\}');
  const m = src.match(re);
  assert.ok(m, `extraction de ${signature} impossible`);
  return m[0];
}

// Pool de niveau simulé : a(niv 1) b(8) c(15) d(99). `a` est connue.
function makeEnv(level, unlocked) {
  const sandbox = {
    console,
    MOVES: { a: { power: 10 }, b: { power: 20 }, c: { power: 30 }, d: { power: 40 } },
    getSpeciesFullLearnablePool: () => ['a', 'b', 'c', 'd'],
    getTrainingLockedMoves: () => ['b', 'c', 'd'],
    getMoveLearnLevel: (nid, id) => ({ b: 8, c: 15, d: 99 })[id] ?? 999,
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  vm.runInContext(
    extractFrom(TRAINING, 'isMoveTrainingLocked\\(p, moveId\\)') + '\n' + extractFrom(MOVE_LEARNING, 'learnableMoves\\(p\\)'),
    sandbox,
    { filename: 'training+move-learning#passe6' }
  );
  const p = { id: 25, level, moves: [{ id: 'a' }], trainingUnlockedMoves: unlocked || [] };
  return { sandbox, p };
}

test('niveau 100 : tout le pool de niveau est apprenable', () => {
  const { sandbox, p } = makeEnv(100);
  assert.deepEqual(sandbox.learnableMoves(p), ['b', 'c', 'd']);
});

test('niveau 20 : seules les attaques dont le niveau est atteint sont apprenables', () => {
  const { sandbox, p } = makeEnv(20);
  assert.deepEqual(sandbox.learnableMoves(p), ['b', 'c'], 'd (niv 99) reste verrouillée');
});

test('le dressage/CT débloque au-delà du niveau', () => {
  const { sandbox, p } = makeEnv(20, ['d']);
  assert.deepEqual(sandbox.learnableMoves(p), ['b', 'c', 'd']);
});

test('isMoveTrainingLocked : règle de niveau explicite', () => {
  const { sandbox, p } = makeEnv(50);
  assert.equal(sandbox.isMoveTrainingLocked(p, 'b'), false, 'niv 8 atteint -> débloquée');
  assert.equal(sandbox.isMoveTrainingLocked(p, 'd'), true, 'niv 99 non atteint -> verrouillée');
  p.trainingUnlockedMoves = ['d'];
  assert.equal(sandbox.isMoveTrainingLocked(p, 'd'), false, 'déblocage dressage conservé');
  assert.equal(sandbox.isMoveTrainingLocked(p, 'a'), false, 'attaque connue : pas verrouillée');
});

test('getTrainableLockedMoves exclut les attaques déjà apprenables par niveau', () => {
  assert.ok(/isMoveTrainingLocked\(p, id\)/.test(TRAINING), 'le filtre de dressage doit réutiliser isMoveTrainingLocked');
});

// ── learnBoxMove / toggleBoxMoveSelect (fiche box) ─────────────────────────

function makeBoxEnv() {
  const calls = { notify: [], open: [], save: 0 };
  const sandbox = {
    console,
    calls,
    G: { collection: { b7: { name: 'Carapuce', moves: [{ id: 'a' }] } } },
    window: { boxMoveReplaceSlot: null },
    notify: (msg) => calls.notify.push(msg),
    saveGame: () => calls.save++,
    openBoxPokeModal: (boxId) => calls.open.push(boxId),
    tr: (k, o) => `${k}:${o && o.p1 || ''}`,
    t: (k) => k,
    getMoveName: (id) => id.toUpperCase(),
  };
  sandbox.globalThis = sandbox;
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  vm.runInContext(
    extractFrom(MOVE_LEARNING, 'getBoxPokemon\\(boxId\\)') + '\n'
    + extractFrom(MOVE_LEARNING, 'toggleBoxMoveSelect\\(boxId, moveIdx\\)') + '\n'
    + extractFrom(MOVE_LEARNING, 'learnBoxMove\\(boxId, moveId\\)'),
    sandbox,
    { filename: 'move-learning#box' }
  );
  return sandbox;
}

test('learnBoxMove ajoute une attaque au Pokémon de la boîte', () => {
  const env = makeBoxEnv();
  vm.runInContext('learnBoxMove("b7", "b")', env);
  const p = env.G.collection.b7;
  assert.deepEqual(p.moves.map((m) => m.id), ['a', 'b']);
  assert.equal(env.calls.save, 1, 'sauvegarde déclenchée');
  assert.deepEqual(env.calls.open, ['b7'], 'fiche box rafraîchie');
  assert.equal(env.calls.notify.length, 1);
});

test('learnBoxMove remplace le slot sélectionné via toggleBoxMoveSelect', () => {
  const env = makeBoxEnv();
  env.G.collection.b7.moves = [{ id: 'a' }, { id: 'b' }];
  env.window.boxMoveReplaceSlot = 1;
  vm.runInContext('learnBoxMove("b7", "c")', env);
  assert.deepEqual(env.G.collection.b7.moves.map((m) => m.id), ['a', 'c']);
  assert.equal(env.window.boxMoveReplaceSlot, null, 'slot de remplacement consommé');
});

test('toggleBoxMoveSelect bascule le slot de remplacement', () => {
  const env = makeBoxEnv();
  vm.runInContext('toggleBoxMoveSelect("b7", 0)', env);
  assert.equal(env.window.boxMoveReplaceSlot, 0);
  vm.runInContext('toggleBoxMoveSelect("b7", 0)', env);
  assert.equal(env.window.boxMoveReplaceSlot, null);
});

test('les fonctions box existent et sont exposées (fiche box les appelle via data-call)', () => {
  assert.ok(POKE_MODAL.includes('data-call="learnBoxMove"'), 'la fiche box appelle learnBoxMove');
  assert.ok(POKE_MODAL.includes('data-call="toggleBoxMoveSelect"'), 'la fiche box appelle toggleBoxMoveSelect');
  assert.ok(MOVE_LEARNING.includes('function learnBoxMove'), 'learnBoxMove doit exister (sinon callGlobal no-op silencieux)');
  assert.ok(MOVE_LEARNING.includes('function toggleBoxMoveSelect'), 'toggleBoxMoveSelect doit exister');
  assert.ok(MOVE_LEARNING.includes('window.learnBoxMove = learnBoxMove'), 'learnBoxMove exposé sur window');
  assert.ok(MOVE_LEARNING.includes('window.toggleBoxMoveSelect = toggleBoxMoveSelect'), 'toggleBoxMoveSelect exposé sur window');
});

// ── Passe 7 : rafraîchissement des indicateurs du panneau « attaques apprenables » ──

const BOX_SELECTOR = fs.readFileSync(new URL('../src/game/boxes/box-selector.js', import.meta.url), 'utf8');
const SAVE_JS = fs.readFileSync(new URL('../src/game/save/save.js', import.meta.url), 'utf8');

test('le panneau complet porte un marqueur et résout le Pokémon depuis la fiche rendue', () => {
  assert.ok(POKE_MODAL.includes('data-learnable-panel'), 'marqueur de panneau absent');
  assert.ok(POKE_MODAL.includes('function refreshLearnableMovesPanelIfOpen'), 'helper de rafraîchissement absent');
  assert.ok(POKE_MODAL.includes('window.refreshLearnableMovesPanelIfOpen = refreshLearnableMovesPanelIfOpen'), 'helper non exposé');
  const body = POKE_MODAL.match(/function openLearnableMovesPanel\(idxOrBoxId, opts\) \{[\s\S]*?\n\}/);
  assert.ok(body, 'extraction du panneau impossible');
  const iSheet = body[0].indexOf('_pwPokeSheet');
  const iAmbient = body[0].indexOf('_POKEMODAL_SOURCE');
  assert.ok(iSheet > -1 && iAmbient > -1 && iSheet < iAmbient, 'la fiche rendue (_pwPokeSheet) doit primer sur la source ambiante');
});

test('chaque mutation d\'attaques déclenche le rafraîchissement du panneau', () => {
  const NEEDLE = 'refreshLearnableMovesPanelIfOpen';
  assert.equal((MOVE_LEARNING.match(/window\.refreshLearnableMovesPanelIfOpen\(\);/g) || []).length, 4, 'learnMove(×2)/forgetMove/learnBoxMove doivent rafraîchir');
  assert.ok(TRAINING.includes(NEEDLE), 'unlockTrainingMove doit rafraîchir');
  assert.ok(BOX_SELECTOR.includes(NEEDLE), 'usage d\'une CT/CS doit rafraîchir');
  assert.ok(SAVE_JS.includes(NEEDLE), 'la migration de sauvegarde doit rafraîchir');
});

test('refreshLearnableMovesPanelIfOpen : no-op sans panneau, re-rendu sinon, jamais de réouverture', () => {
  const body = POKE_MODAL.match(/function refreshLearnableMovesPanelIfOpen\(\) \{[\s\S]*?\n\}/);
  assert.ok(body, 'extraction du helper impossible');
  assert.ok(body[0].includes("contains('open')"), 'passe 8 : le helper doit vérifier que le modal est VRAIMENT ouvert (sinon un entraînement rouvre le panneau tout seul)');
  const calls = [];
  const sandbox = {
    console,
    calls,
    openLearnableMovesPanel: (id, opts) => calls.push([id, opts && opts.source]),
    window: { _pwLearnableCtx: { source: 'team', id: 3 } },
    document: { getElementById: () => null },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  vm.runInContext(body[0], sandbox, { filename: 'poke-modal.js#refresh' });
  vm.runInContext('refreshLearnableMovesPanelIfOpen()', sandbox);
  assert.equal(calls.length, 0, 'sans #poke-modal-inner, rien à rafraîchir');
  // Marqueur présent (DOM conservé) MAIS modal fermé -> ne rouvre pas (bug entraînement)
  sandbox.document = {
    getElementById: (id) => {
      if (id === 'poke-modal') return { classList: { contains: () => false } };
      if (id === 'poke-modal-inner') return { querySelector: (sel) => (sel === '[data-learnable-panel]' ? {} : null) };
      return null;
    },
  };
  vm.runInContext('refreshLearnableMovesPanelIfOpen()', sandbox);
  assert.equal(calls.length, 0, 'modal fermé + marqueur résiduel : aucune réouverture');
  // Marqueur présent ET modal ouvert -> re-rendu avec la source mémorisée
  sandbox.document = {
    getElementById: (id) => {
      if (id === 'poke-modal') return { classList: { contains: () => true } };
      if (id === 'poke-modal-inner') return { querySelector: (sel) => (sel === '[data-learnable-panel]' ? {} : null) };
      return null;
    },
  };
  vm.runInContext('refreshLearnableMovesPanelIfOpen()', sandbox);
  assert.deepEqual(calls, [[3, 'team']], 'le panneau ouvert est re-rendu avec id + source mémorisés');
});

// ── Passe 8 : source explicite du panneau « attaques apprenables » ──────────

function makePanelEnv() {
  const INNER = { innerHTML: '' };
  const classSet = new Set(['open']);
  const MODAL = { classList: { add: (c) => classSet.add(c), remove: (c) => classSet.delete(c), contains: (c) => classSet.has(c) } };
  const MOVES = {};
  ['a', 'b', 'c', 'd'].forEach((id, x) => { MOVES[id] = { type: 'normal', power: 40 + x, rarity: 1 }; });
  const sandbox = {
    console,
    _INNER: INNER,
    MOVES,
    G: {
      team: [{ id: 25, name: 'TeamMon', level: 100, moves: [{ id: 'a' }] }],
      collection: { b7: { id: 25, name: 'BoxMon', level: 100, moves: [{ id: 'c' }, { id: 'd' }] } },
    },
    PD: { 25: ['Test', 'normal', ''] },
    getSpeciesFullLearnablePool: () => ['a', 'b', 'c', 'd'],
    getSpeciesMovePool: () => ['a', 'b', 'c', 'd'],
    ITEMS: {},
    TYPE_COLORS: { normal: '#999' },
    t: (k) => k, tr: (k, o) => k, getMoveName: (id) => id.toUpperCase(),
    document: { getElementById: (id) => (id === 'poke-modal-inner' ? INNER : (id === 'poke-modal' ? MODAL : null)) },
    window: { _pwPokeSheet: { kind: 'team', idx: 0 }, typeClass: (tp) => 'type-' + tp, pwModalInfo: () => {} },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  const body = POKE_MODAL.match(/function openLearnableMovesPanel\(idxOrBoxId, opts\) \{[\s\S]*?\n\}/);
  assert.ok(body, 'extraction du panneau impossible');
  vm.runInContext(body[0], sandbox, { filename: 'poke-modal.js#panel8' });
  return sandbox;
}

test('le bouton de la fiche passe la source explicite (\'team\'/\'box\')', () => {
  assert.ok(POKE_MODAL.includes(`'box','\${boxId}'`), 'argument explicite box attendu');
  assert.ok(POKE_MODAL.includes(`'team',\${idx != null ? idx : 0}`), 'argument explicite team attendu');
  // Passe 8 : le bouton est masqué sur les fiches readonly (sinon il ouvrirait team[0])
  assert.ok(/readonly \? '' : `<button class="hbtn poke-detail-full-list-btn"/.test(POKE_MODAL), 'bouton masqué en readonly attendu');
});

test('source explicite \'box\' : résout le Pokémon de la boîte (même avec fiche équipe affichée)', () => {
  const env = makePanelEnv();
  vm.runInContext("openLearnableMovesPanel('box','b7')", env);
  assert.equal(env.window._pwLearnableCtx.source, 'box');
  assert.equal(env.window._pwLearnableCtx.id, 'b7');
  const html = env._INNER.innerHTML;
  assert.equal((html.match(/move-row known/g) || []).length, 2, 'BoxMon a 2 attaques connues cochées');
});

test('source explicite team via opts : prime sur la fiche box affichée', () => {
  const env = makePanelEnv();
  env.window._pwPokeSheet = { kind: 'box', boxId: 'b7' };
  vm.runInContext("openLearnableMovesPanel(0,{source:'team'})", env);
  assert.equal(env.window._pwLearnableCtx.source, 'team');
  const html = env._INNER.innerHTML;
  assert.equal((html.match(/move-row known/g) || []).length, 1, 'TeamMon a 1 attaque connue cochée');
});

test('sans source explicite : la fiche rendue sert de résolution (passe 7 conservée)', () => {
  const env = makePanelEnv();
  env.window._pwPokeSheet = { kind: 'box', boxId: 'b7' };
  vm.runInContext("openLearnableMovesPanel('b7')", env);
  assert.equal(env.window._pwLearnableCtx.source, 'box');
  assert.equal((env._INNER.innerHTML.match(/move-row known/g) || []).length, 2);
});

// ── Passe 9 : « possédée » = équipée OU apprenable maintenant ──────────────

test('les attaques apprenables reçoivent la pilule validée et comptent dans le total possédé', () => {
  const env = makePanelEnv();
  // TeamMon connaît 'a' ; le niveau/dressage a aussi débloqué 'b'
  vm.runInContext('var learnableMoves = function(p){ return ["b"]; };', env);
  vm.runInContext("openLearnableMovesPanel('team',0)", env);
  const html = env._INNER.innerHTML;
  assert.equal((html.match(/poke-detail-pill is-known/g) || []).length, 1, '1 attaque équipée');
  assert.equal((html.match(/poke-detail-pill is-learnable/g) || []).length, 1, '1 attaque apprenable validée (avant : non prise en compte)');
  assert.ok(html.includes('2/4'), 'compteur = équipées + apprenables (2/4), reçu : ' + (html.match(/\d\/\d/g) || [])[0]);
  assert.equal((html.match(/move-row learnable locked/g) || []).length, 2, 'les 2 attaques encore verrouillées sont estompées');
});

test('bouton sans emoji : seul le texte est affiché', () => {
  assert.ok(!POKE_MODAL.includes('📋 ${typeof t'), 'le bouton ne doit plus préfixer le libellé d\'un emoji');
  for (const lang of ['fr', 'en']) {
    const ui = fs.readFileSync(new URL(`../src/localization/${lang}/ui.js`, import.meta.url), 'utf8');
    const m = ui.match(/"view_all_learnable_moves":"([^"]*)"/);
    assert.ok(m, `clé view_all_learnable_moves absente (${lang})`);
    assert.ok(!m[1].includes('📋'), `emoji 📋 encore présent (${lang})`);
  }
});

test('les nouvelles clés i18n du panneau existent dans les deux locales', () => {
  for (const lang of ['fr', 'en']) {
    const ui = fs.readFileSync(new URL(`../src/localization/${lang}/ui.js`, import.meta.url), 'utf8');
    for (const key of ['possessed_short', 'move_pill_equipped', 'move_pill_available']) {
      assert.ok(ui.includes(`"${key}"`), `${key} manquant (${lang})`);
    }
  }
});

// ── Passe 10 : le dressage ne propose QUE la catégorie « dressage » ─────────

const GAME_HELPERS = fs.readFileSync(new URL('../src/data/game-helpers.js', import.meta.url), 'utf8');

test('getSpeciesTrainingOnlyPool = pool complet − niveau − CT/CS', () => {
  const sandbox = {
    console,
    ITEMS: { ct_c: { type: 'ct', moveId: 'c' }, potion: { type: 'heal' } },
    getSpeciesFullLearnablePool: () => ['a', 'b', 'c', 'd', 'e'],
    getMoveLearnLevel: (nid, id) => ({ a: 1, b: 8 })[id] ?? 999,
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  const fns = [
    /function getCtCsMoveIds\(\) \{[\s\S]*?\n\}/,
    /function getSpeciesTrainingOnlyPool\(speciesId\) \{[\s\S]*?\n\}/,
  ].map((re) => {
    const m = GAME_HELPERS.match(re);
    assert.ok(m, 'extraction impossible');
    return m[0];
  });
  vm.runInContext(fns.join('\n'), sandbox, { filename: 'game-helpers.js#passe10' });
  assert.equal(JSON.stringify(sandbox.getSpeciesTrainingOnlyPool(25)), JSON.stringify(['d', 'e']), 'a,b = niveau ; c = CT ; restent d,e (dressage)');
});

test('getTrainableLockedMoves pioche dans la catégorie dressage uniquement', () => {
  assert.ok(/getSpeciesTrainingOnlyPool/.test(TRAINING), 'le dressage doit utiliser getSpeciesTrainingOnlyPool');
  assert.ok(/getSpeciesTrainingOnlyPool/.test(POKE_MODAL), 'la catégorie « dressage » du panneau partage la même source');
  const sandbox = {
    console,
    getSpeciesTrainingOnlyPool: () => ['d', 'e'],
    getTrainingLockedMoves: () => { throw new Error('ne doit plus être utilisé comme pool principal'); },
    isMoveTrainingLocked: (p, id) => !(p.trainingUnlockedMoves || []).includes(id),
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  const m = TRAINING.match(/function getTrainableLockedMoves\(p\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'extraction impossible');
  vm.runInContext(m[0], sandbox, { filename: 'training.js#passe10' });
  const p = { id: 25, moves: [{ id: 'a' }], trainingUnlockedMoves: ['e'] };
  assert.deepEqual(sandbox.getTrainableLockedMoves(p), ['d'], 'reste d : e déjà débloquée, a connue, niveau/CT exclus du pool');
});

test('les nouveaux helpers de catégorisation sont exposés sur window', () => {
  assert.ok(GAME_HELPERS.includes('window.getCtCsMoveIds = getCtCsMoveIds'), 'getCtCsMoveIds non exposé');
  assert.ok(GAME_HELPERS.includes('window.getSpeciesTrainingOnlyPool = getSpeciesTrainingOnlyPool'), 'getSpeciesTrainingOnlyPool non exposé');
});

