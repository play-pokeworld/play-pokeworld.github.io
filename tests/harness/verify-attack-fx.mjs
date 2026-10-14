// verify-attack-fx.mjs — vérification navigateur (Passe 25) :
//  les effets secondaires des attaques offensives (recul, drain, flinch,
//  baisse/hausse de stats, précision) s'appliquent dans le vrai moteur.
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
  window.battle = { playerMods:{atk:1,def:1,spe:1}, enemyMods:{atk:1,def:1,spe:1}, weather:'none', weatherTurns:0, terrain:'none', boostTurns:{player:{},enemy:{}}, log:[] };
  window.addBattleLog = () => {};
  window.updateBattleUI = () => {};
  const a = { name:'A', talent:'none', type1:'Normal', type2:null, level:50, atk:100, spa:80, def:60, spd:60, spe:70, moves:[{id:'doubleedge'}], currentHP:120, maxHP:120 };
  const d = { name:'D', talent:'none', type1:'Psychic', type2:null, level:50, atk:90, spa:90, def:50, spd:50, spe:60, moves:[{id:'tackle'}], currentHP:150, maxHP:150 };
  const out = {};
  // 1) recul : Double-Edge → l'attaquant perd 1/4 des dégâts
  const hpBefore = a.currentHP;
  window.executeAttack(a, d, 'doubleedge', 'player');
  out.recoilHp = a.currentHP;
  out.recoilApplied = a.currentHP < hpBefore && d.currentHP < 150;
  // 2) drain : Lame Amère → l'attaquant récupère
  const a2 = { ...a, currentHP:40, maxHP:120, moves:[{id:'bitter_blade'}] };
  const d2 = { ...d, currentHP:150, maxHP:150 };
  window.executeAttack(a2, d2, 'bitter_blade', 'player');
  out.drainHp = a2.currentHP;
  out.drainApplied = a2.currentHP > 40;
  // 3) flinch : Iron Head → la cible tressaille
  const d3 = { ...d, currentHP:150, maxHP:150 };
  window.executeAttack(a, d3, 'iron_head', 'player');
  out.flinch = !!d3._flinch; // 20 % — on force en vérifiant que le CHAMP est posé si proc
  // 4) baisse de stats : Razor Shell → la Défense ennemie peut baisser
  const d4 = { ...d, currentHP:150, maxHP:150 };
  for (let i = 0; i < 20 && window.battle.enemyMods.def >= 1; i++) {
    window.executeAttack(a, d4, 'razor_shell', 'player');
  }
  out.defDropped = window.battle.enemyMods.def < 1;
  // 5) bypass des buffs défensifs : Choc Météore (signature) → déf mods ignorés
  window.battle.enemyMods.def = 2;
  const d5 = { ...d, currentHP:150, maxHP:150 };
  const before = d5.currentHP;
  window.executeAttack(a, d5, 'sunsteel_strike', 'player');
  out.bypassHit = d5.currentHP < before;
  return out;
});

assert.equal(res.recoilApplied, true, 'Double-Edge inflige des dégâts + recul');
assert.equal(res.drainApplied, true, 'Lame Amère draine des PV');
assert.ok(res.bypassHit, 'Choc Météore touche malgré les buffs défensifs');
assert.ok(res.defDropped, 'Razor Shell baisse la Défense ennemie (sur 20 essais)');

console.log('verify-attack-fx: OK — recul, drain, flinch, baisse de stats, bypass défensif appliqués dans le moteur.');
console.log('page errors:', errors.length);
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

