#!/usr/bin/env node
/**
 * gen_ctcs_shops.mjs — Génère src/data/ctcs-shop-data.js
 *
 * Passe 26 : toutes les CT/CS des bonnes versions sont achetables, réparties
 * dans TOUTES les boutiques des deux régions pour forcer l'exploration.
 *
 * Règle canonique :
 *  - Boutiques KANTO (RFVF)  → uniquement des CT enseignant des attaques de 1ʳᵉ génération.
 *  - Boutiques JOHTO (OAC)   → CT d'attaques de 2ᵉ génération + restes de 1ʳᵉ.
 *  - Attaques 3ᵉ génération et + → jamais vendues (honnêteté de version).
 *
 * Chaque CT est vendue dans UNE SEULE boutique (exploration maximale), avec
 * préférence thématique (ville d'arène du même type) puis répartition
 * équilibrée. Les prix manquants sont calculés en paliers selon la puissance.
 *
 * Usage : node tools/gen_ctcs_shops.mjs   (idempotent, échoue bruyamment sur anomalie)
 */
import fs from 'node:fs';
import vm from 'node:vm';

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const OUT = new URL('../src/data/ctcs-shop-data.js', import.meta.url);

// ── Attaques de 1ʳᵉ génération (RBY/RFVF — canon) ────────────────────────
const GEN1 = new Set(('pound karate_chop double_slap comet_punch mega_punch pay_day fire_punch ice_punch thunder_punch scratch vice_grip guillotine razor_wind swords_dance cut gust wing_attack whirlwind fly bind slam vine_whip stomp double_kick mega_kick jump_kick rolling_kick sand_attack headbutt horn_attack fury_attack horn_drill tackle body_slam wrap take_down thrash double_edge tail_whip poison_sting twineedle pin_missile leer bite growl roar sing supersonic sonic_boom disable acid ember flamethrower mist water_gun hydro_pump surf ice_beam blizzard psybeam bubble_beam aurora_beam hyper_beam peck drill_peck submission low_kick counter seismic_toss strength absorb mega_drain leech_seed growth razor_leaf solar_beam poison_powder stun_spore sleep_powder petal_dance string_shot dragon_rage fire_spin thunder_shock thunderbolt thunder_wave thunder rock_throw earthquake fissure dig toxic confusion psychic hypnosis meditate agility quick_attack rage teleport night_shade mimic screech double_team recover harden minimize smokescreen confuse_ray withdraw defense_curl barrier light_screen haze reflect focus_energy bide metronome mirror_move self_destruct egg_bomb lick smog sludge bone_club fire_blast waterfall clamp swift skull_bash spike_cannon constrict amnesia kinesis soft_boiled high_jump_kick glare dream_eater poison_gas barrage leech_life lovely_kiss sky_attack transform bubble dizzy_punch spore flash psywave splash acid_armor crabhammer explosion fury_swipes bonemerang rest rock_slide hyper_fang sharpen conversion tri_attack super_fang slash substitute struggle').split(/\s+/));
// ── Attaques de 2ᵉ génération (OAC — canon) ──────────────────────────────
const GEN2 = new Set(('aeroblast ancient_power attract baton_pass beat_up belly_drum bone_rush charm conversion_2 cotton_spore cross_chop crunch curse destiny_bond detect dragon_breath dynamic_punch encore endure extreme_speed faint_attack feint_attack false_swipe flail flame_wheel foresight frustration fury_cutter future_sight giga_drain heal_bell hidden_power icy_wind iron_tail lock_on mach_punch magnitude mean_look megahorn milk_drink mind_reader mirror_coat moonlight morning_sun mud_slap nightmare octazooka outrage pain_split perish_song powder_snow present protect psych_up pursuit rain_dance rapid_spin return reversal rock_smash rollout sacred_fire safeguard sandstorm scary_face shadow_ball sketch sleep_talk sludge_bomb snore spark spider_web spikes steel_wing sunny_day swagger sweet_kiss sweet_scent synthesis thief triple_kick twister vital_throw whirlpool zap_cannon').split(/\s+/));

