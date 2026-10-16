import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const R = (p) => fs.readFileSync(p, 'utf8');

test('P4d-01 · Badge : Icône du badge de pierre en vectoriel dans game-icons et ui-icons', () => {
  const gameIcons = R('src/data/game-icons.js');
  const uiIcons = R('src/data/ui-icons.js');

  // Doit contenir le tracé vectoriel SVG du Boulder Badge (badge pierre/roche)
  assert.match(gameIcons, /badge:\s*[`']<svg[\s\S]*?<polygon/i, 'Badge pierre polygon SVG dans game-icons');
  assert.match(uiIcons, /badge:\s*[`']<svg[\s\S]*?<polygon/i, 'Badge pierre polygon SVG dans ui-icons');
  assert.match(gameIcons, /#a89f91|#c2b9ac/, 'Teintes de roche/pierre présentes dans game-icons');
  assert.match(uiIcons, /#a89f91|#c2b9ac/, 'Teintes de roche/pierre présentes dans ui-icons');
});

test('P4d-02 · Donjon : cases de taille fixe (44px) et fenêtre adaptée à la grille', () => {
  const css = R('src/assets/styles/design-system.css');
  assert.match(css, /\.pw-dgn-grid\s*\{[\s\S]*?width:\s*fit-content/i, 'la grille a width: fit-content');
  assert.match(css, /#battle-dungeon-bar \.pw-dgn-tile\s*\{[\s\S]*?width:\s*44px/i, 'tuiles à 44px fixe');
  assert.match(css, /#battle-dungeon-bar \.pw-dgn-tile\s*\{[\s\S]*?height:\s*44px/i, 'hauteur des tuiles à 44px fixe');
  assert.match(css, /\.pw-bdg-map\s*\{[\s\S]*?width:\s*fit-content/i, 'la fenêtre/carte de donjon s adapte à la grille');
});

test('P4d-03 · Guide : Capture et IV autonomes supprimés, répartis dans Combats et Stats', async () => {
  globalThis.t = (k) => k;
  globalThis.tr = (k, v) => k;
  globalThis.G = { lang: 'fr', badges: [], unlockedLocs: {} };

  const { guideSections } = await import('../src/ui/game/guide-sections.js');
  const sections = guideSections();

  // Rubrique autonome "capture" supprimée
  assert.equal(sections.capture, undefined, 'Pas de rubrique autonome capture dans guideSections');
  // Pas de rubrique autonome "iv"
  assert.equal(sections.iv, undefined, 'Pas de rubrique autonome iv');

  // Combat contient la capture
  assert.ok(sections.combat, 'rubrique combat présente');
  const combatPages = sections.combat.pages || [];
  const hasCapturePage = combatPages.some(
    (p) => (p[0] && p[0].toLowerCase().includes('capture')) || (p[1] && p[1].includes('Poké Balls'))
  );
  assert.ok(hasCapturePage, 'la capture est intégrée dans la rubrique Combat');

  // Stats contient les explications d IV
  assert.ok(sections.stats, 'rubrique stats présente');
  const statsPages = sections.stats.pages || [];
  const hasIvPage = statsPages.some(
    (p) => (p[0] && p[0].toLowerCase().includes('iv')) || (p[1] && p[1].toLowerCase().includes('iv'))
  );
  assert.ok(hasIvPage, 'les explications d IV sont intégrées dans la rubrique Stats');
});

test('P4d-04 · Guide : Table des types sous forme de tableau en couleur', async () => {
  globalThis.t = (k) => k;
  globalThis.tr = (k, v) => k;
  globalThis.typeEff = (await import('../src/domain/battle/type-system.js')).typeEffect;
  globalThis.getTypeName = (t) => t;

  const { guideSections } = await import('../src/ui/game/guide-sections.js');
  const sections = guideSections();

  const combatPages = sections.combat.pages || [];
  const typeChartPage = combatPages.find((p) => p[0] === 'guide_type_chart_title' || p[0] === 'Table des types');
  assert.ok(typeChartPage, 'page Table des types présente dans Combat');

  const chartHtml = typeChartPage[1];
  assert.match(chartHtml, /<table class="pw-guide-type-table"/, 'balise table présente');
  assert.match(chartHtml, /2×/, 'multiplicateur 2x présent');
  assert.match(chartHtml, /½/, 'multiplicateur 0.5x présent');
  assert.match(chartHtml, /#2e7d32/, 'couleur verte pour super efficace');
  assert.match(chartHtml, /#c62828/, 'couleur rouge pour pas très efficace');
});

test('P4d-05 · Succès : bouton ? retiré de l en-tête de la fenêtre des succès', () => {
  const dashSrc = R('src/ui/game/dashboard.js');
  assert.match(dashSrc, /'win-achievements':\s*false/, 'win-achievements est à false dans WIN_GUIDE_SECTION (pas de bouton ?)');
});
