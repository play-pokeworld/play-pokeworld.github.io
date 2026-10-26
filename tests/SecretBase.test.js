/** @file SecretBase.test.js — persistent Base operations, flags and dedicated battle hand-off. */
import fs from 'node:fs';
import { describe, assert } from './TestRunner.js';
import { installFakeDom } from './FakeDom.js';
import { EventBus } from '../src/core/EventBus.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SecretBaseAccessSystem } from '../src/systems/SecretBaseAccessSystem.js';
import { SecretBaseSystem, SecretBaseResults } from '../src/systems/SecretBaseSystem.js';
import { BonusSystem } from '../src/systems/BonusSystem.js';
import { SecretBaseFlagBonusProvider } from '../src/systems/secret-base/SecretBaseFlagBonusProvider.js';
import { SecretBaseRules } from '../src/config/SecretBaseRules.js';
import { BonusTypes } from '../src/config/BonusRules.js';
import { SecretBaseExchangeRules } from '../src/systems/secret-base/SecretBaseExchangeRules.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { SecretBaseNpcBattleResolvedEvent } from '../src/core/events/SecretBaseNpcBattleResolvedEvent.js';
import { BattleFoeKnockedOutEvent } from '../src/core/events/BattleFoeKnockedOutEvent.js';
import { PokemonDefeatedEvent } from '../src/core/events/PokemonDefeatedEvent.js';
import { LOCALE_CATALOG } from '../src/localization/LocaleCatalog.js';
import { SecretBaseItemDB } from '../src/data/base/SecretBaseItemDB.js';
import { SecretBaseLayoutDB } from '../src/data/base/SecretBaseLayoutDB.js';
import { SecretBaseVisitModal } from '../src/panels/SecretBaseVisitModal.js';
import { SecretBaseNpcModal } from '../src/panels/SecretBaseNpcModal.js';
import { SecretBasePanel } from '../src/panels/SecretBasePanel.js';
import { UIModal } from '../src/ui/UIModal.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { LocationAlcoves } from '../src/panels/components/LocationAlcoves.js';
import { AchievementSystem } from '../src/systems/AchievementSystem.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';

const saves = SaveSystem.getInstance();
const baseSystem = SecretBaseSystem.getInstance();
const battleSystem = BattleSystem.getInstance();

installFakeDom();

function flattenKeys(source, prefix = '') {
  return Object.entries(source || {}).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? flattenKeys(value, fullKey) : [fullKey];
  });
}

function localeKeys(language) {
  const keys = new Set();
  for (const domain of LOCALE_CATALOG[language] || []) {
    for (const key of flattenKeys(domain.source, domain.prefix || '')) keys.add(key);
  }
  return keys;
}

function newUnlockedHoennSave() {
  if (battleSystem.isActive()) battleSystem.endBattle(false);
  if (baseSystem.getVisitSnapshot()) baseSystem.stopVisit();
  const save = saves.createNewSave('Base tester', 'charmander');
  save.player.region = 'hoenn';
  save.player.location = 'route101';
  save.quests.setMainStep('hoenn', SecretBaseAccessSystem.getInstance().getUnlockStep());
  baseSystem.init();
  return save;
}