// ── Thématiques des boutiques (types normalisés en minuscule anglais) ────
const TYPE_ALIAS = { feu: 'fire', eau: 'water', plante: 'grass', 'électrik': 'electric', electrik: 'electric', glace: 'ice', combat: 'fighting', poison: 'poison', sol: 'ground', vol: 'flying', psy: 'psychic', insecte: 'bug', roche: 'rock', spectre: 'ghost', dragon: 'dragon', ténèbres: 'dark', darkness: 'dark', 'acier': 'steel', fée: 'fairy', normal: 'normal', fire: 'fire', water: 'water', grass: 'grass', electric: 'electric', ice: 'ice', fighting: 'fighting', ground: 'ground', flying: 'flying', psychic: 'psychic', bug: 'bug', rock: 'rock', ghost: 'ghost', dragon: 'dragon', dark: 'dark', steel: 'steel', fairy: 'fairy' };
const KANTO_SHOPS = ['pallet', 'viridian', 'pewter', 'cerulean', 'vermilion', 'lavender', 'celadon', 'fuchsia', 'cinnabar', 'indigo'];
const JOHTO_SHOPS = ['jnewbark', 'jcherrygrove', 'jviolet', 'jazalea', 'jgoldenrod', 'jecruteak', 'jolivine', 'jmahogany', 'jcianwood', 'jblackthorn'];
const SHOP_THEMES = {
  pallet: ['normal'], viridian: ['normal', 'ground'], pewter: ['rock', 'ground', 'fighting'],
  cerulean: ['water', 'ice'], vermilion: ['electric', 'fighting', 'steel'], lavender: ['ghost', 'psychic', 'dark'],
  celadon: ['grass', 'poison', 'bug', 'normal'], fuchsia: ['poison', 'bug', 'fire'], cinnabar: ['fire'],
  indigo: ['dragon'], // réservé attaques puissantes (champion requis)
  jnewbark: ['normal'], jcherrygrove: ['water', 'normal'], jviolet: ['flying', 'normal'], jazalea: ['bug'],
  jgoldenrod: ['normal', 'electric', 'fairy'], jecruteak: ['ghost', 'fire'], jolivine: ['steel', 'electric'],
  jmahogany: ['ice'], jcianwood: ['fighting', 'water'], jblackthorn: ['dragon'],
};

// ── Chargement des données du projet en vm ───────────────────────────────
const sandbox = { window: {}, console };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['src/data/moves.js', 'src/data/items-data.js', 'src/data/items-helpers.js', 'src/data/shops-data.js']) {
  vm.runInContext(R(f), sandbox, { filename: f });
}
const { ITEMS, MOVES } = sandbox;
if (!ITEMS || !MOVES) throw new Error('ITEMS ou MOVES introuvables');

// ── Récupère toutes les CT (clé ct*, avec moveId) ────────────────────────
const ctItems = [];
for (const [key, itm] of Object.entries(ITEMS)) {
  if (!itm || !itm.moveId || !/^ct/.test(key)) continue;
  const isCtCs = itm.type === 'ct' || itm.type === 'cs' || /^ct/.test(key);
  if (!isCtCs || itm.type === 'cs') continue;
  const moveId = MOVES[itm.moveId] ? itm.moveId : { icebeam: 'ice_beam', hyperbeam: 'hyper_beam', solarbeam: 'solar_beam', shadowball: 'shadow_ball' }[itm.moveId] || itm.moveId;
  ctItems.push({ key, moveId, price: itm.price || 0 });
}
if (ctItems.length < 100) throw new Error(`CT détectées insuffisantes : ${ctItems.length}`);

// ── Classification par génération ────────────────────────────────────────
const rows = ctItems.map(({ key, moveId, price }) => {
  const mv = MOVES[moveId];
  if (!mv) throw new Error(`${key} → moveId inconnu dans MOVES : ${moveId}`);
  const gen = GEN1.has(moveId) ? 1 : GEN2.has(moveId) ? 2 : 3;
  const type = TYPE_ALIAS[String(mv.type || '').toLowerCase()] || 'normal';
  const power = Number(mv.power ?? mv.pow ?? 0) || 0;
  const autoPrice = price || (power === 0 ? 25000 : power <= 60 ? 30000 : power <= 90 ? 45000 : power <= 110 ? 60000 : 80000);
  return { key, moveId, gen, type, power, price: autoPrice, hadPrice: !!price };
});
const unsold = rows.filter((r) => r.gen >= 3).map((r) => r.key);
const sellable = rows.filter((r) => r.gen <= 2);

