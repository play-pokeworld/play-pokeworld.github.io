// ════════════════════════════════════════════════════════════════════════════
// PASSE 38 — RETOURS JOUEUR :
//   1. paysage : rochers DEVANT et DERRIÈRE les arbres/herbes/buissons ;
//   2. donjon : visibilité (boss / vide / brouillard distincts, façon
//      Pokéclicker, couleurs par type de case) ;
//   3. donjon : la carte se place SOUS le combat — en plein combat la scène
//      monte en haut (là où l'on regarde), dès qu'elle se termine la carte
//      remonte.
// ════════════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ─── 1. Paysage : trois profondeurs ─────────────────────────────────────────
test('38-L1 — rochers derrière : frise d\'arrière-plan sur la ligne de sol', () => {
  const css = read('src/assets/styles/design-system.css');
  const bg = css.slice(css.indexOf('html::before {'), css.indexOf('html::after {'));
  assert.match(bg, /--pw-land-rock-bg/, 'la frise d\'arrière-plan a sa teinte dédiée');
  assert.match(bg, /mask-size:\s*360px 26px/, 'petits rochers/buissons lointains');
  // PASSE 38 — correction : la frise lointaine ne flotte plus sur la ligne
  // d'herbe, elle partage la ligne de sol avec la végétation et les rochers.
  assert.match(bg, /mask-position:\s*0\s*calc\(var\(--pw-land-h-ground\) - 26px\)/, 'posée sur la ligne de sol, derrière les arbres');
  assert.match(bg, /z-index:\s*-2/, 'peinte avant la végétation');
});

test('38-L2 — rochers devant : la couche #pw-land-fg passe devant la végétation', () => {
  const css = read('src/assets/styles/design-system.css');
  const fg = css.slice(css.indexOf('#pw-land-fg {'), css.indexOf('#pw-land-fg {') + 5000);
  assert.match(fg, /z-index:\s*-1/, 'devant la végétation (z -2), derrière les promeneurs (z 0)');
  assert.match(fg, /pointer-events:\s*none/, 'invisible aux clics');
  assert.match(fg, /mask-position:\s*0\s*calc\(var\(--pw-land-h-ground\) - 38px\)/, 'posée sur la ligne de sol, comme les arbres');
  assert.match(fg, /var\(--pw-land-rock\)/, 'la teinte claire des rochers de premier plan');
});

test('38-L3 — le module landscape-layers crée le nœud #pw-land-fg au boot', () => {
  const mod = read('src/ui/game/landscape-layers.js');
  assert.match(mod, /getElementById\('pw-land-fg'\)/, 'le module cherche le nœud');
  assert.match(mod, /createElement\('div'\)/, 'le module crée la couche si absente');
  assert.match(mod, /aria-hidden/, 'invisible aux lecteurs d\'écran');
  const main = read('src/main.js');
  assert.match(main, /landscape-layers\.js/, 'le module est chargé au boot');
});

// ─── 2. Donjon : visibilité des cases ───────────────────────────────────────
test('38-D1 — le brouillard a un voile brumeux distinct du sol vide', () => {
  const css = read('src/assets/styles/design-system.css');
  const bloc = css.slice(css.indexOf('.pw-dgn-tile.is-fog'));
  assert.match(bloc, /radial-gradient/, 'voile brumeux en dégradés');
  assert.match(bloc, /inset\s+0\s+0\s+10px rgba\(0,\s*0,\s*0,\s*\.55\)/, 'ombre interne de caverne');
  assert.match(bloc, /\.pw-dgn-fogq\s*\{[\s\S]*?opacity:\s*\.85/, 'le « ? » reste lisible');
});

test('38-D2 — le vide (case vide) a sa propre texture : sol estompé en pointillés', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /\.pw-dgn-tile\.t-empty:not\(\.is-fog\)\s*\{[\s\S]*?border-style:\s*dashed/, 'sol vide en pointillés');
});

