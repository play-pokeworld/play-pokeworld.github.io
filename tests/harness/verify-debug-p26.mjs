// verify-debug-p26.mjs — vérification navigateur (Passe 26b) :
//  debug (+50k chaque devise, tous les objets +1, dictionnaire tout afficher),
//  noms FR officiels, vitamine = EV seulement.
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

const res = await page.evaluate(() => {
  const out = {};
  // 1) debug +50 000 chaque devise
  const before = { money: window.G.money || 0, jd: (window.ensureWallet().dungeonTokens || 0), pq: (window.ensureWallet().questPoints || 0), dia: (window.ensureWallet().diamonds || 0) };
  window.debugGiveMoney();
  out.money = (window.G.money >= before.money + 50000);
  out.jd = (window.ensureWallet().dungeonTokens >= before.jd + 50000);
  out.pq = (window.ensureWallet().questPoints >= before.pq + 50000);
  out.dia = (window.ensureWallet().diamonds >= before.dia + 50000);
  // 2) debug tous les objets +1
  window.debugGiveAllItems();
  out.allItems = ['cheri_berry','protein','bottle_cap','rarecandy'].every(k => (window.G.inventory[k]||0) >= 1);
  out.ballItems = (window.ensurePokeballs().lureball >= 1);
  // 3) dictionnaire tout afficher : une baie « ferme » visible
  window.debugShowAllItems();
  const host = document.getElementById('fs-panel-content');
  out.debugFlag = window.G._debugShowAllItems === true;
  out.dictHasFarmBerry = /Baie Liechi|Baie Lansat/.test(host.textContent || '');
  // 4) noms FR officiels
  out.names = {
    fastball: window.ITEMS.fastball.name_fr === 'Speed Ball',
    diveball: window.ITEMS.diveball.name_fr === 'Scuba Ball',
    nestball: window.ITEMS.nestball.name_fr === 'Faiblo Ball',
    quickball: window.ITEMS.quickball.name_fr === 'Rapide Ball',
    bottle_cap: window.ITEMS.bottle_cap.name_fr === 'Capsule',
    golden_bottle_cap: window.ITEMS.golden_bottle_cap.name_fr === "Capsule d'Or",
    hp_up: window.ITEMS.hp_up.name_fr === 'PV Plus',
  };
  // 5) description d'une baie générée
  out.descCheri = window.ItemEngine.generateItemDesc('cheri_berry', 'fr').includes('immunise');
  out.descLeppa = window.ItemEngine.generateItemDesc('leppa_berry', 'fr').includes('cooldown');
  return out;
});

assert.equal(res.money && res.jd && res.pq && res.dia, true, '+50 000 de chaque devise');
assert.equal(res.allItems, true, 'tous les objets +1 (inventaire)');
assert.equal(res.ballItems, true, 'balls +1 (système Poké Balls)');
assert.equal(res.debugFlag, true, 'drapeau debug dictionnaire posé');
assert.equal(res.dictHasFarmBerry, true, 'baie « ferme » visible dans le dictionnaire');
for (const [k, v] of Object.entries(res.names)) assert.equal(v, true, `nom FR officiel : ${k}`);
assert.equal(res.descCheri && res.descLeppa, true, 'descriptions FR générées');

console.log('verify-debug-p26: OK — debug (+50k/devise, +1 objet, tout afficher), noms FR officiels, descriptions.');
console.log('page errors:', errors.length);
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

