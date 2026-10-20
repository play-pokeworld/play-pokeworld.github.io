/**
 * @file PokemonCardView.js
 * @brief Live Pokémon card shared by the team window and battle row.
 * Keeps the original `.poke-card` / `.poke-moves` DOM hooks used by the skin,
 * while updating widgets in place to avoid rebuilding sprites on battle ticks.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { UIImage } from '../../ui/UIImage.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { PokemonMoveList } from './PokemonMoveList.js';
import { CaughtStatusBall } from './CaughtStatusBall.js';
import { hpFillState } from './HpFillState.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

const MOD_STAT_LABELS = Object.freeze({ atk: 'ATK', def: 'DEF', spe: 'VIT', spa: 'SPA', spd: 'SPD' });

/** @param {number} value */
function stageArrow(value) {
  if (value > 1.8) return t('stat_up_high');
  if (value > 1.3) return t('stat_up_mid');
  if (value > 1.02) return t('stat_up_low');
  if (value < 0.5) return t('stat_down_high');
  if (value < 0.75) return t('stat_down_mid');
  if (value < 0.98) return t('stat_down_low');
  return '';
}

export class PokemonCardView extends UIContainer {
  /**
   * @param {Object} options
   * @param {string} [options.className='']
   * @param {boolean} [options.showXp=true]
   * @param {boolean} [options.showMoves=true]
   * @param {boolean} [options.showInfoButton=false]
   * @param {Function|null} [options.onInfoClick=null]
   * @param {Function|null} [options.onHeldItemClick=null]
   * @param {string} [options.hpTextKey='value_over_max']
   * @param {string} [options.name='PokemonCardView']
   */
  constructor(options = {}) {
    super({ className: `poke-card ${options.className || ''}`.trim(), name: options.name || 'PokemonCardView' });
    this._hpTextKey = options.hpTextKey || 'value_over_max';
    this._onInfoClick = typeof options.onInfoClick === 'function' ? options.onInfoClick : null;
    this._onHeldItemClick = typeof options.onHeldItemClick === 'function' ? options.onHeldItemClick : null;

    this._sprite = new UIPokemonSprite({ species: '', size: PokemonSpriteSizes.CONTEXT });
    this._name = new UIText({});
    this._level = new UIText({ className: 'poke-level' });
    this._caughtBall = new CaughtStatusBall();
    this._hpBar = new UIProgressBar({ trackClassName: 'hp-bar', fillClassName: 'hp-fill' });
    this._hpText = new UIText({ tagName: 'div', className: 'hp-text' });
    this._xpBar = options.showXp === false ? null : new UIProgressBar({ trackClassName: 'xp-bar', fillClassName: 'xp-fill' });
    this._moves = new PokemonMoveList();
    this._battleStatus = new UIContainer({ className: 'poke-status' });
    this._battleBuffs = new UIContainer({ className: 'poke-buffs' });
    this._battleStatus.hide();
    this._battleBuffs.hide();
    this._battleStatusSignature = '';
    this._movesVisible = options.showMoves !== false;
    if (!this._movesVisible) this._moves.hide();

    this._itemBadge = new UIContainer({ tagName: 'div', className: 'poke-item-badge empty' });
    this._itemImage = new UIImage({ className: 'poke-item-image', pixelated: true });
    this._itemEmpty = new UIText({ tagName: 'span', className: 'poke-item-empty-symbol', text: t('held_item_empty_symbol') });
    this._itemImage.hide();
    this._itemBadge.addChildren([this._itemImage, this._itemEmpty]);
    this._itemBadge.setTooltip(t('held_item_tooltip', { name: t('pokemon_info_no_item') }));
    if (this._onHeldItemClick) {
      this._itemBadge.setAttribute('role', 'button');
      this._itemBadge.setAttribute('tabindex', '0');
      this._itemBadge.addDomListener('click', (event) => {
        event.stopPropagation();
        this._onHeldItemClick(event);
      });
      this._itemBadge.addDomListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        this._onHeldItemClick(event);
      });
    }

    this._infoButton = options.showInfoButton
      ? new UIButton({
          icon: 'info',
          className: 'poke-card-info-btn',
          onClick: (event) => {
            event.stopPropagation();
            this._onInfoClick?.(event);
          }
        })
      : null;
    if (this._infoButton) this._infoButton.setAriaLabel(t('pokemon_info_panel'));

    this._info = new UIContainer({
      className: 'poke-info',
      children: [
        new UIContainer({ className: 'poke-name', children: [this._name, this._level, this._caughtBall, this._infoButton] }),
        new UIContainer({ className: 'hp-bar-container', children: [this._hpBar, this._hpText] }),
        this._xpBar && new UIContainer({ className: 'xp-bar-container', children: [this._xpBar] }),
        this._battleStatus,
        this._battleBuffs
      ]
    });

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
              this._itemBadge
            ]
          }),
          this._info
        ]
      }),
      this._moves
    ]);
  }

  /**
   * Displays a Pokémon (or hides the card when null).
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData|null} pokemon
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData|null} [opponent=null]
   */
  setPokemon(pokemon, opponent = null) {
    if (!pokemon) {
      this.hide();
      this.toggleClass('fainted', false);
      return;
    }
    this.show();
    this.toggleClass('fainted', pokemon.isFainted());
    const name = pokemon.getDisplayName();
    this._name.setText(name);
    this._level.setText(t('level_short_value', { level: pokemon.level }));
    this._sprite.setSpecies(pokemon.species, pokemon.form, pokemon.shiny);
    this._sprite.setAlt(name);
    this._caughtBall.setSpecies(pokemon.species);
    const maxHp = pokemon.getMaxHp();
    this._hpBar.setValue(pokemon.hp, maxHp);
    this._hpBar.setFillState(hpFillState(pokemon.getHpPercent()));
    this._hpText.setText(t(this._hpTextKey, {
      value: TextFormatter.formatNumber(pokemon.hp),
      max: TextFormatter.formatNumber(maxHp)
    }));
    if (this._xpBar) this._xpBar.setValue(pokemon.getExpInLevel(), pokemon.getExpLevelSpan());
    this._setHeldItem(pokemon.heldItem || null, name);
    this._moves.setPokemon(pokemon, opponent);
  }

  /** @param {boolean} visible */
  setMovesVisible(visible) {
    this._movesVisible = !!visible;
    this._moves.setVisible(this._movesVisible);
  }

  /** @param {number} index @param {number} progressPercent */
  setMoveProgress(index, progressPercent) {
    this._moves.setBattleProgress(index, progressPercent);
  }

  /**
   * Updates battle-only volatile status and stat changes. The data stays in BattleSystem;
   * this widget only translates the view model into the original badges.
   * @param {import('../../systems/battle/BattleCombatant.js').BattleCombatant|null} combatant
   */
  setBattleState(combatant) {
    const status = combatant?.status || '';
    const mods = combatant?.statMods || {};
    const buffEntries = Object.entries(MOD_STAT_LABELS)
      .map(([stat, label]) => {
        const arrow = stageArrow(Number(mods[stat] ?? 1));
        if (!arrow) return null;
        return { stat, label, arrow, up: arrow.includes('▲') || arrow.includes('↑') };
      })
      .filter(Boolean);
    const signature = `${status}|${buffEntries.map(({ stat, arrow }) => `${stat}:${arrow}`).join(',')}`;
    if (signature === this._battleStatusSignature) return;
    this._battleStatusSignature = signature;
    this._battleStatus.clearChildren();
    this._battleBuffs.clearChildren();

    if (status) {
      const statusKey = `status_${status}`;
      const label = t(statusKey);
      this._battleStatus.addChild(new UIText({
        tagName: 'span',
        className: `status-badge ${String(status).toLowerCase().replace(/[^a-z0-9_-]/g, '')}`,
        text: label === statusKey ? status : label
      }));
      this._battleStatus.show();
    } else {
      this._battleStatus.hide();
    }

    for (const entry of buffEntries) {
      this._battleBuffs.addChild(new UIText({
        tagName: 'span',
        className: `buff-badge ${entry.stat}-${entry.up ? 'up' : 'down'}`,
        text: `${entry.label} ${entry.arrow}`
      }));
    }
    if (buffEntries.length) this._battleBuffs.show();
    else this._battleBuffs.hide();
  }

  /** @private @param {string|null} itemId @param {string} pokemonName */
  _setHeldItem(itemId, pokemonName) {
    if (!itemId) {
      this._itemBadge.addClass('empty');
      this._itemImage.setSource('');
      this._itemImage.setAlt('');
      this._itemImage.hide();
      this._itemEmpty.show();
      const tooltip = t('held_item_choose_tooltip', { name: pokemonName });
      this._itemBadge.setTooltip(tooltip);
      this._itemBadge.setAriaLabel(tooltip);
      return;
    }
    const item = ItemDB.getInstance().getById(itemId);
    const nameKey = `item.${itemId}.name`;
    const name = t(nameKey);
    this._itemBadge.removeClass('empty');
    this._itemImage.setSource(ItemDB.getInstance().getImagePath(itemId));
    this._itemImage.setAlt(name === nameKey ? itemId : name);
    this._itemImage.show();
    this._itemEmpty.hide();
    const displayName = item ? (name === nameKey ? itemId : name) : itemId;
    const tooltip = t('held_item_tooltip', { name: displayName });
    this._itemBadge.setTooltip(tooltip);
    this._itemBadge.setAriaLabel(tooltip);
  }
}