describe('Secret Base', (test) => {
  test('Base commands and catalog names resolve in both locale tables', () => {
    const sources = [
      'src/systems/SecretBaseSystem.js',
      'src/systems/BattleSystem.js',
      'src/systems/secret-base/SecretBaseExchangeRules.js',
      'src/systems/secret-base/SecretBasePlacementRules.js',
      'src/panels/SecretBasePanel.js',
      'src/panels/SecretBaseVisitModal.js',
      'src/panels/components/LocationActions.js',
      'src/panels/components/SecretBaseRoomView.js'
    ];
    const keys = new Set();
    for (const file of sources) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\b(?:t|_notify|_toast)\(\s*(['\"])([^'\"]+)\1/g)) keys.add(match[2]);
      for (const match of source.matchAll(/['\"]((?:win|debug|action|panel|flag|edit|visit|err|pc|i)\.[a-zA-Z0-9_.]+)['\"]/g)) keys.add(match[1]);
    }
    for (const item of SecretBaseItemDB.getInstance().getAll()) keys.add(item.nameKey);
    for (const layout of SecretBaseLayoutDB.getInstance().getAll()) keys.add(`win.layout.${layout.id}`);
    const en = localeKeys('en');
    const fr = localeKeys('fr');
    for (const key of keys) {
      assert.ok(en.has(key), `English Base locale contains ${key}`);
      assert.ok(fr.has(key), `French Base locale contains ${key}`);
    }
  });

  test('the visit modal closes cleanly when changing saves ends its session', () => {
    const save = newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    assert.ok(baseSystem.startOwnVisit().ok);
    const modal = new SecretBaseVisitModal();
    modal.open();
    assert.equal(modal.isOpen(), true);
    saves.createNewSave('New save', 'charmander');
    assert.equal(modal.isOpen(), false);
    modal.destroy();
  });

  test('establishment creates only the automatic PC; furniture requires real stock', () => {
    const save = newUnlockedHoennSave();
    const result = baseSystem.establish('route101', 'tree_1');
    assert.ok(result.ok, result.reason || 'establish');
    assert.deepEqual(save.secretBase.stock, {}, 'new base gets no decoration grant');
    assert.equal(save.secretBase.decorations.length, 1);
    assert.equal(save.secretBase.decorations[0].itemId, SecretBaseRules.ITEM_IDS.PC);
    assert.equal(baseSystem.getVisitSnapshot(), null, 'establishing does not implicitly enter the base');
    const noStock = baseSystem.placeDecoration('small_chair', 2, 2);
    assert.equal(noStock.ok, false);
    assert.equal(noStock.reason, SecretBaseResults.NOT_IN_STOCK);
  });

  test('relocation returns owned furniture to stock, removes NPCs and does not open a base visit', () => {
    const save = newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    save.secretBase.stock.small_desk = 1;
    assert.ok(baseSystem.placeDecoration('small_desk', 2, 3).ok);
    const npc = baseSystem.createNpc({ name: 'À retirer', team: baseSystem.captureCurrentTeam() });
    assert.ok(npc.ok, npc.reason || 'test NPC created');
    const visitsBefore = save.secretBase.record.visits;

    assert.ok(baseSystem.startAlcoveVisit('route101', 'bush_1').ok);
    assert.ok(baseSystem.relocate('route101', 'bush_1').ok);
    assert.equal(baseSystem.getVisitSnapshot(), null, 'the temporary alcove session ends');
    assert.equal(save.secretBase.layoutId, 'bush_1');
    assert.equal(save.secretBase.stock.small_desk, 1, 'placed furniture returns to owned stock');
    assert.deepEqual(save.secretBase.decorations.map((item) => item.itemId), [SecretBaseRules.ITEM_IDS.PC]);
    assert.deepEqual(save.secretBase.npcs, []);
    assert.equal(save.secretBase.record.visits, visitsBefore, 'relocation is not counted as a visit');
  });

  test('LocationPanel refreshes the established alcove action into own-base entry', () => {
    newUnlockedHoennSave();
    const panel = new LocationPanel(DashboardColumns.RIGHT);
    const tile = () => panel.getDomElement().querySelector('.pw-loc-alcove-list')?.children
      .find((child) => child.getAttribute('data-secret-base-layout') === 'tree_1') || null;

    const preview = tile();
    assert.ok(preview, 'the current route exposes the alcove preview');
    preview.querySelector('button').click();
    assert.equal(baseSystem.getVisitSnapshot()?.source, 'alcove');
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    assert.equal(baseSystem.getVisitSnapshot(), null, 'establishment ends the temporary preview');

    const ownBaseAction = tile();
    assert.ok(ownBaseAction, 'the current route action is rebuilt after establishment');
    ownBaseAction.querySelector('button').click();
    assert.equal(baseSystem.getVisitSnapshot()?.source, 'own', 'the refreshed tile enters the owned base');

    baseSystem.stopVisit();
    panel.destroy();
  });

  test('starting a Base visit hides stock drawer and clears transient selection', () => {
    newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok, 'test base established');
    const panel = new SecretBasePanel(DashboardColumns.CENTER);
    const dom = panel.getDomElement();

    // Editor elements rendered directly in window (matching main)
    assert.ok(dom.querySelector('#base-canvas-2d'), '2D canvas rendered');
    assert.ok(dom.querySelector('#base-toolbar'), 'toolbar rendered');
    assert.ok(dom.querySelector('#base-stock'), 'stock drawer rendered');

    panel._selectedStockId = 'small_chair';
    panel._selectedNpcId = 'npc_1';
    assert.ok(baseSystem.startOwnVisit().ok, 'own visit started');

    // In visit mode: stock drawer is hidden and transient selections are cleared
    assert.ok(!dom.querySelector('#base-stock'), 'stock drawer hidden during visit');
    assert.equal(panel._selectedStockId, null, 'selected stock cleared');
    assert.equal(panel._selectedNpcId, null, 'selected npc cleared');

    baseSystem.stopVisit();
    panel.destroy();
  });

  test('switching saves clears transient Base editor state', () => {
    newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    const panel = new SecretBasePanel(DashboardColumns.CENTER);
    panel._selectedNpcId = 'transient-npc';
    panel._selectedStockId = 'small_chair';

    saves.createNewSave('Another save', 'charmander');
    assert.equal(panel._visitMode, false);
    assert.equal(panel._selectedNpcId, null);
    assert.equal(panel._selectedStockId, null);
    panel.destroy();
  });

  test('flag collection is per base per 24 hours and maps into shared bonus contributions', () => {
    const save = newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    const exported = SecretBaseExchangeRules.buildExport(
      save.secretBase,
      { id: 'REMOTE-OWNER', name: 'Visiteur test' },
      'remote-base-stable-id'
    );
    const text = SecretBaseExchangeRules.serializeExport(exported);
    assert.ok(text);
    assert.ok(baseSystem.startImportedVisit(text).ok);
    const countBefore = save.secretBase.flags.count;
    const collected = baseSystem.collectFlag();
    assert.ok(collected.ok);
    assert.equal(save.secretBase.flags.count, countBefore + 1);
    const duplicate = baseSystem.collectFlag();
    assert.equal(duplicate.ok, false);
    assert.equal(duplicate.reason, SecretBaseResults.FLAG_COOLDOWN);

    const provider = new SecretBaseFlagBonusProvider();
    const bonuses = new BonusSystem();
    assert.ok(bonuses.registerProvider('secret-base-flags-test', provider));
    const asTypeValues = () => provider.getContributions({ save }).map(({ type, value }) => ({ type, value }));
    assert.deepEqual(asTypeValues(), [], 'one flag is below the first bonus threshold');
    assert.equal(bonuses.applyMultiplier(1000, BonusTypes.MONEY, { save }), 1000);
    save.secretBase.flags.count = 10;
    assert.deepEqual(asTypeValues(), [{ type: BonusTypes.MONEY, value: 3 }]);
    assert.equal(bonuses.applyMultiplier(1000, BonusTypes.MONEY, { save }), 1030);
    bonuses.registerProvider('test-source', { getContributions: () => [{ type: BonusTypes.MONEY, value: 2 }] });
    assert.equal(bonuses.getTotal(BonusTypes.MONEY, { save }), 5, 'independent bonus sources aggregate');
    bonuses.unregisterProvider('test-source');
    save.secretBase.flags.count = 50;
    assert.deepEqual(asTypeValues(), [
      { type: BonusTypes.MONEY, value: 3 },
      { type: BonusTypes.XP, value: 3 },
      { type: BonusTypes.MINE_ENERGY_MAX, value: 3 }
    ]);
    save.secretBase.flags.count = 150;
    assert.deepEqual(asTypeValues(), [
      { type: BonusTypes.MONEY, value: 5 },
      { type: BonusTypes.XP, value: 5 },
      { type: BonusTypes.MINE_ENERGY_MAX, value: 5 },
      { type: BonusTypes.ROUTE_LOOT, value: 1 }
    ]);
    assert.equal(bonuses.applyMultiplier(1000, BonusTypes.MONEY, { save }), 1050);
    save.secretBase.flags.count = 400;
    assert.deepEqual(asTypeValues(), [
      { type: BonusTypes.MONEY, value: 8 },
      { type: BonusTypes.XP, value: 8 },
      { type: BonusTypes.MINE_ENERGY_MAX, value: 8 },
      { type: BonusTypes.ROUTE_LOOT, value: 2 }
    ]);
    assert.equal(bonuses.getTotal(BonusTypes.ROUTE_LOOT, { save }), 2);
    assert.equal(bonuses.applyMultiplier(1000, BonusTypes.MONEY, { save }), 1080);
    bonuses.onDestroy();
    baseSystem.stopVisit();
  });

  test('Base NPC duel uses the shared engine but only emits the dedicated Base result', () => {
    const save = newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    const team = baseSystem.captureCurrentTeam();
    const created = baseSystem.createNpc({ name: 'Épreuve', sprite: 'trainer-7', team });
    assert.ok(created.ok, created.reason || 'create NPC');
    assert.ok(baseSystem.startOwnVisit().ok);

    const currenciesBefore = save.currencies.serialize();
    const boxBefore = save.collection.size;
    const resolved = [];
    const knockouts = [];
    const defeats = [];
    const onResolved = (event) => resolved.push(event);
    const onKnockout = (event) => knockouts.push(event);
    const onDefeat = (event) => defeats.push(event);
    EventBus.getInstance().subscribe(SecretBaseNpcBattleResolvedEvent, onResolved);
    EventBus.getInstance().subscribe(BattleFoeKnockedOutEvent, onKnockout);
    EventBus.getInstance().subscribe(PokemonDefeatedEvent, onDefeat);

    const started = baseSystem.challengeNpc(created.id);
    assert.ok(started.ok, started.reason || 'start Base battle');
    assert.ok(battleSystem.isActive());
    assert.equal(battleSystem.isTrainerBattle(), false, 'must not use trainer settlement');
    assert.equal(battleSystem.getTrainerPresentation().role, 'secret_base');

    battleSystem.endBattle(false); // leaving is a visitor loss, just like the reference
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].visitId, baseSystem.getVisitSnapshot().id);
    assert.equal(resolved[0].visitorWon, false);
    assert.equal(resolved[0].forfeit, true);
    assert.equal(save.secretBase.record.wins, 1, 'owner receives a win when the visitor loses');

    // Force the second engine session to a normal victory to exercise the dedicated result path.
    baseSystem.stopVisit();
    assert.ok(baseSystem.startOwnVisit().ok);
    assert.ok(baseSystem.challengeNpc(created.id).ok);
    const session = battleSystem._session;
    session.foe.pokemon.hp = 0;
    assert.equal(session._resolve(), true);
    battleSystem.update(0);

    EventBus.getInstance().unsubscribe(SecretBaseNpcBattleResolvedEvent, onResolved);
    EventBus.getInstance().unsubscribe(BattleFoeKnockedOutEvent, onKnockout);
    EventBus.getInstance().unsubscribe(PokemonDefeatedEvent, onDefeat);
    assert.equal(resolved.length, 2);
    assert.equal(resolved[1].visitorWon, true);
    assert.equal(resolved[1].forfeit, false);
    assert.equal(save.secretBase.record.losses, 1, 'owner receives a loss when the visitor wins');
    assert.deepEqual(knockouts, [], 'a Base KO must not progress ordinary kill objectives');
    assert.deepEqual(defeats, [], 'a Base duel is not a wild or ordinary trainer defeat');
    assert.equal(save.currencies.serialize().money, currenciesBefore.money, 'no trainer/wild money reward');
    assert.equal(save.collection.size, boxBefore, 'no automatic capture');
    baseSystem.stopVisit();
  });

  test('Secret Base events update AchievementSystem progression', () => {
    const save = newUnlockedHoennSave();
    const achSys = AchievementSystem.getInstance();
    achSys.init();

    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    // At establishment, PC is placed (1 deco)
    assert.equal(achSys.getMetricValue('base_decos', save), 1);

    // Give decorations to stock and place them
    save.secretBase.stock.small_desk = 2;
    assert.ok(baseSystem.placeDecoration('small_desk', 2, 3).ok);
    assert.equal(achSys.getMetricValue('base_decos', save), 2);

    // Flag collection
    assert.equal(achSys.getMetricValue('base_flags', save), 0);
    const exported = SecretBaseExchangeRules.buildExport(
      save.secretBase,
      { id: 'REMOTE-OWNER-2', name: 'Visiteur 2' },
      'remote-base-stable-id-2'
    );
    const text = SecretBaseExchangeRules.serializeExport(exported);
    assert.ok(baseSystem.startImportedVisit(text).ok);
    assert.ok(baseSystem.collectFlag().ok);
    assert.equal(achSys.getMetricValue('base_flags', save), 1);
    baseSystem.stopVisit();

    // Visitors count
    save.secretBase.record.visits = 12;
    assert.equal(achSys.getMetricValue('base_visitors', save), 12);
  });

  test('SecretBasePanel in-window editor interactions, toolbar, and stock tabs', () => {
    const save = newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    save.secretBase.stock.small_chair = 3;

    const panel = new SecretBasePanel(DashboardColumns.CENTER);
    try {
      const dom = panel.getDomElement();

      // Check canvas, toolbar, stock
      const canvas = dom.querySelector('#base-canvas-2d');
      const toolbar = dom.querySelector('#base-toolbar');
      const stock = dom.querySelector('#base-stock');
      assert.ok(canvas, 'canvas rendered');
      assert.ok(toolbar, 'toolbar rendered');
      assert.ok(stock, 'stock rendered');

      // Stock tabs rendered
      const tabs = stock.querySelectorAll('.base-stock-tab');
      assert.equal(tabs.length, 9, '9 stock category tabs rendered');

      // Select category chairs
      tabs[1].click(); // 'chairs' tab
      assert.equal(panel._stockTab, 'chairs');

      // Re-query stock page items
      let updatedStock = dom.querySelector('#base-stock');
      const stockItems = updatedStock.querySelectorAll('.base-stock-item');
      assert.ok(stockItems.length > 0, 'stock items rendered for chairs');

      // Click stock item to select
      stockItems[0].click();
      assert.equal(panel._selectedStockId, 'small_chair', 'small_chair selected in hand');

      // Place on canvas (cell 3, 3)
      panel._onCanvasClick(3, 3);
      assert.equal(panel._selectedStockId, null, 'placement consumes selected stock');
      assert.equal(save.secretBase.stock.small_chair, 2, 'stock decremented');

      // Click placed decoration to select it
      panel._onCanvasClick(3, 3);
      assert.ok(panel._selectedDecorationUid !== null, 'placed decoration selected');
      assert.ok(!dom.querySelector('#base-ed-pickup').disabled, 'pickup button enabled');

      // Pickup decoration
      dom.querySelector('#base-ed-pickup').click();
      assert.equal(panel._selectedDecorationUid, null, 'decoration unselected on pickup');
      assert.equal(save.secretBase.stock.small_chair, 3, 'stock returned to inventory');

      // Visit toggle button
      const visitBtn = dom.querySelector('#base-ed-visit');
      assert.ok(visitBtn, 'visit button rendered');
      visitBtn.click();
      assert.equal(panel._visitMode, true, 'visit mode activated');
      assert.ok(!dom.querySelector('#base-stock'), 'stock hidden during visit');

      // Stop visit (re-query the button after panel re-render)
      dom.querySelector('#base-ed-visit').click();
      assert.equal(panel._visitMode, false, 'visit mode deactivated');
      assert.ok(dom.querySelector('#base-stock'), 'stock restored after visit');
    } finally {
      panel.destroy();
    }
  });

  test('SecretBaseVisitModal is a standard UIModal with header, close button, and backdrop dismissal', () => {
    const save = newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    assert.ok(baseSystem.startOwnVisit().ok);

    const modal = new SecretBaseVisitModal();
    try {
      assert.ok(modal instanceof UIModal, 'extends UIModal');
      modal.open();
      assert.equal(modal.isOpen(), true);

      const dom = modal.getDomElement(); // overlay
      assert.ok(dom.querySelector('.pw-win-hdr'), 'modal header rendered');
      assert.ok(dom.querySelector('.pw-modal-close-btn'), 'header close button rendered');

      // Room view canvas is inside
      const room = dom.querySelector('.pw-secret-base-room--visit');
      assert.ok(room, 'visit room canvas rendered');

      // Backdrop click closes the modal
      dom.click();
      assert.equal(modal.isOpen(), false, 'closes on backdrop click');
    } finally {
      modal.destroy();
    }
  });

  test('player can place unlimited NPCs without limit or owned item requirement', () => {
    const save = newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);

    // Place 10 NPCs programmatically without error
    for (let i = 0; i < 10; i++) {
      const res = baseSystem.createNpc({ name: `NPC ${i}` });
      assert.ok(res.ok, `NPC ${i} created successfully`);
    }
    assert.equal(save.secretBase.npcs.length, 10, '10 NPCs placed without cap');

    // Panel UI test for PNJ stock tab
    const panel = new SecretBasePanel(DashboardColumns.CENTER);
    try {
      const dom = panel.getDomElement();
      const stock = dom.querySelector('#base-stock');
      const tabs = stock.querySelectorAll('.base-stock-tab');

      // Click __pals tab (last tab)
      const palsTab = tabs[tabs.length - 1];
      palsTab.click();
      assert.equal(panel._stockTab, '__pals');

      const updatedStock = dom.querySelector('#base-stock');
      const palBtn = updatedStock.querySelector('.base-stock-item');
      assert.ok(palBtn, 'pal placement button rendered');
      assert.ok(!palBtn.disabled, 'pal placement button is never disabled');

      // Click to enter NPC placement mode
      palBtn.click();
      assert.equal(panel._selectedNpcPlacement, true, 'entered NPC placement mode');
    } finally {
      panel.destroy();
    }
  });

  test('visiting from location alcoves does not trigger visit mode on SecretBasePanel', () => {
    newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);

    const alcoves = new LocationAlcoves();
    alcoves.setLocation('route101');
    const panel = new SecretBasePanel(DashboardColumns.CENTER);

    try {
      assert.equal(panel._visitMode, false, 'initially not in visit mode');
      assert.ok(panel.getDomElement().querySelector('#base-stock'), 'stock drawer present');

      // 1. Visit an alcove preview from LocationAlcoves
      alcoves._visit('shrub_1', false);
      assert.equal(panel._visitMode, false, 'alcove preview does not switch panel to visit mode');
      assert.ok(panel.getDomElement().querySelector('#base-stock'), 'stock drawer remains in editor mode');
      baseSystem.stopVisit();

      // 2. Visit own base from LocationAlcoves
      alcoves._visit('tree_1', true);
      assert.equal(panel._visitMode, false, 'own base visit from location does not switch panel to visit mode');
      assert.ok(panel.getDomElement().querySelector('#base-stock'), 'stock drawer remains visible');
      baseSystem.stopVisit();
    } finally {
      alcoves.destroy();
      panel.destroy();
    }
  });

  test('SecretBaseNpcModal layout adheres to settings styling with spacious fields and portrait preview', () => {
    newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    const createRes = baseSystem.createNpc({ name: 'Challenger' });
    assert.ok(createRes.ok);
    const npcId = createRes.npc.id;

    const modal = new SecretBaseNpcModal();
    try {
      EventBus.getInstance().dispatch(
        new ModalOpenRequestedEvent(ModalIds.SECRET_BASE_NPC, { npcId })
      );
      assert.equal(modal.isOpen(), true, 'NPC modal opened');
      const dom = modal.getDomElement();

      // Portrait and Identity box
      assert.ok(dom.querySelector('.pw-base-npced-id-box'), 'identity box rendered');
      assert.ok(dom.querySelector('.pw-base-npced-portrait-img'), 'portrait image rendered');

      // Form fields inspired by Settings (.save-profile-field)
      const formFields = dom.querySelectorAll('.save-profile-field');
      assert.ok(formFields.length >= 4, 'contains at least 4 Settings-style form fields');

      // Name & Quotes inputs
      const nameInput = dom.querySelector('#pw-base-npc-name');
      const preInput = dom.querySelector('#pw-base-npc-pre');
      const winInput = dom.querySelector('#pw-base-npc-win');
      const loseInput = dom.querySelector('#pw-base-npc-lose');
      assert.ok(nameInput, 'name input rendered');
      assert.ok(preInput, 'quote pre input rendered');
      assert.ok(winInput, 'quote win input rendered');
      assert.ok(loseInput, 'quote lose input rendered');

      // Team cards section
      assert.ok(dom.querySelector('.pw-base-npced-team-grid'), 'team grid rendered');

      // Save changes
      nameInput.value = 'Gym Leader Red';
      preInput.value = 'Ready for a real challenge?';
      const saveBtn = dom.querySelector('#pw-base-npc-save-btn');
      assert.ok(saveBtn, 'save button present');
      saveBtn.click();

      // Validate base state updated
      const updatedNpc = baseSystem.getBase().npcs.find((n) => n.id === npcId);
      assert.equal(updatedNpc.name, 'Gym Leader Red');
      assert.equal(updatedNpc.messages.pre, 'Ready for a real challenge?');
      assert.equal(modal.isOpen(), false, 'modal closed on save');
    } finally {
      modal.destroy();
    }
  });

  test('SecretBaseNpcModal sprite gallery picker and interactive team builder', () => {
    const save = newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    const createRes = baseSystem.createNpc({ name: 'Rival Blue' });
    assert.ok(createRes.ok);
    const npcId = createRes.npc.id;

    const modal = new SecretBaseNpcModal();
    try {
      EventBus.getInstance().dispatch(
        new ModalOpenRequestedEvent(ModalIds.SECRET_BASE_NPC, { npcId })
      );
      assert.equal(modal.isOpen(), true);

      // 1. Test visual Sprite Picker gallery & persistent focus search input
      const portraitBtn = modal.getDomElement().querySelector('.base-npc-portrait-btn');
      assert.ok(portraitBtn, 'portrait button rendered');
      portraitBtn.click();
      assert.equal(modal._mode, 'sprite-picker', 'switched to sprite picker');

      const filterInput = modal.getDomElement().querySelector('.pw-base-looks-filter');
      assert.ok(filterInput, 'search filter input rendered');
      const looksGrid = modal.getDomElement().querySelector('.pw-base-looks-grid');
      assert.ok(looksGrid, 'visual 101 looks grid rendered');
      let lookCards = looksGrid.querySelectorAll('.base-npc-look');
      assert.equal(lookCards.length, 101, 'all 101 sprite looks available in gallery');

      // Type in search filter: input MUST persist and not be recreated
      modal._spriteSearch = '42';
      modal._updateLooksGrid();
      assert.equal(modal.getDomElement().querySelector('.pw-base-looks-filter'), filterInput, 'filter input preserved without DOM teardown');
      lookCards = looksGrid.querySelectorAll('.base-npc-look');
      assert.ok(lookCards.length < 101, 'filtered sprites count reduced');

      // Pick trainer-42
      lookCards[0].click();
      assert.equal(modal._mode, 'editor', 'returned to editor mode');
      assert.equal(modal._selectedSprite, 'trainer-42', 'sprite updated to trainer-42');

      // 2. Test interactive Mon Picker & PokeCard presentation
      const addMonBtn = modal.getDomElement().querySelector('.pw-base-npced-mon-add');
      assert.ok(addMonBtn, 'add mon button rendered for empty slot');
      addMonBtn.click();
      assert.equal(modal._mode, 'mon-picker', 'switched to mon picker');

      const pickSearch = modal.getDomElement().querySelector('.preset-pick-search');
      assert.ok(pickSearch, 'candidate search input rendered');
      const pickList = modal.getDomElement().querySelector('.preset-pick-list');
      assert.ok(pickList, 'candidate list rendered');
      const candidateRows = pickList.querySelectorAll('.preset-pick-row');
      assert.ok(candidateRows.length > 0, 'at least starter candidate available');

      // Pick first candidate
      candidateRows[0].click();
      assert.equal(modal._mode, 'editor', 'returned to editor after picking mon');
      assert.equal(modal._draftTeam.length, 1, 'team now has 1 member');

      // Verify PokeCard parity on NPC team card
      const teamGrid = modal.getDomElement().querySelector('#base-npced-team');
      assert.ok(teamGrid, 'base-npced-team container rendered');
      assert.ok(teamGrid.classList.contains('team-view'), 'renders using .team-view layout');
      assert.ok(teamGrid.querySelector('.pw-team-member-list'), 'renders using .pw-team-member-list sortable container');
      const pokeCard = teamGrid.querySelector('.poke-card');
      assert.ok(pokeCard, 'rendered full-featured poke-card');
      assert.ok(pokeCard.querySelector('.poke-moves'), 'poke-moves rendered on NPC member card');
      assert.ok(pokeCard.querySelector('.pw-team-drag-handle'), 'drag grip handle rendered on NPC member card');
      assert.ok(pokeCard.querySelector('.pw-base-npced-mon-del'), 'delete button rendered on NPC member card');

      // 3. Test Preset Picker (Team import) displaying visible Pokémon roster
      const importBtn = modal.getDomElement().querySelector('#pw-base-npc-import-team-btn');
      assert.ok(importBtn, 'import team button rendered');
      importBtn.click();
      assert.equal(modal._mode, 'preset-picker', 'switched to preset picker');
      const presetCards = modal.getDomElement().querySelectorAll('.pw-preset-pick-card');
      assert.ok(presetCards.length >= 1, 'at least active team preset card rendered');
      const activeCard = presetCards[0];
      const monSlots = activeCard.querySelectorAll('.pw-preset-pick-mon-slot');
      assert.ok(monSlots.length >= 1, 'mon slots rendered inside team import card');
      assert.ok(monSlots[0].querySelector('.pw-preset-pick-mon-name'), 'mon name rendered');
      assert.ok(monSlots[0].querySelector('.pw-preset-pick-mon-lvl'), 'mon level rendered');

      // Click to import active team
      activeCard.click();
      assert.equal(modal._mode, 'editor', 'returned to editor after importing team');

      // 4. Save and verify persist
      const saveBtn = modal.getDomElement().querySelector('#pw-base-npc-save-btn');
      saveBtn.click();
      const updatedNpc = baseSystem.getBase().npcs.find((n) => n.id === npcId);
      assert.equal(updatedNpc.sprite, 'trainer-42');
      assert.ok(updatedNpc.team.length >= 1);
    } finally {
      modal.destroy();
    }
  });
});
