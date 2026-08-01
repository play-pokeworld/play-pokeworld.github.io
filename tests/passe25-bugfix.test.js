import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 25 : correctifs des 3 retours utilisateur ──────────────────────
//  #1 description du bouton « talent caché » cassée (clés i18n
//     training_mode_hidden_desc/_done manquantes → libellé brut affiché)
//  #2 fiche objet ouverte depuis le sélecteur d'ÉQUIPEMENT : le bouton
//     retour ramenait au sac global au lieu du choix d'objet
//  #3 Usine (atoll) : la réorganisation pré-combat devient un panneau clone
//     de la fenêtre « Équipe Active » (glisser-déposer, lecture seule :
//     pas d'objet / talent / moveset à changer)
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
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js',
    'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/pokemon-talents.js', 'src/data/talents-full.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/game/core/pokemon-factory.js',
    'src/data/atoll-sets-data.js', 'src/game/world/atoll-core.js',
    'src/localization/fr/types.js', 'src/localization/en/types.js',
    'src/localization/fr/talents.js', 'src/localization/en/talents.js',
    'src/localization/fr/move-descs.js',
    'src/localization/fr/ui.js', 'src/localization/en/ui.js',
    'src/engine/data/badge-helper.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/game/combat/training.js',
    'src/game/combat/battle-team-ui.js',
    'src/game/display/team-manage.js',
    'src/game/display/team-ui.js',
    'src/game/display/fullscreen-panel.js',
  ]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  return sandbox;
}
const sb = makeSandbox();
const join = (a) => Array.from(a).join(',');

// Mini-DOM factice pour exercer le panneau de préparation en vm.
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
test('passe 25 #1 : la description du mode « talent caché » est traduite', () => {
  assert.equal(sb.t('training_mode_hidden_title'), 'Déblocage Talent Caché', 'titre FR');
  assert.equal(sb.t('training_mode_hidden_desc'), 'Tente de débloquer le talent caché de ce Pokémon.', 'desc FR (plus de clé brute)');
  assert.equal(sb.t('training_mode_hidden_done'), 'Talent caché déjà débloqué.', 'état « fait » FR');
  // Le libellé réellement utilisé par les boutons d'entraînement (mode 'hidden')
  assert.equal(sb.getTrainingModeLabel('hidden'), 'Déblocage Talent Caché', 'label du bouton');
  assert.equal(sb.getTrainingModeDescription('hidden', true), 'Tente de débloquer le talent caché de ce Pokémon.', 'description du bouton (canDo)');
  assert.equal(sb.getTrainingModeDescription('hidden', false), 'Talent caché déjà débloqué.', 'description du bouton (done)');
  assert.ok(!String(sb.getTrainingModeDescription('hidden', true)).includes('training_mode_'), 'plus aucune clé i18n brute affichée');
  // Anglais paré aussi
  assert.ok(R('src/localization/en/ui.js').includes('"training_mode_hidden_desc":"Attempts to unlock'), 'desc EN présente');
  assert.ok(R('src/localization/en/ui.js').includes('"training_mode_hidden_done":"Hidden ability already unlocked."'), 'done EN présent');
});

// ————————————————————————— #2 —————————————————————————
test('passe 25 #2 : la fiche objet ouverte depuis l\'équipement y revient', () => {
  // Wrapper appelé par le clic droit des lignes du sélecteur d'équipement.
  sb.openItemInfoFromEquip('leftovers', 2);
  assert.deepEqual(
    { kind: sb.window._pwInfoSource.kind, teamIdx: sb.window._pwInfoSource.teamIdx },
    { kind: 'equip-select', teamIdx: 2 },
    'la source de retour mémorisée est le sélecteur d\'équipement',
  );
  // Le sélecteur rendu invoque bien ce wrapper (clic droit) avec le slot visé.
  const srcTeamUi = R('src/game/display/team-ui.js');
  assert.ok(srcTeamUi.includes('data-context-call="openItemInfoFromEquip" data-context-args="\'${key}\', ${teamIdx}"'),
    'lignes du sélecteur : clic droit → wrapper avec teamIdx');
  // La navigation de retour connaît ce kind : elle rouvre openItemSelector.
  const preflight = R('src/file-preflight.js');
  assert.ok(preflight.includes("src.kind === 'equip-select'"), 'pwInfoBack/Label gèrent kind equip-select');
  assert.ok(preflight.includes("callGlobal('openItemSelector', src.teamIdx)"), 'retour → réouverture du sélecteur d\'équipement');
  assert.ok(preflight.includes("key = 'back_to_equip_selector'"), 'libellé de retour dédié');
  assert.ok(preflight.includes('window._pwEquipInfoFrom != null'), 'capture : indication sélecteur lue pendant la construction (libellé exact)');
  assert.equal(sb.t('back_to_equip_selector'), "← Retour au choix d'objet", 'libellé FR');
});

