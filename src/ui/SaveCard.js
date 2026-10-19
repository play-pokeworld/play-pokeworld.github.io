/**
 * @file SaveCard.js
 * @brief Composite widget representing a single save slot card (C++: class SaveCard : public UIElement).
 * Used in both SaveMenuPage carousel (menu mode) and SettingsModal profile preview (preview mode).
 * Built exclusively from UI widgets (UIContainer, UIText, UIImage); styling comes from the
 * canonical `.save-slot*` classes of the design system.
 */

import { UIElement } from './UIElement.js';
import { UIContainer } from './UIContainer.js';
import { UIText } from './UIText.js';
import { UIImage } from './UIImage.js';
import { UIPokemonSprite, PokemonSpriteSizes } from './UIPokemonSprite.js';
import { SaveThemes, SAVE_THEMES } from '../data/save/SaveThemes.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { t } from '../localization/LocalizationManager.js';

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

export class SaveCard extends UIElement {
  /**
   * @param {Object} options
   * @param {Object} options.save - SaveData instance (or a plain object with the same shape)
   * @param {'menu'|'preview'} [options.mode='menu']
   * @param {Function} [options.onClick=null]        - (save, event) => void
   * @param {Function} [options.onContextMenu=null]  - (save, event) => void
   * @param {string} [options.className='']
   */
  constructor(options = {}) {
    const mode = options.mode === 'preview' ? 'preview' : 'menu';
    const save = options.save || {};

    super({
      tagName: mode === 'menu' ? 'button' : 'div',
      className: ['save-slot', mode === 'preview' ? 'save-slot-preview' : '', options.className || '']
        .filter(Boolean).join(' '),
      id: save.id ? `save-card-${save.id}` : '',
      name: 'SaveCard',
      tag: 'Card'
    });

    if (mode === 'menu') {
      this.setAttribute('type', 'button');
    }

    this._save = save;
    this._mode = mode;
    this._onClick = options.onClick || null;
    this._onContextMenu = options.onContextMenu || null;

    this._applyTheme();
    this._renderCard();
    this._bindEvents();
  }

  /**
   * Card avatar. Like the original game, the lead Pokémon of the team is shown
   * on the canonical disc; a trainer portrait chosen in the settings takes precedence.
   * @private
   * @returns {UIElement}
   */
  _buildAvatar(save, player, trainerName) {
    const leadSpecies = Array.isArray(save.team) && save.team.length > 0 ? save.team[0].species : '';
    const customPortrait = player.trainerSprite && player.trainerSprite !== PlayerDefaults.TRAINER_SPRITE;
    if (customPortrait || !leadSpecies) {
      const circle = new UIContainer({ tagName: 'span', className: 'pw-poke-circle-wrap pw-poke-circle-wrap--large' });
      circle.addChild(new UIContainer({ tagName: 'span', className: 'pw-poke-circle-bg' }));
      circle.addChild(new UIImage({
        src: AssetPaths.trainerSprite(player.trainerSprite),
        fallbackSrc: AssetPaths.defaultTrainerSprite(),
        alt: trainerName,
        className: 'pw-poke-circle-img sprite-img',
        pixelated: true
      }));
      return circle;
    }
    return new UIPokemonSprite({ species: leadSpecies, alt: trainerName, size: PokemonSpriteSizes.LARGE });
  }

  /**
   * Formats a play time expressed in seconds (localized pattern).
   * @param {number} seconds
   * @returns {string}
   */
  static formatPlayTime(seconds) {
    const totalMinutes = Math.floor((Number(seconds) || 0) / SECONDS_PER_MINUTE);
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    return hours > 0
      ? t('save_playtime_hours', { h: hours, m: minutes })
      : t('save_playtime_minutes', { m: minutes });
  }

  /** @private */
  _applyTheme() {
    for (const theme of SAVE_THEMES) {
      this.removeClass(`save-bg-${theme}`);
    }
    this.addClass(`save-bg-${SaveThemes.normalize(this._save.background)}`);
  }

  /**
   * Builds the card content from UI widgets.
   * @private
   */
  _renderCard() {
    this.clearChildren();

    const save = this._save;
    const player = save.player || {};
    const trainerName = player.trainerName || t('default_trainer_name');
    const badgesCount = Array.isArray(player.badges) ? player.badges.length : (Number(player.badges) || 0);
    const caughtCount = save.pokedex ? save.pokedex.getCaughtCount() : 0;

    // 1. Header row: trainer avatar + name / id
    const mainRow = new UIContainer({ tagName: 'span', className: 'save-slot-main' });

    const iconBox = new UIContainer({ tagName: 'span', className: 'save-slot-icon' });
    iconBox.addChild(this._buildAvatar(save, player, trainerName));
    mainRow.addChild(iconBox);

    const titleBox = new UIContainer({ tagName: 'span', className: 'save-slot-title' });
    titleBox.addChild(new UIText({ text: trainerName, className: 'save-slot-name' }));
    titleBox.addChild(new UIText({ text: t('save_card_id', { id: save.id || '' }), className: 'save-slot-id' }));
    mainRow.addChild(titleBox);
    this.addChild(mainRow);

    // 2. Stats row
    const statsRow = new UIContainer({ tagName: 'span', className: 'save-slot-stats' });
    statsRow.addChild(this._createStat(badgesCount, t('save_badges_label')));
    statsRow.addChild(this._createStat(caughtCount, t('save_pokedex_label')));
    statsRow.addChild(this._createStat(SaveCard.formatPlayTime(player.playTimeSeconds), t('save_playtime_label')));
    this.addChild(statsRow);

    // 3. Click hint (menu mode only)
    if (this._mode === 'menu') {
      const bottom = new UIContainer({ tagName: 'span', className: 'save-slot-bottom' });
      bottom.addChild(new UIText({ text: t('save_click_to_continue') }));
      this.addChild(bottom);
    }
  }

  /**
   * @private
   * @param {string|number} value
   * @param {string} label
   * @returns {UIContainer}
   */
  _createStat(value, label) {
    const stat = new UIContainer({ tagName: 'span', className: 'save-slot-stat' });
    stat.addChild(new UIText({ tagName: 'b', text: value }));
    stat.addChild(new UIText({ tagName: 'small', text: label }));
    return stat;
  }

  /**
   * Binds click and contextmenu listeners
   * @private
   */
  _bindEvents() {
    if (this._mode !== 'menu') return;

    this.addDomListener('click', (e) => {
      if (this._onClick) this._onClick(this._save, e);
    });

    this.addDomListener('contextmenu', (e) => {
      e.preventDefault();
      if (this._onContextMenu) this._onContextMenu(this._save, e);
    });
  }

  /**
   * Updates save model and re-renders
   * @param {Object} updatedSave
   */
  updateSave(updatedSave) {
    this._save = updatedSave;
    this._applyTheme();
    this._renderCard();
  }

  /** @returns {Object} */
  getSave() {
    return this._save;
  }
}
