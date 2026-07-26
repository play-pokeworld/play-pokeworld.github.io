import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 26 : QoL bêta ──────────────────────────────────────────────────
//  A. Toutes les CT/CS des bonnes versions achetables, éparpillées dans
//     toutes les boutiques des deux régions (1 seule boutique par CT).
//  B. Panneaux d'info : « où trouver » (objets) et « qui peut l'avoir »
//     (attaques/talents, porteurs talent caché inclus).
//  C. Dictionnaire épuré : plus de lieux ni de listes dans les cases.
//  D. Sac : baies = objets tenus, filtre « Divers » supprimé, même barre de
//     tri/filtre/recherche que la boîte PC.
//  E. Paramètres : suppression de sauvegarde rouge + avertissement.
//  F. Aperçu de glisser-déposer unifié (Pokémon, attaques, fenêtres).
//  G. Presets d'équipe : prévisualisation des membres.
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const notifications = [];
  const sandbox = {
    console, window: {},
    document: { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, innerHTML: '', className: '', remove() {} }), body: { appendChild() {} } },
    G: {
      team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {},
      unlockedTalents: {}, lang: 'fr', badges: [], defeatedChamps: {}, teamPresets: null,
    },
    battle: { eMoveIdx: 0, pMoveIdx: 0, eCd: 0, pCd: 0, eCdMax: 0, pCdMax: 0, enemyPoke: null, playerMods: null, enemyMods: null },
    TYPE_COLORS: {},
    spriteImg: () => '<span class="sprite-stub"></span>',
    getHeldBuff: () => ({}),
    rand: (a, b) => a, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: (msg, color) => notifications.push(String(msg)),
    saveGame: () => {}, setMsg: () => {}, addBattleLog: () => {}, updateHeader: () => {},
    renderTeamWindow: () => {},
    addStaffXp: () => {},
    itemEquippedOnTeam: () => null,
    _notifications: notifications,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js',
    'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/pokemon-talents.js', 'src/data/talents-full.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js',
    'src/data/shops-data.js', 'src/data/route-drops.js', 'src/data/ctcs-shop-data.js',
    'src/data/game-helpers.js', 'src/game/core/pokemon-factory.js',
    'src/localization/fr/types.js', 'src/localization/en/types.js',
    'src/localization/fr/talents.js', 'src/localization/en/talents.js',
    'src/localization/fr/move-descs.js',
    'src/localization/fr/ui.js', 'src/localization/en/ui.js',
    'src/engine/data/badge-helper.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/game/display/sprite-helpers.js',
    'src/game/economy/inventory.js',
    'src/game/display/team-ui.js',
    'src/game/display/fullscreen-panel.js',
  ]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  // Le vrai spriteImg exige SPRITE_DATA (assets) — stub léger pour les tests.
  vm.runInContext("spriteImg = function(){ return '<span class=\"sprite-stub\"></span>'; };", sandbox);
  return sandbox;
}
const sb = makeSandbox();

function makeFakeEl() {
  return {
    innerHTML: '', scrollTop: 0, style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
  };
}

// ————————————————————————— A —————————————————————————
test('passe 26 A : chaque CT gen ≤ 2 est vendue dans exactement UNE boutique', () => {
  assert.ok(sb.CTCS_SHOP_STOCK && sb.CTCS_META && sb.CTCS_UNSOLD, 'données CT/CS générées chargées');
  const allCtKeys = Object.keys(sb.ITEMS).filter((k) => /^ct/.test(k) && sb.ITEMS[k] && sb.ITEMS[k].moveId);
  const sold = Object.values(sb.CTCS_SHOP_STOCK).flat();
  assert.equal(new Set(sold).size, sold.length, 'aucune CT vendue en double');
  // Invariant fort : vendues ∪ non-vendues (gen 3+) = toutes les CT existantes
  assert.equal(sold.length + sb.CTCS_UNSOLD.length, allCtKeys.length, 'chaque CT est soit vendue, soit explicitement non vendue');
  for (const k of sb.CTCS_UNSOLD) assert.ok(!sold.includes(k), `CT gen 3+ jamais vendue : ${k}`);
  // Kanto = attaques de 1ʳᵉ génération uniquement
  for (const shopId of ['pallet', 'viridian', 'pewter', 'cerulean', 'vermilion', 'lavender', 'celadon', 'fuchsia', 'cinnabar', 'indigo']) {
    for (const k of sb.CTCS_SHOP_STOCK[shopId] || []) assert.equal(sb.CTCS_META[k].gen, 1, `${shopId} (Kanto) vend ${k} (gen ${sb.CTCS_META[k].gen}) — interdit`);
  }
  // Chaque CT vendue existe, enseigne une attaque de MOVES et a un prix (patch appliqué)
  for (const k of sold) {
    assert.ok(sb.ITEMS[k], `${k} existe`);
    assert.ok(sb.MOVES[sb.CTCS_META[k].move], `${k} → attaque connue (${sb.CTCS_META[k].move})`);
    assert.ok(sb.ITEMS[k].price > 0, `${k} a un prix (${sb.ITEMS[k].price}₽)`);
  }
  // Les 20 boutiques des deux régions proposent toutes au moins une CT (éparpillement)
  for (const shopId of ['pallet', 'viridian', 'pewter', 'cerulean', 'vermilion', 'lavender', 'celadon', 'fuchsia', 'cinnabar', 'indigo', 'jnewbark', 'jcherrygrove', 'jviolet', 'jazalea', 'jgoldenrod', 'jecruteak', 'jolivine', 'jmahogany', 'jcianwood', 'jblackthorn']) {
    assert.ok((sb.CTCS_SHOP_STOCK[shopId] || []).length >= 1, `${shopId} propose au moins une CT`);
  }
  // Câblage boutique + loader
  assert.ok(R('src/game/economy/shop.js').includes('CTCS_SHOP_STOCK[shopId]'), 'renderShop fusionne le stock CT/CS');
  assert.ok(R('src/loader.js').includes('src/data/ctcs-shop-data.js'), 'loader charge les données CT/CS');
});

