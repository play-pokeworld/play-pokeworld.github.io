import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { BagView } from '../src/ui/views/BagView.js';
import { SettingsModalView } from '../src/ui/views/SettingsModalView.js';
import { AtollPanelView } from '../src/ui/views/AtollPanelView.js'; // wave 13: real DS view injected into the vm sandbox
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

// ── Phase 26: beta QoL ───────────────────────────────────────────────────
//  A. All TMs/HMs of the right versions purchasable, scattered across
//     every shop of both regions (1 single shop per TM).
//  B. Info panels: "where to find" (items) and "who can have it"
//     (moves/abilities, including hidden-ability holders).
//  C. Streamlined dictionary: no more locations or lists in the tiles.
//  D. Bag: berries = held items, "Misc" filter removed, same
//     sort/filter/search bar as the PC box.
//  E. Settings: red save deletion + warning.
//  F. Unified drag & drop preview (Pokémon, moves, windows).
//  G. Team presets: member preview.
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
  // The bag renderer is the ECS design-system screen — injected into the vm world.
  sandbox.PokeUI = { views: { BagView, AtollPanelView } }; // wave 13: + AtollPanelView (legitimate move)
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js',
    'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/talents-full.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js',
    'src/data/shops-data.js', 'src/data/route-drops.js', 'src/data/ctcs-shop-data.js',
    'src/data/game-helpers.js', 'src/application/pokemon-factory.js',
    'src/localization/fr/types.js', 'src/localization/en/types.js',
    'src/localization/fr/talents.js', 'src/localization/en/talents.js',
    'src/localization/fr/move-descs.js',
    'src/localization/fr/ui.js', 'src/localization/en/ui.js',
    'src/ui/game/badge-helper.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/ui/game/sprite-helpers.js',
    'src/ui/game/inventory.js',
    'src/ui/game/team-ui.js',
    'src/ui/game/fullscreen-panel.js',
  ]) {
    // T2-D (vague 37) : classiques évalués en vm directe (parité exacte,
    // const inter-fichiers préservés) ; les converts ESM sont bundlés à la volée.
    const __text = R(f);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
  }
  // The real spriteImg requires SPRITE_DATA (assets) — light stub for tests.
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
test('phase 26 A: every gen ≤ 2 TM is sold in exactly ONE shop', () => {
  assert.ok(sb.CTCS_SHOP_STOCK && sb.CTCS_META && sb.CTCS_UNSOLD, 'generated TM/HM data loaded');
  const allCtKeys = Object.keys(sb.ITEMS).filter((k) => /^ct/.test(k) && sb.ITEMS[k] && sb.ITEMS[k].moveId);
  const sold = Object.values(sb.CTCS_SHOP_STOCK).flat();
  assert.equal(new Set(sold).size, sold.length, 'no TM sold twice');
  // Strong invariant: sold ∪ unsold (gen 3+) = all existing TMs
  assert.equal(sold.length + sb.CTCS_UNSOLD.length, allCtKeys.length, 'every TM is either sold or explicitly unsold');
  for (const k of sb.CTCS_UNSOLD) assert.ok(!sold.includes(k), `gen 3+ TM never sold: ${k}`);
  // Kanto = 1st-generation moves only
  for (const shopId of ['pallet', 'viridian', 'pewter', 'cerulean', 'vermilion', 'lavender', 'celadon', 'fuchsia', 'cinnabar', 'indigo']) {
    for (const k of sb.CTCS_SHOP_STOCK[shopId] || []) assert.equal(sb.CTCS_META[k].gen, 1, `${shopId} (Kanto) sells ${k} (gen ${sb.CTCS_META[k].gen}) — forbidden`);
  }
  // Every sold TM exists, teaches a MOVES move and has a price (patch applied)
  for (const k of sold) {
    assert.ok(sb.ITEMS[k], `${k} existe`);
    assert.ok(sb.MOVES[sb.CTCS_META[k].move], `${k} → known move (${sb.CTCS_META[k].move})`);
    assert.ok(sb.ITEMS[k].price > 0, `${k} has a price (${sb.ITEMS[k].price}₽)`);
  }
  // The 20 shops of both regions each offer at least one TM (scattering)
  for (const shopId of ['pallet', 'viridian', 'pewter', 'cerulean', 'vermilion', 'lavender', 'celadon', 'fuchsia', 'cinnabar', 'indigo', 'jnewbark', 'jcherrygrove', 'jviolet', 'jazalea', 'jgoldenrod', 'jecruteak', 'jolivine', 'jmahogany', 'jcianwood', 'jblackthorn']) {
    assert.ok((sb.CTCS_SHOP_STOCK[shopId] || []).length >= 1, `${shopId} offers at least one TM`);
  }
  // Shop wiring + loader
  assert.ok(R('src/ui/game/shop-panel.js').includes('CTCS_SHOP_STOCK[shopId]'), 'renderShop merges the TM/HM stock');
  assert.ok(R('src/main.js').includes('./data/ctcs-shop-data.js'), 'loader loads the TM/HM data');
});

