/** @file FacilityParity.test.js @brief Facility parity contracts, resumable JSON battles and shared view composition. */
import fs from 'node:fs';
import { FacilityFilterData } from '../src/data/save/FacilityFilterData.js';
import { FacilityCandidateRules } from '../src/systems/facilities/FacilityCandidateRules.js';
import { FacilityFilterRules } from '../src/config/FacilityFilterRules.js';
import { FacilityFilterGrid } from '../src/panels/facilities/FacilityFilterGrid.js';
import { MigrationV17ToV18 } from '../src/data/save/migrations/MigrationV17ToV18.js';
import { LocalizationManager } from '../src/localization/LocalizationManager.js';
import { IconRegistry } from '../src/ui/icons/IconRegistry.js';
import { MineUiRules } from '../src/config/MineUiRules.js';
import { MineLootDB } from '../src/data/items/MineLootDB.js';
import { HatcheryPanel } from '../src/panels/HatcheryPanel.js';
import { TrainingCenterPanel } from '../src/panels/TrainingCenterPanel.js';
import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { Random } from '../src/core/Random.js';
import { SeededRandom } from '../src/core/SeededRandom.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { SaveStorage } from '../src/systems/SaveStorage.js';
import { MigrationOriginalToV1 } from '../src/data/save/migrations/MigrationOriginalToV1.js';
import { MigrationV16ToV17 } from '../src/data/save/migrations/MigrationV16ToV17.js';
import { PokemonData } from '../src/data/pokemon/PokemonData.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { TalentDB } from '../src/data/pokemon/TalentDB.js';
import { QuestDB } from '../src/data/quests/QuestDB.js';
import { LeagueDB } from '../src/data/trainers/LeagueDB.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { TrainingProgression } from '../src/systems/facilities/TrainingProgression.js';
import { HatcherySystem } from '../src/systems/HatcherySystem.js';
import { HatcheryQueue } from '../src/systems/facilities/HatcheryQueue.js';
import { MineSystem } from '../src/systems/MineSystem.js';
import { QuestSystem } from '../src/systems/QuestSystem.js';
import { FacilityStaffSystem } from '../src/systems/FacilityStaffSystem.js';
import { FacilityPokemonSelectionSystem } from '../src/systems/FacilityPokemonSelectionSystem.js';
import { PokemonUsageSystem } from '../src/systems/PokemonUsageSystem.js';
import { HeldItemSystem } from '../src/systems/HeldItemSystem.js';
import { ItemUseSystem } from '../src/systems/ItemUseSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { MinePanel } from '../src/panels/MinePanel.js';
import { PokemonTalentSystem } from '../src/systems/PokemonTalentSystem.js';
import { CatchSystem } from '../src/systems/CatchSystem.js';
import { CatchRules } from '../src/systems/catch/CatchRules.js';
import { BattleSession, BattleOutcomes } from '../src/systems/battle/BattleSession.js';
import { BattleLog } from '../src/systems/battle/BattleLog.js';
import { PokemonActionIds, PokemonUsageIds } from '../src/config/PokemonUsageRules.js';
import { STAFF_CATALOG } from '../src/data/facilities/StaffCatalog.js';
import { StaffRules } from '../src/config/StaffRules.js';
import { HatcheryRules } from '../src/config/HatcheryRules.js';
import { MineRules } from '../src/config/MineRules.js';
import { TrainingRules } from '../src/config/TrainingRules.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { BoxPokemonSelectedEvent } from '../src/core/events/BoxPokemonSelectedEvent.js';
import { BattleFoeKnockedOutEvent } from '../src/core/events/BattleFoeKnockedOutEvent.js';
import { SaveCheckpointRequestedEvent } from '../src/core/events/SaveCheckpointRequestedEvent.js';
import { UIKeyedList } from '../src/ui/UIKeyedList.js';
import { UIText } from '../src/ui/UIText.js';
import { UIPokemonSprite } from '../src/ui/UIPokemonSprite.js';
import { UIItemSprite } from '../src/ui/UIItemSprite.js';
import { UISpriteFrame } from '../src/ui/UISpriteFrame.js';
import { AssetPaths } from '../src/config/AssetPaths.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { UIImage } from '../src/ui/UIImage.js';
import { UIDropdown } from '../src/ui/UIDropdown.js';
import { PokemonGridEntry } from '../src/panels/components/PokemonGridEntry.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { PokedexPanel } from '../src/panels/fullscreen/PokedexPanel.js';
import { BoxPanel } from '../src/panels/fullscreen/BoxPanel.js';
import { FacilityManagementModal } from '../src/panels/facilities/FacilityManagementModal.js';
import { BattlePanel } from '../src/panels/BattlePanel.js';

const saves = SaveSystem.getInstance();
const training = TrainingSystem.getInstance();
const hatchery = HatcherySystem.getInstance();
const mine = MineSystem.getInstance();
const staff = FacilityStaffSystem.getInstance();
const quests = QuestSystem.getInstance();
const copy = (value) => JSON.parse(JSON.stringify(value));

/** Builds a domain fixture, never a claim or a synthetic replacement for a BattleSession. */
function fixture(name) {
  training.onDestroy(); hatchery.onDestroy(); quests.onDestroy();
  const battle = BattleSystem.getInstance();
  if (battle.isActive()) battle.endBattle(false);
  const save = saves.createNewSave(name, 'charmander');
  save.player.location = 'route1';
  for (const id of ['hatchery', 'training', 'mine']) save.access.unlockFeature(id);
  for (const badge of ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni']) save.player.earnBadge(badge);
  for (const league of LeagueDB.getInstance().getAll().filter((entry) => entry.region === 'kanto')) save.player.earnBadge(league.badge);
  for (const [currency, amount] of [['money', 100000], ['questPoint', 100000], ['diamond', 10000]]) {
    save.currencies.add(currency, amount - save.currencies.get(currency));
  }
  save.quests.setMainStep('kanto', 25);
  training.setRandom(Random.sequence([0.314159]));
  training.init(); hatchery.init();
  return save;
}

function owned(save, species = 'pikachu', level = 20) {
  const pokemon = PokemonFactory.create(species, level);
  assert.ok(BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true }));
  return pokemon;
}
function knockout(count = 1) {
  for (let index = 0; index < count; index++) EventBus.getInstance().dispatch(new BattleFoeKnockedOutEvent('rattata', 5, 'route1', { deferSave: true }));
}
function atJohtoHatchQuest(save) {
  save.player.region = 'johto'; save.player.location = 'jroute34';
  const chain = QuestDB.getInstance().getMainChain('johto');
  const index = chain.findIndex((entry) => entry.key === 'main.111');
  assert.ok(index > 0);
  save.quests.setMainStep('johto', index);
  quests.init(); quests.syncMainQuest();
  return index;
}
function writeCount(action) {
  const previous = saves.saveCurrent;
  let writes = 0;
  saves.saveCurrent = function () { writes++; return previous.call(this); };
  try { action(); } finally { saves.saveCurrent = previous; }
  return writes;
}

/** Independent finite engine fixture with its own serializable random stream. */
function finiteBattle({ scaled = false, onFoeDefeated = null } = {}) {
  const player = PokemonFactory.create('pikachu', 60);
  player.moves = ['thunderbolt', 'quick_attack'];
  const foe = PokemonFactory.create('magikarp', 40);
  foe.moves = ['tackle'];
  const reserve = PokemonFactory.create('magikarp', 35);
  reserve.moves = ['tackle'];
  const session = new BattleSession({ team: [player], foe, random: new SeededRandom(123456), training: true,
    weather: 'rain', healBetweenFoes: true, foeOptions: scaled ? { hpMultiplier: 3 } : {},
    reserves: [{ pokemon: reserve }], onFoeDefeated });
  session.start();
  return { session, player };
}

