import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Contrats de la navigation contextuelle des panneaux d'info (passe 4) ────
const PREFLIGHT = fs.readFileSync(new URL('../src/file-preflight.js', import.meta.url), 'utf8');
const POKE_MODAL = fs.readFileSync(new URL('../src/game/display/poke-modal.js', import.meta.url), 'utf8');

function extract(name) {
  const re = new RegExp('window\\.' + name + ' = function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\};');
  const m = PREFLIGHT.match(re);
  assert.ok(m, `extraction de ${name} impossible`);
  return m[0];
}

// Réunit builder + label + back dans un contexte vm avec stub DOM minimal.
function makeEnv() {
  const calls = [];
  const classes = new Set(['open']);
  const fakeModal = { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: (c) => classes.has(c) } };
  const sandbox = {
    console,
    calls,
    fakeModal,
    window: {
      _pwInfoSource: null,
      PW_FS_BACK_KEYS: {
        inventory: 'back_to_inventory', shop: 'back_to_shop', market: 'back_to_market',
        pokedex: 'back_to_pokedex', dictionary: 'back_to_dictionary', guide: 'back_to_guide', atoll: 'back_to_atoll',
      },
    },
    document: { getElementById: (id) => (id === 'poke-modal' ? fakeModal : null) },
    callGlobal: (...args) => { calls.push(args); return true; },
    t: (k) => (k.startsWith('back_to_') ? 'LBL_' + k : k),
  };
  sandbox.window.openPokeModal = () => {};
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  vm.runInContext(
    extract('pwInfoCaptureSource') + '\n' + extract('pwInfoBackLabel') + '\n' + extract('pwBuildInfoPanel') + '\n' + extract('pwInfoBack'),
    sandbox,
    { filename: 'file-preflight.js#passe3' }
  );
  return sandbox;
}

// ── pwInfoBack : retour au menu d'origine ──────────────────────────────────

test('pwInfoBack rouvre un panneau plein écran (fs)', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'fs', panel: 'dictionary' };
  env.window.pwInfoBack();
  assert.deepEqual(env.calls[0], ['openFullscreenPanel', 'dictionary']);
});

test('pwInfoBack rouvre la fiche équipe', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'team', idx: 3 };
  env.window.pwInfoBack();
  assert.deepEqual(env.calls[0], ['openPokeModal', 3]);
});

test('pwInfoBack rouvre la fiche boîte', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'box', boxId: 'b7' };
  env.window.pwInfoBack();
  assert.deepEqual(env.calls[0], ['openBoxPokeModal', 'b7']);
});

test('pwInfoBack sans source ferme simplement le modal', () => {
  const env = makeEnv();
  env.window._pwInfoSource = null;
  env.window.pwInfoBack();
  assert.equal(env.calls.length, 0, 'aucun appel de navigation');
  assert.equal(env.fakeModal.classList.contains('open'), false, 'modal fermé');
});

// ── pwBuildInfoPanel : croix + bouton liés à pw-info-back, libellé adapté ──

test('le panneau unifié porte croix et bouton en data-action pw-info-back', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'fs', panel: 'inventory' };
  const html = env.window.pwBuildInfoPanel({ icon: '', title: 'Test', subtitle: '', statCards: [{ label: 'A', value: '1' }], sections: [{ title: 'S', body: 'b' }] });
  assert.equal((html.match(/data-action="pw-info-back"/g) || []).length, 2, 'croix + bouton');
  assert.ok(html.includes('LBL_back_to_inventory'), 'libellé adapté au menu d\'origine');
  assert.ok(html.includes('pw-info-stat-cards'), 'cartes de stats présentes');
  assert.ok(html.includes('pw-info-section'), 'sections encadrées présentes');
});

// ── Contrats de source (garde-fous de régression) ──────────────────────────