// ————————————————————————— B —————————————————————————
test('passe 26 B : panneaux d\'info — où trouver / qui peut l\'avoir', () => {
  // Sources d'objets : route + boutique + atoll + CT
  const prine = sb.getItemSourceList('prine_berry'); // passe 27 : baie Oran retirée du jeu → témoin = baie Prine
  assert.ok(prine.some((s) => s.startsWith('🗺️')), 'baie Prine trouvée sur les routes');
  assert.ok(prine.some((s) => s.startsWith('🏬')), 'baie Prine vendue en boutique');
  const leftovers = sb.getItemSourceList('leftovers');
  assert.ok(leftovers.some((s) => s.includes('Atoll')), 'Restes trouvables à l\'Atoll (jetons)');
  const aCt = Object.values(sb.CTCS_SHOP_STOCK)[0][0];
  assert.ok(sb.getItemSourceList(aCt).some((s) => s.includes('· CT')), `la CT ${aCt} est sourcée « boutique CT »`);
  // Qui peut apprendre : attaque CT gen 1 classique
  const learners = sb.getMoveLearners('ice_beam');
  const total = learners.level.length + learners.ctcs.length + learners.training.length;
  assert.ok(total > 0, 'ice_beam a des élèves');
  for (const id of [...learners.level, ...learners.ctcs, ...learners.training]) assert.ok(id >= 1 && id <= 251 && sb.PD[id], 'élève valide');
  assert.equal(sb.getMoveLearners('').training.length, 0, 'attaque vide → personne');
  // Câblage des trois panneaux
  assert.ok(R('src/game/display/poke-modal.js').includes('getMoveLearners(moveId)'), 'openMoveInfo : section élèves');
  assert.ok(R('src/game/display/poke-modal.js').includes("t('learners_' + catKey)"), 'openMoveInfo : 3 catégories légitimes');
  assert.ok(R('src/data/items-helpers.js').includes('getItemSourceList(key)'), 'openItemInfo : sources complètes');
  assert.ok(R('src/game/display/fullscreen-panel.js').includes('hiddenCarriers'), 'openAbilityInfo : porteurs talent caché');
  // i18n FR
  assert.equal(sb.t('learners_training'), 'Par dressage');
  assert.equal(sb.t('hidden_carriers'), 'Talent caché de…');
});

// ————————————————————————— C —————————————————————————
test('passe 26 C : dictionnaire épuré (plus de lieux ni de listes)', () => {
  const src = R('src/game/display/fullscreen-panel.js');
  assert.ok(!src.includes('<small>${sources'), 'cases objets : lieux retirés');
  assert.ok(!src.includes('${users.slice(0,4)'), 'cases attaques/talents : listes retirées');
  assert.ok(!src.includes('dict_ability_carriers'), 'cases talents : porteurs retirés');
  assert.ok(src.includes('findItemSources(key){\n const list = (typeof getItemSourceList'), 'findItemSources délègue à getItemSourceList');
});

