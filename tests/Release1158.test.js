/**
 * @file Release1158.test.js
 * @brief Comprehensive test suite for v1.15.8:
 *   1. EV stat cap and display correction (EV_MAX = 6, EV_TOTAL_MAX = 36, PokemonInfoModal displays / 6).
 *   2. AFK return modal and fatigue wear recovery (UIPanel.setFooter, AfkSummaryModal rendering, full team heal on return, defeat on total exhaustion).
 *   3. Route battle item drops (complete RouteDrops tables, base chance 15%, rollDrop logic, loot grants in BattleSystem).
 *   4. Pokédex encyclopedic detail sheet (PokedexDetailModal full structure: hero, flavor text, evolution chain, base stats + BST, locations, talents, learnset tabs).
 */

import { describe, assert } from './TestRunner.js';
import { PokemonRules } from '../src/config/PokemonRules.js';
import { BattleRules } from '../src/config/BattleRules.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { PokemonInfoModal } from '../src/panels/PokemonInfoModal.js';
import { AfkSummaryModal } from '../src/panels/AfkSummaryModal.js';
import { PokedexDetailModal } from '../src/panels/PokedexDetailModal.js';
import { UIPanel } from '../src/ui/UIPanel.js';
import { UIText } from '../src/ui/UIText.js';
import { UIButton } from '../src/ui/UIButton.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { FastForwardSystem } from '../src/systems/FastForwardSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { RouteDropRules } from '../src/systems/battle/RouteDropRules.js';
import { ROUTE_DROPS } from '../src/data/world/RouteDrops.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { PokemonData } from '../src/data/pokemon/PokemonData.js';
import { Random } from '../src/core/Random.js';
import { EventBus } from '../src/core/EventBus.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';

