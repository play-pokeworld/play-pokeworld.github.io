/**
 * @file TeamMemberCard.js
 * @brief Team window card of one Pokémon: portrait, held item slot, name, level, HP and EXP gauges
 * (C++: class TeamMemberCard : public UIContainer).
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { PokemonMoveList } from './PokemonMoveList.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { t } from '../../localization/LocalizationManager.js';

/** HP ratio thresholds of the .hp-fill colour states. */
const HP_HIGH_PERCENT = 50;
const HP_MEDIUM_PERCENT = 20;

/**
 * @param {number} percent
 * @returns {'high'|'medium'|'low'}
 */
export function hpFillState(percent) {
  if (percent > HP_HIGH_PERCENT) return 'high';
  if (percent > HP_MEDIUM_PERCENT) return 'medium';
  return 'low';
}

export class TeamMemberCard extends UIContainer {
  /**
   * @param {Object} options
   * @param {import('../../data/PokemonData.js').PokemonData} options.pokemon
   * @param {number} options.index - Position in the team
   * @param {Function} [options.onClick=null]
   */
  constructor(options) {
    super({ className: 'poke-card', name: 'TeamMemberCard' });
    const pokemon = options.pokemon;
    const name = pokemon.getDisplayName();
    this.setData('index', String(options.index));

    const hpBar = new UIProgressBar({ value: pokemon.hp, max: pokemon.maxHp, trackClassName: 'hp-bar', fillClassName: 'hp-fill' });
    hpBar.setFillState(hpFillState(pokemon.getHpPercent()));

    const itemSlot = new UIText({ tagName: 'div', className: 'poke-item-badge empty', text: t('held_item_empty_symbol') });
    itemSlot.setTooltip(t('held_item_tooltip'));

    const moveList = new PokemonMoveList();
    moveList.setPokemon(pokemon);

    this.addChildren([
      new UIContainer({
        className: 'poke-card-top',
        children: [
          new UIContainer({
            className: 'pw-relative',
            children: [
              new UIContainer({
                className: 'poke-sprite-container large',
                children: [new UIContainer({
                  className: 'poke-sprite',
                  children: [new UIPokemonSprite({ species: pokemon.species, form: pokemon.form, shiny: pokemon.shiny, alt: name, size: PokemonSpriteSizes.CONTEXT })]
                })]
              }),
              itemSlot
            ]
          }),
          new UIContainer({
            className: 'poke-info',
            children: [
              new UIContainer({
                className: 'poke-name',
                children: [
                  new UIText({ text: name }),
                  new UIText({ className: 'poke-level', text: t('level_short_value', { level: pokemon.level }) })
                ]
              }),
              new UIContainer({
                className: 'hp-bar-container',
                children: [
                  hpBar,
                  new UIContainer({
                    className: 'hp-text',
                    children: [new UIText({ text: t('value_over_max', { value: pokemon.hp, max: pokemon.maxHp }) })]
                  })
                ]
              }),
              new UIContainer({
                className: 'xp-bar-container',
                children: [new UIProgressBar({ value: pokemon.exp, max: pokemon.maxExp, trackClassName: 'xp-bar', fillClassName: 'xp-fill' })]
              })
            ]
          })
        ]
      }),
      moveList
    ]);

    if (options.onClick) this.addDomListener('click', () => options.onClick(options.index));
  }
}
