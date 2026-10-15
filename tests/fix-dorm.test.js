import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { pickWildFromTable } from '../src/domain/world/encounter-rules.js';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

// P5 — gisement dormant : tests de non-régression.
// 1) DORM-00 (Passe 18) : pas d'objets post-Gen 3 dans les régions 1-3.
//    Les objets Gen 2 vivent en Johto, les Gen 3 en Hoenn ; les objets
//    Gen 4+/inventés (joyaux, graines, roches météo, orbes, encens…) ne
//    sont PLUS distribués. Tout autre objet tenu garde une source.
// 2) DORM-01 : normalizeWeather normalise les graphies météo.
// 3) DORM-03 : les boosters de type n'ont plus de +10 % générique.

const R = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const DISTRIBUTION_FILES = [
  'src/data/shops-data.js',
  'src/data/shops-hoenn.js',
  'src/data/route-drops.js',
  'src/application/economy/mine.js',
  'src/data/story-quests.js',
  'src/data/story-quests-hoenn.js',
  'src/data/side-quests-data.js',
  'src/data/repeatable-quests-data.js',
  'src/ui/game/fullscreen-panel.js', // ATOLL_SHOP
];

// Objets POST-Gen 3 ou inventés PokéClicker/PokeChill : retirés de la
// distribution (règle joueur Passe 18/19 — ils n'existent pas en Gen 1-3).
const POST_GEN3_BLOCKLIST = [
  // 18 joyaux (Gen 5)
  'flying_gem','normal_gem','ground_gem','fighting_gem','rock_gem','water_gem',
  'fairy_gem','electric_gem','poison_gem','psychic_gem','ghost_gem','grass_gem',
  'bug_gem','steel_gem','ice_gem','fire_gem','dragon_gem','dark_gem',
  // 4 graines de terrain (Gen 7 / inventé)
  'electric_seed','grassy_seed','misty_seed','foggy_seed',
  // 4 roches météo (Gen 4)
  'smooth_rock','damp_rock','icy_rock','heat_rock',
  // objets forts de l'Atoll (Gen 4-9)
  'weakness_policy','flame_orb','toxic_orb','loaded_dice','metronome',
  'life_orb','assault_vest','eviolite',
  // divers (Gen 4-9)
  'light_clay','power_herb','clear_amulet','lagging_tail','heavy_duty_boots',
  'pure_incense','eject_button','eject_pack','luck_incense',
  // Gen 7 / inventé
  'fairy_feather','terrain_extender',
  // Gen 4 (Passe 19)
  'muscle_band',
  // trésors de la mine d'une génération postérieure (Passe 19)
  'iron_ball','rare_bone','big_nugget',
  // 18 Cristaux Z (Gen 7) — équipement futur, non distribués (Passe 26d)
  'buginium_z','darkinium_z','dragonium_z','electrium_z','fairium_z','fightinium_z',
  'firium_z','flyinium_z','ghostium_z','grassium_z','groundium_z','icium_z',
  'normalium_z','poisonium_z','psychium_z','rockium_z','steelium_z','waterium_z',
];

// DORM-06 — baies « palier B/C » : non distribuées tant que la ferme (mutation)
// n'existe pas. Elles sont dans les données + effets, sans source d'obtention.
const FARM_ONLY_BERRIES = [
 'figy_berry','wiki_berry','mago_berry','aguav_berry','iapapa_berry',
 'liechi_berry','ganlon_berry','salac_berry','petaya_berry','apicot_berry',
 'lansat_berry','starf_berry',
 'pomeg_berry','kelpsy_berry','qualot_berry','hondew_berry','grepa_berry','tamato_berry',
 'chilan_berry','micle_berry','custap_berry','jaboca_berry','rowap_berry',
 'kee_berry','maranga_berry','enigma_berry','snover_berry','hopo_berry','pinkan_berry',
 'razz_berry','bluk_berry','nanab_berry','wepear_berry','pinap_berry','cornn_berry',
 'magost_berry','rabuta_berry','nomel_berry','spelon_berry','pamtre_berry','watmel_berry',
 'durin_berry','belue_berry',
];

// Les 17 baies de résistance (officiellement Gen 4) sont une EXCEPTION joueur
// (Passe 19) : conservées et distribuées partout (boutiques, routes, quêtes).
const RESIST_BERRIES = [
  'babiri_berry','charti_berry','chople_berry','coba_berry','colbur_berry',
  'haban_berry','kasib_berry','kebia_berry','occa_berry','passho_berry',
  'payapa_berry','rindo_berry','roseli_berry','shuca_berry','tanga_berry',
  'wacan_berry','yache_berry',
];

const KANTO_SHOPS = ['pallet','viridian','pewter','cerulean','vermilion','lavender','celadon','fuchsia','cinnabar','indigo'];
const JOHTO_SHOPS = ['jnewbark','jcherrygrove','jviolet','jazalea','jgoldenrod','jecruteak','jolivine','jcianwood','jmahogany','jblackthorn'];

test("DORM-00: les objets Gen 2/3 sont vendus dans leur région (pas ailleurs)", () => {
  const sandbox = { console, window: {}, globalThis: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource(['src/data/shops-data.js', 'src/data/shops-hoenn.js']), sandbox, { filename: 'shops [iife]' });
  const SHOPS = sandbox.SHOPS || {};
  const HOENN = sandbox.SHOPS_HOENN || {};
  const hoennIds = Object.keys(HOENN);
  const itemsOf = (id) => (SHOPS[id] && Array.isArray(SHOPS[id].items)) ? SHOPS[id].items : [];
  // Vive Griffe (Gen 2) → Johto, jamais en Kanto.
  assert.ok(JOHTO_SHOPS.some((j) => itemsOf(j).includes('quick_claw')), 'Vive Griffe vendue en Johto');
  assert.ok(!KANTO_SHOPS.some((k) => itemsOf(k).includes('quick_claw')), 'Vive Griffe absente de Kanto');
  // Poing Chance (Gen 2) → Johto.
  assert.ok(JOHTO_SHOPS.some((j) => itemsOf(j).includes('lucky_punch')), 'Poing Chance vendu en Johto');
  // Herbe Mentale (Gen 3) → Hoenn, jamais en Kanto/Johto.
  assert.ok(hoennIds.some((h) => itemsOf(h).includes('mental_herb')), 'Herbe Mentale vendue en Hoenn');
  assert.ok(![...KANTO_SHOPS, ...JOHTO_SHOPS].some((k) => itemsOf(k).includes('mental_herb')), 'Herbe Mentale absente de Kanto/Johto');
  // Passe 19 : metal_coat / soft_sand (Gen 2) sortent de Kanto (→ Johto/Hoenn).
  assert.ok(!KANTO_SHOPS.some((k) => itemsOf(k).includes('metal_coat')), 'Peau Métal absente de Kanto (Gen 2)');
  assert.ok(!KANTO_SHOPS.some((k) => itemsOf(k).includes('soft_sand')), 'Sable Doux absent de Kanto (Gen 2)');
  assert.ok(JOHTO_SHOPS.some((j) => itemsOf(j).includes('metal_coat')), 'Peau Métal disponible en Johto');
  // Passe 19 : silk_scarf (Gen 3) sort de Johto (→ Hoenn).
  assert.ok(!JOHTO_SHOPS.some((j) => itemsOf(j).includes('silk_scarf')), 'Mouchoir Soie absent de Johto (Gen 3)');
  assert.ok(hoennIds.some((h) => itemsOf(h).includes('silk_scarf')), 'Mouchoir Soie disponible en Hoenn');
});

