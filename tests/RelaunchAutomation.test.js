/** @file RelaunchAutomation.test.js @brief Live engine, canonical dungeon pilot, transactional shop and stable UI contracts. */
import { describe, assert } from './TestRunner.js';
import { setRoster, addOwned } from './RosterFixtures.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { RelaunchData } from '../src/data/save/RelaunchData.js';
import { DungeonRunData } from '../src/data/save/DungeonRunData.js';
import { MigrationV19ToV20 } from '../src/data/save/migrations/MigrationV19ToV20.js';
import { MigrationOriginalToV1 } from '../src/data/save/migrations/MigrationOriginalToV1.js';
import { convertLegacyRelaunch } from '../src/data/save/migrations/LegacyRelaunchMigration.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { DungeonSystem } from '../src/systems/DungeonSystem.js';
import { DungeonAutoSystem } from '../src/systems/DungeonAutoSystem.js';
import { RelaunchSystem } from '../src/systems/RelaunchSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { HatcherySystem } from '../src/systems/HatcherySystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { TrainerSystem } from '../src/systems/TrainerSystem.js';
import { LocationSystem } from '../src/systems/LocationSystem.js';
import { ShopSystem, PurchaseResults } from '../src/systems/ShopSystem.js';
import { ShopCatalog } from '../src/systems/shop/ShopCatalog.js';
import { ShopOfferKinds } from '../src/systems/shop/ShopOfferKinds.js';
import { FacilityManagementSystem } from '../src/systems/FacilityManagementSystem.js';
import { FacilityStaffSystem } from '../src/systems/FacilityStaffSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { ShopDB } from '../src/data/shops/ShopDB.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { DungeonPilotRules } from '../src/systems/dungeon/DungeonPilotRules.js';
import { RelaunchRules } from '../src/config/RelaunchRules.js';
import { DungeonAutoRules } from '../src/config/DungeonAutoRules.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { IconRegistry } from '../src/ui/icons/IconRegistry.js';
import { EventBus } from '../src/core/EventBus.js';
import { SeededRandom } from '../src/core/SeededRandom.js';
import { BattleRunFinishedEvent } from '../src/core/events/BattleRunFinishedEvent.js';
import { BattleStartedEvent } from '../src/core/events/BattleStartedEvent.js';
import { CurrencyChangedEvent } from '../src/core/events/CurrencyChangedEvent.js';
import { LocationChangedEvent } from '../src/core/events/LocationChangedEvent.js';
import { ModalCloseRequestedEvent } from '../src/core/events/ModalCloseRequestedEvent.js';
import { RelaunchControls } from '../src/panels/components/RelaunchControls.js';
import { DungeonPilotControls } from '../src/panels/components/DungeonPilotControls.js';
import { FacilityUpgradeCard } from '../src/panels/facilities/FacilityUpgradeCard.js';
import { TrainingLockedSlotCard } from '../src/panels/facilities/TrainingLockedSlotCard.js';
import { StaffCard } from '../src/panels/facilities/StaffCard.js';
import { UIModal } from '../src/ui/UIModal.js';
import {
  LocalizationManager,
  t,
} from '../src/localization/LocalizationManager.js';
const saves = SaveSystem.getInstance(),
  battle = BattleSystem.getInstance(),
  dungeon = DungeonSystem.getInstance(),
  pilot = DungeonAutoSystem.getInstance(),
  relaunch = RelaunchSystem.getInstance(),
  shops = ShopSystem.getInstance(),
  bus = EventBus.getInstance();
