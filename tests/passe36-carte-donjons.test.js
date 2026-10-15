// ════════════════════════════════════════════════════════════════════════════
// PASSE 36/37 — CARTE DU DONJON quadrillée (façon Pokéclicker), clavier,
// pilote auto + paysage.
// ════════════════════════════════════════════════════════════════════════════
// Passe 36 : le joueur choisit la variante D (« la carte ») + flèches + auto.
// Passe 37 : « ce que tu as fait c'est plus un choix à branche et non une
// vraie carte » → vraie grille façon Pokéclicker (cases combats / coffres /
// vides / boss, brouillard, échelle à la place du boss battu, carte dévoilée
// pour ramasser), et paysage : transition NETTE au niveau de la frise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function sandbox({ badgeReq = 0, tokens = 100000 } = {}) {
  globalThis.G = { money: 0, dungeonsExplored: 0, dungeonRun: null, dungeonClears: {}, team: [] };
  const wallet = { dungeonTokens: tokens, revealed: {} };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => { if (wallet.dungeonTokens < n) return false; wallet.dungeonTokens -= n; return true; };
  globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq });
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.exploreArea = () => {};   // le combat lui-même est hors périmètre
  globalThis.aliveCount = () => 6;
  return wallet;
}

const M = await import('../src/application/world/dungeon-run.js');
const tile = (run, id) => run.map.tiles[id];

// ─── 1. Le plateau quadrillé ─────────────────────────────────────────────────
test('37-D1 — une grille 7×5 avec entrée, combats, coffres et UN boss cachés', () => {
  sandbox();
  const run = M.startDungeonRun('mtmoon');
  assert.equal(run.map.grid, true, 'c\'est une vraie grille');
  assert.equal(run.map.cols, 7);
  assert.equal(run.map.rows, 5);
  const types = Object.values(run.map.tiles).map((t) => t.type);
  assert.equal(types.filter((t) => t === 'boss').length, 1, 'un seul boss par palier');
  // PASSE 38c — densité relevée (retour joueur « trop de cases vides ») :
  // 5 coffres et au moins 10 combats sur la grille 7×5.
  assert.ok(types.filter((t) => t === 'chest').length >= 5, 'des coffres (≥ 5)');
  assert.ok(types.filter((t) => t === 'combat' || t === 'elite').length >= 10, 'des combats (≥ 10)');
  assert.ok(types.filter((t) => t === 'empty').length > 0, 'des cases vides');
  // PASSE 38 — l'entrée est EN BAS AU MILIEU et VIDE (pas de combat).
  assert.equal(run.pos, 'c3r4', 'l\'entrée est en bas au milieu');
  assert.equal(tile(run, run.pos).type, 'empty', 'la première case est vide');
  assert.equal(tile(run, run.pos).revealed, true, 'l\'entrée est révélée');
  // brouillard de guerre : les cases ADJACENTES sont visibles d'office.
  assert.ok(Object.values(run.map.tiles).filter((t) => t.revealed).length >= 4,
    'la zone de départ (entrée + voisines) est révélée');
  // zone de départ sans combat : le joueur choisit librement sa direction.
  const start = tile(run, run.pos);
  const near = Object.values(run.map.tiles).filter(
    (t) => Math.abs(t.col - start.col) + Math.abs(t.row - start.row) === 1);
  assert.ok(near.every((t) => t.type !== 'combat' && t.type !== 'elite'),
    'aucun combat dans la zone de départ');
  assert.equal(tile(run, run.bossTile).revealed, false, 'le boss est sous brouillard');
  M.dungeonAbandon();
});

test('37-D2 — déplacement : case visible atteignable, case sous brouillard exige l\'adjacence', () => {
  sandbox();
  const run = M.startDungeonRun('mtmoon');
  const start = run.pos;
  M.dungeonMoveTo('c5r4'); // loin et sous brouillard
  assert.equal(run.pos, start, 'une case lointaine sous brouillard est ignorée');
  M.dungeonMoveTo('c3r3'); // voisine de l'entrée (3,4), révélée par le brouillard de guerre
  assert.equal(run.pos, 'c3r3', 'la case voisine est rejointe');
  assert.equal(tile(run, 'c3r3').revealed, true, 'et révélée en y entrant');
  // PASSE 38 — téléportation : n'importe quelle case VISIBLE est atteignable.
  const visible = Object.values(run.map.tiles).find((t) => t.revealed && t.id !== 'c3r3' && t.id !== start);
  if (visible) {
    M.dungeonMoveTo(visible.id);
    assert.equal(run.pos, visible.id, 'téléportation vers une case visible');
  }
  M.dungeonAbandon();
});

test('37-D3 — les flèches déplacent le joueur d\'une case', () => {
  sandbox();
  const run = M.startDungeonRun('mtmoon');
  M.dungeonMove('right');
  assert.equal(run.pos, 'c4r4');
  M.dungeonMove('up');
  assert.equal(run.pos, 'c4r3');
  M.dungeonMove('left');
  assert.equal(run.pos, 'c3r3');
  M.dungeonMove('left');
  assert.equal(run.pos, 'c2r3');
  M.dungeonMove('left');
  assert.equal(run.pos, 'c1r3');
  M.dungeonMove('left');
  assert.equal(run.pos, 'c0r3');
  M.dungeonMove('left');
  assert.equal(run.pos, 'c0r3', 'le bord du plateau arrête');
  M.dungeonAbandon();
});

