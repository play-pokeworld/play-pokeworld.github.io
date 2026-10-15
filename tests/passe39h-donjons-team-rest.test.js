// ════════════════════════════════════════════════════════════════════════════
// PASSE 39h — FIN D'EXPÉDITION : l'équipe se repose ENTIÈREMENT
//   (retour joueur) : « après avoir fini un donjon, ma team n'est pas heal,
//   ce qui est vraiment problématique. »
//
//   R. à la clôture de l'expédition (victoire du gardien OU remontée),
//      l'équipe est soignée en entier (PV complets + états purgés) ;
//   K. pendant l'expédition, AUCUN soin (règle 38e inchangée : les PV durent
//      de combat en combat) ;
//   W. un wipe (défaite) ne soigne PAS : l'équipe reste K.O., la base reste
//      l'échappatoire (et le garde-fou 39g bloque la ré-entrée).
// ════════════════════════════════════════════════════════════════════════════
import test from 'node:test';
import assert from 'node:assert/strict';

if (!globalThis.window) globalThis.window = globalThis;

function dgSandbox() {
  globalThis.G = {
    money: 0, dungeonsExplored: 0, dungeonRun: null, unlockedLocs: { mtmoon: true },
    team: [
      { currentHP: 30, maxHP: 100, status: 'paralyze' },
      { currentHP: 70, maxHP: 80, status: null },
    ],
  };
  const wallet = { dungeonTokens: 5000 };
  const msgs = [];
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => { if (wallet.dungeonTokens < n) return false; wallet.dungeonTokens -= n; return true; };
  globalThis.gainDungeonTokens = (n) => { wallet.dungeonTokens += n; };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq: 0 });
  globalThis.getLocationBackground = () => 'mountain';
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = (m) => { msgs.push(m); };
  globalThis.t = (k) => k;
  globalThis.tr = (k) => k;
  globalThis.aliveCount = () => 2;
  globalThis.openBattleSummary = () => {};
  globalThis.battle = { active: false };
  globalThis.currentDungeonRun = () => (globalThis.G && globalThis.G.dungeonRun && globalThis.G.dungeonRun.active ? globalThis.G.dungeonRun : null);
  globalThis.isDungeonRunAt = (id) => !!(globalThis.G && globalThis.G.dungeonRun && globalThis.G.dungeonRun.active && globalThis.G.dungeonRun.loc === id);
  return { wallet, msgs };
}

function teamDamaged() {
  globalThis.G.team = [
    { currentHP: 30, maxHP: 100, status: 'paralyze' },
    { currentHP: 70, maxHP: 80, status: null },
  ];
}

// ─── R. CLÔTURE → ÉQUIPE SOIGNÉE EN ENTIER ──────────────────────────────────
test('39h-R1 — remontée volontaire : l\'équipe repart en pleine forme', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  const { msgs } = dgSandbox();
  teamDamaged();
  M.startDungeonRun('mtmoon');
  const res = M.dungeonAscend();
  assert.equal(res.outcome, 'ascend');
  for (const p of globalThis.G.team) {
    assert.equal(p.currentHP, p.maxHP, 'PV complets');
    assert.equal(p.status, null, 'état purgé');
  }
  assert.equal(globalThis.G.dungeonRun, null, 'la run est close');
  assert.ok(msgs.some((m) => /dungeon_run_team_healed/.test(m)), 'message de repos affiché');
});

test('39h-R2 — gardien vaincu : victoire + équipe soignée en entier', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  teamDamaged();
  const run = M.startDungeonRun('mtmoon');
  run.floor = run.depth; // palier final
  run.map.tiles[run.bossTile].revealed = true;
  const res = M.dungeonOnBossDefeated();
  assert.equal(res.outcome, 'cleared');
  for (const p of globalThis.G.team) {
    assert.equal(p.currentHP, p.maxHP, 'PV complets après le boss');
    assert.equal(p.status, null, 'état purgé après le boss');
  }
  assert.equal(globalThis.G.dungeonRun, null, 'la run est close');
  assert.equal(globalThis.G.dungeonClears.mtmoon, 1, 'clear comptabilisé');
});

// ─── K. PENDANT L'EXPÉDITION : AUCUN SOIN (règle 38e) ───────────────────────
test('39h-R3 — pendant le run, une victoire de case ne soigne PAS l\'équipe', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  teamDamaged();
  const run = M.startDungeonRun('mtmoon');
  M.dungeonOnWin();
  assert.equal(globalThis.G.team[0].currentHP, 30, 'PV inchangés pendant le run');
  assert.equal(globalThis.G.team[0].status, 'paralyze', 'état inchangé pendant le run');
  assert.ok(run.active, 'la run est toujours en cours');
  M.dungeonAbandon();
});

// ─── W. WIPE : L'ÉQUIPE REPART SOIGNÉE (V7-R1 #5) ───────────────────────────
// Supersède 39h (« wipe : pas de soin, la base reste l'échappatoire ») :
// retour joueurs V7-R1 — « soigner l'équipe à la fin du donjon » et « après
// un combat ou une fin de donjon, toujours soigner les Pokémon » (les joueurs
// croyaient ne plus pouvoir relancer). Le sac reste amputé de moitié : la
// sanction est économique, plus une équipe K.O. à aller soigner.
test('39h-W1 — wipe : le sac est amputé mais l\'équipe repart soignée (V7-R1 #5)', async () => {
  const M = await import('../src/application/world/dungeon-run.js');
  dgSandbox();
  const run = M.startDungeonRun('mtmoon'); // la run démarre avec une équipe saine
  run.bag.tokens = 200;
  run.bag.money = 100;
  // …et l'expédition finit mal : toute l'équipe tombe au combat.
  globalThis.G.team = [
    { currentHP: 0, maxHP: 100, status: 'burn' },
    { currentHP: 0, maxHP: 80, status: null },
  ];
  const before = globalThis.G.money;
  const res = M.dungeonOnWipe();
  assert.equal(res.outcome, 'wipe');
  for (const p of globalThis.G.team) {
    assert.equal(p.currentHP, p.maxHP, 'fin de donjon : équipe soignée (V7-R1 #5)');
    assert.equal(p.status, null, 'états purgés');
  }
  assert.ok(globalThis.G.money > before, 'la moitié du sac est créditée');
  assert.equal(globalThis.G.dungeonRun, null, 'la run est close');
  // Le garde-fou 39g (ré-entrée bloquée équipe K.O.) reste en place mais ne
  // se déclenche plus ici : l'équipe est debout, une nouvelle expédition part.
  const again = M.startDungeonRun('mtmoon');
  assert.ok(again && again.active, 'ré-entrée possible : l\'équipe est soignée');
  M.dungeonAbandon();
});
