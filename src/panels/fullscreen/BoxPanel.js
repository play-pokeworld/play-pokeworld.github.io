/**
 * @file BoxPanel.js
 * @brief PC-storage UI. It shows the whole owned collection (wherever each Pokémon is used) and
 * serves generic selection requests, never knowing the team. A selection request may name a
 * PokemonActionIds value: only Pokémon allowed to perform it (PokemonUsageSystem) are offered.
 */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { PokemonGrid } from '../components/PokemonGrid.js';
import { PokemonGridEntry } from '../components/PokemonGridEntry.js';
import { BoxSelectionFooter } from '../components/BoxSelectionFooter.js';
import { ModalIds } from '../../config/ModalIds.js';
import { REGIONS } from '../../config/Regions.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { BoxSystem } from '../../systems/BoxSystem.js';
import { PokemonUsageSystem } from '../../systems/PokemonUsageSystem.js';
import { BoxFilterRules } from '../../systems/box/BoxFilterRules.js';
import { PokemonRankRules } from '../../systems/box/PokemonRankRules.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { BoxChangedEvent } from '../../core/events/BoxChangedEvent.js';
import { PokemonUsageChangedEvent } from '../../core/events/PokemonUsageChangedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { BoxPokemonSelectedEvent } from '../../core/events/BoxPokemonSelectedEvent.js';
import { BoxPokemonSelectionCancelledEvent } from '../../core/events/BoxPokemonSelectionCancelledEvent.js';
import { BoxPokemonSelectionRemoveRequestedEvent } from '../../core/events/BoxPokemonSelectionRemoveRequestedEvent.js';
import { FilterBar } from '../components/FilterBar.js';
import { ItemUseSystem } from '../../systems/ItemUseSystem.js';
import { ItemUseActions, ItemUseResults } from '../../config/ItemUseRules.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { ItemKinds } from '../../data/items/ItemKinds.js';
import { MoveLearningSystem } from '../../systems/MoveLearningSystem.js';
import { PokemonActionIds } from '../../config/PokemonUsageRules.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import { LocalizationManager, t } from '../../localization/LocalizationManager.js';

const SORTS = Object.freeze([
  ['id', 'sort_dex_number'],
  ['level', 'sort_level'],
  ['iv', 'sort_iv'],
  ['ev', 'sort_ev'],
  ['rank', 'sort_rank'],
  ['name', 'sort_name']
]);
const DEFAULT_SORT_DIRECTION = Object.freeze({ id: 1, name: 1, level: -1, iv: -1, ev: -1, rank: -1 });

/** @param {import('../../data/pokemon/PokemonData.js').PokemonData} pokemon @returns {string} */
function nameOf(pokemon) {
  const species = PokemonDB.getInstance().getById(pokemon.species);
  const speciesName = species && LocalizationManager.getInstance().has(species.getNameKey())
    ? t(species.getNameKey())
    : pokemon.species;
  return `${pokemon.getDisplayName()} ${speciesName}`;
}

