/** @file SecretBase.test.js — persistent Base operations, flags and dedicated battle hand-off. */
import fs from 'node:fs';
import { describe, assert } from './TestRunner.js';
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
import { SecretBasePanel } from '../src/panels/SecretBasePanel.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';

const saves = SaveSystem.getInstance();
const baseSystem = SecretBaseSystem.getInstance();
const battleSystem = BattleSystem.getInstance();

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
    const tile = () => panel.getDomElement().querySelector('.pw-loc-action-grid')?.children
      .find((child) => child.getAttribute('data-secret-base-layout') === 'tree_1') || null;

    const preview = tile();
    assert.ok(preview, 'the current route exposes the alcove preview');
    preview.click();
    assert.equal(baseSystem.getVisitSnapshot()?.source, 'alcove');
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    assert.equal(baseSystem.getVisitSnapshot(), null, 'establishment ends the temporary preview');

    const ownBaseAction = tile();
    assert.ok(ownBaseAction, 'the current route action is rebuilt after establishment');
    ownBaseAction.click();
    assert.equal(baseSystem.getVisitSnapshot()?.source, 'own', 'the refreshed tile enters the owned base');

    baseSystem.stopVisit();
    panel.destroy();
  });

  test('starting a Base visit closes the editor and clears its transient selection', () => {
    newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok, 'test base established');
    const panel = new SecretBasePanel(DashboardColumns.CENTER);
    const actions = panel.getDomElement().querySelector('.pw-secret-base-actions');
    const editButton = actions?.children[1] || null;
    assert.ok(editButton, 'panel exposes an edit action');
    editButton.click();
    assert.ok(panel.getDomElement().querySelector('.pw-secret-base-editor'));

    panel._selectedStockId = 'small_chair';
    assert.ok(baseSystem.startOwnVisit().ok, 'own visit started');
    assert.equal(panel.getDomElement().querySelector('.pw-secret-base-editor'), null);
    assert.equal(panel._editing, false);
    assert.equal(panel._selectedStockId, null);

    baseSystem.stopVisit();
    panel.destroy();
  });

  test('switching saves clears transient Base editor state', () => {
    newUnlockedHoennSave();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);
    const panel = new SecretBasePanel(DashboardColumns.CENTER);
    const editButton = panel.getDomElement().querySelector('.pw-secret-base-actions')?.children[1];
    assert.ok(editButton);
    editButton.click();
    panel._selectedNpcId = 'transient-npc';

    saves.createNewSave('Another save', 'charmander');
    assert.equal(panel._editing, false);
    assert.equal(panel._selectedNpcId, null);
    assert.equal(panel.getDomElement().querySelector('.pw-secret-base-editor'), null);
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
});
