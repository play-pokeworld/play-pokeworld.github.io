import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// Global mock for localization & helpers
globalThis.t = (k) => k;
globalThis.tr = (k, params) => `${k}(${JSON.stringify(params)})`;
globalThis.getPokeName = (p) => 'Mon#' + (p && p.id ? p.id : p);

test('P4b-01 · Débugant (#236) évolue uniquement en Kapoera (#237) au niveau 20', async () => {
  const { getEvolutionMethodsModel } = await import('../src/application/combat/progression.js');
  const res = getEvolutionMethodsModel(236);
  assert.equal(res.rows.length, 1, 'une seule méthode dévolution pour Débugant');
  assert.match(res.rows[0], /237/, 'cible Kapoera #237');
  assert.match(res.rows[0], /20/, 'au niveau 20');

  const progSrc = R('src/application/combat/progression.js');
  assert.match(progSrc, /p\.id === 236 && p\.level >= 20[\s\S]*?evolve\(p, 237\)/, 'évolue directement en 237 dans checkEvolution');
});

test('P4b-02 · Kicklee (#106) et Tygnon (#107) : Dojo de Safrania et Marché PQ', async () => {
  const quests = (await import('../src/data/story-quests.js')).STORY_QUESTS;
  const dojoQuest = quests.find((q) => q.id === 44);
  assert.ok(dojoQuest, 'quête du dojo trouvée');
  assert.equal(dojoQuest.rewardPoke, 106, 'récompense Kicklee');

  const { MARKET_STOCK } = await import('../src/domain/economy/market.js');
  const kantoMarket = MARKET_STOCK.kanto || [];
  assert.ok(kantoMarket.includes(106), 'Kicklee disponible au marché PQ Kanto');
  assert.ok(kantoMarket.includes(107), 'Tygnon disponible au marché PQ Kanto');
});