export class BoxPanel extends UIFullscreenPanel {
  constructor() {
    super({ id: ModalIds.BOX, title: t('box_panel_title'), name: 'BoxPanel' });
    this._selectionRequestId = null;
    this._selectionAction = null;
    this._selectionAllowedUids = null;
    this._selectionFooter = null;
    this._itemUseId = null;
    this._sort = 'id';
    this._sortDirection = DEFAULT_SORT_DIRECTION.id;
    for (const eventClass of [BoxChangedEvent, PokemonUsageChangedEvent, SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {Object} [params={}] */
  onOpen(params = {}) {
    const nextItemUseId = typeof params?.itemUseId === 'string' && params.itemUseId
      ? params.itemUseId
      : null;
    this._itemUseId = nextItemUseId;
    const nextRequestId = typeof params?.selectionRequestId === 'string' && params.selectionRequestId
      ? params.selectionRequestId
      : null;
    if (this._selectionRequestId && this._selectionRequestId !== nextRequestId) {
      EventBus.getInstance().dispatch(new BoxPokemonSelectionCancelledEvent(this._selectionRequestId));
    }
    this._selectionRequestId = nextRequestId;
    this._selectionAction = nextRequestId && typeof params?.selectionAction === 'string' && params.selectionAction
      ? params.selectionAction
      : null;
    this.toggleClass('pw-box-selector-mode', !!(nextRequestId || nextItemUseId));
    this._selectionAllowedUids = nextRequestId && Array.isArray(params.selectionAllowedUids)
      ? new Set(params.selectionAllowedUids.filter((uid) => typeof uid === 'string')) : null;
    const footer = params?.selectionFooter;
    this._selectionFooter = this._selectionRequestId && footer
      && typeof footer.label === 'string'
      && typeof footer.cancelLabel === 'string'
      ? {
        label: footer.label,
        cancelLabel: footer.cancelLabel,
        removeLabel: typeof footer.removeLabel === 'string' ? footer.removeLabel : '',
        removeDisabled: footer.removeDisabled === true
      }
      : null;
    this._updateTitle();
    this._render();
  }

  /** @override */
  onClose() {
    this.removeClass('pw-box-selector-mode');
    const wasItemUse = !!this._itemUseId;
    this._itemUseId = null;
    const requestId = this._selectionRequestId;
    this._selectionRequestId = null;
    this._selectionAction = null;
    this._selectionAllowedUids = null;
    this._selectionFooter = null;
    this.setTitle(t('box_panel_title'));
    this.setFooter([]);
    if (requestId) EventBus.getInstance().dispatch(new BoxPokemonSelectionCancelledEvent(requestId));
    if (wasItemUse) EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BAG));
  }

  /** @private */
  _updateTitle() {
    if (this._itemUseId) {
      const save = SaveSystem.getInstance().getCurrentSave();
      const qty = save ? save.inventory.count(this._itemUseId) : 0;
      const item = ItemDB.getInstance().getById(this._itemUseId);
      const isTmHm = item && [ItemKinds.TM, ItemKinds.HM].includes(item.kind);
      if (isTmHm && item.move) {
        const tmKind = (this._itemUseId.startsWith('cs') || item.kind === ItemKinds.HM) ? 'CS' : 'CT';
        const moveName = LocalizationManager.getInstance().has(`move.${item.move}`)
          ? t(`move.${item.move}`)
          : item.move;
        this.setTitle(`${t('teaching_move')} ${moveName} (${tmKind}) · ×${qty}`);
      } else {
        const itemName = LocalizationManager.getInstance().has(`item.${this._itemUseId}.name`)
          ? t(`item.${this._itemUseId}.name`)
          : this._itemUseId;
        this.setTitle(`${t('selector_title_item_use')} · ${itemName} ×${qty}`);
      }
    } else if (this._selectionRequestId) {
      this.setTitle(t('box_select_pokemon_title'));
    } else {
      this.setTitle(t('box_panel_title'));
    }
  }

  /** @private */
  _selectionFooterView() {
    if (this._itemUseId) {
      const save = SaveSystem.getInstance().getCurrentSave();
      const qty = save ? save.inventory.count(this._itemUseId) : 0;
      const item = ItemDB.getInstance().getById(this._itemUseId);
      const isTmHm = item && [ItemKinds.TM, ItemKinds.HM].includes(item.kind);
      let label = '';
      if (isTmHm && item.move) {
        const moveName = LocalizationManager.getInstance().has(`move.${item.move}`)
          ? t(`move.${item.move}`)
          : item.move;
        label = t('box_item_use_instruction_move', { move: moveName, qty });
      } else {
        const itemName = LocalizationManager.getInstance().has(`item.${this._itemUseId}.name`)
          ? t(`item.${this._itemUseId}.name`)
          : this._itemUseId;
        label = t('box_item_use_instruction', { item: itemName, qty });
      }
      return new BoxSelectionFooter({
        label,
        cancelLabel: t('back_bag'),
        onCancel: () => this.close()
      });
    }
    if (!this._selectionFooter || !this._selectionRequestId) return null;
    return new BoxSelectionFooter({
      ...this._selectionFooter,
      onCancel: () => this.close(),
      onRemove: () => {
        const requestId = this._selectionRequestId;
        if (!requestId) return;
        EventBus.getInstance().dispatch(new BoxPokemonSelectionRemoveRequestedEvent(requestId));
        this.close();
      }
    });
  }

  /** @private */
  _render() {
    this.setFooter((this._selectionFooter || this._itemUseId) ? [this._selectionFooterView()] : []);
    const focusKey = this._captureFocusKey();
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) {
      this.setFilters([]);
      this.setContent([new UIText({ className: 'pw-empty-state-md', text: t('box_no_save') })]);
      return;
    }
    const box = this._entries();
    this.setFilters([this._filterBar(save, box)]);
    this._renderContent(save, box);
    this._restoreFocusKey(focusKey);
  }

