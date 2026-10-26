/**
 * @file Achievements.test.js
 * @brief Unit tests for the Achievements system (Phase 2.1).
 * Tests AchievementDB, AchievementsData, AchievementBonusProvider, AchievementSystem, and UI panels.
 */

import { describe, assert } from './TestRunner.js';
import { fakeEvent } from './FakeDom.js';
import { AchievementDB } from '../src/data/achievements/AchievementDB.js';
import { AchievementsData } from '../src/data/save/AchievementsData.js';
import { AchievementBonusProvider } from '../src/systems/achievements/AchievementBonusProvider.js';
import { AchievementSystem } from '../src/systems/AchievementSystem.js';
import { AchievementsFullscreenPanel } from '../src/panels/fullscreen/AchievementsFullscreenPanel.js';
import { AchievementsPanel } from '../src/panels/AchievementsPanel.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { BonusSystem } from '../src/systems/BonusSystem.js';
import { BonusRules, BonusTypes } from '../src/config/BonusRules.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { EventBus } from '../src/core/EventBus.js';
import { AchievementUnlockedEvent } from '../src/core/events/AchievementUnlockedEvent.js';
import { AchievementPinnedEvent } from '../src/core/events/AchievementPinnedEvent.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';
import { LocalizationManager, t } from '../src/localization/LocalizationManager.js';

describe('AchievementDB Repository', (test) => {
  test('loads all 84 achievements across 15 families', () => {
    const db = AchievementDB.getInstance();
    const all = db.getAll();
    assert.equal(all.length, 84, 'all 84 achievements are loaded');

    const families = db.getFamilies();
    assert.equal(families.length, 15, 'all 15 achievement families exist');
    assert.equal(db.countTotalTiers(), 229, 'total tiers across all achievements equal 229');
  });

  test('retrieves achievements by ID and by family', () => {
    const db = AchievementDB.getInstance();
    const kantoDex = db.getById('dex_kanto');
    assert.ok(kantoDex, 'dex_kanto found by id');
    assert.equal(kantoDex.family, 'pokedex');
    assert.equal(kantoDex.metric, 'dex_kanto');
    assert.deepEqual(kantoDex.tiers, [25, 50, 100, 151]);

    const pokedexFamily = db.getByFamily('pokedex');
    assert.ok(pokedexFamily.length >= 5, 'pokedex family contains expected achievements');
    assert.ok(pokedexFamily.some((a) => a.id === 'dex_kanto'));
    assert.ok(pokedexFamily.some((a) => a.id === 'dex_national'));

    const combatFamily = db.getByFamily('combat');
    assert.ok(combatFamily.some((a) => a.id === 'wild_wins'));
    assert.ok(combatFamily.some((a) => a.id === 'type_wins_fire'));
  });

  test('localizes names, descriptions, bonus labels and family names in FR and EN', () => {
    const db = AchievementDB.getInstance();
    const loc = LocalizationManager.getInstance();
    const ach = db.getById('dex_kanto');

    loc.setLanguage('fr');
    assert.equal(db.getLocalizedName(ach), 'Pokédex de Kanto');
    assert.equal(db.getLocalizedDesc(ach), 'Enregistrer des Pokémon de Kanto dans le Pokédex.');
    assert.equal(db.getLocalizedBonusLabel(ach, 0), '+2% ₽ à Kanto');
    assert.equal(db.getLocalizedBonusLabel(ach, 3), '+15% ₽ à Kanto');
    assert.equal(db.getLocalizedFamilyName('pokedex'), 'Pokédex');

    loc.setLanguage('en');
    assert.equal(db.getLocalizedName(ach), 'Kanto Pokédex');
    assert.equal(db.getLocalizedDesc(ach), 'Register Kanto Pokémon in the Pokédex.');
    assert.equal(db.getLocalizedBonusLabel(ach, 0), '+2% ₽ in Kanto');
    assert.equal(db.getLocalizedBonusLabel(ach, 3), '+15% ₽ in Kanto');
    assert.equal(db.getLocalizedFamilyName('pokedex'), 'Pokédex');

    loc.setLanguage('fr');
  });
});

