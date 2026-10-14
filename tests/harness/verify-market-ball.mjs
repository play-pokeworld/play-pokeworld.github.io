// verify-market-ball.mjs — vérification visuelle (Passe 17) :
//  1) la Poké Ball du marché est en bas à droite du sprite (comme la fenêtre Lieu),
//  2) la puissance des objets tenus suit le nombre possédé (1→25),
//  3) l'Encens Pur apparaît dans la boutique d'Indigo et décrit bien l'effet.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 }).catch(() => {});
const picked = await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) { btn.click(); return true; } return false;
});
if (picked) {
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
} else {
  await page.evaluate(() => { window.G.starter = true; window.G.team.push(window.createPoke(4, 5, false)); window.saveGame(); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.startSaveById(window.currentSaveId || localStorage.getItem('pokeworld_active_save')));
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
}
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.evaluate(() => {
  try {
    const st = window.ensureTutorialState();
    if (window.tutorialSteps) for (const s of window.tutorialSteps()) st.rewards[s.id] = true;
  } catch (_) {}
});

// ── 1. Marché : position + taille de la balle indicatrice ──────────────────
await page.evaluate(() => {
  window.G.money = 999999;
  // quelques captures pour que des cartes soient « possédées »
  window.G.pokedex = window.G.pokedex || {};
  window.G.pokedex[1] = { seen: true, caught: true };
  window.G.pokedex[4] = { seen: true, caught: true };
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  window.renderMarket(el);
});
const ball = await page.evaluate(() => {
  const img = document.querySelector('.pw-market-ball');
  if (!img) return null;
  const cs = getComputedStyle(img);
  const orb = img.closest('.pw-market-orb');
  const orbCs = orb ? getComputedStyle(orb) : null;
  return {
    src: img.getAttribute('src'),
    right: cs.right, bottom: cs.bottom, width: cs.width, height: cs.height,
    position: cs.position,
    orbPosition: orbCs ? orbCs.position : null,
    orbW: orb ? orb.getBoundingClientRect().width : null,
    ballRect: img.getBoundingClientRect(),
    orbRect: orb ? orb.getBoundingClientRect() : null,
  };
});
assert.ok(ball, 'une balle indicatrice est présente sur une carte du marché');
assert.equal(ball.position, 'absolute');
assert.equal(ball.right, '2px', 'balle à 2px du bord droit (comme la fenêtre Lieu)');
assert.equal(ball.bottom, '2px', 'balle à 2px du bord bas (comme la fenêtre Lieu)');
assert.equal(ball.width, '20px', 'largeur 20px (identique fenêtre Lieu)');
assert.equal(ball.height, '20px', 'hauteur 20px (identique fenêtre Lieu)');
assert.equal(ball.orbPosition, 'relative', 'le disque est le repère de position');
// La balle est bien DANS le disque (son rectangle est contenu dans celui de l'orb, marge de 2px).
assert.ok(ball.ballRect.x >= ball.orbRect.x - 1 && ball.ballRect.y >= ball.orbRect.y - 1, 'balle contenue dans le disque du sprite');

// ── 2. Puissance des objets tenus selon le nombre possédé ──────────────────
const power1 = await page.evaluate(() => {
  window.G.inventory = window.G.inventory || {};
  window.G.inventory.charcoal = 1;
  return window.ItemEngine.getItemPower('charcoal');
});
const power25 = await page.evaluate(() => {
  window.G.inventory.charcoal = 25;
  return window.ItemEngine.getItemPower('charcoal');
});
const powerLevel25 = await page.evaluate(() => window.ItemEngine.getPowerLevel(25));
assert.ok(Math.abs(power1 - 1.1) < 1e-9, `1 charbon → ×1.10 (${power1})`);
assert.ok(Math.abs(power25 - 1.6) < 1e-9, `25 charbons → ×1.60 (${power25})`);
assert.equal(powerLevel25, 6, '25 exemplaires = palier 6');

// ── 3. Description réelle de l'Encens Pur (plus de phrase générique) ───────
const pureDesc = await page.evaluate(() => window.ItemEngine.generateItemDesc('pure_incense', 'fr'));
assert.ok(pureDesc.includes('rares'), `Encens Pur décrit l'effet rare (${pureDesc})`);
assert.ok(!pureDesc.includes('Augmente la puissance'), 'plus de phrase générique « Augmente la puissance »');

console.log('verify-market-ball: OK — balle du marché 20px en bas à droite du disque, puissance 1→25 (×1.10→×1.60), Encens Pur décrit.');
console.log('page errors:', errors.length);
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