const copy = (value) => JSON.parse(JSON.stringify(value));
function fresh(name = 'Automation', location = 'route1', strong = false) {
  relaunch.onDestroy();
  pilot.onDestroy();
  TrainingSystem.getInstance().onDestroy();
  HatcherySystem.getInstance().onDestroy();
  QuestSystem.getInstance().onDestroy();
  if (battle.isActive()) battle.endBattle(false);
  dungeon.onDestroy();
  const save = saves.createNewSave(name, 'charmander');
  save.tutorial.enabled = false;
  save.player.location = location;
  save.player.region = LocationDB.getInstance().getById(location).region;
  for (const id of ['hatchery', 'training', 'mine'])
    save.access.unlockFeature(id);
  for (const id of [
    'brock',
    'misty',
    'surge',
    'erika',
    'koga',
    'sabrina',
    'blaine',
    'giovanni',
  ])
    save.player.earnBadge(id);
  for (const [id, n] of [
    ['questPoint', 20000],
    ['dungeonToken', 10000],
    ['money', 100000],
  ])
    save.currencies.add(id, n - save.currencies.get(id));
  if (strong)
    setRoster(
      save,
      Array.from({ length: 3 }, () => PokemonFactory.create('mewtwo', 100)),
    );
  else {
    save.team[0].setLevel(1);
    save.team[0].moves = ['splash'];
    save.team[0].hp = 1;
  }
  battle.setRandom(new SeededRandom(1234));
  dungeon.setRandom(new SeededRandom(1234));
  dungeon.init();
  relaunch.init();
  pilot.init();
  return save;
}
function buy(kind) {
  assert.equal(shops.buyRelaunch(kind), PurchaseResults.OK);
}
function writes(action) {
  const old = saves.saveCurrent;
  let n = 0;
  saves.saveCurrent = function (...args) {
    n++;
    return old.apply(this, args);
  };
  try {
    action();
  } finally {
    saves.saveCurrent = old;
  }
  return n;
}
function clock(action) {
  const original = Date.now;
  let now = 1760000000000;
  Date.now = () => now;
  try {
    return action({ advance: (ms) => (now += ms), now: () => now });
  } finally {
    Date.now = original;
  }
}
function finishBattle() {
  for (let i = 0; i < 30000 && battle.isActive(); i++) battle.update(0.1);
  assert.equal(
    battle.isActive(),
    false,
    'the actual BattleSession must reach a terminal outcome',
  );
}
function wildDefeat() {
  assert.ok(battle.startBattle('route1'));
  finishBattle();
  assert.equal(battle.getBattleSummary().victory, false);
}
function forceBossVisible() {
  const run = dungeon.getRun();
  run.map.tiles[run.bossTile].revealed = true;
  assert.ok(dungeon.moveTo(run.bossTile));
}
function finishPilot(c, mode, location = 'mtmoon') {
  const save = fresh(`Pilot ${mode}`, location, true);
  save.dungeons.clears[location] = 3;
  assert.ok(dungeon.enter(location, { autoMode: mode }));
  let bosses = 0,
    unfinishedAtBoss = [];
  const off = bus.subscribe(BattleStartedEvent, () => {
    const run = dungeon.getRun();
    if (run?.pendingNode === run?.bossTile) {
      bosses++;
      unfinishedAtBoss.push(
        Object.values(run.map.tiles)
          .filter(
            (tile) =>
              tile.id !== run.bossTile &&
              (!tile.revealed ||
                (!tile.done &&
                  ['combat', 'elite', 'chest'].includes(tile.type))),
          )
          .map((tile) => tile.type),
      );
    }
  });
  try {
    for (
      let i = 0;
      i < 90000 && (dungeon.isActive() || battle.isActive());
      i++
    ) {
      c.advance(100);
      battle.update(0.1);
      pilot.update(0.1);
    }
  } finally {
    off();
  }
  assert.equal(
    dungeon.isActive(),
    false,
    'pilot must finish using normal fights and descents',
  );
  assert.equal(save.dungeons.lastRun.outcome, 'cleared');
  assert.equal(save.dungeons.clearCount(location), 4);
  assert.ok(bosses >= 1);
  return { save, bosses, unfinishedAtBoss };
}
function grid(cols, rows) {
  const tiles = {};
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++) {
      const id = `c${x}r${y}`;
      tiles[id] = {
        id,
        col: x,
        row: y,
        type: 'empty',
        revealed: false,
        done: false,
      };
    }
  return {
    pos: 'c0r0',
    bossTile: `c${cols - 1}r0`,
    map: { cols, rows, tiles },
  };
}