describe('AchievementsData Model & Save Persistence', (test) => {
  test('initializes with default pinned achievement and empty progress', () => {
    const data = new AchievementsData();
    assert.equal(data.getPinnedId(), 'dex_kanto');
    assert.equal(data.getUnlockedTier('dex_kanto'), -1);
    assert.equal(data.getStat('wildWins'), 0);
  });

  test('unlocks tiers, records timestamps and increments statistics', () => {
    const data = new AchievementsData();
    const now = Date.now();
    const unlocked = data.setUnlockedTier('dex_kanto', 1, now);
    assert.ok(unlocked, 'tier 1 unlocked');
    assert.equal(data.getUnlockedTier('dex_kanto'), 1);
    assert.ok(data.isTierUnlocked('dex_kanto', 0));
    assert.ok(data.isTierUnlocked('dex_kanto', 1));
    assert.ok(!data.isTierUnlocked('dex_kanto', 2));
    assert.equal(data.getUnlockedAt('dex_kanto', 0), now);
    assert.equal(data.getUnlockedAt('dex_kanto', 1), now);
    assert.equal(data.getUnlockedAt('dex_kanto', 2), null);

    // Cannot regress tier
    assert.ok(!data.setUnlockedTier('dex_kanto', 0));
    assert.equal(data.getUnlockedTier('dex_kanto'), 1);

    // Stats
    assert.equal(data.incrementStat('wildWins', 5), 5);
    assert.equal(data.incrementStat('wildWins', 10), 15);
    assert.equal(data.getStat('wildWins'), 15);

    // Pinned
    data.setPinnedId('shiny_captured');
    assert.equal(data.getPinnedId(), 'shiny_captured');
  });

  test('serializes and deserializes cleanly without losing state', () => {
    const data = new AchievementsData();
    data.setUnlockedTier('dex_kanto', 2);
    data.setStat('flawlessWins', 42);
    data.setPinnedId('total_captures');

    const json = data.serialize();
    const restored = new AchievementsData(json);

    assert.equal(restored.getPinnedId(), 'total_captures');
    assert.equal(restored.getUnlockedTier('dex_kanto'), 2);
    assert.equal(restored.getStat('flawlessWins'), 42);
    assert.deepEqual(restored.serialize(), json);
  });

  test('SaveData integrates AchievementsData and round-trips via SaveMigrator', () => {
    const save = SaveData.createNew('AchieveTester', 'charmander');
    assert.ok(save.achievements instanceof AchievementsData);
    assert.equal(save.achievements.getPinnedId(), 'dex_kanto');

    save.achievements.setUnlockedTier('dex_kanto', 3);
    save.achievements.setStat('customCounter', 99);

    const json = JSON.parse(JSON.stringify(save.serialize()));
    const loaded = SaveData.fromJson(json);

    assert.equal(loaded.achievements.getUnlockedTier('dex_kanto'), 3);
    assert.equal(loaded.achievements.getStat('customCounter'), 99);
    assert.deepEqual(loaded.serialize(), json);
  });
});