describe('Facility schema and exact battle replay', (test) => {
  test('original imports preserve species talent unlocks and recruited staff level, fractional XP and activation', () => {
    const definition = PokemonDB.getInstance().getById('pikachu');
    const ids = [...definition.talents, definition.hiddenTalent].filter(Boolean);
    const raw = { G: { team: [{ id: 25, uid: 'legacy-unique', level: 10, talent: ids[0] }],
      unlockedTalents: { 25: ids.map((id) => id.toUpperCase()), 99999: ['blaze'] },
      staff: { owned: { manager_cinnabar: true, manager_daisy: true, invented: true },
        level: { manager_cinnabar: 4, manager_daisy: 2 }, xp: { manager_cinnabar: 6.5 },
        active: { hatchery: ['manager_cinnabar', 'manager_daisy'] } } } };
    const before = copy(raw);
    const migrated = MigrationOriginalToV1.migrate(raw);
    assert.deepEqual(raw, before);
    assert.deepEqual(MigrationOriginalToV1.migrate(raw), migrated);
    const save = SaveData.fromJson(raw);
    for (const id of ids) assert.ok(save.talents.has('pikachu', id));
    assert.equal(save.staff.owned.manager_cinnabar.level, 4);
    assert.equal(save.staff.owned.manager_cinnabar.xp, 6.5);
    assert.equal(save.staff.active.hatchery, 'manager_cinnabar');
    assert.equal(save.staff.owned.invented, undefined);
    assert.equal(save.collection.size, 1);
    assert.deepEqual(SaveData.fromJson(copy(save.serialize())).staff.serialize(), save.staff.serialize());
  });

  test('v16 → v17 is pure, deterministic and preserves uid facts while backfilling equipped talents', () => {
    const pokemon = PokemonFactory.create('pikachu', 12).serialize();
    const raw = { version: 16, collection: [pokemon], team: [pokemon.uid], hatchery: { maxSlots: 1, slots: [null] }, mine: { energy: 70 } };
    const before = copy(raw);
    const migrated = MigrationV16ToV17.migrate(raw);
    assert.deepEqual(raw, before);
    assert.deepEqual(MigrationV16ToV17.migrate(raw), migrated);
    assert.equal(migrated.version, 17);
    assert.deepEqual(migrated.collection, raw.collection);
    assert.deepEqual(migrated.talents[pokemon.species], [pokemon.talent]);
    assert.deepEqual(migrated.mine.unlockedTools, ['chisel', 'hammer']);
    const save = SaveData.fromJson(migrated);
    assert.equal(save.team[0], save.collection.get(pokemon.uid));
    assert.equal(save.training.slots[0].battle, null);
    assert.equal(save.talents.unlock('pikachu', 'not-a-talent'), false);
    const foreign = TalentDB.getInstance().getAll().find((entry) => !PokemonDB.getInstance().getById('pikachu').talents.includes(entry.id) && entry.id !== PokemonDB.getInstance().getById('pikachu').hiddenTalent);
    assert.equal(save.talents.unlock('pikachu', foreign.id), false, 'a ledger never infers a different species from a talent');
  });

  test('JSON resume keeps HP, weather Infinity, turns, modifiers, triggers, cooldowns, RNG and remaining foes', () => {
    const { session, player } = finiteBattle();
    session.update(0.25);
    player.hp -= 5;
    session.active.status = 'burn'; session.active.statusTurns = 3;
    session.active.statMods.atk = 1.2; session.active.statModTurns.atk = 2;
    session.active.usedTriggers.add('terrain-seed'); session.active.seedBoost = true;
    session.foe.status = 'sleep'; session.foe.statusTurns = 2;
    session.field.setTerrain('grassy', 3);
    const state = copy(session.captureState());
    assert.equal(state.field.weatherTurns, null, 'Infinity has an explicit JSON representation');
    assert.equal('pokemon' in state.teamState[0], false, 'no copy of the owned Pokémon');
    const owner = new PokemonData(copy(player.serialize()));
    const restored = BattleSession.restore(state, { resolvePokemon: (uid) => uid === owner.uid ? owner : null });
    assert.ok(restored);
    assert.equal(restored.active.pokemon, owner);
    assert.equal(restored.field.weatherTurns, Infinity);
    assert.deepEqual(copy(restored.captureState()), state, 'restoration replays neither entry effects nor start()');
    for (let tick = 0; tick < 300; tick++) {
      session.update(0.1); restored.update(0.1);
      assert.deepEqual(copy(restored.captureState()), copy(session.captureState()), `same deterministic progression at tick ${tick}`);
    }
  });

  test('temporary NPC HP scaling survives PokemonData clamping without altering the owned collection', () => {
    const { session, player } = finiteBattle({ scaled: true });
    session.foe.takeDamage(7);
    const state = copy(session.captureState());
    assert.ok(state.foes[0].hp > session.foe.pokemon.getMaxHp());
    const hp = player.hp;
    const restored = BattleSession.restore(state, { resolvePokemon: () => player });
    assert.ok(restored);
    assert.equal(restored.foe.hp, session.foe.hp);
    assert.equal(restored.foe.maxHp, session.foe.maxHp);
    assert.equal(player.hp, hp);
  });

  test('a settled pending transition resumes once without firing its KO callback again', () => {
    let originalKOs = 0, restoredKOs = 0;
    const previousNow = Date.now;
    let clock = 100000;
    Date.now = () => clock;
    try {
      const { session, player } = finiteBattle({ onFoeDefeated: () => originalKOs++ });
      session.pauseForCapture(500);
      session.foe.takeDamage(session.foe.hp);
      session._resolve();
      assert.equal(originalKOs, 1);
      assert.equal(session._pendingFoeAdvance, true);
      const state = copy(session.captureState());
      const restored = BattleSession.restore(state, { resolvePokemon: () => new PokemonData(player.serialize()), onFoeDefeated: () => restoredKOs++ });
      assert.ok(restored);
      clock += 600;
      session.update(0.1); restored.update(0.1);
      assert.equal(restoredKOs, 0, 'the already settled encounter is not paid or counted twice');
      assert.equal(restored.reserveCount, 0);
      assert.deepEqual(copy(restored.captureState()), copy(session.captureState()));
    } finally { Date.now = previousNow; }
  });

  test('malformed snapshots, prototype keys, invalid counters and foreign references fail atomically', () => {
    const { session, player } = finiteBattle();
    const state = copy(session.captureState());
    const changes = [
      (dto) => { dto.foeState = []; },
      (dto) => { dto.field.tick = 'injected'; },
      (dto) => { dto.field.weather = {}; },
      (dto) => { dto.foeState.statMods = JSON.parse('{"__proto__":{"polluted":true}}'); },
      (dto) => { dto.foeState.statusTurns = 'three'; },
      (dto) => { dto.teamState[0].side = 'foe'; },
      (dto) => { dto.foes[0].species = 'unknown'; },
      (dto) => { dto.foes[0].hp = 999999; },
      (dto) => { dto.randomState = 0; },
      (dto) => { dto.teamUids[0] = 'missing'; },
      (dto) => { dto.defeatedEncounters = [{ foeIndex: 999 }]; },
      (dto) => { dto.reserves.push(copy(dto.reserves[0])); }
    ];
    for (const change of changes) {
      const dto = copy(state); change(dto);
      const before = player.serialize();
      assert.equal(BattleSession.restore(dto, { resolvePokemon: (uid) => uid === player.uid ? player : null }), null);
      assert.deepEqual(player.serialize(), before, 'refusal never heals or mutates owned HP');
    }
    assert.equal(Object.prototype.polluted, undefined);
  });

  test('same-id reload replaces all collection references, save switching resumes the outgoing battle', () => {
    const save = fixture('Exact training context');
    const pokemon = owned(save, 'pikachu', 25);
    assert.equal(training.startSession(pokemon.uid, 'level').result, 'ready');
    training.update(0.35);
    const original = training._session;
    const state = copy(save.training.slots[0].battle);
    const loaded = saves.loadSlot(save.id);
    assert.ok(loaded !== save);
    assert.ok(training._session !== original);
    assert.equal(training._session.active.pokemon, loaded.collection.get(pokemon.uid));
    assert.ok(training._session.active.pokemon !== pokemon);
    assert.deepEqual(copy(training._session.captureState()), (() => { const { locationId, ...dto } = state; return dto; })());
    const resumed = copy(loaded.training.slots[0].battle);
    saves.createNewSave('Other context', 'bulbasaur');
    assert.equal(training.isActive(), false);
    assert.deepEqual(PokemonUsageSystem.getInstance().getUsages(pokemon.uid), []);
    saves.loadSlot(save.id);
    assert.equal(training.isActive(), true);
    assert.deepEqual(copy(saves.getCurrentSave().training.slots[0].battle), resumed);
    training.cancelSession(0);
  });

  test('completion is one-shot; reservation survives completion, cancellation and reload until removal', () => {
    const save = fixture('Persistent assignment');
    const pokemon = owned(save, 'pikachu', 25);
    const other = owned(save, 'eevee', 25);
    assert.equal(training.startSession(pokemon.uid, 'level').result, 'ready');
    const old = training._session;
    const level = pokemon.level, count = save.statistics.trainingSessions;
    old.outcome = BattleOutcomes.VICTORY;
    training.update(0.01);
    assert.ok(pokemon.level >= level + 2 && pokemon.level <= level + 5);
    const rewardedLevel = pokemon.level;
    assert.equal(save.statistics.trainingSessions, count + 1);
    assert.equal(PokemonUsageSystem.getInstance().isAvailable(pokemon.uid), false);
    assert.equal(training.assignPokemon(0, other.uid).result, 'slot-occupied', 'an assignment cannot silently replace a reservation');
    training._finishSession(old);
    assert.equal(pokemon.level, rewardedLevel);
    assert.equal(save.statistics.trainingSessions, count + 1);
    const restored = saves.loadSlot(save.id);
    assert.equal(training.isActive(), false);
    assert.equal(restored.training.slots[0].pokemonUid, pokemon.uid);
    assert.equal(training.startSession(pokemon.uid, 'level').result, 'ready');
    assert.ok(training.cancelSession(0));
    assert.equal(restored.training.slots[0].pokemonUid, pokemon.uid);
    assert.ok(training.clearSlot(0));
    assert.equal(PokemonUsageSystem.getInstance().isAvailable(pokemon.uid), true);
    assert.equal(restored.collection.size, save.collection.size);
  });

  test('two slots retain independent opponents and resume with canonical UID references', () => {
    const save = fixture('Two simultaneous battles');
    const first = owned(save, 'pikachu', 20), second = owned(save, 'eevee', 30);
    assert.equal(training.upgradeSlot().result, 'ready');
    assert.equal(training.startSession(first.uid, 'level', 0).result, 'ready');
    assert.equal(training.startSession(second.uid, 'ev', 1).result, 'ready');
    training.update(0.4);
    const before = copy(save.training.slots.map((slot) => slot.battle));
    const restored = saves.loadSlot(save.id);
    assert.equal(training.getLiveStates().length, 2);
    assert.deepEqual(restored.training.slots.map((slot) => slot.battle), before);
    assert.equal(training._sessions.get(1).active.pokemon, restored.collection.get(second.uid));
    training.cancelSession(0);
    assert.equal(training._sessions.size, 1);
    assert.deepEqual(restored.training.slots[1].battle, before[1], 'cancelling one slot leaves the other untouched');
    training.cancelSession(1);
  });

  test('automatic refusals preserve money, empty assignment and FIFO, then start the head exactly once', () => {
    const save = fixture('Atomic automatic start');
    const pokemon = owned(save, 'pikachu', 10), second = owned(save, 'eevee', 20);
    assert.equal(training.buyAutomation(0).result, 'ready');
    assert.equal(training.enqueue(0, pokemon.uid).result, 'ready');
    assert.equal(training.enqueue(0, second.uid).result, 'ready');
    assert.ok(training.toggleAutomation(0));
    save.currencies.add('money', -save.currencies.get('money'));
    const before = copy(save.training.serialize());
    assert.equal(writeCount(() => training.update(1)), 0);
    assert.deepEqual(save.training.serialize(), before);
    assert.equal(training.startSession(save.team[0].uid, 'move', 0, { automatic: true }).result, 'insufficient-funds');
    assert.equal(save.training.slots[0].pokemonUid, '');
    save.currencies.add('money', 500);
    assert.equal(writeCount(() => training.update(1)), 1);
    assert.equal(save.training.slots[0].pokemonUid, pokemon.uid);
    assert.deepEqual(save.training.slots[0].queue, [second.uid]);
    assert.equal(save.currencies.get('money'), 0);
    training.cancelSession(0);
  });

  test('an exhausted idle assignment is not replaced by automation and an empty mode selection does nothing', () => {
    const save = fixture('Automation reservation');
    const pokemon = owned(save, 'pikachu', 99), next = owned(save, 'eevee', 10);
    training.buyAutomation(0); training.assignPokemon(0, pokemon.uid); training.enqueue(0, next.uid);
    const slot = save.training.slots[0]; slot.autoOptions = ['level']; training.toggleAutomation(0);
    pokemon.setLevel(100);
    const before = copy(save.training.serialize());
    training.update(1);
    assert.deepEqual(save.training.serialize(), before);
    assert.ok(training.clearSlot(0));
    slot.autoOptions = [];
    const empty = copy(save.training.serialize());
    training.update(1);
    assert.deepEqual(save.training.serialize(), empty);
  });

  test('checkpoints and an outgoing switch serialize the latest training DTO, without offline combat', () => {
    const save = fixture('Training checkpoint');
    saves.init();
    const pokemon = owned(save);
    training.startSession(pokemon.uid);
    training.update(0.22);
    const before = copy(save.training.slots[0].battle);
    assert.equal(writeCount(() => EventBus.getInstance().dispatch(new SaveCheckpointRequestedEvent())), 1);
    assert.deepEqual(SaveStorage.read(save.id).training.slots[0].battle, before);
    const stored = saves.loadSlot(save.id);
    assert.deepEqual(stored.training.slots[0].battle, before, 'no battle ticks are fabricated while a save is unloaded');
    assert.equal(writeCount(() => saves.update(4.99)), 0);
    assert.equal(writeCount(() => saves.update(0.02)), 1);
    training.cancelSession(0);
  });
});

