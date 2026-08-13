/**
 * PokeWorld — Design Tokens Catalog (JS mirror)
 *
 * Single JavaScript catalog mirroring the CSS design tokens of
 * `src/assets/styles/design-system.css`. Game code that needs a theme id
 * or a standardized Pokémon sprite size MUST read it here instead of
 * hardcoding values — palette parity between JS and CSS is enforced by
 * the automated tests (tests/design-system-ui.test.js).
 *
 * @module core/design-tokens
 */

/** Theme ids — one per [data-theme="…"] palette block in design-system.css. */
export const THEME_IDS = ['dark', 'light', 'gameboy', 'fire'];

/**
 * The ONLY two standardized Pokémon sprite sizes allowed in the game:
 *  - `standard` : PC box, selectors, dictionary, presets, daycare… (56 px)
 *  - `team`     : active team / battle / large showcases (96 px)
 * Mirrored by the CSS tokens --pw-size-poke-sm / --pw-size-poke-lg.
 */
export const SPRITE_SIZES = Object.freeze({
  // Waves 15+17 (user feedback): out-of-team sprites too small — bumped
  // 56→72 (uniform with the dex circle), 96→104 (team), kept in parity
  // with the --pw-size-poke-* CSS tokens.
  standard: 72,
  team: 104,
});

/**
 * Resolve a Pokémon sprite size token to its pixel value.
 * @param {'standard'|'team'} token
 * @returns {number} pixel size
 */
export function spriteSizeFor(token) {
  return Object.prototype.hasOwnProperty.call(SPRITE_SIZES, token) ? SPRITE_SIZES[token] : SPRITE_SIZES.standard;
}

/** CSS var() references for the two sprite size tokens. */
export const SPRITE_SIZE_VARS = Object.freeze({
  standard: 'var(--pw-size-poke-sm, 72px)',
  team: 'var(--pw-size-poke-lg, 104px)',
});

