/**
 * @file BattleCombatantCard.js
 * @brief Battle card of one fighter (C++: class BattleCombatantCard : public UIContainer).
 * Same markup as the original battle row, so the original stylesheet lays it out:
 *   .poke-card.pw-poke-card[.pw-enemy-card | .active]
 *     .poke-card-top > (.pw-relative > sprite + item badge) + .poke-info (name, level, HP, [XP])
 *     .poke-moves (four move slots)
 * The wild card (first of #battle-team-row) shows the location landscape behind the sprite.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { PokemonMoveList } from './PokemonMoveList.js';
import { hpFillState } from './TeamMemberCard.js';
import { t } from '../../localization/LocalizationManager.js';

/** Side of the card in the battle row. */
export const CombatantSides = Object.freeze({ FOE: 'foe', PLAYER: 'player' });

export class BattleCombatantCard extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} options.side - CombatantSides value
   */
  constructor(options) {
    const isFoe = options.side === CombatantSides.FOE;
    super({ className: `poke-card pw-poke-card ${isFoe ? 'pw-enemy-card' : 'active'}`, name: 'BattleCombatantCard' });

    this._sprite = new UIPokemonSprite({ species: '', size: PokemonSpriteSizes.CONTEXT });
    this._name = new UIText({});
    this._level = new UIText({ className: 'poke-level' });
    this._hpBar = new UIProgressBar({ trackClassName: 'hp-bar', fillClassName: 'hp-fill' });
    this._hpText = new UIText({ tagName: 'div', className: 'hp-text' });
    this._xpBar = isFoe ? null : new UIProgressBar({ trackClassName: 'xp-bar', fillClassName: 'xp-fill' });
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
              new UIContainer({ className: 'poke-name', children: [this._name, this._level] }),
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
   * Displays a Pokémon (or hides the card when null).
   * @param {import('../../data/PokemonData.js').PokemonData|null} pokemon
   */
  setPokemon(pokemon) {
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
    this._hpBar.setValue(pokemon.hp, pokemon.maxHp);
    this._hpBar.setFillState(hpFillState(pokemon.getHpPercent()));
    this._hpText.setText(t('hp_value_over_max', { value: pokemon.hp, max: pokemon.maxHp }));
    if (this._xpBar) this._xpBar.setValue(pokemon.exp, pokemon.maxExp);
    this._moves.setPokemon(pokemon);
  }
}
