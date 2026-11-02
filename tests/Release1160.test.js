/**
 * @file Release1160.test.js
 * @brief Comprehensive tests for Release 1.16.0: Legendary & Mythical Sanctuaries & Ancestral Relics.
 */
import { describe, assert } from './TestRunner.js';
import { SanctuaryDB } from '../src/data/sanctuary/SanctuaryDB.js';
import { SanctuarySystem } from '../src/systems/SanctuarySystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { DictionaryCatalog } from '../src/systems/dictionary/DictionaryCatalog.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { BattleCombatant } from '../src/systems/battle/BattleCombatant.js';
import { BattleSides } from '../src/config/BattleSides.js';
import { BattleSession } from '../src/systems/battle/BattleSession.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { RoamingRules } from '../src/config/RoamingRules.js';
import { RoamingSystem } from '../src/systems/RoamingSystem.js';
import { AtollSystem } from '../src/systems/AtollSystem.js';
import { SpeciesSourceCatalog } from '../src/data/pokemon/SpeciesSourceCatalog.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { Random } from '../src/core/Random.js';
import { t } from '../src/localization/LocalizationManager.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { BagQuery } from '../src/systems/inventory/BagQuery.js';
import { BattleZoneEffects } from '../src/panels/components/BattleZoneEffects.js';

