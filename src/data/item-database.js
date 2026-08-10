/**
 * ItemDatabase — Where to find each item
 * shop: shop name or route where it's sold
 * route: routes where it can drop from wild Pokemon
 * quest: quest that rewards it
 * mine: available in mining minigame
 * source: general description
 */
(function() {
  'use strict';
  window.ItemDB = {
    // Type boosters — available in Celadon Dept Store
    black_belt:       { shop: 'celadon_dpt_fighting', price: 45000, source: 'Magasin de Céladon (3F)' },
    black_glasses:    { shop: 'celadon_dpt_dark',     price: 45000, source: 'Magasin de Céladon (3F)' },
    charcoal:         { shop: 'celadon_dpt_fire',     price: 45000, source: 'Magasin de Céladon (3F)' },
    dragon_fang:      { shop: 'celadon_dpt_dragon',   price: 45000, source: 'Magasin de Céladon (3F)' },
    fairy_feather:    { shop: 'celadon_dpt_fairy',    price: 45000, source: 'Magasin de Céladon (3F)' },
    hard_stone:       { shop: 'celadon_dpt_rock',     price: 45000, source: 'Magasin de Céladon (3F)' },
    magnet:           { shop: 'celadon_dpt_electric', price: 45000, source: 'Magasin de Céladon (3F)' },
    metal_coat:       { shop: 'celadon_dpt_steel',    price: 45000, source: 'Magasin de Céladon (3F)', route: ['route_12', 'route_17'] },
    miracle_seed:     { shop: 'celadon_dpt_grass',    price: 45000, source: 'Magasin de Céladon (3F)' },
    mystic_water:     { shop: 'celadon_dpt_water',    price: 45000, source: 'Magasin de Céladon (3F)' },
    never_melt_ice:   { shop: 'celadon_dpt_ice',      price: 45000, source: 'Magasin de Céladon (3F)' },
    poison_barb:      { shop: 'celadon_dpt_poison',   price: 45000, source: 'Magasin de Céladon (3F)' },
    sharp_beak:       { shop: 'celadon_dpt_flying',   price: 45000, source: 'Magasin de Céladon (3F)' },
    silk_scarf:       { shop: 'celadon_dpt_normal',   price: 45000, source: 'Magasin de Céladon (3F)' },
    silver_powder:    { shop: 'celadon_dpt_bug',      price: 45000, source: 'Magasin de Céladon (3F)' },
    soft_sand:        { shop: 'celadon_dpt_ground',   price: 45000, source: 'Magasin de Céladon (3F)' },
    spell_tag:        { shop: 'celadon_dpt_ghost',    price: 45000, source: 'Magasin de Céladon (3F)' },
    twisted_spoon:    { shop: 'celadon_dpt_psychic',  price: 45000, source: 'Magasin de Céladon (3F)' },
    
    // Special held
    leftovers:        { shop: 'celadon_dpt_5f',       price: 120000, source: 'Magasin de Céladon (5F) - aussi abandonné dans la Grotte de l\'Île 5' },
    choice_band:      { shop: 'celadon_dpt_5f',       price: 350000, source: 'Magasin de Céladon (5F)' },
    choice_specs:     { shop: 'celadon_dpt_5f',       price: 350000, source: 'Magasin de Céladon (5F)' },
    choice_scarf:     { shop: 'celadon_dpt_5f',       price: 350000, source: 'Magasin de Céladon (5F)' },
    life_orb:         { shop: 'celadon_dpt_5f',       price: 450000, source: 'Magasin de Céladon (5F)' },
    assault_vest:     { shop: 'celadon_dpt_5f',       price: 250000, source: 'Magasin de Céladon (5F)' },
    eviolite:         { shop: 'celadon_dpt_5f',       price: 200000, source: 'Magasin de Céladon (5F)' },
    flame_orb:        { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    toxic_orb:        { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    quick_claw:       { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    loaded_dice:      { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    metronome:        { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    power_herb:       { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    weakness_policy:  { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    heavy_duty_boots: { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    muscle_band:      { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    bright_powder:    { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    focus_band:       { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    lucky_punch:      { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    lagging_tail:     { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    clear_amulet:     { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    eject_pack:       { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    eject_button:     { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    light_clay:       { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    mental_herb:      { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    damp_rock:        { shop: 'celadon_dpt_5f',       price: 80000,  source: 'Magasin de Céladon (5F)' },
    heat_rock:        { shop: 'celadon_dpt_5f',       price: 80000,  source: 'Magasin de Céladon (5F)' },
    smooth_rock:      { shop: 'celadon_dpt_5f',       price: 80000,  source: 'Magasin de Céladon (5F)' },
    icy_rock:         { shop: 'celadon_dpt_5f',       price: 80000,  source: 'Magasin de Céladon (5F)' },
    terrain_extender: { shop: 'celadon_dpt_5f',       price: 100000, source: 'Magasin de Céladon (5F)' },
    lucky_egg:        { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    luck_incense:     { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    pure_incense:     { shop: 'celadon_dpt_5f',       price: 45000,  source: 'Magasin de Céladon (5F)' },
    
    // Berries
    occa_berry:       { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    passho_berry:     { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    wacan_berry:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    rindo_berry:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    yache_berry:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    chople_berry:     { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    kebia_berry:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    shuca_berry:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    coba_berry:       { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    payapa_berry:     { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    tanga_berry:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    charti_berry:     { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    kasib_berry:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    haban_berry:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    colbur_berry:     { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    babiri_berry:     { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    roseli_berry:     { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    
    // Gems
    bug_gem:          { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    dark_gem:         { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    dragon_gem:       { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    electric_gem:     { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    fairy_gem:        { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    fighting_gem:     { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    fire_gem:         { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    flying_gem:       { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    ghost_gem:        { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    grass_gem:        { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    ground_gem:       { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    ice_gem:          { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    normal_gem:       { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    poison_gem:       { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    psychic_gem:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    rock_gem:         { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    steel_gem:        { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    water_gem:        { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    
    // Seeds
    electric_seed:    { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    grassy_seed:      { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    misty_seed:       { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
    foggy_seed:       { shop: 'celadon_dpt_4f',       price: 45000,  source: 'Magasin de Céladon (4F)' },
  };
  
  // Helper: get location info for an item
  window.getItemLocation = function(key) {
    var db = window.ItemDB;
    if (db[key]) return db[key];
    return null;
  };
  
  // Helper: get source description (localized)
  window.getItemSource = function(key, lang) {
    lang = lang || 'fr';
    var loc = window.getItemLocation(key);
    if (!loc) return '';
    if (lang === 'en') return 'Found in: ' + (loc.source || loc.shop || 'various locations');
    return 'Trouvé : ' + (loc.source || loc.shop || 'divers endroits');
  };
})();

