/**
 * @file PokemonBackgroundView.js
 * @brief Decorative collection layer for the active game page; rendering only.
 *
 * The save's caught Pokédex entries are supplied by PokedexData and observed through
 * typed events. Movement, size and timing are expressed with CSS classes only.
 */

import { UIContainer } from './UIContainer.js';
import { UIImage } from './UIImage.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { Random } from '../core/Random.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { PokedexChangedEvent } from '../core/events/PokedexChangedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';

const MIN_WALKERS = 5;
const CAUGHT_PER_EXTRA_WALKER = 10;

/**
 * A quiet, pointer-transparent illustration of the save's caught collection.
 * The CSS animation has no dependency on the game clock or battle loop.
 */
export class PokemonBackgroundView extends UIContainer {
  constructor({ random = Random.default } = {}) {
    super({
      id: 'pw-background-pokemon-layer',
      className: 'pw-background-pokemon-layer',
      name: 'PokemonBackgroundView'
    });
    this._random = random && typeof random.int === 'function' && typeof random.pick === 'function'
      ? random
      : Random.default;
    this.setAttribute('aria-hidden', 'true');
    this._rosterSignature = '';
    /** @private @type {Array<{image: UIImage}>} */
    this._walkers = [];

    this.listen(PokedexChangedEvent, () => this.refresh());
    this.listen(SaveLoadedEvent, () => this.refresh());
    this.listen(SaveCreatedEvent, () => this.refresh());
    this.refresh();
  }

  /** Reconciles the decorative roster with the active save. */
  refresh() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const roster = save?.pokedex.getCaughtSpecies() || [];
    const signature = roster.map(({ species, shiny }) => `${species}:${shiny ? 1 : 0}`).join('|');
    if (signature === this._rosterSignature) return;

    this._rosterSignature = signature;
    this.clearChildren();
    this._walkers = [];

    const walkerCount = roster.length === 0
      ? 0
      : MIN_WALKERS + Math.floor(roster.length / CAUGHT_PER_EXTRA_WALKER);
    for (let index = 0; index < walkerCount; index++) {
      this._walkers.push(this._createWalker(index, roster));
    }
    this.toggleClass('has-walkers', walkerCount > 0);
  }

  /** @private @param {number} index @param {Array<{species: string, shiny: boolean}>} roster */
  _createWalker(index, roster) {
    const route = this._random.int(0, 3);
    const profile = [
      ...this._routeClasses(route),
      `pw-background-pokemon-walker--size-${index % 5}`,
      `pw-background-pokemon-walker--speed-${index % 6}`,
      `pw-background-pokemon-walker--phase-${index % 8}`
    ].join(' ');
    const walker = new UIContainer({
      className: `pw-background-pokemon-walker ${profile}`,
      name: 'BackgroundPokemonWalker'
    });
    const image = new UIImage({
      className: 'pw-background-pokemon-sprite',
      alt: '',
      pixelated: true
    });
    walker.addChild(image);
    walker.addDomListener('animationiteration', () => {
      this._setRandomSpecies(image, roster);
      this._randomizeRoute(walker);
    });
    this._setRandomSpecies(image, roster);
    this.addChild(walker);
    return { image };
  }

  /** @private @param {number} route @returns {string[]} */
  _routeClasses(route) {
    // Match the original: travel across one diagonal, facing the horizontal direction of travel.
    const facing = route === 1 || route === 3 ? 'left' : 'right';
    return [
      `pw-background-pokemon-walker--route-${route}`,
      `pw-background-pokemon-walker--facing-${facing}`
    ];
  }

  /** @private @param {UIContainer} walker */
  _randomizeRoute(walker) {
    for (let route = 0; route < 4; route++) walker.removeClass(`pw-background-pokemon-walker--route-${route}`);
    walker.removeClass('pw-background-pokemon-walker--facing-left');
    walker.removeClass('pw-background-pokemon-walker--facing-right');
    for (let phase = 0; phase < 8; phase++) walker.removeClass(`pw-background-pokemon-walker--phase-${phase}`);
    const route = this._random.int(0, 3);
    this._routeClasses(route).forEach((className) => walker.addClass(className));
    // Initial entrants are phase-staggered. Subsequent trips begin at the new route's entrance.
    walker.addClass('pw-background-pokemon-walker--phase-active');
  }

  /** @private @param {UIImage} image @param {Array<{species: string, shiny: boolean}>} roster */
  _setRandomSpecies(image, roster) {
    if (!roster.length) return;
    const entry = this._random.pick(roster);
    image.setSource(AssetPaths.pokemonSprite(entry.species, '', entry.shiny));
    image.toggleClass('is-shiny', entry.shiny);
  }
}