// ————————————————————————— B —————————————————————————
test('phase 26 B: info panels — where to find / who can have it', () => {
  // Item sources: route + shop + atoll + TM
  const prine = sb.getItemSourceList('prine_berry'); // phase 27: Oran berry removed from the game → witness = Prine berry
  assert.ok(prine.some((s) => s.startsWith('🗺️')), 'Prine berry found on routes');
  assert.ok(prine.some((s) => s.startsWith('🏬')), 'baie Prine vendue en boutique');
  const leftovers = sb.getItemSourceList('leftovers');
  assert.ok(leftovers.some((s) => s.includes('Atoll')), 'Leftovers findable at the Atoll (tokens)');
  const aCt = Object.values(sb.CTCS_SHOP_STOCK)[0][0];
  assert.ok(sb.getItemSourceList(aCt).some((s) => s.includes('· CT')), `TM ${aCt} is sourced "TM shop"`);
  // Who can learn: classic gen-1 TM move
  const learners = sb.getMoveLearners('ice_beam');
  const total = learners.level.length + learners.ctcs.length + learners.training.length;
  assert.ok(total > 0, 'ice_beam has learners');
  for (const id of [...learners.level, ...learners.ctcs, ...learners.training]) assert.ok(id >= 1 && id <= (sb.PD.length - 1) && sb.PD[id], 'valid learner');
  assert.equal(sb.getMoveLearners('').training.length, 0, 'empty move → nobody');
  // Wiring of the three panels
  assert.ok(R('src/ui/game/poke-modal.js').includes('getMoveLearners(moveId)'), 'openMoveInfo: learners section');
  assert.ok(R('src/ui/game/poke-modal.js').includes("t('learners_' + catKey)"), 'openMoveInfo: 3 legitimate categories');
  assert.ok(R('src/data/items-helpers.js').includes('getItemSourceList(key)'), 'openItemInfo: full sources');
  assert.ok(R('src/ui/game/fullscreen-panel.js').includes('hiddenCarriers'), 'openAbilityInfo: hidden-ability holders');
  // i18n FR
  // FR locale data: expected value is the game's canonical French string
  assert.equal(sb.t('learners_training'), 'Par dressage');
  assert.equal(sb.t('hidden_carriers'), 'Talent caché de…');
});

// ————————————————————————— C —————————————————————————
test('phase 26 C: streamlined dictionary (no more locations or lists)', () => {
  const src = R('src/ui/game/fullscreen-panel.js');
  assert.ok(!src.includes('<small>${sources'), 'item tiles: locations removed');
  assert.ok(!src.includes('${users.slice(0,4)'), 'move/ability tiles: lists removed');
  assert.ok(!src.includes('dict_ability_carriers'), 'ability tiles: holders removed');
  assert.ok(src.includes('findItemSources(key){\n const list = (typeof getItemSourceList'), 'findItemSources delegates to getItemSourceList');
});

// ————————————————————————— D —————————————————————————
test('phase 26 D: bag — berries = held items, "Misc" removed, PC-box bar', () => {
  assert.equal(sb.itemCat('babiri_berry'), 'held', 'Babiri Berry = held item');
  assert.equal(sb.itemCat('stardust'), 'treasure', 'Stardust = treasure');
  assert.equal(sb.itemCat('prine_berry'), 'held', 'Prine Berry = held item');
  assert.equal(sb.itemCat('ct06_toxic'), 'ct_cs', 'TM classified TM/HM');
  assert.equal(sb.itemCat('firestone'), 'evolution', 'fire stone = evolution');
  assert.equal(sb.itemCat('zzz_inconnu'), 'special', 'inconnu → special (plus de misc)');
  // Rendering: unified bar + no berry/misc option + item rows
  sb.G.inventory = { babiri_berry: 3, ct06_toxic: 1, firestone: 2 };
  const el = makeFakeEl();
  assert.doesNotThrow(() => sb.renderInventory(el), 'bag render without full DOM');
  const html = el.innerHTML;
  assert.ok(html.includes('box-filter-panel'), 'same filter panel as the PC box');
  assert.ok(html.includes('inv-tabs'), 'category tabs (phase 27)');
  assert.ok(!html.includes('>Tous<') && !html.includes('m.inventory.12'), 'no "All" tab');
  assert.ok(html.includes('data-action="filter-bag"'), 'bag search');
  assert.ok(html.includes('data-call="resetInvFilters"'), 'reset button');
  assert.ok(!html.includes('value="berry"') && !html.includes('value="misc"'), 'berry/misc filters removed');
  assert.ok(html.includes('Baie Babiri') || html.includes('babiri_berry'), 'item listed');
  // Tri + filtre + recherche effectifs
  sb._invSearch = 'toxi';
  sb.renderInventory(el);
  assert.ok(el.innerHTML.includes('ct06_toxic') && !el.innerHTML.includes('babiri_berry'), 'filtering search (global, all tabs)');
  sb.resetInvFilters();
  assert.equal(sb._invCat, 'held');
  assert.equal(sb._invSearch, '', 'full reset');
});