describe('Hatchery, staff and mining parity rules', (test) => {
  test('Johto 111 unlocks incubation when reached; deposit is not a hatch and only a collected real egg completes it', () => {
    const save = fixture('Johto real hatch');
    const parent = owned(save, 'togetic', 100);
    const index = atJohtoHatchQuest(save);
    save.quests.setMainStep('johto', index - 1);
    assert.equal(hatchery.isPokemonIncubationUnlocked(), false);
    save.quests.setMainStep('johto', index); quests.syncMainQuest();
    assert.ok(hatchery.isPokemonIncubationUnlocked());
    assert.ok(hatchery.toggleMode(0));
    assert.equal(hatchery.depositPokemon(parent.uid, 0).result, 'ready');
    assert.equal(save.quests.getProgress('main.111'), 0, 'admission never counts as egg_hatch');
    const required = save.hatchery.slots[0].required;
    knockout(required - 1);
    assert.equal(save.hatchery.slots[0].ready, false);
    assert.equal(save.quests.getProgress('main.111'), 0);
    knockout();
    assert.equal(save.hatchery.slots[0].ready, true);
    assert.equal(save.quests.getProgress('main.111'), 0, 'being ready is still not a hatch');
    const count = save.collection.size;
    const beforeIVs = Object.values(parent.ivs).reduce((a, b) => a + b, 0);
    hatchery.setRandom(Random.sequence([0.7]));
    const result = hatchery.collectPokemon(0);
    assert.equal(result.result, 'ready');
    assert.equal(quests.getStatus('main.111').complete, true);
    assert.equal(parent.level, 1);
    assert.equal(parent.exp, 0);
    assert.equal(Object.values(parent.ivs).reduce((a, b) => a + b, 0), beforeIVs + 1);
    assert.equal(result.baby?.species, 'togepi');
    assert.equal(result.baby?.level, 5);
    assert.equal(save.collection.size, count + 1, 'the parent was never duplicated');
    assert.equal(hatchery.collectPokemon(0).result, 'not-ready');
    assert.equal(save.collection.size, count + 1);
    assert.ok(quests.claim('main.111'));
    assert.equal(save.quests.getMainStep('johto'), index + 1);
  });

  test('pending incubation→daycare can be cancelled, survives JSON, and changes mode only after a hatch', () => {
    const save = fixture('Pending hatchery mode');
    const parent = owned(save, 'clefairy', 100);
    atJohtoHatchQuest(save); hatchery.toggleMode(0); hatchery.depositPokemon(parent.uid, 0);
    assert.ok(hatchery.toggleMode(0));
    assert.equal(save.hatchery.modes[0], 'incubation');
    assert.equal(save.hatchery.pendingModes[0], 'daycare');
    const restored = saves.loadSlot(save.id);
    assert.equal(restored.hatchery.pendingModes[0], 'daycare');
    assert.ok(hatchery.toggleMode(0));
    assert.equal(restored.hatchery.pendingModes[0], null);
    assert.ok(hatchery.toggleMode(0));
    knockout(restored.hatchery.slots[0].required);
    assert.equal(hatchery.collectPokemon(0).result, 'ready');
    assert.equal(restored.hatchery.modes[0], 'daycare');
    assert.equal(restored.hatchery.pendingModes[0], null);
    assert.equal(restored.collection.get(parent.uid).level, 1);
  });

  test('insufficient hatchery automation funds keep the FIFO and collection untouched; a paid admission charges once', () => {
    const save = fixture('Atomic daycare autofill');
    const pokemon = owned(save, 'pikachu', 12);
    hatchery.buyAutomation('hatch'); hatchery.buyAutomation('fill');
    hatchery.toggleAutomation('hatch'); hatchery.toggleAutomation('fill');
    hatchery.enqueue(0, pokemon.uid);
    save.currencies.add('money', -save.currencies.get('money'));
    const before = copy(save.hatchery.serialize());
    assert.equal(writeCount(() => hatchery.update(1)), 0);
    assert.deepEqual(save.hatchery.serialize(), before);
    assert.equal(save.collection.get(pokemon.uid), pokemon);
    save.currencies.add('money', HatcheryRules.AUTO_HATCH_FEE);
    assert.equal(writeCount(() => hatchery.update(1)), 1);
    assert.equal(save.hatchery.slots[0].pokemonUid, pokemon.uid);
    assert.equal(save.hatchery.slots[0].paid, true, 'the reference upfront auto-hatch fee also applies to a daycare admission');
    assert.equal(save.currencies.get('money'), 0);
    assert.equal(save.hatchery.queues[0].length, 0);
    hatchery.update(1);
    assert.equal(save.currencies.get('money'), 0);
    assert.equal(pokemon.level, 12);
  });

  test('round-robin queue fill preserves existing FIFO order and reserves fossils without consuming bag stock', () => {
    const save = fixture('Balanced fossil queues');
    hatchery.upgradeSlot(); hatchery.upgradeSlot();
    hatchery.toggleMode(1); hatchery.togglePriority(1);
    const first = owned(save, 'pikachu', 20), second = owned(save, 'eevee', 10);
    hatchery.enqueue(0, first.uid);
    save.inventory.add('helix_fossil', 2, { deferSave: true });
    assert.equal(hatchery.enqueueFossil(1, 'helix_fossil').result, 'ready');
    assert.equal(save.inventory.count('helix_fossil'), 2);
    const initial = copy(save.hatchery.queues);
    hatchery.rebuildQueues();
    assert.deepEqual(save.hatchery.queues[0][0], initial[0][0]);
    assert.deepEqual(save.hatchery.queues[1][0], initial[1][0]);
    assert.ok(save.hatchery.queues[2].some((entry) => entry.uid === second.uid), 'the shorter daycare queue is served first');
    assert.equal(HatcheryQueue.freeFossils(save, 'helix_fossil'), 0);
    assert.equal(HatcheryQueue.reservedFossils(save, 'helix_fossil'), 2);
    const raw = copy(save.serialize());
    raw.hatchery.queues[1].push({ kind: 'fossil', itemId: 'helix_fossil' });
    const repaired = SaveData.fromJson(raw);
    assert.equal(HatcheryQueue.reservedFossils(repaired, 'helix_fossil'), 2, 'corrupt over-reservations never exceed physical stock');
    assert.equal(repaired.inventory.count('helix_fossil'), 2);
  });

  test('rejected mismatched/incompatible training snapshots pause automation without releasing the assignment or mutating owned HP', () => {
    const save = fixture('Mismatched resume'); const uid = save.team.at(0).uid;
    assert.equal(training.startSession(uid, 'level').result, 'ready');
    training.update(0.05);
    const raw = copy(save.serialize());
    raw.training.slots[0].autoPurchased = true; raw.training.slots[0].autoEnabled = true;
    training.cancelSession(0);
    for (const corrupt of [
      (battle) => { battle.teamUids = ['not-the-assigned-pokemon']; },
      (battle) => { battle.version = 999; },
      (battle) => { battle.training = false; }
    ]) {
      const input = copy(raw); corrupt(input.training.slots[0].battle);
      const resumed = SaveData.fromJson(input); const hp = resumed.collection.get(uid).hp;
      saves.setCurrentSave(resumed);
      assert.equal(training.isActive(), false);
      assert.equal(resumed.training.slots[0].battle, null);
      assert.equal(resumed.training.slots[0].autoEnabled, false);
      assert.equal(resumed.training.slots[0].pokemonUid, uid);
      assert.equal(resumed.collection.get(uid).hp, hp);
      assert.ok(PokemonUsageSystem.getInstance().getUsages(uid).includes(PokemonUsageIds.TRAINING));
    }
  });

  test('outdoor and training battle entry points cannot concurrently mutate the same owned Pokémon', () => {
    const save = fixture('Battle exclusivity');
    const pokemon = save.team.at(0);
    assert.equal(training.startSession(pokemon.uid, 'level').result, 'ready');
    const before = copy(pokemon.serialize());
    assert.equal(writeCount(() => assert.equal(BattleSystem.getInstance().startBattle('route1'), false)), 0);
    assert.equal(BattleSystem.getInstance().isActive(), false);
    assert.equal(training.isActive(), true);
    assert.deepEqual(pokemon.serialize(), before);
    training.cancelSession(0);
  });

  test('mine energy upgrades refill exactly the added 25 energy, and remain capped and atomic', () => {
    const save = fixture('Mine capacity refill');
    save.mine.energy = 10; save.mine.lastEnergyAt = Date.now();
    const diamonds = save.currencies.get('diamond');
    assert.equal(writeCount(() => assert.equal(mine.upgradeEnergy().result, 'ready')), 1);
    assert.equal(save.mine.maxEnergy, 125);
    assert.ok(save.mine.energy >= 35 && save.mine.energy < 35.1);
    assert.equal(save.currencies.get('diamond'), diamonds - MineRules.ENERGY_UPGRADE_COSTS[0]);
  });

  test('a real victory on the training time boundary remains a victory; unfinished fights time out once', () => {
    let save = fixture('Training boundary victory');
    let pokemon = owned(save, 'pikachu', 20);
    training.startSession(pokemon.uid, 'level');
    let session = training._sessions.get(0);
    session._reserves = [];
    session.foe.takeDamage(session.foe.maxHp);
    session._pendingFoeAdvance = true;
    save.training.slots[0].elapsed = TrainingRules.MAX_SIMULATION_TICKS * TrainingRules.TICK_SECONDS - 0.05;
    assert.equal(writeCount(() => training.update(0.1)), 1);
    assert.ok(save.training.slots[0].result.success);
    assert.equal(save.training.slots[0].result.reason, null);
    assert.ok(pokemon.level > 20);
    assert.equal(training.isActive(), false);
    assert.equal(writeCount(() => training.update(0.1)), 0);

    save = fixture('Training boundary timeout');
    pokemon = owned(save, 'pikachu', 20);
    training.startSession(pokemon.uid, 'level');
    session = training._sessions.get(0);
    session.playerCooldownMs = 10000; session.foeCooldownMs = 10000;
    save.training.slots[0].elapsed = TrainingRules.MAX_SIMULATION_TICKS * TrainingRules.TICK_SECONDS - 0.05;
    assert.equal(writeCount(() => training.update(5)), 1);
    assert.equal(save.training.slots[0].result.success, false);
    assert.equal(save.training.slots[0].result.reason, 'timeout');
    assert.equal(pokemon.level, 20);
    assert.equal(save.training.slots[0].pokemonUid, pokemon.uid);
    assert.equal(writeCount(() => training.update(0.1)), 0);
  });

  test('active training centrally blocks held items and bag mutations, without inventing idle-assignment restrictions', () => {
    const save = fixture('Training loadout locks');
    const pokemon = save.team.at(0);
    save.inventory.add('leftovers', 1, { deferSave: true });
    save.inventory.add('rarecandy', 2, { deferSave: true });
    assert.equal(training.assignPokemon(0, pokemon.uid).result, 'ready');
    assert.equal(PokemonUsageSystem.getInstance().getActionLock(pokemon.uid, PokemonActionIds.CHANGE_HELD_ITEM), null);
    assert.equal(PokemonUsageSystem.getInstance().getActionLock(pokemon.uid, PokemonActionIds.USE_ITEM), null);
    assert.equal(HeldItemSystem.getInstance().equip(0, 'leftovers'), true);
    assert.equal(training.startSession(pokemon.uid, 'level').result, 'ready');
    const before = copy(pokemon.serialize());
    assert.equal(PokemonUsageSystem.getInstance().getActionLock(pokemon.uid, PokemonActionIds.CHANGE_HELD_ITEM)?.usage, 'training');
    assert.equal(PokemonUsageSystem.getInstance().getActionLock(pokemon.uid, PokemonActionIds.USE_ITEM)?.usage, 'training');
    assert.equal(writeCount(() => {
      assert.equal(HeldItemSystem.getInstance().unequip(0), false);
      assert.equal(TeamSystem.getInstance().setHeldItem(0, null), false);
      assert.equal(ItemUseSystem.getInstance().getEligibleTargets('rarecandy').some((entry) => entry.uid === pokemon.uid), false);
      assert.equal(ItemUseSystem.getInstance().useOnPokemon('rarecandy', pokemon.uid).result, 'target_ineligible');
    }), 0);
    assert.deepEqual(pokemon.serialize(), before);
    assert.equal(save.inventory.count('rarecandy'), 2);
    training.cancelSession(0);
    assert.equal(HeldItemSystem.getInstance().unequip(0), true);
    assert.equal(PokemonUsageSystem.getInstance().getActionLock(pokemon.uid, PokemonActionIds.USE_ITEM), null);
  });

  test('mine rendering and staff events never create a board transaction; the mine system owns initialization', () => {
    const save = fixture('Read-only mine rendering');
    const panel = new MinePanel(DashboardColumns.RIGHT);
    try {
      assert.equal(save.mine.hasGrid(), false);
      assert.equal(writeCount(() => panel._refresh()), 0);
      assert.equal(writeCount(() => mine.update(0.1)), 1);
      assert.ok(save.mine.hasGrid());
      assert.equal(panel._state.hasLayer, true);
      assert.equal(writeCount(() => panel._refresh()), 0);
      assert.equal(writeCount(() => mine.update(0.1)), 0);
    } finally { panel.destroy(); }
  });

  test('staff PC prices use questPoint, activation is unique per sector, progression and sector fees persist', () => {
    const save = fixture('Staff progression');
    const pcStaff = STAFF_CATALOG[3];
    save.access.unlockLocation(pcStaff.locationId);
    const price = staff.getPrice(pcStaff);
    assert.deepEqual(price, { currency: 'questPoint', cost: 100 });
    const points = save.currencies.get('questPoint'), battlePoints = save.currencies.get('battlePoint');
    assert.equal(writeCount(() => assert.equal(staff.hire(pcStaff.id).result, 'ready')), 1);
    assert.equal(save.currencies.get('questPoint'), points - 100);
    assert.equal(save.currencies.get('battlePoint'), battlePoints);
    assert.ok(staff.toggle(pcStaff.id));
    const other = STAFF_CATALOG[0]; save.access.unlockLocation(other.locationId); staff.hire(other.id);
    assert.equal(staff.toggle(other.id), false);
    assert.equal(writeCount(() => staff.addXp('hatchery', staff.xpNeeded(1))), 0, 'the owning facility transaction saves XP once');
    assert.equal(save.staff.owned[pcStaff.id].level, 2);
    assert.equal(staff.getFee('hatchery', 1000), Math.ceil(1000 * (1 - 3 / 500)));
    assert.equal(staff.getBonus('hatchery', pcStaff.bonus), 0, 'the advertised unused legacy perk stays ineffective');
    assert.ok(staff.getSnapshot('hatchery').find((entry) => entry.id === pcStaff.id).effectImplemented === false);
    saves.saveCurrent();
    const restored = saves.loadSlot(save.id);
    assert.equal(restored.staff.owned[pcStaff.id].level, 2);
    assert.equal(restored.staff.active.hatchery, pcStaff.id);
  });

  test('effective staff formulas preserve six-to-three foes, double IV cap, fee reduction and miner energy cost', () => {
    const save = fixture('Effective perks');
    for (const id of ['trainer_saffron', 'manager_goldenrod', 'miner_pewter']) save.staff.owned[id] = { level: 100, xp: 0 };
    save.staff.active.training = 'trainer_saffron'; save.staff.active.hatchery = 'manager_goldenrod'; save.staff.active.mine = 'miner_pewter';
    assert.equal(training._createOpponents(save.team[0], new SeededRandom(1), 'move').length, 3);
    assert.equal(staff.getBonus('hatchery', 'hatchery_double_iv_level'), 0.2);
    assert.equal(staff.getFee('hatchery', 1000), 800);
    assert.equal(mine.getSnapshot().tools.find((entry) => entry.id === 'chisel').energyCost, 3);
    const parent = owned(save, 'eevee', 100); atJohtoHatchQuest(save); hatchery.toggleMode(0); hatchery.depositPokemon(parent.uid, 0);
    for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) parent.ivs[stat] = 6;
    parent.ivs.hp = 5;
    knockout(save.hatchery.slots[0].required);
    hatchery.setRandom(Random.sequence([0]));
    const result = hatchery.collectPokemon(0);
    assert.equal(result.ivGain, 1, 'a double-IV roll is clamped to the permanent IV cap');
    assert.equal(parent.ivs.hp, 6);
    assert.equal(parent.shiny, true);
  });

  test('all five mining tools use exact footprints and charge energy only once; automatic refusal is atomic', () => {
    const save = fixture('Mining tool geometry');
    for (const id of ['pickaxe', 'drill', 'dynamite']) assert.equal(mine.buyTool(id).result, 'ready');
    for (const [id, expected] of [['chisel', 1], ['hammer', 9], ['pickaxe', 5], ['drill', 5], ['dynamite', 9]]) {
      save.mine.grid = Array.from({ length: 8 }, () => Array(10).fill(4));
      save.mine.items = [{ itemId: 'nugget', x: 9, y: 7, shape: [[1]], collected: false }];
      save.mine.energy = 100; save.mine.lastEnergyAt = Date.now() + 100000;
      assert.equal(mine.digAt(4, 4, { toolId: id }).result, 'ready');
      assert.equal(save.mine.grid.flat().filter((depth) => depth < 4).length, expected);
      assert.equal(save.mine.energy, 100 - MineRules.TOOLS[id].energyCost);
    }
    save.currencies.add('diamond', -save.currencies.get('diamond'));
    const before = copy(save.mine.serialize());
    assert.equal(mine.digAt(0, 0, { automatic: true }).result, 'insufficient-funds');
    assert.deepEqual(save.mine.serialize(), before);
  });

  test('mining projection hides buried identities and exposes a real item only at its uncovered center', () => {
    const save = fixture('Mine reveal projection');
    save.mine.grid = Array.from({ length: 8 }, () => Array(10).fill(4));
    save.mine.items = [{ itemId: 'nugget', x: 0, y: 0, shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], collected: false }];
    let state = mine.getSnapshot();
    assert.equal(state.tiles[1][1].itemId, null);
    assert.equal(state.tiles[1][1].itemCenter, false);
    save.mine.grid[1][1] = 0;
    state = mine.getSnapshot();
    assert.equal(state.tiles[1][1].itemId, 'nugget');
    assert.equal(state.tiles[1][1].itemCenter, true);
    assert.equal(state.tiles[0][0].itemId, null);
    assert.equal(typeof state.tiles[0][0].canDig, 'boolean', 'dig eligibility is projected by the system');
  });
});