// ————————————————————————— D —————————————————————————
test('passe 26 D : sac — baies = objets tenus, « Divers » supprimé, barre boîte PC', () => {
  assert.equal(sb.itemCat('babiri_berry'), 'held', 'baie Babiri = objet tenu');
  assert.equal(sb.itemCat('stardust'), 'treasure', 'Poussière Étoile = trésor');
  assert.equal(sb.itemCat('prine_berry'), 'held', 'baie Prine = objet tenu');
  assert.equal(sb.itemCat('ct06_toxic'), 'ct_cs', 'CT classée CT/CS');
  assert.equal(sb.itemCat('firestone'), 'evolution', 'pierre feu = évolution');
  assert.equal(sb.itemCat('zzz_inconnu'), 'special', 'inconnu → special (plus de misc)');
  // Rendu : barre unifiée + aucune option berry/misc + lignes d'objets
  sb.G.inventory = { babiri_berry: 3, ct06_toxic: 1, firestone: 2 };
  const el = makeFakeEl();
  assert.doesNotThrow(() => sb.renderInventory(el), 'rendu du sac sans DOM complet');
  const html = el.innerHTML;
  assert.ok(html.includes('box-filter-panel'), 'même panneau de filtres que la boîte PC');
  assert.ok(html.includes('inv-tabs'), 'onglets de catégories (passe 27)');
  assert.ok(!html.includes('>Tous<') && !html.includes('m.inventory.12'), 'pas d’onglet « Tous »');
  assert.ok(html.includes('data-action="filter-bag"'), 'recherche du sac');
  assert.ok(html.includes('data-call="resetInvFilters"'), 'bouton réinitialiser');
  assert.ok(!html.includes('value="berry"') && !html.includes('value="misc"'), 'filtres baies/divers supprimés');
  assert.ok(html.includes('Baie Babiri') || html.includes('babiri_berry'), 'objet listé');
  // Tri + filtre + recherche effectifs
  sb._invSearch = 'toxi';
  sb.renderInventory(el);
  assert.ok(el.innerHTML.includes('ct06_toxic') && !el.innerHTML.includes('babiri_berry'), 'recherche filtrante (globale, tous onglets)');
  sb.resetInvFilters();
  assert.equal(sb._invCat, 'held');
  assert.equal(sb._invSearch, '', 'réinitialisation complète');
});

// ————————————————————————— E —————————————————————————
test('passe 26 E : suppression de sauvegarde rouge et avertie', () => {
  const html = R('index.html');
  assert.ok(/data-action="confirm-delete"[^>]*pw-btn-danger|pw-btn-danger[^>]*data-action="confirm-delete"/.test(html), 'bouton supprimer rouge');
  assert.ok(/data-action="do-delete"[^>]*pw-btn-danger|pw-btn-danger[^>]*data-action="do-delete"/.test(html), 'bouton confirmer rouge');
  assert.ok(html.includes('data-i18n="delete_save_warning"'), 'avertissement irréversible affiché');
  assert.equal(sb.t('delete_save_warning'), '⚠️ Cette action est irréversible : toute ta progression sera effacée.', 'libellé FR');
  assert.ok(R('src/assets/styles/cleaned-components.css').includes('.delete-danger-zone'), 'CSS zone de danger');
});

// ————————————————————————— F —————————————————————————
test('passe 26 F : vignette de drag unifiée partout', () => {
  // Helper présent et exporté
  const sh = R('src/game/display/sprite-helpers.js');
  assert.ok(sh.includes('function pwApplyDragGhost') && sh.includes('window.pwApplyDragGhost'), 'helper défini + exporté');
  assert.ok(R('src/assets/styles/cleaned-components.css').includes('.pw-drag-ghost'), 'CSS vignette');
  // Les 5 sites de drag l'utilisent
  assert.equal((R('src/game/display/team-ui.js').match(/pwApplyDragGhost\(ev/g) || []).length, 2, 'carte équipe + attaque équipe');
  assert.equal((R('src/game/display/fullscreen-panel.js').match(/pwApplyDragGhost\(ev/g) || []).length, 2, 'carte Usine + attaque Usine');
  assert.ok(R('src/game/display/win-drag.js').includes('pwDragGhostHtml('), 'fenêtres (même look)');
  // Fonctionnel : capture d'image sans navigateur
  let captured = null;
  sb.document.createElement = () => ({ style: {}, innerHTML: '', className: '', remove() {} });
  const ev = { dataTransfer: { setDragImage: (el, x, y) => { captured = { el, x, y }; }, effectAllowed: '', setData() {} } };
  sb.pwApplyDragGhost(ev, { icon: '<i>X</i>', title: 'Ratata', sub: 'Nv.5' });
  assert.ok(captured && captured.el && captured.el.className === 'pw-drag-ghost', 'vignette posée sur le drag');
  assert.ok(captured.el.innerHTML.includes('Ratata'), 'vignette contient le nom');
});

// ————————————————————————— G —————————————————————————
test('passe 26 G : presets d\'équipe prévisualisés', () => {
  sb.G.teamPresets = { preset1: { name: 'A', uids: ['u1', 'u2', 'u3'] }, preset2: { name: 'B', uids: [] }, preset3: { name: 'C', uids: [] } };
  sb.G.activePresetId = 'preset1';
  sb.G.team = [{ id: 25, name: 'Pikachu', level: 12, uid: 'u1', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10 }];
  sb.G.collection = { box_1: { id: 4, name: 'Salamèche', level: 7, uid: 'u2', moves: [], currentHP: 9, maxHP: 9 } };
  const html = sb.renderTeamPresetsToolbar();
  // Passe 27 : la barre devient le bouton du gestionnaire d'équipes ; les
  // puces de prévisualisation vivent dans le panneau « Mes Équipes » (suite passe 27).
  assert.ok(html.includes('openPresetManager'), 'bouton du gestionnaire d\'équipes');
  assert.ok(html.includes('teams_manager_open') === false, 'libellé résolu (clé i18n)');
});