// ————————————————————————— E —————————————————————————
test('phase 26 E: red and warned save deletion', () => {
  // UI overhaul: the settings modal body moved from static index.html
  // markup to the ECS SettingsModalView (rendered from zero at open time
  // — same flow, same intent, new path). The adapter still builds it.
  const settings = R('src/application/save/settings.js');
  assert.ok(settings.includes('buildSettingsModel') && settings.includes('views.SettingsModalView.toHTML'), 'settings.js renders the flow through SettingsModalView');
  // Render the REAL view with the adapter's model shape and the real FR
  // labels (sb.t is the game's t()).
  const html = SettingsModalView.toHTML({
    currentLang: 'fr', currentTheme: 'dark',
    lang: { heading: sb.t('lang_title'), choices: [{ label: 'Français', lang: 'fr' }, { label: 'English', lang: 'en' }] },
    theme: { heading: sb.t('theme_title'), swatches: [{ label: sb.t('theme_dark'), theme: 'dark' }] },
    save: {
      heading: sb.t('save_title'), saveLabel: sb.t('save_btn'), loadLabel: sb.t('load_btn'),
      exportLabel: sb.t('export_btn'), importLabel: sb.t('import_btn'),
      deleteLabel: sb.t('delete_save_btn'), deleteWarning: sb.t('delete_save_warning'),
      confirmLabel: sb.t('confirm_delete_btn'), cancelLabel: sb.t('cancel_btn'),
    },
  });
  assert.ok(/data-action="confirm-delete"[^>]*pw-btn-danger|pw-btn-danger[^>]*data-action="confirm-delete"/.test(html), 'red delete button');
  assert.ok(/data-action="do-delete"[^>]*pw-btn-danger|pw-btn-danger[^>]*data-action="do-delete"/.test(html), 'red confirm button');
  assert.ok(html.includes('delete-danger-zone'), 'danger zone wrapper');
  assert.ok(html.includes(sb.t('delete_save_warning')), 'irreversible warning shown');
  assert.equal(sb.t('delete_save_warning'), '⚠️ Cette action est irréversible : toute ta progression sera effacée.', 'FR label');
  assert.ok(R('src/assets/styles/design-system.css').includes('.delete-danger-zone'), 'danger zone CSS');
});

// ————————————————————————— F —————————————————————————
test('phase 26 F: unified drag thumbnail everywhere', () => {
  // Helper present and exported
  const sh = R('src/ui/game/sprite-helpers.js');
  assert.ok(sh.includes('function pwApplyDragGhost') && sh.includes('window.pwApplyDragGhost'), 'helper defined + exported');
  assert.ok(R('src/assets/styles/design-system.css').includes('.pw-drag-ghost'), 'CSS vignette');
  // The 5 drag sites use it
  assert.equal((R('src/ui/game/team-ui.js').match(/pwApplyDragGhost\(ev/g) || []).length, 2, 'team card + team move');
  assert.equal((R('src/ui/game/fullscreen-panel.js').match(/pwApplyDragGhost\(ev/g) || []).length, 2, 'carte Usine + attaque Usine');
  assert.ok(R('src/ui/game/win-drag.js').includes('pwDragGhostHtml('), 'windows (same look)');
  // Functional: browserless image capture
  let captured = null;
  sb.document.createElement = () => ({ style: {}, innerHTML: '', className: '', remove() {} });
  const ev = { dataTransfer: { setDragImage: (el, x, y) => { captured = { el, x, y }; }, effectAllowed: '', setData() {} } };
  sb.pwApplyDragGhost(ev, { icon: '<i>X</i>', title: 'Ratata', sub: 'Nv.5' });
  assert.ok(captured && captured.el && captured.el.className === 'pw-drag-ghost', 'thumbnail placed on the drag');
  assert.ok(captured.el.innerHTML.includes('Ratata'), 'vignette contient le nom');
});

// ————————————————————————— G —————————————————————————
test('phase 26 G: previewed team presets', () => {
  sb.G.teamPresets = { preset1: { name: 'A', uids: ['u1', 'u2', 'u3'] }, preset2: { name: 'B', uids: [] }, preset3: { name: 'C', uids: [] } };
  sb.G.activePresetId = 'preset1';
  sb.G.team = [{ id: 25, name: 'Pikachu', level: 12, uid: 'u1', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10 }];
  sb.G.collection = { box_1: { id: 4, name: 'Salamèche', level: 7, uid: 'u2', moves: [], currentHP: 9, maxHP: 9 } };
  const html = sb.renderTeamPresetsToolbar();
  // Phase 27: the bar becomes the team-manager button; the
  // preview chips live in the "My Teams" panel (phase 27 follow-up).
  assert.ok(html.includes('openPresetManager'), 'team-manager button');
  assert.ok(html.includes('teams_manager_open') === false, 'label resolved (i18n key)');
});