test('DORM-00: les objets tenus post-Gen 3 ne sont plus distribués', () => {
  const allSource = DISTRIBUTION_FILES.map((f) => R(f)).join('\n');
  for (const key of POST_GEN3_BLOCKLIST) {
    const re = new RegExp('["\']' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']');
    assert.ok(!re.test(allSource), `${key} ne doit plus être obtenable`);
  }
});

test('DORM-00: les 17 baies de résistance restent distribuées (exception joueur)', () => {
  const allSource = DISTRIBUTION_FILES.map((f) => R(f)).join('\n');
  for (const key of RESIST_BERRIES) {
    const re = new RegExp('["\']' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']');
    assert.ok(re.test(allSource), `${key} doit rester obtenable (boutique/route/quête)`);
  }
});

test('DORM-00: tout autre objet tenu a toujours au moins une source d\'obtention', () => {
  const sandbox = { console, window: {}, globalThis: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource(['src/data/items-data.js']), sandbox, { filename: 'items [iife]' });

  const allSource = DISTRIBUTION_FILES.map((f) => R(f)).join('\n');
  const unreachable = [];
  for (const [key, itm] of Object.entries(sandbox.ITEMS)) {
    if (!itm || itm.type !== 'held') continue;
    if (Number(itm.price) <= 0) continue; // objets d'évolution tenus (roche royale…) hors distribution
    if (POST_GEN3_BLOCKLIST.includes(key)) continue;
    if (FARM_ONLY_BERRIES.includes(key)) continue; // DORM-06 : ferme (mutation) à venir
    const re = new RegExp('["\']' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']');
    if (!re.test(allSource)) unreachable.push(key);
  }
  assert.deepEqual(unreachable, [], 'objets tenus (Gen 1-3) sans source d\'obtention');
});

test('DORM-06: les baies de palier A sont distribuées (boutiques)', () => {
  const allSource = DISTRIBUTION_FILES.map((f) => R(f)).join('\n');
  for (const key of ['cheri_berry','chesto_berry','pecha_berry','rawst_berry','aspear_berry','persim_berry','leppa_berry','oran_berry','sitrus_berry']) {
    const re = new RegExp('["\']' + key + '["\']');
    assert.ok(re.test(allSource), `${key} distribuée en boutique`);
  }
});

test('Passe 19: itemGeneration classe les générations (1→3 visibles, 4+ masqués)', async () => {
  const mod = await import('../src/data/item-generations.js');
  assert.equal(mod.itemGeneration('pokeball'), 1, 'Poké Ball = Gen 1');
  assert.equal(mod.itemGeneration('charcoal'), 2, 'Charbon = Gen 2');
  assert.equal(mod.itemGeneration('silk_scarf'), 3, 'Mouchoir Soie = Gen 3');
  assert.equal(mod.itemGeneration('prism_scale'), 3, 'Écaille Prismatique = stand-in Gen 3 (Milobellus)');
  assert.equal(mod.itemGeneration('muscle_band'), 4, 'Muscle Band = Gen 4');
  assert.equal(mod.itemGeneration('babiri_berry'), 1, 'Baie Babiri = exception joueur, visible dès Kanto');
  assert.equal(mod.itemGeneration('eviolite'), 5, 'Évoluroc = Gen 5');
  assert.equal(mod.itemGeneration('buginium_z'), 7, 'Cristal Z = Gen 7');
  assert.equal(mod.itemGeneration('ct_moonblast'), null, 'CT hors génération (toujours visible)');
  // Sans contexte région : les 3 générations implémentées sont débloquées.
  assert.equal(mod.maxUnlockedItemGen(), 3);
  assert.equal(mod.isItemGenUnlocked('charcoal'), true);
  assert.equal(mod.isItemGenUnlocked('babiri_berry'), true, 'baies de résistance visibles');
  assert.equal(mod.isItemGenUnlocked('muscle_band'), false, 'Gen 4 masqué');
  assert.equal(mod.isItemGenUnlocked('ct_moonblast'), true, 'CT visible');
});

test('Passe 19: le dictionnaire filtre les objets par génération débloquée', () => {
  const src = R('src/ui/game/fullscreen-panel.js');
  assert.ok(wsIncludes(src, "keys.filter((k) => typeof G !== 'undefined' && G && G._debugShowAllItems ? true : isItemGenUnlocked(k))"), 'dictionnaire → filtre isItemGenUnlocked (+ debug tout afficher)'); // V7 · DBT-01 — Prettier retire les parenthèses redondantes
});

