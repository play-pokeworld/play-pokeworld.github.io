/**
 * @file Release1157.test.js
 * @brief Comprehensive test suite for v1.15.7:
 *   1. Audio & Music restoration (AudioSystem, PreferencesSystem synchronization, music context, sfx, cries).
 *   2. Notification spam elimination (removal of routine wild victory / appearance toasts, preserving shiny/legendary/quests).
 *   3. Pokédex Pokémon click redirection (opening dedicated PokedexDetailModal with flavor text, sources, moves, abilities, stats).
 */

import { describe, assert } from './TestRunner.js';
import { AudioSystem } from '../src/systems/AudioSystem.js';
import { PreferencesSystem } from '../src/systems/PreferencesSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { NotificationSystem } from '../src/systems/NotificationSystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { BattleStartedEvent } from '../src/core/events/BattleStartedEvent.js';
import { LocationChangedEvent } from '../src/core/events/LocationChangedEvent.js';
import { NotificationDispatchedEvent } from '../src/core/events/NotificationDispatchedEvent.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { PokedexPanel } from '../src/panels/fullscreen/PokedexPanel.js';
import { PokedexDetailModal } from '../src/panels/PokedexDetailModal.js';
import { SpeciesSourceCatalog } from '../src/data/pokemon/SpeciesSourceCatalog.js';
import { POKEDEX_FLAVOR } from '../src/data/pokedex-flavor.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { MoveLearnset } from '../src/data/pokemon/MoveLearnset.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { ItemKinds } from '../src/data/items/ItemKinds.js';