test('38-D3 — PASSE 38e : CINQ couleurs distinctes — combat violet, élite orange, coffre or, boss ROUGE, échelle bleue (retour : « le boss n\'est plus rouge » et « les cases combats et coffres ont les mêmes couleurs »)', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /--pw-dgn-tint:\s*#[0-9A-Fa-f]{6}/, 'la teinte du combat est définie');
  assert.match(css, /\.pw-dgn-tile\.t-combat:not\(\.is-fog\)[\s\S]{0,400}?var\(--pw-dgn-tint\)/, 'combat (pokéball) = violet (--pw-dgn-tint)');
  assert.match(css, /\.pw-dgn-tile\.t-boss:not\(\.is-fog\)[\s\S]{0,400}?var\(--red\)/, 'boss = ROUGE (retour 38e)');
  assert.doesNotMatch(css, /\.pw-dgn-tile\.t-boss:not\(\.is-fog\)[\s\S]{0,400}?var\(--pw-dgn-tint\)/, 'le boss n\'est plus dans la teinte du combat');
  assert.match(css, /\.pw-dgn-tile\.t-chest:not\(\.is-fog\)[\s\S]{0,400}?var\(--yellow\)/, 'coffre = OR (--yellow), distinct du combat');
  assert.doesNotMatch(css, /\.pw-dgn-tile\.t-chest:not\(\.is-fog\)[\s\S]{0,400}?var\(--pw-dgn-tint\)/, 'le coffre ne partage plus la couleur du combat');
  assert.match(css, /\.pw-dgn-tile\.t-elite[\s\S]{0,300}?var\(--orange\)/, 'élite = orange + étoile');
  assert.match(css, /\.pw-dgn-tile \.pw-dgn-star[\s\S]{0,300}?mask-image:\s*var\(--ic\)/, 'l\'étoile de l\'élite est teintée par masque');
  assert.match(css, /\.pw-dgn-tile\.t-ladder[\s\S]{0,300}?var\(--blue\)/, 'échelle = bleue');
});

test('38-D4 — le boss luit : halo + pulsation, annulée en "réduire les animations"', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /\.pw-dgn-tile\.t-boss[\s\S]*?animation:\s*pw38-boss-pulse/, 'pulsation du boss');
  assert.match(css, /@keyframes\s+pw38-boss-pulse/, 'la keyframe existe');
  assert.match(css, /prefers-reduced-motion[\s\S]*?\.pw-dgn-tile\.t-boss\s*\{\s*animation:\s*none\s*!important/, 'désactivée si l\'utilisateur le demande');
});

test('38-D5 — la position du joueur est marquée par un double anneau lisible', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /\.pw-dgn-tile\.is-here\s*\{[\s\S]*?box-shadow:\s*0\s+0\s+0\s+2px var\(--dark2\),\s*0\s+0\s+0\s+4px var\(--light2\)/, 'double anneau sombre + clair');
});

test('38-D6 — PASSE 38c : la légende et l\'aide clavier sont SUPPRIMÉES, les clés i18n restent paritaires', () => {
  const js = read('src/application/world/dungeon-run.js');
  // Retour joueur : « la légende ne sert à rien si les cases sont assez
  // explicites » et « tu peux virer "*Flèches ← ↑ ↓ → : se déplacer sur la
  // carte" ».
  assert.doesNotMatch(js, /pw-bdg-legend/, 'la légende a été retirée du bandeau');
  assert.doesNotMatch(js, /dungeon_keys_hint/, 'l\'aide clavier a été retirée du bandeau');
  // les titres de cases (tooltips/aria) restent localisés et paritaires
  const fr = read('src/localization/fr/economy.js');
  const en = read('src/localization/en/economy.js');
  assert.match(fr, /"dungeon_node_empty"/, 'clé FR');
  assert.match(en, /"dungeon_node_empty"/, 'clé EN');
});

// ─── 3. Donjon : la carte sous le combat ────────────────────────────────────
test('38-D7 — la scène de combat passe au-dessus de la carte quand elle est en vie', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /#battle-center-panel\s*>\s*#battle-active-scene\s*\{\s*order:\s*-1\s*;?\s*\}/,
    'la scène de combat est ordonnée en premier dès qu\'elle est affichée');
  assert.match(css, /#battle-center-panel\s*>\s*#battle-dungeon-bar\s*\{\s*order:\s*0\s*;?\s*\}/,
    'la carte reste visible SOUS le combat');
});