test('DORM-01: normalizeWeather normalise rain/rainy, sun/sunny, sand/sandstorm', () => {
  const sandbox = { console, window: {}, globalThis: {}, battle: {}, G: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = R('src/application/combat/battle-attack.js');
  // Extraire la fonction normalizeWeather (portée IIFE du bundle trop large) : on l'évalue isolément.
  const m = src.match(/function normalizeWeather\(w\)\s*\{[\s\S]*?\n\}\n/); // V7 · DBT-01
  assert.ok(m, 'normalizeWeather présent');
  vm.runInContext(m[0] + '\nglobalThis.nw = normalizeWeather;', sandbox);
  const nw = sandbox.nw;
  assert.equal(nw('rain'), 'rain');
  assert.equal(nw('rainy'), 'rain');
  assert.equal(nw('sun'), 'sun');
  assert.equal(nw('sunny'), 'sun');
  assert.equal(nw('sand'), 'sand');
  assert.equal(nw('sandstorm'), 'sand');
  assert.equal(nw('hail'), 'hail');
  assert.equal(nw('none'), 'none');
});

test('DORM-02j: la puissance des objets tenus suit le nombre possédé (1→25)', () => {
  const sandbox = {
    console, window: {}, globalThis: {},
    G: { inventory: {}, team: [], teamSlotItems: [] },
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource([
    'src/data/items-data.js',
    'src/application/economy/item-engine.js',
  ]), sandbox, { filename: 'item-engine [iife]' });
  const IE = sandbox.ItemEngine;
  // 6 paliers : 1 (0-4), 2 (5-9), 3 (10-14), 4 (15-19), 5 (20-24), 6 (25).
  assert.equal(IE.getPowerLevel(0), 1);
  assert.equal(IE.getPowerLevel(4), 1);
  assert.equal(IE.getPowerLevel(5), 2);
  assert.equal(IE.getPowerLevel(10), 3);
  assert.equal(IE.getPowerLevel(20), 5);
  assert.equal(IE.getPowerLevel(24), 5);
  assert.equal(IE.getPowerLevel(25), 6, '25 exemplaires = palier max');
  // Charbon : 1+0.1×niveau → 1 exemplaire = ×1.10, 25 = ×1.60.
  const close = (a, b) => Math.abs(a - b) < 1e-9;
  sandbox.G.inventory = { charcoal: 1 };
  assert.ok(close(IE.getItemPower('charcoal'), 1.1), `1 ex. = ×1.10 (${IE.getItemPower('charcoal')})`);
  sandbox.G.inventory = { charcoal: 10 };
  assert.ok(close(IE.getItemPower('charcoal'), 1.3), '10 exemplaires = ×1.30 (benchmark)');
  sandbox.G.inventory = { charcoal: 25 };
  assert.ok(close(IE.getItemPower('charcoal'), 1.6), '25 exemplaires = ×1.60');
  // Un objet sans formule reste neutre.
  sandbox.G.inventory = { smooth_rock: 25 };
  assert.equal(IE.getItemPower('smooth_rock'), 1);
});

test('DORM-02j: le combat applique la puissance possédée (plus de ×1,3 figé)', () => {
  const src = R('src/application/combat/battle-attack.js');
  assert.ok(src.includes('heldItemMultFor(attackerHeldItem, side);'), 'boosters de type → heldItemMultFor (côté du porteur)');
  assert.ok(src.includes("heldItemMultFor('choice_band', side)"), 'Bandeau Choix → heldItemMultFor');
  assert.ok(src.includes("heldItemMultFor('life_orb', side)"), 'Orbe Vie → heldItemMultFor');
  assert.ok(src.includes("heldItemMultFor('muscle_band', side)"), 'Muscle Band → heldItemMultFor');
  assert.ok(!/attackerHeldItem === 'choice_band' && mv\.cat === 'phys'\) itemTypeMult \*= 1\.5;/.test(src), 'plus de multiplicateur figé ×1,5 (choix)');
  assert.ok(!/attackerHeldItem === 'muscle_band' && mv\.cat === 'phys'\) itemTypeMult \*= 1\.1;/.test(src), 'plus de multiplicateur figé ×1,1 (muscle band)');
});

test('DORM-02j: un objet tenu par un NPC garde sa valeur canonique (jamais l\'inventaire du joueur)', () => {
  const sandbox = { console, window: {}, globalThis: {}, G: { inventory: {} } };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource(['src/data/items-data.js']), sandbox, { filename: 'items [iife]' });
  const src = R('src/application/combat/battle-attack.js');
  const extractFn = (name) => {
    const start = src.indexOf('function ' + name);
    if (start < 0) return null;
    let i = src.indexOf('{', start); let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    return src.slice(start, i + 1);
  };
  const fns = ['heldPowerLevel', 'heldItemPower', 'npcHeldItemMult', 'heldItemMultFor'].map(extractFn);
  assert.ok(fns.every(Boolean), 'fonctions DORM-02j présentes');
  vm.runInContext(fns.join('\n') + '\nglobalThis.__npc = npcHeldItemMult; globalThis.__hmf = heldItemMultFor;', sandbox);
  const close = (a, b) => Math.abs(a - b) < 1e-9;
  // Valeurs canoniques NPC = celles d'avant la mise à l'échelle 1→25.
  assert.ok(close(sandbox.__npc('choice_specs'), 1.5), 'NPC Lunettes Choix = ×1.5');
  assert.ok(close(sandbox.__npc('charcoal'), 1.3), 'NPC Charbon = ×1.3');
  assert.ok(close(sandbox.__npc('hard_stone'), 1.3), 'NPC Pierre Dure = ×1.3');
  assert.ok(close(sandbox.__npc('life_orb'), 1.3), 'NPC Orbe Vie = ×1.3');
  assert.ok(close(sandbox.__npc('muscle_band'), 1.1), 'NPC Muscle Band = ×1.1');
  assert.equal(sandbox.__npc('smooth_rock'), 1, 'objet sans formule = neutre');
  // Côté joueur : la puissance suit l'inventaire (0 exemplaire = palier 1).
  assert.ok(close(sandbox.__hmf('choice_specs', 'player'), 1.15), 'joueur 0 Lunettes Choix = ×1.15');
  assert.ok(close(sandbox.__hmf('choice_specs', 'enemy'), 1.5), 'ennemi = valeur canonique, indépendante de l\'inventaire');
});

test('DORM-02g: Encens Pur augmente le poids du seau « rare »', () => {
  const wild = [[10, 3, 6, 'common'], [13, 3, 6, 'uncommon'], [150, 50, 55, 'rare']];
  // Sans bonus : le seuil « rare » est 0.04 → rng 0.045 tombe dans « uncommon ».
  const noBoost = pickWildFromTable(wild, { rng: () => 0.045 });
  assert.equal(noBoost.bucket, 'uncommon');
  // +50 % de poids rare : seuil 0.06 → rng 0.045 tombe dans « rare ».
  const boosted = pickWildFromTable(wild, { rareBoostPct: 50, rng: () => 0.045 });
  assert.equal(boosted.bucket, 'rare');
  assert.equal(boosted.speciesId, 150);
});

test('DORM-00: descriptions FR réelles des objets tenus (plus de phrase générique)', () => {
  const sandbox = { console, window: {}, globalThis: {}, G: { inventory: {} } };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource([
    'src/data/items-data.js',
    'src/application/economy/item-engine.js',
  ]), sandbox, { filename: 'item-engine [iife]' });
  const d = (k) => sandbox.ItemEngine.generateItemDesc(k, 'fr');
  assert.ok(d('lucky_egg').includes('EXP'), 'Œuf Chance → XP');
  assert.ok(!d('lucky_egg').includes('Augmente la puissance'), 'plus de phrase générique pour l\'Œuf Chance');
  assert.ok(d('pure_incense').includes('rares'), 'Encens Pur → Pokémon rares');
  assert.ok(d('eviolite').includes('évoluer'), 'Évoluroc → évolution');
  assert.ok(d('terrain_extender').includes('terrain'), 'Extension de Terrain → terrain');
  assert.ok(d('weakness_policy').includes('super efficace'), 'Vulné-Assurance → coup super efficace');
  assert.ok(d('quick_claw').includes('plus vite'), 'Vive Griffe → vitesse');
  assert.ok(d('loaded_dice').includes('multi-coups'), 'Dé à Jouer → multi-coups');
});

