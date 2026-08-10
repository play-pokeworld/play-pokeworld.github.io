import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { BagView } from '../src/ui/views/BagView.js';
import { BasePcDialogView, BaseNpcDialogView } from '../src/ui/views/BaseViews.js'; // wave 22 (legitimate move)
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

const R = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function makeSandbox() {
  const G = {
    team: [],
    collection: {},
    pokedex: {},
    inventory: {},
    money: 10000,
    region: 'kanto',
    location: 'pallet',
    badges: [],
    defeatedChamps: {},
    evolvedSpecies: [],
    lang: 'fr',
    boxFilters: {},
    repeatables: [],
    hatchery: [],
    training: []
  };
  const sandbox = {
    console,
    window: {},
    G,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    safeStorage: { get: () => null, set: () => {}, remove: () => {} },
    document: {
      documentElement: { lang: 'fr' },
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => ({ style: {}, innerHTML: '', textContent: '', replaceChildren() { this.innerHTML = ''; }, remove: () => {}, classList: { add: () => {}, remove: () => {} } }),
      createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, classList: { add: () => {}, remove: () => {} }, style: {} }),
      body: { classList: { add: () => {}, remove: () => {} }, appendChild: () => {} }
    },
    Math, Date, Object, Array, String, Number, Boolean, Set, Map, RegExp, parseInt, parseFloat,
    setTimeout: (fn) => fn(), clearTimeout: () => {},
    setInterval: (fn) => fn(), clearInterval: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    showTab: () => {}, updateHeader: () => {}, renderTeamWindow: () => {}, renderHatcheryWindow: () => {}, renderMap: () => {}, notify: () => {}, saveGame: () => {}, closeUnifiedSelectorModal: () => {},
    CustomEvent: class CustomEvent { constructor(type, opts) { this.type = type; this.detail = opts?.detail; } },
    t: (k) => k,
    tr: (k) => k
  };
  sandbox.window = sandbox;
  // The bag renderer is the ECS design-system screen — injected into the vm world.
  sandbox.PokeUI = { views: { BagView, BasePcDialogView, BaseNpcDialogView } }; // wave 22: base dialogs rendered by the ECS views (legitimate move)
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const files = [
    'src/data/game-config.js',
    'src/data/pd-data.js',
    'src/data/moves.js',
    'src/data/talents-data.js',
    'src/data/items-data.js',
    'src/data/items-helpers.js',
    'src/data/locations-data.js',
    'src/data/locations-johto.js',
    'src/data/locations-hoenn.js',
    'src/data/shops-data.js',
    'src/data/shops-hoenn.js',
    'src/localization/fr/ui.js',
    'src/localization/en/ui.js',
    'src/localization/fr/shops.js',
    'src/localization/en/shops.js',
    'src/localization/data.js',
    'src/localization/i18n.js',
    'src/application/pokemon-factory.js',
    'src/data/game-helpers.js',
    'src/application/world/collection.js',
    'src/ui/game/box-ui.js',
    'src/ui/game/inventory.js',
    'src/application/economy/inventory-actions.js',
    'src/ui/game/fullscreen-panel.js',
    'src/application/save/save.js',
    'src/application/save/settings.js',
    'src/data/story-quests-hoenn.js',
    'src/ui/game/base/base-dialog.js'
  ];

  for (const f of files) {
    // T2-D (vague 37) : classiques évalués en vm directe (parité exacte,
    // const inter-fichiers préservés) ; les converts ESM sont bundlés à la volée.
    const __text = R(f);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
  }
  return sandbox;
}

test('Fix 1: repairMissingBoxPokemon restores Box entries and syncs Pokédex', () => {
  const sandbox = makeSandbox();
  sandbox.G.pokedex = {
    1: { seen: true, caught: true },
    4: { seen: true, caught: false }
  };
  sandbox.G.collection = {};

  const repaired = sandbox.window.repairMissingBoxPokemon(sandbox.G);
  assert.equal(repaired, true);
  assert.equal(Object.keys(sandbox.G.collection).length, 1, 'Should restore Bulbizarre (#1) into Box');
  const restoredMon = Object.values(sandbox.G.collection)[0];
  assert.equal(restoredMon.id, 1);
});

test('Fix 2: isEvolutionItem identifies metal_coat and isUsableBagItem recognizes it', () => {
  const sandbox = makeSandbox();

  assert.equal(sandbox.window.isEvolutionItem('metal_coat'), true);
  assert.equal(sandbox.window.isEvolutionItem('kings_rock'), true);
  assert.equal(sandbox.window.isEvolutionItem('upgrade'), true);
  assert.equal(sandbox.window.isUsableBagItem('metal_coat'), true);
});

