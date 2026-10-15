import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENT_FAMILIES,
  ACHIEVEMENTS,
  getAchievementDef,
  getAchievementsByFamily,
  countTotalTiers,
} from '../src/data/achievements-data.js';
import {
  ensureAchievementsState,
  getAchievementMetricValue,
  getAchievementProgress,
  checkAchievements,
  recalculateAllAchievements,
  getAchievementBonus,
  countUnlockedAchievements,
} from '../src/application/achievements.js';
import { guideSections } from '../src/ui/game/guide-sections.js';

test('ACH-02 — all 15 families (A through O) are defined', () => {
  const expectedFamilies = [
    'pokedex', 'shiny', 'combat', 'capture', 'routes',
    'rematches', 'exploration', 'hatchery', 'training', 'mine',
    'economy', 'atoll', 'base', 'easter_eggs', 'forms'
  ];
  for (const fam of expectedFamilies) {
    assert.ok(ACHIEVEMENT_FAMILIES[fam], `Family ${fam} must be present`);
    assert.ok(ACHIEVEMENT_FAMILIES[fam].name_fr, `Family ${fam} must have French name`);
    assert.ok(ACHIEVEMENT_FAMILIES[fam].name_en, `Family ${fam} must have English name`);
  }
  assert.equal(Object.keys(ACHIEVEMENT_FAMILIES).length, 15, 'Exactly 15 families');
});

test('ACH-02 — achievement definitions cover > 70 achievements and > 200 tiers', () => {
  assert.ok(ACHIEVEMENTS.length >= 74, `Must have >= 74 achievements (found ${ACHIEVEMENTS.length})`);
  assert.ok(countTotalTiers() >= 200, `Must have >= 200 tiers (found ${countTotalTiers()})`);

  for (const ach of ACHIEVEMENTS) {
    assert.ok(ach.id, 'Achievement must have id');
    assert.ok(ach.family && ACHIEVEMENT_FAMILIES[ach.family], `Valid family for ${ach.id}`);
    assert.ok(ach.name_fr && ach.name_en, `Names in fr/en for ${ach.id}`);
    assert.ok(ach.desc_fr && ach.desc_en, `Descriptions in fr/en for ${ach.id}`);
    assert.ok(Array.isArray(ach.tiers) && ach.tiers.length > 0, `Tiers array for ${ach.id}`);
    assert.ok(ach.scope, `Scope for ${ach.id}`);
  }
});

test('ACH-01 — achievement state initialisation and metric calculations', () => {
  const dummyG = {
    pokedex: {
      1: { caught: true },
      4: { caught: true },
      152: { caught: true },
      252: { caught: true },
      144: { caught: true }, // Articuno
    },
    badges: ['boulder', 'cascade', 'thunder'],
    visitedMaps: { pallet: true, viridian: true, pewter: true },
    money: 50000,
  };

  ensureAchievementsState(dummyG);
  assert.ok(dummyG.achievements.unlockedTiers, 'unlockedTiers object exists');

  assert.equal(getAchievementMetricValue('dex_kanto', dummyG), 3, 'Bulbasaur + Charmander + Articuno');
  assert.equal(getAchievementMetricValue('dex_johto', dummyG), 1, 'Chikorita');
  assert.equal(getAchievementMetricValue('dex_hoenn', dummyG), 1, 'Treecko');
  assert.equal(getAchievementMetricValue('dex_national', dummyG), 5);
  assert.equal(getAchievementMetricValue('dex_legendaries', dummyG), 1, 'Articuno is legendary');
  assert.equal(getAchievementMetricValue('champions_beaten', dummyG), 3);
  assert.equal(getAchievementMetricValue('locations_visited', dummyG), 3);
});

test('ACH-01 — retroactive tier unlocks and progress tracking', () => {
  const G = {
    pokedex: {},
    badges: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'],
  };
  // 50 Kanto pokemon
  for (let i = 1; i <= 50; i++) G.pokedex[i] = { caught: true };

  ensureAchievementsState(G);
  assert.equal(G.achievements.unlockedTiers['dex_kanto'], undefined);

  const progBefore = getAchievementProgress('dex_kanto', G);
  assert.equal(progBefore.metricValue, 50);
  assert.equal(progBefore.nextTarget, 100);

  const unlocked = recalculateAllAchievements(G);
  assert.ok(unlocked.length > 0, 'Should unlock tiers retroactively');

  const progAfter = getAchievementProgress('dex_kanto', G);
  assert.equal(progAfter.metricValue, 50);
  assert.equal(progAfter.currentTier, 1, 'Tiers 0 (25) and 1 (50) unlocked');
  assert.equal(progAfter.nextTarget, 100);
  assert.equal(progAfter.isCompleted, false);

  const stats = countUnlockedAchievements(G);
  assert.ok(stats.totalTiers > 0);
});

test('ACH-01 / anti-inflation — multipliers calculation and strict caps', () => {
  const G = {
    achievements: {
      unlockedTiers: {
        dex_kanto: 3, // +15% Kanto money
        dex_johto: 3, // +15% Johto money
        dex_national: 3, // +5 pt loot
        shiny_captured: 6, // x1.15 shiny rate
        wild_wins: 3, // +10% XP
        total_captures: 3, // +2.0 pt capture
      },
    },
  };

  const kantoMoney = getAchievementBonus('money', 'region:kanto', G);
  assert.equal(kantoMoney, 15, '15% regional money in Kanto');

  const johtoMoney = getAchievementBonus('money', 'region:johto', G);
  assert.equal(johtoMoney, 15, '15% regional money in Johto');

  const xpBonus = getAchievementBonus('xp', 'global', G);
  assert.equal(xpBonus, 10, '10% global XP');

  const catchBonus = getAchievementBonus('capture', 'global', G);
  assert.equal(catchBonus, 2.0, '+2.0 pt capture bonus');

  // Verify caps cannot be exceeded
  G.achievements.unlockedTiers['total_captures'] = 3;
  G.achievements.unlockedTiers['afk_captures'] = 2;
  G.achievements.unlockedTiers['roamer_captured'] = 1;
  const totalCatch = getAchievementBonus('capture', 'global', G);
  assert.ok(totalCatch <= 4.5, `Capture bonus must be capped at 4.5 pt (got ${totalCatch})`);
});

import { L_fr_ui } from '../src/localization/fr/ui.js';

test('HLP-ach — in-game guide includes achievements section', () => {
  globalThis.t = (k) => L_fr_ui[k] || k;
  globalThis.tr = (k, v) => L_fr_ui[k] || k;
  globalThis.G = globalThis.G || { badges: [], unlockedLocs: {} };
  const sections = guideSections();
  assert.ok(sections.achievements, 'achievements guide section must exist');
  assert.ok(sections.achievements.pages.length >= 4, 'Must have at least 4 guide pages');
  const allText = sections.achievements.pages.map((p) => p.join(' ')).join(' ');
  assert.ok(/rétroactif|retroactive/i.test(allText), 'Must explain retroactivity');
  assert.ok(/bonus|portée|scope/i.test(allText), 'Must explain bonus scopes');
  assert.ok(/inflation|plafond|cap/i.test(allText), 'Must explain anti-inflation safeguards');
});
