/**
 * @file species-content.js
 * @brief Hand-made Pokémon species (see docs/GUIDE_CONTENU.md). Never rewritten by tools/data.
 * Same entry format as src/data/raw/species-data.js (SPECIES_TABLE); an entry with an existing id replaces the generated one.
 */
export const SPECIES_CONTENT = {
  // Link Stone replaces the four Kanto trade evolutions; the legacy content uses level 40.
  kadabra: {
    dex: 64,
    region: 'kanto',
    types: ['psychic'],
    stats: [40, 35, 30, 120, 100, 105],
    catchRate: 45,
    xpYield: 60,
    talents: ['psychicguard', 'insomnia', 'immunity', 'limber', 'owntempo', 'mistify', 'wonderskin', 'synchronize', 'strangecharm', 'naturalcure', 'technician', 'unaware', 'magicguard', 'psychicabsorb', 'pixiepelt', 'strategist', 'adaptability', 'ambidextrous', 'noguard', 'libero', 'flashpsycha'],
    hiddenTalent: 'magicguard',
    evolutions: [{ to: 'alakazam', item: 'link_stone', minLevel: 40 }]
  },
  machoke: {
    dex: 67,
    region: 'kanto',
    types: ['fighting'],
    stats: [80, 100, 70, 50, 60, 45],
    catchRate: 45,
    xpYield: 60,
    talents: ['grabguard', 'insomnia', 'immunity', 'limber', 'owntempo', 'resolve', 'wonderskin', 'synchronize', 'naturalcure', 'technician', 'scrappy', 'unaware', 'ironfist', 'dauntinglook', 'unburden', 'adaptability', 'ambidextrous', 'noguard', 'justified'],
    hiddenTalent: 'guts',
    evolutions: [{ to: 'machamp', item: 'link_stone', minLevel: 40 }]
  },
  graveler: {
    dex: 75,
    region: 'kanto',
    types: ['rock', 'ground'],
    stats: [55, 95, 115, 45, 45, 35],
    catchRate: 45,
    xpYield: 60,
    talents: ['sandveil', 'rockguard', 'groundguard', 'insomnia', 'immunity', 'limber', 'owntempo', 'solid', 'wonderskin', 'synchronize', 'sandforce', 'naturalcure', 'technician', 'unaware', 'brittlearmor', 'sandypelt', 'sandrush', 'sheerforce', 'adaptability', 'ambidextrous', 'noguard', 'filter'],
    hiddenTalent: 'stoned',
    evolutions: [{ to: 'golem', item: 'link_stone', minLevel: 40 }]
  },
  haunter: {
    dex: 93,
    region: 'kanto',
    types: ['ghost', 'poison'],
    stats: [45, 50, 45, 115, 55, 95],
    catchRate: 45,
    xpYield: 60,
    talents: ['poisonguard', 'insomnia', 'immunity', 'limber', 'owntempo', 'hexerei', 'noxious', 'wonderskin', 'synchronize', 'poisonpoint', 'naturalcure', 'technician', 'unaware', 'poisonabsorb', 'blackpelt', 'intimidate', 'adaptability', 'ambidextrous', 'noguard', 'flashvenum'],
    hiddenTalent: 'levitate',
    evolutions: [{ to: 'gengar', item: 'link_stone', minLevel: 40 }]
  }
};