test('DORM-02h: Vive Griffe, Herbe Mentale, Poing Chance et Queue Lente sont câblés', () => {
  const atk = R('src/application/combat/battle-attack.js');
  // Poing Chance : dégâts + effets secondaires ×2 sur les capacités de poing.
  assert.ok(atk.includes("attackerHeldItem === 'lucky_punch' && isPunchMove(moveId)"), 'Poing Chance → dégâts de poing');
  assert.ok(atk.includes("attackerHeldItem === 'lucky_punch' && isPunchMove(moveId)) secChance *= 2;"), 'Poing Chance → effets secondaires ×2');
  assert.ok(atk.includes("function isPunchMove"), 'détecteur de capacité de poing présent');
  // Queue Lente : capacités lentes (multiplicateur de cooldown > 1) ×plus fort.
  assert.ok(atk.includes("attackerHeldItem === 'lagging_tail' && getMoveCooldownMultiplier(mv) > 1"), 'Queue Lente → capacités lentes'); // V7 · DBT-04 — import explicite, plus de garde typeof
  // Herbe Mentale : durée de statut −1 tour.
  assert.ok(atk.includes('function heldStatusTurns'), 'Herbe Mentale → helper présent');
  // Vive Griffe : cooldown réduit sur les capacités rapides.
  const init = R('src/application/combat/battle-init.js');
  assert.ok(init.includes("held === 'quick_claw' && getMoveCooldownMultiplier(usedMv) < 1"), 'Vive Griffe → cooldown réduit (joueur)');
  assert.ok(init.includes("held === 'quick_claw' && getMoveCooldownMultiplier(usedMv) < 1") && init.includes('1.15; // valeur canonique NPC'), 'Vive Griffe → valeur canonique NPC');
});

test('DORM-02h: Herbe Mentale réduit la durée des statuts (min 1 tour)', () => {
  const sandbox = { console, window: {}, globalThis: {}, G: { team: [], teamSlotItems: [] } };
  sandbox.pwLateLink = (n) => (typeof sandbox[n] === 'function' ? sandbox[n] : null); // V7 · DBT-04 — résolveur de lien tardif (src/core/late-link.js) pour les tranches de fonctions
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = R('src/application/combat/battle-attack.js');
  const start = src.indexOf('function heldStatusTurns');
  assert.ok(start >= 0, 'heldStatusTurns présent');
  let i = src.indexOf('{', start); let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  const fn = src.slice(start, i + 1);
  vm.runInContext(fn + '\nglobalThis.__hst = heldStatusTurns;', sandbox);
  const poke = { heldItem: 'mental_herb' };
  const plain = { heldItem: 'charcoal' };
  assert.equal(sandbox.__hst(poke, 3), 2, '3 tours → 2 avec Herbe Mentale');
  assert.equal(sandbox.__hst(poke, 1), 1, '1 tour → min 1');
  assert.equal(sandbox.__hst(plain, 3), 3, 'sans Herbe Mentale, inchangé');
});

