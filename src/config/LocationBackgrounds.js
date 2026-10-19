/**
 * @file LocationBackgrounds.js
 * @brief Battle / idle scenery of each location (C++ equivalent: namespace LocationBackgrounds).
 * Ported from the original `src/data/location-backgrounds.js`. The CSS reads the scene from
 * `body[data-bg="<scene>"]` (design-system 29.1) through the `--pc-scene-url` variable, so the idle
 * screen and the wild Pokémon card always show the same landscape. Scene images: assets/images/bg/.
 */

/** Scenes that exist in assets/images/bg/. */
export const BACKGROUND_SCENES = Object.freeze(['beach', 'cave', 'desert', 'forest', 'gym', 'iceCave', 'lab', 'lake', 'mall', 'mountain', 'night', 'plant', 'route', 'sea', 'snow', 'space', 'tower', 'town', 'trench', 'volcano', 'dimension1', 'main-bg', 'missing']);

/** Scene used when nothing more specific matches. */
export const DEFAULT_BACKGROUND_SCENE = 'route';

/** Fallback scene per location type. */
const SCENE_BY_KIND = Object.freeze({
  town: 'town',
  route: 'route',
  dungeon: 'cave',
  sea: 'sea'
});

/** Explicit scene per location id. */
const SCENE_BY_LOCATION = Object.freeze({
  // Kanto
  viridianforest: 'forest',
  mtmoon: 'mountain',
  ceruleancave: 'cave',
  diglettscave: 'cave',
  diglettscave_2: 'cave',
  rocktunnel: 'cave',
  powerplant: 'plant',
  pokemontower: 'tower',
  safarizone: 'forest',
  seafoamislands: 'iceCave',
  pokemonmansion: 'mall',
  victoryroad: 'mountain',
  cinnabar: 'volcano',
  indigo: 'mountain',
  billshouse: 'lab',
  route19: 'sea',
  route20: 'sea',
  route21: 'sea',
  route4: 'beach',
  route25: 'beach',
  route17: 'route',
  route18: 'route',
  // Johto
  newbark: 'town',
  sprouttower: 'tower',
  ruinsofalph: 'cave',
  unioncave: 'cave',
  ilexforest: 'forest',
  nationalpark: 'plant',
  burnedtower: 'tower',
  tintower: 'tower',
  mtmortar: 'mountain',
  icepath: 'iceCave',
  darkcave: 'cave',
  slowpokewell: 'cave',
  whirlislands: 'sea',
  victoryroad_jo: 'mountain',
  mtsilver: 'snow',
  tohjofalls: 'cave',
  lakerage: 'lake',
  jroute40: 'sea',
  jroute41: 'sea',
  jroute44: 'forest',
  jroute45: 'mountain',
  jroute46: 'mountain',
  jroute47: 'beach',
  jroute48: 'desert',
  olivine: 'beach',
  cianwood: 'beach',
  blackthorn: 'mountain',
  indigo_jo: 'mountain',
  goldenrod: 'mall',
  ecruteak: 'town',
  // Hoenn
  littleroot: 'town',
  lavaridge: 'volcano',
  mtchimney: 'volcano',
  meteorfalls: 'cave',
  granitecave: 'cave',
  shoalcave: 'iceCave',
  seafloorcavern: 'trench',
  caveoforigin: 'cave',
  skypillar: 'tower',
  desertunderpass: 'desert',
  sootopolis: 'lake',
  pacifidlog: 'sea',
  slateport: 'beach',
  dewford: 'beach',
  lilycove: 'mall',
  mossdeep: 'space',
  fortree: 'forest',
  petalburgwoods: 'forest',
  safarizone_hoenn: 'plant',
  weather_institute: 'lab',
  mirage_island: 'dimension1',
  victoryroad_ho: 'mountain',
  evergrande: 'mountain',
  magmahideout: 'volcano',
  aquahideout: 'sea',
  newmauville: 'plant',
  scorchedslab: 'desert',
  route111: 'desert',
  route112: 'volcano',
  route113: 'desert',
  route124: 'sea',
  route125: 'sea',
  route126: 'sea',
  route127: 'sea',
  route128: 'sea',
  route129: 'sea',
  route130: 'sea',
  route131: 'sea',
  route132: 'sea',
  route133: 'sea',
  route134: 'sea'
});

/** Keywords tested on the location id (catches locations added later). */
const SCENE_KEYWORDS = Object.freeze([
  [/(icepath|ice)/i, 'iceCave'],
  [/(cave|cavern|tunnel|underpass|well)/i, 'cave'],
  [/(forest|woods)/i, 'forest'],
  [/(volcano|magma|lava)/i, 'volcano'],
  [/(tower|pillar)/i, 'tower'],
  [/(desert|sand|dune)/i, 'desert'],
  [/(mountain|mt|silver|summit)/i, 'mountain'],
  [/(lake|rage)/i, 'lake'],
  [/(beach|shore|port|harbor)/i, 'beach'],
  [/(sea|ocean|water|aqua)/i, 'sea'],
  [/(plant|power|park)/i, 'plant'],
  [/(lab|institute|research)/i, 'lab'],
  [/(mall|casino|mansion|dept)/i, 'mall'],
  [/(snow|blizzard)/i, 'snow'],
  [/(space)/i, 'space'],
  [/(trench|seafloor)/i, 'trench'],
  [/(gym)/i, 'gym']
]);

/**
 * Scene of a location: explicit table, then id keywords, then location kind, then the default.
 * @param {string|null} locationId
 * @param {string|null} [locationKind]
 * @returns {string} One of BACKGROUND_SCENES
 */
export function resolveLocationScene(locationId, locationKind = null) {
  if (!locationId) return DEFAULT_BACKGROUND_SCENE;
  if (SCENE_BY_LOCATION[locationId]) return SCENE_BY_LOCATION[locationId];
  const keyword = SCENE_KEYWORDS.find(([pattern]) => pattern.test(locationId));
  if (keyword) return keyword[1];
  return SCENE_BY_KIND[locationKind] ?? DEFAULT_BACKGROUND_SCENE;
}