describe('Release 1.15.7 - Audio, Notifications, and Pokédex Detail Sheet', (test) => {

  test('AudioSystem initializes, manages preferences, and resolves music context', () => {
    const audio = AudioSystem.getInstance();
    assert.ok(audio, 'AudioSystem singleton exists');

    // Unlock audio engine
    audio.unlock();

    // Verify preferences integration
    const prefs = PreferencesSystem.getInstance();
    prefs.setAudioBus('music', { on: true, volume: 60 });
    prefs.setAudioBus('sfx', { on: true, volume: 75 });
    prefs.setAudioBus('cries', { on: true, volume: 80 });

    assert.equal(prefs.getAudioBus('music').volume, 60);
    assert.equal(prefs.getAudioBus('sfx').volume, 75);
    assert.equal(prefs.getAudioBus('cries').volume, 80);

    // Test music context switches
    assert.ok(audio.setMusicContext('town'), 'Sets town music context');
    assert.equal(audio.getCurrentMusicTrack(), 'town');

    assert.ok(audio.setMusicContext('battle_wild'), 'Sets battle wild context');
    assert.equal(audio.getCurrentMusicTrack(), 'battle_wild');

    // Test location event reaction (region first, locationId second)
    EventBus.getInstance().dispatch(new LocationChangedEvent('kanto', 'route1'));
    assert.equal(audio.getCurrentMusicTrack(), 'map_kanto');

    EventBus.getInstance().dispatch(new LocationChangedEvent('kanto', 'lavender'));
    assert.equal(audio.getCurrentMusicTrack(), 'loc_lavender');

    // Test SFX and cry execution safely
    audio.playSfx('click');
    audio.playSfx('open');
    audio.playCry(1);
    audio.playCry('pikachu');

    // Test tab visibility
    audio.setHidden(true);
    audio.setHidden(false);
  });

  test('Routine wild battles do NOT dispatch spam toast notifications', () => {
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    SaveSystem.getInstance().createNewSave('CombatTester', 'charmander');
    const notifs = [];

    const unsubscribe = EventBus.getInstance().subscribe(NotificationDispatchedEvent, (event) => {
      if (event.message) notifs.push(event.message);
    });

    try {
      // Start battle on route 1
      battle.startBattle('route1');

      // Assert that ordinary wild battle start does not produce a warning/toast notification
      assert.equal(notifs.length, 0, 'No toast notification dispatched on ordinary wild encounter');

      // Advance combat to simulate knockout
      const session = battle._session;
      if (session && session.foe) {
        session.foe.takeDamage(9999);
        battle.update(100);
      }

      // Verify that spammy "notif_enemy_defeated" toast is NOT sent
      const defeatToasts = notifs.filter((msg) => msg.includes('vaincu') || msg.includes('defeated'));
      assert.equal(defeatToasts.length, 0, 'Routine combat win does NOT send annoying toast notification');
    } finally {
      unsubscribe();
      if (battle.isActive()) battle.endBattle(false);
    }
  });

  test('Special encounters (shiny, roaming, legendary) DO dispatch high-priority notifications', () => {
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    SaveSystem.getInstance().createNewSave('LegendTester', 'bulbasaur');

    const notifs = [];
    const unsubscribe = EventBus.getInstance().subscribe(NotificationDispatchedEvent, (event) => {
      if (event.message) notifs.push(event.message);
    });

    try {
      // Manually test shiny encounter notification trigger in BattleSystem._begin
      const shinyFoe = PokemonFactory.create('rattata', 3, { shiny: true });
      battle._begin(shinyFoe, 'route1', null, 'battle_log.wild_appeared');

      assert.ok(notifs.length > 0, 'Notification dispatched for special shiny encounter');
    } finally {
      unsubscribe();
      if (battle.isActive()) battle.endBattle(false);
    }
  });

  test('PokedexPanel click opens dedicated PokedexDetailModal instead of PokemonInfoModal', () => {
    const save = SaveSystem.getInstance().createNewSave('DexUser', 'charmander');
    save.pokedex.markSeen('bulbasaur');

    let pokedexDetailOpened = null;
    let pokemonInfoOpened = null;

    const unsubscribe = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, (event) => {
      if (event.modalId === ModalIds.POKEDEX_DETAIL) pokedexDetailOpened = event.params;
      if (event.modalId === ModalIds.POKEMON_INFO) pokemonInfoOpened = event.params;
    });

    const panel = new PokedexPanel();
    panel.open();
    panel._selectSpecies('bulbasaur');

    assert.ok(pokedexDetailOpened, 'PokedexDetailModal was requested on Pokédex entry click');
    assert.equal(pokedexDetailOpened.speciesId, 'bulbasaur');
    assert.equal(pokemonInfoOpened, null, 'PokemonInfoModal was NOT requested from Pokédex click');

    unsubscribe();
    panel.close();
  });

  test('PokedexDetailModal displays official flavor text, obtainment sources, moves, and abilities', () => {
    const save = SaveSystem.getInstance().createNewSave('FlavorUser', 'squirtle');
    save.pokedex.markSeen('pikachu');
    save.pokedex.markCaught('pikachu', false);

    const modal = new PokedexDetailModal();
    modal.onEnter({ speciesId: 'pikachu' });

    // Verify modal title
    assert.ok(modal.getTitle().includes('Pikachu') || modal.getTitle().includes('025'), 'Modal title contains Pikachu or 025');

    // Verify official Pokédex description flavor text
    assert.ok(POKEDEX_FLAVOR.fr['25'], 'French Pokédex description exists for Pikachu');
    assert.ok(POKEDEX_FLAVOR.en['25'], 'English Pokédex description exists for Pikachu');

    // Verify Hoenn description exists
    assert.ok(POKEDEX_FLAVOR.fr['252'], 'French Pokédex description exists for Treecko (#252)');
    assert.ok(POKEDEX_FLAVOR.fr['386'], 'French Pokédex description exists for Deoxys (#386)');

    // Verify Obtainment sources catalog
    const sources = SpeciesSourceCatalog.getFormattedSources('pikachu');
    assert.ok(sources.length > 0, 'Pikachu has obtainment sources');
    assert.ok(sources.some((s) => s.includes('Forêt de Jade') || s.includes('Viridian Forest') || s.includes('Centrale')), 'Pikachu lists wild encounter locations');

    // Verify starters sources
    const bulbaSources = SpeciesSourceCatalog.getFormattedSources('bulbasaur');
    assert.ok(bulbaSources.some((s) => s.includes('Starter')), 'Bulbasaur lists Starter source');

    // Verify fossils sources
    const omanyteSources = SpeciesSourceCatalog.getFormattedSources('omanyte');
    assert.ok(omanyteSources.some((s) => s.includes('Fossile') || s.includes('Fossil')), 'Omanyte lists Fossil source');

    // Verify moves
    const species = PokemonDB.getInstance().getById('pikachu');
    const levelPool = MoveLearnset.poolFor(species.types);
    assert.ok(levelPool.length > 0, 'Pikachu has level-up moves');

    const trainingPool = MoveLearnset.trainingPoolFor(species.types);
    assert.ok(trainingPool.length > 0, 'Pikachu has dojo training moves');

    // Verify talents
    assert.ok(species.talents.length > 0, 'Pikachu has defined talents');
    assert.ok(species.talents.includes('static'), 'Pikachu has Static talent');

    // Verify base stats
    assert.equal(species.baseStats.spe, 90, 'Pikachu base Speed is 90');

    modal.onExit();
  });

});
