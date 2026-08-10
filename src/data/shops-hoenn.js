// Wave 40 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
// ─── Boutiques de Hoenn (RSE) ───
// Held / held-evolution items. Evolution STONES are exclusive to the Mine.

export var SHOPS_HOENN = {
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
// Wave 40 — surface kept (window → globalThis block, same scope).
if (typeof globalThis !== 'undefined') globalThis.SHOPS_HOENN = SHOPS_HOENN;