describe('Relaunch schema and transactional modules', (test) => {
  test('fresh saves own no upgrade, cannot enable one, and serialize no countdown', () => {
    fresh();
    assert.deepEqual(saves.getCurrentSave().relaunch.serialize(), {
      wild: { purchased: false, enabled: false },
      dungeon: { purchased: false, enabled: false, mode: 'farm' },
    });
    assert.equal(relaunch.setEnabledFor('wild', true), false);
    assert.equal(relaunch.schedule('wild', 'route1'), false);
    assert.equal(
      JSON.stringify(saves.getCurrentSave().relaunch.serialize()).includes(
        'readyAt',
      ),
      false,
    );
  });
  test('model validates ownership, preferences and all three remembered modes', () => {
    for (const mode of DungeonAutoRules.MODES) {
      const model = new RelaunchData({
        wild: { purchased: true, enabled: false },
        dungeon: { purchased: true, mode },
        pending: 123,
      });
      assert.equal(model.wild.enabled, false);
      assert.equal(model.dungeon.enabled, true);
      assert.equal(model.dungeon.mode, mode);
      assert.equal('pending' in model.serialize(), false);
    }
    assert.equal(
      new RelaunchData({
        wild: { enabled: true },
        dungeon: { mode: 'invalid' },
      }).wild.enabled,
      false,
    );
    assert.equal(
      new RelaunchData({ dungeon: { mode: 'invalid' } }).dungeon.mode,
      'farm',
    );
  });
  test('schema 19 migration is pure and leaves real training DTOs, queues, UIDs and mine clock byte-identical', () => {
    const save = fresh();
    TrainingSystem.getInstance().init();
    const p = PokemonFactory.create('pikachu', 20);
    addOwned(save, p);
    assert.equal(
      TrainingSystem.getInstance().startSession(p.uid, 'move', 0).result,
      'ready',
    );
    const raw = copy(save.serialize());
    raw.version = 19;
    delete raw.relaunch;
    raw.mine.manualSurveyReadyAt = 1760000123456;
    raw.hatchery.queue = [p.uid];
    const before = copy(raw),
      migrated = MigrationV19ToV20.migrate(raw);
    assert.deepEqual(raw, before);
    assert.equal(migrated.version, 20);
    for (const key of Object.keys(raw).filter((k) => k !== 'version'))
      assert.deepEqual(migrated[key], raw[key], key);
    const loaded = SaveData.fromJson(raw);
    assert.deepEqual(
      loaded.training.slots[0].battle,
      raw.training.slots[0].battle,
    );
    assert.equal(loaded.mine.manualSurveyReadyAt, raw.mine.manualSurveyReadyAt);
    TrainingSystem.getInstance().cancelSession(0);
  });
  test('original ownership and explicit disabled preference survive the complete migration chain', () => {
    const G = {
      automationUpgrades: { autoRelaunch: true, autoDungeonRelaunch: 1 },
      automation: { autoRelaunch: false, autoDungeonMode: 'chest' },
    };
    const before = copy(G);
    assert.deepEqual(
      MigrationOriginalToV1.migrate({ G }).relaunch,
      convertLegacyRelaunch(G),
    );
    const save = SaveData.fromJson({ G });
    assert.equal(save.relaunch.wild.purchased, true);
    assert.equal(save.relaunch.wild.enabled, false);
    assert.equal(save.relaunch.dungeon.enabled, true);
    assert.equal(save.relaunch.dungeon.mode, 'chest');
    assert.deepEqual(G, before);
  });
  test('legacy enabled flags imply a purchased module; missing legacy data never gifts one', () => {
    const model = new RelaunchData(
      convertLegacyRelaunch({
        automation: { autoRelaunch: true, autoDungeonRelaunch: true },
      }),
    );
    assert.ok(model.wild.purchased && model.dungeon.purchased);
    assert.equal(
      new RelaunchData(convertLegacyRelaunch({})).wild.purchased,
      false,
    );
  });
  test('every town shelf exposes genuine non-inventory upgrades with original prices and valid glyphs', () => {
    const save = fresh();
    for (const location of LocationDB.getInstance()
      .getAll()
      .filter((l) => l.shop)) {
      const offers = ShopCatalog.offers(location, save).filter(
        (o) => o.kind === ShopOfferKinds.UPGRADE,
      );
      assert.equal(offers.length, 2, location.id);
      assert.deepEqual(
        offers.map((o) => o.unitPrice),
        [2500, 5000],
      );
      for (const offer of offers) {
        assert.equal(offer.currency, 'questPoint');
        assert.equal(ShopCatalog.maxQuantity(offer, save), 1);
        assert.equal(ShopCatalog.totalPrice(offer, 1, save), offer.unitPrice);
        assert.equal(ShopCatalog.totalPrice(offer, 999, save), offer.unitPrice);
        assert.ok(IconRegistry.has(offer.icon));
        assert.equal(ItemDB.getInstance().has(offer.key), false);
      }
    }
    assert.ok(ShopDB.getInstance().count > 0);
  });
  test('shop purchase is quantity-one, one-write, visible atomically on wallet events, and never inserts fake items', () => {
    const save = fresh(),
      inventory = copy(save.inventory.serialize());
    let atomic = false;
    const off = bus.subscribe(CurrencyChangedEvent, (e) => {
      if (e.currencyKey === 'questPoint') atomic = save.relaunch.wild.purchased;
    });
    try {
      assert.equal(
        writes(() =>
          assert.equal(
            shops.buy('autoRelaunch', 999, 'pewter'),
            PurchaseResults.OK,
          ),
        ),
        1,
      );
    } finally {
      off();
    }
    assert.equal(atomic, true);
    assert.equal(save.currencies.get('questPoint'), 17500);
    assert.equal(save.relaunch.wild.enabled, true);
    assert.deepEqual(save.inventory.serialize(), inventory);
    assert.equal(
      shops.getOffers('pewter').some((o) => o.key === 'autoRelaunch'),
      false,
    );
    assert.equal(
      writes(() =>
        assert.equal(shops.buyRelaunch('wild'), PurchaseResults.SOLD_OUT),
      ),
      0,
    );
  });
  test('direct relaunch-bar purchase shares the shelf transaction and does not evade league-shop gating', () => {
    const save = fresh();
    assert.equal(
      shops.buy('autoDungeonRelaunch', 1, 'indigo'),
      PurchaseResults.LOCKED,
    );
    assert.equal(save.relaunch.dungeon.purchased, false);
    assert.equal(
      writes(() => buy('dungeon')),
      1,
    );
    assert.equal(save.currencies.get('questPoint'), 15000);
    assert.equal(
      shops.getOffers('pewter').filter((o) => o.kind === ShopOfferKinds.UPGRADE)
        .length,
      1,
    );
  });
  test('insufficient funds never pay partially, grant ownership, or write a save', () => {
    const save = fresh();
    save.currencies.add('questPoint', -save.currencies.get('questPoint'));
    const raw = copy(save.serialize());
    assert.equal(
      writes(() =>
        assert.equal(shops.buyRelaunch('wild'), PurchaseResults.NOT_ENOUGH),
      ),
      0,
    );
    assert.deepEqual(save.serialize(), raw);
  });
  test('ownership, enabled switches and remembered mode survive save JSON and never leak to another save', () => {
    const save = fresh();
    buy('wild');
    buy('dungeon');
    assert.ok(relaunch.setEnabledFor('wild', false));
    save.relaunch.dungeon.mode = 'boss';
    const loaded = SaveData.fromJson(copy(save.serialize()));
    assert.deepEqual(loaded.relaunch.serialize(), save.relaunch.serialize());
    const other = saves.createNewSave('Other automation', 'squirtle');
    assert.equal(other.relaunch.dungeon.purchased, false);
    assert.equal(relaunch.getSnapshot('dungeon').pending, false);
  });
});

