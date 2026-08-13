/**
 * Harnais visuel — en-têtes de panneau MESURÉS DANS LE JEU RÉEL (wave 34)
 *
 * ── Pourquoi ce harnais remplace le précédent ───────────────────────────
 * `visual-wave33-headers.mjs` construisait ses propres FIXTURES HTML puis
 * mesurait celles-ci. Il annonçait « 9/9 familles identiques » alors que,
 * dans le jeu, les en-têtes étaient visiblement différents.
 *
 * CAUSE : le style de référence (sac / marché / pokédex) ne venait PAS de
 * la règle canonique `.modal-title`, mais d'une règle POSITIONNELLE,
 * `#fullscreen-panel-modal > div > div:first-child`, qui imposait
 * `background: var(--dark1)` + `border-bottom: 2px solid var(--light1)`.
 * Une fixture synthétique n'est jamais dans `#fullscreen-panel-modal` :
 * la surcharge ne s'y appliquait pas, les fixtures étaient donc toutes
 * identiques… et fausses. En prime, la BORDURE n'était pas mesurée.
 *
 * Ce harnais ouvre les vrais panneaux du vrai jeu et compare fond,
 * bordures, géométrie et croix. Il ne peut plus donner un faux vert.
 *
 * Prérequis : `npm run build` puis un serveur statique sur :4173 (dist/).
 * Usage : node tests/harness/visual-wave34-headers-live.mjs
 */
import { chromium } from 'playwright';

const URL = process.env.PW_URL || 'http://localhost:4173/';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
page.setDefaultTimeout(15000);

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText(/nouvelle partie/i).first().click();
await page.waitForTimeout(1500);
await page.getByText(/choisir/i).nth(1).click();
await page.waitForTimeout(3000);

/** Les vraies familles d'en-tête, ouvertes par leur vrai point d'entrée. */
const FAMILIES = [
  { k: 'A sac (RÉFÉRENCE)', open: () => window.openFullscreenPanel('inventory'), sel: '#fs-panel-header' },
  { k: 'B marché',          open: () => window.openFullscreenPanel('market'),    sel: '#fs-panel-header' },
  { k: 'C pokédex',         open: () => window.openFullscreenPanel('pokedex'),   sel: '#fs-panel-header' },
  { k: 'D dictionnaire',    open: () => window.openFullscreenPanel('dictionary'),sel: '#fs-panel-header' },
  { k: 'E guide',           open: () => window.openFullscreenPanel('guide'),     sel: '#fs-panel-header' },
  { k: 'F réglages',        open: () => { document.getElementById('settings-modal').style.display = 'flex'; }, sel: '#settings-modal .modal-title' },
  { k: 'G quêtes',          open: () => { document.getElementById('quest-modal').style.display = 'flex'; },    sel: '#quest-modal .modal-title' },
  { k: 'H sélection',       open: () => { document.getElementById('unified-selector-modal').style.display = 'flex'; }, sel: '#unified-selector-modal .modal-title' },
  { k: 'I bilan de combat', open: () => { document.getElementById('battle-summary-modal').style.display = 'flex'; },   sel: '#battle-summary-modal .modal-title' },
];

const MEASURE = (sel) => {
  const bar = document.querySelector(sel);
  if (!bar) return null;
  const n = (v) => +parseFloat(v).toFixed(1);
  const cb = getComputedStyle(bar);
  const title = bar.querySelector('.pw-info-name, .pw-modal-title, .modal-title-text');
  const close = bar.querySelector('.modal-close, .pw-modal-close');
  const ct = title ? getComputedStyle(title) : null;
  const cc = close ? getComputedStyle(close) : null;
  const rc = close ? close.getBoundingClientRect() : null;
  return {
    hauteur: n(bar.getBoundingClientRect().height),
    fond: cb.backgroundColor,
    // ⬇ LA mesure qui manquait et qui a laissé passer le défaut.
    bordHaut: `${cb.borderTopWidth} ${cb.borderTopStyle} ${cb.borderTopColor}`,
    bordBas: `${cb.borderBottomWidth} ${cb.borderBottomStyle} ${cb.borderBottomColor}`,
    padding: cb.padding,
    rayon: cb.borderRadius,
    titre: ct ? `${ct.fontSize}/${ct.fontWeight}` : '—',
    couleur: ct ? ct.color : '—',
    croix: cc ? `${n(rc.width)}x${n(rc.height)}` : '—',
    croixFond: cc ? cc.backgroundColor : '—',
    croixRayon: cc ? cc.borderRadius : '—',
  };
};

const rows = [];
for (const fam of FAMILIES) {
  try {
    await page.evaluate(fam.open);
    await page.waitForTimeout(1000);
    const m = await page.evaluate(MEASURE, fam.sel);
    if (!m) { console.log(`  ! ${fam.k} : en-tête introuvable (${fam.sel})`); continue; }
    rows.push({ famille: fam.k, ...m });
  } catch (e) {
    console.log(`  ! ${fam.k} : ${String(e).slice(0, 90)}`);
  }
  await page.evaluate(() => {
    document.querySelectorAll('.modal-close').forEach((c) => { try { c.click(); } catch (_) { /* noop */ } });
  }).catch(() => {});
  await page.waitForTimeout(500);
}

await browser.close();

console.table(rows);

if (pageErrors.length) {
  console.log('\nErreurs de page :');
  pageErrors.forEach((e) => console.log('  ' + e));
}

const ref = rows[0];
let failures = 0;
console.log(`\nRéférence : ${ref.famille}\n`);
for (const row of rows.slice(1)) {
  const diffs = Object.keys(ref).filter((k) => k !== 'famille' && row[k] !== ref[k]);
  if (diffs.length) {
    failures += 1;
    console.log(`  ✗ ${row.famille}`);
    for (const k of diffs) console.log(`      ${k} : attendu ${ref[k]} — mesuré ${row[k]}`);
  } else {
    console.log(`  ✓ ${row.famille}`);
  }
}

if (failures || pageErrors.length) {
  console.log(`\n${failures} famille(s) divergente(s).`);
  process.exit(1);
}
console.log('\nToutes les familles d’en-tête sont identiques DANS LE JEU.');
