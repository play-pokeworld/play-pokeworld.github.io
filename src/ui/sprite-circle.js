/**
 * PokeWorld UI Design System — Sprite Circle helper
 *
 * THE one and only Pokémon sprite background: a canonical SOLID DARK disc
 * (theme token --pw-bg-sprite, DS2807 — always darker than the theme
 * surface) on a transparent wrapper. Every sprite container in the game
 * (team cards, PC box, presets, daycare, atoll…) MUST be built through
 * this helper — no more light halos, no clear/dark background mixups.
 *
 * Sizes are restricted to the two standardized tokens of the Design
 * System (see core/design-tokens.js): 'standard' (56 px) and 'team'
 * (96 px). Anything else is clamped to 'standard'.
 *
 * @module ui/sprite-circle
 */
import { SPRITE_SIZES } from '../core/design-tokens.js';

/**
 * Build a standardized sprite container.
 * @param {Object} options
 * @param {'standard'|'team'} [options.size='standard'] - Size token
 * @param {string} [options.src] - Sprite image URL (optional)
 * @param {string} [options.alt=''] - Sprite alt text
 * @param {string} [options.className=''] - Extra classes on the wrapper
 * @param {boolean} [options.shiny=false] - Show the shiny marker
 * @returns {HTMLElement} wrapper (.pw-poke-circle-wrap) containing
 *   the circle background (.pw-poke-circle-bg) and, when `src` is given,
 *   the sprite image (.pw-poke-circle-img).
 */
export function buildSpriteCircle(options = {}) {
  const sizeToken = Object.prototype.hasOwnProperty.call(SPRITE_SIZES, options.size) ? options.size : 'standard';
  const px = SPRITE_SIZES[sizeToken];

  const wrap = document.createElement('span');
  wrap.className = `pw-poke-circle-wrap pw-poke-circle-wrap--${sizeToken} ${options.className || ''}`.trim();
  wrap.dataset.size = sizeToken;
  wrap.style.width = px + 'px';
  wrap.style.height = px + 'px';

  const bg = document.createElement('span');
  bg.className = 'pw-poke-circle-bg';
  bg.setAttribute('aria-hidden', 'true');
  wrap.appendChild(bg);

  if (options.src) {
    const img = document.createElement('img');
    img.className = 'pw-poke-circle-img sprite-img';
    img.src = options.src;
    img.alt = options.alt || '';
    img.width = Math.round(px * 0.9);
    img.height = Math.round(px * 0.9);
    wrap.appendChild(img);
  }

  if (options.shiny) {
    const star = document.createElement('span');
    star.className = 'pw-poke-circle-shiny';
    star.textContent = '★';
    wrap.appendChild(star);
  }

  return wrap;
}