describe('Authoritative natural wild defeat and cancellation', (test) => {
  test('natural wild defeat heals normally and restarts exactly once after five seconds, without a per-use fee', () =>
    clock((c) => {
      const save = fresh();
      buy('wild');
      const qp = save.currencies.get('questPoint');
      const events = [];
      const off = bus.subscribe(BattleRunFinishedEvent, (e) => events.push(e));
      try {
        wildDefeat();
        assert.deepEqual(
          events.map((e) => [e.kind, e.outcome, e.natural]),
          [['wild', 'defeat', true]],
        );
        assert.ok(save.team.every((p) => !p.isFainted()));
        assert.ok(relaunch.getSnapshot('wild').pending);
        c.advance(4999);
        assert.equal(
          writes(() => relaunch.update(0.1)),
          0,
        );
        assert.equal(battle.isActive(), false);
        c.advance(1);
        assert.equal(
          writes(() => relaunch.update(0.1)),
          0,
        );
        assert.equal(battle.isActive(), true);
        assert.equal(save.currencies.get('questPoint'), qp);
        const started = battle.getBattleSummary().run.startedAt;
        for (let i = 0; i < 5; i++) relaunch.update(0.1);
        assert.equal(battle.getBattleSummary().run.startedAt, started);
      } finally {
        off();
      }
    }));
  test('ordinary wild wins keep chaining for free without either upgrade or intermediate relaunch', () => {
    const save = fresh('Free ordinary chain', 'route1', true);
    assert.ok(battle.startBattle('route1'));
    for (
      let i = 0;
      i < 20000 && (battle.getBattleSummary().run?.wins || 0) < 2;
      i++
    )
      battle.update(0.1);
    assert.ok(battle.isActive());
    assert.ok(save.statistics.wildWins.route1 >= 2);
    assert.equal(relaunch.getSnapshot('wild').pending, false);
    battle.endBattle(false);
  });
  test('voluntary wild Quit is a stopped event, never a natural defeat', () =>
    clock((c) => {
      fresh();
      buy('wild');
      const events = [];
      const off = bus.subscribe(BattleRunFinishedEvent, (e) => events.push(e));
      try {
        assert.ok(battle.startBattle());
        battle.endBattle(false);
        assert.deepEqual(
          events.map((e) => [e.kind, e.outcome, e.natural]),
          [['wild', 'stopped', false]],
        );
        c.advance(6000);
        relaunch.update(0.1);
        assert.equal(battle.isActive(), false);
        assert.equal(relaunch.getSnapshot('wild').pending, false);
      } finally {
        off();
      }
    }));
  test('real gym defeat and one-off encounter defeat never arm wild automation', () => {
    fresh();
    buy('wild');
    assert.ok(TrainerSystem.getInstance().challenge('brock'));
    finishBattle();
    assert.equal(relaunch.getSnapshot('wild').pending, false);
    saves.getCurrentSave().team[0].hp = 1;
    assert.ok(battle.startBattle('route1', { chain: false }));
    finishBattle();
    assert.equal(relaunch.getSnapshot('wild').pending, false);
  });
  test('cancel only drops this countdown; the upgrade and enabled preference remain owned', () =>
    clock((c) => {
      const save = fresh();
      buy('wild');
      wildDefeat();
      assert.equal(
        writes(() => assert.ok(relaunch.cancel())),
        0,
      );
      c.advance(6000);
      relaunch.update(0.1);
      assert.equal(battle.isActive(), false);
      assert.ok(save.relaunch.wild.purchased && save.relaunch.wild.enabled);
      assert.ok(relaunch.getSnapshot('wild').cancelled);
    }));
  test('disable cancels immediately in one write and enabling alone never starts a session', () =>
    clock((c) => {
      fresh();
      buy('wild');
      wildDefeat();
      assert.equal(
        writes(() => assert.ok(relaunch.setEnabledFor('wild', false))),
        1,
      );
      assert.equal(relaunch.getSnapshot('wild').pending, false);
      assert.equal(
        writes(() => assert.ok(relaunch.setEnabledFor('wild', false))),
        0,
      );
      assert.ok(relaunch.setEnabledFor('wild', true));
      c.advance(6000);
      relaunch.update(0.1);
      assert.equal(battle.isActive(), false);
    }));
  test('travel away and back cannot resurrect the cancelled source-route countdown', () =>
    clock((c) => {
      const save = fresh();
      buy('wild');
      wildDefeat();
      save.access.unlockLocation('pallet');
      assert.ok(LocationSystem.getInstance().travelTo('pallet'));
      save.access.unlockLocation('route1');
      assert.ok(LocationSystem.getInstance().travelTo('route1'));
      c.advance(6000);
      relaunch.update(0.1);
      assert.equal(relaunch.getSnapshot('wild').pending, false);
      assert.equal(battle.isActive(), false);
    }));
  test('save switch/reload cancels transient deadlines while preserving purchases and exact other state', () =>
    clock((c) => {
      const first = fresh();
      buy('wild');
      wildDefeat();
      saves.saveCurrent();
      const second = saves.createNewSave('Other deadline', 'squirtle');
      assert.equal(second.relaunch.wild.enabled, false);
      saves.loadSlot(first.id);
      c.advance(6000);
      relaunch.update(0.1);
      assert.equal(battle.isActive(), false);
      assert.ok(saves.getCurrentSave().relaunch.wild.purchased);
      assert.equal(relaunch.getSnapshot('wild').pending, false);
    }));
  test('starting a manual battle or training takes precedence and cancels the pending countdown', () => {
    fresh();
    buy('wild');
    wildDefeat();
    assert.ok(TrainerSystem.getInstance().challenge('brock'));
    assert.equal(relaunch.getSnapshot('wild').pending, false);
    finishBattle();
    const save = fresh();
    buy('wild');
    wildDefeat();
    TrainingSystem.getInstance().init();
    const trainee = PokemonFactory.create('pikachu', 20);
    addOwned(save, trainee);
    assert.equal(
      TrainingSystem.getInstance().startSession(trainee.uid, 'move', 0).result,
      'ready',
    );
    assert.equal(relaunch.getSnapshot('wild').pending, false);
    TrainingSystem.getInstance().cancelSession(0);
  });
  test('firing revalidates the actual team, and nonpositive ticks never advance a countdown', () =>
    clock((c) => {
      const save = fresh();
      buy('wild');
      wildDefeat();
      save.team[0].hp = 0;
      c.advance(6000);
      for (const dt of [0, -1, NaN, Infinity]) relaunch.update(dt);
      assert.ok(relaunch.getSnapshot('wild').pending);
      relaunch.update(0.1);
      assert.equal(battle.isActive(), false);
      assert.equal(relaunch.getSnapshot('wild').blocked, 'team');
      assert.equal(relaunch.getSnapshot('wild').pending, false);
    }));
  test('automatic start publishes a typed summary-close request once, not UI calls', () =>
    clock((c) => {
      fresh();
      buy('wild');
      wildDefeat();
      const closes = [];
      const off = bus.subscribe(ModalCloseRequestedEvent, (e) =>
        closes.push(e.modalId),
      );
      try {
        c.advance(5000);
        relaunch.update(0.1);
        relaunch.update(0.1);
        assert.deepEqual(closes, [ModalIds.BATTLE_SUMMARY]);
      } finally {
        off();
      }
    }));
});