  /**
   * Collection Pokémon shown by the panel: all of them, or in selection mode only those allowed to
   * perform the requested action.
   * @private @returns {ReadonlyArray<Object>}
   */
  _entries() {
    const all = BoxSystem.getInstance().getAll();
    if (this._itemUseId) {
      const usage = PokemonUsageSystem.getInstance();
      const item = ItemDB.getInstance().getById(this._itemUseId);
      const isTmHm = item && [ItemKinds.TM, ItemKinds.HM].includes(item.kind);
      const moveLearning = MoveLearningSystem.getInstance();
      return all.filter((pokemon) => {
        if (!usage.canPerform(pokemon.uid, PokemonActionIds.USE_ITEM)) return false;
        if (isTmHm) {
          return moveLearning.canUnlockWithItem(this._itemUseId, pokemon);
        }
        return true;
      });
    }
    const action = this._selectionRequestId ? this._selectionAction : null;
    const allowed = this._selectionRequestId ? this._selectionAllowedUids : null;
    if (!action && !allowed) return all;
    const usage = PokemonUsageSystem.getInstance();
    return all.filter((pokemon) => (!allowed || allowed.has(pokemon.uid)) && (!action || usage.canPerform(pokemon.uid, action)));
  }

  /** @private @returns {string|null} */
  _captureFocusKey() {
    return this.getFocusedDataKey();
  }

  /** @private @param {string|null} key */
  _restoreFocusKey(key) {
    if (key) this.focusDescendantByDataKey(key);
  }

