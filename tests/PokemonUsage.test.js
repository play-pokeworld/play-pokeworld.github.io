/**
 * @file PokemonUsage.test.js
 * @brief Schema 16 Pokémon collection: v15 → v16 migration, PC box independent of the team,
 * PokemonUsageSystem claims and the action locks shown by the Pokémon sheet.
 */
import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { PokemonUsageChangedEvent } from '../src/core/events/PokemonUsageChangedEvent.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { MoveLearningResults, ItemUseResults } from '../src/config/ItemUseRules.js';
import { PokemonActionIds, PokemonUsageIds } from '../src/config/PokemonUsageRules.js';
import { MigrationV15ToV16 } from '../src/data/save/migrations/MigrationV15ToV16.js';
import { SaveMigrator } from '../src/data/save/migrations/SaveMigrator.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { PokemonData } from '../src/data/pokemon/PokemonData.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { TrainingSystem } from '../src/systems/TrainingSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { PokemonUsageSystem } from '../src/systems/PokemonUsageSystem.js';
import { MoveLearningSystem } from '../src/systems/MoveLearningSystem.js';
import { ItemUseSystem } from '../src/systems/ItemUseSystem.js';
import { BoxPanel } from '../src/panels/fullscreen/BoxPanel.js';
import { PokemonInfoModal } from '../src/panels/PokemonInfoModal.js';
import { t } from '../src/localization/LocalizationManager.js';
import { setRoster } from './RosterFixtures.js';

/** @param {BoxPanel} panel @returns {string[]} uids of the rendered PC tiles */
function renderedUids(panel) {
  return [...panel.getDomElement().querySelectorAll('.pw-box-grid-entry')].map((entry) => entry.dataset.pokemonUid);
}

/** Save with a starter in the team, one free PC Pokémon and one daycare Pokémon. */
function rosterSave(name) {
  const save = SaveSystem.getInstance().createNewSave(name, 'pikachu');
  const lead = save.team[0];
  const stored = PokemonFactory.create('squirtle', 12);
  const housed = PokemonFactory.create('eevee', 10);
  setRoster(save, [lead], [stored, housed]);
  save.hatchery.setSlot(0, { kind: 'daycare', pokemonUid: housed.uid, knockouts: 0 });
  return { save, lead, stored, housed };
}

describe('Save migration v15 → v16', (test) => {
  test('team, PC and daycare Pokémon join one collection referenced by uid, without loss or duplicate', () => {
    const raw = {
      version: 15,
      team: [{ uid: 'p_a', species: 'pikachu', level: 12 }, { species: 'bulbasaur', level: 5 }],
      box: [{ uid: 'p_a', species: 'squirtle', level: 7 }, { uid: 'p_c', species: 'rattata', level: 3 }],
      hatchery: {
        maxSlots: 3,
        slots: [
          { kind: 'daycare', pokemon: { uid: 'p_d', species: 'eevee', level: 9 }, knockouts: 4 },
          { kind: 'fossil', itemId: 'helix_fossil', speciesId: 'omanyte', knockouts: 1, required: 10, ready: false },
          { poke: { species: 'pidgey', level: 2 } }
        ]
      }
    };
    const original = JSON.stringify(raw);
    const migrated = MigrationV15ToV16.migrate(raw);
    assert.equal(JSON.stringify(raw), original, 'migration does not mutate input');
    assert.equal(migrated.version, 16);
    assert.ok(!('box' in migrated), 'the PC box is derived from the collection');
    assert.deepEqual(migrated.collection.map((pokemon) => pokemon.species), ['pikachu', 'bulbasaur', 'squirtle', 'rattata', 'eevee', 'pidgey']);
    const uids = migrated.collection.map((pokemon) => pokemon.uid);
    assert.equal(new Set(uids).size, uids.length, 'every Pokémon gets a distinct uid');
    assert.deepEqual(migrated.team, [uids[0], uids[1]]);
    assert.equal(uids[0], 'p_a');
    assert.ok(uids[2] !== 'p_a', 'a uid collision is resolved instead of dropping the Pokémon');
    const daycare = migrated.hatchery.slots[0];
    assert.deepEqual([daycare.kind, daycare.pokemonUid, daycare.knockouts, 'pokemon' in daycare], ['daycare', 'p_d', 4, false]);
    assert.equal(migrated.hatchery.slots[1].kind, 'fossil', 'fossil slots are unchanged');
    assert.equal(migrated.hatchery.slots[2].pokemonUid, uids[5], 'the legacy poke alias is converted too');
    assert.deepEqual(MigrationV15ToV16.migrate(raw), migrated, 'the migration is deterministic');

    const save = SaveData.fromJson(SaveMigrator.migrate(raw));
    assert.equal(save.collection.size, 6);
    assert.deepEqual(save.team.map((pokemon) => pokemon.species), ['pikachu', 'bulbasaur']);
    assert.deepEqual(save.hatchery.getDaycareUids(), ['p_d', uids[5]]);
    const restored = SaveData.fromJson(JSON.parse(JSON.stringify(save.serialize())));
    assert.equal(restored.collection.size, 6, 'the collection round-trips');
    assert.deepEqual(restored.teamMembers.getUids(), save.teamMembers.getUids());
  });

  test('loading repairs dangling references instead of duplicating a Pokémon', () => {
    const save = SaveData.fromJson({
      version: 16,
      collection: [{ uid: 'p_1', species: 'pikachu', level: 5 }, { uid: 'p_2', species: 'eevee', level: 5 }],
      team: ['p_1', 'p_2', 'p_missing'],
      hatchery: { maxSlots: 2, slots: [{ kind: 'daycare', pokemonUid: 'p_2', knockouts: 0 }, { kind: 'daycare', pokemonUid: 'p_gone', knockouts: 0 }] }
    });
    assert.deepEqual(save.teamMembers.getUids(), ['p_1'], 'unknown and daycare uids leave the party');
    assert.deepEqual(save.hatchery.getDaycareUids(), ['p_2']);
    assert.equal(save.hatchery.slots[1], null, 'a slot pointing to no owned Pokémon is emptied');
  });
});

