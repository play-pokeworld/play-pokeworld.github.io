/**
 * @file SaveIconPickerModal.js
 * @brief Chooses the owned Pokémon displayed on a save card (main-game behaviour).
 *
 * Every OWNED Pokémon is eligible — the active team and the PC box, since both are views of the same
 * `save.collection` — exactly like the original game's save-icon selector. Never an NPC portrait: a
 * save card shows a Pokémon the player actually owns.
 *
 * The choice is returned to the caller through the `onSelect(uid)` callback carried by the open
 * request, so the modal itself never writes to the save (the profile section keeps its draft/Apply
 * contract).
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UITextInput } from '../ui/UITextInput.js';
import { PokemonGrid } from './components/PokemonGrid.js';
import { PokemonGridEntry } from './components/PokemonGridEntry.js';
import { ModalIds } from '../config/ModalIds.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { t } from '../localization/LocalizationManager.js';

export class SaveIconPickerModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.SAVE_ICON_PICKER,
      title: t('save_icon_picker_title'),
      size: 'lg',
      className: 'pw-save-icon-picker',
      bodyClassName: 'pw-save-icon-picker-body',
      name: 'SaveIconPickerModal'
    });
    /** @private @type {Function|null} */
    this._onSelect = null;
    /** @private @type {string} */
    this._selectedUid = '';
    /** @private @type {string} */
    this._query = '';
    /** @private @type {UIContainer|null} */
    this._gridHost = null;
    /** @private @type {UIText|null} */
    this._countLabel = null;
  }

  /** @override @param {{selectedUid?:string, onSelect?:Function}} [params={}] */
  onEnter({ selectedUid, onSelect } = {}) {
    super.onEnter();
    this._onSelect = typeof onSelect === 'function' ? onSelect : null;
    this._selectedUid = typeof selectedUid === 'string' ? selectedUid : '';
    this._query = '';
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._onSelect = null;
    this._selectedUid = '';
    this._query = '';
    this._gridHost = null;
    this._countLabel = null;
  }

  /**
   * Every owned Pokémon, team first in party order then the rest by dex number (then level, best
   * first) — the same "all owned Pokémon are eligible" rule as the original save-icon selector.
   * @private
   * @returns {Array<Object>}
   */
  _ownedPokemon() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || typeof save.collection?.getAll !== 'function') return [];
    const owned = [...save.collection.getAll()];
    const teamUids = Array.isArray(save.team) ? save.team.map((entry) => entry?.uid).filter(Boolean) : [];
    const dexOf = (pokemon) => PokemonDB.getInstance().getById(pokemon.species)?.dex ?? 0;
    owned.sort((a, b) => dexOf(a) - dexOf(b) || (b.level || 0) - (a.level || 0) || String(a.uid).localeCompare(String(b.uid)));
    const teamOrdered = teamUids
      .map((uid) => owned.find((pokemon) => pokemon.uid === uid))
      .filter(Boolean);
    const rest = owned.filter((pokemon) => !teamUids.includes(pokemon.uid));
    return [...teamOrdered, ...rest];
  }

  /** @private */
  _render() {
    this.clearChildren();
    this._gridHost = null;
    this._countLabel = null;
    if (this._ownedPokemon().length === 0) {
      this.addChild(new UIContainer({
        className: 'pw-save-icon-picker-empty',
        children: [new UIText({ className: 'pw-empty-state', text: t('save_icon_no_box') })]
      }));
      return;
    }

    // The search field is built once: rebuilding it on each keystroke would drop the caret.
    this._countLabel = new UIText({ className: 'pw-text-sm pw-light1', text: '' });
    this.addChild(new UIContainer({
      className: 'pw-save-icon-picker-toolbar',
      children: [
        new UITextInput({
          id: 'save-icon-picker-search',
          value: this._query,
          placeholder: t('save_icon_search_placeholder'),
          onInput: (value) => {
            this._query = value || '';
            this._renderGrid();
          }
        }),
        this._countLabel
      ]
    }));

    this._gridHost = new UIContainer({ className: 'pw-save-icon-picker-list' });
    this.addChild(this._gridHost);
    this._renderGrid();
  }

  /** Rebuilds the grid only (search typing keeps the field focused). @private */
  _renderGrid() {
    if (!this._gridHost) return;
    this._gridHost.clearChildren();
    const query = this._query.trim().toLocaleLowerCase();
    const all = this._ownedPokemon();
    const matches = query
      ? all.filter((entry) => {
        const name = typeof entry.getDisplayName === 'function' ? entry.getDisplayName() : entry.species;
        return String(name).toLocaleLowerCase().includes(query) || String(entry.species).toLocaleLowerCase().includes(query);
      })
      : all;
    if (this._countLabel) this._countLabel.setText(t('save_icon_picker_count', { count: matches.length }));

    if (matches.length === 0) {
      this._gridHost.addChild(new UIText({ className: 'pw-empty-state', text: t('no_pokemon_found') }));
      return;
    }

    const current = this._selectedUid || (SaveSystem.getInstance().getCurrentSave()?.player?.avatarPokemonUid ?? '');
    const grid = new PokemonGrid({
      className: 'pw-save-icon-picker-grid',
      ariaLabel: t('save_icon_picker_title')
    });
    for (const entry of matches) {
      const name = typeof entry.getDisplayName === 'function' ? entry.getDisplayName() : entry.species;
      const label = t('save_icon_pick_pokemon_aria', { name });
      grid.addChild(new PokemonGridEntry({
        species: entry.species,
        form: entry.form,
        shiny: entry.shiny === true,
        alt: name,
        marker: t('level_short_value', { level: entry.level }),
        markerClassName: 'dex-number pw-save-icon-level',
        className: 'dex-entry pw-save-icon-tile',
        title: label,
        ariaLabel: label,
        ariaPressed: entry.uid === current,
        focusKey: `save-icon-${entry.uid}`,
        onClick: () => {
          if (this._onSelect) this._onSelect(entry.uid);
          this.close();
        }
      }));
    }
    this._gridHost.addChild(grid);
  }
}
