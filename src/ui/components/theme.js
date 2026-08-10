/**
 * PokéWorld UI — Theme tokens
 *
 * Single access point for every visual decision of the design system.
 * UI objects NEVER carry literal colors: they reference token names that
 * resolve to CSS custom properties (`var(--pw-*)`), re-mapped per theme by
 * the stylesheet. This is what makes the "gris-marron" era definitively
 * impossible: no component can hardcode a color anymore.
 *
 * Also exposes a contrast guard (WCAG) used by tests and dev checks to
 * forbid illegible text combinations.
 *
 * @module ui/components/theme
 */
import { THEME_IDS, SPRITE_SIZES, spriteSizeFor } from '../../core/design-tokens.js';

export { THEME_IDS, SPRITE_SIZES, spriteSizeFor };

/**
 * Semantic token catalog (name → CSS custom property).
 * Surfaces/text/buttons are themed per [data-theme] in design-system.css.
 */
export const THEME_TOKENS = Object.freeze({
  surface: '--pw-surface',
  surfaceSoft: '--pw-surface-soft',
  bgSurface: '--pw-bg-surface',
  bgHeader: '--pw-bg-header',
  bgSprite: '--pw-bg-sprite',
  border: '--pw-border-color',
  textPrimary: '--pw-text-primary',
  textSecondary: '--pw-text-secondary',
  circleBg: '--pw-circle-bg',
  accent: '--pw-accent-color',
  btnBg: '--pw-btn-bg',
  btnBgHover: '--pw-btn-bg-hover',
  btnText: '--pw-btn-text',
  btnBorder: '--pw-btn-border',
  btnActiveBg: '--pw-btn-active-bg',
  btnActiveText: '--pw-btn-active-text',
  sizePokeStandard: '--pw-size-poke-sm',
  sizePokeTeam: '--pw-size-poke-lg',
});

/**
 * Resolve a token name to its `var(--token)` reference for inline styles
 * that cannot be expressed by a class (never a literal color).
 * @param {keyof typeof THEME_TOKENS} name
 * @returns {string}
 */
export function token(name) {
  const cssVar = THEME_TOKENS[name];
  if (!cssVar) throw new Error(`[ui] Unknown theme token "${name}"`);
  return `var(${cssVar})`;
}

// ─── Contrast guard (WCAG 2.x relative luminance) ─────────────────────────

/** @param {string} hex '#rgb' or '#rrggbb' @returns {[number,number,number]} */
function hexToRgb(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** @param {string} hex @returns {number} Relative luminance 0..1 */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two hex colors.
 * @param {string} hexA @param {string} hexB @returns {number} 1..21
 */
export function contrastRatio(hexA, hexB) {
  const l1 = luminance(hexA);
  const l2 = luminance(hexB);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Minimum ratio enforced for UI text (WCAG AA, normal text). */
export const MIN_CONTRAST_RATIO = 4.5;

/**
 * Contrast assertion used by the design-system tests: throws when the
 * combination would produce illegible text.
 * @param {string} fgHex @param {string} bgHex @param {string} [label]
 * @returns {number} The measured ratio.
 */
export function assertContrast(fgHex, bgHex, label = '') {
  const ratio = contrastRatio(fgHex, bgHex);
  if (ratio < MIN_CONTRAST_RATIO) {
    throw new Error(`[ui] Contrast ${ratio.toFixed(2)} < ${MIN_CONTRAST_RATIO} (${label || `${fgHex} on ${bgHex}`})`);
  }
  return ratio;
}
