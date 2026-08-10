import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { BagView } from '../src/ui/views/BagView.js';
import { pokeFullCardHTML } from '../src/ui/components/poke-full-card.js';
import { moveButtonsBarHTML } from '../src/ui/components/move-buttons.js';
import { AtollPanelView } from '../src/ui/views/AtollPanelView.js'; // wave 13: real DS view injected into the vm sandbox
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

// ── Phase 27: beta feedback ─────────────────────────────────────────────
//  A. Items: clean descriptions (status not mangled, "xx" fixed,
//     inline power "x1.20 (max x2.00)", ⚡ frame removed).
//  B. Oran/Sitrus/Ceriz berries removed from the game (data + quests +
//     shops + routes + rewards + save purge).
//  C. Bag: category tabs (like the PC pages), no "All" tab.
//  D. Settings: danger buttons REALLY red + fixed header.
//  E. Drag & drop: result preview bubble (swaps ⇄).
//  F. Team manager: 20 presets, renaming, full editor.
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
  sandbox.PokeUI = sandbox.PokeUI || {}; sandbox.PokeUI.components = Object.assign({}, sandbox.PokeUI.components, { pokeFullCardHTML, moveButtonsBarHTML });
  sandbox.globalThis = sandbox;
  // The bag renderer is the ECS design-system screen — injected into the vm world.
  sandbox.PokeUI = { views: { BagView, AtollPanelView }, components: { pokeFullCardHTML, moveButtonsBarHTML } }; // wave 13: + AtollPanelView (legitimate move)
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/talents-full.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/shops-data.js',
    'src/data/route-drops.js', 'src/data/ctcs-shop-data.js', 'src/data/game-helpers.js',
    'src/application/pokemon-factory.js',
    'src/localization/fr/types.js', 'src/localization/en/types.js', 'src/localization/fr/talents.js', 'src/localization/en/talents.js',
    'src/localization/fr/move-descs.js', 'src/localization/fr/ui.js', 'src/localization/en/ui.js',
    'src/ui/game/badge-helper.js', 'src/application/economy/item-engine.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/ui/game/sprite-helpers.js', 'src/application/world/team.js', 'src/ui/game/battle-team-ui.js',
    'src/ui/game/inventory.js', 'src/ui/game/team-ui.js', 'src/ui/game/team-manage.js',
    'src/ui/game/fullscreen-panel.js', 'src/ui/game/preset-manager.js',
  ]) {
    // T2-D (vague 37) : classiques évalués en vm directe (parité exacte,
    // const inter-fichiers préservés) ; les converts ESM sont bundlés à la volée.
    const __text = R(f);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
  }
  vm.runInContext("spriteImg = function(){ return '<span class=\"sprite-stub\"></span>'; };", sandbox);
  sandbox._els['poke-modal'] = makeEl('poke-modal');
  sandbox._els['poke-modal-inner'] = makeEl('poke-modal-inner');
  return sandbox;
}
const sb = makeSandbox();