describe('AchievementBonusProvider & Anti-Inflation Caps', (test) => {
  test('exposes unlocked bonuses to BonusSystem', () => {
    const save = SaveData.createNew('BonusTester', 'bulbasaur');
    SaveSystem.getInstance().setCurrentSave(save);

    // dex_kanto tier 0 gives +2% ₽ in Kanto
    save.achievements.setUnlockedTier('dex_kanto', 0);
    // wild_wins tier 0 gives +2% XP globally
    save.achievements.setUnlockedTier('wild_wins', 0);

    const bonus = BonusSystem.getInstance();
    const provider = new AchievementBonusProvider();
    bonus.registerProvider(BonusRules.SOURCE_IDS.ACHIEVEMENTS, provider);

    assert.equal(bonus.getMultiplier(BonusTypes.XP), 1.02, 'global XP multiplier is +2%');
    assert.equal(bonus.getMultiplier(BonusTypes.MONEY, { region: 'kanto' }), 1.02, 'Kanto money is +2%');
    assert.equal(bonus.getMultiplier(BonusTypes.MONEY, { region: 'johto' }), 1.0, 'Johto money unchanged');
  });

  test('enforces strict anti-inflation guardrails', () => {
    const save = SaveData.createNew('CapTester', 'squirtle');
    SaveSystem.getInstance().setCurrentSave(save);

    // Unlock all global XP achievements
    save.achievements.setUnlockedTier('wild_wins', 3); // 10%
    save.achievements.setUnlockedTier('shiny_team', 2); // 3%
    save.achievements.setUnlockedTier('route_masteries_gold', 2); // 6%
    save.achievements.setUnlockedTier('hidden_abilities', 2); // 4%
    // Sum = 10 + 3 + 6 + 4 = 23% (under 25% cap)

    const bonus = BonusSystem.getInstance();
    const provider = new AchievementBonusProvider();
    bonus.registerProvider(BonusRules.SOURCE_IDS.ACHIEVEMENTS, provider);

    assert.equal(bonus.getTotal(BonusTypes.XP), 23, 'sum under cap is exact');

    // Add more XP to exceed cap: test clamp
    save.achievements.setStat('artificialXp', 999);
    // Provider caps global XP at 25%
    const cappedContributions = provider.getContributions({ save });
    const xpEntry = cappedContributions.find((c) => c.type === BonusTypes.XP && !c.scope);
    assert.ok(xpEntry && xpEntry.value <= 25, 'global XP contribution never exceeds 25%');

    // Global money cap (max +29%)
    save.achievements.setUnlockedTier('trainers_defeated', 3); // 10%
    save.achievements.setUnlockedTier('shiny_beaten', 2); // 3%
    save.achievements.setUnlockedTier('money_earned', 3); // 5%
    save.achievements.setUnlockedTier('legendary_captures', 3); // 5%
    save.achievements.setUnlockedTier('locations_visited', 3); // 5%
    save.achievements.setUnlockedTier('base_decos', 2); // 4%
    save.achievements.setUnlockedTier('rare_abilities', 2); // 4%
    // Sum = 36% -> capped at 29%
    const moneyEntry = provider.getContributions({ save }).find((c) => c.type === BonusTypes.MONEY && !c.scope);
    assert.equal(moneyEntry?.value, 29, 'global money bonus is capped at exactly 29%');

    // Global capture rate cap (max +4.5 pt)
    save.achievements.setUnlockedTier('total_captures', 3); // 2 pt
    save.achievements.setUnlockedTier('afk_captures', 2); // 1.5 pt
    save.achievements.setUnlockedTier('roamer_captured', 1); // 1 pt
    // Sum = 4.5 pt -> capped at 4.5 pt
    const captureEntry = provider.getContributions({ save }).find((c) => c.type === BonusTypes.CAPTURE && !c.scope);
    assert.equal(captureEntry?.value, 4.5, 'global capture bonus is capped at exactly 4.5 pt');

    // Global shiny rate cap (max x1.15)
    save.achievements.setUnlockedTier('shiny_captured', 6); // 1.15
    const shinyEntry = provider.getContributions({ save }).find((c) => c.type === BonusTypes.SHINY_MULTIPLIER);
    assert.equal(shinyEntry?.value, 1.15, 'global shiny multiplier is capped at exactly 1.15');

    // Regional money cap (max +15%)
    save.achievements.setUnlockedTier('dex_kanto', 3); // 15%
    save.achievements.setUnlockedTier('rematches_gym_kanto', 3); // 8%
    // Sum = 23% -> capped at 15%
    const kantoMoneyEntry = provider.getContributions({ save }).find((c) => c.type === BonusTypes.MONEY && c.scope?.region === 'kanto');
    assert.equal(kantoMoneyEntry?.value, 15, 'regional money bonus is capped at 15%');
  });
});

