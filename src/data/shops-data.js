// Wave 40 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
// Passe 19 — règle joueur : pas d'objets post-Gen 3, et pas d'objets d'une
// génération « future » dans une région antérieure (Gen 2 → Johto/Hoenn,
// Gen 3 → Hoenn uniquement). Les baies de résistance (Gen 4) et Muscle Band
// (Gen 4) ont été retirés ; metal_coat/soft_sand (Gen 2) quittent Kanto ;
// silk_scarf/deep_sea_* (Gen 3) quittent Johto.
const SHOPS = {
"pallet": {
"items": [
"cheri_berry"
 ]
 },
"viridian": {
"items": [
"prine_berry",
"chesto_berry"
 ]
 },
"pewter": {
"items": [
"occa_berry",
"rawst_berry"
 ]
 },
"cerulean": {
"items": [
"passho_berry",
"aspear_berry"
 ]
 },
"vermilion": {
"items": [
"wacan_berry",
"pecha_berry"
 ]
 },
"lavender": {
"items": [
"rindo_berry",
"persim_berry"
 ]
 },
"celadon": {
"items": [
"yache_berry",
"leppa_berry",
"oran_berry",
"rarecandy",
"hp_up",
"protein",
"iron",
"calcium",
"carbos",
"bottle_cap",
"ability_capsule"
 ]
 },
"fuchsia": {
"items": [
"chople_berry",
"sitrus_berry"
 ]
 },
"cinnabar": {
"items": [
"kebia_berry"
 ]
 },
"indigo": {
"items": [
"rarecandy",
"bottle_cap",
"golden_bottle_cap",
"ability_patch"
 ]
 },
"jnewbark": {
"items": [
"rarecandy"
 ]
 },
"jcherrygrove": {
"items": [
"shuca_berry",
"rarecandy"
 ]
 },
"jviolet": {
"items": [
"coba_berry",
"twisted_spoon",
"miracle_seed"
 ]
 },
"jazalea": {
"items": [
"payapa_berry",
"soft_sand",
"spell_tag",
"poison_barb"
 ]
 },
"jgoldenrod": {
"items": [
"firestone",
"waterstone",
"thunderstone",
"leafstone",
"moonstone",
"sunstone",
"lucky_punch",
"quick_claw",
"tanga_berry",
"rarecandy",
"hp_up",
"protein",
"iron",
"calcium",
"carbos",
"zinc",
"bottle_cap",
"ability_capsule",
"kings_rock",
"dragon_scale",
"upgrade",
"metal_coat",
"twisted_spoon",
"black_belt",
"black_glasses",
"charcoal",
"dragon_fang",
"miracle_seed",
"mystic_water",
"never_melt_ice",
"sharp_beak",
"poison_barb",
"spell_tag",
"hard_stone",
"magnet",
"silver_wing",
"rainbow_wing"
 ]
 },
"jecruteak": {
"items": [
"charti_berry",
"spell_tag",
"never_melt_ice",
"mystic_water"
 ]
 },
"jolivine": {
"items": [
"kasib_berry",
"leftovers",
"mystic_water",
"hard_stone"
 ]
 },
"jcianwood": {
"items": [
"haban_berry",
"black_belt",
"charcoal",
"magnet"
 ]
 },
"jmahogany": {
"items": [
"upgrade",
"dragon_fang"
 ]
 },
"jblackthorn": {
"items": [
"rarecandy",
"dragon_scale",
"dragon_fang",
"twisted_spoon",
"kings_rock"
 ]
 }
};


// --- Migrated to ES module, globals exposed ---
if (typeof SHOPS !== 'undefined') { if (typeof window !== 'undefined') window.SHOPS = SHOPS; if (typeof globalThis !== 'undefined') globalThis.SHOPS = SHOPS; }



// Wave 40 — native ESM module: grouped export of the same names as the
// classic surface kept above/here (bodies unchanged).
export {
  SHOPS,
};

