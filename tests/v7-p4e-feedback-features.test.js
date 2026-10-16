import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('P4e-01 · Map Zoom : boutons (+, −, ⟲), molette de souris et fonctions exportées', () => {
  const mapRenderSrc = R('src/ui/game/map-render.js');
  assert.match(mapRenderSrc, /ensureMapZoomControls/, 'fonction ensureMapZoomControls définie');
  assert.match(mapRenderSrc, /pw-map-zoom-controls/, 'conteneur de contrôles de zoom présent');
  assert.match(mapRenderSrc, /pw-map-zoom-in/, 'bouton zoom in présent');
  assert.match(mapRenderSrc, /pw-map-zoom-out/, 'bouton zoom out présent');
  assert.match(mapRenderSrc, /pw-map-zoom-reset/, 'bouton reset zoom présent');
  assert.match(mapRenderSrc, /addEventListener\(\s*['"]wheel['"]/, 'écouteur de molette wheel configuré');
  assert.match(mapRenderSrc, /function mapZoomIn/, 'fonction mapZoomIn présente');
  assert.match(mapRenderSrc, /function mapZoomOut/, 'fonction mapZoomOut présente');
  assert.match(mapRenderSrc, /function mapZoomReset/, 'fonction mapZoomReset présente');

  const cssSrc = R('src/assets/styles/design-system.css');
  assert.match(cssSrc, /\.pw-map-zoom-controls/, 'styles .pw-map-zoom-controls déclarés');
  assert.match(cssSrc, /\.pw-map-zoom-btn/, 'styles .pw-map-zoom-btn déclarés');
});

test('P4e-02 · Choix de succès à épingler : bouton sur chaque carte et sélecteur dans le tracker HUD', () => {
  const achPanelSrc = R('src/ui/game/achievements-panel.js');
  assert.match(achPanelSrc, /pw-ach-pin-btn/, 'bouton d épinglage présent sur les cartes');
  assert.match(achPanelSrc, /togglePinAchievement/, 'fonction togglePinAchievement présente');
  assert.match(achPanelSrc, /setPinnedAchievement/, 'fonction setPinnedAchievement présente');
  assert.match(achPanelSrc, /pw-ach-pinned-select/, 'sélecteur dropdown présent dans le HUD tracker');
  assert.match(achPanelSrc, /📌/, 'indicateur visuel épinglé');

  const cssSrc = R('src/assets/styles/design-system.css');
  assert.match(cssSrc, /\.pw-ach-pin-btn/, 'styles .pw-ach-pin-btn déclarés');
});

test('P4e-03 · Comptage précis des métriques de succès (shineys, IV, EV, donjons, pension, mine)', async () => {
  const { ensureAchievementsState, getAchievementMetricValue } = await import(
    '../src/application/achievements.js'
  );

  const testG = {
    pokedex: {
      1: { seen: true, caught: true, beaten: 10, shinyBeaten: 3, hatcheryIncub: 5 },
      4: { seen: true, caught: true, beaten: 20, shinyHatched: 2 },
    },
    team: [
      { id: 1, name: 'Bulb', ivs: { hp: 12, atk: 12, def: 12, spa: 12, spd: 12, spe: 12 }, evs: { hp: 252, atk: 252, def: 6, spa: 0, spd: 0, spe: 0 } },
      { id: 4, name: 'Char', ivs: { hp: 5, atk: 5, def: 5, spa: 5, spd: 5, spe: 5 } },
    ],
    collection: {},
    dungeonClears: { viridian_forest: 4, mt_moon: 6 },
    inventory: { helix_fossil: 2, dome_fossil: 1, fire_stone: 3 },
    defeatedChamps: { brock: true, misty: true, surge: true },
    staff: { level: { manager_goldenrod: 5, miner_mahogany: 3 } },
    achievements: { stats: {} },
  };

  ensureAchievementsState(testG);

  assert.equal(getAchievementMetricValue('shiny_beaten', testG), 3, '3 shineys battus comptés depuis pokedex');
  assert.equal(getAchievementMetricValue('shiny_hatched', testG), 2, '2 shineys éclos comptés depuis pokedex');
  assert.equal(getAchievementMetricValue('eggs_hatched', testG), 5, '5 œufs éclos comptés');
  assert.equal(getAchievementMetricValue('max_iv_pokemon', testG), 1, '1 pokemon IV max (72 IV)');
  assert.equal(getAchievementMetricValue('twelve_iv_stat', testG), 1, '1 pokemon avec stat à 12 IV');
  assert.equal(getAchievementMetricValue('max_ev_pokemon', testG), 1, '1 pokemon EV max (510 EV)');
  assert.equal(getAchievementMetricValue('dungeons_completed', testG), 10, '10 donjons terminés (4 + 6)');
  assert.equal(getAchievementMetricValue('mine_fossils', testG), 3, '3 fossiles dans l inventaire');
  assert.equal(getAchievementMetricValue('mine_evo_items', testG), 3, '3 pierres d évolution dans l inventaire');
  assert.equal(getAchievementMetricValue('trainers_defeated', testG), 3, '3 champions / dresseurs battus');
  assert.equal(getAchievementMetricValue('max_level_staff', testG), 5, 'niveau max de staff 5');
});

test('P4e-04 · Bonus effectifs des succès : Butin de combat et Chance shiny branchés sans fuite de scope', async () => {
  const battleStatusSrc = R('src/application/combat/battle-status.js');
  assert.match(battleStatusSrc, /_achDropBonus/, 'bonus de butin des succes pris en compte');
  assert.match(battleStatusSrc, /getAchievementBonus\(['"]loot['"]/, 'appel de getAchievementBonus(loot) dans battle-status');

  const collSrc = R('src/application/world/collection.js');
  assert.match(collSrc, /getAchievementBonus/, 'getAchievementBonus présent dans collection.js');
  assert.match(collSrc, /achFn\(['"]shiny['"]/, 'multiplicateur shiny des succes appliqué aux taux de rencontre');

  const { getAchievementBonus } = await import('../src/application/achievements.js');
  const dummyG = {
    achievements: {
      unlockedTiers: {
        dex_kanto: 2, // 10% Kanto money (scope region:kanto)
        shiny_beaten: 1, // 2% global battle money (scope global)
      },
    },
  };

  const regionalKanto = getAchievementBonus('money', 'region:kanto', dummyG);
  const globalMoney = getAchievementBonus('money', 'global', dummyG);
  const allMoney = getAchievementBonus('money', 'all', dummyG);

  assert.equal(regionalKanto, 10, 'seul le bonus régional Kanto est renvoyé avec scope region:kanto');
  assert.equal(globalMoney, 2, 'seul le bonus global est renvoyé avec scope global');
  assert.equal(allMoney, 12, 'tous les bonus de monnaie sont cumulés avec scope all');
});
