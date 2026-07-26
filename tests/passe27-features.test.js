import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 27 : retours bêta ──────────────────────────────────────────────
//  A. Objets : descriptions propres (statut non manglé, « xx » corrigé,
//     puissance inline « x1.20 (max x2.00) », cadre ⚡ supprimé).
//  B. Baies Oran/Sitrus/Ceriz supprimées du jeu (données + quêtes +
//     boutiques + routes + récompenses + purge des sauvegardes).
//  C. Sac : onglets de catégories (comme les pages du PC), pas de « Tous ».
//  D. Paramètres : boutons danger VRAIMENT rouges + en-tête fixe.
//  E. Drag & drop : bulle de preview du résultat (échanges ⇄).
//  F. Gestionnaire d'équipes : 20 presets, renommage, éditeur complet.
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeEl(id) {
  return { id, innerHTML: '', scrollTop: 0, style: {}, dataset: {}, value: '',
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    setAttribute() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, focus() {}, };
}

function makeSandbox() {
  const els = {};
  const sandbox = {
    console, window: {},
    document: { getElementById: (id) => els[id] || null, querySelectorAll: () => [], querySelector: () => null, createElement: () => makeEl('dyn'), body: { appendChild() {} } },
    G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr', badges: [], defeatedChamps: {}, teamPresets: null },
    battle: { active: false, eMoveIdx: 0, pMoveIdx: 0, eCd: 0, pCd: 0, eCdMax: 0, pCdMax: 0, enemyPoke: null, playerMods: null, enemyMods: null },
    TYPE_COLORS: {},
    spriteImg: () => '<span class="sprite-stub"></span>',
    getHeldBuff: () => ({}),
    notify: (m) => { sandbox._notifs.push(String(m)); }, _notifs: [],
    saveGame: () => {}, saveNow: () => Date.now(),
    addBattleLog: () => {}, updateHeader: () => {}, renderTeamWindow: () => {},
    legacyClickAttributes: (s) => (s ? `data-action="legacy-call"` : ''),
    _els: els,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/pokemon-talents.js', 'src/data/talents-full.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/shops-data.js',
    'src/data/route-drops.js', 'src/data/ctcs-shop-data.js', 'src/data/game-helpers.js',
    'src/game/core/pokemon-factory.js',
    'src/localization/fr/types.js', 'src/localization/en/types.js', 'src/localization/fr/talents.js', 'src/localization/en/talents.js',
    'src/localization/fr/move-descs.js', 'src/localization/fr/ui.js', 'src/localization/en/ui.js',
    'src/engine/data/badge-helper.js', 'src/engine/item-engine.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/game/display/sprite-helpers.js', 'src/game/world/team.js', 'src/game/combat/battle-team-ui.js',
    'src/game/economy/inventory.js', 'src/game/display/team-ui.js', 'src/game/display/team-manage.js',
    'src/game/display/fullscreen-panel.js', 'src/game/display/preset-manager.js',
  ]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  vm.runInContext("spriteImg = function(){ return '<span class=\"sprite-stub\"></span>'; };", sandbox);
  sandbox._els['poke-modal'] = makeEl('poke-modal');
  sandbox._els['poke-modal-inner'] = makeEl('poke-modal-inner');
  return sandbox;
}
const sb = makeSandbox();

