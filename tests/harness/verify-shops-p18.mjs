// verify-shops-p18.mjs — vérification navigateur (Passe 18) :
//  - les objets Gen 2 sont en Johto (pas Kanto), les Gen 3 en Hoenn,
//  - les objets post-Gen 3 (joyaux, graines, roches météo, orbes…) ne sont
//    vendus nulle part.
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

const collectShops = () => page.evaluate(() => {
  const SHOPS = window.SHOPS || {};
  const out = {};
  for (const [id, s] of Object.entries(SHOPS)) out[id] = (s && s.items) ? s.items.slice() : [];
  return out;
});

// 1. Vive Griffe / Poing Chance en Johto ; Herbe Mentale en Hoenn.
const shops = await collectShops();
const kanto = ['pallet','viridian','pewter','cerulean','vermilion','lavender','celadon','fuchsia','cinnabar','indigo'];
const johto = ['jnewbark','jcherrygrove','jviolet','jazalea','jgoldenrod','jecruteak','jolivine','jcianwood','jmahogany','jblackthorn'];
const hoenn = ['littleroot','oldale','petalburg','rustboro','dewford','slateport_market','mauville','mauville_casino','verdanturf','fallarbor','lavaridge','fortree','lilycove_dept_store','mossdeep','sootopolis','pacifidlog','weather_lab','evergrande'];

const itemsIn = (list) => list.flatMap((id) => shops[id] || []);
assert.ok(itemsIn(johto).includes('quick_claw'), 'Vive Griffe vendue en Johto');
assert.ok(!itemsIn(kanto).includes('quick_claw'), 'Vive Griffe absente de Kanto');
assert.ok(itemsIn(johto).includes('lucky_punch'), 'Poing Chance vendu en Johto');
assert.ok(itemsIn(hoenn).includes('mental_herb'), 'Herbe Mentale vendue en Hoenn');
assert.ok(!itemsIn([...kanto, ...johto]).includes('mental_herb'), 'Herbe Mentale absente de Kanto/Johto');

// 1bis. Passe 19 : Gen 2 → Johto, Gen 3 → Hoenn.
assert.ok(!itemsIn(kanto).includes('metal_coat'), 'Peau Métal absente de Kanto (Gen 2)');
assert.ok(!itemsIn(kanto).includes('soft_sand'), 'Sable Doux absent de Kanto (Gen 2)');
assert.ok(itemsIn(johto).includes('metal_coat'), 'Peau Métal disponible en Johto');
assert.ok(!itemsIn(johto).includes('silk_scarf'), 'Mouchoir Soie absent de Johto (Gen 3)');
assert.ok(itemsIn(hoenn).includes('silk_scarf'), 'Mouchoir Soie disponible en Hoenn');

// 2. Les objets post-Gen 3 ne sont vendus dans AUCUNE boutique (ni à l'Atoll).
const allShopItems = Object.values(shops).flat();
const atoll = await page.evaluate(() => (window.ATOLL_SHOP || []).map((e) => e[0]));
const banned = ['flying_gem','water_gem','fire_gem','grass_gem','electric_seed','grassy_seed','misty_seed','foggy_seed','smooth_rock','damp_rock','icy_rock','heat_rock','weakness_policy','flame_orb','toxic_orb','loaded_dice','metronome','light_clay','power_herb','clear_amulet','lagging_tail','heavy_duty_boots','pure_incense','eject_button','eject_pack','luck_incense','fairy_feather','terrain_extender','muscle_band','life_orb','assault_vest','eviolite'];
for (const k of banned) {
  assert.ok(!allShopItems.includes(k), `${k} absent des boutiques`);
  assert.ok(!atoll.includes(k), `${k} absent de la boutique Atoll`);
}
// Et aussi les joyaux manquants (les 18).
for (const k of ['normal_gem','ground_gem','fighting_gem','rock_gem','fairy_gem','poison_gem','psychic_gem','ghost_gem','bug_gem','steel_gem','ice_gem','dragon_gem','dark_gem']) {
  assert.ok(!allShopItems.includes(k), `${k} absent des boutiques`);
}

// Passe 19 : les 17 baies de résistance sont une EXCEPTION — elles restent
// vendues en boutique (Kanto/Johto/Hoenn).
const resistBerries = ['babiri_berry','charti_berry','chople_berry','coba_berry','colbur_berry','haban_berry','kasib_berry','kebia_berry','occa_berry','passho_berry','payapa_berry','rindo_berry','roseli_berry','shuca_berry','tanga_berry','wacan_berry','yache_berry'];
for (const k of resistBerries) {
  assert.ok(allShopItems.includes(k), `${k} vendue en boutique (exception joueur)`);
}

console.log('verify-shops-p18: OK — Gen 2 en Johto, Gen 3 en Hoenn, objets post-Gen 3 retirés des boutiques et de l\'Atoll.');
console.log('page errors:', errors.length);
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

