/**
 * @file trainers-content.js
 * @brief Hand-made trainers and rematch teams (see docs/GUIDE_CONTENU.md). Never rewritten by tools/data.
 * Same entry format as src/data/raw/trainers-data.js (TRAINERS_TABLE); an entry with an existing id
 * replaces the generated one (copy the whole entry, then edit it).
 *
 * Rematch team: `teams.rematch` is used from the second win on (no money, like the original).
 * Without it the rematch replays `teams.default` (or the starter variant of `teams.byStarter`).
 *
 * Example (kept commented so that the original game stays unchanged):
 *
 *   brock: {
 *     kind: 'gym', region: 'kanto', badge: 'boulder', badgesRequired: 0, reward: 1500, sprite: 'Brock',
 *     teams: {
 *       default: [
 *         { species: 'geodude', level: 12, moves: ['tackle', 'rock_throw', 'mud_slap'], talent: 'rockguard' },
 *         { species: 'onix', level: 14, moves: ['tackle', 'rock_throw', 'rock_tomb', 'dig'], item: 'hard_stone' }
 *       ],
 *       rematch: [
 *         { species: 'golem', level: 55, moves: ['earthquake', 'stone_edge'], ivs: { hp: 6, def: 6 } },
 *         { species: 'steelix', level: 58, moves: ['iron_tail', 'earthquake'], item: 'hard_stone' }
 *       ]
 *     }
 *   }
 */
export const TRAINERS_CONTENT = {};
