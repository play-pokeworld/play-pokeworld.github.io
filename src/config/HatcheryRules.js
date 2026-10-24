/**
 * @file HatcheryRules.js
 * @brief Daycare and fossil incubation rules.
 */
export const HatcheryRules = Object.freeze({
  DEFAULT_SLOT_COUNT: 1,
  MAX_SLOT_COUNT: 4,
  SLOT_UPGRADE_COSTS: Object.freeze([500, 1000, 2500]),
  DAYCARE_KOS_PER_LEVEL: 10,
  MIN_FOSSIL_KOS: 25,
  MAX_FOSSIL_KOS: 100,
  LOCATION_ID: 'route5',
  MODE_DAYCARE: 'daycare',
  MODE_INCUBATION: 'incubation',
  BREEDING_REGION: 'johto',
  BREEDING_MAIN_QUEST: 'main.111',
  BABY_LEVEL: 5,
  LEGENDARY_DEX: Object.freeze([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386]),
  AUTO_HATCH_COST: 500,
  AUTO_FILL_COST: 1000,
  AUTO_HATCH_FEE: 1000,
  AUTO_DAYCARE_FEE: 100,
  SHINY_DENOMINATOR: 4096,
  AUTOMATION_FILTERS: Object.freeze(['priority', 'lowIV', 'lowEV', 'nonShiny']),
  BABY_SPECIES: Object.freeze({
    togetic: 'togepi', pikachu: 'pichu', raichu: 'pichu', clefairy: 'cleffa', clefable: 'cleffa',
    jigglypuff: 'igglybuff', wigglytuff: 'igglybuff', hitmonlee: 'tyrogue', hitmonchan: 'tyrogue',
    hitmontop: 'tyrogue', jynx: 'smoochum', electabuzz: 'elekid', magmar: 'magby',
    marill: 'azurill', azumarill: 'azurill', wobbuffet: 'wynaut'
  }),
  BST_BANDS: Object.freeze([
    Object.freeze({ maximum: 250, kos: 25 }),
    Object.freeze({ maximum: 330, kos: 35 }),
    Object.freeze({ maximum: 420, kos: 50 }),
    Object.freeze({ maximum: 520, kos: 70 }),
    Object.freeze({ maximum: 600, kos: 85 })
  ])
});
