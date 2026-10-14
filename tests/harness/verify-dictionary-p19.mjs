// verify-dictionary-p19.mjs — vérification navigateur (Passe 19) :
//  le dictionnaire ne montre que les objets des générations débloquées.
//  - Kanto seul (départ) : Gen 1 visible, Gen 2+ et Gen 4+ masqués ;
//  - régions débloquées : Gen 1-3 visibles, Gen 4+ toujours masqués.
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

const dictText = () => page.evaluate(() => {
  const host = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  host.innerHTML = '';
  window.setDictionaryTab && window.setDictionaryTab('items');
  window.renderDictionary(host);
  return host.textContent || '';
});

// ── 1. Départ en Kanto (Gen 1 seulement) ───────────────────────────────────
let text = await dictText();
assert.ok(text.includes('Poké Ball'), 'Gen 1 : Poké Ball visible');
assert.ok(text.includes('Super Bonbon'), 'Gen 1 : Super Bonbon visible');
assert.ok(!text.includes('Charbon'), 'Gen 2 masqué en Kanto (Charbon)');
assert.ok(!text.includes('Mouchoir Soie'), 'Gen 3 masqué en Kanto (Mouchoir Soie)');
assert.ok(!text.includes('Muscle Band'), 'Gen 4 masqué (Muscle Band)');
assert.ok(text.includes('Baie Babiri'), 'Baie Babiri visible (exception joueur, Gen 1)');
assert.ok(!text.includes('Veste de Combat'), 'Gen 6 masqué (Veste de Combat)');

// ── 2. Régions débloquées (Gen 1-3) ────────────────────────────────────────
await page.evaluate(() => { window.canAccessRegion = () => true; });
text = await dictText();
assert.ok(text.includes('Charbon'), 'Gen 2 visible une fois Johto débloqué');
assert.ok(text.includes('Mouchoir Soie'), 'Gen 3 visible une fois Hoenn débloqué');
assert.ok(!text.includes('Muscle Band'), 'Gen 4 toujours masqué');
assert.ok(text.includes('Baie Babiri'), 'Baie Babiri toujours visible');
assert.ok(!text.includes('Joyau Feu'), 'Gen 5 toujours masqué (joyaux)');

// ── 3. Le module de génération est bien chargé ─────────────────────────────
const gen = await page.evaluate(() => ({
  charcoal: window.itemGeneration('charcoal'),
  muscle: window.itemGeneration('muscle_band'),
  prism: window.itemGeneration('prism_scale'),
  ct: window.itemGeneration('ct_moonblast'),
}));
assert.equal(gen.charcoal, 2);
assert.equal(gen.muscle, 4);
assert.equal(gen.prism, 3);
assert.equal(gen.ct, null);

console.log('verify-dictionary-p19: OK — dictionnaire progressif (Gen 1 → +2 → +3), Gen 4+ masqué.');
console.log('page errors:', errors.length);
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

