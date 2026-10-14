/**
 * Harnais visuel PASSE 39g — RENTRÉE EN DONJON (retour joueur) :
 *   « après l'avoir fait une fois, ou perdu une fois, je ne peux plus
 *     combattre du tout en re-rentrant dans le donjon. Ce qui me bloque. »
 *
 * Scénario A — run TERMINÉ (boss vaincu) puis ré-entrée :
 *   1. run 1 : combat RÉEL gagné (vraie tuile de combat, vrai startBattle)
 *   2. marche jusqu'au boss (combats bloquants gagnés au passage)
 *   3. boss vaincu → run clôturé (G.dungeonRun === null)
 *   4. ré-entrée (startDungeonRun) → NOUVEAU combat doit DÉMARRER
 *
 * Scénario B — run PERDU (équipe K.O. / wipe) puis ré-entrée :
 *   1. run 1 : combat réel, équipe mise à 0 PV → wipe (run clôturé)
 *   2. équipe soignée (base), ré-entrée → NOUVEAU combat doit DÉMARRER
 *
 * Usage : node tests/harness/visual-passe39g.mjs   (serveur dev sur :5173)
 */
import { chromium } from 'playwright';

const URL = process.env.PW_URL || 'http://localhost:5173/';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(30000);

const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

const ok = (label, cond) => console.log((cond ? '  ✔ ' : '  ✘ ') + label);

// ── Helpers côté page : trouver/marcher jusqu'à une case et engager ─────────
const HELPERS = `
window.__findPath = function (targetId) {
  const run = G.dungeonRun;
  const tiles = run && run.map && run.map.tiles;
  if (!tiles || !tiles[targetId]) return null;
  const prev = { [run.pos]: null };
  const q = [run.pos];
  while (q.length) {
    const cur = q.shift();
    if (cur === targetId) break;
    const t = tiles[cur];
    if (!t) continue;
    for (const [dc, dr] of [[1,0],[-1,0],[0,-1],[0,1]]) {
      const n = tiles['c' + (t.col + dc) + 'r' + (t.row + dr)];
      if (n && !(n.id in prev) && n.type !== 'ladder') { prev[n.id] = cur; q.push(n.id); }
    }
  }
  if (!(targetId in prev)) return null;
  const path = [];
  let p = targetId;
  while (p) { path.unshift(p); p = prev[p]; }
  return path;
};
window.__findCombat = function () {
  const run = G.dungeonRun;
  const tiles = run && run.map && run.map.tiles;
  if (!tiles) return null;
  const isC = (t) => t && (t.type === 'combat' || t.type === 'elite') && !t.done;
  const prev = { [run.pos]: null };
  const q = [run.pos];
  while (q.length) {
    const cur = q.shift();
    const t = tiles[cur];
    if (!t) continue;
    if (isC(t) && cur !== run.pos) return cur;
    for (const [dc, dr] of [[1,0],[-1,0],[0,-1],[0,1]]) {
      const n = tiles['c' + (t.col + dc) + 'r' + (t.row + dr)];
      if (n && !(n.id in prev) && n.type !== 'ladder') { prev[n.id] = cur; q.push(n.id); }
    }
  }
  return null;
};
/** Marcher le plus près possible de la case de combat, puis la stepping.
 *  Renvoie l'état : { started, target, error? } */
window.__engageCombat = function () {
  const run = G.dungeonRun;
  if (!run || !run.map) return { error: 'pas de run/map' };
  if (globalThis.battle && globalThis.battle.active) return { started: true, already: true };
  const target = window.__findCombat();
  if (!target) return { error: 'aucune case de combat atteignable' };
  const path = window.__findPath(target);
  if (!path) return { error: 'pas de chemin vers ' + target };
  const tiles = run.map.tiles;
  for (let i = 1; i < path.length; i++) {
    const step = tiles[path[i]];
    if (!step) continue;
    if ((step.type === 'combat' || step.type === 'elite') && !step.done) break; // dernière étape
    window.dungeonMoveTo(path[i]);
  }
  const combat = tiles[target];
  if (!combat.revealed) return { error: 'case combat non révélée', pos: run.pos, target };
  window.dungeonMoveTo(target);
  return { started: !!(globalThis.battle && globalThis.battle.active), target };
};
/** Se rendre à la case du boss, en gagnant les combats bloquants.
 *  Renvoie { bossStarted? , fought?, battleActive, error? } */
window.__engageBoss = function () {
  const run = G.dungeonRun;
  if (!run || !run.map) return { error: 'pas de run/map' };
  if (globalThis.battle && globalThis.battle.active) return { battleActive: true, already: true };
  const tiles = run.map.tiles;
  const boss = Object.values(tiles).find((t) => t.type === 'boss' && !t.done);
  if (!boss) return { error: 'aucune case boss' };
  const path = window.__findPath(boss.id);
  if (!path) return { error: 'pas de chemin vers le boss' };
  for (let i = 1; i < path.length; i++) {
    const step = tiles[path[i]];
    if (!step) continue;
    if (step.id === boss.id) break;
    if ((step.type === 'combat' || step.type === 'elite') && !step.done) {
      window.dungeonMoveTo(step.id);   // combat bloquant : on s'engage
      return { fought: step.id, battleActive: !!(globalThis.battle && globalThis.battle.active) };
    }
    window.dungeonMoveTo(step.id);
  }
  if (!tiles[boss.id].revealed) return { error: 'boss non révélé', pos: run.pos };
  window.dungeonMoveTo(boss.id);
  return { bossStarted: !!(globalThis.battle && globalThis.battle.active), battleActive: !!(globalThis.battle && globalThis.battle.active), boss: boss.id };
};
`;