// ————————————————————————— #3 —————————————————————————
test('passe 25 #3 : le panneau de préparation Usine clone l\'Équipe Active', () => {
  sb.G.championTitle = true; // atoll accessible
  sb.G.atoll = null;
  sb.prepareAtollFactoryBattle('factory_c');
  const run = sb.getAtollFactoryRun();
  assert.ok(run && Array.isArray(run.team) && run.team.length > 1, 'série Usine créée');

  // Mini-DOM : le rendu du panneau produit les MÊMES cartes que l'Équipe Active.
  const realDoc = sb.document;
  const els = { 'poke-modal': makeFakeEl(), 'poke-modal-inner': makeFakeEl() };
  sb.document = { getElementById: (id) => els[id] || null, querySelectorAll: () => [] };
  try {
    assert.equal(sb.renderAtollFactoryPrep(), true, 'rendu du panneau');
    const html = els['poke-modal-inner'].innerHTML;
    assert.ok(html.includes('poke-card'), 'cartes Pokémon identiques à l\'Équipe Active');
    assert.ok(html.includes('id="atoll-prep-body" class="team-view"'), 'conteneur .team-view (look Équipe)');
    assert.ok(html.includes('data-atoll-move-drag='), 'attaques réordonnables par glisser-déposer');
    assert.ok(!html.includes('data-move-drag="'), 'aucun drag d\'attaque lié à G.team');
    assert.ok(!html.includes('data-call="switchBattlePoke"'), 'pas de switch de combat sur le sprite');
    assert.ok(!html.includes('data-call="openPokeModal"'), 'pas de fiche éditable (talent/moveset/objet figés)');
    assert.ok(!html.includes('data-call="openItemSelector"'), 'pas de changement d\'objet');
    assert.ok(!html.includes('poke-item-badge empty'), 'pas de badge « + » d\'équipement');
    assert.ok(html.includes('data-call="atollFactoryPrepFight"'), 'bouton Combattre');
    assert.ok(html.includes('data-call="atollFactoryPrepAbandon"'), 'bouton Abandonner');
    assert.ok(html.includes('data-context-call="openMoveInfo"'), 'info attaque toujours disponible (clic droit)');
    assert.ok(!html.includes("',-1\""), 'fiche attaque sans contexte « ferme et oublie » : le retour revient à la préparation');

    sb.openAtollFactoryPrep();
    assert.ok(els['poke-modal'].classList.contains('open'), 'panneau ouvert');
    assert.ok(els['poke-modal'].classList.contains('atoll-prep-modal'), 'classe de largeur dédiée');
    assert.equal(sb.window._atollPrepOpen, true, 'source « panneau d\'info » armée pour les fiches');
    sb.closeAtollFactoryPrep();
    assert.equal(sb.window._atollPrepOpen, false, 'fermeture : drapeau purgé');
    assert.ok(!els['poke-modal'].classList.contains('open'), 'fermeture : modale refermée');
  } finally {
    sb.document = realDoc;
  }

  // Réorganisation par swaps (ce que le glisser-déposer invoque).
  const orderBefore = join(run.team.map((p) => p.id));
  const last = run.team.length - 1;
  sb.atollFactorySwapPoke(0, last);
  const after = run.team.map((p) => p.id);
  assert.notEqual(join(after), orderBefore, 'swap extrémités : ordre modifié');
  sb.atollFactorySwapPoke(last, 0);
  assert.equal(join(run.team.map((p) => p.id)), orderBefore, 'swap inverse : ordre restauré');
  sb.atollFactorySwapPoke(0, 0); // identité : no-op
  assert.equal(join(run.team.map((p) => p.id)), orderBefore, 'swap identité ignoré');

  // Sans série : les ouvertures se referment proprement, sans crash.
  sb.G.atoll = null;
  assert.equal(sb.getAtollFactoryRun(), null);
  assert.doesNotThrow(() => sb.openAtollFactoryPrep(), 'ouverture sans série : aucun crash');
});

test('passe 25 #3 : navigation de retour et i18n du panneau de préparation', () => {
  const preflight = R('src/file-preflight.js');
  assert.ok(preflight.includes("return { kind: 'atoll-prep' };"), 'capture de source : panneau de préparation détecté');
  assert.ok(preflight.includes("src.kind === 'atoll-prep'"), 'pwInfoBack/Label gèrent kind atoll-prep');
  assert.ok(preflight.includes("callGlobal('openAtollFactoryPrep')"), 'retour → réouverture de la préparation');
  assert.ok(preflight.includes("key = 'back_to_atoll_prep'"), 'libellé de retour dédié');
  assert.ok(preflight.includes('window._atollPrepOpen = false'), 'fermetures génériques : drapeau purgé');
  assert.ok(R('src/file-postboot.js').includes('window._atollPrepOpen = false'), 'postboot : purge aussi');
  const fsSrc = R('src/game/display/fullscreen-panel.js');
  assert.ok(!fsSrc.includes('atollFactoryMovePoke'), 'ancien éditeur à flèches supprimé');
  assert.ok(fsSrc.includes('window._atollPrepOpen = false'), 'openFullscreenPanel purge la préparation');
  assert.ok(fsSrc.includes('openAtollFactoryPrep();'), 'prepareAtollFactoryBattle ouvre le panneau');
  const cardSrc = R('src/game/combat/battle-team-ui.js');
  assert.ok(cardSrc.includes('noSpriteHandlers') && cardSrc.includes('itemReadonly') && cardSrc.includes("data-' + moveDragAttr"),
    'generatePokeCardHTML : options lecture seule + attribut de drag alternatif');
  assert.equal(sb.t('atoll_factory_prep_open'), "⚙ Organiser l'équipe prêtée", 'bouton d\'accès FR');
  assert.equal(sb.t('back_to_atoll_prep'), '← Retour à la préparation', 'libellé retour FR');
});