test('DORM-04: les familles de capacités sont classées (vocabulaire PokeChill)', () => {
  const sandbox = { console, window: {}, globalThis: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = R('src/application/combat/battle-attack.js');
  const extractFn = (name) => {
    const start = src.indexOf('function ' + name);
    if (start < 0) return null;
    let i = src.indexOf('{', start); let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    return src.slice(start, i + 1);
  };
  const fns = ['isPunchMove', 'isFangMove', 'isClawMove', 'isPulseMove', 'isSharpMove'].map(extractFn);
  assert.ok(fns.every(Boolean), 'détecteurs de familles présents');
  const constStart = src.indexOf('const SHARP_MOVES');
  const constEnd = src.indexOf('};', constStart) + 2;
  vm.runInContext(fns.join('\n') + '\n' + src.slice(constStart, constEnd) + '\nglobalThis.__t = { isPunchMove, isFangMove, isClawMove, isPulseMove, isSharpMove };', sandbox);
  const t = sandbox.__t;
  assert.equal(t.isPunchMove('ice_punch'), true, 'ice_punch = poing');
  assert.equal(t.isPunchMove('tackle'), false);
  assert.equal(t.isFangMove('fire_fang'), true, 'fire_fang = croc');
  assert.equal(t.isFangMove('crunch'), false, 'crunch n\'est pas un « fang » PokeChill');
  assert.equal(t.isClawMove('dragon_claw'), true, 'dragon_claw = griffe');
  assert.equal(t.isPulseMove('dark_pulse'), true, 'dark_pulse = pulsation');
  assert.equal(t.isSharpMove('leaf_blade'), true, 'leaf_blade = lame');
  assert.equal(t.isSharpMove('rock_throw'), false);
});

test('DORM-04: les talents « divers » sont branchés (source PokeChill)', () => {
  const atk = R('src/application/combat/battle-attack.js');
  assert.ok(atk.includes("_hasTal(attacker, 'strongjaw') && isFangMove(moveId)"), 'Prognathe ×2 crocs');
  assert.ok(atk.includes("_hasTal(attacker, 'toughclaws') && isClawMove(moveId)"), 'Griffe Dure ×2 griffes');
  assert.ok(atk.includes("_hasTal(attacker, 'ironfist') && isPunchMove(moveId)"), 'Poing de Fer ×1,5 poings');
  assert.ok(atk.includes("_hasTal(attacker, 'sharpness') && isSharpMove(moveId)"), 'Lame Tranchante ×1,5 lames');
  assert.ok(atk.includes("_hasTal(attacker, 'megalauncher') && isPulseMove(moveId)"), 'Méga Blaster ×1,5 pulsations');
  assert.ok(atk.includes("_hasTal(attacker, 'reckless') && getMoveCooldownMultiplier(mv) > 1"), 'Témérité ×1,5 capacités lentes'); // V7 · DBT-04
  assert.ok(atk.includes("_hasTal(attacker, 'merciless') && defender.status"), 'Impitoyable ×1,5 cible avec statut');
  assert.ok(atk.includes("_hasTal(attacker, 'rivalry') && _shareType"), 'Rivalité ×1,5 type partagé');
  assert.ok(atk.includes("_hasTal(attacker, 'sheerforce') && mv.eff && mv.effC"), 'Sans Limite détecté');
  assert.ok(wsIncludes(atk, '!_sheerForce&&mv.eff&&secChance'), 'Sans Limite supprime l\'effet secondaire'); // V7 · DBT-01
  assert.ok(atk.includes("_hasTal(attacker, 'sandforce')"), 'Force Sable branchée');
  // Scrappy : les Spectres sont touchés par Normal/Combat.
  assert.ok(atk.includes("_talSc === 'scrappy' && eff === 0 && (mv.type === 'Normal' || mv.type === 'Fighting')"), 'Scrappy → touche les Spectres');
  // Cœur Noble : +100 % Att. Spé après coup super-efficace subi.
  assert.ok(atk.includes("_hasTal(defender, 'justified') && eff > 1"), 'Cœur Noble branché');
  // Moxie / Turbo : bonus au K.O.
  const status = R('src/application/combat/battle-status.js');
  assert.ok(status.includes("_ht('moxie') && battle.playerMods"), 'Moxie au K.O.');
  assert.ok(status.includes("_ht('speedboost') && battle.playerMods"), 'Turbo au K.O.');
});

test('DORM-04: familles additionnelles (tête/son/danse/vent) et map -ate', () => {
  const sandbox = { console, window: {}, globalThis: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = R('src/application/combat/battle-attack.js');
  const extractConst = (name) => {
    const start = src.indexOf('const ' + name);
    if (start < 0) return null;
    const end = src.indexOf('};', start) + 2;
    return src.slice(start, end);
  };
  const extractFn = (name) => {
    const start = src.indexOf('function ' + name);
    if (start < 0) return null;
    let i = src.indexOf('{', start); let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    return src.slice(start, i + 1);
  };
  const code = ['isHeadMove','isSoundMove','isDanceMove','isWindMove'].map(extractFn).filter(Boolean).join('\n')
    + '\n' + ['HEAD_MOVES','SOUND_MOVES','DANCE_MOVES','WIND_MOVES','ATE_MAP'].map(extractConst).filter(Boolean).join('\n')
    + '\nglobalThis.__t = { isHeadMove, isSoundMove, isDanceMove, isWindMove, ATE_MAP };';
  vm.runInContext(code, sandbox);
  const t = sandbox.__t;
  assert.equal(t.isHeadMove('iron_head'), true, 'iron_head = tête');
  assert.equal(t.isHeadMove('tackle'), false);
  assert.equal(t.isSoundMove('hyper_voice'), true, 'hyper_voice = son');
  assert.equal(t.isSoundMove('flamethrower'), false);
  assert.equal(t.isDanceMove('swords_dance'), true, 'swords_dance = danse');
  assert.equal(t.isDanceMove('rain_dance'), false, 'rain_dance exclu (météo)');
  assert.equal(t.isWindMove('hurricane'), true, 'hurricane = vent');
  assert.equal(t.ATE_MAP.aerilate, 'Flying', 'aerilate → Vol');
  assert.equal(t.ATE_MAP.galvanize, 'Electric', 'galvanize → Électrik');
});

test('DORM-04: talents d\'efficacité/dégâts branchés (normalize, -ate, écran pilon…)', () => {
  const atk = R('src/application/combat/battle-attack.js');
  assert.ok(atk.includes('talentDmgMult'), 'multiplicateur de dégâts des talents présent');
  assert.ok(atk.includes("_talNorm === 'normalize'"), 'Normalise branché');
  assert.ok(atk.includes('const _ateType = ATE_MAP[_talAte];'), 'talents -ate branchés');
  assert.ok(atk.includes("_talSd === 'shieldsdown' && eff > 1"), 'Écran Pilon branché');
  assert.ok(atk.includes("_talTa === 'thousandarms' && eff < 2"), 'Mille Bras branché');
  assert.ok(atk.includes("_hasTal(defender, 'wonderguard') && eff < 2"), 'Garde Mystik branchée');
  assert.ok(atk.includes("_hasTal(defender, 'purifyingsalt') && mv.type === 'Ghost'"), 'Sel Purificateur branché');
  assert.ok(atk.includes("_hasTal(attacker, 'metalhead') && isHeadMove(moveId)"), 'Tête de Fer branchée');
  assert.ok(atk.includes("_hasTal(attacker, 'libero') && getMoveCooldownMultiplier(mv) < 1"), 'Libéro branché'); // V7 · DBT-04
  assert.ok(atk.includes("_hasTal(attacker, 'supremeoverlord')"), 'Général Suprême branché');
  assert.ok(atk.includes("_hasTal(attacker, 'gorillatactics')"), 'Tactique Gorille branchée');
  assert.ok(atk.includes("_hasTal(attacker, 'brittlearmor')"), 'Armure Cassante branchée');
  assert.ok(atk.includes("_hasTal(attacker, 'flareboost')"), 'Brasier branché');
  assert.ok(atk.includes("_hasTal(attacker, 'toxicboost')"), 'Boost Toxique branché');
  assert.ok(atk.includes("_hasTal(attacker, 'raindish')"), 'Cuvette branchée');
  assert.ok(atk.includes("_hasTal(defender, 'icebody')"), 'Corps Gelé branché');
  assert.ok(atk.includes('protosynthesis') && atk.includes('quarkdrive'), 'Proto-Synthèse / Charge Quantique branchés');
  assert.ok(atk.includes('darkaura') && atk.includes('soulasterism'), 'auras d\'équipe branchées');
  assert.ok(atk.includes("_hasTal(defender, 'angerpoint')"), 'Colérique branché');
  assert.ok(atk.includes('syncStatusBack'), 'Synchro branché');
  assert.ok(atk.includes('weatherTurnsFor'), 'Climatact branché (météo)');
  assert.ok(wsIncludes(atk, "s==='confuse'"), 'Confusion gérée dans handleStatusBeforeMove'); // V7 · DBT-01
  // au contact
  assert.ok(atk.includes("_hasTal(defender, 'flamebody')"), 'Corps Ardent au contact');
  assert.ok(atk.includes("_hasTal(defender, 'effectspore')"), 'Pose Spore au contact');
  assert.ok(atk.includes("_hasTal(defender, 'glacialbody')"), 'Corps Gelé (statut) au contact');
  assert.ok(atk.includes("_hasTal(defender, 'strangecharm')"), 'Charme Étrange au contact');
  assert.ok(atk.includes("_hasTal(defender, 'gooey')"), 'Poisseux au contact');
});

test('DORM-04: statuts périodiques et bonus au K.O. branchés (battle-status)', () => {
  const status = R('src/application/combat/battle-status.js');
  assert.ok(status.includes("hasTal('scorch')"), 'Cramé (brûlure ×2) branché');
  assert.ok(status.includes("hasTal('corrosion')"), 'Corrosion (poison ×2) branchée');
  assert.ok(status.includes("hasTal('flareboost')"), 'Brasier (immunité brûlure) branché');
  assert.ok(status.includes("hasTal('toxicboost')"), 'Boost Toxique (immunité poison) branché');
  assert.ok(status.includes("_ht('strategist')"), 'Stratège au K.O. branché');
  assert.ok(status.includes("_ht('beastboost')"), 'Beast Boost au K.O. branché');
});

test('DORM-04: vitesse par famille + entrée (battle-init / tick)', () => {
  const init = R('src/application/combat/battle-init.js');
  assert.ok(init.includes('function moveSpeedTalentMult'), 'moveSpeedTalentMult présent');
  for (const t of ['galewings','prankster','neuroforce','cacophony','dancer','windrider','iaido']) {
    assert.ok(init.includes("hasTal('" + t + "')"), `vitesse : ${t} branché`);
  }
  assert.ok(init.includes("hasTal('moltshed')"), 'Mue branchée');
  assert.ok(init.includes("hasTal('intangible')"), 'Impalpable branché');
  assert.ok(init.includes("hasTal('faerush')"), 'Rush Fée branché');
  assert.ok(init.includes("hasTal('hyperconductor')"), 'Hyperconducteur branché');
  assert.ok(init.includes('moveSpeedTalentMult(p, usedMv)') && init.includes('moveSpeedTalentMult(e, usedMv)'), 'vitesse appliquée joueur + ennemi');

  const tick = R('src/domain/battle/tick.js');
  assert.ok(tick.includes("hasTal('naturalcure') && poke.status"), 'Médic Nature à l\'entrée');
  assert.ok(tick.includes("hasTal('somberfield')"), 'Champ Sombre à l\'entrée');
  assert.ok(tick.includes('const clim = (turns)'), 'Climatact à l\'entrée');
  assert.ok(tick.includes("globalThis.hasTalent(target, 'fullmetalbody')"), 'Garde d\'Intimidation (Full Metal Body / Hyper Cutter)');
});

test('DORM-02h suite: métronome, dé à jouer, lumargile, herbe pouvoir, bottes, amulette, fuite', () => {
  const atk = R('src/application/combat/battle-attack.js');
  const init = R('src/application/combat/battle-init.js');
  // Métronome : stacks de répétition.
  assert.ok(atk.includes("attackerHeldItem === 'metronome'"), 'Métronome branché');
  assert.ok(atk.includes('_metronomeStacks'), 'stacks de répétition');
  // Dé à Jouer + Bouchon : multi-coups forcés au maximum.
  assert.ok(atk.includes('_hasTal(attacker, \'skilllink\') || attackerHeldItem === \'loaded_dice\''), 'Bouchon / Dé à Jouer → coups max');
  assert.ok(atk.includes('mv.multihit && Array.isArray(mv.multihit)'), 'multi-coups branché');
  // Lumargile / Bottes Lourdes.
  assert.ok(atk.includes("attackerHeldItem === 'light_clay'"), 'Lumargile branchée');
  assert.ok(atk.includes("defenderHeldItem === 'heavy_duty_boots'"), 'Bottes Lourdes branchées');
  // Amulette Pure : protège des baisses de stats (moteur de boosts).
  const sm = R('src/application/combat/stat-mods.js');
  assert.ok(sm.includes("held === 'clear_amulet'"), 'Amulette Pure → protection moteur');
  const tick = R('src/domain/battle/tick.js');
  assert.ok(tick.includes("targetHeld === 'clear_amulet'"), 'Amulette Pure → Intimidation');
  // Bouton / Sac de Fuite : switch forcé.
  assert.ok(atk.includes("attackerHeldItem === 'eject_button' || attackerHeldItem === 'eject_pack'"), 'Bouton / Sac de Fuite branchés');
  // Herbe Pouvoir : capacités lentes normalisées.
  assert.ok(init.includes("held === 'power_herb' && getMoveCooldownMultiplier(usedMv) > 1"), 'Herbe Pouvoir branchée');
});

test('DORM-04: moteur de boosts (contrary/simple/stoned/protections)', async () => {
  const mod = await import('../src/application/combat/stat-mods.js');
  globalThis.battle = { playerMods:{atk:1,def:1,spe:1}, enemyMods:{atk:1,def:1,spe:1}, boostTurns:{player:{},enemy:{}} };
  globalThis.G = { team: [] };
  const close = (a,b) => Math.abs(a-b) < 1e-9;
  // boost simple
  mod.pwStatChange('player','atk',1.5,{poke:{talent:'none'}});
  assert.ok(close(globalThis.battle.playerMods.atk, 1.5), 'boost ×1,5');
  // contrary inverse
  globalThis.battle.playerMods.atk = 1;
  mod.pwStatChange('player','atk',1.5,{poke:{talent:'contrary'}});
  assert.ok(close(globalThis.battle.playerMods.atk, 2/3), 'contrary inverse');
  // simple : ×1,5 → ×2,25
  globalThis.battle.playerMods.spa = 1;
  mod.pwStatChange('player','spa',1.5,{poke:{talent:'simple'}});
  assert.ok(close(globalThis.battle.playerMods.spa, 2.25), 'simple ×2,25');
  // bigpecks protège la Défense
  globalThis.battle.playerMods.def = 1;
  mod.pwStatChange('player','def',0.5,{poke:{talent:'bigpecks'}});
  assert.equal(globalThis.battle.playerMods.def, 1, 'bigpecks protège');
  // hypercutter protège l'Attaque
  globalThis.battle.playerMods.atk = 1;
  mod.pwStatChange('player','atk',0.5,{poke:{talent:'hypercutter'}});
  assert.equal(globalThis.battle.playerMods.atk, 1, 'hypercutter protège');
  // clear amulet protège tout
  globalThis.battle.playerMods.spe = 1;
  mod.pwStatChange('player','spe',0.5,{poke:{talent:'none', heldItem:'clear_amulet'}});
  assert.equal(globalThis.battle.playerMods.spe, 1, 'amulette protège');
  // stoned ×3 durée (3 tours de base)
  mod.pwStatChange('player','atk',1.5,{poke:{talent:'stoned'}});
  assert.equal(globalThis.battle.boostTurns.player.atk, 9, 'stoned ×3 durée');
  // durée décrémentée puis expirée
  mod.pwTickBoostDurations('player');
  mod.pwStatChange('player','spd',1.5,{poke:{talent:'none'}});
  for(let i=0;i<10;i++) mod.pwTickBoostDurations('player');
  assert.equal(globalThis.battle.playerMods.spd, 1, 'expiration du boost');
  delete globalThis.battle; delete globalThis.G;
});

test('DORM-04: capacités de statut interprétées + mécaniques PokeChill', () => {
  const atk = R('src/application/combat/battle-attack.js');
  assert.ok(atk.includes('function executeStatMove'), 'interpréteur de statut présent');
  for (const s of ["light_screen", "'reflect'", "'safeguard'", "'crossroom'", "'weirdroom'", "'trickroom'", "id === 'venoshock'", "id === 'memento'", "id === 'belly_drum'", "id === 'acupressure'", "id === 'baton_pass'", "id === 'camouflage'", "id === 'conversion'", "id === 'metronome'", "id === 'mimic'", "id === 'sketch'", "id === 'pay_day'", "id === 'teatime'", "id === 'chilly_reception'", "TYPE_ADD", "_temporalType"]) {
    assert.ok(atk.includes(s), `statut : ${s} géré`);
  }
  assert.ok(atk.includes('_parseStatPcts'), 'parseur de pourcentages présent');
  assert.ok(atk.includes('fury_cutter'), 'Taillade (×1,2) branchée');
  assert.ok(atk.includes('cross-power'), 'cross-power branché');
  assert.ok(atk.includes("_hasTal(attacker, 'ambidextrous')") && atk.includes("_hasTal(attacker, 'treasureofruin')"), 'Ambidextre / Trésor de la Ruine branchés');
  assert.ok(atk.includes("_hasTal(attacker, 'unaware')"), 'Insouciant branché');
  assert.ok(atk.includes('_camouflageType'), 'Camouflage/Conversion branchés');
  assert.ok(atk.includes("battle.weather === 'lightscreen'"), 'écrans (dégâts) branchés');
  assert.ok(wsIncludes(atk, "_cs = applier"), 'Color Spore branché'); // V7 · DBT-01
  assert.ok(atk.includes('sweetveil') && atk.includes('pastelveil') && atk.includes('flowerveil') && atk.includes('aromaveil'), 'voiles d\'équipe branchés');
  assert.ok(atk.includes("battle.weather === 'safeguard'"), 'Rune Protectrice branchée');
  const status = R('src/application/combat/battle-status.js');
  assert.ok(status.includes("hasTal('moody')"), 'Moody branché');
  assert.ok(status.includes("hasTal('stamina')"), 'Endurance (fatigue) branchée');
  assert.ok(status.includes('pwTickBoostDurations'), 'durées de boosts décrémentées');
  const tick = R('src/domain/battle/tick.js');
  assert.ok(tick.includes("hasTal('dauntinglook')"), 'Regard Intimidant branché');
  const enc = R('src/application/combat/battle-encounter.js');
  assert.ok(enc.includes("hasTalent(tp, 'powerofalchemy')"), 'Pouvoir d\'Alchimie branché');
  const gh = R('src/data/game-helpers.js');
  assert.ok(gh.includes('poke._tempTalent'), 'talent temporaire supporté');
  const init = R('src/application/combat/battle-init.js');
  assert.ok(init.includes('function moveSpeedTalentMult'), 'vitesse par famille présente');
  assert.ok(R('src/application/world/collection.js').includes("talents.has('goodasgold')"), 'Good as Gold (shiny) branché');
});

test('DORM-04: effets secondaires des attaques (desc PokeChill) branchés', async () => {
  const sandbox = { console, window: {}, globalThis: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = R('src/application/combat/battle-attack.js');
  const extractFn = (name) => {
    const start = src.indexOf('function ' + name);
    if (start < 0) return null;
    let i = src.indexOf('{', start); let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    return src.slice(start, i + 1);
  };
  const extractConst = (name) => {
    const start = src.indexOf('const ' + name);
    if (start < 0) return '';
    const end = src.indexOf(';\n', start) + 1;
    return src.slice(start, end);
  };
  const code = ['_pwSecondaryFromDesc','_pwRecoilOf','_pwDrainOf'].map(extractFn).filter(Boolean).join('\n')
    + '\n' + ['STATUS_WORDS','RECOIL_MAP','DRAIN_MAP'].map(extractConst).filter(Boolean).join('\n')
    + '\nconst STAT_WORD_MAP = { "special attack":"spa", "special defense":"spd", "attack":"atk", "defense":"def", "speed":"spe" };\n'
    + '\nglobalThis.__fx = { _pwSecondaryFromDesc, _pwRecoilOf, _pwDrainOf };';
  vm.runInContext(code, sandbox);
  const fx = sandbox.__fx;
  // statut
  const blaze = fx._pwSecondaryFromDesc({ desc: '10% chance to inflict Burn' });
  assert.equal(blaze.status, 'burn', 'brûlure détectée');
  assert.equal(blaze.statusChance, 10, 'chance 10 %');
  // baisse de stats
  const acid = fx._pwSecondaryFromDesc({ desc: '10% chance to decrease enemy Special Defense by 50%' });
  assert.equal(acid.drops.length, 1, 'baisse détectée');
  assert.equal(acid.drops[0].stat, 'spd', 'stat = Déf. Spé');
  assert.equal(acid.drops[0].pct, 50, '50 %');
  assert.equal(acid.drops[0].chance, 10, 'chance 10 %');
  // hausse
  const charge = fx._pwSecondaryFromDesc({ desc: '50% chance to increase Special Attack by 50%' });
  assert.equal(charge.boosts.length, 1, 'hausse détectée');
  assert.equal(charge.boosts[0].stat, 'spa', 'stat = Att. Spé');
  assert.equal(charge.boosts[0].pct, 50, '50 %');
  assert.equal(charge.boosts[0].chance, 50, 'chance 50 %');
  // flinch
  const ironHead = fx._pwSecondaryFromDesc({ desc: 'Has a chance to make the target flinch.' });
  assert.equal(ironHead.flinch, 20, 'flinch détecté');
  // précision
  const mudSlap = fx._pwSecondaryFromDesc({ desc: 'Has a chance to lower the target’s accuracy by one stage.' });
  assert.equal(mudSlap.accDown, 30, 'baisse de précision détectée');
  // recul / drain
  assert.equal(fx._pwRecoilOf({ id:'doubleedge' }), 0.25, 'recul 1/4');
  assert.equal(fx._pwRecoilOf({ id:'mind_blown' }), 0.5, 'recul moitié PV max');
  assert.equal(fx._pwDrainOf({ id:'bitter_blade' }), 0.5, 'drain 50 %');
  assert.equal(fx._pwDrainOf({ id:'tackle' }), 0, 'pas de drain');
  // présence des blocs dans le moteur
  const atk = R('src/application/combat/battle-attack.js');
  assert.ok(atk.includes('_pwSecondaryFromDesc(mv)'), 'effets secondaires appliqués');
  assert.ok(atk.includes('defender._flinch = true'), 'flinch appliqué');
  assert.ok(atk.includes('defender._accDown'), 'baisse de précision appliquée');
  assert.ok(atk.includes('_pwRecoilOf(mv)'), 'recul appliqué');
  assert.ok(atk.includes('_pwDrainOf(mv)'), 'drain appliqué');
  assert.ok(atk.includes('attack_order'), 'Appel Attaque (×1,15) branché');
});

test('DORM-04: cooldown fidèle aux descriptions PokeChill (x1.2-1.5)', () => {
  const sandbox = { console, window: {}, globalThis: {}, MOVES: {
    solar_beam: { id:'solar_beam', desc:'Attacks x1.2 slower than usual' },
    hyper_beam: { id:'hyper_beam', desc:'Attacks x1.5 slower than usual' },
    accelerock: { id:'accelerock', desc:'Attacks x1.2 faster than usual', prio:1 },
    tackle: { id:'tackle', desc:'...' },
  } };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = R('src/application/combat/battle-init.js');
  const start = src.indexOf('function getMoveCooldownMultiplier');
  let i = src.indexOf('{', start); let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  vm.runInContext(src.slice(start, i + 1) + '\nglobalThis.__gcm = getMoveCooldownMultiplier;', sandbox);
  const g = sandbox.__gcm;
  const close = (a,b) => Math.abs(a-b) < 1e-9;
  assert.ok(close(g(sandbox.MOVES.solar_beam), 1.2), 'Lance-Soleil ×1,2');
  assert.ok(close(g(sandbox.MOVES.hyper_beam), 1.5), 'Ultralaser ×1,5');
  assert.ok(close(g(sandbox.MOVES.accelerock), 1/1.2), 'Vif Roc ×(1/1,2)');
  assert.equal(g(sandbox.MOVES.tackle), 1, 'Charge ×1');
});

test('DORM-04: AUCUN talent inerte — les 195 talents de TALENTS_FULL sont branchés', () => {
  const tal = R('src/data/talents-full.js');
  const keys = [...tal.matchAll(/^\s{2}([a-z0-9_]+):\s*\{/gm)].map((m) => m[1]);
  assert.ok(keys.length >= 190, `TALENTS_FULL complet (${keys.length})`);
  const engineFiles = [
    'src/application/combat/battle-attack.js',
    'src/application/combat/battle-init.js',
    'src/application/combat/battle-status.js',
    'src/application/combat/stat-mods.js',
    'src/application/combat/battle-encounter.js',
    'src/application/combat/catch.js',
    'src/application/combat/progression.js',
    'src/domain/battle/tick.js',
    'src/application/world/collection.js',
    'src/application/world/team.js',
    'src/data/game-helpers.js',
  ].map((f) => R(f)).join('\n');
  const missing = keys.filter((k) => !engineFiles.includes(k));
  assert.deepEqual(missing, [], 'talents absents du moteur');
});

test('DORM-04: AUCUNE capacité inerte — les effets des 419 capacités sont traités', () => {
  const sandbox = { console, window: {}, globalThis: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource(['src/data/moves.js']), sandbox, { filename: 'moves [iife]' });
  const MOVES = sandbox.MOVES;
  const ids = Object.keys(MOVES);
  // Chaque capacité doit tomber dans une catégorie gérée par le moteur.
  const handled = [];
  for (const id of ids) {
    const mv = MOVES[id];
    if (!mv) { handled.push(id); continue; }
    const d = String(mv.desc || '');
    const ok =
      mv.cat === 'stat' ||              // executeStatMove
      mv.multihit ||                    // multi-coups
      mv.eff ||                         // statut
      /chance to|flinch|recoil|restore|drain|absorb|decreases|increases|bypasses/i.test(d) || // effets secondaires
      /slower|faster/i.test(d) ||       // vitesse
      mv.power > 0 ||                   // dégâts simples
      mv.fixed != null;
    if (!ok) handled.push(id);
  }
  assert.deepEqual(handled, [], 'capacités sans effet branché');
});

test('DORM-06: baies ajoutées + échelle 1→25 (powerFormula)', () => {
  const sandbox = { console, window: {}, globalThis: {}, G: { inventory: {} } };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource(['src/data/items-data.js']), sandbox, { filename: 'items [iife]' });
  const I = sandbox.ITEMS;
  // présences clés
  assert.equal(I.cheri_berry.category, 'immunity_berry', 'Cheri = immunité');
  assert.equal(I.cheri_berry.immunity, 'para', 'Cheri → Paralysie');
  assert.equal(I.prine_berry.category, 'cure_all', 'Prine = Lum (soigne tout)');
  assert.equal(I.leppa_berry.category, 'skip_cd', 'Mepo = skip CD');
  assert.equal(I.oran_berry.category, 'pinch_heal', 'Oran = soin à PV bas');
  assert.equal(I.liechi_berry.stat, 'atk', 'Lichii = Attaque');
  assert.equal(I.pomeg_berry.category, 'entry_debuff', 'Grana = débuff entrée');
  assert.equal(I.chilan_berry.resistType, 'Normal', 'Chilan = résistance Normal');
  assert.equal(I.snover_berry.category, 'ice_boost', 'Snover = boost Glace');
  assert.equal(I.hopo_berry.category, 'loot_boost', 'Hopo = butin');
  assert.equal(I.pinkan_berry.category, 'flavor', 'Pinkan = saveur (Sevii plus tard)');
  // échelle 1→25 : Mepo 15 % (1 ex.) → 40 % (25 ex.)
  const atk = R('src/application/combat/battle-attack.js');
  const extractFn = (name) => {
    const start = atk.indexOf('function ' + name);
    if (start < 0) return null;
    let i = atk.indexOf('{', start); let depth = 0;
    for (; i < atk.length; i++) { if (atk[i] === '{') depth++; else if (atk[i] === '}') { depth--; if (depth === 0) break; } }
    return atk.slice(start, i + 1);
  };
  const fns = ['berryLevel', 'berryPowerVal'].map(extractFn);
  assert.ok(fns.every(Boolean), 'helpers de baies présents');
  vm.runInContext(harnessBundleSource(['src/data/items-data.js']), sandbox, { filename: 'items [iife]' });
  vm.runInContext(fns.join('\n') + '\nglobalThis.__bl = berryLevel; globalThis.__bp = berryPowerVal;', sandbox);
  const close = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(close(sandbox.__bp('leppa_berry', 1), 0.15), 'Mepo 1 ex. = 15 %');
  assert.ok(close(sandbox.__bp('leppa_berry', 6), 0.40), 'Mepo 25 ex. = 40 %');
  assert.ok(close(sandbox.__bp('oran_berry', 1), 0.25), 'Oran 1 ex. = 25 %');
  assert.ok(close(sandbox.__bp('oran_berry', 6), 0.50), 'Oran 25 ex. = 50 %');
});

test('DORM-06: consommables (vitamines/bouchons/capsules) appliqués', () => {
  const sandbox = { console, window: {}, globalThis: {}, G: { inventory: {}, team: [] }, Math, PD: { 25: ['Pikachu','Electric',null,35,55,40,50,50,90] } };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource([
    'src/data/items-data.js',
    'src/data/game-helpers.js',
    'src/application/save/save-extras.js',
  ]), sandbox, { filename: 'cons [iife]' });
  const p = { id: 25, name: 'Pikachu', level: 50, atk: 100, def: 80, spa: 90, spd: 80, spe: 110, maxHP: 120, currentHP: 120, evs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:0}, ivs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:0}, moves: [] };
  const evBefore = Object.values(p.evs).reduce((a,b)=>a+b,0);
  const ivBefore = Object.values(p.ivs).reduce((a,b)=>a+b,0);
  sandbox.applyConsumableToPoke(p, 'protein');
  const evAfter = Object.values(p.evs).reduce((a,b)=>a+b,0);
  const ivAfter = Object.values(p.ivs).reduce((a,b)=>a+b,0);
  assert.equal(evAfter, evBefore + 1, 'vitamine = +1 EV');
  assert.equal(ivAfter, ivBefore, 'vitamine = EV seulement (pas d\'IV — réservés aux Capsules)');
  sandbox.applyConsumableToPoke(p, 'bottle_cap');
  assert.equal(Object.values(p.ivs).reduce((a,b)=>a+b,0), ivBefore + 1, 'Capsule = +1 IV');
  sandbox.applyConsumableToPoke(p, 'golden_bottle_cap');
  assert.ok(Object.values(p.ivs).every(v => v >= 1), 'Capsule d\'Or = +1 IV partout');
});

test('DORM-03: getHeldBuff ne donne plus de +10 % générique aux boosters de type', () => {
  const sandbox = {
    console, window: {}, globalThis: {},
    G: { inventory: {}, team: [], teamSlotItems: [] },
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource([
    'src/data/items-data.js',
    'src/application/world/team.js',
  ]), sandbox, { filename: 'team [iife]' });
  // Équiper un booster de type sur un Pokémon.
  const p = { id: 130, name: 'Léviator', type1: 'Water', type2: 'Flying', heldItem: 'mystic_water' };
  sandbox.G.team = [p];
  sandbox.G.teamSlotItems = ['mystic_water'];
  const buff = sandbox.getHeldBuff(p);
  assert.equal(buff.atk, 0, 'plus de +10 % générique atk');
  assert.equal(buff.spa, 0, 'plus de +10 % générique spa');
});