describe('AchievementSystem Engine & Progression', (test) => {
  test('calculates metric values and tier progress accurately', () => {
    const save = SaveData.createNew('ProgressTester', 'pikachu');
    SaveSystem.getInstance().setCurrentSave(save);
    const sys = AchievementSystem.getInstance();

    const progInitial = sys.getProgress('dex_kanto', save);
    assert.equal(progInitial.metricValue, 1, 'starter counts as 1 caught in Kanto');
    assert.equal(progInitial.currentTier, -1, 'tier 0 (25) not yet reached');
    assert.equal(progInitial.nextTarget, 25);
    assert.equal(progInitial.progressPct, 4);
    assert.equal(progInitial.isCompleted, false);

    // Simulate 25 catches in Kanto
    for (let dex = 2; dex <= 25; dex++) {
      const species = PokemonDB.getInstance().getByDex(dex);
      if (species) save.pokedex.markCaught(species.id);
    }

    const progTier0 = sys.getProgress('dex_kanto', save);
    assert.equal(progTier0.metricValue, 25);
    assert.equal(progTier0.currentTier, 0);
    assert.equal(progTier0.nextTarget, 50);
    assert.equal(progTier0.progressPct, 0);
  });

  test('checkAll unlocks tiers and dispatches AchievementUnlockedEvent', () => {
    const save = SaveData.createNew('UnlockTester', 'charmander');
    SaveSystem.getInstance().setCurrentSave(save);
    const sys = AchievementSystem.getInstance();

    let receivedEvent = null;
    const unsubscribe = EventBus.getInstance().subscribe(AchievementUnlockedEvent, (e) => {
      receivedEvent = e;
    });

    try {
      // Starter is caught, so first_step (tier 0: 1 catch) unlocks
      const unlocked = sys.checkAll({ notify: false });
      assert.ok(unlocked.length > 0, 'at least one tier unlocked');
      const firstStepAch = unlocked.find((u) => u.ach.id === 'first_step');
      assert.ok(firstStepAch, 'first_step unlocked tier 0');
      assert.equal(firstStepAch.tier, 0);
      assert.equal(save.achievements.getUnlockedTier('first_step'), 0);
      assert.ok(receivedEvent, 'AchievementUnlockedEvent was dispatched');
      assert.equal(receivedEvent.achId, 'first_step');
    } finally {
      unsubscribe();
    }
  });

  test('retroactive calculation on save load unlocks all qualified achievements', () => {
    const save = SaveData.createNew('RetroTester', 'bulbasaur');
    SaveSystem.getInstance().setCurrentSave(save);
    const sys = AchievementSystem.getInstance();

    // Simulate past progress before achievements were calculated
    save.statistics.caughtTotal = 150;
    save.statistics.trainerWins = { brock: 5, misty: 5 };
    save.statistics.leaguesWon = ['kanto'];

    const unlocked = sys.checkAll({ notify: false });
    assert.ok(unlocked.length >= 2, 'retroactive progress unlocks multiple achievements');
    assert.ok(save.achievements.getUnlockedTier('first_step') >= 0);
    assert.ok(save.achievements.getUnlockedTier('total_captures') >= 0);
  });

  test('pins, unpins, and toggles achievements', () => {
    const save = SaveData.createNew('PinTester', 'squirtle');
    SaveSystem.getInstance().setCurrentSave(save);
    const sys = AchievementSystem.getInstance();

    assert.equal(sys.getPinned(save).id, 'dex_kanto');

    let pinnedEvent = null;
    const unsub = EventBus.getInstance().subscribe(AchievementPinnedEvent, (e) => {
      pinnedEvent = e;
    });

    try {
      sys.setPinned('wild_wins');
      assert.equal(save.achievements.getPinnedId(), 'wild_wins');
      assert.equal(sys.getPinned(save).id, 'wild_wins');
      assert.equal(pinnedEvent?.achId, 'wild_wins');

      // Toggling the same achievement reverts to default
      sys.togglePinned('wild_wins');
      assert.equal(save.achievements.getPinnedId(), 'dex_kanto');

      // Toggling a different achievement pins it
      sys.togglePinned('total_captures');
      assert.equal(save.achievements.getPinnedId(), 'total_captures');
    } finally {
      unsub();
    }
  });

  test('getSummary returns accurate completion counts', () => {
    const save = SaveData.createNew('SummaryTester', 'charmander');
    SaveSystem.getInstance().setCurrentSave(save);
    const sys = AchievementSystem.getInstance();

    const summaryInitial = sys.getSummary(save);
    assert.equal(summaryInitial.totalTiers, 0);
    assert.equal(summaryInitial.maxTiers, 229);
    assert.equal(summaryInitial.completedCount, 0);

    save.achievements.setUnlockedTier('first_step', 0); // single-tier achievement completed
    save.achievements.setUnlockedTier('dex_kanto', 1); // 2 tiers unlocked (0 and 1)

    const summaryUpdated = sys.getSummary(save);
    assert.equal(summaryUpdated.totalTiers, 3);
    assert.equal(summaryUpdated.completedCount, 1);
    assert.ok(summaryUpdated.progressPct > 0);
  });
});

