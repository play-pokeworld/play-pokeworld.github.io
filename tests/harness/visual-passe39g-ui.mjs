/**
 * Harnais visuel PASSE 39g (bis) — RENTRÉE EN DONJON via le VRAI UI
 * (bouton « Explorer » du panneau lieu + clics sur les tuiles du plateau),
 * exactement comme le joueur :
 *   1. run 1 : engager + gagner un combat par clics UI
 *   2. fermer la run (boss vaincu)
 *   3. ré-entrée via le bouton « Explorer »
 *   4. clic sur une tuile de combat → le combat DOIT démarrer
 * Usage : node tests/harness/visual-passe39g-ui.mjs   (serveur dev sur :5173)
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

async function winCurrentBattle(maxWaitMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxWaitMs) {
    const st = await page.evaluate(() => ({
      active: !!(globalThis.battle && globalThis.battle.active),
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

// Renvoie l'id de la tuile de combat la plus proche (côté page).
const findCombatNearby = () => `
  (() => {
    const run = G.dungeonRun;
    if (!run || !run.map) return null;
    const tiles = run.map.tiles;
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
  })()
`;

// Marcher (clics UI) jusqu'à être adjacent à une tuile de combat révélée.
async function uiWalkToCombat() {
  for (let hop = 0; hop < 40; hop++) {
    const info = await page.evaluate(`(() => {
      const run = G.dungeonRun;
      if (!run || !run.map) return { error: 'pas de run' };
      const tiles = run.map.tiles;
      const pos = tiles[run.pos];
      const near = [[1,0],[-1,0],[0,-1],[0,1]].map(([dc,dr]) => tiles['c'+(pos.col+dc)+'r'+(pos.row+dr)]).filter(Boolean);
      const combatNear = near.filter(t => (t.type==='combat'||t.type==='elite') && !t.done && t.revealed).map(t => t.id);
      const fogNear = near.filter(t => !t.revealed).map(t => t.id);
      const emptyNear = near.filter(t => t.revealed && !t.done && (t.type==='empty'||t.type==='chest')).map(t => t.id);
      return { pos: run.pos, combatNear, fogNear, emptyNear };
    })()`);
    if (info.error) return { error: info.error };
    if (info.combatNear.length) return { combat: info.combatNear[0] };
    const step = info.fogNear[0] || info.emptyNear[0] || null;
    if (!step) return { error: 'aucun pas possible', info };
    const sel = '.pw-dgn-grid button[data-call-args*="' + step + '"]';
    const btn = page.locator(sel).first();
    if (!(await btn.count())) return { error: 'bouton tuile introuvable ' + step };
    await btn.click();
    await page.waitForTimeout(350);
  }
  return { error: '40 pas sans trouver de combat' };
}

// Clic UI sur la tuile de combat.
async function uiClickCombat(tileId) {
  const sel = '.pw-dgn-grid button[data-call-args*="' + tileId + '"]';
  const btn = page.locator(sel).first();
  if (!(await btn.count())) return { error: 'bouton tuile introuvable ' + tileId };
  await btn.click();
  await page.waitForTimeout(700);
  return { battleActive: await page.evaluate(() => !!(globalThis.battle && globalThis.battle.active)) };
}

// ── Démarrage ────────────────────────────────────────────────────────────────
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText(/nouvelle partie/i).first().click();
await page.waitForTimeout(1200);
await page.getByText(/choisir/i).nth(1).click();
await page.waitForTimeout(2500);

// Aller à la Forêt de Jade par l'état (le déplacement UI carte région→lieu est
// indépendant du bug) et afficher l'onglet combat.
await page.evaluate(() => {
  window.gainDungeonTokens(5000);
  G.location = 'viridianforest';
  window.markVisited && window.markVisited('viridianforest');
  window.renderMap && window.renderMap();
  window.showTab && window.showTab('battle');
  const tc = document.getElementById('tab-content');
  if (tc && window.renderLocInfo) window.renderLocInfo(tc);
});
await page.waitForTimeout(800);

// ═══ RUN 1 — tout par l'UI ══════════════════════════════════════════════════
console.log('══ RUN 1 (vraie UI) ══');
// Entrée via le bouton « Explorer » du panneau lieu.
const exploreBtn = page.locator('#tab-content button', { hasText: /lancer l'expédition|explorer|combattre au palier/i }).first();
console.log('  bouton explorer présent:', (await exploreBtn.count()) > 0);
await exploreBtn.click();
await page.waitForTimeout(1000);
const run1 = await page.evaluate(() => {
  const r = G.dungeonRun;
  const bar = document.getElementById('battle-dungeon-bar');
  return { hasRun: !!r, map: !!(r && r.map), barHidden: bar ? bar.hidden : null };
});
ok('R1 : la run s\'ouvre via le bouton Explorer (carte rendue)', run1.hasRun && run1.map);

// Engager un combat par clics sur les tuiles.
let w1 = await uiWalkToCombat();
console.log('  marche UI:', JSON.stringify(w1));
if (w1.combat) {
  const c = await uiClickCombat(w1.combat);
  ok('R2 : clic sur la tuile de combat → combat démarre (run 1)', c.battleActive === true);
  if (c.battleActive) await winCurrentBattle();
} else {
  ok('R2 : clic sur la tuile de combat → combat démarre (run 1)', false);
}

// Le premier engagement passe-t-il aussi par le BOUTON « Combattre » du bandeau ?
const btnFight = page.locator('#battle-dungeon-bar button', { hasText: /engager l'expédition/i }).first();
console.log('  bouton « Engager l\'expédition » présent après un combat gagné:', (await btnFight.count()) > 0);
// (le bouton n'existe qu'avec totalWins === 0 — il devrait avoir disparu)

// Boss : on marche jusqu'à lui par l'UI (le chemin passe par des combats : on les gagne).
let bossDone = false;
for (let i = 0; i < 25 && !bossDone; i++) {
  const info = await page.evaluate(`(() => {
    const run = G.dungeonRun;
    if (!run || !run.map) return { error: 'pas de run' };
    const tiles = run.map.tiles;
    const pos = tiles[run.pos];
    const near = [[1,0],[-1,0],[0,-1],[0,1]].map(([dc,dr]) => tiles['c'+(pos.col+dc)+'r'+(pos.row+dr)]).filter(Boolean);
    const combatNear = near.filter(t => (t.type==='combat'||t.type==='elite') && !t.done && t.revealed).map(t => t.id);
    const bossNear = near.filter(t => t.type==='boss' && !t.done && t.revealed).map(t => t.id);
    const fogNear = near.filter(t => !t.revealed).map(t => t.id);
    const emptyNear = near.filter(t => t.revealed && !t.done && (t.type==='empty'||t.type==='chest')).map(t => t.id);
    return { pos: run.pos, combatNear, bossNear, fogNear, emptyNear };
  })()`);
  if (info.error) break;
  if (info.bossNear.length) {
    const c = await uiClickCombat(info.bossNear[0]);
    console.log('  boss engagé (itér ' + i + '):', JSON.stringify(c));
    if (c.battleActive) await winCurrentBattle(25000);
    bossDone = true;
    break;
  }
  const step = info.combatNear[0] || info.fogNear[0] || info.emptyNear[0];
  if (!step) break;
  const sel = '.pw-dgn-grid button[data-call-args*="' + step + '"]';
  const btn = page.locator(sel).first();
  if (!(await btn.count())) break;
  await btn.click();
  await page.waitForTimeout(500);
  const act = await page.evaluate(() => !!(globalThis.battle && globalThis.battle.active));
  if (act) await winCurrentBattle();
}
const afterBoss = await page.evaluate(() => ({
  run: !!G.dungeonRun,
  battle: !!(globalThis.battle && globalThis.battle.active),
  clears: G.dungeonClears || {},
}));
console.log('  après boss:', JSON.stringify(afterBoss));
ok('R3 : boss vaincu → run close', afterBoss.run === false && afterBoss.battle === false);

// ═══ RÉ-ENTRÉE — tout par l'UI ══════════════════════════════════════════════
console.log('══ RÉ-ENTRÉE (vraie UI) ══');
await page.waitForTimeout(800);
// Le résumé modal est peut-être ouvert : le fermer.
await page.evaluate(() => { if (typeof window.closeBattleSummary === 'function') window.closeBattleSummary(); });
await page.waitForTimeout(400);

const exploreBtn2 = page.locator('#tab-content button', { hasText: /lancer l'expédition|explorer|combattre au palier/i }).first();
console.log('  bouton explorer présent (ré-entrée):', (await exploreBtn2.count()) > 0);
await exploreBtn2.click();
await page.waitForTimeout(1200);
const run2 = await page.evaluate(() => {
  const r = G.dungeonRun;
  const bar = document.getElementById('battle-dungeon-bar');
  const grid = bar ? bar.querySelector('.pw-dgn-grid') : null;
  return {
    hasRun: !!r,
    map: !!(r && r.map),
    barHidden: bar ? bar.hidden : null,
    gridVisible: !!grid,
    tiles: grid ? grid.querySelectorAll('button').length : 0,
    battleActive: !!(globalThis.battle && globalThis.battle.active),
  };
});
console.log('  ré-entrée:', JSON.stringify(run2));
ok('RE1 : ré-entrée via Explorer → nouvelle carte', run2.hasRun && run2.map && run2.tiles > 0);

// Le bouton « Combattre » du bandeau (totalWins === 0 au retour).
const btnFight2 = page.locator('#battle-dungeon-bar button', { hasText: /engager l'expédition/i }).first();
const hasFightBtn = (await btnFight2.count()) > 0;
console.log('  bouton « Engager l\'expédition » présent (ré-entrée):', hasFightBtn);
if (hasFightBtn) {
  await btnFight2.click();
  await page.waitForTimeout(900);
  const st = await page.evaluate(() => ({
    battleActive: !!(globalThis.battle && globalThis.battle.active),
    pos: G.dungeonRun && G.dungeonRun.pos,
    totalWins: G.dungeonRun && G.dungeonRun.totalWins,
    msg: (document.getElementById('msg') || {}).textContent || '',
  }));
  console.log('  après clic « Combattre »:', JSON.stringify(st));
  ok('RE2 : le bouton « Engager l\'expédition » démarre un combat', st.battleActive === true);
  if (st.battleActive) await winCurrentBattle();
} else {
  ok('RE2 : le bouton « Engager l\'expédition » démarre un combat (absent !)', false);
}

// Et le chemin « marche + clic tuile » après ré-entrée.
w1 = await uiWalkToCombat();
console.log('  marche UI (ré-entrée):', JSON.stringify(w1));
if (w1.combat) {
  const c = await uiClickCombat(w1.combat);
  ok('RE3 : clic sur une tuile de combat → combat démarre (ré-entrée)', c.battleActive === true);
} else {
  ok('RE3 : clic sur une tuile de combat → combat démarre (ré-entrée)', false);
}

await page.screenshot({ path: '/home/user/shots/p39g-reeentry-ui.png' });
await browser.close();

const bad = errs.filter((e) => !/favicon/i.test(e));
console.log('erreurs JS:', bad.length ? bad.join(' | ') : 'aucune');
process.exit(bad.length ? 1 : 0);