  /** @private @param {Object} save @param {Array<Object>} box */
  _filterBar(save, box) {
    const filters = save.boxFilters;
    const regionIds = [...new Set(box.map((pokemon) => pokemon.getSpecies()?.region).filter(Boolean))];
    const typeIds = [...new Set(box.flatMap((pokemon) => pokemon.getTypes()))].sort();
    const select = (key, options) => ({
      label: t(`box_filter_${key === 'evo' ? 'evolution' : key}`),
      options,
      value: filters.get(key),
      focusKey: `box-filter-${key}`,
      onChange: (value) => this._setFilter(key, value)
    });
    return new FilterBar({
      className: 'pw-box-filterbar',
      mobileDrawer: true,
      chips: [
        ...SORTS.map(([id, labelKey], index) => ({
          text: t(labelKey),
          active: this._sort === id,
          focusKey: `box-sort-${id}`,
          className: `usm-sort-btn usm-sort-chip${index === SORTS.length - 1 ? ' usm-sort-chip-last' : ''}`,
          data: { sort: id, ...(this._sort === id ? { dir: this._sortDirection < 0 ? '▼' : '▲' } : {}) },
          onClick: () => this._setSort(id)
        })),
        { text: t('box_filter_all_shiny'), focusKey: 'box-chip-shiny-all', active: filters.get('shiny') === 'all', onClick: () => this._setFilter('shiny', 'all') },
        { text: t('box_filter_shiny_only'), focusKey: 'box-chip-shiny-only', active: filters.get('shiny') === 'shiny', onClick: () => this._setFilter('shiny', 'shiny') },
        { text: t('box_filter_non_shiny_only'), focusKey: 'box-chip-shiny-normal', active: filters.get('shiny') === 'normal', onClick: () => this._setFilter('shiny', 'normal') },
        { text: t('box_filter_favorite_only'), focusKey: 'box-chip-favorite', active: filters.get('favorite') === 'favorite', onClick: () => this._setFilter('favorite', filters.get('favorite') === 'favorite' ? 'all' : 'favorite') },
        { text: t('box_filter_locked_only'), focusKey: 'box-chip-locked', active: filters.get('locked') === 'locked', onClick: () => this._setFilter('locked', filters.get('locked') === 'locked' ? 'all' : 'locked') },
        { text: t('box_filter_forms_only'), focusKey: 'box-chip-forms', active: filters.get('forms') === 'forms', onClick: () => this._setFilter('forms', filters.get('forms') === 'forms' ? 'all' : 'forms') }
      ],
      fields: [
        select('region', [
          { value: 'all', label: t('box_filter_all_regions') },
          ...regionIds.map((id) => ({ value: id, label: t(REGIONS.find((region) => region.id === id)?.labelKey || id) }))
        ]),
        select('type', [
          { value: 'all', label: t('box_filter_all_types') },
          ...typeIds.map((id) => ({ value: id, label: t(`type.${id}`) }))
        ]),
        select('evo', [
          { value: 'all', label: t('box_filter_all_evo') },
          { value: 'missing', label: t('box_filter_evo_missing') }
        ]),
        select('iv', [
          { value: 'all', label: t('box_filter_all_iv') },
          { value: 'complete', label: t('box_filter_iv_complete') },
          { value: 'incomplete', label: t('box_filter_iv_incomplete') }
        ]),
        select('ev', [
          { value: 'all', label: t('box_filter_all_ev') },
          { value: 'complete', label: t('box_filter_ev_complete') },
          { value: 'incomplete', label: t('box_filter_ev_incomplete') }
        ]),
        select('rank', ['all', 'E', 'D', 'C', 'B', 'A', 'S'].map((rank) => ({
          value: rank,
          label: rank === 'all' ? t('box_filter_all_ranks') : rank
        })))
      ],
      search: {
        value: filters.get('search'),
        placeholder: t('box_filter_search_placeholder'),
        focusKey: 'box-search',
        onInput: (value) => this._setSearch(value)
      },
      reset: { text: t('box_filter_reset'), focusKey: 'box-reset', onClick: () => this._resetFilters() }
    });
  }

