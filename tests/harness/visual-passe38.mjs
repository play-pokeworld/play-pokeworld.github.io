/**
 * Harnais visuel PASSE 38 — trois retours joueur :
 *   1. paysage : rochers DEVANT et DERRIÈRE la végétation (3 couches) ;
 *   2. donjon : visibilité des cases (brouillard, vide, élite, boss) ;
 *   3. donjon : la carte SOUS le combat — le combat monte en haut, puis la
 *      carte remonte quand il se termine.
 * Usage : node tests/harness/visual-passe38.mjs   (serveur dev sur :5173)
 */
import { chromium } from 'playwright';

const URL = process.env.PW_URL || 'http://localhost:5173/';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
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

// ── 1) PAYSAGE : les 3 couches existent et sont aux bonnes hauteurs ────────
const fg = await page.evaluate(() => {
  const el = document.getElementById('pw-land-fg');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    z: cs.zIndex,
    maskPos: cs.maskPosition,
    pointerEvents: cs.pointerEvents,
    bg: cs.backgroundImage.split(',')[0].slice(0, 60),
  };
});
ok('couche #pw-land-fg présente (rochers devant)', !!fg);
if (fg) {
  ok('z-index -1 (devant la végétation)', fg.z === '-1');
  ok('pointer-events none', fg.pointerEvents === 'none');
  console.log('  mask-position:', fg.maskPos);
}
const layers = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  return {
    grass: root.getPropertyValue('--pw-land-h-grass').trim(),
    ground: root.getPropertyValue('--pw-land-h-ground').trim(),
    bgBefore: getComputedStyle(document.documentElement, '::before').maskPosition,
    bgAfter: getComputedStyle(document.documentElement, '::after').maskPosition,
  };
});
console.log('  lignes — herbe:', layers.grass, '· sol:', layers.ground);
console.log('  arrière-plan (html::before):', layers.bgBefore);
console.log('  végétation (html::after):', layers.bgAfter);
await page.screenshot({ path: '/home/user/shots/p38-paysage-3profondeurs.png' });

// ── 2) DONJON : entrer, ouvrir l'expédition, lire la grille ─────────────────
await page.evaluate(() => {
  window.gainDungeonTokens(5000);
  G.location = 'mtmoon';
  window.markVisited && window.markVisited('mtmoon');
  window.renderMap && window.renderMap();
  window.showTab && window.showTab('battle');
});
await page.waitForTimeout(800);
await page.evaluate(() => window.startDungeonRun('mtmoon'));
await page.waitForTimeout(800);

const grid = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile')];
  const run = G.dungeonRun;
  return {
    total: tiles.length,
    expected: run ? run.map.cols * run.map.rows : 0,
    fog: tiles.filter((t) => t.classList.contains('is-fog')).length,
    here: tiles.filter((t) => t.classList.contains('is-here')).length,
    legend: document.querySelectorAll('#battle-dungeon-bar .pw-bdg-legend').length,
  };
});
console.log('grille:', JSON.stringify(grid));
ok(grid.expected + ' tuiles rendues (grille progressive)', grid.total === grid.expected);
ok('brouillard en place', grid.fog > 0);
ok('position marquée', grid.here === 1);
ok('PASSE 38c : plus de légende (les cases sont explicites seules)', grid.legend === 0);
await page.screenshot({ path: '/home/user/shots/p38-grille-visibilite.png' });

// ── 3) LA CARTE SOUS LE COMBAT ──────────────────────────────────────────────
// état avant combat : la carte doit être EN HAUT de la fenêtre de combat
const before = await page.evaluate(() => {
  const scene = document.getElementById('battle-active-scene');
  const bar = document.getElementById('battle-dungeon-bar');
  const sr = scene.getBoundingClientRect();
  const br = bar.getBoundingClientRect();
  return {
    sceneTop: Math.round(sr.top), barTop: Math.round(br.top),
    sceneOrder: getComputedStyle(scene).order, barOrder: getComputedStyle(bar).order,
    sceneVisible: getComputedStyle(scene).display !== 'none',
  };
});
ok('hors combat : la carte est en haut de la fenêtre',
  !before.sceneVisible || before.barTop <= before.sceneTop);

// marche vers un combat voisin → un combat démarre (la scène se met en vie).
// PASSE 38 : la zone de départ est volontairement SANS combat (la première
// case est vide), il faut donc traverser des cases vides révélées jusqu'à
// ce qu'un combat devienne adjacent — c'est le vrai gameplay.
const engaged = await page.evaluate(() => {
  const run = G.dungeonRun;
  const b = globalThis.battle;
  for (let guard = 0; guard < 30; guard++) {
    const here = run.map.tiles[run.pos];
    const near = Object.values(run.map.tiles)
      .filter((t) => Math.abs(t.col - here.col) + Math.abs(t.row - here.row) === 1 && !t.done);
    const fight = near.find((t) => t.type === 'combat' || t.type === 'elite');
    if (fight) {
      window.dungeonMoveTo(fight.id);
      return { moved: true, target: fight.id, battleActive: !!(b && b.active) };
    }
    const step = near.find((t) => t.revealed) || near[0];
    if (!step) break;
    window.dungeonMoveTo(step.id);
  }
  return { moved: false, battleActive: !!(b && b.active) };
});
console.log('engagement:', JSON.stringify(engaged));
// laisse le combat démarrer (scène is-live), puis gonfle les PV de l'ennemi
// pour que la scène reste affichée le temps de la mesure (sinon le combat se
// termine en 2 secondes avec l'équipe de départ).
await page.waitForFunction(() => {
  const s = document.getElementById('battle-active-scene');
  return !!(s && s.classList.contains('is-live'));
}, { timeout: 15000 });
await page.evaluate(() => {
  const b = globalThis.battle;
  if (b && b.enemyPoke) { b.enemyPoke.maxHP = b.enemyPoke.currentHP = 999999; }
});
await page.waitForTimeout(400);

const during = await page.evaluate(() => {
  const scene = document.getElementById('battle-active-scene');
  const bar = document.getElementById('battle-dungeon-bar');
  const sr = scene.getBoundingClientRect();
  const br = bar.getBoundingClientRect();
  return {
    sceneTop: Math.round(sr.top), barTop: Math.round(br.top),
    sceneVisible: getComputedStyle(scene).display !== 'none',
    sceneOrder: getComputedStyle(scene).order, barOrder: getComputedStyle(bar).order,
    live: scene.classList.contains('is-live'),
  };
});
console.log('pendant le combat:', JSON.stringify(during));
ok('pendant le combat : la scène est visible', during.sceneVisible);
ok('pendant le combat : la scène est EN HAUT, la carte dessous', during.sceneTop < during.barTop);
await page.screenshot({ path: '/home/user/shots/p38-carte-sous-combat.png' });

// fin de combat → la carte remonte
await page.evaluate(() => {
  const b = globalThis.battle;
  if (b && b.active) { b.chill = true; window.endBattle && window.endBattle(); }
});
await page.waitForTimeout(1200);
const after = await page.evaluate(() => {
  const scene = document.getElementById('battle-active-scene');
  const bar = document.getElementById('battle-dungeon-bar');
  return {
    sceneVisible: getComputedStyle(scene).display !== 'none',
    barTop: Math.round(bar.getBoundingClientRect().top),
  };
});
ok('fin de combat : la carte est de nouveau en haut', !after.sceneVisible && after.barTop >= 0);
await page.screenshot({ path: '/home/user/shots/p38-carte-revenue-en-haut.png' });

console.log('erreurs JS:', errs.length ? errs : 'aucune');
await browser.close();
process.exit(errs.length ? 1 : 0);
