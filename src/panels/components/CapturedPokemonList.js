/**
 * @file CapturedPokemonList.js
 * @brief Shared "captured Pokémon" list of the battle summary and the AFK report.
 *
 * Those two windows were rendered by two copies of the same block: one line changed in the battle
 * summary silently left the AFK recap behind (exactly what happened to the item list before 1.16.8).
 * The row is now built once, here, so both windows share the same markup and the same grouping rules.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { groupBattleCaptures } from './BattleLootStrip.js';
import { t } from '../../localization/LocalizationManager.js';

export class CapturedPokemonList extends UIContainer {
  /**
   * @param {{captures?:Array<Object>, emptyKey:string}} options
   */
  constructor({ captures = [], emptyKey }) {
    super({ className: 'pw-col pw-gap-sm', name: 'CapturedPokemonList' });
    this.addChild(new UIText({ tagName: 'h3', className: 'pw-section-title', text: t('captured_pokemon_title') }));
    const groups = groupBattleCaptures(captures);
    if (!groups.length) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-empty-state is-sm', text: t(emptyKey) }));
      return;
    }
    for (const group of groups) {
      const pokemonName = group.name || t(`pokemon.${group.species}`);
      const subLabel = group.duplicateCount > 0
        ? t('battle_summary_duplicate_count', { count: group.duplicateCount })
        : t(group.shiny ? 'battle_summary_shiny' : 'battle_summary_standard');
      this.addChild(new UIContainer({
        className: `battle-summary-entry ${group.shiny ? 'is-shiny' : 'is-normal'}`,
        children: [
          new UIContainer({
            className: 'pw-summary-sprite',
            children: [new UIPokemonSprite({
              species: group.species,
              form: group.form,
              shiny: group.shiny,
              alt: pokemonName,
              size: PokemonSpriteSizes.STANDARD
            })]
          }),
          new UIContainer({
            className: 'pw-flex-1',
            children: [
              new UIText({ tagName: 'div', className: 'pw-summary-name', text: pokemonName }),
              new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: subLabel })
            ]
          }),
          new UIText({ tagName: 'div', className: 'pw-summary-count', text: `×${group.count}` })
        ]
      }));
    }
  }
}