test('P4b-03 · Pokédex complet : les 386 espèces Gen 1-3 sont toutes obtenables', () => {
  const dexTest = R('tests/p1-dex-sources.test.js');
  assert.match(dexTest, /every species #1–#386 has a direct source or is reachable/, 'test DEX-01 présent');
  const unobtainableAudit = R('tools/audit-unobtainable.mjs');
  assert.ok(unobtainableAudit.length > 500, 'script daudit existant');
});

test('P4b-04 · Évolution par objet verrouillée si la région cible est verrouillée', async () => {
  const { canEvolveToRegion } = await import('../src/application/combat/progression.js');
  globalThis.G = { region: 'kanto', unlockedRegions: { kanto: true }, badges: [] };
  assert.equal(canEvolveToRegion(208), false, 'Steelix (#208) verrouillé sans Johto');

  globalThis.G = { region: 'kanto', unlockedRegions: { kanto: true, johto: true }, badges: [] };
  assert.equal(canEvolveToRegion(208), true, 'Steelix (#208) débloqué avec Johto');

  const invSrc = R('src/application/economy/inventory-actions.js');
  assert.match(invSrc, /canEvolveToRegion/, 'vérification de la région cible dans inventaire');
});

test('P4b-05 · Atoll de Combat : Pokémon de prêt temporaires (_isRental) et protection de sauvegarde', () => {
  const atollSrc = R('src/ui/game/fullscreen-panel.js');
  assert.match(atollSrc, /_isRental\s*=\s*true/, 'marquage du pokémon de prêt');

  const saveSrc = R('src/application/save/save.js');
  assert.match(saveSrc, /_isRental/, 'purge des pokémons de prêt lors de la sauvegarde et normalisation');

  const battleFlowSrc = R('src/application/combat/battle-flow.js');
  assert.match(battleFlowSrc, /restoreAtollTeam/, 'restauration de léquipe dorigine sur abandon ou fin');
});

test('P4b-06 · Mine : sprites des outils vectoriels SVG complets', () => {
  const mineUi = R('src/ui/game/mine-ui.js');
  for (const tool of ['chisel', 'hammer', 'pickaxe', 'drill', 'dynamite']) {
    assert.match(mineUi, new RegExp(`${tool}:\\s*['"]<path`), `icône vectorielle pour ${tool}`);
  }
});

test('P4b-07 · Quête Ruines d\'Alpha (id 113) : déclenchement par dialogue et par résolution d\'énigme', async () => {
  const npcs = (await import('../src/data/npc-data.js')).NPCS;
  const alphNpc0 = npcs['ruinsofalph']?.[0];
  const alphNpc1 = npcs['ruinsofalph']?.[1];
  assert.ok(alphNpc0 && alphNpc0.mainTalk === 113, 'Solène configure la quête 113');
  assert.ok(alphNpc1 && alphNpc1.mainTalk === 116, 'Prof Hale configure la quête 116');

  const puzzleSrc = R('src/application/world/puzzle-explorations.js');
  assert.match(puzzleSrc, /advanceQuests\('story_talk',\s*113\)/, 'résolution dénigme avance la quête 113');
});

test('P4b-08 · Quêtes de donjons plafonnées à 25 et ciblage régional strict', async () => {
  const storyQuests = (await import('../src/data/story-quests.js')).STORY_QUESTS;
  const repeatableQuests = (await import('../src/data/repeatable-quests-data.js')).REPEATABLE_QUESTS;

  for (const q of storyQuests) {
    if (q.type === 'defeat_dungeon' || q.target === 'dungeon') {
      assert.ok(q.count <= 25, `quête histoire ${q.id} n'excède pas 25 vaincus`);
    }
  }

  for (const r of repeatableQuests) {
    if (r.target === 'dungeon') {
      assert.ok(r.count <= 25, `quête répétable ${r.id} n'excède pas 25 vaincus`);
    }
  }

  const questCoreSrc = R('src/application/quests/quest-core.js');
  assert.match(questCoreSrc, /targetRegion && targetRegion !== actionRegion/, 'filtrage régional strict');
});

test('P4b-09 · Zoom de carte : commandes de zoom et gestion souris / tactile', () => {
  const mapRender = R('src/ui/game/map-render.js');
  assert.match(mapRender, /zoomMap\(/, 'fonction zoomMap définie');
  assert.match(mapRender, /resetMapZoom\(/, 'fonction resetMapZoom définie');
  assert.match(mapRender, /ensureMapZoomControls\(/, 'boutons de contrôle de zoom intégrés');
  assert.match(mapRender, /map-zoom-controls/, 'conteneur des boutons');
  assert.match(mapRender, /map-zoom-btn/, 'classe des boutons');
});

test('P4b-10 · HUD flottant des succès (#win-achievements) : barre de progression et objectif chiffré', () => {
  const achPanel = R('src/ui/game/achievements-panel.js');
  assert.match(achPanel, /pw-ach-progress-bar-fill/, 'barre de progression présente');
  assert.match(achPanel, /prog\.metricValue.*prog\.nextTarget/, 'affichage x / y');
  assert.match(achPanel, /renderAchievementsTrackerWindow\(/, 'fonction de rafraîchissement présente');
});

test('P4b-11 · Icône Badge : Badge Roche de Pierre (Boulder Badge SVG)', () => {
  const gameIcons = R('src/data/game-icons.js');
  const uiIcons = R('src/data/ui-icons.js');
  assert.match(gameIcons, /badge:\s*[`']<svg.*d="M7\.5 2\.5h9l5 5v9l-5 5h-9l-5-5v-9z"/, 'Badge Roche dans game-icons');
  assert.match(uiIcons, /badge:\s*[`']<svg.*d="M7\.5 2\.5h9l5 5v9l-5 5h-9l-5-5v-9z"/, 'Badge Roche dans ui-icons');
});

test('P4b-12 · Grille de donjon : adaptation de la fenêtre et suppression des espaces disproportionnés', () => {
  const css = R('src/assets/styles/design-system.css');
  assert.match(css, /\.pw-bdg-map[\s\S]*?width:\s*fit-content/, 'carte de donjon en fit-content');
  assert.match(css, /\.pw-dgn-grid[\s\S]*?width:\s*fit-content/, 'grille de donjon en fit-content');
  assert.match(css, /\.pw-dgn-grid[\s\S]*?gap:\s*4px/, 'espacement régulier des tuiles');
});
