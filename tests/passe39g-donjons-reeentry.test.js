// ════════════════════════════════════════════════════════════════════════════
// PASSE 39g — RÉ-ENTRÉE EN DONJON (retour joueur) :
//   « après l'avoir fait une fois, ou perdu une fois, je ne peux plus
//     combattre du tout en re-rentrant dans le donjon. Ce qui me bloque. »
//
//   F. le bouton « Engager l'expédition » doit RÉELLEMENT engager un combat :
//      il marche jusqu'à l'engagement le plus proche (brouillard levé au
//      passage) au lieu de faire un pas dans le vide (le sas de départ est
//      toujours 3 cases vides — d'où le blocage à chaque nouvelle carte) ;
//   G. l'entrée est bloquée (avec message) si l'équipe est entièrement K.O.
//      (sinon le combat s'ouvrirait et se refermerait aussitôt) ;
//   K. la marche du bouton ne croise JAMAIS l'échelle (il n'engage jamais
//      une descente de palier).
// ════════════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert/strict';

if (!globalThis.window) globalThis.window = globalThis;

function dgSandbox() {
  globalThis.G = {
    money: 0, dungeonsExplored: 0, dungeonRun: null, unlockedLocs: { mtmoon: true },
    team: [{ currentHP: 100, maxHP: 100 }],
  };
  const wallet = { dungeonTokens: 5000 };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => { if (wallet.dungeonTokens < n) return false; wallet.dungeonTokens -= n; return true; };
  globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq: 0 });
  globalThis.getLocationBackground = () => 'mountain';
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.aliveCount = () => 6;
  globalThis.openBattleSummary = () => {};
  globalThis.battle = { active: false, pendingDungeonBoss: false };
  globalThis.currentDungeonRun = () => (globalThis.G && globalThis.G.dungeonRun && globalThis.G.dungeonRun.active ? globalThis.G.dungeonRun : null);
  globalThis.isDungeonRunAt = (id) => !!(globalThis.G && globalThis.G.dungeonRun && globalThis.G.dungeonRun.active && globalThis.G.dungeonRun.loc === id);
  return wallet;
}

// ─── F. LE BOUTON « ENGAGER L'EXPÉDITION » ENGAGE VRAIMENT UN COMBAT ────────
test('39g-F1 — le bouton marche jusqu\'au combat le plus proche et s\'y engage', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  let explored = 0;
  globalThis.exploreArea = () => { explored += 1; globalThis.battle.active = true; };
  const run = M.startDungeonRun('mtmoon');
  // la case de départ est dans le sas : aucun combat voisin au départ
  const pos = run.map.tiles[run.pos];
  const near = [[1,0],[-1,0],[0,-1],[0,1]].map(([dc,dr]) => run.map.tiles['c'+(pos.col+dc)+'r'+(pos.row+dr)]).filter(Boolean);
  assert.ok(!near.some((t) => t.type === 'combat' || t.type === 'elite'), 'précondition : pas de combat au sas de départ');
  M.dungeonFight();
  assert.ok(explored >= 1, 'un combat est réellement engagé (exploreArea appelée)');
  assert.equal(globalThis.battle.active, true, 'le combat est actif');
  const tile = run.map.tiles[run.pos];
  assert.ok(tile.type === 'combat' || tile.type === 'elite', 'le joueur est SUR la case de combat');
  M.dungeonAbandon();
});

test('39g-F2 — sans combat voisin, le bouton ne se contente plus d\'un pas dans le vide', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  globalThis.exploreArea = () => { globalThis.battle.active = true; };
  const run = M.startDungeonRun('mtmoon');
  const before = run.pos;
  M.dungeonFight();
  assert.notEqual(run.pos, before, 'le joueur a marché vers l\'engagement (plus un simple pas au hasard)');
  const tile = run.map.tiles[run.pos];
  assert.ok(tile.type === 'combat' || tile.type === 'elite' || tile.type === 'boss', 'arrivée sur un engagement');
  M.dungeonAbandon();
});