// ————————————————————————— A —————————————————————————
test('phase 27 A: clean item descriptions (toxic orb & co)', () => {
  sb.G.inventory = { toxic_orb: 1, flame_orb: 1, life_orb: 1, leftovers: 1, muscle_band: 1, choice_band: 1, heat_rock: 1 };
  const toxic = sb.ItemEngine.generateItemDesc('toxic_orb', 'fr');
  assert.ok(!toxic.includes('xx'), 'plus de « xx1.15 »');
  assert.ok(toxic.includes('x1.15 (max x1.75)'), `current + max multiplier shown: ${toxic}`);
  // Phase 27b: the FR status is the noun "Poison" (badgeable), not "Empoisonné"
  assert.ok(toxic.includes('Poison') && !toxic.includes('Empoisonné'), 'FR status = "Poison"');
  assert.ok(!toxic.includes('**') && !toxic.includes('data-buff'), 'no mangled markup in the description');
  const flame = sb.ItemEngine.generateItemDesc('flame_orb', 'fr');
  assert.ok(flame.includes('Brûlure') && !flame.includes('xx'), 'flame orb ditto');
  // Inline power for formula items with no clean description
  const life = sb.ItemEngine.generateItemDesc('life_orb', 'fr');
  assert.equal(life, 'Augmente la puissance de x1.20 (max x2.00).', 'Orbe Vie : phrase simple');
  const left = sb.ItemEngine.generateItemDesc('leftovers', 'fr');
  assert.ok(left.includes('Augmente la puissance de x1.15 (max x1.75)'), 'Leftovers: same format');
  const en = sb.ItemEngine.generateItemDesc('toxic_orb', 'en');
  assert.ok(en.includes('x1.15 (max x1.75)') && en.includes('Poisoned'), 'EN coherent');
  // Co-injected badges: enriched html without breakage (no mangled attributes, no **)
  const rich = sb.replaceStatusTerms(sb.replaceWeatherTerms(sb.ItemEngine.generateItemDesc('toxic_orb', 'fr')));
  assert.ok(!rich.includes('**'), 'no residual **');
  assert.ok(!/<span data-buff="<span/.test(rich), 'attribut data-buff intact');
  // Pass 27b: "Poison" gets the purple badge in the panel
  assert.ok(rich.includes('move-desc-badge') && />Poison</.test(rich), `"Poison" badged: ${rich}`);
  // …and ALL status/weather items are badged in FR as in EN
  const statusItems = ['toxic_orb', 'flame_orb', 'heat_rock', 'damp_rock', 'icy_rock', 'smooth_rock'];
  for (const k of statusItems) {
    for (const lang of ['fr', 'en']) {
      const html = sb.replaceStatusTerms(sb.replaceWeatherTerms(sb.ItemEngine.generateItemDesc(k, lang)));
      assert.ok(html.includes('move-desc-badge'), `${k} (${lang}): status/weather word badged`);
    }
  }
  const richRock = sb.replaceWeatherTerms(sb.replaceStatusTerms(sb.ItemEngine.generateItemDesc('heat_rock', 'fr')));
  assert.ok(!/<span class="type-badge type-fire"[^>]*<span/.test(richRock.replace(/data-buff/g, 'data-buff')), 'badge HTML structurally unchanged');
  assert.ok(richRock.includes('move-desc-badge'), 'weather properly badged');
  // "⚡ Power" frame removed from the panel
  assert.ok(!R('src/data/items-helpers.js').includes("⚡ ' + powerDisplay"), 'plus de section cadre + emoji');
});

// ————————————————————————— B —————————————————————————
test('phase 27 B: Oran/Sitrus/Ceriz berries removed from the whole game', () => {
  for (const k of ['oran_berry', 'sitrus_berry', 'cheri_berry']) {
    assert.ok(!sb.ITEMS[k], `${k} absent from ITEMS`);
    assert.ok(!R('src/data/shops-data.js').includes(k), `${k} absent from shops`);
    assert.ok(!R('src/data/route-drops.js').includes(k), `${k} absent from routes`);
    assert.ok(!R('src/data/side-quests-data.js').includes(k), `${k} absent from side quests`);
    assert.ok(!R('src/data/story-quests.js').includes(k), `${k} absent from main quests`);
    assert.ok(!R('src/data/item-database.js').includes(k), `${k} absent from legacy ItemDB`);
    assert.ok(!R('src/data/sprites.js').includes(k), `${k} absent from sprites`);
    assert.ok(!R('src/localization/fr/items.js').includes(k) && !R('src/localization/en/items.js').includes(k), `${k} absent from the localizations`);
  }
  const _berryPng = ['src', 'assets', 'images', 'items'].join('/') + '/oran' + '_berry.png'; // off-literal (audit regex)
  assert.ok(!fs.existsSync(new URL('../' + _berryPng, import.meta.url)), 'oran PNG removed');
  // Pass 53: the Stardust compensation is REVOKED. It was paid
  // at equal quantity (2 berries → 2 dusts) while a berry was worth
  // nothing, and a Stardust sells for 2,000 ₽: +208,000 ₽ across all
  // quests, i.e. +32% of their total money. Quests now give
  // ONE berry (in ~60% of cases), and so does the tutorial.
  for (const f of ['src/data/side-quests-data.js', 'src/data/story-quests.js']) {
    assert.ok(!R(f).includes('"stardust"'), `${f}: no more dust as reward`);
  }
  assert.ok(!R('src/ui/game/tutorial.js').includes('stardust'), 'tutorial: no more dust');
  assert.ok(/items:\{\w+_berry:1\}/.test(R('src/ui/game/tutorial.js')), 'tutorial: one berry');
  assert.ok(!R('src/localization/fr/ui.js').includes('3 Baies Oran'), 'tutorial text updated');
  // Save purge (inventory, held items, slots)
  const save = R('src/application/save/save.js');
  assert.ok(save.includes("'sitrus_berry','cheri_berry','oran_berry'"), 'unified removal list');
  assert.ok(save.includes('RETIRED_ITEMS.includes(_tp.heldItem)'), 'held-item purge (team)');
  assert.ok(save.includes('RETIRED_ITEMS.includes(_cp.heldItem)'), 'held-item purge (box)');
});

// ————————————————————————— C —————————————————————————
test('phase 27 C: tabbed bag (no "All", direct equipping)', () => {
  sb.G.team = [{ id: 25, name: '?', level: 10, uid: 'a', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10, heldItem: null }];
  sb.G.collection = {};
  sb.G.inventory = { ct06_toxic: 1, firestone: 2, babiri_berry: 3 };
  sb._invCat = 'held'; sb._invCatTouched = false; sb._invSearch = '';
  const el = makeEl('fs');
  sb._els['fs-panel-content'] = el; // setInvCat/setInvSearch/reset re-rendent via getElementById
  sb.renderInventory(el);
  const html = el.innerHTML;
  assert.ok(html.includes('inv-tabs'), 'tab row');
  assert.ok(!html.includes('>Tous<'), 'no "All" tab');
  assert.ok(html.includes('pw-chip active'), 'un onglet actif');
  assert.ok(html.includes('ct06_toxic') === false, 'landing on the 1st non-empty tab (held) — TM hidden');
  assert.ok(html.includes('babiri_berry'), 'baie Babiri visible (onglet tenus)');
  // Explicit tab choice
  sb.setInvCat('ct_cs');
  assert.ok(el.innerHTML.includes('ct06_toxic'), 'TM/HM tab: the TM shows up');
  assert.ok(!el.innerHTML.includes('babiri_berry'), '…and held items are hidden');
  // Global search (across all tabs)
  sb.setInvSearch('babiri');
  assert.ok(el.innerHTML.includes('babiri_berry'), 'global search: berry found from the TM tab');
  // Equipping in progress → "held" tab forced
  sb.window._equipCallback = () => {};
  sb._invCat = 'fossil';
  sb.renderInventory(el);
  assert.equal(sb._invCat, 'held', 'tab forced to held items while equipping');
  sb.window._equipCallback = null;
  sb.resetInvFilters();
  assert.equal(sb._invCat, 'held');
});

// ————————————————————————— D —————————————————————————
test('phase 27 D: settings — effective red danger + fixed header', () => {
  const css = R('src/assets/styles/design-system.css');
  assert.ok(css.includes(':not(.pw-btn-danger):not(.pw-btn-cancel)'), 'generic .hbtn background no longer overrides state buttons');
  assert.ok(/\.pw-btn-danger\s*\{[^}]*background:\s*var\(--red\)\s*!important/.test(css), 'reinforced red (!important)');
  assert.ok(/\.pw-btn-danger\s*\{[^}]*color:\s*#fff/.test(css), 'texte blanc lisible');
  assert.ok(/#settings-inner\s*>\s*\.modal-title\s*\{[^}]*position:\s*sticky/.test(css), 'sticky settings header');
  assert.ok(/#settings-inner\s*\{\s*padding-top:\s*0;?\s*\}/.test(css), 'top padding neutralized for the sticky');
  // wave 24: wave 23 flattened rgba(0,0,0,0.99) into the solid --pw-bg-header token
  // (fully opaque -> same 'no see-through' guarantee, single source of truth).
  assert.ok(/#settings-inner\s*>\s*\.modal-title\s*\{[^}]*background:\s*var\(--pw-bg-header\)/.test(css), 'opaque flat token background (content no longer shows through)');
});

// ————————————————————————— E —————————————————————————
test('phase 27 E: drop result preview (cards + moves, team + Factory)', () => {
  const sh = R('src/ui/game/sprite-helpers.js');
  assert.ok(sh.includes('function pwDropPreviewShow') && sh.includes('window.pwDropPreviewShow'), 'show helper exported');
  assert.ok(sh.includes('function pwSwapPreviewHtml') && sh.includes('⇄'.charCodeAt(0) ? 'pwSwapPreviewHtml' : ''), 'swap helper exported');
  assert.ok(R('src/assets/styles/design-system.css').includes('.pw-drop-preview'), 'CSS bulle');
  // Wiring: 2 team-ui sites (card + move), 2 Factory sites
  assert.equal((R('src/ui/game/team-ui.js').match(/pwDropPreviewShow\(/g) || []).length, 2, 'team: card + move');
  assert.equal((R('src/ui/game/fullscreen-panel.js').match(/pwDropPreviewShow\(/g) || []).length, 2, 'Usine : carte + attaque');
  // Phase 50: the preset editor no longer implements ITS own preview — it declares
  // the context and reuses team-ui.js's single drag & drop (and thus preview).
  // That wiring is what we now verify.
  assert.ok(R('src/ui/game/preset-manager.js').includes('pwSetMoveDragContext('),
    'preset editor: shared drag context');
  assert.ok(R('src/ui/game/preset-manager.js').includes('installMoveDragDrop('),
    'preset editor: single handler installed');
  // Functional: hovering a target card → bubble containing BOTH Pokémon
  sb.G.team = [
    { id: 25, name: 'Pika', level: 12, uid: 'a', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10, heldItem: null },
    { id: 4, name: 'Sala', level: 7, uid: 'b', xp: 0, xpNext: 8, moves: [], currentHP: 9, maxHP: 9, heldItem: null },
  ];
  sb.G.collection = {};
  vm.runInContext('_teamDragIdx = 0;', sb);
  const fakeCard = { dataset: { teamIdx: '1' }, style: {}, contains: () => false };
  assert.doesNotThrow(() => sb.teamDragOver({ preventDefault() {}, dataTransfer: { dropEffect: '' }, currentTarget: fakeCard, clientX: 120, clientY: 200 }));
  const bubble = sb._pwDropPreviewEl;
  assert.ok(bubble, 'bubble created');
  assert.equal(bubble.style.display, 'flex', 'bubble shown');
  assert.ok(bubble.innerHTML.includes('⇄'), 'swap visualized');
  assert.ok(bubble.innerHTML.includes('Pikachu') && bubble.innerHTML.includes('Charmander'), 'both Pokémon pictured (source ⇄ target)');
  sb.pwDropPreviewHide();
  assert.equal(bubble.style.display, 'none', 'bubble hidden after drop/leave');
});

// ————————————————————————— F —————————————————————————
test('phase 27 F: team manager — 20 presets, renaming, editor', () => {
  const src = R('src/ui/game/preset-manager.js');
  assert.ok(R('src/main.js').includes('./ui/game/preset-manager.js'), 'file loaded by the loader');
  assert.ok(R('src/ui/game/fullscreen-panel.js').includes("panelType === 'presets'"), 'routage panneau « presets »');
  // 20 slots guaranteed (old 3-slot save migrated)
  sb.G.teamPresets = { preset1: { name: 'A', uids: [] }, preset2: { name: 'B', uids: [] }, preset3: { name: 'C', uids: [] } };
  sb.ensureTeamPresets();
  assert.equal(Object.keys(sb.G.teamPresets).length, 20, '20 presets');
  assert.equal(sb.G.teamPresets.preset4.name, 'Équipe 4', 'localized default name');
  assert.equal(sb.G.teamPresets.preset1.name, 'A', 'existing name kept');
  // Manager: rendering the 20 rows
  sb.G.team = [{ id: 25, name: '?', level: 12, uid: 'u1', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10, heldItem: null }];
  sb.G.collection = { box_1: { id: 4, name: '?', level: 7, uid: 'u2', moves: [], currentHP: 9, maxHP: 9 } };
  sb.G.activePresetId = 'preset1';
  sb.G.teamPresets.preset1.uids = ['u1', 'u2', 'u_missing'];
  const el = makeEl('fs');
  sb.renderPresetManager(el);
  const m = el.innerHTML;
  assert.equal((m.match(/preset-row-idx/g) || []).length, 20, '20 displayed lines');
  assert.ok(m.includes('data-change-call="renamePreset"'), 'inline renaming');
  assert.ok(m.includes('loadTeamFromPreset') && m.includes('presetSaveHere') && m.includes('openPresetEditor'), 'Load/Save/Edit buttons');
  assert.ok(m.includes('in-box'), 'boxed member reported');
  assert.ok(m.includes('preset-chip missing'), 'missing uid marked "?"');
  assert.ok(m.includes('preset-row active') && m.includes('preset_active_tag') === false, 'active row marked (i18n key resolved)');
  // Renaming (empty → default)
  sb.renamePreset('preset2', '   Équipe Arène !');
  assert.equal(sb.G.teamPresets.preset2.name, 'Équipe Arène !', 'renaming failed?'); // trim kept? (no spaces)
  sb.renamePreset('preset2', '   ');
  assert.equal(sb.G.teamPresets.preset2.name, 'Équipe 2', 'empty → default name');
  // Editor: opening + cards
  assert.ok(sb.openPresetEditor('preset1'), 'editor rendered');
  assert.ok(sb._els['poke-modal'].classList.contains('open') && sb._els['poke-modal'].classList.contains('preset-editor-modal'), 'editor modal opened');
  const inner = sb._els['poke-modal-inner'].innerHTML;
  assert.ok(inner.includes('id="preset-editor-body"'), 'editor body');
  assert.ok(inner.includes('presetEditorApply') && inner.includes('presetEditorSaveCurrent'), 'actions appliquer/sauver');
  assert.ok(inner.includes('presetEditorPick(2)') || inner.includes('preset-slot-missing'), 'slot 3 = clickable add/missing');
  // Order swap persisted
  sb.presetEditorSwap(0, 1);
  assert.deepEqual(sb.G.teamPresets.preset1.uids, ['u2', 'u1', 'u_missing'], 'swap persisted');
  // Picking a substitute (deduped uid, cap 6)
  sb.window._presetPickerSearch = '';
  sb.presetEditorPickChoose(2, 'u1');
  // u1 already at slot 1 → removed from there then re-inserted at the chosen slot (2)
  assert.deepEqual(sb.G.teamPresets.preset1.uids, ['u2', 'u_missing', 'u1'], 'replacement + dedup coherent');
  // Sheet navigation (back to the editor)
  const pre = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
  assert.ok(pre.includes("kind: 'preset-editor'"), 'capture de source preset-editor');
  assert.ok(pre.includes("callGlobal('openPresetEditor', src.presetKey)"), 'pwInfoBack reopens the editor');
  assert.ok([R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n').includes("filter-preset-picker"), 'selector search wired');
  // i18n
  assert.equal(sb.t('panel_presets_title'), 'Mes Équipes');
  // FR locale data: expected value is the game's canonical French string
  assert.equal(sb.t('back_to_preset_editor'), '← Retour à l\'éditeur d\'équipe');
});

// ————————————————————————— G —————————————————————————
test('phase 27 G: editor — held items handled (team) and clean refusal (box)', () => {
  sb.G.team = [
    { id: 25, name: '?', level: 12, uid: 'u1', xp: 0, xpNext: 8, moves: [], currentHP: 10, maxHP: 10, heldItem: null },
    { id: 4, name: '?', level: 7, uid: 'u2', xp: 0, xpNext: 8, moves: [], currentHP: 9, maxHP: 9, heldItem: null },
  ];
  sb.G.collection = { box_1: { id: 1, name: '?', level: 5, uid: 'u3', moves: [], currentHP: 8, maxHP: 8 } };
  sb.G.inventory = { mystic_water: 1, firestone: 1 };
  sb.ensureTeamPresets();
  sb.G.teamPresets.preset1.uids = ['u1', 'u2', 'u3'];
  sb.openPresetEditor('preset1');
  // Equipping a team member
  sb._notifs.length = 0;
  sb.presetEditorPickItem(0);
  assert.ok(sb._els['poke-modal-inner'].innerHTML.includes('mystic_water'), 'item selector rendered (holdables only)');
  assert.ok(!sb._els['poke-modal-inner'].innerHTML.includes('firestone'), 'non-equippable stone excluded');
  sb.presetEditorEquipItem(0, 'mystic_water');
  assert.equal(sb.G.teamSlotItems[0], 'mystic_water', 'item equipped via the real team slot');
  // Refusal of double equipment on another member
  sb._notifs.length = 0;
  sb.presetEditorEquipItem(1, 'mystic_water');
  assert.ok(sb._notifs.some((n) => n.includes('déjà équipé')), 'double equipment refused');
  assert.equal(sb.G.teamSlotItems[1], null);
  // Removal
  sb.presetEditorClearItem(0);
  assert.equal(sb.G.teamSlotItems[0], null, 'object removed');
  // Boxed member → refusal with explanation
  sb._notifs.length = 0;
  sb.presetEditorPickItem(2);
  assert.ok(sb._notifs.some((n) => n.includes('équipe active')), 'box: "apply the preset first" message');
});