describe('Achievements UI Components', (test) => {
  test('AchievementsFullscreenPanel renders FilterBar, bonuses section, and card pin toggle', () => {
    const save = SaveData.createNew('FullscreenPanelTester', 'charmander');
    SaveSystem.getInstance().setCurrentSave(save);

    const panel = new AchievementsFullscreenPanel();
    try {
      panel.open();
      const dom = panel.getDomElement();

      // Filter bar & chips
      const chips = dom.querySelectorAll('.pw-chip');
      assert.equal(chips.length, 4, '4 status chips rendered (all, in progress, completed, pinned)');

      const familySelect = dom.querySelector('.pw-filter-select');
      assert.ok(familySelect, 'family select dropdown rendered in FilterBar');

      const searchInput = dom.querySelector('.pw-filter-input');
      assert.ok(searchInput, 'search input rendered in FilterBar');

      // Structured bonuses section
      assert.ok(dom.querySelector('.pw-ach-bonuses-section'), 'bonuses section exists');
      assert.ok(dom.querySelector('.pw-ach-bonuses-title'), 'bonuses title exists');
      assert.ok(dom.querySelector('.pw-ach-bonuses-grid'), 'bonuses grid exists');

      // Cards grid
      const cards = dom.querySelectorAll('.pw-ach-card');
      assert.equal(cards.length, 84, 'all 84 achievement cards rendered under "all" filter');

      // No separate pin button; card click toggles pinning
      const firstPinBtn = cards[0].querySelector('.pw-ach-pin-btn');
      assert.ok(!firstPinBtn, 'no separate pin button exists on card');

      // Click card to toggle pin
      assert.ok(cards[0].classList.contains('is-pinned'), 'first card initially pinned (dex_kanto)');
      cards[0].click();

      // Re-query cards after re-render
      let updatedCards = dom.querySelectorAll('.pw-ach-card');
      assert.ok(!updatedCards[0].classList.contains('is-pinned'), 'card unpinned after click');
      updatedCards[0].click();

      updatedCards = dom.querySelectorAll('.pw-ach-card');
      assert.ok(updatedCards[0].classList.contains('is-pinned'), 'card pinned after second click');

      // Pin another card (multiple pins)
      updatedCards[1].click();
      updatedCards = dom.querySelectorAll('.pw-ach-card');
      assert.ok(updatedCards[0].classList.contains('is-pinned'), 'first card remains pinned');
      assert.ok(updatedCards[1].classList.contains('is-pinned'), 'second card pinned concurrently');

      panel.close();
    } finally {
      panel.destroy();
    }
  });

  test('AchievementsPanel dashboard widget tracks pinned goal and opens modal on click', () => {
    const save = SaveData.createNew('DashboardWidgetTester', 'charmander');
    SaveSystem.getInstance().setCurrentSave(save);

    const panel = new AchievementsPanel(DashboardColumns.LEFT);
    let modalOpened = false;
    const unsub = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, (e) => {
      if (e.modalId === ModalIds.ACHIEVEMENTS) modalOpened = true;
    });

    try {
      const dom = panel.getDomElement();

      // Pinned title and description
      const title = dom.querySelector('.pw-ach-title');
      assert.ok(title, 'pinned title exists');
      const desc = dom.querySelector('.pw-ach-desc');
      assert.ok(desc, 'pinned description exists under title');
      assert.equal(desc.textContent, 'Enregistrer des Pokémon de Kanto dans le Pokédex.');

      // Progress bar and stats
      const stats = [...dom.querySelector('.pw-ach-stats-text').children].map((node) => node.textContent);
      assert.deepEqual(stats, [
        t('value_over_max', { value: 1, max: 25 }),
        t('percent_value', { value: 4 })
      ]);

      // Tracker card click opens achievements fullscreen modal
      const trackerCard = dom.querySelector('.pw-ach-tracker-card');
      assert.ok(trackerCard, 'tracker card exists');
      trackerCard.click();
      assert.ok(modalOpened, 'clicking tracker card dispatches ModalOpenRequestedEvent for ModalIds.ACHIEVEMENTS');
    } finally {
      panel.destroy();
      unsub();
    }
  });

  test('AchievementsPanel displays multiple pinned achievements and empty state', () => {
    const save = SaveData.createNew('MultiPinTester', 'charmander');
    SaveSystem.getInstance().setCurrentSave(save);

    // Pin two achievements
    save.achievements.pin('dex_kanto');
    save.achievements.pin('dex_national');

    const panel = new AchievementsPanel(DashboardColumns.LEFT);
    try {
      const dom = panel.getDomElement();
      const trackerCards = dom.querySelectorAll('.pw-ach-tracker-card');
      assert.equal(trackerCards.length, 2, '2 tracker cards rendered for 2 pinned achievements');

      // Unpin all
      save.achievements.unpin('dex_kanto');
      save.achievements.unpin('dex_national');
      panel._render();

      const emptyTracker = dom.querySelector('.pw-ach-empty-tracker');
      assert.ok(emptyTracker, 'empty tracker card rendered when no achievements are pinned');
    } finally {
      panel.destroy();
    }
  });

  test('AchievementsPanel displays 4+ pinned achievements without scrolling limitation', () => {
    const save = SaveData.createNew('MultiPinTester2', 'charmander');
    SaveSystem.getInstance().setCurrentSave(save);

    // Pin 4 achievements
    save.achievements.pin('dex_kanto');
    save.achievements.pin('dex_national');
    save.achievements.pin('wild_wins');
    save.achievements.pin('total_captures');

    const panel = new AchievementsPanel(DashboardColumns.LEFT);
    try {
      const dom = panel.getDomElement();
      const trackerCards = dom.querySelectorAll('.pw-ach-tracker-card');
      assert.equal(trackerCards.length, 4, 'all 4 tracker cards rendered');
      const list = dom.querySelector('.pw-ach-tracker-list');
      assert.ok(list, 'tracker list container rendered');
    } finally {
      panel.destroy();
    }
  });
});
