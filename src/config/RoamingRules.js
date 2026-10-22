/**
 * @file RoamingRules.js
 * @brief Deterministic UTC-window route pools and encounter tuning for roaming legends.
 * The route order, regional offsets, and species correspond to main-reference's roaming pool.
 */

const KANTO_ROUTES = Object.freeze([
  'route1', 'route22', 'route2', 'route3', 'route4', 'route24', 'route25', 'route5', 'route6',
  'route11', 'route9', 'route10', 'route8', 'route7', 'route16', 'route17', 'route18', 'route15',
  'route14', 'route13', 'route12', 'route19', 'route20', 'route21', 'route23'
]);
const JOHTO_ROUTES = Object.freeze([
  'jroute29', 'jroute30', 'jroute31', 'jroute32', 'jroute33', 'jroute34', 'jroute35', 'jroute36',
  'jroute37', 'jroute38', 'jroute39', 'jroute42', 'jroute43', 'jroute44', 'jroute45', 'jroute46',
  'jroute47', 'jroute48', 'nationalpark', 'jroute26', 'jroute27', 'jroute28'
]);
const HOENN_ROUTES = Object.freeze([
  'route101', 'route102', 'route103', 'route104', 'route110', 'route111', 'route112', 'route113',
  'route114', 'route115', 'route116', 'route117', 'route118', 'route119', 'route120', 'route121',
  'route123'
]);
const KANTO_JOHTO_OFFSETS = Object.freeze([0, 7, 13, 19]);
const HOENN_OFFSETS = Object.freeze([0, 4, 8, 12]);

export const RoamingRules = Object.freeze({
  ROTATION_MS: 12 * 60 * 60 * 1000,
  ENCOUNTER_CHANCE: 0.01,
  ENCOUNTER_LEVEL: 75,
  REGIONS: Object.freeze({
    kanto: Object.freeze({ windowOffset: 0, routes: KANTO_ROUTES, offsets: KANTO_JOHTO_OFFSETS, species: Object.freeze(['articuno', 'zapdos', 'moltres', 'mew']) }),
    johto: Object.freeze({ windowOffset: 5, routes: JOHTO_ROUTES, offsets: KANTO_JOHTO_OFFSETS, species: Object.freeze(['raikou', 'entei', 'suicune', 'celebi']) }),
    hoenn: Object.freeze({ windowOffset: 11, routes: HOENN_ROUTES, offsets: HOENN_OFFSETS, species: Object.freeze(['latias', 'latios', 'jirachi', 'deoxys']) })
  })
});
