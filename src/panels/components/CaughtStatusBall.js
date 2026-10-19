/**
 * @file CaughtStatusBall.js
 * @brief Small ball next to a Pokémon name telling whether its species is caught (shiny ball,
 * regular ball or empty ball), as in the original cards (C++: class CaughtStatusBall : public UIImage).
 * Follows the Pokédex of the active save through PokedexChangedEvent.
 */

import { UIImage } from '../../ui/UIImage.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { CaughtStatus } from '../../data/save/PokedexData.js';
import { PokedexChangedEvent } from '../../core/events/PokedexChangedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

/** Ball file stem and tooltip key of each status. */
const STATUS_LOOK = Object.freeze({
  [CaughtStatus.SHINY]: Object.freeze({ ball: 'Pokeball-shiny', tooltipKey: 'caught_status_shiny' }),
  [CaughtStatus.CAUGHT]: Object.freeze({ ball: 'Pokeball', tooltipKey: 'caught_status_caught' }),
  [CaughtStatus.NOT_CAUGHT]: Object.freeze({ ball: 'None', tooltipKey: 'caught_status_not_caught' })
});

export class CaughtStatusBall extends UIImage {
  constructor() {
    super({ className: 'caught-status-ball', name: 'CaughtStatusBall' });
    /** @private @type {string} */
    this._species = '';
    /** @private @type {string|null} */
    this._status = null;
    this.listen(PokedexChangedEvent, (event) => {
      if (event.species === this._species) this._refresh();
    });
  }

  /** @param {string} species - Species slug */
  setSpecies(species) {
    if (species === this._species) return;
    this._species = species;
    this._refresh();
  }

  /** @private */
  _refresh() {
    const pokedex = SaveSystem.getInstance().getCurrentSave()?.pokedex;
    const status = pokedex ? pokedex.getCaughtStatus(this._species) : CaughtStatus.NOT_CAUGHT;
    if (status === this._status) return;
    this._status = status;
    const look = STATUS_LOOK[status];
    this.setSource(AssetPaths.pokeball(look.ball));
    this.setTooltip(t(look.tooltipKey));
  }
}