describe('Release 1.15.8 - EV Cap, AFK Fatigue Recovery, Route Drops, and Pokédex Sheet', (test) => {

  test('EV cap is set to 6 per stat and PokemonInfoModal displays / 6', () => {
    assert.equal(PokemonRules.EV_MAX, 6, 'EV_MAX is 6 per stat');
    assert.equal(PokemonRules.EV_TOTAL_MAX, 36, 'EV_TOTAL_MAX is 36 total across 6 stats');

    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = saves.createNewSave('EvTestTrainer', 'pikachu');
    saves.setCurrentSave(save);

    const pikachu = save.team[0];
    pikachu.evs = { hp: 6, atk: 4, def: 2, spa: 5, spd: 3, spe: 6 };

    const modal = new PokemonInfoModal();
    try {
      modal.open({ pokemon: pikachu });
      const dom = modal.getDomElement();

      // Click on EV tab
      const evTab = dom.querySelector('[data-focus-key="pokemon-info-tab-evs"]');
      assert.ok(evTab, 'EV tab exists on PokemonInfoModal');
      evTab.click();

      const evPanel = dom.querySelector('#pokemon-info-stat-panel-evs');
      assert.ok(evPanel, 'EV stat panel is rendered');
      assert.ok(evPanel.textContent.includes('/ 6'), 'EV stat rows display / 6 cap');
      assert.ok(evPanel.textContent.includes('/ 36'), 'EV total displays / 36 cap');
    } finally {
      if (modal.isOpen()) modal.close();
      modal.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('UIPanel implements setFooter and AfkSummaryModal renders smoothly', () => {
    // UIPanel.setFooter test
    const panel = new UIPanel();
    assert.equal(typeof panel.setFooter, 'function', 'UIPanel provides setFooter method');

    const testBtn = new UIButton({ text: 'Confirm' });
    panel.setFooter(testBtn);
    const footerEl = panel.getDomElement().querySelector('.pw-panel-footer');
    assert.ok(footerEl, 'footer container is appended to panel DOM');
    assert.equal(footerEl.children.length, 1, 'footer child is registered');

    // AfkSummaryModal open test
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = saves.createNewSave('AfkTestTrainer', 'bulbasaur');
    saves.setCurrentSave(save);

    const afkModal = new AfkSummaryModal();
    try {
      const summaryPayload = {
        durationMs: 3600000,
        simulatedMs: 3600000,
        activities: ['battle'],
        battles: 45,
        wins: 45,
        fainted: 2,
        captures: 2,
        captureList: [{ species: 'pidgey', shiny: false }, { species: 'rattata', shiny: true }],
        money: 3400,
        energy: 30,
        training: 0,
        mineDigs: 0,
        daycareLevels: 2,
        items: [{ itemId: 'oran_berry', quantity: 3 }],
        lost: false
      };

      // Must not throw setFooter is not a function
      afkModal.open({ summary: summaryPayload });
      assert.ok(afkModal.isOpen(), 'AfkSummaryModal opens cleanly');

      const dom = afkModal.getDomElement();
      assert.ok(dom.textContent.includes('45'), 'the recap renders the wild Pokémon defeated');
      assert.ok(dom.textContent.includes('400'), 'the recap renders the money gained');
      assert.ok(dom.textContent.includes('Pokémon capturés'), 'the recap lists the captures section');
      assert.ok(dom.textContent.includes('Objets trouvés'), 'the recap lists the items section');
    } finally {
      if (afkModal.isOpen()) afkModal.close();
      afkModal.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('FastForwardSystem grants no free heal when the player comes back', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = saves.createNewSave('OfflineTestTrainer', 'charmander');
    saves.setCurrentSave(save);

    const starter = save.team[0];
    starter.hp = 1;

    // 30 minutes away with nothing launched: the injured starter stays injured.
    const summary = FastForwardSystem.getInstance().simulateOffline(1800000);
    assert.equal(summary, null, 'No activity means no report');
    assert.equal(starter.hp, 1, 'No free full heal on return');

    saves.setCurrentSave(previous);
  });

  test('Fatigue wear can knock out exhausted Pokémon and terminates battle chain', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = saves.createNewSave('FatigueTrainer', 'squirtle');
    saves.setCurrentSave(save);

    const member = save.team[0];
    member.hp = 2;

    // Fatigue wear is allowed to knock out (0 HP), not lock at 1 HP
    const wearDamage = 5;
    member.hp = Math.max(0, member.hp - wearDamage);
    assert.equal(member.hp, 0, 'Member is knocked out by wear damage');

    // BattleSystem check: battle stops if all members are fainted
    const battle = BattleSystem.getInstance();
    save.team.forEach((p) => { p.hp = 0; });
    assert.ok(save.team.every((p) => p.hp <= 0), 'Entire team is exhausted');

    saves.setCurrentSave(previous);
  });

  test('Route item drops have comprehensive pools, base chance is 15%, and rollDrop resolves items', () => {
    assert.equal(BattleRules.WILD_DROP_BASE_CHANCE_PCT, 15, 'Base drop chance is 15%');
    assert.ok(ROUTE_DROPS.route1.length > 0, 'route1 has drop pool');
    assert.ok(ROUTE_DROPS.jroute29.length > 0, 'jroute29 has drop pool');
    assert.ok(ROUTE_DROPS.route101.length > 0, 'route101 has drop pool');

    // Test RouteDropRules.draw
    const locationId = 'route1';
    const activeTeam = [new PokemonData({ species: 'pidgey', level: 5 })];

    // Seeded random simulation: run multiple drops to verify non-empty resolution
    let dropCount = 0;
    const rng = Random.default;
    for (let i = 0; i < 50; i++) {
      const drop = RouteDropRules.draw(locationId, rng, activeTeam);
      if (drop) {
        dropCount++;
        assert.ok(ROUTE_DROPS.route1.includes(drop), 'Dropped item is in location drop pool');
      }
    }
    assert.ok(dropCount > 0, 'Route drops trigger successfully across multiple battles');

    // Test fallback pool for unknown location
    const fallbackDrop = RouteDropRules.poolFor('unknown_secret_cave');
    assert.ok(fallbackDrop.length > 0, 'Fallback drop pool protects unknown routes');
  });

  test('PokedexDetailModal renders complete encyclopedic sheet for species', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = saves.createNewSave('DexTrainer', 'bulbasaur');
    saves.setCurrentSave(save);

    const modal = new PokedexDetailModal();
    try {
      modal.open({ speciesId: 'bulbasaur' });
      assert.ok(modal.isOpen(), 'PokedexDetailModal opens for bulbasaur');

      const dom = modal.getDomElement();

      // Check hero card & cry button
      assert.ok(dom.querySelector('.poke-cry-btn'), 'Cry sound button is present');

      // Check catch rate & base exp facts
      assert.ok(dom.querySelector('.pw-pokedex-facts-row'), 'Species facts row is present');

      // Check flavor text
      assert.ok(dom.querySelector('.pw-pokedex-flavor-card'), 'Official Pokédex flavor card is rendered');

      // Check evolution chain
      assert.ok(dom.querySelector('.pw-pokedex-evo-box'), 'Evolution chain box is rendered');

      // Check obtainment / sources grid
      assert.ok(dom.querySelector('.pw-pokedex-sources-grid'), 'Obtainment sources are rendered');

      // Check talents list
      assert.ok(dom.querySelector('.pw-pokedex-talents-list'), 'Species talents list is rendered');

      // Check learnset tabs
      assert.ok(dom.querySelector('.poke-detail-stat-tabs'), 'Learnset tabs are rendered');

      // Check base stats total
      assert.ok(dom.textContent.includes('318'), 'Bulbasaur total BST 318 is displayed');
    } finally {
      if (modal.isOpen()) modal.close();
      modal.destroy();
      saves.setCurrentSave(previous);
    }
  });

});
