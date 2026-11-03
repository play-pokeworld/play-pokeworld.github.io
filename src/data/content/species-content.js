/**
 * @file species-content.js
 * @brief Hand-made Pokémon species (see docs/GUIDE_CONTENU.md). Never rewritten by tools/data.
 * Same entry format as src/data/raw/species-data.js (SPECIES_TABLE); an entry with an existing id replaces the generated one.
 */
export const SPECIES_CONTENT = {
  // The four Kanto trade evolutions are plain level 40 evolutions, exactly like the reference
  // (the Link Stone is not involved: it is unused there too).
  kadabra: {
    dex: 64,
    region: 'kanto',
    types: ['psychic'],
    stats: [40, 35, 30, 120, 100, 105],
    catchRate: 45,
    xpYield: 60,
    talents: ['psychicguard', 'insomnia', 'immunity', 'limber', 'owntempo', 'mistify', 'wonderskin', 'synchronize', 'strangecharm', 'naturalcure', 'technician', 'unaware', 'magicguard', 'psychicabsorb', 'pixiepelt', 'strategist', 'adaptability', 'ambidextrous', 'noguard', 'libero', 'flashpsycha'],
    hiddenTalent: 'magicguard',
    evolutions: [{ to: 'alakazam', level: 40 }]
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
    evolutions: [{ to: 'machamp', level: 40 }]
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
    evolutions: [{ to: 'golem', level: 40 }]
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
    evolutions: [{ to: 'gengar', level: 40 }]
  }
};
