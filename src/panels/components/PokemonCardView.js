/**
 * @file PokemonCardView.js
 * @brief Live card of one Pokémon, shared by the team window and the battle row
 * (C++: class PokemonCardView : public UIContainer).
 *
 * Same markup as the original game, so design-system.css lays it out:
 *   .poke-card
 *     .poke-card-top > (.pw-relative > sprite + held item badge) + .poke-info (name, level, caught ball, HP, [XP])
 *     .poke-moves (four move slots)
 *
 * The nodes are built ONCE; setPokemon() only updates what changed (text, gauges,
 * sprite), so a card refreshed on every battle tick causes no DOM rebuild, no image
 * reload and no layout jump.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { PokemonMoveList } from './PokemonMoveList.js';
import { CaughtStatusBall } from './CaughtStatusBall.js';
import { hpFillState } from './HpFillState.js';
import { t } from '../../localization/LocalizationManager.js';

export class PokemonCardView extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} [options.className='']        - Extra classes after `poke-card`
   * @param {boolean} [options.showXp=true]         - Shows the EXP gauge
   * @param {string} [options.hpTextKey='value_over_max'] - Localization key of the HP text ({value}, {max})
   * @param {string} [options.name='PokemonCardView']
   */
  constructor(options = {}) {
    super({ className: `poke-card ${options.className || ''}`.trim(), name: options.name || 'PokemonCardView' });
    this._hpTextKey = options.hpTextKey || 'value_over_max';

    this._sprite = new UIPokemonSprite({ species: '', size: PokemonSpriteSizes.CONTEXT });
    this._name = new UIText({});
    this._level = new UIText({ className: 'poke-level' });
    this._caughtBall = new CaughtStatusBall();
    this._hpBar = new UIProgressBar({ trackClassName: 'hp-bar', fillClassName: 'hp-fill' });
    this._hpText = new UIText({ tagName: 'div', className: 'hp-text' });
    this._xpBar = options.showXp === false ? null : new UIProgressBar({ trackClassName: 'xp-bar', fillClassName: 'xp-fill' });
    this._moves = new PokemonMoveList();

    const itemSlot = new UIText({ tagName: 'div', className: 'poke-item-badge empty', text: t('held_item_empty_symbol') });
    itemSlot.setTooltip(t('held_item_tooltip'));

    this.addChildren([
      new UIContainer({
        className: 'poke-card-top',
        children: [
          new UIContainer({
            className: 'pw-relative',
            children: [
              new UIContainer({
                className: 'poke-sprite-container large',
                children: [new UIContainer({ className: 'poke-sprite', children: [this._sprite] })]
              }),
              itemSlot
            ]
          }),
          new UIContainer({
            className: 'poke-info',
            children: [
              new UIContainer({ className: 'poke-name', children: [this._name, this._level, this._caughtBall] }),
              new UIContainer({ className: 'hp-bar-container', children: [this._hpBar, this._hpText] }),
              this._xpBar && new UIContainer({ className: 'xp-bar-container', children: [this._xpBar] })
            ]
          })
        ]
      }),
      this._moves
    ]);
  }

  /**
   * Displays a Pokémon (or hides the card when null). Safe to call on every game event.
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData|null} pokemon
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData|null} [opponent=null] - Shows the move effectiveness against it
   */
  setPokemon(pokemon, opponent = null) {
    if (!pokemon) {
      this.hide();
      return;
    }
    this.show();
    const name = pokemon.getDisplayName();
    this._name.setText(name);
    this._level.setText(t('level_short_value', { level: pokemon.level }));
    this._sprite.setSpecies(pokemon.species, pokemon.form, pokemon.shiny);
    this._sprite.setAlt(name);
    this._caughtBall.setSpecies(pokemon.species);
    const maxHp = pokemon.getMaxHp();
    this._hpBar.setValue(pokemon.hp, maxHp);
    this._hpBar.setFillState(hpFillState(pokemon.getHpPercent()));
    this._hpText.setText(t(this._hpTextKey, { value: pokemon.hp, max: maxHp }));
    if (this._xpBar) this._xpBar.setValue(pokemon.getExpInLevel(), pokemon.getExpLevelSpan());
    this._moves.setPokemon(pokemon, opponent);
  }
}