test('Fix 3: getShopName returns clean localized names without shops.id.name', () => {
  const sandbox = makeSandbox();

  sandbox.window.setLanguage('fr');
  const frName = sandbox.window.getShopName('jgoldenrod');
  assert.equal(frName, 'Grand Magasin Doublonville');

  sandbox.window.setLanguage('en');
  const enName = sandbox.window.getShopName('jgoldenrod');
  assert.equal(enName, 'Goldenrod Dept. Store');
});

test('Fix 4: opening bag from shortcut or closing modal clears equip mode callback', () => {
  const sandbox = makeSandbox();

  sandbox.window._equipCallback = () => {};
  sandbox.window._isEquipOpen = false;
  sandbox.window.openFullscreenPanel('inventory');
  assert.equal(sandbox.window._equipCallback, null, 'openFullscreenPanel without _isEquipOpen should clear _equipCallback');

  sandbox.window._equipCallback = () => {};
  sandbox.window.closeFullscreenPanel();
  assert.equal(sandbox.window._equipCallback, null, 'closeFullscreenPanel should always clear _equipCallback');
});

test('Fix 5: pw-unified.css enforces high-contrast visibility on cards, items, and active buttons', () => {
  const css = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
  assert.ok(css.includes('UNIVERSAL CONTRAST & VISIBILITY SYSTEM'), 'Should contain universal contrast system block');
  assert.ok(css.includes('.pw-choice-sub') && css.includes('#c9bc8a !important'), 'pw-choice-sub should be styled with high-contrast gold #c9bc8a');
  assert.ok(css.includes('.inv-item:hover') && css.includes('rgba(236, 222, 183, 0.15) !important'), 'inv-item hover should keep readable dark card background');
  assert.ok(css.includes('.hbtn.active') && css.includes('color: var(--dark1) !important'), 'active buttons must force dark text on light background');
});

test('Fix 6: shiny skin toggling on PC box Pokemon and Guide title localizations', () => {
  const sandbox = makeSandbox();

  // Check new localization keys exist in both FR and EN dictionaries
  assert.ok(sandbox.window.I18N.fr.guide_automation, 'French guide_automation key should exist');
  assert.ok(sandbox.window.I18N.en.guide_automation, 'English guide_automation key should exist');
  assert.ok(sandbox.window.I18N.fr.guide_alpha_safety, 'French guide_alpha_safety key should exist');
  assert.ok(sandbox.window.I18N.en.guide_alpha_safety, 'English guide_alpha_safety key should exist');

  // Verify toggleBoxShinySkin works on Box Pokemon
  assert.equal(typeof sandbox.window.toggleBoxShinySkin, 'function', 'toggleBoxShinySkin must be exported');
  sandbox.G.collection['box_test_1'] = { id: 25, shinyUnlocked: true, shinyActive: false, shiny: false };
  sandbox.window.toggleBoxShinySkin('box_test_1');
  assert.equal(sandbox.G.collection['box_test_1'].shinyActive, true, 'Should switch box Pokemon shinyActive to true');
  assert.equal(sandbox.G.collection['box_test_1'].shiny, true, 'Should switch box Pokemon shiny to true');
});

test('Fix 7: saveDownloadFilename format, ORAS Secret Base Flag System, and Delta Episode Lock', () => {
  const sandbox = makeSandbox();

  // Verify saveDownloadFilename format pokeworld_IdSave_Date.json
  const testSaveData = { saveId: 'PW-TEST-123', G: { saveMeta: { id: 'PW-TEST-123' } } };
  const filename = sandbox.window.saveDownloadFilename(testSaveData);
  assert.match(filename, /^pokeworld_PW-TEST-123_\d{4}_\d{2}_\d{2}\.json$/, 'Should format filename as pokeworld_IdSave_Date.json');

  // Verify ORAS Secret Base Flag System
  assert.equal(typeof sandbox.window.collectSecretBaseFlag, 'function', 'collectSecretBaseFlag should be exported');
  assert.equal(typeof sandbox.window.getSecretBaseFlagRank, 'function', 'getSecretBaseFlagRank should be exported');
  assert.equal(typeof sandbox.window.getSecretBaseBonuses, 'function', 'getSecretBaseBonuses should be exported');

  assert.equal(sandbox.window.getSecretBaseFlagRank().id, 'normal', 'Should start at normal flag rank');
  sandbox.window.collectSecretBaseFlag('friend_base_1');
  assert.equal(sandbox.G.secretBaseFlags.count, 1, 'Should increment flag count');

  // Verify the Delta Episode quest is locked until Kalos completion
  // (id 258 since the insertion of Secret Base quests 217/218 — ex-256)
  const quest258 = sandbox.window.STORY_QUESTS_HOENN.find(q => q.id === 258);
  assert.ok(quest258 && typeof quest258.reqCondition === 'function', 'Quest 258 must have reqCondition');
  assert.equal(quest258.reqCondition(), false, 'Quest 258 should be locked before Kalos completion');
});