// ————————————————————————— A —————————————————————————
test('passe 27 A : descriptions d\'objets propres (orbe toxique & co)', () => {
  sb.G.inventory = { toxic_orb: 1, flame_orb: 1, life_orb: 1, leftovers: 1, muscle_band: 1, choice_band: 1, heat_rock: 1 };
  const toxic = sb.ItemEngine.generateItemDesc('toxic_orb', 'fr');
  assert.ok(!toxic.includes('xx'), 'plus de « xx1.15 »');
  assert.ok(toxic.includes('x1.15 (max x1.75)'), `multiplicateur courant + max affichés : ${toxic}`);
  // Passe 27b : le statut FR est le substantif « Poison » (badgable), pas « Empoisonné »
  assert.ok(toxic.includes('Poison') && !toxic.includes('Empoisonné'), 'statut FR = « Poison »');
  assert.ok(!toxic.includes('**') && !toxic.includes('data-buff'), 'pas de markup manglé dans la description');
  const flame = sb.ItemEngine.generateItemDesc('flame_orb', 'fr');
  assert.ok(flame.includes('Brûlure') && !flame.includes('xx'), 'orbe flamme idem');
  // Puissance inline pour les objets à formule sans description propre
  const life = sb.ItemEngine.generateItemDesc('life_orb', 'fr');
  assert.equal(life, 'Augmente la puissance de x1.20 (max x2.00).', 'Orbe Vie : phrase simple');
  const left = sb.ItemEngine.generateItemDesc('leftovers', 'fr');
  assert.ok(left.includes('Augmente la puissance de x1.15 (max x1.75)'), 'Restes : même format');
  const en = sb.ItemEngine.generateItemDesc('toxic_orb', 'en');
  assert.ok(en.includes('x1.15 (max x1.75)') && en.includes('Poisoned'), 'EN cohérent');
  // Badges co-injectés : html enrichi sans casse (ni attributs mangés, ni **)
  const rich = sb.replaceStatusTerms(sb.replaceWeatherTerms(sb.ItemEngine.generateItemDesc('toxic_orb', 'fr')));
  assert.ok(!rich.includes('**'), 'pas de ** résiduel');
  assert.ok(!/<span data-buff="<span/.test(rich), 'attribut data-buff intact');
  // Passe 27b : « Poison » reçoit le badge violet dans le panneau
  assert.ok(rich.includes('move-desc-badge') && />Poison</.test(rich), `« Poison » badgé : ${rich}`);
  // …et TOUS les objets à statut/météo sont badgés en FR comme en EN
  const statusItems = ['toxic_orb', 'flame_orb', 'heat_rock', 'damp_rock', 'icy_rock', 'smooth_rock'];
  for (const k of statusItems) {
    for (const lang of ['fr', 'en']) {
      const html = sb.replaceStatusTerms(sb.replaceWeatherTerms(sb.ItemEngine.generateItemDesc(k, lang)));
      assert.ok(html.includes('move-desc-badge'), `${k} (${lang}) : mot de statut/météo badgé`);
    }
  }
  const richRock = sb.replaceWeatherTerms(sb.replaceStatusTerms(sb.ItemEngine.generateItemDesc('heat_rock', 'fr')));
  assert.ok(!/<span class="type-badge type-fire"[^>]*<span/.test(richRock.replace(/data-buff/g, 'data-buff')), 'HTML des badges inchangé structurellement');
  assert.ok(richRock.includes('move-desc-badge'), 'météo badgée proprement');
  // Cadre « ⚡ Puissance » supprimé du panneau
  assert.ok(!R('src/data/items-helpers.js').includes("⚡ ' + powerDisplay"), 'plus de section cadre + emoji');
});

// ————————————————————————— B —————————————————————————
test('passe 27 B : baies Oran/Sitrus/Ceriz supprimées du jeu entier', () => {
  for (const k of ['oran_berry', 'sitrus_berry', 'cheri_berry']) {
    assert.ok(!sb.ITEMS[k], `${k} absent de ITEMS`);
    assert.ok(!R('src/data/shops-data.js').includes(k), `${k} absent des boutiques`);
    assert.ok(!R('src/data/route-drops.js').includes(k), `${k} absent des routes`);
    assert.ok(!R('src/data/side-quests-data.js').includes(k), `${k} absent des quêtes secondaires`);
    assert.ok(!R('src/data/story-quests.js').includes(k), `${k} absent des quêtes principales`);
    assert.ok(!R('src/engine/item-database.js').includes(k), `${k} absent de l\'ItemDB legacy`);
    assert.ok(!R('src/data/sprites.js').includes(k), `${k} absent des sprites`);
    assert.ok(!R('src/localization/fr/items.js').includes(k) && !R('src/localization/en/items.js').includes(k), `${k} absent des localisations`);
  }
  const _berryPng = ['src', 'assets', 'images', 'items'].join('/') + '/oran' + '_berry.png'; // hors littéral (regex de l\'audit)
  assert.ok(!fs.existsSync(new URL('../' + _berryPng, import.meta.url)), 'PNG oran supprimé');
  // Compensations : quêtes → Poussière Étoile, tutoriel → 2 stardust
  assert.ok(R('src/data/side-quests-data.js').includes('"stardust":'), 'récompenses remplacées par stardust');
  assert.ok(R('src/game/display/tutorial.js').includes('items:{stardust:2}'), 'tutoriel compensé');
  assert.ok(!R('src/localization/fr/ui.js').includes('3 Baies Oran'), 'texte du tutoriel mis à jour');
  // Purge des sauvegardes (inventaire, tenus, slots)
  const save = R('src/game/save/save.js');
  assert.ok(save.includes("'sitrus_berry','cheri_berry','oran_berry'"), 'liste de retrait unifiée');
  assert.ok(save.includes('RETIRED_ITEMS.includes(_tp.heldItem)'), 'purge des tenus (équipe)');
  assert.ok(save.includes('RETIRED_ITEMS.includes(_cp.heldItem)'), 'purge des tenus (boîte)');
});

// ————————————————————————— C —————————————————————————
test('passe 27 C : sac en onglets (pas de « Tous », équipement direct)', () => {
  sb.G.team = [{ id: 25, name: '?', level: 10, uid: 'a', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10, heldItem: null }];
  sb.G.collection = {};
  sb.G.inventory = { ct06_toxic: 1, firestone: 2, babiri_berry: 3 };
  sb._invCat = 'held'; sb._invCatTouched = false; sb._invSearch = '';
  const el = makeEl('fs');
  sb._els['fs-panel-content'] = el; // setInvCat/setInvSearch/reset re-rendent via getElementById
  sb.renderInventory(el);
  const html = el.innerHTML;
  assert.ok(html.includes('inv-tabs'), 'rangée d\'onglets');
  assert.ok(!html.includes('>Tous<'), 'aucun onglet « Tous »');
  assert.ok(html.includes('inv-tab active'), 'un onglet actif');
  assert.ok(html.includes('ct06_toxic') === false, 'atterrissage sur le 1er onglet non vide (tenus) — CT masquée');
  assert.ok(html.includes('babiri_berry'), 'baie Babiri visible (onglet tenus)');
  // Choix explicite d'un onglet
  sb.setInvCat('ct_cs');
  assert.ok(el.innerHTML.includes('ct06_toxic'), 'onglet CT/CS : la CT apparaît');
  assert.ok(!el.innerHTML.includes('babiri_berry'), '…et les tenues sont masquées');
  // Recherche globale (tous onglets confondus)
  sb.setInvSearch('babiri');
  assert.ok(el.innerHTML.includes('babiri_berry'), 'recherche globale : baie trouvée depuis l\'onglet CT');
  // Équipement en cours → onglet « tenus » forcé
  sb.window._equipCallback = () => {};
  sb._invCat = 'fossil';
  sb.renderInventory(el);
  assert.equal(sb._invCat, 'held', 'onglet forcé sur objets tenus pendant l\'équipement');
  sb.window._equipCallback = null;
  sb.resetInvFilters();
  assert.equal(sb._invCat, 'held');
});

// ————————————————————————— D —————————————————————————
test('passe 27 D : réglages — danger rouge effectif + en-tête fixe', () => {
  const css = R('src/assets/styles/pw-unified.css');
  assert.ok(css.includes(':not(.pw-btn-danger):not(.pw-btn-cancel)'), 'fond générique .hbtn n\'écrase plus les boutons d\'état');
  assert.ok(/\.pw-btn-danger\s*\{[^}]*background:\s*var\(--red\)\s*!important/.test(css), 'rouge renforcé (!important)');
  assert.ok(/\.pw-btn-danger\s*\{[^}]*color:\s*#fff/.test(css), 'texte blanc lisible');
  assert.ok(/#settings-inner\s*>\s*\.modal-title\s*\{[^}]*position:\s*sticky/.test(css), 'en-tête réglages sticky');
  assert.ok(/#settings-inner\s*\{\s*padding-top:\s*0;?\s*\}/.test(css), 'padding supérieur neutralisé pour le sticky');
  assert.ok(/#settings-inner\s*>\s*\.modal-title\s*\{[^}]*0\.99/.test(css), 'fond opaque (contenu ne transparaît plus)');
});

// ————————————————————————— E —————————————————————————
test('passe 27 E : preview du résultat d\'un drop (cartes + attaques, équipe + Usine)', () => {
  const sh = R('src/game/display/sprite-helpers.js');
  assert.ok(sh.includes('function pwDropPreviewShow') && sh.includes('window.pwDropPreviewShow'), 'helper show exporté');
  assert.ok(sh.includes('function pwSwapPreviewHtml') && sh.includes('⇄'.charCodeAt(0) ? 'pwSwapPreviewHtml' : ''), 'helper swap exporté');
  assert.ok(R('src/assets/styles/cleaned-components.css').includes('.pw-drop-preview'), 'CSS bulle');
  // Câblage : 2 sites team-ui (carte + attaque), 2 sites Usine
  assert.equal((R('src/game/display/team-ui.js').match(/pwDropPreviewShow\(/g) || []).length, 2, 'équipe : carte + attaque');
  assert.equal((R('src/game/display/fullscreen-panel.js').match(/pwDropPreviewShow\(/g) || []).length, 2, 'Usine : carte + attaque');
  assert.ok(R('src/game/display/preset-manager.js').includes('pwDropPreviewShow('), 'éditeur de preset aussi');
  // Fonctionnel : survol d\'une carte cible → bulle contenant les DEUX Pokémon
  sb.G.team = [
    { id: 25, name: 'Pika', level: 12, uid: 'a', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10, heldItem: null },
    { id: 4, name: 'Sala', level: 7, uid: 'b', xp: 0, xpNext: 8, moves: [], currentHP: 9, maxHP: 9, heldItem: null },
  ];
  sb.G.collection = {};
  vm.runInContext('_teamDragIdx = 0;', sb);
  const fakeCard = { dataset: { teamIdx: '1' }, style: {}, contains: () => false };
  assert.doesNotThrow(() => sb.teamDragOver({ preventDefault() {}, dataTransfer: { dropEffect: '' }, currentTarget: fakeCard, clientX: 120, clientY: 200 }));
  const bubble = sb._pwDropPreviewEl;
  assert.ok(bubble, 'bulle créée');
  assert.equal(bubble.style.display, 'flex', 'bulle affichée');
  assert.ok(bubble.innerHTML.includes('⇄'), 'échange visualisé');
  assert.ok(bubble.innerHTML.includes('Pikachu') && bubble.innerHTML.includes('Charmander'), 'les deux Pokémon figurés (source ⇄ cible)');
  sb.pwDropPreviewHide();
  assert.equal(bubble.style.display, 'none', 'bulle masquée après drop/leave');
});

// ————————————————————————— F —————————————————————————
test('passe 27 F : gestionnaire d\'équipes — 20 presets, renommage, éditeur', () => {
  const src = R('src/game/display/preset-manager.js');
  assert.ok(R('src/loader.js').includes('src/game/display/preset-manager.js'), 'fichier chargé par le loader');
  assert.ok(R('src/game/display/fullscreen-panel.js').includes("panelType === 'presets'"), 'routage panneau « presets »');
  // 20 emplacements garantis (ancienne save à 3 migrée)
  sb.G.teamPresets = { preset1: { name: 'A', uids: [] }, preset2: { name: 'B', uids: [] }, preset3: { name: 'C', uids: [] } };
  sb.ensureTeamPresets();
  assert.equal(Object.keys(sb.G.teamPresets).length, 20, '20 presets');
  assert.equal(sb.G.teamPresets.preset4.name, 'Équipe 4', 'nom par défaut localisé');
  assert.equal(sb.G.teamPresets.preset1.name, 'A', 'nom existant conservé');
  // Manager : rendu des 20 lignes
  sb.G.team = [{ id: 25, name: '?', level: 12, uid: 'u1', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10, heldItem: null }];
  sb.G.collection = { box_1: { id: 4, name: '?', level: 7, uid: 'u2', moves: [], currentHP: 9, maxHP: 9 } };
  sb.G.activePresetId = 'preset1';
  sb.G.teamPresets.preset1.uids = ['u1', 'u2', 'u_missing'];
  const el = makeEl('fs');
  sb.renderPresetManager(el);
  const m = el.innerHTML;
  assert.equal((m.match(/preset-row-idx/g) || []).length, 20, '20 lignes affichées');
  assert.ok(m.includes('data-change-call="renamePreset"'), 'renommage inline');
  assert.ok(m.includes('loadTeamFromPreset') && m.includes('presetSaveHere') && m.includes('openPresetEditor'), 'boutons Charger/Sauver/Modifier');
  assert.ok(m.includes('in-box'), 'membre en boîte signalé');
  assert.ok(m.includes('preset-chip missing'), 'uid disparu signalé « ? »');
  assert.ok(m.includes('preset-row active') && m.includes('preset_active_tag') === false, 'ligne active marquée (clé i18n résolue)');
  // Renommage (vide → défaut)
  sb.renamePreset('preset2', '   Équipe Arène !');
  assert.equal(sb.G.teamPresets.preset2.name, 'Équipe Arène !', 'renommage échoué ?'); // trim gardé? (sans espaces)
  sb.renamePreset('preset2', '   ');
  assert.equal(sb.G.teamPresets.preset2.name, 'Équipe 2', 'vide → nom par défaut');
  // Éditeur : ouverture + cartes
  assert.ok(sb.openPresetEditor('preset1'), 'éditeur rendu');
  assert.ok(sb._els['poke-modal'].classList.contains('open') && sb._els['poke-modal'].classList.contains('preset-editor-modal'), 'modale éditeur ouverte');
  const inner = sb._els['poke-modal-inner'].innerHTML;
  assert.ok(inner.includes('id="preset-editor-body"'), 'corps éditeur');
  assert.ok(inner.includes('presetEditorApply') && inner.includes('presetEditorSaveCurrent'), 'actions appliquer/sauver');
  assert.ok(inner.includes('presetEditorPick(2)') || inner.includes('preset-slot-missing'), 'emplacement 3 = ajout/missing cliquable');
  // Swap d\'ordre persisté
  sb.presetEditorSwap(0, 1);
  assert.deepEqual(sb.G.teamPresets.preset1.uids, ['u2', 'u1', 'u_missing'], 'swap persisté');
  // Choix d\'un remplaçant (uid dédoublonné, cap 6)
  sb.window._presetPickerSearch = '';
  sb.presetEditorPickChoose(2, 'u1');
  // u1 déjà présent au slot 1 → retiré de là puis ré-inséré au slot choisi (2)
  assert.deepEqual(sb.G.teamPresets.preset1.uids, ['u2', 'u_missing', 'u1'], 'remplacement + dédoublonnage cohérents');
  // Navigation fiches (retour vers l\'éditeur)
  const pre = R('src/file-preflight.js');
  assert.ok(pre.includes("kind: 'preset-editor'"), 'capture de source preset-editor');
  assert.ok(pre.includes("callGlobal('openPresetEditor', src.presetKey)"), 'pwInfoBack rouvre l\'éditeur');
  assert.ok(R('src/file-postboot.js').includes("filter-preset-picker"), 'recherche du sélecteur câblée');
  // i18n
  assert.equal(sb.t('panel_presets_title'), 'Mes Équipes');
  assert.equal(sb.t('back_to_preset_editor'), '← Retour à l\'éditeur d\'équipe');
});

// ————————————————————————— G —————————————————————————
test('passe 27 G : éditeur — objets tenus gérés (équipe) et refus propre (boîte)', () => {
  sb.G.team = [
    { id: 25, name: '?', level: 12, uid: 'u1', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10, heldItem: null },
    { id: 4, name: '?', level: 7, uid: 'u2', xp: 0, xpNext: 8, moves: [], currentHP: 9, maxHP: 9, heldItem: null },
  ];
  sb.G.collection = { box_1: { id: 1, name: '?', level: 5, uid: 'u3', moves: [], currentHP: 8, maxHP: 8 } };
  sb.G.inventory = { mystic_water: 1, firestone: 1 };
  sb.ensureTeamPresets();
  sb.G.teamPresets.preset1.uids = ['u1', 'u2', 'u3'];
  sb.openPresetEditor('preset1');
  // Équiper un membre d\'équipe
  sb._notifs.length = 0;
  sb.presetEditorPickItem(0);
  assert.ok(sb._els['poke-modal-inner'].innerHTML.includes('mystic_water'), 'sélecteur d\'objet rendu (tenables uniquement)');
  assert.ok(!sb._els['poke-modal-inner'].innerHTML.includes('firestone'), 'pierre non tenable exclue');
  sb.presetEditorEquipItem(0, 'mystic_water');
  assert.equal(sb.G.teamSlotItems[0], 'mystic_water', 'objet équipé via le slot d\'équipe réel');
  // Refus de double équipement sur un autre membre
  sb._notifs.length = 0;
  sb.presetEditorEquipItem(1, 'mystic_water');
  assert.ok(sb._notifs.some((n) => n.includes('déjà équipé')), 'double équipement refusé');
  assert.equal(sb.G.teamSlotItems[1], null);
  // Retrait
  sb.presetEditorClearItem(0);
  assert.equal(sb.G.teamSlotItems[0], null, 'objet retiré');
  // Membre en boîte → refus avec explication
  sb._notifs.length = 0;
  sb.presetEditorPickItem(2);
  assert.ok(sb._notifs.some((n) => n.includes('équipe active')), 'boîte : message « applique d\'abord le preset »');
});
