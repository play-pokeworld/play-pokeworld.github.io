// verify-berries-p26.mjs — vérification navigateur (Passe 26) :
//  baies + consommables + balls spéciales branchés dans le vrai moteur.
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
  // 1) baies présentes + catégories
  out.berries = ['cheri_berry','pecha_berry','prine_berry','leppa_berry','oran_berry','liechi_berry','lansat_berry','pomeg_berry','kee_berry','enigma_berry','snover_berry','hopo_berry'].every(k => window.ITEMS && window.ITEMS[k]);
  // 2) immunité : Cheri bloque la paralysie
  const poke = { name:'P', talent:'none', heldItem:'cheri_berry', type1:'Normal' };
  out.cheriImmune = window.isImmuneToStatus(poke, 'para', 'none') === true;
  // 3) échelle 1→25 (Mepo 15 % → 40 %)
  const close = (a,b)=>Math.abs(a-b)<1e-9;
  out.leppa1 = close(window.berryPowerVal('leppa_berry',1), 0.15);
  out.leppa25 = close(window.berryPowerVal('leppa_berry',6), 0.40);
  out.oran1 = close(window.berryPowerVal('oran_berry',1), 0.25);
  out.oran25 = close(window.berryPowerVal('oran_berry',6), 0.50);
  // 4) consommables : vitamine = +1 EV + 1 IV
  window.PD = window.PD || { 25:['Pikachu','Electric',null,35,55,40,50,50,90] };
  const p = { id:25, name:'Pikachu', level:50, atk:100, def:80, spa:90, spd:80, spe:110, maxHP:120, currentHP:120, evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0}, ivs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0} };
  const ev0 = Object.values(p.evs).reduce((a,b)=>a+b,0), iv0 = Object.values(p.ivs).reduce((a,b)=>a+b,0);
  window.applyConsumableToPoke(p, 'protein');
  out.vitaminEv = (Object.values(p.evs).reduce((a,b)=>a+b,0) === ev0+1);
  out.vitaminNoIv = (Object.values(p.ivs).reduce((a,b)=>a+b,0) === iv0);
  window.applyConsumableToPoke(p, 'bottle_cap');
  out.capIv = (Object.values(p.ivs).reduce((a,b)=>a+b,0) === iv0+1);
  // 5) balls spéciales : taux effectif
  const eWater = { id:120, type1:'Water', type2:null, spe:60, level:30, currentHP:1, maxHP:100 };
  out.lureBonus = window.ballEffectiveRate('lureball', eWater) >= 35;
  out.lureNoBonus = window.ballEffectiveRate('lureball', { id:1, type1:'Grass', type2:'Poison', spe:45, level:5 }) === 10;
  out.beastRate = window.ballEffectiveRate('beastball', eWater) === 10;
  return out;
});

assert.equal(res.berries, true, 'baies présentes dans ITEMS');
assert.equal(res.cheriImmune, true, 'Cheri immunise contre la paralysie');
assert.equal(res.leppa1 && res.leppa25, true, 'Mepo 15 % → 40 %');
assert.equal(res.oran1 && res.oran25, true, 'Oran 25 % → 50 %');
assert.equal(res.vitaminEv && res.vitaminNoIv, true, 'vitamine = +1 EV (pas d\'IV)');
assert.equal(res.capIv, true, 'Capsule = +1 IV');
assert.equal(res.lureBonus && res.lureNoBonus && res.beastRate, true, 'Lure Ball +25 % sur Eau / 10 % sinon ; Beast 10 %');

console.log('verify-berries-p26: OK — baies (immunité, échelle 1→25), consommables (+EV/IV), balls spéciales (bonus +25 %).');
console.log('page errors:', errors.length);
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