// ── Démarrage jeu ────────────────────────────────────────────────────────────
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText(/nouvelle partie/i).first().click();
await page.waitForTimeout(1200);
await page.getByText(/choisir/i).nth(1).click();
await page.waitForTimeout(2500);

async function gotoForest() {
  await page.evaluate(() => {
    window.gainDungeonTokens(5000);
    G.location = 'viridianforest';
    window.markVisited && window.markVisited('viridianforest');
    window.renderMap && window.renderMap();
    window.showTab && window.showTab('battle');
  });
  await page.waitForTimeout(600);
}

/** Gagner le combat en cours : PV ennemi à 0, attendre la résolution. */
async function winCurrentBattle(maxWaitMs = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxWaitMs) {
    const st = await page.evaluate(() => ({
      active: !!(globalThis.battle && globalThis.battle.active),
      wins: G.dungeonRun ? G.dungeonRun.totalWins : -1,
      enemyHP: globalThis.battle && globalThis.battle.enemyPoke ? globalThis.battle.enemyPoke.currentHP : -99,
    }));
    if (!st.active) return st;
    if (st.enemyHP > 0) {
      await page.evaluate(() => {
        const b = globalThis.battle;
        if (b && b.enemyPoke) b.enemyPoke.currentHP = 0;
      });
    }
    await page.waitForTimeout(400);
  }
  return await page.evaluate(() => ({ active: !!(globalThis.battle && globalThis.battle.active) }));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('══ SCÉNARIO A — run TERMINÉ (boss vaincu) puis ré-entrée ══');
// ════════════════════════════════════════════════════════════════════════════
await gotoForest();
await page.evaluate(HELPERS);
await page.evaluate(() => window.startDungeonRun('viridianforest'));
await page.waitForTimeout(600);

// RUN 1 — combat réel n°1
let r = await page.evaluate(() => window.__engageCombat());
console.log('  run1 combat 1:', JSON.stringify(r));
ok('A1 : combat réel n°1 démarre (run 1)', r.started === true);
if (r.started) {
  const w = await winCurrentBattle();
  ok('A2 : le combat n°1 est gagné et clôturé', w.active === false && w.wins >= 1);
}

// RUN 1 — marche vers le boss (combats bloquants gagnés au passage)
let bossStarted = false;
for (let i = 0; i < 30 && !bossStarted; i++) {
  r = await page.evaluate(() => window.__engageBoss());
  console.log('  A3[' + i + ']:', JSON.stringify(r));
  if (r.bossStarted) {
    const w = await winCurrentBattle(25000);
    bossStarted = (w.active === false);
    break;
  }
  if (r.battleActive) {
    const w = await winCurrentBattle();
    if (w.active) { ok('A3 : un combat bloquant a échoué', false); break; }
    continue;
  }
  if (r.error && /boss/i.test(r.error)) { ok('A3 : accès au boss impossible : ' + r.error, false); break; }
  if (r.error && /pas de run/i.test(r.error)) { ok('A3 : la run a disparu en cours de route', false); break; }
}
ok('A3 : le boss du run 1 s\'engage', bossStarted);
if (bossStarted) {
  const w = await winCurrentBattle(20000);
  ok('A4 : boss vaincu, run clôturé (G.dungeonRun === null)', w.active === false);
}

