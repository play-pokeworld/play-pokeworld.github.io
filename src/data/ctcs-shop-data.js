// GÉNÉRÉ par tools/gen_ctcs_shops.mjs — ne pas éditer à la main.
// Passe 26 : stock CT/CS des boutiques (canonique : Kanto = attaques gen 1,
// Johto = gen 2 + restes gen 1 ; chaque CT vendue dans UNE seule boutique).
const CTCS_SHOP_STOCK = {
 "pallet": [
  "ct_leer",
  "ct_quickattack",
  "ct_swift"
 ],
 "viridian": [
  "ct_strength",
  "ct_swordsdance",
  "ct26_earthquake"
 ],
 "pewter": [
  "ct_rockslide",
  "ct_rockthrow",
  "ct_peck"
 ],
 "cerulean": [
  "ct13_icebeam",
  "ct_watergun"
 ],
 "vermilion": [
  "ct24_thunderbolt",
  "ct_thunderpunch",
  "ct_thunderwave"
 ],
 "lavender": [
  "ct_bite",
  "ct_confusion",
  "ct_lick",
  "ct29_psychic"
 ],
 "celadon": [
  "ct06_toxic",
  "ct_acid",
  "ct_tackle"
 ],
 "fuchsia": [
  "ct35_flamethrower",
  "ct_twineedle"
 ],
 "cinnabar": [
  "ct_lightscreen",
  "ct_ember"
 ],
 "indigo": [
  "ct_fireblast",
  "ct_hydropump",
  "ct_thunder",
  "ct15_hyperbeam",
  "ct22_solarbeam"
 ],
 "jnewbark": [
  "ct_swagger",
  "ct_sandstorm"
 ],
 "jcherrygrove": [
  "ct_raindance",
  "ct_sludgebomb"
 ],
 "jviolet": [
  "ct_crunch"
 ],
 "jazalea": [
  "ct_feintattack"
 ],
 "jgoldenrod": [
  "ct_mudslap"
 ],
 "jecruteak": [
  "ct30_shadowball",
  "ct_sunnyday"
 ],
 "jolivine": [
  "ct_pursuit"
 ],
 "jmahogany": [
  "ct_safeguard"
 ],
 "jcianwood": [
  "ct_rocksmash"
 ],
 "jblackthorn": [
  "ct_twister"
 ]
};
// Prix calculés pour les CT qui n'en avaient pas (paliers par puissance).
const CTCS_PRICES = {
 "ct_lightscreen": 25000,
 "ct_feintattack": 30000,
 "ct_rocksmash": 30000
};
// Méta (attaque enseignée + génération) — utilisé par les tests et l'affichage.
const CTCS_META = {
 "ct_leer": {
  "move": "leer",
  "gen": 1
 },
 "ct_quickattack": {
  "move": "quick_attack",
  "gen": 1
 },
 "ct_swift": {
  "move": "swift",
  "gen": 1
 },
 "ct_strength": {
  "move": "strength",
  "gen": 1
 },
 "ct_swordsdance": {
  "move": "swords_dance",
  "gen": 1
 },
 "ct26_earthquake": {
  "move": "earthquake",
  "gen": 1
 },
 "ct_rockslide": {
  "move": "rock_slide",
  "gen": 1
 },
 "ct_rockthrow": {
  "move": "rock_throw",
  "gen": 1
 },
 "ct_peck": {
  "move": "peck",
  "gen": 1
 },
 "ct13_icebeam": {
  "move": "ice_beam",
  "gen": 1
 },
 "ct_watergun": {
  "move": "water_gun",
  "gen": 1
 },
 "ct24_thunderbolt": {
  "move": "thunderbolt",
  "gen": 1
 },
 "ct_thunderpunch": {
  "move": "thunder_punch",
  "gen": 1
 },
 "ct_thunderwave": {
  "move": "thunder_wave",
  "gen": 1
 },
 "ct_bite": {
  "move": "bite",
  "gen": 1
 },
 "ct_confusion": {
  "move": "confusion",
  "gen": 1
 },
 "ct_lick": {
  "move": "lick",
  "gen": 1
 },
 "ct29_psychic": {
  "move": "psychic",
  "gen": 1
 },
 "ct06_toxic": {
  "move": "toxic",
  "gen": 1
 },
 "ct_acid": {
  "move": "acid",
  "gen": 1
 },
 "ct_tackle": {
  "move": "tackle",
  "gen": 1
 },
 "ct35_flamethrower": {
  "move": "flamethrower",
  "gen": 1
 },
 "ct_twineedle": {
  "move": "twineedle",
  "gen": 1
 },
 "ct_lightscreen": {
  "move": "light_screen",
  "gen": 1
 },
 "ct_ember": {
  "move": "ember",
  "gen": 1
 },
 "ct_fireblast": {
  "move": "fire_blast",
  "gen": 1
 },
 "ct_hydropump": {
  "move": "hydro_pump",
  "gen": 1
 },
 "ct_thunder": {
  "move": "thunder",
  "gen": 1
 },
 "ct15_hyperbeam": {
  "move": "hyper_beam",
  "gen": 1
 },
 "ct22_solarbeam": {
  "move": "solar_beam",
  "gen": 1
 },
 "ct_swagger": {
  "move": "swagger",
  "gen": 2
 },
 "ct_sandstorm": {
  "move": "sandstorm",
  "gen": 2
 },
 "ct_raindance": {
  "move": "rain_dance",
  "gen": 2
 },
 "ct_sludgebomb": {
  "move": "sludge_bomb",
  "gen": 2
 },
 "ct_crunch": {
  "move": "crunch",
  "gen": 2
 },
 "ct_feintattack": {
  "move": "feint_attack",
  "gen": 2
 },
 "ct_mudslap": {
  "move": "mud_slap",
  "gen": 2
 },
 "ct30_shadowball": {
  "move": "shadow_ball",
  "gen": 2
 },
 "ct_sunnyday": {
  "move": "sunny_day",
  "gen": 2
 },
 "ct_pursuit": {
  "move": "pursuit",
  "gen": 2
 },
 "ct_safeguard": {
  "move": "safeguard",
  "gen": 2
 },
 "ct_rocksmash": {
  "move": "rock_smash",
  "gen": 2
 },
 "ct_twister": {
  "move": "twister",
  "gen": 2
 }
};
// CT volontairement JAMAIS vendues (attaques 3ᵉ génération et +).
const CTCS_UNSOLD = [
 "ct08_bodyslam",
 "ct10_doubleedge",
 "ct_acidspray",
 "ct_acrobatics",
 "ct_airshlash",
 "ct_aquatail",
 "ct_aurasphere",
 "ct_avalanche",
 "ct_bugbite",
 "ct_bugbuzz",
 "ct_bulkup",
 "ct_bulldoze",
 "ct_bulletpunch",
 "ct_calmmind",
 "ct_chargebeam",
 "ct_chillingwater",
 "ct_crosspoison",
 "ct_crossroom",
 "ct_darkpulse",
 "ct_dazzlinggleam",
 "ct_disarmingvoice",
 "ct_discharge",
 "ct_dracometeor",
 "ct_dragonpulse",
 "ct_dragonrush",
 "ct_dragontail",
 "ct_electricterrain",
 "ct_energyball",
 "ct_flamecharge",
 "ct_flashcannon",
 "ct_fog",
 "ct_forcepalm",
 "ct_grassyterrain",
 "ct_hail",
 "ct_hex",
 "ct_iceshard",
 "ct_incinerate",
 "ct_irondefense",
 "ct_knockoff",
 "ct_leafage",
 "ct_leafblade",
 "ct_liquidation",
 "ct_magicalleaf",
 "ct_metalclaw",
 "ct_mistyterrain",
 "ct_moonblast",
 "ct_nastyplot",
 "ct_nuzzle",
 "ct_ominouswind",
 "ct_playrough",
 "ct_poisonjab",
 "ct_powergem",
 "ct_psychocut",
 "ct_scorchingsands",
 "ct_silverwind",
 "ct_skyuppercut",
 "ct_spiritbreak",
 "ct_trickroom",
 "ct_uturn",
 "ct_voltswitch",
 "ct_waterpulse",
 "ct_weirdroom",
 "ct_willowisp",
 "ct_xscissor"
];
// Application des prix manquants au chargement (après items-data.js).
(function(){
 if(typeof ITEMS === 'undefined' || !ITEMS) return;
 for(const k in CTCS_PRICES){ if(ITEMS[k] && !ITEMS[k].price) ITEMS[k].price = CTCS_PRICES[k]; }
})();
if (typeof CTCS_SHOP_STOCK !== 'undefined' && typeof window !== 'undefined') window.CTCS_SHOP_STOCK = CTCS_SHOP_STOCK;
if (typeof CTCS_PRICES !== 'undefined' && typeof window !== 'undefined') window.CTCS_PRICES = CTCS_PRICES;
if (typeof CTCS_META !== 'undefined' && typeof window !== 'undefined') window.CTCS_META = CTCS_META;
if (typeof CTCS_UNSOLD !== 'undefined' && typeof window !== 'undefined') window.CTCS_UNSOLD = CTCS_UNSOLD;

