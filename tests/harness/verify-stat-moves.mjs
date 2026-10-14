// verify-stat-moves.mjs — vérification navigateur (Passe 24) :
//  les capacités de statut sont réellement interprétées (boost, baisse,
//  météo/écran, venoshock) dans le moteur exposé.
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
  const close = (a, b) => Math.abs(a - b) < 1e-9;
  window.battle = { playerMods:{atk:1,def:1,spe:1}, enemyMods:{atk:1,def:1,spe:1}, weather:'none', weatherTurns:0, terrain:'none', boostTurns:{player:{},enemy:{}} };
  const a = { name:'Attaquant', talent:'none', type1:'Normal', type2:null, level:50, atk:100, spa:80, def:60, spd:60, spe:70, moves:[{id:'tackle'}], currentHP:120, maxHP:120 };
  const d = { name:'Défenseur', talent:'none', type1:'Poison', type2:'Water', level:50, atk:90, spa:90, def:70, spd:70, spe:60, moves:[{id:'tackle'}], currentHP:150, maxHP:150 };
  const out = {};
  // Danse Lame : Attaque +100 %
  window.executeStatMove(a, d, 'swords_dance', window.MOVES.swords_dance, 'player');
  out.swordsAtk = window.battle.playerMods.atk;
  // Groz'Yeux : Défense ennemie −50 %
  window.executeStatMove(a, d, 'leer', window.MOVES.leer, 'player');
  out.leerDef = window.battle.enemyMods.def;
  // Mur Lumière : météo écran
  window.executeStatMove(a, d, 'light_screen', window.MOVES.light_screen, 'player');
  out.screenWeather = window.battle.weather;
  // Cross Room : météo
  window.executeStatMove(a, d, 'cross_room', window.MOVES.cross_room, 'player');
  out.crossWeather = window.battle.weather;
  // Camouflage : type changé (météo neutre → Normal)
  window.executeStatMove(a, d, 'camouflage', window.MOVES.camouflage, 'player');
  out.camoType = a._camouflageType;
  // Venoshock sur cible empoisonnée
  const d2 = { ...d, status:'poison', statusTurns:2, currentHP:150, maxHP:150, type1:'Poison', type2:'Water' };
  window.executeStatMove(a, d2, 'venoshock', window.MOVES.venoshock, 'player');
  out.venoHp = d2.currentHP;
  out.veno130 = (d2.currentHP <= 150 - 10); // 130 puissance → au moins 10 PV de dégâts
  // Memento : l'utilisateur tombe à 0 PV
  const a2 = { ...a, currentHP:120, maxHP:120 };
  window.executeStatMove(a2, d, 'memento', window.MOVES.memento, 'player');
  out.mementoFaint = a2.currentHP === 0;
  return out;
});

assert.ok(Math.abs(res.swordsAtk - 2) < 1e-9, `Danse Lame → Attaque ×2 (${res.swordsAtk})`);
assert.ok(Math.abs(res.leerDef - 0.5) < 1e-9, `Groz'Yeux → Défense ennemie ×0,5 (${res.leerDef})`);
assert.equal(res.screenWeather, 'lightscreen', 'Mur Lumière → météo lightscreen');
assert.equal(res.crossWeather, 'crossroom', 'Cross Room → météo crossroom');
assert.equal(res.camoType, 'Normal', 'Camouflage → type Normal (météo neutre)');
assert.ok(res.venoHp < 150, 'Venoshock inflige des dégâts');
assert.equal(res.mementoFaint, true, 'Memento → sacrifice du lanceur');

console.log('verify-stat-moves: OK — capacités de statut interprétées (boost, baisse, écrans, cross room, camouflage, venoshock, memento).');
console.log('page errors:', errors.length);
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

