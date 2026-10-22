/**
 * @file KantoPuzzleContent.js
 * @brief Six Kanto exploration puzzles ported as data (never DOM or localized display text).
 * Clues, answers, prerequisites and first-clear rewards follow main-reference's
 * PUZZLE_EXPLORATIONS entries; localization lives in the en/fr puzzles domains.
 */
const sequence = (definition) => Object.freeze({ type: 'sequence', ...definition });
const code = (definition) => Object.freeze({ type: 'code', ...definition });
const freezeOptions = (options) => Object.freeze(options.map((option) => Object.freeze({ ...option })));

export const KANTO_PUZZLES = Object.freeze([
  sequence({
    id: 'cerulean_sigil_a',
    region: 'kanto',
    locationId: 'ceruleancave',
    icon: 'sparkle',
    titleKey: 'puzzles.cerulean_sigil_a.title',
    summaryKey: 'puzzles.cerulean_sigil_a.summary',
    clueKey: 'puzzles.cerulean_sigil_a.clue',
    successTextKey: 'puzzles.cerulean_sigil_a.success',
    options: freezeOptions([
      { key: 'rock', labelKey: 'puzzles.option.rock' },
      { key: 'lake', labelKey: 'puzzles.option.lake' },
      { key: 'bolt', labelKey: 'puzzles.option.bolt' },
      { key: 'shade', labelKey: 'puzzles.option.shade' }
    ]),
    solutionKeys: Object.freeze(['rock', 'lake', 'bolt', 'shade']),
    requires: Object.freeze([]),
    rewards: Object.freeze({ money: 6000, items: Object.freeze({ twisted_spoon: 1 }) })
  }),
  sequence({
    id: 'cerulean_sigil_b',
    region: 'kanto',
    locationId: 'ceruleancave',
    icon: 'star',
    titleKey: 'puzzles.cerulean_sigil_b.title',
    summaryKey: 'puzzles.cerulean_sigil_b.summary',
    clueKey: 'puzzles.cerulean_sigil_b.clue',
    successTextKey: 'puzzles.cerulean_sigil_b.success',
    options: freezeOptions([
      { key: 'rock', labelKey: 'puzzles.option.rock' },
      { key: 'lake', labelKey: 'puzzles.option.lake' },
      { key: 'bolt', labelKey: 'puzzles.option.bolt' },
      { key: 'shade', labelKey: 'puzzles.option.shade' }
    ]),
    solutionKeys: Object.freeze(['shade', 'bolt', 'lake', 'rock']),
    requires: Object.freeze(['cerulean_sigil_a']),
    rewards: Object.freeze({ money: 10000, items: Object.freeze({ leftovers: 1 }) })
  }),
  sequence({
    id: 'seafoam_valves_a',
    region: 'kanto',
    locationId: 'seafoamislands',
    icon: 'map',
    titleKey: 'puzzles.seafoam_valves_a.title',
    summaryKey: 'puzzles.seafoam_valves_a.summary',
    clueKey: 'puzzles.seafoam_valves_a.clue',
    successTextKey: 'puzzles.seafoam_valves_a.success',
    options: freezeOptions([
      { key: 'open', labelKey: 'puzzles.option.open_sea' },
      { key: 'foam', labelKey: 'puzzles.option.foam' },
      { key: 'heart', labelKey: 'puzzles.option.reef' }
    ]),
    solutionKeys: Object.freeze(['open', 'foam', 'heart']),
    requires: Object.freeze([]),
    rewards: Object.freeze({ money: 5000, items: Object.freeze({ mystic_water: 1 }) })
  }),
  code({
    id: 'seafoam_freeze_code',
    region: 'kanto',
    locationId: 'seafoamislands',
    icon: 'emptyDiamond',
    titleKey: 'puzzles.seafoam_freeze_code.title',
    summaryKey: 'puzzles.seafoam_freeze_code.summary',
    clueKey: 'puzzles.seafoam_freeze_code.clue',
    successTextKey: 'puzzles.seafoam_freeze_code.success',
    acceptedAnswers: Object.freeze(['GLACE', 'GEL', 'GIVRE', 'ICE', 'FROST']),
    requires: Object.freeze(['seafoam_valves_a']),
    rewards: Object.freeze({ money: 7000, items: Object.freeze({ never_melt_ice: 1 }) })
  }),
  sequence({
    id: 'mtmoon_fossils_a',
    region: 'kanto',
    locationId: 'mtmoon',
    icon: 'pickaxe',
    titleKey: 'puzzles.mtmoon_fossils_a.title',
    summaryKey: 'puzzles.mtmoon_fossils_a.summary',
    clueKey: 'puzzles.mtmoon_fossils_a.clue',
    successTextKey: 'puzzles.mtmoon_fossils_a.success',
    options: freezeOptions([
      { key: 'helix', labelKey: 'puzzles.option.helix' },
      { key: 'dome', labelKey: 'puzzles.option.dome' },
      { key: 'amber', labelKey: 'puzzles.option.amber' },
      { key: 'tools', labelKey: 'puzzles.option.tools' }
    ]),
    solutionKeys: Object.freeze(['helix', 'dome', 'amber', 'tools']),
    requires: Object.freeze([]),
    rewards: Object.freeze({ money: 4000, items: Object.freeze({ hard_stone: 1 }) })
  }),
  code({
    id: 'mtmoon_lunar_code',
    region: 'kanto',
    locationId: 'mtmoon',
    icon: 'star',
    titleKey: 'puzzles.mtmoon_lunar_code.title',
    summaryKey: 'puzzles.mtmoon_lunar_code.summary',
    clueKey: 'puzzles.mtmoon_lunar_code.clue',
    successTextKey: 'puzzles.mtmoon_lunar_code.success',
    acceptedAnswers: Object.freeze(['LUNE', 'MOON']),
    requires: Object.freeze(['mtmoon_fossils_a']),
    rewards: Object.freeze({ money: 5000, items: Object.freeze({ moonstone: 1 }) })
  })
]);