// RÉ-ENTRÉE
const reentry = await page.evaluate(() => {
  const before = G.dungeonRun;
  const run = window.startDungeonRun('viridianforest');
  return { hadRunLeft: !!before, newRun: !!run, floor: run && run.floor, depth: run && run.depth, map: !!(run && run.map) };
});
console.log('  ré-entrée:', JSON.stringify(reentry));
ok('A5 : ré-entrée ouverte (nouvelle run, nouvelle carte)', reentry.newRun && reentry.map);

await page.waitForTimeout(500);
r = await page.evaluate(() => window.__engageCombat());
console.log('  run2 combat 1:', JSON.stringify(r));
ok('A6 : APRÈS COMPLETION, un nouveau combat démarre au retour', r.started === true);

// état de diagnostic si échec
if (r.started !== true) {
  const diag = await page.evaluate(() => ({
    battleActive: !!(globalThis.battle && globalThis.battle.active),
    battlePaused: globalThis.battle && globalThis.battle.paused,
    battleChill: globalThis.battle && globalThis.battle.chill,
    pendingBoss: globalThis.battle && globalThis.battle.pendingDungeonBoss,
    run: G.dungeonRun && { active: G.dungeonRun.active, floor: G.dungeonRun.floor, pos: G.dungeonRun.pos, totalWins: G.dungeonRun.totalWins },
    msg: (document.getElementById('msg') || {}).textContent || '',
  }));
  console.log('  DIAG:', JSON.stringify(diag));
}

// ════════════════════════════════════════════════════════════════════════════
console.log('══ SCÉNARIO B — run PERDU (wipe) puis ré-entrée ══');
// ════════════════════════════════════════════════════════════════════════════
// Page fraîche (état de combat propre), on repart de zéro.
await page.evaluate(() => {
  G.dungeonRun = null;
  G.team.forEach((p) => { p.currentHP = p.maxHP; p.status = null; });
});
await gotoForest();
await page.evaluate(HELPERS);
await page.evaluate(() => window.startDungeonRun('viridianforest'));
await page.waitForTimeout(600);

// RUN 1 — combat réel, équipe sabrée → wipe
r = await page.evaluate(() => window.__engageCombat());
console.log('  runB combat 1:', JSON.stringify(r));
ok('B1 : combat réel démarre (run perdue)', r.started === true);
if (r.started) {
  await page.evaluate(() => {
    G.team.forEach((p) => { p.currentHP = 0; p.status = null; });
  });
  const t0 = Date.now();
  let wipeDone = false;
  while (Date.now() - t0 < 15000) {
    const st = await page.evaluate(() => ({
      noRun: G.dungeonRun === null,
      noBattle: !!(globalThis.battle && !globalThis.battle.active),
    }));
    wipeDone = st.noRun && st.noBattle;
    if (wipeDone) break;
    await page.waitForTimeout(400);
  }
  ok('B2 : l\'équipe K.O. clôture la run (wipe)', wipeDone);
  // La base soigne l'équipe avant de replonger.
  await page.evaluate(() => { G.team.forEach((p) => { p.currentHP = p.maxHP; p.status = null; }); });
}

const reentryB = await page.evaluate(() => window.startDungeonRun('viridianforest'));
ok('B3 : ré-entrée après wipe (nouvelle run)', !!reentryB && !!(reentryB.map));
await page.waitForTimeout(500);
r = await page.evaluate(() => window.__engageCombat());
console.log('  runB2 combat 1:', JSON.stringify(r));
ok('B4 : APRÈS Wipe, un nouveau combat démarre au retour', r.started === true);
if (r.started !== true) {
  const diag = await page.evaluate(() => ({
    battleActive: !!(globalThis.battle && globalThis.battle.active),
    battlePaused: globalThis.battle && globalThis.battle.paused,
    teamHP: G.team.map((p) => p.currentHP),
    msg: (document.getElementById('msg') || {}).textContent || '',
  }));
  console.log('  DIAG:', JSON.stringify(diag));
}

await page.screenshot({ path: '/home/user/shots/p39g-reeentry-donjon.png' });
await browser.close();

const bad = errs.filter((e) => !/favicon/i.test(e));
console.log('erreurs JS:', bad.length ? bad.join(' | ') : 'aucune');
process.exit(bad.length ? 1 : 0);
