/**
 * @file AssetPaths.js
 * @brief Single place resolving every image path used by the game (C++ equivalent: class AssetPaths, static).
 * All assets live in the project-root `assets/` folder (never under `src/`).
 * If the asset folder layout changes, only this file must be edited.
 *
 * Layout:
 *   assets/images/pokemon/<species>.png          default form
 *   assets/images/pokemon/<species>_<form>.png   alternate form (e.g. 'vulpix_alola')
 *   assets/images/pokemon/shiny/<same name>.png  shiny variant of the two above
 *   assets/images/trainers/<trainerName>.png     trainer portraits (player and NPCs)
 */

const IMAGES_ROOT = 'assets/images/';
const POKEMON_DIR = `${IMAGES_ROOT}pokemon/`;
const SHINY_SUBDIR = 'shiny/';
const TRAINER_DIR = `${IMAGES_ROOT}trainers/`;
const POKEBALL_DIR = `${IMAGES_ROOT}pokeball/`;
const CURRENCY_DIR = `${IMAGES_ROOT}currency/`;
const BADGE_DIR = `${IMAGES_ROOT}badges/`;
const MAP_DIR = `${IMAGES_ROOT}maps/`;
const ITEM_DIR = `${IMAGES_ROOT}items/`;
const APP_ICON = `${IMAGES_ROOT}Icon.png`;

/** Trainer portrait used when a save has none (file stem in assets/images/trainers/). */
export const DEFAULT_TRAINER_NAME = 'trainer-0';

/**
 * Normalizes an identifier into a file stem: trims, lowercases species/forms
 * and URL-encodes characters that are not path-safe (spaces, accents, parentheses).
 * @param {string} value
 * @returns {string}
 */
function fileStem(value) {
  return encodeURIComponent(String(value ?? '').trim());
}

export class AssetPaths {
  /**
   * @param {string} species - Lowercase species slug (e.g. 'bulbasaur')
   * @param {string} [form=''] - Optional form suffix (e.g. 'alola'); empty = default form
   * @param {boolean} [shiny=false] - Shiny variant (assets/images/pokemon/shiny/)
   * @returns {string}
   */
  static pokemonSprite(species, form = '', shiny = false) {
    const base = fileStem(String(species || '').toLowerCase());
    const suffix = form ? `_${fileStem(String(form).toLowerCase())}` : '';
    return `${POKEMON_DIR}${shiny ? SHINY_SUBDIR : ''}${base}${suffix}.png`;
  }

  /**
   * @param {string} [trainerName] - File stem of the portrait (e.g. 'trainer-3', 'Rival Blue')
   * @returns {string}
   */
  static trainerSprite(trainerName) {
    return `${TRAINER_DIR}${fileStem(trainerName || DEFAULT_TRAINER_NAME)}.png`;
  }

  /** @returns {string} */
  static defaultTrainerSprite() {
    return AssetPaths.trainerSprite(DEFAULT_TRAINER_NAME);
  }

  /**
   * @param {string} ballName - File stem, e.g. 'Pokeball', 'Greatball'
   * @returns {string}
   */
  static pokeball(ballName) {
    return `${POKEBALL_DIR}${fileStem(ballName)}.svg`;
  }

  /**
   * @param {string} currencyId - File stem, e.g. 'money', 'dungeonToken'
   * @returns {string}
   */
  static currency(currencyId) {
    return `${CURRENCY_DIR}${fileStem(currencyId)}.svg`;
  }

  /**
   * @param {string} badgeName - File stem, e.g. 'Boulder'
   * @returns {string}
   */
  static badge(badgeName) {
    return `${BADGE_DIR}${fileStem(badgeName)}.svg`;
  }

  /**
   * @param {string} itemFile - File name relative to assets/images/items/ (e.g. 'balls/poke-ball.png')
   * @returns {string}
   */
  static item(itemFile) {
    return `${ITEM_DIR}${String(itemFile || '').split('/').map(fileStem).join('/')}`;
  }

  /**
   * @param {string} region - Region id, e.g. 'kanto'
   * @returns {string}
   */
  static regionMap(region) {
    return `${MAP_DIR}${fileStem(region)}.png`;
  }

  /** @returns {string} Game logo shown in the header */
  static appIcon() {
    return APP_ICON;
  }
}
