/**
 * @file DungeonTileVisuals.js
 * @brief Sprites drawn on the dungeon expedition grid (reference: main dungeon board).
 * Glyphs are monochrome files of assets/images/dungeon/, tinted by the tile colour in CSS.
 */

export const DungeonTileVisuals = Object.freeze({
  /** Trainer portrait (file stem in assets/images/trainers/) drawn on the player's tile. */
  PLAYER_TRAINER: 'trainer-54',
  /** Main glyph file per revealed tile type; empty ground has none. */
  GLYPHS: Object.freeze({
    combat: 'pokeball.svg',
    elite: 'pokeball.svg',
    chest: 'chest.png',
    boss: 'boss.png',
    ladder: 'ladder.png'
  }),
  /** Small badge added on top of the main glyph (elite = starred Poké Ball). */
  BADGES: Object.freeze({
    elite: 'star.svg'
  }),
  /** Tile types whose glyph disappears once resolved (the tile becomes plain ground). */
  CLEARED_WHEN_DONE: Object.freeze(['combat', 'elite', 'chest'])
});
