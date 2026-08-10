// Wave 40 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
const SHOPS = {
"pallet": {
"items": [
 ]
 },
"viridian": {
"items": [
"prine_berry"
 ]
 },
"pewter": {
"items": [
"occa_berry",
"muscle_band",
"metal_coat"
 ]
 },
"cerulean": {
"items": [
"passho_berry",
"soft_sand"
 ]
 },
"vermilion": {
"items": [
"wacan_berry",
"muscle_band",
"metal_coat",
"soft_sand"
 ]
 },
"lavender": {
"items": [
"rindo_berry"
 ]
 },
"celadon": {
"items": [
"yache_berry",
"rarecandy",
"muscle_band",
"metal_coat",
"soft_sand"
 ]
 },
"fuchsia": {
"items": [
"chople_berry",
"soft_sand"
 ]
 },
"cinnabar": {
"items": [
"kebia_berry",
"muscle_band"
 ]
 },
"indigo": {
"items": [
"rarecandy",
"muscle_band",
"metal_coat",
"soft_sand"
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
"muscle_band",
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
"tanga_berry",
"rarecandy",
"kings_rock",
"dragon_scale",
"upgrade",
"deep_sea_scale",
"deep_sea_tooth",
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
"silk_scarf",
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
"deep_sea_scale",
"deep_sea_tooth",
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