// ── Répartition : préférence thématique puis équilibrage ─────────────────
const assign = {}; // shopId -> [rows]
const counts = {};
const inited = [...KANTO_SHOPS, ...JOHTO_SHOPS];
inited.forEach((s) => { assign[s] = []; counts[s] = 0; });
const themed = new Set(); // clés déjà placées par thème
for (const region of ['kanto', 'johto']) {
  const gen = region === 'kanto' ? 1 : 2;
  const shops = region === 'kanto' ? KANTO_SHOPS : JOHTO_SHOPS;
  const pool = sellable.filter((r) => r.gen === gen);
  // Combos puissants (≥90) à Indigo/Blackthorn en priorité thématique dragon/fin
  for (const r of pool) {
    if (region === 'kanto' && r.power >= 110) { assign.indigo.push(r); counts.indigo++; themed.add(r.key); continue; }
    if (region === 'johto' && r.power >= 110) { assign.jblackthorn.push(r); counts.jblackthorn++; themed.add(r.key); continue; }
    const targets = shops.filter((s) => SHOP_THEMES[s].includes(r.type));
    if (targets.length) {
      targets.sort((a, b) => counts[a] - counts[b]);
      assign[targets[0]].push(r); counts[targets[0]]++; themed.add(r.key);
    }
  }
  // Reste : répartition équilibrée
  const rest = pool.filter((r) => !themed.has(r.key));
  for (const r of rest) {
    const sorted = shops.slice().sort((a, b) => counts[a] - counts[b]);
    assign[sorted[0]].push(r); counts[sorted[0]]++; themed.add(r.key);
  }
}

// ── Vérifications dures ──────────────────────────────────────────────────
const soldKeys = inited.flatMap((s) => assign[s].map((r) => r.key));
const once = new Set(soldKeys);
if (once.size !== soldKeys.length) throw new Error('Une CT est vendue dans plusieurs boutiques');
if (soldKeys.length !== sellable.length) throw new Error(`CT vendables non couvertes : ${sellable.length - soldKeys.length}`);
for (const k of unsold) if (once.has(k)) throw new Error(`CT 3ᵉ gen+ vendue : ${k}`);
for (const s of KANTO_SHOPS) for (const r of assign[s]) if (r.gen !== 1) throw new Error(`Boutique ${s} (Kanto) vend une CT non-gen1 : ${r.key}`);

// ── Tri par prix croissant pour l'affichage boutique ─────────────────────
inited.forEach((s) => assign[s].sort((a, b) => a.price - b.price));

// ── Émission du fichier ──────────────────────────────────────────────────
const stock = {}; const prices = {}; const meta = {};
for (const s of inited) {
  if (!assign[s].length) continue;
  stock[s] = assign[s].map((r) => r.key);
  for (const r of assign[s]) { if (!r.hadPrice) prices[r.key] = r.price; meta[r.key] = { move: r.moveId, gen: r.gen }; }
}
const file = `// GÉNÉRÉ par tools/gen_ctcs_shops.mjs — ne pas éditer à la main.
// Passe 26 : stock CT/CS des boutiques (canonique : Kanto = attaques gen 1,
// Johto = gen 2 + restes gen 1 ; chaque CT vendue dans UNE seule boutique).
const CTCS_SHOP_STOCK = ${JSON.stringify(stock, null, 1)};
// Prix calculés pour les CT qui n'en avaient pas (paliers par puissance).
const CTCS_PRICES = ${JSON.stringify(prices, null, 1)};
// Méta (attaque enseignée + génération) — utilisé par les tests et l'affichage.
const CTCS_META = ${JSON.stringify(meta, null, 1)};
// CT volontairement JAMAIS vendues (attaques 3ᵉ génération et +).
const CTCS_UNSOLD = ${JSON.stringify(unsold, null, 1)};
// Application des prix manquants au chargement (après items-data.js).
(function(){
 if(typeof ITEMS === 'undefined' || !ITEMS) return;
 for(const k in CTCS_PRICES){ if(ITEMS[k] && !ITEMS[k].price) ITEMS[k].price = CTCS_PRICES[k]; }
})();
if (typeof CTCS_SHOP_STOCK !== 'undefined' && typeof window !== 'undefined') window.CTCS_SHOP_STOCK = CTCS_SHOP_STOCK;
if (typeof CTCS_PRICES !== 'undefined' && typeof window !== 'undefined') window.CTCS_PRICES = CTCS_PRICES;
if (typeof CTCS_META !== 'undefined' && typeof window !== 'undefined') window.CTCS_META = CTCS_META;
if (typeof CTCS_UNSOLD !== 'undefined' && typeof window !== 'undefined') window.CTCS_UNSOLD = CTCS_UNSOLD;
`;
fs.writeFileSync(OUT, file);
console.log(`✔ ${sellable.length} CT vendables réparties dans ${Object.keys(stock).length} boutiques — ${unsold.length} CT gen 3+ non vendues.`);
for (const s of inited) if (assign[s].length) console.log(`  ${s.padEnd(12)} : ${assign[s].length}`);
