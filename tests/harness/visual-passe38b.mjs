/**
 * Harnais visuel PASSE 38b — les 5 retours joueur :
 *   1. paysage : la ligne de rochers lointains au MÊME niveau que le sol ;
 *   2. icône : la barre de titre affiche l'Icon.png du joueur ;
 *   3. donjon : entrée en bas au milieu, vide, brouillard de guerre (voisines
 *      visibles), téléportation vers toute case visible ;
 *   4. donjon : assets images (pokéball combat, boss, coffre, échelle) +
 *      sprite PNJ du joueur sur la case courante ;
 *   5. affichage : header sticky au scroll, colonnes latérales ≤ moitié de la
 *      colonne centrale sur grand écran.
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

// ── 1) PAYSAGE : la frise lointaine est sur la ligne de sol ─────────────────
const land = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const ground = parseFloat(root.getPropertyValue('--pw-land-h-ground')); // en vh
  const before = getComputedStyle(document.documentElement, '::before');
  const after = getComputedStyle(document.documentElement, '::after');
  const fg = getComputedStyle(document.getElementById('pw-land-fg'));
  const vh = window.innerHeight;
  const posToY = (pos) => {
    // maskPosition = "X Y" (ex: "0px 854px") — on lit la VALEUR Y.
    const parts = pos.trim().split(/\s+/);
    const m = parts.length > 1 ? parts[1].match(/(\d+(?:\.\d+)?)px/) : null;
    return m ? parseFloat(m[1]) : null;
  };
  return {
    groundPx: Math.round(ground / 100 * vh),
    rocksPos: posToY(before.maskPosition),
    vegPos: posToY(after.maskPosition),
    fgPos: posToY(fg.maskPosition),
    rocksSize: before.maskSize,
  };
});
console.log('PAYSAGE — ligne de sol à', land.groundPx + 'px:');
ok('rochers lointains posés sur la ligne de sol (et non ~16vh plus haut)',
  Math.abs(land.rocksPos - (land.groundPx - 26)) < 4);
ok('végétation sur la ligne de sol', Math.abs(land.vegPos - (land.groundPx - 64)) < 4);
ok('rochers de premier plan sur la ligne de sol', Math.abs(land.fgPos - (land.groundPx - 38)) < 4);
await page.screenshot({ path: '/home/user/shots/p38b-paysage.png' });

// ── 2) ICÔNE : le brand-mark est une <img> vers Icon.png ────────────────────
await page.waitForFunction(() => {
  const img = document.querySelector('#header .brand-mark img');
  return !!img && img.complete && img.naturalWidth > 0;
}, { timeout: 15000 });
const brand = await page.evaluate(() => {
  const img = document.querySelector('#header .brand-mark img');
  if (!img) return null;
  return { src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight, loaded: img.complete };
});
ok('barre de titre : <img> Icon.png (plus de pokéball SVG)', !!brand);
if (brand) {
  ok('icône chargée (' + brand.src + ')', brand.loaded && brand.w > 0);
}
// vérification réseau : le fichier est bien servi (200 + PNG)
const resp = await page.request.get('http://localhost:5173/src/assets/images/Icon.png');
const body = await resp.body();
ok('Icon.png servi (HTTP ' + resp.status() + ', ' + body.length + ' o.)', resp.status() === 200 && body.length > 1000);

// ── 3) DONJON : entrée bas/milieu, vide, brouillard, téléportation ──────────
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

const dg = await page.evaluate(() => {
  const run = G.dungeonRun;
  const tiles = [...document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile')];
  const start = run.map.tiles[run.pos];
  const near = Object.values(run.map.tiles).filter((t) => Math.abs(t.col - start.col) + Math.abs(t.row - start.row) === 1);
  const here = document.querySelector('#battle-dungeon-bar .pw-dgn-tile.is-here');
  return {
    pos: run.pos,
    expectedStart: 'c' + Math.floor(run.map.cols / 2) + 'r' + (run.map.rows - 1),
    cols: run.map.cols,
    rows: run.map.rows,
    startType: start.type,
    revealed: Object.values(run.map.tiles).filter((t) => t.revealed).length,
    nearNoCombat: near.every((t) => t.type !== 'combat' && t.type !== 'elite'),
    tiles: tiles.length,
    fog: tiles.filter((t) => t.classList.contains('is-fog')).length,
    bossGuards: (() => {
      const bt = run.map.tiles[run.bossTile];
      return [[1, 0], [-1, 0], [0, -1], [0, 1]]
        .map(([dc, dr]) => run.map.tiles['c' + (bt.col + dc) + 'r' + (bt.row + dr)])
        .filter(Boolean)
        .every((t) => t.type === 'combat' || t.type === 'elite');
    })(),
    hereImg: here ? here.querySelector('img')?.getAttribute('src') : null,
    hereBtnIsOpen: here ? here.classList.contains('is-open') : false,
    legend: !!document.querySelector('#battle-dungeon-bar .pw-bdg-legend'),
    // PASSE 39e — la réglette COMMUNE (#battle-loot-inline) sous la carte
    loot: !!document.getElementById('battle-loot-inline'),
    lootVisible: (() => {
      const row = document.getElementById('battle-loot-row');
      return row ? getComputedStyle(row).display !== 'none' : false;
    })(),
    lootBelowMap: (() => {
      const bar = document.getElementById('battle-dungeon-bar');
      const row = document.getElementById('battle-loot-row');
      if (!bar || !row) return false;
      const b = bar.getBoundingClientRect();
      const r = row.getBoundingClientRect();
      return r.top >= b.bottom - 2;
    })(),
  };
});
console.log('DONJON — grille', dg.cols + '×' + dg.rows, '· entrée:', dg.pos, '· type:', dg.startType, '· révélées:', dg.revealed, '· brouillard:', dg.fog);
ok('grille progressive (mtmoon badgeReq 1 → 8×5, PASSE 39d)', dg.cols === 8 && dg.rows === 5);
ok('entrée EN BAS AU MILIEU (' + dg.expectedStart + ')', dg.pos === dg.expectedStart);
ok('première case VIDE', dg.startType === 'empty');
ok('brouillard de guerre : ≥ 4 cases visibles d\'entrée', dg.revealed >= 4);
ok('zone de départ sans combat', dg.nearNoCombat);
ok(dg.cols * dg.rows + ' tuiles dont du brouillard', dg.tiles === dg.cols * dg.rows && dg.fog > 0);
ok('boss GARDÉ : toutes ses voisines sont des combats', dg.bossGuards);
ok('plus de légende sous la carte', !dg.legend);
ok('butin du donjon sous la carte (réglette commune visible)', dg.loot && dg.lootVisible && dg.lootBelowMap);
ok('sprite PNJ du joueur sur la case courante', dg.hereImg === 'src/assets/images/trainers/profil/trainer-54.png');

// téléportation : marche sur une case visible, puis saute vers une autre visible
const tele = await page.evaluate(() => {
  const run = G.dungeonRun;
  const visible = Object.values(run.map.tiles).filter((t) => t.revealed && t.id !== run.pos);
  if (!visible.length) return { ok: false, why: 'aucune case visible lointaine' };
  const target = visible[visible.length - 1];
  window.dungeonMoveTo(target.id);
  return { ok: run.pos === target.id, target: target.id, now: run.pos };
});
ok('téléportation vers une case visible (' + tele.target + ')', tele.ok);
await page.screenshot({ path: '/home/user/shots/p38b-donjon.png' });

// ── 4) ASSETS : glyphes monochromes teintés sur les tuiles révélées ────────
const icons = await page.evaluate(() => {
  const run = G.dungeonRun;
  for (const t of Object.values(run.map.tiles)) t.revealed = true;
  window.refreshDungeonPanel();
  const out = {};
  for (const el of document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile')) {
    const cls = [...el.classList].find((c) => c.startsWith('t-'));
    const glyph = el.querySelector('.pw-dgn-ic');
    if (glyph && !out[cls]) {
      const m = (glyph.getAttribute('style') || '').match(/--ic:url\('([^']+)'\)/);
      out[cls] = m ? m[1] : null;
    }
    if (!out[cls + ':empty'] && cls && !glyph && !el.classList.contains('is-here')) {
      out[cls + ':empty'] = el.textContent.trim();
    }
  }
  return out;
});
console.log('ICÔNES:', JSON.stringify(icons));
// PASSE 39 — le sprite est passé en URL ABSOLUE (sinon le masque CSS résout
// l'url() par rapport à la feuille de style → 404 → icônes invisibles). On
// compare donc sur la partie utile du chemin.
const norm = (u) => (u || '').split('/src/').pop();
// PASSE 38e — la case combat utilise la POKÉBALL de la barre de titre
// (pokeball.svg), l'élite superpose une étoile, boss/coffre/échelle gardent
// leurs silhouettes Pokéclicker.
ok('combat → pokeball.svg (icône de la barre de titre)',
  norm(icons['t-combat']) === 'assets/images/dungeon/pokeball.svg');
ok('boss → boss.png', norm(icons['t-boss']) === 'assets/images/dungeon/boss.png');
ok('coffre → chest.png', norm(icons['t-chest']) === 'assets/images/dungeon/chest.png');
// PASSE 38e — CINQ couleurs distinctes : combat violet, élite orange, coffre
// or, boss ROUGE, échelle bleue (retours : « le boss n'est plus rouge »,
// « les cases combats et coffres ont les mêmes couleurs »).
const tint = await page.evaluate(() => {
  const colorOf = (cls) => {
    const el = document.querySelector('#battle-dungeon-bar .pw-dgn-tile.' + cls + ' .pw-dgn-ic');
    return el ? getComputedStyle(el).backgroundColor : null;
  };
  return { combat: colorOf('t-combat'), elite: colorOf('t-elite'), boss: colorOf('t-boss'), chest: colorOf('t-chest'), ladder: colorOf('t-ladder') };
});
console.log('TEINTE:', JSON.stringify(tint));
ok('le BOSS est ROUGE (' + tint.boss + ') ≠ combat',
  !!tint.boss && tint.boss !== tint.combat && /rgb\(2\d\d,\s*\d+,\s*\d+\)/.test(tint.boss));
ok('combat ≠ coffre (' + tint.combat + ' vs ' + tint.chest + ')',
  !!tint.combat && !!tint.chest && tint.combat !== tint.chest);
ok('élite ≠ combat ≠ boss (' + tint.elite + ')',
  !!tint.elite && tint.elite !== tint.combat && tint.elite !== tint.boss);
await page.screenshot({ path: '/home/user/shots/p38b-assets.png' });

// ── 5) HEADER STICKY + COLONNES ─────────────────────────────────────────────
// sticky : on scroll la page, le header reste en haut
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(300);
const sticky = await page.evaluate(() => {
  const h = document.getElementById('header');
  const r = h.getBoundingClientRect();
  const cs = getComputedStyle(h);
  return { top: Math.round(r.top), pos: cs.position, z: cs.zIndex };
});
ok('header sticky : toujours visible après scroll (top=0, pos=' + sticky.pos + ')', sticky.pos === 'sticky' && sticky.top === 0);

// colonnes : sur 1600px de large, latérales ≤ 50% de la centrale
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
const cols = await page.evaluate(() => {
  const c1 = document.getElementById('col-1').getBoundingClientRect().width;
  const c2 = document.getElementById('col-2').getBoundingClientRect().width;
  const c3 = document.getElementById('col-3').getBoundingClientRect().width;
  return { c1: Math.round(c1), c2: Math.round(c2), c3: Math.round(c3) };
});
console.log('COLONNES @1600px:', JSON.stringify(cols));
ok('col-1 ≤ moitié de col-2', cols.c1 <= cols.c2 / 2 + 2);
ok('col-3 ≤ moitié de col-2', cols.c3 <= cols.c2 / 2 + 2);
ok('col-2 est la plus large', cols.c2 > cols.c1 && cols.c2 > cols.c3);

// PASSE 38c — re-mesure sur écrans PLUS LARGES QUE 16/9 (retour joueur) :
// les latérales ne doivent JAMAIS dépasser la moitié de la centrale.
// PASSE 39 — la colonne CENTRALE garde la MÊME largeur qu'en 16/9 : le
// contenu est plafonné à la largeur de référence et centré (plus de menus
// étirés sur les écrans très larges).
const center16x9 = cols.c2; // mesuré à 1600×1000 plus haut
for (const [w, h] of [[2560, 1080], [3440, 1440], [1920, 900]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(350);
  const m = await page.evaluate(() => {
    const c1 = document.getElementById('col-1').getBoundingClientRect().width;
    const c2 = document.getElementById('col-2').getBoundingClientRect().width;
    const c3 = document.getElementById('col-3').getBoundingClientRect().width;
    return { c1: Math.round(c1), c2: Math.round(c2), c3: Math.round(c3) };
  });
  const okRatio = m.c1 <= m.c2 / 2 + 2 && m.c3 <= m.c2 / 2 + 2;
  console.log('COLONNES @' + w + 'x' + h + ' (' + (w / h).toFixed(2) + ':1 > 16/9):', JSON.stringify(m));
  ok('latérales ≤ moitié de la centrale @' + w + 'x' + h, okRatio);
  ok('centrale INCHANGÉE vs 16/9 (' + center16x9 + 'px) @' + w + 'x' + h,
    Math.abs(m.c2 - center16x9) <= 2);
}
await page.setViewportSize({ width: 1600, height: 1000 });

console.log('erreurs JS:', errs.length ? errs : 'aucune');
await browser.close();
process.exit(errs.length ? 1 : 0);
