/**
 * @file SaveCard.js
 * @brief Composite widget representing a single save slot card (C++: class SaveCard : public UIElement).
 * Used in both SaveMenuPage carousel (menu mode) and SettingsModal profile preview (preview mode).
 * Built exclusively from UI widgets (UIContainer, UIText, UIPokemonSprite); styling comes from the
 * canonical `.save-slot*` classes of the design system.
 *
 * The portrait is an OWNED POKÉMON (the main game behaviour, chosen in Settings → profile), not an
 * NPC/trainer image: see `resolveAvatarPokemon()`.
 */

import { UIElement } from './UIElement.js';
import { UIContainer } from './UIContainer.js';
import { UIText } from './UIText.js';
import { UIPokemonSprite, PokemonSpriteSizes } from './UIPokemonSprite.js';
import { SaveThemes, SAVE_THEMES } from '../data/save/SaveThemes.js';
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
   * The Pokémon displayed on a save card: an owned Pokémon chosen by the player (the main game
   * behaviour), never an NPC portrait.
   *
   * Resolution order, kept pure so that the card, the settings preview and the tests agree:
   *   1. `player.avatarPokemonUid` when that uid is still owned,
   *   2. the lead team member (the historical default, and what a migrated save inherits),
   *   3. the first owned Pokémon of the collection,
   *   4. `null` — the card then shows the explicit placeholder, never an empty disc.
   *
   * @param {Object} save - SaveData instance or a plain object with the same shape
   * @returns {Object|null} the Pokémon data to draw
   */
  static resolveAvatarPokemon(save) {
    const source = save || {};
    const collection = source.collection;
    const byUid = (uid) => (collection && typeof collection.get === 'function' ? collection.get(uid) : null);
    const asPokemon = (entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') return byUid(entry);
      if (entry.species) return entry;
      return entry.uid ? byUid(entry.uid) : null;
    };

    const chosen = asPokemon(source.player?.avatarPokemonUid);
    if (chosen) return chosen;
    for (const member of Array.isArray(source.team) ? source.team : []) {
      const pokemon = asPokemon(member);
      if (pokemon) return pokemon;
    }
    const all = collection && typeof collection.getAll === 'function' ? collection.getAll() : [];
    return asPokemon(all[0]);
  }

  /**
   * Card avatar: the Pokémon of `resolveAvatarPokemon()` on the canonical disc.
   * @private
   * @param {Object} avatar - Pokémon data returned by resolveAvatarPokemon()
   * @param {string} trainerName - Alt text fallback when the species has no localized name
   * @returns {UIElement}
   */
  _buildAvatar(avatar, trainerName) {
    if (!avatar) {
      // Explicit placeholder (the original game shows a "?" icon instead of an empty slot).
      const missing = new UIContainer({ tagName: 'span', className: 'pw-poke-circle-wrap pw-poke-circle-wrap--large save-slot-icon-missing save-card-avatar' });
      missing.addChild(new UIContainer({ tagName: 'span', className: 'pw-poke-circle-bg' }));
      missing.addChild(new UIText({ tagName: 'span', className: 'pw-poke-circle-img save-slot-icon-missing-mark', text: '?' }));
      return missing;
    }
    const name = typeof avatar.getDisplayName === 'function'
      ? avatar.getDisplayName()
      : t(`pokemon.${avatar.species}`);
    return new UIPokemonSprite({
      species: avatar.species,
      form: avatar.form || '',
      shiny: avatar.shiny === true,
      alt: name || trainerName,
      size: PokemonSpriteSizes.LARGE,
      // The card shows the Pokémon itself: no dark disc, the art fills the frame (user request).
      className: 'save-card-avatar'
    });
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
    iconBox.addChild(this._buildAvatar(SaveCard.resolveAvatarPokemon(save), trainerName));
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

    // A touch screen has no right button: press and hold opens the same save-card menu.
    // Without this the menu was unreachable on a phone (the card only answered `contextmenu`,
    // which mobile browsers do not fire on a plain element).
    if (this._onContextMenu) {
      this.addLongPress((event) => {
        const rect = this._dom.getBoundingClientRect();
        const x = Number.isFinite(event.clientX) && event.clientX > 0 ? event.clientX : rect.left + rect.width / 2;
        const y = Number.isFinite(event.clientY) && event.clientY > 0 ? event.clientY : rect.top + rect.height / 2;
        this._onContextMenu(this._save, { clientX: x, clientY: y, preventDefault() {} });
      });
    }
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