describe('PC box and Pokémon usages', (test) => {
  test('the PC shows every owned Pokémon once; a team selection only offers available ones', () => {
    const { lead, stored, housed } = rosterSave('PC collection');
    const panel = new BoxPanel();
    try {
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BOX));
      assert.deepEqual(renderedUids(panel).sort(), [lead.uid, stored.uid, housed.uid].sort(), 'team, PC and daycare Pokémon are all shown');
      panel.close();

      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BOX, {
        selectionRequestId: 'usage-test',
        selectionAction: PokemonActionIds.JOIN_TEAM
      }));
      assert.deepEqual(renderedUids(panel), [stored.uid], 'team and daycare Pokémon are hidden from a team selection');
      panel.close();
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BOX));
      assert.equal(renderedUids(panel).length, 3, 'leaving selection mode shows the whole collection again');
    } finally {
      if (panel.isOpen()) panel.close();
      panel.destroy();
    }
  });

  test('a persisted training assignment locks incompatible actions and needs explicit removal', () => {
    const { save, stored } = rosterSave('Usage claim');
    const training = TrainingSystem.getInstance();
    save.access.unlockFeature('training');
    const usage = PokemonUsageSystem.getInstance();
    const events = [];
    const unsubscribe = EventBus.getInstance().subscribe(PokemonUsageChangedEvent, (event) => events.push(event));
    try {
      assert.equal(usage.isAvailable(stored.uid), true);
      assert.equal(usage.claim(PokemonUsageIds.TRAINING, stored.uid), false, 'training is not a transient claim');
      assert.equal(training.assignPokemon(0, stored.uid).result, 'ready');
      assert.ok(events.length > 0, 'persisted assignment notifies consumers');
      assert.equal(usage.claim(PokemonUsageIds.TEAM, stored.uid), false, 'persisted usages cannot be claimed');
      assert.equal(usage.getPrimaryUsage(stored.uid), PokemonUsageIds.TRAINING);
      assert.equal(BoxSystem.getInstance().getPokemonByUid(stored.uid), stored, 'a busy Pokémon never leaves the PC');
      assert.equal(TeamSystem.getInstance().addMember(stored.uid), false, 'a training Pokémon cannot join the team');
      stored.unlockMove('surf');
      assert.equal(MoveLearningSystem.getInstance().learnMove(stored.uid, 'surf').result, MoveLearningResults.POKEMON_IN_USE);
      assert.equal(usage.canPerform(stored.uid, PokemonActionIds.USE_ITEM), true, 'item use is not locked by training');

      assert.equal(usage.release(PokemonUsageIds.TRAINING, stored.uid), false, 'session release cannot unassign a persisted slot');
      assert.ok(training.clearSlot(0));
      assert.equal(MoveLearningSystem.getInstance().learnMove(stored.uid, 'surf').result, MoveLearningResults.SUCCESS);
      assert.ok(TeamSystem.getInstance().addMember(stored.uid));
      assert.deepEqual(usage.getUsages(stored.uid), [PokemonUsageIds.TEAM]);
      assert.equal(save.collection.size, 3, 'joining the team does not copy the Pokémon');

      assert.equal(training.assignPokemon(0, save.team[0].uid).result, 'ready');
      SaveSystem.getInstance().createNewSave('Usage reset', 'charmander');
      assert.equal(usage.getUsages(stored.uid).length, 0, 'the new save has no such Pokémon');
      {
        const restored = SaveSystem.getInstance().loadSlot(save.id);
        assert.ok(restored.training.getReservedUids().includes(save.team[0].uid), 'the outgoing assignment was saved');
        assert.equal(usage.getPrimaryUsage(save.team[0].uid), PokemonUsageIds.TRAINING);
        training.clearSlot(0);
      }
    } finally {
      unsubscribe();
    }
  });

  test('daycare Pokémon keep their collection flags but cannot take items or learn moves', () => {
    const { housed } = rosterSave('Daycare locks');
    const save = SaveSystem.getInstance().getCurrentSave();
    save.inventory.add('rarecandy', 1, { deferSave: true });
    const itemUse = ItemUseSystem.getInstance();
    assert.equal(itemUse.getEligibleTargets('rarecandy').some((target) => target.uid === housed.uid), false);
    assert.equal(itemUse.useOnPokemon('rarecandy', housed.uid).result, ItemUseResults.TARGET_INELIGIBLE);
    assert.equal(save.inventory.count('rarecandy'), 1, 'a refused use consumes nothing');
    assert.ok(BoxSystem.getInstance().updatePokemon(housed.uid, (pokemon) => {
      pokemon.favorite = true;
      return true;
    }), 'favorite and lock flags stay editable everywhere');
  });

  test('the Pokémon sheet shows the location and disables locked actions with their reason', () => {
    const { save, lead, stored, housed } = rosterSave('Sheet locks');
    save.access.unlockFeature('training');
    housed.unlockMove('swift');
    lead.unlockMove('swift');
    const modal = new PokemonInfoModal();
    const learnButtons = () => [...modal.getDomElement().querySelectorAll('.poke-detail-learnable-row')]
      .map((row) => row.querySelector('.pw-button') || row);
    const location = () => modal.getDomElement().querySelector('.poke-detail-location')?.textContent ?? '';
    try {
      modal.open({ pokemonUid: housed.uid });
      assert.ok(location().includes(t('pokemon_usage_daycare')), 'the sheet knows the daycare location');
      assert.ok(learnButtons().length > 0 && learnButtons().every((button) => button.getAttribute('disabled') === 'disabled'), 'daycare Pokémon cannot learn moves');
      assert.ok(modal.getDomElement().textContent.includes(t('pokemon_action_locked_daycare')), 'the lock reason is displayed');

      modal.open({ pokemonUid: stored.uid });
      assert.ok(location().includes(t('pokemon_usage_none')), 'a free Pokémon is shown as stored in the PC');

      modal.open({ pokemonUid: lead.uid });
      assert.ok(location().includes(t('pokemon_usage_team')), 'team location');
      assert.ok(learnButtons().length > 0 && learnButtons().every((button) => button.getAttribute('disabled') !== 'disabled'), 'team Pokémon learn moves outside battle');

      assert.equal(TrainingSystem.getInstance().assignPokemon(0, lead.uid).result, 'ready');
      assert.ok(location().includes(t('pokemon_usage_training')), 'the open sheet follows usage changes');
      assert.ok(learnButtons().every((button) => button.getAttribute('disabled') === 'disabled'), 'training locks moves');
      TrainingSystem.getInstance().clearSlot(0);
    } finally {
      if (modal.isOpen()) modal.close();
      modal.destroy();
    }
  });

  test('a new Pokémon whose generated uid collides receives a fresh one', () => {
    const save = SaveSystem.getInstance().createNewSave('Uid collision', 'pikachu');
    const twin = new PokemonData({ uid: save.team[0].uid, species: 'eevee', level: 5 });
    assert.ok(BoxSystem.getInstance().addPokemon(twin));
    assert.ok(twin.uid !== save.team[0].uid);
    assert.equal(BoxSystem.getInstance().addPokemon(twin), false, 'the same Pokémon cannot be registered twice');
    assert.equal(save.collection.size, 2);
  });
});
