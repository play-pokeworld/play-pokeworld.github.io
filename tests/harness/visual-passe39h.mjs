/**
 * Harnais visuel PASSE 39h — FIN D'EXPÉDITION : REPOS D'ÉQUIPE
 *   A. run gagnée (boss vaincu) : l'équipe, fatiguée pendant le run, est
 *      SOIGNÉE EN ENTIER à la victoire (PV complets + états purgés), et la
 *      ré-entrée repart avec une équipe en pleine forme ;
 *   B. pendant le run, AUCUN soin (règle 38e) ;
 *   C. run perdue (wipe) : l'équipe K.O. n'est PAS soignée (défaite = base),
 *      la ré-entrée est bloquée (garde-fou 39g) jusqu'au soin.
 * Usage : node tests/harness/visual-passe39h.mjs   (serveur dev sur :5173)
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

const weakenTeam = `(() => {
  G.team.forEach((p, i) => {
    p.currentHP = Math.max(1, Math.floor(p.maxHP * 0.35));
    if (i === 0) p.status = 'paralyze';
  });
  return true;
})()`;

const teamState = `G.team.map(p => ({ hp: p.currentHP, max: p.maxHP, status: p.status || null }))`;

const healTeam = `(() => {
  G.team.forEach(p => { p.currentHP = p.maxHP; p.status = null; p.statusTurns = 0; });
  return true;
})()`;

const __engageBoss = `
  window.__engageBoss = async function() {
    const G = globalThis.G;
    const run = G.dungeonRun;
    if (!run || !run.map) return { error: 'pas de run/map' };
    if (globalThis.battle && globalThis.battle.active) return { error: 'combat en cours' };
    const tiles = run.map.tiles;
    const boss = Object.values(tiles).find((t) => t.type === 'boss' && !t.done);
    if (!boss) return { error: 'aucune case boss' };
    const prev = { [run.pos]: null };
    const q = [run.pos];
    while (q.length) {
      const cur = q.shift();
      const t = tiles[cur];
      if (!t) continue;
      for (const [dc, dr] of [[1,0],[-1,0],[0,-1],[0,1]]) {
        const n = tiles['c' + (t.col + dc) + 'r' + (t.row + dr)];
        if (n && !(n.id in prev) && n.type !== 'ladder') { prev[n.id] = cur; q.push(n.id); }
      }
    }
    if (!(boss.id in prev)) return { error: 'boss non révélé' };
    const path = [];
    let p = boss.id;
    while (p) { path.unshift(p); p = prev[p]; }
    for (let i = 1; i < path.length; i++) {
      const step = tiles[path[i]];
      if (step.type === 'combat' || step.type === 'elite') {
        if (!step.done) { window.dungeonMoveTo(step.id); return { fought: step.id, battleActive: !!(globalThis.battle && globalThis.battle.active) }; }
      } else if (path[i] !== boss.id) {
        window.dungeonMoveTo(step.id);
      }
    }
    if (!boss.done) { window.dungeonMoveTo(boss.id); return { bossStarted: true, battleActive: !!(globalThis.battle && globalThis.battle.active), boss: boss.id }; }
    return { error: 'boss déjà soldé' };
  };
  true;
`;

const __engageCombat = `
  window.__engageCombat = async function() {
    const G = globalThis.G;
    const run = G.dungeonRun;
    if (!run || !run.map) return { error: 'pas de run/map' };
    if (globalThis.battle && globalThis.battle.active) return { started: true, already: true };
    const tiles = run.map.tiles;
    const combat = Object.values(tiles).find((t) => (t.type === 'combat' || t.type === 'elite') && !t.done);
    if (!combat) return { error: 'aucun combat' };
    const prev = { [run.pos]: null };
    const q = [run.pos];
    while (q.length) {
      const cur = q.shift();
      const t = tiles[cur];
      if (!t) continue;
      for (const [dc, dr] of [[1,0],[-1,0],[0,-1],[0,1]]) {
        const n = tiles['c' + (t.col + dc) + 'r' + (t.row + dr)];
        if (n && !(n.id in prev) && n.type !== 'ladder') { prev[n.id] = cur; q.push(n.id); }
      }
    }
    if (!(combat.id in prev)) return { error: 'combat non révélé' };
    const path = [];
    let p = combat.id;
    while (p) { path.unshift(p); p = prev[p]; }
    for (let i = 1; i < path.length; i++) {
      const step = tiles[path[i]];
      if ((step.type === 'combat' || step.type === 'elite') && !step.done) {
        window.dungeonMoveTo(step.id);
        return { started: !!(globalThis.battle && globalThis.battle.active), target: step.id };
      }
      if (path[i] !== combat.id) window.dungeonMoveTo(step.id);
    }
    return { error: 'combat injoignable' };
  };
  true;
`;

async function winCurrentBattle(maxWaitMs = 20000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < maxWaitMs) {
    last = await page.evaluate(() => ({
      active: !!(globalThis.battle && globalThis.battle.active),
      enemyHP: globalThis.battle && globalThis.battle.enemyPoke ? globalThis.battle.enemyPoke.currentHP : -99,
      noRun: G.dungeonRun === null,
    }));
    if (!last.active) break;
    if (last.enemyHP > 0) {
      await page.evaluate(() => {
        const b = globalThis.battle;
        if (b && b.enemyPoke && b.enemyPoke.currentHP > 0) b.enemyPoke.currentHP = 0;
      });
    }
    await page.waitForTimeout(400);
  }
  return last;
}

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText(/nouvelle partie/i).first().click();
await page.waitForTimeout(1200);
await page.getByText(/choisir/i).nth(1).click();
await page.waitForTimeout(2500);
await page.evaluate(() => {
  window.gainDungeonTokens(5000);
  G.location = 'viridianforest';
  window.markVisited && window.markVisited('viridianforest');
  window.renderMap && window.renderMap();
  window.showTab && window.showTab('battle');
});
await page.evaluate(__engageCombat);
await page.evaluate(__engageBoss);

console.log('══ A. RUN GAGNÉE → ÉQUIPE SOIGNÉE ══');
const r1 = await page.evaluate(() => window.startDungeonRun('viridianforest'));
ok('A1 : run 1 ouverte', !!r1 && !!r1.map);

await page.evaluate(weakenTeam);
let st = await page.evaluate(teamState);
console.log('  équipe usée:', JSON.stringify(st));

let r = await page.evaluate(() => window.__engageCombat());
console.log('  combat 1:', JSON.stringify(r));
if (r.started) await winCurrentBattle();
st = await page.evaluate(teamState);
const midRunHealed = st.every((p) => p.hp >= p.max);
ok('A2 : PENDANT le run, l\'équipe n\'est PAS soignée (règle 38e)', !midRunHealed);

await page.evaluate(weakenTeam);

let bossCleared = false;
for (let i = 0; i < 30 && !bossCleared; i++) {
  r = await page.evaluate(() => window.__engageBoss());
  if (r.bossStarted) {
    const w = await winCurrentBattle(30000);
    bossCleared = (w && w.noRun === true);
    break;
  }
  if (r.battleActive) {
    const w = await winCurrentBattle();
    if (w && w.active) { ok('A3 : combat bloquant raté', false); break; }
    continue;
  }
  if (r.error) { ok('A3 : accès boss impossible : ' + r.error, false); break; }
}
ok('A3 : boss vaincu, run close', bossCleared);

st = await page.evaluate(teamState);
console.log('  équipe après victoire:', JSON.stringify(st));
ok('A4 : APRÈS la victoire, l\'équipe est SOIGNÉE EN ENTIER (PV pleins + état purgé)',
  st.length > 0 && st.every((p) => p.hp === p.max && p.status === null));

const reentry = await page.evaluate(() => window.startDungeonRun('viridianforest'));
ok('A5 : ré-ouverte après victoire', !!reentry && !!reentry.map);
st = await page.evaluate(teamState);
ok('A6 : la NOUVELLE run démarre avec l\'équipe en pleine forme',
  st.length > 0 && st.every((p) => p.hp === p.max));

console.log('══ C. WIPE → PAS DE SOIN ══');
r = await page.evaluate(() => window.__engageCombat());
console.log('  combat (run perdue):', JSON.stringify(r));
if (!r.started) {
  await page.evaluate(() => window.dungeonAbandon());
  ok('C1 : combat engageable', false);
} else {
  await page.evaluate(() => { G.team.forEach(p => { p.currentHP = 0; }); });
  const t0 = Date.now();
  let wiped = false;
  while (Date.now() - t0 < 15000) {
    const s = await page.evaluate(() => ({
      noRun: G.dungeonRun === null,
      noBattle: !!(globalThis.battle && !globalThis.battle.active),
    }));
    wiped = s.noRun && s.noBattle;
    if (wiped) break;
    await page.waitForTimeout(400);
  }
  ok('C1 : wipe → run close', wiped);
  st = await page.evaluate(teamState);
  console.log('  équipe après wipe:', JSON.stringify(st));
  ok('C2 : APRÈS un wipe, l\'équipe n\'est PAS soignée (défaite = base)',
    st.length > 0 && st.every((p) => p.hp === 0));
  const blocked = await page.evaluate(() => window.startDungeonRun('viridianforest'));
  ok('C3 : ré-entrée bloquée équipe K.O. (garde-fou 39g)', blocked === null);
  await page.evaluate(healTeam);
  const again = await page.evaluate(() => window.startDungeonRun('viridianforest'));
  ok('C4 : après soin (base), la ré-entrée est possible', !!again && !!again.map);
}

await page.screenshot({ path: '/home/user/shots/p39h-team-rest.png' });
await browser.close();

const bad = errs.filter((e) => !/favicon/i.test(e));
console.log('erreurs JS:', bad.length ? bad.join(' | ') : 'aucune');
process.exit(bad.length ? 1 : 0);