// ─── 3b. Donjon : assets image (icônes Pokéclicker) ────────────────────────
test('38-D9 — combat = pokéball de la barre de titre, élite étoilée, boss, coffre, échelle : vrais assets monochromes', () => {
  const js = read('src/application/world/dungeon-run.js');
  // PASSE 38e — la case de combat utilise la POKÉBALL de la barre de titre
  // (retour joueur : « pourquoi tu n'utilises pas celui qui est dans le
  // titre de la fenêtre pokéball ? »), l'élite ajoute une étoile.
  assert.match(js, /_dgGlyph\('src\/assets\/images\/dungeon\/pokeball\.svg'\)/, 'combat → pokéball de la barre de titre (pokeball.svg)');
  assert.match(js, /dungeon\/star\.svg/, 'élite → étoile (star.svg)');
  assert.match(js, /dungeon\/boss\.png/, 'boss → symbole de boss (boss.png)');
  assert.match(js, /dungeon\/chest\.png/, 'coffre → chest.png');
  assert.match(js, /dungeon\/ladder\.png/, 'échelle → ladder.png');
  // PASSE 38c — les icônes sont des GLYPHES teintés par masque
  assert.match(js, /_dgGlyph\(src\)/, 'les icônes passent par le glyphe teinté');
  assert.match(js, /case 'combat':\s+return t\.done \? '' : _dgGlyph\('src\/assets\/images\/dungeon\/pokeball\.svg'\)/,
    'une case de combat TERMINÉE devient vide (style Pokéclicker)');
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /\.pw-dgn-tile \.pw-dgn-ic\s*\{[\s\S]*?mask-image:\s*var\(--ic\)/, 'teinte par masque CSS');
  // les assets sont déclarés dans le téléchargeur du projet (qui les
  // régénère en monochrome à la PASSE 38c, et garantit les SVG locaux 38e)
  const dl = read('tools/download_assets.py');
  assert.match(dl, /DUNGEON_TILES = \['encounter\.png', 'boss\.png', 'chest\.png', 'ladder\.png'\]/,
    'les 4 tuiles Pokéclicker sont déclarées dans download_assets.py');
  assert.match(dl, /download_dungeon_tiles\(\)/, 'la fonction est appelée au run');
  assert.match(dl, /glyphes monochromes/, 'le téléchargeur régénère les tuiles en N&B');
  assert.match(dl, /pokeball\.svg/, 'le téléchargeur garantit pokeball.svg (icône locale)');
  assert.match(dl, /star\.svg/, 'le téléchargeur garantit star.svg (icône locale)');
  // et présents dans le projet, en monochrome (saturation ≈ 0)
  for (const f of ['encounter.png', 'boss.png', 'chest.png', 'ladder.png', 'pokeball.svg', 'star.svg']) {
    assert.ok(existsSync(new URL('../src/assets/images/dungeon/' + f, import.meta.url)), f + ' présent');
  }
  // la case vide n'a PAS d'icône (juste le sol de caverne)
  assert.match(js, /default: return '';\s+\/\/ case vide : pas d'icône/, 'case vide = pas d\'icône');
});

test('38-D10 — la case du joueur affiche le sprite PNJ de la carte', () => {
  const js = read('src/application/world/dungeon-run.js');
  assert.match(js, /trainers\/profil\/trainer-54\.png/, 'sprite PNJ de la carte sur la case courante');
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /\.pw-dgn-player\s*\{/, 'le sprite a son habillage');
  assert.ok(existsSync(new URL('../src/assets/images/trainers/profil/trainer-54.png', import.meta.url)), 'trainer-54 présent');
});

test('38-D11 — l\'entrée est en bas au milieu, vide, et on voit la zone de départ', async () => {
  globalThis.G = { money: 0, dungeonsExplored: 0, dungeonRun: null, dungeonClears: {}, team: [] };
  globalThis.ensureWallet = () => ({ dungeonTokens: 100000 });
  globalThis.spendDungeonTokens = () => true;
  globalThis.gainDungeonTokens = () => {};
  globalThis.getLocObj = () => ({ name: 'mtmoon', type: 'dungeon', badgeReq: 0 });
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.exploreArea = () => {};
  globalThis.aliveCount = () => 6;
  const M = await import('../src/application/world/dungeon-run.js');
  const run = M.startDungeonRun('mtmoon');
  assert.equal(run.pos, 'c3r4', 'entrée en bas au milieu (col 3, rangée 4)');
  assert.equal(run.map.tiles[run.pos].type, 'empty', 'première case vide');
  // la zone de départ (entrée + voisines) est révélée
  const s = run.map.tiles[run.pos];
  const revealedCount = Object.values(run.map.tiles).filter((t) => t.revealed).length;
  assert.ok(revealedCount >= 4, 'brouillard de guerre : voisines visibles');
  // aucun combat dans la zone de départ
  const near = Object.values(run.map.tiles).filter((t) => Math.abs(t.col - s.col) + Math.abs(t.row - s.row) === 1);
  assert.ok(near.every((t) => t.type !== 'combat' && t.type !== 'elite'), 'zone de départ sans combat');
  M.dungeonAbandon();
});