describe('Talent ledger and common facility views', (test) => {
  test('talent training rolls the whole regular pool (including confirmations), and only unlocked normal talents can be equipped', () => {
    const save = fixture('Talent selection');
    const pokemon = owned(save, 'pikachu', 20), system = PokemonTalentSystem.getInstance();
    const normal = pokemon.getSpecies().talents.filter((id) => id !== pokemon.getSpecies().hiddenTalent);
    pokemon.talent = normal[0]; save.talents.unlock(pokemon.species, normal[0]);
    const before = save.talents.getIds(pokemon.species).length;
    const reward = TrainingProgression.reward(save, pokemon, 'talent', Random.sequence([0]));
    assert.equal(reward.talent, normal[0]);
    assert.equal(reward.talentNew, false, 'the UI can distinguish a confirmation without inventing another roll');
    assert.equal(save.talents.getIds(pokemon.species).length, before, 'a confirmed roll is not rerolled into a guaranteed missing talent');
    const next = normal.find((id) => !save.talents.has(pokemon.species, id));
    assert.ok(next);
    assert.equal(system.equip(pokemon.uid, next), false);
    save.talents.unlock(pokemon.species, next);
    assert.equal(writeCount(() => assert.ok(system.equip(pokemon.uid, next))), 1);
    save.talents.unlock(pokemon.species, pokemon.getSpecies().hiddenTalent);
    assert.equal(system.equip(pokemon.uid, pokemon.getSpecies().hiddenTalent), false);
    assert.equal(system.getSnapshot(pokemon.uid).hiddenUnlocked, true);
    training.assignPokemon(0, pokemon.uid);
    assert.equal(system.equip(pokemon.uid, normal[0]), false, 'the generic assignment lock is shared with move learning');
  });

  test('duplicate captures unlock a weighted species talent without cloning or changing equipment', () => {
    const save = fixture('Duplicate talent ledger');
    const pokemon = owned(save, 'pikachu', 20), species = pokemon.getSpecies();
    const normal = species.talents.filter((id) => id !== species.hiddenTalent);
    const target = normal[0], equipped = normal[1];
    pokemon.talent = equipped;
    save.talents._unlocked[pokemon.species] = [equipped];
    const count = save.collection.size;
    CatchSystem.getInstance().setRandom(Random.sequence([0]));
    CatchSystem.getInstance()._keepDuplicate(save, PokemonFactory.create('pikachu', 20), new BattleLog());
    assert.equal(save.talents.has(pokemon.species, target), true);
    assert.equal(save.collection.size, count);
    assert.equal(pokemon.talent, equipped);
    const rare = normal.find((id) => TalentDB.getInstance().getById(id).rarity >= 2);
    save.talents._unlocked[pokemon.species] = [target];
    assert.equal(CatchRules.unlockCapturedTalent(save, species, rare, Random.sequence([0.99])), false);
    assert.equal(save.talents.has(pokemon.species, rare), false);
  });

  test('item and Pokémon media share the canonical frame; empty species never request an invalid sprite path', () => {
    const pokemon = new UIPokemonSprite(); const item = new UIItemSprite({ itemId: 'helix_fossil' });
    try {
      assert.ok(pokemon instanceof UISpriteFrame); assert.ok(item instanceof UISpriteFrame);
      assert.equal(pokemon.getDomElement().querySelector('img').getAttribute('src'), null);
      assert.equal(item.getDomElement().querySelector('img').getAttribute('src'), ItemDB.getInstance().getImagePath('helix_fossil'));
      pokemon.setSpecies('pidgey');
      assert.equal(pokemon.getDomElement().querySelector('img').getAttribute('src'), AssetPaths.pokemonSprite('pidgey'));
      pokemon.setSpecies('');
      assert.equal(pokemon.getDomElement().querySelector('img').getAttribute('src'), null);
    } finally { pokemon.destroy(); item.destroy(); }
  });

  test('Location uses the actual full PC/Pokédex tile and opens the requested seen-species detail, never an unseen entry', () => {
    const save = fixture('Shared location tile');
    const dex = new PokedexPanel();
    save.pokedex.markSeen('pidgey');
    const species = PokemonDB.getInstance().getById('pidgey');
    const tile = LocationPanel._speciesTile(species, 'Pidgey', 'seen');
    try {
      assert.ok(tile instanceof PokemonGridEntry, 'not a sprite-only imitation of the common tile');
      tile.getDomElement().dispatchEvent({ type: 'click' });
      assert.equal(dex.isOpen(), true);
      assert.equal(dex._selectedSpecies, 'pidgey');
      dex.close();
      dex.open({ speciesId: 'mew' });
      assert.equal(dex._selectedSpecies, null);
      assert.equal(save.pokedex.isSeen('mew'), false, 'a view request never discovers an unknown Pokémon');
    } finally { tile.destroy(); dex.close(); dex.destroy(); }
  });

  test('the generic PC selector intersects facility candidates with central locks and clears its state on cancellation', () => {
    const save = fixture('Facility PC selector');
    const available = owned(save, 'eevee', 12), trainingOnly = owned(save, 'pikachu', 100);
    training.assignPokemon(0, trainingOnly.uid);
    const selection = FacilityPokemonSelectionSystem.getInstance(); selection.init();
    const panel = new BoxPanel();
    const manager = new FacilityManagementModal('hatchery');
    try {
      manager.open({ tab: 'automation' });
      selection.openSelection('hatchery', 0, { queue: true });
      assert.equal(panel.isOpen(), true);
      assert.equal(manager.isOpen(), true);
      assert.equal(panel.getDomElement().classList.contains('pw-box-selector-mode'), true);
      assert.deepEqual(panel._entries().map((pokemon) => pokemon.uid), [available.uid]);
      panel.close();
      assert.equal(selection._pending, null);
      assert.equal(panel._selectionAllowedUids, null);
      assert.equal(panel.getDomElement().classList.contains('pw-box-selector-mode'), false);
      selection.openSelection('hatchery', 0, { queue: true });
      const request = selection._pending.requestId;
      EventBus.getInstance().dispatch(new BoxPokemonSelectedEvent(request, trainingOnly.uid));
      assert.equal(save.hatchery.queues[0].length, 0, 'forged results are revalidated by the domain system');
    } finally { panel.close(); panel.destroy(); manager.close(); manager.destroy(); selection.onDestroy(); }
  });

  test('keyed live lists keep nodes and focus, reorder existing widgets, and destroy removed entries', () => {
    const list = new UIKeyedList({ key: (entry) => entry.id, create: (entry) => new UIText({ text: entry.text }), update: (label, entry) => label.setText(entry.text) });
    try {
      const values = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];
      list.setEntries(values);
      const [a, b] = list.getChildren();
      list.setEntries(copy(values));
      assert.equal(list.getChildren()[0], a); assert.equal(list.getChildren()[1], b);
      list.setEntries([values[1], values[0]]);
      assert.equal(list.getChildren()[0], b); assert.equal(list.getChildren()[1], a);
      list.setEntries([values[1]]);
      assert.equal(a.isDestroyed(), true);
      assert.equal(b.isDestroyed(), false);
    } finally { list.destroy(); }
  });

  test('dropdown refreshes reuse native options and preserve the current choice when unchanged', () => {
    const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
    const select = new UIDropdown({ options, value: 'b' });
    try {
      const first = select.getDomElement().querySelectorAll('option')[0];
      select.setOptions(copy(options)); select.setValue('b'); select.setEnabled(true);
      assert.equal(select.getDomElement().querySelectorAll('option')[0], first);
      assert.equal(select.getValue(), 'b');
    } finally { select.destroy(); }
  });

  test('all management tabs contain real controls; live training hides overworld idle/loot and preserves expedition data', () => {
    const save = fixture('Composed management and battle');
    save.dungeons.lastRun = { locationId: 'mtmoon', completed: false, floor: 1, keptMoney: 12 };
    const before = copy(save.dungeons.serialize());
    const panels = ['hatchery', 'training', 'mine'].map((feature) => new FacilityManagementModal(feature));
    const battle = new BattlePanel(DashboardColumns.CENTER);
    try {
      for (const modal of panels) {
        for (const tab of ['upgrades', 'automation', 'staff']) {
          modal.open({ tab });
          assert.equal(modal.isOpen(), true);
          const view = modal._views.get(tab);
          assert.ok(view && view.getDomElement().querySelectorAll('button').length > 0, `${tab} is not a placeholder unlock panel`);
        }
        modal.close();
      }
      const pokemon = owned(save);
      training.startSession(pokemon.uid);
      assert.equal(battle.getDomElement().querySelector('#battle-idle-screen').classList.contains('is-hidden'), true);
      assert.equal(battle.getDomElement().querySelector('#battle-loot-row').classList.contains('is-hidden'), true);
      assert.equal(battle.getDomElement().querySelectorAll('.pw-training-live-card').length, 1);
      training.cancelSession(0);
      assert.equal(battle.getDomElement().querySelector('#battle-idle-screen').classList.contains('is-hidden'), false);
      assert.deepEqual(save.dungeons.serialize(), before, 'removing the live last-expedition view does not delete expedition state');
    } finally { battle.destroy(); for (const panel of panels) { panel.close(); panel.destroy(); } }
  });
});