test('la croix .modal-close avec data-action passe par runAction (pas de fermeture aveugle)', () => {
  assert.ok(
    /closeButton\.dataset\s*&&\s*closeButton\.dataset\.action\s*&&\s*runAction\(/.test(PREFLIGHT),
    'installRobustClickFallback doit router .modal-close[data-action] via runAction'
  );
});

test('les lignes d\'attaques de la fiche passent leur contexte explicite', () => {
  assert.ok(POKE_MODAL.includes('ctxMoveArgs'), 'attaques connues : contexte explicite');
  assert.ok(POKE_MODAL.includes('ctxLearnArgs'), 'attaques apprenables : contexte explicite');
  assert.ok(/`'\$\{m\.id\}',null,'\$\{boxId\}'`/.test(POKE_MODAL), 'contexte box passé à openMoveInfo');
  assert.ok(/`'\$\{m\.id\}',\$\{idx\}`/.test(POKE_MODAL), 'contexte team passé à openMoveInfo');
});

test('openMoveInfo honore le contexte explicite avant la déduction ambiante', () => {
  const ia = POKE_MODAL.indexOf("contextBoxId != null && contextBoxId !== ''");
  const ib = POKE_MODAL.indexOf('pwInfoCaptureSource');
  assert.ok(ia > -1 && ib > -1 && ia < ib, 'le contexte explicite prime sur pwInfoCaptureSource');
});

test('le panneau attaque n\'affiche plus la Précision (Puissance + Catégorie)', () => {
  assert.ok(!POKE_MODAL.includes("label: (t('accuracy')"), 'carte Précision retirée');
});

test('callGlobal est exposé sur window (pwInfoBack, défini hors IIFE, en dépend)', () => {
  assert.ok(
    PREFLIGHT.includes('window.callGlobal = callGlobal'),
    'sans window.callGlobal, pwInfoBack jette un ReferenceError silencieux et le retour contextuel échoue'
  );
});

// ── Passe 6 : source « fantôme » + libellé fiche Pokémon ───────────────────

test('pwInfoCaptureSource ignore une fiche fantôme quand le modal est fermé', () => {
  const env = makeEnv();
  env.fakeModal.classList.remove('open'); // fiche box vue puis fermée plus tôt
  env.window._pwPokeSheet = { kind: 'box', boxId: 'b7' };
  const src = env.window.pwInfoCaptureSource();
  assert.equal(src, null, 'sans modal ouvert, la fiche mémorisée ne doit pas être capturée');
});

test('pwInfoCaptureSource retourne la fiche quand le modal est ouvert sur elle', () => {
  const env = makeEnv(); // fakeModal a la classe 'open' par défaut
  env.window._pwPokeSheet = { kind: 'team', idx: 2 };
  let src = env.window.pwInfoCaptureSource();
  assert.equal(src && src.kind, 'team');
  assert.equal(src && src.idx, 2);
  env.window._pwPokeSheet = { kind: 'box', boxId: 'b7' };
  src = env.window.pwInfoCaptureSource();
  assert.equal(src && src.kind, 'box');
  assert.equal(src && src.boxId, 'b7');
});

test('le libellé de retour d\'une fiche Pokémon est « back_to_pokemon » (team et box)', () => {
  const env = makeEnv();
  env.window._pwInfoSource = { kind: 'team', idx: 1 };
  assert.equal(env.window.pwInfoBackLabel(), 'LBL_back_to_pokemon');
  env.window._pwInfoSource = { kind: 'box', boxId: 'b3' };
  assert.equal(env.window.pwInfoBackLabel(), 'LBL_back_to_pokemon');
  env.window._pwInfoSource = { kind: 'fs', panel: 'shop' };
  assert.equal(env.window.pwInfoBackLabel(), 'LBL_back_to_shop', 'les panneaux fs gardent leur libellé');
});

test('back_to_pokemon existe dans les deux locales', () => {
  for (const lang of ['fr', 'en']) {
    const ui = fs.readFileSync(new URL(`../src/localization/${lang}/ui.js`, import.meta.url), 'utf8');
    assert.ok(ui.includes('back_to_pokemon'), `back_to_pokemon manquant (${lang})`);
  }
});

test('la fermeture du poke-modal purge la fiche et la source mémorisées', () => {
  assert.ok(
    /action === 'close-poke-modal'\) \{[^\n]*window\._pwPokeSheet = null/.test(PREFLIGHT),
    'close-poke-modal (preflight) doit purger _pwPokeSheet/_pwInfoSource'
  );
  const POSTBOOT = fs.readFileSync(new URL('../src/file-postboot.js', import.meta.url), 'utf8');
  assert.ok(POSTBOOT.includes('_pwPokeSheet = null'), 'close-poke-modal (postboot) doit purger _pwPokeSheet');
});

test('le movepool des anciennes saves est normalisé au chargement', () => {
  const SAVE = fs.readFileSync(new URL('../src/game/save/save.js', import.meta.url), 'utf8');
  assert.ok(/Array\.isArray\(p\.movepool\)\s*\?\s*'movepool'\s*:\s*\(Array\.isArray\(p\.learnableMoves\)/.test(SAVE), 'champ movepool/learnableMoves pris en charge');
});

// ── Passe 7 : pilules d'attaque des cartes équipe/combat -> retour = fermeture ──

const BATTLE_TEAM_UI = fs.readFileSync(new URL('../src/game/combat/battle-team-ui.js', import.meta.url), 'utf8');
const BATTLE_UI = fs.readFileSync(new URL('../src/game/combat/battle-ui.js', import.meta.url), 'utf8');

// Extrait openMoveInfo avec stubs minimaux (le panneau est généré via pwBuildInfoPanel).
function makeMoveInfoEnv(captureResult) {
  const sandbox = {
    console,
    MOVES: { tackle: { type: 'normal', pow: 40, cat: 'phys', desc: 'Charge basique.' } },
    TYPE_COLORS: { normal: '#A0A29F' },
    document: {
      _inner: { innerHTML: '' },
      _classes: new Set(),
      getElementById(id) {
        if (id === 'poke-modal-inner') return this._inner;
        if (id === 'poke-modal') {
          const classes = this._classes;
          return { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: (c) => classes.has(c) } };
        }
        return null;
      },
    },
    getMoveName: (id) => 'NOM_' + id,
    typeClass: (tp) => 'type-' + tp,
    t: (k) => k,
    tr: (k) => k,
    window: {
      _pwInfoSource: 'INIT',
      pwModalInfo: () => {},
      pwBuildInfoPanel: () => '<HTML_OK>',
      pwInfoCaptureSource: () => captureResult,
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext("var _pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };", sandbox); // repli passe 16 (slices de fonctions)
  const m = POKE_MODAL.match(/function openMoveInfo\(moveId, contextIdx, contextBoxId\)\s*\{[\s\S]*?\n\}/);
  assert.ok(m, 'extraction openMoveInfo impossible');
  vm.runInContext(m[0], sandbox, { filename: 'poke-modal.js#passe7' });
  return sandbox;
}

test('openMoveInfo avec contexte explicite -1 (carte équipe/combat) : aucune source -> le retour ferme', () => {
  const env = makeMoveInfoEnv({ kind: 'team', idx: 0 });
  vm.runInContext("openMoveInfo('tackle', -1)", env);
  assert.equal(env.window._pwInfoSource, null, 'la déduction ambiante ne doit PAS être utilisée quand idx=-1 (sinon la fiche visible derrière rouvrirait au retour)');
});

test('openMoveInfo avec idx >= 0 (fiche équipe) : retour vers la fiche', () => {
  const env = makeMoveInfoEnv(null);
  vm.runInContext("openMoveInfo('tackle', 2)", env);
  const src = env.window._pwInfoSource;
  assert.equal(src && src.kind, 'team');
  assert.equal(src && src.idx, 2);
});

test('openMoveInfo sans contexte : déduction ambiante conservée (dict/fs)', () => {
  const env = makeMoveInfoEnv({ kind: 'fs', panel: 'dictionary' });
  vm.runInContext("openMoveInfo('tackle')", env);
  const src = env.window._pwInfoSource;
  assert.equal(src && src.kind, 'fs');
  assert.equal(src && src.panel, 'dictionary');
});

test('les pilules d\'attaque des cartes équipe/combat passent le contexte -1', () => {
  // Assertion d'exécution (passe 25 : la construction du contexte passe par
  // moveInfoArgs — défaut = contexte -1, option moveInfoContextless = nu).
  const sandbox = {
    console, window: {},
    G: { team: [] },
    battle: { eMoveIdx: 0, pMoveIdx: 0, eCd: 0, pCd: 0, eCdMax: 0, pCdMax: 0, enemyPoke: null, playerMods: null, enemyMods: null },
    ITEMS: {}, MOVES: { tackle: { type: 'normal', power: 40, cat: 'physique' } },
    TYPE_COLORS: { normal: '#A0A29F' },
    spriteImg: () => '<span></span>', getHeldBuff: () => ({}),
    getMoveName: () => 'Charge', getPokeName: () => 'Ratata',
    t: (k) => k, tr: (k) => k,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(BATTLE_TEAM_UI, sandbox, { filename: 'battle-team-ui.js#passe7' });
  const poke = { id: 1, name: 'Ratata', level: 5, currentHP: 20, maxHP: 20, xp: 0, xpNext: 8, moves: [{ id: 'tackle', pp: 35 }] };
  const htmlDefault = vm.runInContext('generatePokeCardHTML(' + JSON.stringify(poke) + ', 0, { showMoves: true, movesDraggable: false })', sandbox);
  assert.ok(htmlDefault.includes('data-context-args="\'tackle\',-1"'), 'cartes équipe : contexte -1 attendu (retour = fermeture)');
  const htmlNu = vm.runInContext('generatePokeCardHTML(' + JSON.stringify(poke) + ', 0, { showMoves: true, moveInfoContextless: true })', sandbox);
  assert.ok(htmlNu.includes('data-context-args="\'tackle\'"'), 'moveInfoContextless : contexte nu (retour déduit de l\'écran)');
  assert.ok(!htmlNu.includes(",-1\""), 'moveInfoContextless : aucun -1 résiduel');
  assert.equal((BATTLE_UI.match(/,-1"/g) || []).length >= 1, true, 'moves auto-battle : contexte -1 attendu');
  // Les lignes de la FICHE gardent leur idx (comportement validé par l'utilisateur)
  assert.ok(POKE_MODAL.includes("ctxMoveArgs"), 'fiche : contexte idx conservé');
});