test('39g-F3 — tant qu\'un combat reste sur le plateau, le bouton ne marche JAMAIS au boss', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  globalThis.exploreArea = () => { globalThis.battle.active = true; };
  const run = M.startDungeonRun('mtmoon');
  run.floor = run.depth; // palier final : le boss est le gardien
  // déterminisme : UNIQUE combat restant = la case voisine de l'entrée ;
  // le boss est donc strictement plus loin que l'engagement.
  const pos = run.map.tiles[run.pos];
  const adj = [[1,0],[-1,0],[0,-1],[0,1]].map(([dc,dr]) => run.map.tiles['c'+(pos.col+dc)+'r'+(pos.row+dr)]).filter(Boolean)[0];
  adj.type = 'elite';
  adj.revealed = true;
  for (const t of Object.values(run.map.tiles)) {
    if (t.id !== adj.id && (t.type === 'combat' || t.type === 'elite')) t.done = true;
  }
  M.dungeonFight();
  assert.equal(globalThis.battle.pendingDungeonBoss, false, 'un engagement normal n\'arme pas le gardien');
  const tile = run.map.tiles[run.pos];
  assert.notEqual(tile.type, 'boss', 'le bouton est allé au combat, pas au boss');
  assert.equal(tile.id, adj.id, 'le combat le plus proche a été engagé');
  M.dungeonAbandon();
});

test('39g-F4 — plateau vidé de ses combats : le bouton marche au boss', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  globalThis.exploreArea = () => { globalThis.battle.active = true; };
  const run = M.startDungeonRun('mtmoon');
  for (const t of Object.values(run.map.tiles)) {
    if (t.type === 'combat' || t.type === 'elite') t.done = true;
  }
  M.dungeonFight();
  const tile = run.map.tiles[run.pos];
  assert.equal(tile.type, 'boss', 'dernier engagement restant : le boss');
  assert.equal(globalThis.battle.pendingDungeonBoss, false, 'palier 1/2 : mini-boss, pas de gardien armé');
  M.dungeonAbandon();
});

// ─── G. ÉQUIPE À TERRE : ENTRÉE BLOQUÉE AVEC MESSAGE ────────────────────────
test('39g-G1 — entrée bloquée si toute l\'équipe est K.O. (run perdue + retour immédiat)', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  globalThis.G.team = [{ currentHP: 0, maxHP: 100 }, { currentHP: 0, maxHP: 80 }];
  const msgs = [];
  globalThis.notify = (m) => { msgs.push(m); };
  const run = M.startDungeonRun('mtmoon');
  assert.equal(run, null, 'aucune run n\'est ouverte');
  assert.equal(globalThis.G.dungeonRun, null, 'aucun état résiduel');
  assert.ok(msgs.length >= 1, 'un message clair est affiché');
  assert.match(msgs[0], /dungeon_team_ko_blocked/, 'message dédié équipe K.O.');
});

test('39g-G2 — avec au moins un Pokémon debout, l\'entrée reste possible', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  globalThis.G.team = [{ currentHP: 0, maxHP: 100 }, { currentHP: 1, maxHP: 80 }];
  const run = M.startDungeonRun('mtmoon');
  assert.ok(run && run.active, 'la run s\'ouvre normalement');
  assert.ok(run.map, 'la carte est générée');
  M.dungeonAbandon();
});

// ─── K. LA MARCHE DU BOUTON NE CROISE JAMAIS L'ÉCHELLE ──────────────────────
test('39g-K1 — le chemin contourne l\'échelle (pas de descente par le bouton)', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  globalThis.exploreArea = () => { globalThis.battle.active = true; };
  const run = M.startDungeonRun('mtmoon');
  // plateau contrôlé 2×2 :
  //   c0r0 (départ) — c1r0 (échelle, impasse)
  //   c0r1 (vide)   — c1r1 (combat)
  run.map = { grid: true, cols: 2, rows: 2, tiles: {
    c0r0: { id: 'c0r0', col: 0, row: 0, type: 'empty', revealed: true, done: false },
    c1r0: { id: 'c1r0', col: 1, row: 0, type: 'ladder', revealed: true, done: false },
    c0r1: { id: 'c0r1', col: 0, row: 1, type: 'empty', revealed: true, done: false },
    c1r1: { id: 'c1r1', col: 1, row: 1, type: 'combat', revealed: true, done: false },
  } };
  run.pos = 'c0r0';
  M.dungeonFight();
  assert.equal(run.pos, 'c1r1', 'on contourne l\'échelle et on atteint le combat');
  assert.equal(globalThis.battle.active, true, 'le combat est engagé');
  M.dungeonAbandon();
});