test('37-D4 — une case combat engage, la victoire solde la case', () => {
  sandbox();
  const run = M.startDungeonRun('mtmoon');
  // trouve un combat voisin de l'entrée via un parcours auto simulé
  let guard = 0;
  while (!run.pendingNode && guard++ < 40) {
    const r = M.currentDungeonRun();
    const adj = Object.values(r.map.tiles).filter((t) => Math.abs(t.col - r.map.tiles[r.pos].col) + Math.abs(t.row - r.map.tiles[r.pos].row) === 1 && !t.done && (t.type === 'combat' || t.type === 'elite'));
    if (adj.length) M.dungeonMoveTo(adj[0].id);
    else {
      // avance d'une case cachée
      const anyAdj = Object.values(r.map.tiles).filter((t) => Math.abs(t.col - r.map.tiles[r.pos].col) + Math.abs(t.row - r.map.tiles[r.pos].row) === 1 && !t.revealed);
      if (!anyAdj.length) break;
      M.dungeonMoveTo(anyAdj[0].id);
    }
  }
  const r2 = M.currentDungeonRun();
  if (r2.pendingNode) {
    const id = r2.pendingNode;
    M.dungeonOnWin();
    assert.equal(tile(M.currentDungeonRun(), id).done, true, 'la victoire solde la case');
  }
  M.dungeonAbandon();
});

test('37-D5 — boss battu : échelle à sa place, carte dévoilée, palier purgé', () => {
  sandbox();
  globalThis.G.dungeonClears = { mtmoon: 5 };
  globalThis.G.team = [{ currentHP: 100, maxHP: 100 }];
  M.startDungeonRun('mtmoon');
  M.dungeonSetAuto(true);
  let guard = 0;
  let run = M.currentDungeonRun();
  while (run && !run.bossDefeated && guard++ < 300) {
    if (run.pendingNode) M.dungeonOnWin();
    run = M.currentDungeonRun();
    // V7-R1c — le pilote « farm » ramasse TOUT avant le boss : une fois le
    // boss battu il n'a plus rien à faire et descend aussitôt ; on observe
    // donc l'état du palier juste après la victoire, avant son pas suivant.
    if (run && run.bossDefeated) break;
    if (run && !run.pendingNode) M._dgAutoStep();
    run = M.currentDungeonRun();
  }
  assert.ok(run, 'l\'expédition tient la route');
  assert.equal(run.bossDefeated, true, 'le boss a été trouvé et battu');
  assert.equal(tile(run, run.bossTile).type, 'ladder', 'l\'échelle remplace le boss');
  assert.ok(Object.values(run.map.tiles).every((t) => t.revealed), 'toute la carte est dévoilée');
  assert.equal(M.dungeonFloorCleared(), true, 'le palier est purgé');
  M.dungeonAbandon();
});

test('37-D6 — l\'échelle fait descendre au palier suivant', () => {
  sandbox();
  globalThis.G.dungeonClears = { mtmoon: 5 };
  M.startDungeonRun('mtmoon');
  const run = M.currentDungeonRun();
  run.bossDefeated = true;
  tile(run, run.bossTile).type = 'ladder';
  // se place à côté de l'échelle puis monte dessus
  const b = tile(run, run.bossTile);
  run.pos = tile(run, run.bossTile).col > 0 ? `c${b.col - 1}r${b.row}` : `c${b.col + 1}r${b.row}`;
  M.dungeonMoveTo(run.bossTile);
  assert.equal(M.currentDungeonRun().floor, 2, 'descente au palier 2');
  assert.equal(M.currentDungeonRun().map.grid, true, 'nouveau plateau quadrillé');
  M.dungeonAbandon();
});

// ─── 2. Pilote automatique ───────────────────────────────────────────────────
test('37-D7 — verrouillé avant 3 complétions', () => {
  sandbox();
  M.startDungeonRun('mtmoon');
  M.dungeonSetAuto(true);
  assert.equal(M.currentDungeonRun().auto, false);
  M.dungeonAbandon();
});

test('37-D8 — l\'auto explore, bat le boss, ramasse puis descend, sans un clic', () => {
  sandbox();
  globalThis.G.dungeonClears = { mtmoon: 5 };
  globalThis.G.team = [{ currentHP: 100, maxHP: 100 }];
  M.startDungeonRun('mtmoon');
  M.dungeonSetAuto(true);
  let guard = 0;
  let descended = false;
  let run = M.currentDungeonRun();
  while (run && guard++ < 600) {
    if (run.pendingNode) { M.dungeonOnWin(); run = M.currentDungeonRun(); continue; }
    const floorBefore = run.floor;
    M._dgAutoStep();
    run = M.currentDungeonRun();
    if (!run) break;
    if (run.floor > floorBefore) { descended = true; break; }
  }
  assert.equal(descended, true, 'l\'auto a tout ramassé puis descendu seul');
  M.dungeonAbandon();
});