  /** @private @param {string} key @param {string} value */
  _setFilter(key, value) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !save.boxFilters.set(key, value)) return;
    SaveSystem.getInstance().saveCurrent();
    this._render();
  }

  /** @private @param {string} value */
  _setSearch(value) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !save.boxFilters.set('search', value)) return;
    this._renderContent(save, this._entries());
  }

  /** @private */
  _resetFilters() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    if (save.boxFilters.reset()) SaveSystem.getInstance().saveCurrent();
    this._render();
  }

  /** @private @param {Object} save @param {Array<Object>} box */
  _renderContent(save, box) {
    const visible = BoxFilterRules.filter(box, save.boxFilters, save, { nameOf });
    const sorted = this._sortEntries(visible);
    const content = new UIContainer({
      className: `pw-box-panel${this._selectionRequestId ? ' pw-box-panel--selection' : ''}`
    });
    if (this._itemUseId) {
      const qty = save ? save.inventory.count(this._itemUseId) : 0;
      const item = ItemDB.getInstance().getById(this._itemUseId);
      const isTmHm = item && [ItemKinds.TM, ItemKinds.HM].includes(item.kind);
      let instructionText = '';
      if (isTmHm && item.move) {
        const moveName = LocalizationManager.getInstance().has(`move.${item.move}`)
          ? t(`move.${item.move}`)
          : item.move;
        instructionText = t('box_item_use_instruction_move', { move: moveName, qty });
      } else {
        const itemName = LocalizationManager.getInstance().has(`item.${this._itemUseId}.name`)
          ? t(`item.${this._itemUseId}.name`)
          : this._itemUseId;
        instructionText = t('box_item_use_instruction', { item: itemName, qty });
      }
      content.addChild(new UIText({
        className: 'pw-box-instruction',
        text: instructionText
      }));
    } else if (this._selectionRequestId) {
      content.addChild(new UIText({
        className: 'pw-box-instruction',
        text: t('box_select_pokemon_instruction')
      }));
    }
    const stored = this._renderBox(sorted, box.length);
    const storedTitle = new UIContainer({
      className: 'pw-box-storage-heading',
      children: [
        new UIText({ tagName: 'h2', className: 'pw-box-section-title', text: t('box_storage_section') }),
        new UIText({ className: 'pw-box-stored-count', text: t('box_stored_count', { count: sorted.length }) })
      ]
    });
    content.addChild(new UIContainer({
      className: 'pw-box-section',
      children: [storedTitle, stored]
    }));
    this.setContent([content], { preserveScroll: true });
  }

  /** @private @param {string} sort */
  _setSort(sort) {
    const focusKey = this._captureFocusKey();
    if (this._sort === sort) this._sortDirection *= -1;
    else {
      this._sort = sort;
      this._sortDirection = DEFAULT_SORT_DIRECTION[sort] || 1;
    }
    if (SaveSystem.getInstance().getCurrentSave()) {
      this._render();
      this._restoreFocusKey(focusKey);
    }
  }

  /** @private @param {ReadonlyArray<Object>} entries @returns {Object[]} */
  _sortEntries(entries) {
    const result = [...entries];
    const dexOf = (pokemon) => PokemonDB.getInstance().getById(pokemon.species)?.dex ?? 0;
    const valueOf = (pokemon) => {
      if (this._sort === 'level') return pokemon.level;
      if (this._sort === 'iv') return BoxFilterRules.ivTotal(pokemon);
      if (this._sort === 'ev') return BoxFilterRules.evTotal(pokemon);
      if (this._sort === 'rank') return PokemonRankRules.rankValue(PokemonRankRules.getRank(pokemon));
      if (this._sort === 'name') return nameOf(pokemon).toLocaleLowerCase();
      return dexOf(pokemon);
    };
    result.sort((a, b) => {
      const left = valueOf(a);
      const right = valueOf(b);
      const primary = typeof left === 'string' ? left.localeCompare(right) : left - right;
      return this._sortDirection * primary || dexOf(a) - dexOf(b) || String(a.uid).localeCompare(String(b.uid));
    });
    return result;
  }

  /** @private @param {Array<Object>} box @param {number} total */
  _renderBox(box, total) {
    const list = new PokemonGrid({
      className: 'pw-box-roster pw-box-roster--storage box-grid',
      ariaLabel: t('box_storage_section')
    });
    if (total === 0) {
      const emptyKey = this._itemUseId
        ? 'no_pokemon_found'
        : (this._selectionRequestId && this._selectionAction ? 'box_selection_empty' : 'box_storage_empty');
      list.addChild(new UIText({ className: 'pw-empty-state-md', text: t(emptyKey) }));
      return list;
    }
    if (box.length === 0) {
      list.addChild(new UIText({ className: 'pw-empty-state-md', text: t('no_pokemon_found') }));
      return list;
    }
    for (const pokemon of box) list.addChild(this._pokemonEntry(pokemon));
    return list;
  }

  /** @private @param {Object} pokemon @returns {UIContainer} */
  _pokemonEntry(pokemon) {
    const name = pokemon.getDisplayName();
    const detailsLabel = t('box_open_details', { name });
    const selectionRequestId = this._selectionRequestId;
    const itemUseId = this._itemUseId;
    const cardTitle = itemUseId
      ? t('box_item_use_pokemon_aria', { name })
      : (selectionRequestId ? t('box_select_pokemon_aria', { name }) : detailsLabel);
    const tile = new PokemonGridEntry({
      species: pokemon.species,
      form: pokemon.form,
      shiny: pokemon.shiny,
      alt: name,
      marker: t('level_short_value', { level: pokemon.level }),
      markerClassName: 'box-level pw-box-level',
      shinyClassName: 'box-shiny',
      className: 'dex-entry pw-box-pokemon-tile',
      title: cardTitle,
      ariaLabel: cardTitle,
      focusKey: `box-${pokemon.uid}-${itemUseId ? 'use' : (selectionRequestId ? 'select' : 'info')}`,
      formBadge: pokemon.form ? t('box_form_badge') : '',
      onClick: () => {
        if (itemUseId) {
          this._handleItemUse(pokemon.uid);
          return;
        }
        if (selectionRequestId) {
          EventBus.getInstance().dispatch(new BoxPokemonSelectedEvent(selectionRequestId, pokemon.uid));
          this.close();
          return;
        }
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.POKEMON_INFO, {
          pokemonUid: pokemon.uid
        }));
      }
    });
    tile.setData('pokemonUid', pokemon.uid);
    tile.setData('speciesId', PokemonDB.getInstance().getById(pokemon.species)?.id || pokemon.species);

    const entry = new UIContainer({ className: 'pw-box-grid-entry', children: [tile] });
    entry.setData('pokemonUid', pokemon.uid);
    entry.setData('speciesId', PokemonDB.getInstance().getById(pokemon.species)?.id || pokemon.species);
    entry.addChild(new UIText({
      tagName: 'div',
      className: 'pw-bold pw-text-sm box-name pw-box-pokemon-name',
      text: name
    }));

    const metadata = new UIContainer({ className: 'pw-box-grid-meta' });
    const heldItemKey = pokemon.heldItem ? `item.${pokemon.heldItem}.name` : '';
    if (heldItemKey) {
      const heldItemName = LocalizationManager.getInstance().has(heldItemKey) ? t(heldItemKey) : pokemon.heldItem;
      metadata.addChild(new UIText({
        tagName: 'span',
        className: 'pw-box-pokemon-held-item',
        text: heldItemName
      }));
    }
    const tags = [];
    if (pokemon.favorite) tags.push({ className: 'pw-box-tag pw-box-tag--favorite', text: t('box_filter_favorite_only') });
    if (pokemon.locked) tags.push({ className: 'pw-box-tag pw-box-tag--locked', text: t('box_filter_locked_only') });
    if (tags.length) {
      metadata.addChild(new UIContainer({
        className: 'pw-box-pokemon-tags',
        children: tags.map((tag) => new UIText({ tagName: 'span', className: tag.className, text: tag.text }))
      }));
    }
    if (metadata.getChildren().length) entry.addChild(metadata);
    return entry;
  }

  /** @private @param {string} uid */
  _handleItemUse(uid) {
    if (!this._itemUseId) return;
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    const itemId = this._itemUseId;
    const itemUseSystem = ItemUseSystem.getInstance();
    const action = itemUseSystem.getUseAction(itemId);
    const result = itemUseSystem.useOnPokemon(itemId, uid);

    if (result.result === ItemUseResults.SUCCESS) {
      const remaining = save.inventory.count(itemId);
      if (remaining > 0) {
        this._updateTitle();
        this._render();
      } else {
        this.close();
      }
    } else if (result.result === ItemUseResults.TARGET_INELIGIBLE) {
      const pokemon = BoxSystem.getInstance().getPokemonByUid(uid);
      const name = pokemon ? pokemon.getDisplayName() : '';
      let msg = t('item_use_target_invalid');
      if (action === ItemUseActions.RARE_CANDY) {
        msg = t('item_use_max_level', { name });
      } else if (action === ItemUseActions.VITAMIN) {
        msg = t('item_use_max_evs', { name });
      }
      NotificationSystem.getInstance().notifyTemporary(msg, {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.WARNING
      });
    } else if (result.result === ItemUseResults.BATTLE_ACTIVE) {
      NotificationSystem.getInstance().notifyTemporary(t('item_use_battle_locked'), {
        channel: NotificationChannels.GAMEPLAY,
        tone: NotificationTones.WARNING
      });
    }
  }
}