describe('Complete live dungeon pilot and relaunch', (test) => {
  test('pilot is free but independently gated at three clears of this dungeon, not any other one', () => {
    const save = fresh('Pilot gate', 'mtmoon', true);
    save.dungeons.clears.viridianforest = 99;
    assert.equal(dungeon.isAutoUnlocked('mtmoon'), false);
    assert.ok(dungeon.enter('mtmoon', { autoMode: 'boss' }));
    assert.equal(dungeon.getRun().auto, false);
    assert.equal(
      writes(() => assert.equal(dungeon.setAuto('boss'), false)),
      0,
    );
    save.dungeons.clears.mtmoon = 2;
    assert.equal(dungeon.setAuto('farm'), false);
    save.dungeons.clears.mtmoon = 3;
    assert.equal(
      writes(() => assert.ok(dungeon.setAuto('chest'))),
      1,
    );
    assert.equal(dungeon.getRun().auto, 'chest');
    assert.equal(save.relaunch.dungeon.mode, 'chest');
    assert.equal(save.relaunch.dungeon.purchased, false);
  });
  test('active pilot mode and map survive JSON; manual mode keeps the last non-off preference', () => {
    const save = fresh('Pilot save', 'mtmoon', true);
    save.dungeons.clears.mtmoon = 3;
    dungeon.enter('mtmoon');
    dungeon.setAuto('boss');
    const raw = copy(save.serialize()),
      loaded = SaveData.fromJson(raw);
    assert.equal(loaded.dungeons.run.auto, 'boss');
    assert.deepEqual(loaded.dungeons.run.map, raw.dungeons.run.map);
    dungeon.setAuto(false);
    assert.equal(save.relaunch.dungeon.mode, 'boss');
    assert.equal(dungeon.getRun().auto, false);
    assert.equal(dungeon.setAuto('invalid'), false);
    assert.equal(
      new DungeonRunData({ ...raw.dungeons.run, auto: true }).auto,
      'farm',
    );
    assert.equal(
      new DungeonRunData({ ...raw.dungeons.run, auto: 'invalid' }).auto,
      false,
    );
  });
  test('initial pilot pacing waits 400 ms and paused manual mode never moves or writes', () =>
    clock((c) => {
      const save = fresh('Pilot clock', 'mtmoon', true);
      save.dungeons.clears.mtmoon = 3;
      dungeon.enter('mtmoon', { autoMode: 'boss' });
      const position = dungeon.getRun().pos;
      pilot.update(0.1);
      c.advance(399);
      assert.equal(
        writes(() => pilot.update(0.1)),
        0,
      );
      assert.equal(dungeon.getRun().pos, position);
      c.advance(1);
      pilot.update(0.1);
      assert.ok(dungeon.getRun().pos !== position);
      dungeon.setAuto(false);
      const raw = copy(save.serialize());
      c.advance(10000);
      assert.equal(
        writes(() => pilot.update(0.1)),
        0,
      );
      assert.deepEqual(save.serialize(), raw);
    }));
  test('planner avoids incidental guardian traversal and chest mode chooses the genuinely cheaper combat-avoiding path', () => {
    const run = grid(5, 3);
    run.map.tiles.c1r0.type = 'combat';
    run.map.tiles.c2r0.type = 'chest';
    run.map.tiles.c0r2.type = 'chest';
    run.map.tiles.c0r2.revealed = true;
    assert.equal(DungeonPilotRules.destination(run, 'chest'), 'c0r2');
    const path = DungeonPilotRules.path(run, 'c4r1', 0);
    assert.ok(path && !path.includes(run.bossTile));
    assert.equal(DungeonPilotRules.destination(run, 'invalid'), null);
  });
  test('farm pilot actually clears a multi-floor generated dungeon and settles all exploration/loot before every guardian', () =>
    clock((c) => {
      const result = finishPilot(c, 'farm');
      assert.ok(result.bosses >= 2, 'multi-floor run');
      assert.ok(
        result.unfinishedAtBoss.every((list) => list.length === 0),
        JSON.stringify(result.unfinishedAtBoss),
      );
    }));
  test('boss pilot actually finishes a multi-floor generated dungeon without unnecessarily emptying every room', () =>
    clock((c) => {
      const result = finishPilot(c, 'boss');
      assert.ok(result.bosses >= 2);
      assert.ok(result.unfinishedAtBoss.some((list) => list.length > 0));
    }));
  test('chest pilot actually collects all chests before guardians while leaving unnecessary combat rooms', () =>
    clock((c) => {
      const result = finishPilot(c, 'chest');
      assert.ok(
        result.unfinishedAtBoss.every((list) => !list.includes('chest')),
      );
      assert.ok(
        result.unfinishedAtBoss.some(
          (list) => list.includes('combat') || list.includes('elite'),
        ),
      );
    }));
  test('natural final clear arms once and charges the normal next entry toll in one write with remembered pilot', () =>
    clock((c) => {
      const { save } = finishPilot(c, 'boss', 'viridianforest');
      buy('dungeon');
      assert.ok(dungeon.enter('viridianforest', { autoMode: 'boss' }));
      for (
        let i = 0;
        i < 50000 && (dungeon.isActive() || battle.isActive());
        i++
      ) {
        c.advance(100);
        battle.update(0.1);
        pilot.update(0.1);
      }
      assert.equal(save.dungeons.lastRun.outcome, 'cleared');
      assert.ok(relaunch.getSnapshot('dungeon').pending);
      const tokens = save.currencies.get('dungeonToken'),
        qp = save.currencies.get('questPoint'),
        toll = dungeon.entryToll('viridianforest');
      c.advance(4999);
      relaunch.update(0.1);
      assert.equal(dungeon.isActive(), false);
      c.advance(1);
      assert.equal(
        writes(() => relaunch.update(0.1)),
        1,
      );
      assert.ok(dungeon.isActive());
      assert.equal(save.currencies.get('dungeonToken'), tokens - toll);
      assert.equal(save.currencies.get('questPoint'), qp);
      assert.equal(dungeon.getRun().auto, 'boss');
      relaunch.update(0.1);
      assert.equal(save.currencies.get('dungeonToken'), tokens - toll);
    }));
  test('natural dungeon wipe triggers dungeon relaunch, never a wild relaunch, and respects the pilot gate', () =>
    clock((c) => {
      const save = fresh('Wipe chain', 'viridianforest');
      buy('wild');
      buy('dungeon');
      assert.ok(dungeon.enter());
      forceBossVisible();
      finishBattle();
      assert.equal(save.dungeons.lastRun.outcome, 'wipe');
      assert.ok(relaunch.getSnapshot('dungeon').pending);
      assert.equal(relaunch.getSnapshot('wild').pending, false);
      const tokens = save.currencies.get('dungeonToken');
      c.advance(5000);
      assert.equal(
        writes(() => relaunch.update(0.1)),
        1,
      );
      assert.ok(dungeon.isActive());
      assert.equal(dungeon.getRun().auto, false);
      assert.equal(
        save.currencies.get('dungeonToken'),
        tokens - dungeon.entryToll('viridianforest'),
      );
    }));
  test('manual ascend and abandon never rearm a purchased dungeon relaunch', () =>
    clock((c) => {
      fresh('Manual exits', 'viridianforest', true);
      buy('dungeon');
      for (const method of ['ascend', 'abandon']) {
        assert.ok(dungeon.enter());
        assert.ok(dungeon[method]());
        c.advance(6000);
        relaunch.update(0.1);
        assert.equal(dungeon.isActive(), false);
        assert.equal(relaunch.getSnapshot('dungeon').pending, false);
      }
    }));
  test('insufficient entrance tokens stop once, with no retry spin or late automatic purchase', () =>
    clock((c) => {
      const save = fresh('Toll exhausted', 'viridianforest');
      buy('dungeon');
      dungeon.enter();
      forceBossVisible();
      finishBattle();
      assert.ok(relaunch.getSnapshot('dungeon').pending);
      save.currencies.add('dungeonToken', -save.currencies.get('dungeonToken'));
      c.advance(5000);
      assert.equal(
        writes(() => relaunch.update(0.1)),
        0,
      );
      assert.equal(relaunch.getSnapshot('dungeon').blocked, 'tokens');
      assert.equal(relaunch.getSnapshot('dungeon').pending, false);
      save.currencies.add('dungeonToken', 1000);
      c.advance(20000);
      assert.equal(
        writes(() => relaunch.update(0.1)),
        0,
      );
      assert.equal(dungeon.isActive(), false);
    }));
  test('reload resumes the saved map and genuine pending fight without charging a second entrance toll', () => {
    const save = fresh('Pilot reload', 'mtmoon', true);
    save.dungeons.clears.mtmoon = 3;
    dungeon.enter('mtmoon', { autoMode: 'farm' });
    const saved = copy(save.dungeons.run.serialize()),
      tokens = save.currencies.get('dungeonToken');
    saves.saveCurrent();
    saves.loadSlot(save.id);
    assert.equal(saves.getCurrentSave().currencies.get('dungeonToken'), tokens);
    assert.deepEqual(saves.getCurrentSave().dungeons.run.serialize(), saved);
    assert.equal(saves.getCurrentSave().dungeons.run.auto, 'farm');
  });
});