describe('Original facility visual controls and slot-local automation', (test) => {
  test('v17 migration retains exact assignments, pending modes, FIFO order and battle DTOs', () => {
    const save=fixture('Visual migration'),trainee=owned(save,'pikachu',30),queued=owned(save,'eevee',20),parent=owned(save,'pidgey',12);
    training.assignPokemon(0,trainee.uid);training.enqueue(0,queued.uid);training.startSession(trainee.uid,'move',0);
    training.update(0.4);hatchery.depositPokemon(parent.uid,0);hatchery.setAutomationFilter(0,'sort','legacy');
    const raw=copy(save.serialize());raw.version=17;delete raw.hatchery.filters;
    raw.training.slots.forEach((slot)=>{delete slot.filters;slot.autoOptions=['move','ev'];});
    const before=copy(raw),out=MigrationV17ToV18.migrate(raw);
    assert.deepEqual(raw,before);assert.deepEqual(MigrationV17ToV18.migrate(raw),out);
    assert.deepEqual(out.training.slots[0].battle,before.training.slots[0].battle);
    assert.deepEqual(out.training.slots[0].queue,before.training.slots[0].queue);
    assert.equal(out.training.slots[0].pokemonUid,trainee.uid);assert.equal(out.hatchery.filters[0].sort,'legacy');
    assert.equal(out.training.slots[0].filters.mode,'configured');
    const loaded=SaveData.fromJson(out);
    assert.deepEqual(loaded.training.slots[0].battle,before.training.slots[0].battle);
    assert.deepEqual(loaded.hatchery.queues,before.hatchery.queues);
    assert.equal(loaded.hatchery.slots[0].pokemonUid,parent.uid);
    assert.equal(loaded.collection.get(trainee.uid),loaded.collection.get(loaded.training.slots[0].pokemonUid));
  });
  test('filter records reject invalid keys/values and normalize hostile inputs without touching facts',()=>{
    const a=new FacilityFilterData('hatchery',{sort:'bad',filterType:'bad',filterShiny:'shiny',pokemonUid:'foreign'});
    assert.equal(a.get('sort'),'iv_desc');assert.equal(a.get('filterType'),'all');assert.equal(a.get('filterShiny'),'shiny');
    assert.equal(a.set('__proto__','all'),false);assert.equal(a.set('pokemonUid','foreign'),false);assert.equal(a.set('filterIv','bad'),false);
    assert.equal(Object.keys(a.serialize()).length,7);assert.equal(Object.keys(new FacilityFilterData('training').serialize()).length,8);
    assert.equal(MigrationV17ToV18.migrate({hatchery:{maxSlots:9999999999}}).hatchery.filters.length,4);
  });
  test('rank filtering uses reference IV total 24, not a species rank',()=>{
    const low=PokemonFactory.create('mewtwo',30),high=PokemonFactory.create('magikarp',30);
    low.ivs=Object.fromEntries(Object.keys(low.ivs).map((key)=>[key,0]));
    high.ivs=Object.fromEntries(Object.keys(high.ivs).map((key)=>[key,4]));
    assert.equal(FacilityCandidateRules.matches(low,{filterRank:'S_or_better'}),false);
    assert.equal(FacilityCandidateRules.matches(high,{filterRank:'S_or_better'}),true);
    high.ivs.hp=3;assert.equal(FacilityCandidateRules.matches(high,{filterRank:'A_or_worse'}),true);
  });
  test('shiny, favorite, region and both types are intersected without changing Pokémon',()=>{
    const pokemon=PokemonFactory.create('chikorita',20);pokemon.shiny=true;pokemon.favorite=true;
    const before=copy(pokemon.serialize());
    assert.equal(FacilityCandidateRules.matches(pokemon,{filterShiny:'shiny',filterFav:'fav_only',filterRegion:'johto',filterType:'grass'}),true);
    for(const filters of [{filterShiny:'non_shiny'},{filterFav:'no_fav'},{filterRegion:'kanto'},{filterType:'water'}]) assert.equal(FacilityCandidateRules.matches(pokemon,filters),false);
    const dual=PokemonFactory.create('pidgey',12);assert.equal(FacilityCandidateRules.matches(dual,{filterType:'flying'}),true);
    assert.deepEqual(pokemon.serialize(),before);
  });
  test('complete IV/EV filters honor the separate 36-point maxima',()=>{
    const pokemon=PokemonFactory.create('eevee',20);
    pokemon.ivs=Object.fromEntries(Object.keys(pokemon.ivs).map((key)=>[key,6]));pokemon.evs.hp=18;pokemon.evs.atk=18;
    assert.equal(FacilityCandidateRules.matches(pokemon,{filterIv:'complete',filterEv:'complete'}),true);
    pokemon.ivs.hp=5;assert.equal(FacilityCandidateRules.matches(pokemon,{filterIv:'incomplete',filterEv:'complete'}),true);
    pokemon.evs.atk=17;assert.equal(FacilityCandidateRules.matches(pokemon,{filterEv:'complete'}),false);
  });
  test('hatchery IV/level/dex sorts use reference tie-breaks and do not reorder the input',()=>{
    const save=fixture('Hatchery sorts');const a=owned(save,'pidgey',40),b=owned(save,'eevee',12),c=owned(save,'magikarp',12);
    for(const [pokemon,n] of [[a,2],[b,4],[c,4]]) pokemon.ivs=Object.fromEntries(Object.keys(pokemon.ivs).map((key)=>[key,n]));
    const entries=[a,b,c].map((pokemon)=>({uid:pokemon.uid,pokemon})),before=entries.map((e)=>e.uid);
    const sorted=(sort)=>FacilityCandidateRules.select(save,entries,{filterIv:'all',sort}).map((e)=>e.uid);
    assert.deepEqual(sorted('iv_desc'),[b.uid,c.uid,a.uid]);
    assert.deepEqual(sorted('iv_asc'),[a.uid,c.uid,b.uid]);
    assert.equal(sorted('level_desc')[0],a.uid);assert.equal(sorted('dex')[0],a.uid);
    assert.deepEqual(entries.map((e)=>e.uid),before);
  });
  test('all eight training ordering choices produce deterministic domain projections',()=>{
    const save=fixture('Training sorts'),a=owned(save,'eevee',99),b=owned(save,'pidgey',12),c=owned(save,'magikarp',100);
    a.evs.hp=2;b.evs.hp=1;c.evs.hp=3;
    const entries=[a,b,c].map((pokemon)=>({uid:pokemon.uid,pokemon}));
    const sorted=(sort)=>FacilityCandidateRules.select(save,entries,{filterEv:'all',sort}).map((e)=>e.uid);
    assert.deepEqual(sorted('ev_asc'),[b.uid,a.uid,c.uid]);assert.deepEqual(sorted('ev_desc'),[c.uid,a.uid,b.uid]);
    assert.deepEqual(sorted('level_desc'),[c.uid,a.uid,b.uid]);assert.deepEqual(sorted('level_missing'),[b.uid,a.uid,c.uid]);
    for(const sort of FacilityFilterRules.TRAINING_SORTS) assert.deepEqual(sorted(sort),sorted(sort));
    for(const [sort,key] of [['talent_missing','missingTalents'],['move_missing','missingMoves']]){const result=FacilityCandidateRules.select(save,entries,{sort});assert.ok(result.every((entry,index)=>index===0||result[index-1][key]>=entry[key]));}
  });
  test('hatchery filters affect future queue construction and automatic fill, never an existing FIFO head',()=>{
    const save=fixture('Hatchery filtered queue'),first=owned(save,'eevee',12),water=owned(save,'magikarp',18);
    hatchery.enqueue(0,first.uid);hatchery.setAutomationFilter(0,'filterType','water');
    hatchery.rebuildQueues();assert.equal(save.hatchery.queues[0][0].uid,first.uid);assert.equal(save.hatchery.queues[0][1].uid,water.uid);
    hatchery.removeFromQueue(0);hatchery.buyAutomation('fill');hatchery.toggleAutomation('fill');
    assert.equal(writeCount(()=>hatchery.update(1)),1);assert.equal(save.hatchery.slots[0].pokemonUid,water.uid);
    assert.equal(save.collection.get(water.uid),water);
  });
  test('hatchery automatic fill does not reserve or debit on insufficient admission funds',()=>{
    const save=fixture('No implicit failed reservation'),water=owned(save,'magikarp',100);
    atJohtoHatchQuest(save);hatchery.toggleMode(0);
    hatchery.buyAutomation('fill');hatchery.toggleAutomation('fill');hatchery.buyAutomation('hatch');hatchery.toggleAutomation('hatch');save.currencies.add('money',-save.currencies.get('money'));
    hatchery.setAutomationFilter(0,'filterType','water');hatchery.update(1);
    assert.equal(save.hatchery.slots[0],null);assert.deepEqual(save.hatchery.queues[0],[]);
    assert.equal(save.collection.get(water.uid),water);
  });
  test('training fill and unqueued auto-selection share the same per-slot filters',()=>{
    const save=fixture('Training filtered auto'),water=owned(save,'magikarp',20);owned(save,'eevee',10);
    training.buyAutomation(0);training.setAutomationFilter(0,'filterType','water');
    assert.equal(training.fillQueue(0),1);assert.deepEqual(save.training.slots[0].queue,[water.uid]);
    training.removeFromQueue(0);training.toggleAutomation(0);
    assert.equal(writeCount(()=>training.update(1)),1);assert.equal(save.training.slots[0].pokemonUid,water.uid);
    training.cancelSession(0);
  });
  test('all-mode engine priority remains talent / hidden / move / EV / level after JSON reload',()=>{
    const save=fixture('All mode reload'),pokemon=owned(save,'pikachu',30);
    training.buyAutomation(0);training.setAutomationFilter(0,'mode','all');
    assert.deepEqual(save.training.slots[0].autoOptions,[...FacilityFilterRules.MODE_ORDER]);
    const loaded=SaveData.fromJson(copy(save.serialize()));assert.deepEqual(loaded.training.slots[0].autoOptions,[...FacilityFilterRules.MODE_ORDER]);
    training.assignPokemon(0,pokemon.uid);training.toggleAutomation(0);training.update(1);
    assert.equal(save.training.slots[0].mode,'talent');training.cancelSession(0);
  });
  test('a filter change cannot release a reservation, replace a battle or remove its manual queue',()=>{
    const save=fixture('Filters during live battle'),pokemon=owned(save,'pikachu',30),next=owned(save,'eevee',12);
    training.assignPokemon(0,pokemon.uid);training.enqueue(0,next.uid);training.startSession(pokemon.uid,'move',0);
    const before=copy(save.training.slots[0].battle),queue=[...save.training.slots[0].queue];
    training.setAutomationFilter(0,'filterRegion','hoenn');training.setAutomationFilter(0,'mode','level');
    assert.deepEqual(save.training.slots[0].battle,before);assert.deepEqual(save.training.slots[0].queue,queue);
    assert.equal(save.training.slots[0].pokemonUid,pokemon.uid);training.cancelSession(0);
  });
  test('per-slot filter edits stay isolated, and newly purchased slots receive normalized defaults',()=>{
    const save=fixture('Isolated slot filters');hatchery.upgradeSlot();training.upgradeSlot();
    hatchery.setAutomationFilter(0,'filterShiny','shiny');training.setAutomationFilter(1,'sort','dex');
    assert.equal(save.hatchery.filters[1].get('filterShiny'),'all');assert.equal(save.training.slots[0].filters.get('sort'),'ev_asc');
    assert.equal(writeCount(()=>training.setAutomationFilter(0,'sort','not-a-sort')),0);
  });
  test('the explicit change action atomically replaces only an idle assignment with an eligible UID',()=>{
    const save=fixture('Atomic replacement'),old=owned(save,'eevee',20),next=owned(save,'pikachu',30),locked=owned(save,'pidgey',12);locked.locked=true;
    training.assignPokemon(0,old.uid);
    assert.ok(training.getCandidates(0,{replace:true}).some((entry)=>entry.uid===next.uid));
    assert.equal(training.assignPokemon(0,locked.uid,{replace:true}).result,'pokemon-not-found');assert.equal(save.training.slots[0].pokemonUid,old.uid);
    assert.equal(writeCount(()=>training.assignPokemon(0,next.uid,{replace:true})),1);assert.equal(save.training.slots[0].pokemonUid,next.uid);
    assert.ok(PokemonUsageSystem.getInstance().canPerform(old.uid,PokemonActionIds.TRAIN));
    training.startSession(next.uid,'move',0);assert.deepEqual(training.getCandidates(0,{replace:true}),[]);
    assert.equal(training.assignPokemon(0,old.uid,{replace:true}).result,'session-active');training.cancelSession(0);
  });
  test('opening and cancelling the change chooser leaves the original assignment and canonical collection intact',()=>{
    const save=fixture('Cancelled replacement'),old=owned(save,'eevee',20);owned(save,'pikachu',30);training.assignPokemon(0,old.uid);
    const selection=FacilityPokemonSelectionSystem.getInstance();selection.init();const before=copy(save.serialize());
    selection.openSelection('training',0,{replace:true});
    assert.equal(save.training.slots[0].pokemonUid,old.uid);assert.deepEqual(save.serialize(),before);
    selection.onDestroy();
  });
  test('an explicit new survey may discard a layer, but never grants its hidden loot or changes energy',()=>{
    const save=fixture('Explicit mine survey');mine.ensureLayer();const energy=save.mine.energy,inventory=copy(save.inventory.serialize());
    assert.equal(mine.startNextLayer().result,'layer-active');
    assert.equal(writeCount(()=>mine.startNextLayer({discardCurrent:true})),1);
    assert.equal(save.mine.energy,energy);assert.deepEqual(save.inventory.serialize(),inventory);assert.equal(save.mine.items.some((item)=>item.collected),false);
  });
  test('all three panels expose body management actions and real nonplaceholder slot media',()=>{
    fixture('Reference body actions');const panels=[new HatcheryPanel(DashboardColumns.LEFT),new TrainingCenterPanel(DashboardColumns.RIGHT),new MinePanel(DashboardColumns.RIGHT)];
    try{for(const panel of panels){const root=panel.getDomElement();assert.equal(root.querySelector('.win-body').querySelectorAll('.pw-facility-manage').length,1);assert.equal(root.querySelector('.pw-win-hdr').querySelectorAll('.pw-facility-manage').length,0);}}finally{panels.forEach((panel)=>panel.destroy());}
  });
  test('each slot exposes every real filter choice, localized in FR and EN without replacing native options',()=>{
    const locale=LocalizationManager.getInstance(),previous=locale.currentLang;
    try{for(const lang of ['fr','en']){locale.setLanguage(lang);for(const sector of ['hatchery','training']){
      const grid=new FacilityFilterGrid(sector,()=>{}),model=new FacilityFilterData(sector);
      try{const before=grid.getDomElement().querySelectorAll('option');grid.setFilters(model.serialize());grid.setFilters(model.serialize());
        assert.equal(grid.getDomElement().querySelectorAll('option')[0],before[0]);
        assert.equal(grid.getDomElement().querySelectorAll('select').length,sector==='hatchery'?7:8);
        for(const option of before) assert.ok(!/^(facility_|region[._]|type\.)/.test(option.textContent),option.textContent);
      }finally{grid.destroy();}
    }}}finally{locale.setLanguage(previous);}
  });
  test('all five mine tools have distinct registered vector glyphs, and real loot/staff sprite files exist',()=>{
    const definitions=Object.values(MineUiRules.TOOL_ICONS).map((name)=>{assert.ok(IconRegistry.has(name));return JSON.stringify(IconRegistry.get(name));});
    assert.equal(new Set(definitions).size,5);assert.ok(IconRegistry.has('zap'));
    for(const model of STAFF_CATALOG) assert.ok(fs.existsSync(decodeURI(AssetPaths.trainerSprite(model.sprite))),model.id);
    for(const model of MineLootDB.getInstance().getAll()) assert.ok(fs.existsSync(decodeURI(ItemDB.getInstance().getImagePath(model.itemId))),model.itemId);
  });
  test('a slot-local hatchery builder does not fill another slot or discard an existing FIFO head',()=>{
    const save=fixture('Local hatchery queue');hatchery.upgradeSlot();
    const first=owned(save,'eevee',12),next=owned(save,'magikarp',18);hatchery.enqueue(1,first.uid);
    hatchery.setAutomationFilter(1,'filterType','water');assert.equal(hatchery.rebuildQueues(1),1);
    assert.deepEqual(save.hatchery.queues[0],[]);assert.deepEqual(save.hatchery.queues[1].map((entry)=>entry.uid),[first.uid,next.uid]);
    const before=copy(save.serialize());assert.equal(writeCount(()=>hatchery.rebuildQueues(-1)),0);assert.deepEqual(save.serialize(),before);
  });
  test('schema 18 migration normalizes malformed empty slots while preserving every valid battle and UID',()=>{
    const battle={version:1,sentinel:['same',42]},raw={version:17,hatchery:{maxSlots:999},training:{slots:[null,{pokemonUid:'owned-real',battle,queue:['next-real'],autoOptions:['move']}]}};
    const before=copy(raw),migrated=MigrationV17ToV18.migrate(raw);
    assert.equal(migrated.hatchery.filters.length,HatcheryRules.MAX_SLOT_COUNT);assert.deepEqual(raw,before);
    assert.equal(migrated.training.slots[0].filters.mode,'configured');assert.equal(migrated.training.slots[1].pokemonUid,'owned-real');
    assert.deepEqual(migrated.training.slots[1].battle,battle);assert.deepEqual(migrated.training.slots[1].queue,['next-real']);
  });
  test('all-mode automation skips locked league modes and selects hidden only after normal talents are complete',()=>{
    let save=fixture('All mode gated'),pokemon=owned(save,'pikachu',30);save.player.badges=['surge'];
    training.buyAutomation(0);training.setAutomationFilter(0,'mode','all');training.assignPokemon(0,pokemon.uid);training.toggleAutomation(0);training.update(1);
    assert.equal(save.training.slots[0].mode,'move');training.cancelSession(0);
    save=fixture('All mode hidden');pokemon=owned(save,'pikachu',30);
    const species=pokemon.getSpecies();assert.ok(species.hiddenTalent);
    for(const id of species.talents.filter((id)=>id!==species.hiddenTalent))save.talents.unlock(species.id,id);
    training.buyAutomation(0);training.setAutomationFilter(0,'mode','all');training.assignPokemon(0,pokemon.uid);training.toggleAutomation(0);training.update(1);
    assert.equal(save.training.slots[0].mode,'hidden');training.cancelSession(0);
  });
  test('native dropdown skin and eager critical media are opt-in without altering shared widget defaults',()=>{
    const normal=new UIDropdown(),native=new UIDropdown({skin:'native'}),lazy=new UIImage(),eager=new UIImage({loading:'eager'});
    try{assert.equal(normal.getDomElement().querySelector('select').classList.contains('pw-dropdown-select--native'),false);
      assert.equal(native.getDomElement().querySelector('select').classList.contains('pw-dropdown-select--native'),true);
      assert.equal(lazy.getDomElement().getAttribute('loading'),'lazy');assert.equal(eager.getDomElement().getAttribute('loading'),'eager');
    }finally{for(const widget of [normal,native,lazy,eager])widget.destroy();}
  });

});
