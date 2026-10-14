/**
 * Harnais visuel PASSE 38g — 3 retours joueur :
 *   1. FAUNE DU LIEU : la composition d'un donjon suit la rareté de la zone —
 *      le boss est le RARE (Forêt de Jade → Pikachu #25, jamais Raichu #26),
 *      les élites sont des PEU COMMUNS, les combats sont des COMMUNS ;
 *   2. ROAMING : aucun légendaire errant en zone donjon (getRoamingLegendaryForRoute
 *      renvoie null pour un lieu de type dungeon) ;
 *   3. BARRES : à plein PV la barre est à 100 % et stable, même avec des PV
 *      flottants (45,9999/46) — texte et barre partagent les mêmes entiers.
 * Usage : node tests/harness/visual-passe38g.mjs   (serveur dev sur :5173)
 */
import { chromium } from 'playwright';

const URL = process.env.PW_URL || 'http://localhost:5173/';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(25000);

const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

const ok = (label, cond) => console.log((cond ? '  ✔ ' : '  ✘ ') + label);

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText(/nouvelle partie/i).first().click();
await page.waitForTimeout(1200);
await page.getByText(/choisir/i).nth(1).click();
await page.waitForTimeout(2500);

// ── PRÉPARATION : entrer à la Forêt de Jade (type dungeon, rare = #25) ──────
await page.evaluate(() => {
  window.gainDungeonTokens(5000);
  G.location = 'viridianforest';
  window.markVisited && window.markVisited('viridianforest');
  window.renderMap && window.renderMap();
  window.showTab && window.showTab('battle');
});
await page.waitForTimeout(800);

// ── 2) ROAMING : un donjon n'accueille aucun errant ─────────────────────────
const roam = await page.evaluate(() => {
  const inDungeon = (typeof window.getRoamingLegendaryForRoute === 'function')
    ? window.getRoamingLegendaryForRoute('viridianforest') : 'fn-missing';
  const onRoute = (typeof window.getRoamingLegendaryForRoute === 'function')
    ? window.getRoamingLegendaryForRoute('route2') : 'fn-missing';
  return { inDungeon, onRoute };
});
console.log('  roaming — donjon:', roam.inDungeon, '· route:', roam.onRoute);
ok('PASSE 38g : aucun errant en donjon (null)', roam.inDungeon === null);
ok('PASSE 38g : la route extérieure reste un pool errant valide',
  roam.onRoute === null || typeof roam.onRoute === 'number');

// ── Pilote de vie de run pour la probe : clôturer proprement un run ────────
// (le vrai jeu clôt le run à la victoire du gardien / au wipe ; ici on force)
async function closeRun() {
  await page.evaluate(() => {
    try { if (typeof window.endBattle === 'function') window.endBattle(); } catch (_) {}
    const b = globalThis.battle;
    if (b) { b.active = false; b.pendingDungeonBoss = false; }
    G.dungeonRun = null;
  });
  await page.waitForTimeout(300);
}
async function startFreshRun() {
  await page.evaluate(() => window.startDungeonRun('viridianforest'));
  await page.waitForTimeout(800);
}
async function fightTile(type) {
  const tid = await page.evaluate((t) => {
    const run = G.dungeonRun;
    if (!run || !run.map) return null;
    const tile = Object.values(run.map.tiles).find((x) => x.type === t && !x.done);
    if (!tile) return null;
    tile.revealed = true;
    window.dungeonMoveTo(tile.id);
    return tile.id;
  }, type);
  await page.waitForTimeout(1400);
  const enemy = await page.evaluate(() => {
    const b = globalThis.battle;
    return b && b.enemyPoke ? { id: b.enemyPoke.id, name: b.enemyPoke.name } : null;
  });
  return { tid, enemy };
}