// ─── 3. Élite : le risque paie double ───────────────────────────────────────
test('37-D9 — une victoire élite verse le double de butin', () => {
  sandbox();
  M.startDungeonRun('mtmoon');
  globalThis.battle = { dungeonElite: false };
  M.dungeonOnWin();
  const normal = M.currentDungeonRun().bag.tokens;
  globalThis.battle.dungeonElite = true;
  M.dungeonOnWin();
  const elite = M.currentDungeonRun().bag.tokens - normal;
  assert.ok(elite >= 2 * normal, `l'élite paie double (${elite} vs ${normal})`);
  M.dungeonAbandon();
});

// ─── 4. Le bandeau affiche la grille, lisible ───────────────────────────────
test('37-D10 — le bandeau rend la grille sans légende ni aide clavier, butin sous la carte', () => {
  const run = readFileSync(new URL('../src/application/world/dungeon-run.js', import.meta.url), 'utf8');
  const body = run.slice(run.indexOf('function _dgTileIcon'));
  assert.match(body, /_dgGridHtml/, 'le plateau quadrillé est rendu');
  assert.match(body, /pw-dgn-grid/, 'la grille a sa classe');
  assert.match(body, /dungeonMoveTo/, 'les cases sont cliquables');
  // PASSE 38c — retours joueur : plus de légende ni d\'aide clavier (les cases
  // sont assez explicites seules), le butin du donjon vit sous la carte.
  // PASSE 39e — plus de panneau parallèle : c\'est la réglette commune qui est
  // rafraîchie par le bandeau, et elle est placée SOUS la carte dans index.html.
  assert.doesNotMatch(body, /dungeon_keys_hint/, 'l\'aide clavier a été retirée');
  assert.doesNotMatch(body, /pw-bdg-legend/, 'la légende a été retirée');
  assert.doesNotMatch(body, /pw-bdg-loot/, 'le panneau de butin parallèle a été supprimé');
  assert.match(body, /renderBattleLoot/, 'le bandeau rafraîchit la réglette commune sous la carte');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('id="battle-dungeon-bar"') < html.indexOf('id="battle-loot-row"'),
    'la réglette de butin est placée APRÈS la carte (sous la carte)');
  const css = readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
  assert.match(css, /\.pw-dgn-grid\s*\{/, 'la grille a son habillage');
  assert.match(css, /\.pw-dgn-tile\.is-fog/, 'le brouillard est habillé');
  assert.match(css, /\.pw-dgn-tile\.t-ladder/, 'l\'échelle est habillée');
});

// ─── 5. Paysage : transition nette à la frise, dégradé doux au-dessus ───────
test('37-P1 — la bascule sol/ciel est NETTE sur la ligne de la frise', () => {
  const css = readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
  const i = css.search(/^body::after\s*\{/m);
  const bloc = css.slice(i, css.indexOf('}', i) + 1);
  assert.ok(!/var\(--pw-land-edge/.test(bloc), 'pas de trait de coupure parasite');
  // au-dessus de la frise : dégradé doux
  assert.match(bloc, /calc\(var\(--pw-land-h-horizon\)\s*[-+]\s*\d+vh\)/, 'ciel → horizon en dégradé');
  // à la frise : bascule franche (même hauteur pour les deux bandes)
  assert.match(bloc, /var\(--pw-land-grass\)\s+var\(--pw-land-h-ground\),\s*var\(--pw-land-ground\)\s+var\(--pw-land-h-ground\)/,
    'la transition herbe → sol est nette, pile à la ligne de pose');
});

test('37-P2 — trois profondeurs : rochers lointains / végétation / rochers devant', () => {
  const css = readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
  // PASSE 38 — l'arrière-plan (petits rochers + buissons) se pose sur la ligne
  // d'HERBE, derrière les arbres ; la végétation et les rochers de premier
  // plan partagent la ligne de SOL.
  const bg = css.slice(css.indexOf('html::before {'), css.indexOf('html::after {'));
  const veg = css.slice(css.indexOf('html::after {'), css.indexOf('#pw-land-fg {'));
  const fg = css.slice(css.indexOf('#pw-land-fg {'), css.indexOf('#pw-land-fg {') + 5000);
  assert.match(bg, /mask-position:\s*0\s*calc\(var\(--pw-land-h-ground\) - 26px\)/,
    'rochers/buissons d\'arrière-plan sur la ligne de sol, derrière (PASSE 38 : plus de ligne haute)');
  assert.match(veg, /mask-position:\s*0\s*calc\(var\(--pw-land-h-ground\) - 64px\)/,
    'végétation sur la ligne de sol');
  assert.match(fg, /mask-position:\s*0\s*calc\(var\(--pw-land-h-ground\) - 38px\)/,
    'gros rochers de premier plan sur la ligne de sol (devant)');
  assert.match(fg, /z-index:\s*-1/, 'le premier plan passe devant la végétation (z -2)');
});