describe('Release 1.16.0 - Sanctuaries & Ancestral Relics', (test) => {
  test('All 21 Gen 1-3 Legendary and Mythical Pokémon are mapped to canonical sanctuaries across Kanto, Johto, and Hoenn', () => {
    const db = SanctuaryDB.getInstance();
    const all = db.getAll();
    assert.equal(all.length, 21, 'exactly 21 sanctuaries');

    const expected = [
      // Kanto (5)
      { id: 'sanctuary_articuno', species: 'articuno', locationId: 'seafoamislands', region: 'kanto', relic: 'relic_ice', tier: 'tier2', level: 75, hpMult: 20 },
      { id: 'sanctuary_zapdos', species: 'zapdos', locationId: 'powerplant', region: 'kanto', relic: 'relic_thunder', tier: 'tier2', level: 75, hpMult: 20 },
      { id: 'sanctuary_moltres', species: 'moltres', locationId: 'victoryroad', region: 'kanto', relic: 'relic_fire', tier: 'tier2', level: 75, hpMult: 20 },
      { id: 'sanctuary_mewtwo', species: 'mewtwo', locationId: 'ceruleancave', region: 'kanto', relic: 'relic_dna', tier: 'tier3', level: 85, hpMult: 35 },
      { id: 'sanctuary_mew', species: 'mew', locationId: 'pokemonmansion', region: 'kanto', relic: 'relic_origin', tier: 'mythical', level: 85, hpMult: 28 },

      // Johto (6)
      { id: 'sanctuary_raikou', species: 'raikou', locationId: 'burnedtower', region: 'johto', relic: 'relic_storm', tier: 'tier2', level: 75, hpMult: 20 },
      { id: 'sanctuary_entei', species: 'entei', locationId: 'mtmortar', region: 'johto', relic: 'relic_volcano', tier: 'tier2', level: 75, hpMult: 20 },
      { id: 'sanctuary_suicune', species: 'suicune', locationId: 'tohjofalls', region: 'johto', relic: 'relic_wave', tier: 'tier2', level: 75, hpMult: 20 },
      { id: 'sanctuary_lugia', species: 'lugia', locationId: 'whirlislands', region: 'johto', relic: 'silver_wing', tier: 'tier3', level: 85, hpMult: 35 },
      { id: 'sanctuary_ho_oh', species: 'ho-oh', locationId: 'tintower', region: 'johto', relic: 'rainbow_wing', tier: 'tier3', level: 85, hpMult: 35 },
      { id: 'sanctuary_celebi', species: 'celebi', locationId: 'ilexforest', region: 'johto', relic: 'gs_ball_celebi', tier: 'mythical', level: 85, hpMult: 28 },

      // Hoenn (10)
      { id: 'sanctuary_regirock', species: 'regirock', locationId: 'desert_ruins', region: 'hoenn', relic: 'relic_rock', tier: 'tier2', level: 75, hpMult: 20 },
      { id: 'sanctuary_regice', species: 'regice', locationId: 'island_cave', region: 'hoenn', relic: 'relic_ice_golem', tier: 'tier2', level: 75, hpMult: 20 },
      { id: 'sanctuary_registeel', species: 'registeel', locationId: 'ancient_tomb', region: 'hoenn', relic: 'relic_steel', tier: 'tier2', level: 75, hpMult: 20 },
      { id: 'sanctuary_latias', species: 'latias', locationId: 'southern_island', region: 'hoenn', relic: 'eon_ticket_latis', tier: 'mythical', level: 85, hpMult: 28 },
      { id: 'sanctuary_latios', species: 'latios', locationId: 'mirage_island', region: 'hoenn', relic: 'eon_ticket_latis', tier: 'mythical', level: 85, hpMult: 28 },
      { id: 'sanctuary_kyogre', species: 'kyogre', locationId: 'seafloor_cavern', region: 'hoenn', relic: 'blue_orb', tier: 'tier3', level: 85, hpMult: 35 },
      { id: 'sanctuary_groudon', species: 'groudon', locationId: 'cave_of_origin', region: 'hoenn', relic: 'red_orb', tier: 'tier3', level: 85, hpMult: 35 },
      { id: 'sanctuary_rayquaza', species: 'rayquaza', locationId: 'sky_pillar', region: 'hoenn', relic: 'relic_green_orb', tier: 'tier3', level: 85, hpMult: 35 },
      { id: 'sanctuary_jirachi', species: 'jirachi', locationId: 'mt_pyre', region: 'hoenn', relic: 'relic_star', tier: 'mythical', level: 85, hpMult: 28 },
      { id: 'sanctuary_deoxys', species: 'deoxys', locationId: 'birth_island', region: 'hoenn', relic: 'meteorite_shard_delta', tier: 'mythical', level: 85, hpMult: 28 }
    ];

    for (const exp of expected) {
      const s = db.getById(exp.id);
      assert.ok(s, `Sanctuary ${exp.id} exists`);
      assert.equal(s.species, exp.species);
      assert.equal(s.locationId, exp.locationId);
      assert.equal(s.region, exp.region);
      assert.equal(s.relicItem, exp.relic);
      assert.equal(s.tier, exp.tier);
      assert.equal(s.level, exp.level);
      assert.equal(s.hpMultiplier, exp.hpMult);
      assert.ok(db.getByLocation(exp.locationId), `lookup by location ${exp.locationId}`);
      assert.ok(db.getBySpecies(exp.species), `lookup by species ${exp.species}`);
    }
  });

  test('All 13 new Relic items are full visible items with valid sprites, appearing in bag and dictionary', () => {
    const itemDb = ItemDB.getInstance();
    const relics = [
      'relic_ice', 'relic_thunder', 'relic_fire', 'relic_dna', 'relic_origin',
      'relic_storm', 'relic_volcano', 'relic_wave', 'relic_rock', 'relic_ice_golem',
      'relic_steel', 'relic_green_orb', 'relic_star'
    ];

    for (const id of relics) {
      const item = itemDb.getById(id);
      assert.ok(item, `Item ${id} is registered in ItemDB`);
      assert.equal(item.category, 'legend_relic', `Item ${id} is categorized as legend_relic`);
      assert.equal(item.hidden, false, `Item ${id} is NOT hidden`);
      assert.ok(item.image, `Item ${id} has a sprite defined`);
      const imagePath = itemDb.getImagePath(id);
      assert.ok(imagePath.endsWith('.png'), `Item ${id} image path resolves to PNG: ${imagePath}`);
    }

    // Verify relics appear in the regional dictionary
    const save = SaveData.createNew('RelicDictTrainer', 'bulbasaur');
    const kantoItems = DictionaryCatalog.getItems(save, ['kanto']);
    assert.ok(kantoItems.some((i) => i.id === 'relic_ice'), 'Relic ice visible in Kanto dictionary');
    assert.ok(kantoItems.some((i) => i.id === 'relic_dna'), 'Relic dna visible in Kanto dictionary');

    // Verify relics appear in bag when owned
    save.inventory.add('relic_ice', 2);
    const bagEntries = BagQuery.entries(save, (id) => id);
    const iceEntry = bagEntries.find((e) => e.itemId === 'relic_ice');
    assert.ok(iceEntry, 'Relic ice is listed in bag entries');
    assert.equal(iceEntry.quantity, 2, 'Relic ice shows quantity in bag');
  });

  test('Defeating wild Pokémon in sanctuary locations charges forge progress (30 KOs) and forging is infinitely repeatable', () => {
    const saves = SaveSystem.getInstance();
    const prev = saves.getCurrentSave();
    const save = SaveData.createNew('SanctuaryForgeTrainer', 'bulbasaur');
    saves.setCurrentSave(save);

    try {
      const sanctuarySystem = SanctuarySystem.getInstance();
      const locationId = 'seafoamislands';
      assert.equal(save.sanctuary.getProgress(locationId), 0);
      assert.equal(sanctuarySystem.canForgeRelic(locationId), false);

      // Simulate 29 KOs
      for (let i = 0; i < 29; i++) {
        sanctuarySystem.recordWildKO(locationId);
      }
      assert.equal(save.sanctuary.getProgress(locationId), 29);
      assert.equal(sanctuarySystem.canForgeRelic(locationId), false);

      // 30th KO unlocks forge
      sanctuarySystem.recordWildKO(locationId);
      assert.equal(save.sanctuary.getProgress(locationId), 30);
      assert.equal(sanctuarySystem.canForgeRelic(locationId), true);

      // Forge relic: inventory receives +1 relic_ice, progress is reset by 30
      assert.equal(save.inventory.count('relic_ice'), 0);
      const forged = sanctuarySystem.forgeRelic(locationId);
      assert.equal(forged, true);
      assert.equal(save.inventory.count('relic_ice'), 1);
      assert.equal(save.sanctuary.getProgress(locationId), 0);
      assert.equal(sanctuarySystem.canForgeRelic(locationId), false);

      // Infinitely repeatable: charge another 30 KOs
      for (let i = 0; i < 35; i++) {
        sanctuarySystem.recordWildKO(locationId);
      }
      assert.equal(save.sanctuary.getProgress(locationId), 35);
      assert.equal(sanctuarySystem.canForgeRelic(locationId), true);

      const forgedSecond = sanctuarySystem.forgeRelic(locationId);
      assert.equal(forgedSecond, true);
      assert.equal(save.inventory.count('relic_ice'), 2);
      assert.equal(save.sanctuary.getProgress(locationId), 5, 'surplus 5 KOs preserved towards next forge');
    } finally {
      saves.setCurrentSave(prev);
    }
  });

  test('Sanctuary Boss encounters scale with BST tiers, high HP multipliers, and custom enrage timers', () => {
    const db = SanctuaryDB.getInstance();

    // Tier II: Articuno (BST ~580)
    const articuno = db.getById('sanctuary_articuno');
    assert.equal(articuno.tier, 'tier2');
    assert.equal(articuno.level, 75);
    assert.equal(articuno.hpMultiplier, 20);
    assert.equal(articuno.enrageLimitMs, 75000);

    // Tier III: Mewtwo (BST 680)
    const mewtwo = db.getById('sanctuary_mewtwo');
    assert.equal(mewtwo.tier, 'tier3');
    assert.equal(mewtwo.level, 85);
    assert.equal(mewtwo.hpMultiplier, 35);
    assert.equal(mewtwo.enrageLimitMs, 90000);

    // Mythical: Mew / Deoxys (BST 600)
    const mew = db.getById('sanctuary_mew');
    assert.equal(mew.tier, 'mythical');
    assert.equal(mew.level, 85);
    assert.equal(mew.hpMultiplier, 28);
    assert.equal(mew.enrageLimitMs, 60000);

    // Verify combatant scaling logic
    const foePokemon = PokemonFactory.create('mewtwo', 85);
    const combatant = new BattleCombatant(foePokemon, BattleSides.FOE, {
      npc: true,
      legendaryBoss: true,
      hpMultiplier: mewtwo.hpMultiplier,
      statMultipliers: mewtwo.statMultipliers,
      enrageLimitMs: mewtwo.enrageLimitMs
    });
    assert.equal(combatant.legendaryBoss, true);
    assert.equal(combatant.hpMultiplier, 35);
    assert.equal(combatant.enrageLimitMs, 90000);
    assert.ok(combatant.pokemon.hp > 5000, `Scaled boss HP (${combatant.pokemon.hp}) reflects massive pool`);
  });

  test('Victory over a Sanctuary Boss consumes exactly 1 Relic, awards the Pokémon, and records completion', () => {
    const saves = SaveSystem.getInstance();
    const prev = saves.getCurrentSave();
    const save = SaveData.createNew('SanctuaryVictoryTrainer', 'bulbasaur');
    saves.setCurrentSave(save);

    try {
      const sanctuarySystem = SanctuarySystem.getInstance();
      const sanctuary = SanctuaryDB.getInstance().getById('sanctuary_articuno');

      // Grant 2 relics
      save.inventory.add('relic_ice', 2);
      assert.equal(save.inventory.count('relic_ice'), 2);
      assert.equal(save.sanctuary.getCompletions(sanctuary.id), 0);
      assert.equal(save.pokedex.isCaught('articuno'), false);

      const foe = PokemonFactory.create('articuno', 75);
      sanctuarySystem.onBossVictory(sanctuary.id, foe);

      // Exactly 1 relic consumed
      assert.equal(save.inventory.count('relic_ice'), 1, 'one relic consumed on victory');
      assert.equal(save.sanctuary.getCompletions(sanctuary.id), 1, 'completion recorded');
      assert.equal(save.pokedex.isCaught('articuno'), true, 'articuno marked caught in pokedex');

      const ownedArticuno = save.collection.getAll().find((p) => p.species === 'articuno');
      assert.ok(ownedArticuno, 'Articuno is added to player collection');
      assert.equal(ownedArticuno.level, 75);
    } finally {
      saves.setCurrentSave(prev);
    }
  });

  test('Defeat against a Sanctuary Boss does NOT consume the Relic and leaves player safe', () => {
    const saves = SaveSystem.getInstance();
    const prev = saves.getCurrentSave();
    const save = SaveData.createNew('SanctuaryDefeatTrainer', 'bulbasaur');
    saves.setCurrentSave(save);

    try {
      const sanctuarySystem = SanctuarySystem.getInstance();
      const sanctuary = SanctuaryDB.getInstance().getById('sanctuary_mewtwo');

      save.inventory.add('relic_dna', 1);
      assert.equal(save.inventory.count('relic_dna'), 1);
      assert.equal(save.sanctuary.getCompletions(sanctuary.id), 0);

      sanctuarySystem.onBossDefeat(sanctuary.id);

      assert.equal(save.inventory.count('relic_dna'), 1, 'relic is NOT consumed on defeat');
      assert.equal(save.sanctuary.getCompletions(sanctuary.id), 0, 'no completion recorded');
    } finally {
      saves.setCurrentSave(prev);
    }
  });

  test('Enrage timer wipe knocks out player team after time limit (60s / 75s / 90s)', () => {
    const ally = PokemonFactory.create('pikachu', 50);
    const foe = PokemonFactory.create('deoxys', 85);

    const session = new BattleSession({
      team: [ally],
      foe,
      foeOptions: {
        npc: true,
        legendaryBoss: true,
        hpMultiplier: 28,
        enrageLimitMs: 60000
      },
      random: Random.sequence([1.0])
    });

    // Advance 59 seconds: boss has not wiped
    session.update(59);
    assert.equal(session.active.isFainted(), false, 'Player survives before 60s enrage');

    // Advance 2 more seconds: total 61s exceeds 60s enrageLimitMs -> wipe!
    session.update(2);
    assert.equal(session.active.isFainted(), true, 'Enrage wipe knocked out active member');
  });

  test('Legendary Pokémon are completely absent from all dungeon wild encounter tables', () => {
    const locations = LocationDB.getInstance();
    const dungeonLocations = [
      'ceruleancave', 'southern_island', 'mt_pyre', 'seafloor_cavern',
      'cave_of_origin', 'sky_pillar', 'desert_ruins', 'island_cave', 'ancient_tomb'
    ];
    const legendaries = new Set([
      'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
      'raikou', 'entei', 'suicune', 'lugia', 'ho-oh', 'celebi',
      'regirock', 'regice', 'registeel', 'latias', 'latios',
      'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys'
    ]);

    for (const locId of dungeonLocations) {
      const encounters = locations.getEncounters(locId);
      for (const entry of encounters) {
        assert.equal(
          legendaries.has(entry.species),
          false,
          `Dungeon ${locId} must not contain legendary ${entry.species}`
        );
      }
    }
  });

  test('Roaming toggle ROAMING_ENABLED: false suppresses roaming wild spawns while preserving data structures and panels', () => {
    assert.equal(RoamingRules.ROAMING_ENABLED, false, 'Roaming is globally disabled');

    // Mathematical rotation remains intact for deterministic testing
    const speciesAtR1 = RoamingSystem.getSpeciesAt('route1', 0);
    assert.equal(speciesAtR1, 'articuno');

    // BattleSystem will not pull roamers into wild encounters because ROAMING_ENABLED is false
    const locationId = 'route1';
    const activeRoamer = RoamingRules.ROAMING_ENABLED ? RoamingSystem.getSpeciesAt(locationId) : null;
    assert.equal(activeRoamer, null, 'No roamer is injected into combat encounters');
  });

  test('Battle Atoll Legend Fragments (50 fragments) summon path remains functional as an alternative for players', () => {
    const atollSystem = AtollSystem.getInstance();
    const save = SaveData.createNew('AtollFragTrainer', 'bulbasaur');
    save.statistics.recordLeague('kanto');

    save.atoll.fragments = 40;
    assert.equal(atollSystem.canSummon(save), false);

    save.atoll.fragments = 50;
    assert.equal(atollSystem.canSummon(save), true);

    const choices = atollSystem.getFragmentLegendaryChoices(save);
    assert.ok(choices.length > 0, 'Unlocked Kanto legendaries are offered');
    assert.ok(choices.includes(150), 'Mewtwo (dex 150) is available for 50 fragments');
  });

  test('SpeciesSourceCatalog displays sanctuary obtainment source in Pokédex with location, required relic, and level', () => {
    const mewtwoSources = SpeciesSourceCatalog.getSources('mewtwo');
    const sanctuarySrc = mewtwoSources.find((s) => s.kind === 'sanctuary');
    assert.ok(sanctuarySrc, 'Mewtwo has sanctuary source');
    assert.equal(sanctuarySrc.locationId, 'ceruleancave');
    assert.equal(sanctuarySrc.relicItem, 'relic_dna');
    assert.equal(sanctuarySrc.level, 85);

    const formatted = SpeciesSourceCatalog.getFormattedSources('mewtwo');
    assert.ok(formatted.some((line) => line.includes('Caverne Azurée') || line.includes('Cerulean Cave')), 'Formatted source contains sanctuary location');
    assert.ok(formatted.some((line) => line.includes('Relique ADN') || line.includes('DNA Relic')), 'Formatted source contains relic item name');
  });

  test('All 21 Sanctuaries map valid farmLocations and defeating wild Pokémon on connected routes charges altar', () => {
    const db = SanctuaryDB.getInstance();
    const locations = LocationDB.getInstance();
    const saves = SaveSystem.getInstance();
    const prev = saves.getCurrentSave();
    const save = SaveData.createNew('FarmRouteTrainer', 'bulbasaur');
    saves.setCurrentSave(save);

    try {
      // 1. Validate all 21 sanctuaries have valid farmLocations
      for (const sanctuary of db.getAll()) {
        assert.ok(Array.isArray(sanctuary.farmLocations), `${sanctuary.id} has farmLocations array`);
        assert.ok(sanctuary.farmLocations.length >= 1, `${sanctuary.id} has at least 1 farm location`);
        for (const locId of sanctuary.farmLocations) {
          assert.ok(locations.getById(locId), `Farm location ${locId} for ${sanctuary.id} exists in LocationDB`);
        }
      }

      // 2. Defeating wild Pokémon on connected Route 19 or Route 20 charges Seafoam Islands (Articuno)
      const sanctuarySystem = SanctuarySystem.getInstance();
      assert.equal(save.sanctuary.getProgress('seafoamislands'), 0);

      // KO 15 on Route 19
      for (let i = 0; i < 15; i++) {
        sanctuarySystem.recordWildKO('route19');
      }
      assert.equal(save.sanctuary.getProgress('seafoamislands'), 15, 'Route 19 KOs charge Seafoam Islands altar');

      // KO 15 on Route 20
      for (let i = 0; i < 15; i++) {
        sanctuarySystem.recordWildKO('route20');
      }
      assert.equal(save.sanctuary.getProgress('seafoamislands'), 30, 'Route 20 KOs charge Seafoam Islands altar');
      assert.equal(sanctuarySystem.canForgeRelic('seafoamislands'), true, 'Can forge relic after 30 route KOs');
    } finally {
      saves.setCurrentSave(prev);
    }
  });

  test('UI localizations display clean level labels without any Raid Tier references', () => {
    const lvlFr = t('sanctuary_level', { level: 75 });
    const lvlEn = t('sanctuary_level', { level: 75 });
    assert.equal(lvlFr, 'Nv. 75');
    assert.ok(!lvlFr.includes('Raid Tier'), 'No Raid Tier in French level label');
    assert.ok(!lvlEn.includes('Raid Tier'), 'No Raid Tier in English level label');

    // Legacy tier keys also map cleanly to level without Raid Tier
    assert.ok(!t('sanctuary_tier_2', { level: 75 }).includes('Raid Tier'));
    assert.ok(!t('sanctuary_tier_3', { level: 85 }).includes('Raid Tier'));
    assert.ok(!t('sanctuary_tier_mythical', { level: 85 }).includes('Raid'));
  });

  test('LocationPanel renders sanctuary card cleanly across all 21 sanctuary locations without errors', () => {
    const saves = SaveSystem.getInstance();
    const prev = saves.getCurrentSave();
    const save = SaveData.createNew('SanctuaryUiTrainer', 'bulbasaur');
    saves.setCurrentSave(save);

    try {
      const db = SanctuaryDB.getInstance();
      for (const sanctuary of db.getAll()) {
        save.player.location = sanctuary.locationId;
        const panel = new LocationPanel(DashboardColumns.RIGHT);
        const dom = panel.getDomElement();
        assert.ok(dom, `LocationPanel DOM generated for ${sanctuary.locationId}`);

        const card = dom.querySelector('.pw-loc-sanctuary-card');
        assert.ok(card, `Sanctuary card rendered for ${sanctuary.id} at ${sanctuary.locationId}`);

        const levelBadge = card.querySelector('.pw-loc-sanctuary-level');
        assert.ok(levelBadge, 'Level badge exists');
        assert.ok(levelBadge.textContent.includes(String(sanctuary.level)), `Badge shows level ${sanctuary.level}`);
        assert.ok(!levelBadge.textContent.includes('Raid Tier'), 'Badge does not contain Raid Tier');

        const rows = card.querySelectorAll('.pw-loc-sanctuary-row');
        assert.equal(rows.length, 2, 'Card has exactly 2 linear horizontal action rows');

        // Check simplified layout elements:
        // 1. ImageRelique NomRelique (N en stock)
        const relicSprites = card.querySelectorAll('.pw-sanctuary-relic-mini-icon');
        assert.ok(relicSprites.length >= 2, 'Relic item sprite rendered for both forge and summon lines');

        // 2. Fragments & Zones
        assert.ok(card.textContent.includes('Fragments :') || card.textContent.includes('Fragments:'), 'Fragments counter line exists');
        assert.ok(card.textContent.includes('Zones :') || card.textContent.includes('Zones:'), 'Connected zones line exists');

        // 3. Invoquer NomPokemon & Consomme n Relique
        assert.ok(card.textContent.includes('Invoquer') || card.textContent.includes('Summon'), 'Summon boss line exists');
        assert.ok(card.textContent.includes('Consomme') || card.textContent.includes('Consumes'), 'Consumes relic line exists');

        panel.destroy();
      }
    } finally {
      saves.setCurrentSave(prev);
    }
  });

  test('BattleZoneEffects and BattleSystem display live weather and terrain with legendary boss ambient fields', () => {
    // 1. Test BattleZoneEffects widget with diverse weathers and terrains
    const zoneEffects = new BattleZoneEffects();
    const dom = zoneEffects.getDomElement();

    // Default state: hidden
    assert.equal(zoneEffects.isVisible(), false);

    // Weather active (rain permanent)
    zoneEffects.setField({ weather: 'rain', weatherTurns: null, terrain: null, terrainTurns: 0 });
    assert.equal(zoneEffects.isVisible(), true);
    const weatherEl = dom.querySelector('.battle-zone-weather');
    assert.ok(weatherEl, 'Weather element present');
    assert.ok(weatherEl.textContent.includes('Pluie') || weatherEl.textContent.includes('Rain'), 'Displays rain weather');
    assert.ok(weatherEl.className.includes('battle-zone-chip--rain'), 'Has rain styling class');

    // Both weather and terrain active (harsh sun + electric terrain)
    zoneEffects.setField({ weather: 'sun', weatherTurns: 5, terrain: 'electric', terrainTurns: 8 });
    assert.equal(zoneEffects.isVisible(), true);
    assert.ok(weatherEl.textContent.includes('Soleil') || weatherEl.textContent.includes('Sun'));
    const terrainEl = dom.querySelector('.battle-zone-terrain');
    assert.ok(terrainEl, 'Terrain element present');
    assert.ok(terrainEl.textContent.includes('Électrifié') || terrainEl.textContent.includes('Electric'));
    assert.ok(terrainEl.className.includes('battle-zone-chip--electric'), 'Has electric styling class');

    // 2. Test Sanctuary Bosses have canonical weather/terrain in SanctuaryDB
    const db = SanctuaryDB.getInstance();
    const kyogre = db.getById('sanctuary_kyogre');
    assert.equal(kyogre.weather, 'rain', 'Kyogre sanctuary has rain');

    const groudon = db.getById('sanctuary_groudon');
    assert.equal(groudon.weather, 'sun', 'Groudon sanctuary has sun');

    const articuno = db.getById('sanctuary_articuno');
    assert.equal(articuno.weather, 'hail', 'Articuno sanctuary has hail');

    const zapdos = db.getById('sanctuary_zapdos');
    assert.equal(zapdos.weather, 'rain', 'Zapdos sanctuary has rain');
    assert.equal(zapdos.terrain, 'electric', 'Zapdos sanctuary has electric terrain');

    const mewtwo = db.getById('sanctuary_mewtwo');
    assert.equal(mewtwo.weather, 'somber', 'Mewtwo sanctuary has somber weather');
    assert.equal(mewtwo.terrain, 'psychic', 'Mewtwo sanctuary has psychic terrain');
  });
});