test('38-D12 — téléportation vers toute case visible ; brouillard exige l\'adjacence', async () => {
  globalThis.G = { money: 0, dungeonsExplored: 0, dungeonRun: null, dungeonClears: {}, team: [] };
  globalThis.ensureWallet = () => ({ dungeonTokens: 100000 });
  globalThis.spendDungeonTokens = () => true;
  globalThis.gainDungeonTokens = () => {};
  globalThis.getLocObj = () => ({ name: 'mtmoon', type: 'dungeon', badgeReq: 0 });
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.exploreArea = () => {};
  globalThis.aliveCount = () => 6;
  const M = await import('../src/application/world/dungeon-run.js');
  const run = M.startDungeonRun('mtmoon');
  const start = run.pos;
  // se déplacer sur une case visible lointaine = téléportation
  const visible = Object.values(run.map.tiles).find((t) => t.revealed && t.id !== start);
  if (visible) {
    M.dungeonMoveTo(visible.id);
    assert.equal(run.pos, visible.id, 'téléporté sur la case visible');
  }
  // une case lointaine sous brouillard reste refusée
  const fogFar = Object.values(run.map.tiles).find((t) => !t.revealed);
  if (fogFar) {
    const before = run.pos;
    M.dungeonMoveTo(fogFar.id);
    assert.equal(run.pos, before, 'case lointaine sous brouillard refusée');
  }
  // un pas vers une case voisine sous brouillard la révèle (et ses voisines)
  const here = run.map.tiles[run.pos];
  const fogNear = Object.values(run.map.tiles).find(
    (t) => !t.revealed && Math.abs(t.col - here.col) + Math.abs(t.row - here.row) === 1);
  if (fogNear) {
    M.dungeonMoveTo(fogNear.id);
    assert.equal(run.pos, fogNear.id, 'pas vers la case voisine sous brouillard');
    assert.equal(run.map.tiles[fogNear.id].revealed, true, 'révélée en y entrant');
  }
  M.dungeonAbandon();
});

// ─── 5. Barre de titre fixe + colonnes (affichage) ──────────────────────────
test('38-H1 — la barre de titre reste fixe quand on scroll (sticky)', () => {
  const css = read('src/assets/styles/design-system.css');
  // la règle paysage ne doit PLUS imposer position:relative à #header
  const i = css.indexOf('PASSE 38 — correction : NE PAS toucher à #header ici');
  assert.ok(i > 0, 'la correction est documentée dans la feuille');
  const after = css.slice(i, i + 700);
  assert.match(after, /#main-dashboard\s*\{\s*position:\s*relative;\s*z-index:\s*1;\s*\}/, 'seul le dashboard est relative');
  assert.match(after, /#header\s*\{\s*position:\s*sticky;\s*top:\s*0;\s*z-index:\s*950;\s*\}/, 'le header reste sticky');
  // plus aucune règle groupée qui dé-stickise le header
  assert.ok(!/^#header,\s*#main-dashboard\s*\{\s*position:\s*relative/m.test(css), 'plus de sélecteur groupé position:relative');
});

test('38-H2 — sur grand écran, les colonnes latérales font la moitié de la centrale', () => {
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /@media \(min-width:\s*1440px\)\s*\{[\s\S]*?#col-1,\s*#col-3\s*\{\s*flex:\s*1\s*1\s*0;\s*min-width:\s*0;\s*\}[\s\S]*?#col-2\s*\{\s*flex:\s*2\s*1\s*0;\s*\}/,
    '1:2:1 à partir de 1440 px');
  // les très grands écrans (17/9) gardent le ratio au lieu de tout égaliser
  assert.match(css, /min-aspect-ratio:\s*17\/9\) and \(min-width:\s*2720px\)\s*\{[\s\S]*?#col-2\s*\{\s*flex:\s*2\s*1\s*0\s*!important;\s*\}/,
    'pas d\'égalisation à 2720 px : la centrale reste ×2');
});

test('38-H3 — l\'icône du jeu (celle du joueur) est dans la barre de titre', () => {
  const html = read('index.html');
  assert.match(html, /brand-mark[\s\S]*?<img src="src\/assets\/images\/Icon\.png"/, 'l\'image Icon.png remplace le pokéball SVG');
  const css = read('src/assets/styles/design-system.css');
  assert.match(css, /\.brand-mark img\s*\{/, 'l\'image du brand a son habillage');
});

// ─── 4. Sanity : le harnais donjon tourne toujours avec la nouvelle légende ─
test('38-D8 — la carte génère toujours 35 cases et un seul boss', async () => {
  globalThis.G = { money: 0, dungeonsExplored: 0, dungeonRun: null, dungeonClears: {}, team: [] };
  globalThis.ensureWallet = () => ({ dungeonTokens: 100000 });
  globalThis.spendDungeonTokens = () => true;
  globalThis.gainDungeonTokens = () => {};
  globalThis.getLocObj = () => ({ name: 'mtmoon', type: 'dungeon', badgeReq: 0 });
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.exploreArea = () => {};
  globalThis.aliveCount = () => 6;
  const M = await import('../src/application/world/dungeon-run.js');
  const run = M.startDungeonRun('mtmoon');
  assert.equal(Object.keys(run.map.tiles).length, 35, '7×5');
  assert.equal(Object.values(run.map.tiles).filter((t) => t.type === 'boss').length, 1, 'un seul boss');
  assert.equal(Object.values(run.map.tiles).filter((t) => t.type === 'empty').length > 0, true, 'des cases vides');
  M.dungeonAbandon();
});