// ── 1) FAUNE : le boss = RARE du lieu (Pikachu #25, pas Raichu #26) ─────────
await startFreshRun();
const bossId = await page.evaluate(() => G.dungeonRun && G.dungeonRun.bossTile);
const bossFight = await page.evaluate((id) => {
  const run = G.dungeonRun;
  if (!run || !run.map || !run.map.tiles[id]) return { err: 'no-tile' };
  run.map.tiles[id].revealed = true;
  window.dungeonMoveTo(id);
  return { pending: run.pendingNode === id };
}, bossId);
await page.waitForTimeout(1500);
const bossEnemy = await page.evaluate(() => {
  const b = globalThis.battle;
  return b && b.enemyPoke ? { id: b.enemyPoke.id, name: b.enemyPoke.name } : null;
});
console.log('  boss engagé:', JSON.stringify(bossFight), '· ennemi:', JSON.stringify(bossEnemy));
ok('PASSE 38g : le gardien est le RARE de la zone (Pikachu #25)', bossEnemy && bossEnemy.id === 25);
ok('PASSE 38g : jamais Raichu (#26, absent du lieu)', bossEnemy && bossEnemy.id !== 26);
await closeRun();

// ── 1b) ÉLITE → PEU COMMUN (#11/#14) ───────────────────────────────────────
await startFreshRun();
const elite = await fightTile('elite');
console.log('  élite:', JSON.stringify(elite.enemy));
ok('PASSE 38g : case ÉLITE → PEU COMMUN de la zone (#11/#14)',
  elite.enemy && [11, 14].includes(elite.enemy.id));
await closeRun();

// ── 1c) COMBAT → COMMUN (#10/#13) + 3) BARRES à plein PV ───────────────────
await startFreshRun();
const combat = await fightTile('combat');
console.log('  combat:', JSON.stringify(combat.enemy));
ok('PASSE 38g : case COMBAT → COMMUN de la zone (#10/#13)',
  combat.enemy && [10, 13].includes(combat.enemy.id));

const hpBar = await page.evaluate(() => {
  const b = globalThis.battle;
  if (!b || !b.active) return { err: 'no-battle' };
  const cards = [...document.querySelectorAll('.poke-card')].map((el) => ({
    text: (el.querySelector('.hp-text') || {}).textContent || '',
    width: (el.querySelector('.hp-fill') || {}).style ? el.querySelector('.hp-fill').style.width : '',
  }));
  return {
    cards,
    floatCase: typeof globalThis.hpBarPct === 'function' ? globalThis.hpBarPct(45.9999, 46) : null,
  };
});
await page.waitForTimeout(500);
const hpBar2 = await page.evaluate(() =>
  [...document.querySelectorAll('.poke-card')].map((el) => ({
    text: (el.querySelector('.hp-text') || {}).textContent || '',
    width: (el.querySelector('.hp-fill') || {}).style ? el.querySelector('.hp-fill').style.width : '',
  }))
);
console.log('  barres t0:', JSON.stringify(hpBar.cards), '· t+500ms:', JSON.stringify(hpBar2));
if (hpBar.err) { ok('PASSE 38g : combat actif pour lire la barre', false); }
else {
  ok('PASSE 38g : PV flottants 45,9999/46 → barre 100 %', hpBar.floatCase === 1);
  const full = hpBar.cards.filter((c) => c.width === '100%');
  ok('PASSE 38g : au moins un Pokémon plein affiche une barre à 100 %', full.length > 0);
  // pas d'oscillation : tant que le TEXTE affiché n'a pas changé, la barre
  // reste identique (texte et barre partagent les mêmes PV entiers)
  const stablePairs = hpBar.cards.map((c, i) => {
    const c2 = hpBar2[i];
    return c.text === c2.text ? c.width === c2.width : true; // texte changé = vrais dégâts
  });
  const unchanged = hpBar.cards.filter((c, i) => hpBar2[i] && c.text === hpBar2[i].text).length;
  ok('PASSE 38g : barres stables tant que les PV affichés ne changent pas',
    stablePairs.every(Boolean) && unchanged > 0);
}

await page.screenshot({ path: '/home/user/shots/p38g-faune-boss-barres.png' });
await browser.close();

const bad = errs.filter((e) => !/favicon/i.test(e));
console.log('erreurs JS:', bad.length ? bad.join(' | ') : 'aucune');
process.exit(bad.length ? 1 : 0);