describe('Price quotes and stable automation widgets', (test) => {
  test('every unaffordable facility offer keeps its real price outside the hidden action, with no balance-warning prose', () => {
    const save = fresh();
    for (const id of ['money', 'questPoint', 'diamond'])
      save.currencies.add(id, -save.currencies.get(id));
    for (const feature of ['hatchery', 'training', 'mine'])
      for (const model of FacilityManagementSystem.getInstance()
        .getUpgrades(feature)
        .filter((m) => !m.owned)) {
        const card = new FacilityUpgradeCard(model, () => {});
        try {
          assert.ok(card._price.isVisible());
          assert.ok(card._quote.isVisible());
          assert.equal(card._price.getParent(), card._quote);
          assert.equal(card._buy.isVisible(), false);
          assert.equal(card._status.isVisible(), false);
        } finally {
          card.destroy();
        }
      }
  });
  test('slot offer and all fifteen helper quotes keep the amount without insufficient-balance text', () => {
    const save = fresh();
    for (const id of ['money', 'questPoint', 'diamond'])
      save.currencies.add(id, -save.currencies.get(id));
    const slot = new TrainingLockedSlotCard();
    slot.setModel(
      FacilityManagementSystem.getInstance()
        .getUpgrades('training')
        .find((m) => m.id === 'slots'),
    );
    assert.ok(slot._quote.isVisible());
    assert.equal(slot._price.getParent(), slot._quote);
    slot.destroy();
    let n = 0;
    for (const sector of ['hatchery', 'training', 'mine'])
      for (const model of FacilityStaffSystem.getInstance().getSnapshot(
        sector,
      )) {
        const card = new StaffCard(model);
        assert.equal(card._price.getParent(), card._quote);
        assert.ok(card._price.isVisible());
        assert.equal(
          card._status
            .getDomElement()
            .textContent.toLowerCase()
            .includes('insuff'),
          false,
        );
        card.destroy();
        n++;
      }
    assert.equal(n, 15);
  });
  test('both localized relaunch controls keep only the same stable Auto switch, without saving', () =>
    clock((c) => {
      for (const language of ['fr', 'en']) {
        LocalizationManager.getInstance().setLanguage(language);
        fresh();
        buy('wild');
        const view = new RelaunchControls('wild', 'unit');
        try {
          const node = view._switch.getDomElement();
          wildDefeat();
          assert.equal(view._switch.getDomElement(), node);
          assert.equal(view.getChildren().length,1);
          assert.equal(
            writes(() => {
              for (let i = 0; i < 4; i++) {
                c.advance(500);
                relaunch.update(0.1);
                view.refresh();
              }
            }),
            0,
          );
          assert.equal(view.getChildren().length,1);
          assert.equal(relaunch.getSnapshot('wild').pending,true);
          assert.equal(view._switch.getDomElement().textContent,t(RelaunchRules.UPGRADES.wild.toggleLabelKey));
          assert.equal(view._switch.getDomElement(), node);
        } finally {
          view.destroy();
        }
      }
      LocalizationManager.getInstance().setLanguage('fr');
    }));
  test('pilot control choices remain the same objects when modes and run state change', () => {
    const save = fresh('Stable pilot', 'mtmoon', true);
    save.dungeons.clears.mtmoon = 3;
    dungeon.enter();
    const view = new DungeonPilotControls();
    try {
      const nodes = [...view._buttons.values()].map((b) => b.getDomElement());
      dungeon.setAuto('boss');
      assert.deepEqual(
        [...view._buttons.values()].map(
          (b) =>
            b.getDomElement() === nodes[[...view._buttons.values()].indexOf(b)],
        ),
        [true, true, true, true],
      );
      assert.equal(
        view._buttons.get('boss').getDomElement().getAttribute('aria-pressed'),
        'true',
      );
    } finally {
      view.destroy();
    }
  });
  test('generic typed close requests only close their target modal', () => {
    fresh();
    const a = new UIModal({ id: 'typed-close-a' }),
      b = new UIModal({ id: 'typed-close-b' });
    try {
      a.open();
      b.open();
      bus.dispatch(new ModalCloseRequestedEvent('typed-close-a'));
      assert.equal(a.isOpen(), false);
      assert.equal(b.isOpen(), true);
    } finally {
      a.destroy();
      b.destroy();
    }
  });
});
