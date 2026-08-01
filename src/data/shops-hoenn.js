// ─── Boutiques de Hoenn (RSE) ───
// Objets tenus / d'évolution tenus. Les PIERRES d'évolution sont exclusives à la Mine.

var SHOPS_HOENN = {
  littleroot: { items: [] },
  oldale: { items: ["colbur_berry", "silk_scarf"] },
  petalburg: { items: ["muscle_band", "hard_stone"] },
  rustboro: { items: ["babiri_berry", "hard_stone", "metal_coat"] },
  dewford: { items: ["roseli_berry", "black_belt", "muscle_band"] },
  slateport_market: { items: ["kings_rock", "metal_coat", "upgrade", "dragon_scale", "deep_sea_tooth", "deep_sea_scale", "mystic_water"] },
  mauville: { items: ["magnet"] },
  mauville_casino: { items: ["rarecandy", "leftovers"] },
  verdanturf: { items: ["silk_scarf"] },
  fallarbor: { items: ["spell_tag"] },
  lavaridge: { items: ["charcoal"] },
  fortree: { items: ["sharp_beak"] },
  lilycove_dept_store: { items: ["leftovers", "muscle_band"] },
  mossdeep: { items: ["twisted_spoon"] },
  sootopolis: { items: ["mystic_water"] },
  pacifidlog: { items: ["mystic_water", "dragon_scale"] },
  weather_lab: { items: [] },
  evergrande: { items: ["leftovers", "rarecandy"] }
};

if (typeof SHOPS !== 'undefined' && typeof SHOPS_HOENN !== 'undefined') {
  Object.assign(SHOPS, SHOPS_HOENN);
}
if (typeof window !== 'undefined') {
  window.SHOPS_HOENN = SHOPS_HOENN;
}
