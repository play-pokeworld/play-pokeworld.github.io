/**
 * @file PokedexPanel.js
 * @brief Regional Pokédex grid, collection filters, and seen-species details.
 * Presentation follows the reference Pokédex while keeping all state view-only.
 */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { PokemonGrid } from '../components/PokemonGrid.js';
import { PokemonGridEntry } from '../components/PokemonGridEntry.js';
import { ModalIds } from '../../config/ModalIds.js';
import { REGIONS } from '../../config/Regions.js';
import {
  DEFAULT_POKEDEX_FILTERS,
  DEFAULT_POKEDEX_REGION,
  POKEDEX_RANKS,
  PokedexFilterKeys,
  PokedexFilterValues,
  PokedexSorts
} from '../../config/PokedexRules.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { CaughtStatus } from '../../data/save/PokedexData.js';
import { LocationDB } from '../../data/world/LocationDB.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { FeatureAccessSystem } from '../../systems/FeatureAccessSystem.js';
import { PokemonRankRules } from '../../systems/box/PokemonRankRules.js';
import { FilterBar } from '../components/FilterBar.js';
import { PokedexChangedEvent } from '../../core/events/PokedexChangedEvent.js';
import { PokedexEntryOpenedEvent } from '../../core/events/PokedexEntryOpenedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { ContentAccessChangedEvent } from '../../core/events/ContentAccessChangedEvent.js';
import { LanguageChangedEvent } from '../../core/events/LanguageChangedEvent.js';
import { EventBus } from '../../core/EventBus.js';
import { t } from '../../localization/LocalizationManager.js';

export class PokedexPanel extends UIFullscreenPanel {
  constructor() {
    super({ id: ModalIds.POKEDEX, title: t('panel_pokedex_title'), name: 'PokedexPanel' });
    this.addClass('pw-pokedex-panel');
    this._filterState = { ...DEFAULT_POKEDEX_FILTERS };
    this._selectedSpecies = null;
    this._visibleRegionIds = [DEFAULT_POKEDEX_REGION];
    this._visibleSpecies = [];

    for (const eventClass of [PokedexChangedEvent, SaveLoadedEvent, ContentAccessChangedEvent, LanguageChangedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {{region?: string}} [params={}] */
  onOpen(params = {}) {
    const visibleRegions = this._getVisibleRegions();
    if (visibleRegions.some((region) => region.id === params.region)) {
      this._filterState[PokedexFilterKeys.REGION] = params.region;
    }
    this._selectedSpecies = null;
    this._render();
  }

  /** @private @returns {ReadonlyArray<Object>} */
  _getVisibleRegions() {
    const unlocked = FeatureAccessSystem.getInstance().getSnapshot().regions || ['kanto'];
    const visible = REGIONS.filter((region) => region.available && unlocked.includes(region.id));
    return visible.length ? visible : REGIONS.filter((region) => region.id === DEFAULT_POKEDEX_REGION);
  }

  /** @private */
  _render() {
    const focusKey = this._captureFocusKey();
    const save = SaveSystem.getInstance().getCurrentSave();
    const dex = save?.pokedex ?? null;
    const visibleRegions = this._getVisibleRegions();
    this._visibleRegionIds = visibleRegions.map((region) => region.id);
    if (this._filterState[PokedexFilterKeys.REGION] !== PokedexFilterValues.ALL &&
        !this._visibleRegionIds.includes(this._filterState[PokedexFilterKeys.REGION])) {
      this._filterState[PokedexFilterKeys.REGION] = PokedexFilterValues.ALL;
    }
    this._visibleSpecies = visibleRegions
      .flatMap((region) => PokemonDB.getInstance().getByRegion(region.id))
      .sort((a, b) => a.dex - b.dex);

    const shown = this._filterSpecies(this._visibleSpecies, dex);
    const selected = shown.find((entry) => entry.id === this._selectedSpecies && dex?.isSeen(entry.id)) || null;
    const seen = this._visibleSpecies.filter((entry) => dex?.isSeen(entry.id)).length;
    const caught = this._visibleSpecies.filter((entry) => dex?.isCaught(entry.id)).length;
    const shiny = this._visibleSpecies.filter((entry) => dex?.getCaughtStatus(entry.id) === CaughtStatus.SHINY).length;

    this.setFilters([
      this._overview(visibleRegions, save, dex, { seen, caught, shiny }),
      this._filterBar(visibleRegions)
    ]);
    this._renderContent(shown, dex, selected, { preserveScroll: true });
    this._restoreFocusKey(focusKey);
  }

  /** @private @returns {string|null} */
  _captureFocusKey() {
    return this.getFocusedDataKey();
  }

  /** @private @param {string|null} key */
  _restoreFocusKey(key) {
    if (key) this.focusDescendantByDataKey(key);
  }

  /** @private @param {ReadonlyArray<Object>} regions @param {Object|null} save @param {Object|null} dex @param {{seen:number,caught:number,shiny:number}} counts */
  _overview(regions, save, dex, counts) {
    const total = this._visibleSpecies.length;
    const regionNames = regions.map((region) => t(`region_${region.id}`)).join(', ');
    const stat = (labelKey, value, suffix = '', extraClass = '') => new UIContainer({
      tagName: 'span',
      className: `pw-pokedex-stat${extraClass ? ` ${extraClass}` : ''}`,
      children: [
        new UIText({ text: t(labelKey) }),
        new UIText({ tagName: 'strong', text: String(value) }),
        ...(suffix ? [new UIText({ text: suffix })] : [])
      ]
    });
    const stats = new UIContainer({
      className: 'pw-pokedex-stats',
      children: [
        stat('pokedex_stat_seen_label', counts.seen),
        stat('pokedex_stat_caught_label', counts.caught, ` / ${total}`),
        stat('pokedex_stat_shiny_label', counts.shiny, ` / ${total}`),
        stat('pokedex_stat_regions_label', regionNames, '', 'pw-pokedex-stat--regions')
      ]
    });

    const progressRows = regions.map((region) => {
      const species = PokemonDB.getInstance().getByRegion(region.id);
      const regionCaught = species.filter((entry) => dex?.isCaught(entry.id)).length;
      const percent = species.length ? Math.round((regionCaught / species.length) * 100) : 0;
      const isComplete = species.length > 0 && regionCaught === species.length;
      return new UIContainer({
        tagName: 'span',
        className: `pw-pokedex-region-progress ${isComplete ? 'is-done' : 'is-todo'}`,
        children: [
          new UIIcon({ name: isComplete ? 'sparkle' : 'circle', size: 'sm', className: 'pw-pokedex-region-progress-icon' }),
          new UIText({
            className: 'pw-pokedex-region-progress-label',
            text: t('pokedex_region_progress', {
              region: t(`region_${region.id}`),
              caught: regionCaught,
              total: species.length,
              percent
            })
          })
        ]
      });
    });
    const hasCharm = !!save?.inventory?.has('shiny_charm');
    return new UIContainer({
      className: 'pw-pokedex-overview',
      children: [
        stats,
        new UIContainer({
          className: 'pw-pokedex-progress',
          children: [
            new UIText({
              tagName: 'strong',
              className: 'pw-pokedex-progress-title',
              text: t(hasCharm ? 'pokedex_charm_owned' : 'pokedex_charm_goal')
            }),
            new UIContainer({ className: 'pw-pokedex-region-progress-list', children: progressRows })
          ]
        })
      ]
    });
  }

  /** @private @param {ReadonlyArray<Object>} regions */
  _filterBar(regions) {
    const typeIds = [...new Set(this._visibleSpecies.flatMap((entry) => entry.types))].sort();
    const all = PokedexFilterValues.ALL;
    const fields = [
      {
        label: t('box_filter_region'),
        options: [
          { value: all, label: t('box_filter_all_regions') },
          ...regions.map((region) => ({ value: region.id, label: t(`region_${region.id}`) }))
        ],
        value: this._filterState[PokedexFilterKeys.REGION],
        focusKey: 'dex-filter-region',
        onChange: (value) => this._setFilter(PokedexFilterKeys.REGION, value)
      },
      {
        label: t('box_filter_type'),
        options: [
          { value: all, label: t('box_filter_all_types') },
          ...typeIds.map((type) => ({ value: type, label: t(`type.${type}`) }))
        ],
        value: this._filterState[PokedexFilterKeys.TYPE],
        focusKey: 'dex-filter-type',
        onChange: (value) => this._setFilter(PokedexFilterKeys.TYPE, value)
      },
      {
        label: t('box_filter_rank'),
        options: [
          { value: all, label: t('box_filter_all_ranks') },
          ...POKEDEX_RANKS.map((rank) => ({ value: rank, label: rank }))
        ],
        value: this._filterState[PokedexFilterKeys.RANK],
        focusKey: 'dex-filter-rank',
        onChange: (value) => this._setFilter(PokedexFilterKeys.RANK, value)
      },
      {
        label: t('sort_label'),
        options: [
          { value: PokedexSorts.DEX_ASC, label: t('dex_sort_number_asc') },
          { value: PokedexSorts.DEX_DESC, label: t('dex_sort_number_desc') },
          { value: PokedexSorts.NAME_ASC, label: t('dex_sort_name_asc') },
          { value: PokedexSorts.NAME_DESC, label: t('dex_sort_name_desc') },
          { value: PokedexSorts.RANK_DESC, label: t('dex_sort_rank_desc') },
          { value: PokedexSorts.RANK_ASC, label: t('dex_sort_rank_asc') }
        ],
        value: this._filterState[PokedexFilterKeys.SORT],
        focusKey: 'dex-filter-sort',
        onChange: (value) => this._setFilter(PokedexFilterKeys.SORT, value)
      }
    ];
    const bar = new FilterBar({
      className: 'pw-pokedex-filterbar',
      mobileDrawer: true,
      mobileDrawerLabels: {
        open: t('pokedex_filters_open'),
        close: t('pokedex_filters_close')
      },
      chips: [
        {
          text: t('box_filter_all_shiny'),
          focusKey: 'dex-chip-shiny-all',
          active: this._filterState[PokedexFilterKeys.SHINY] === PokedexFilterValues.ALL,
          onClick: () => this._setFilter(PokedexFilterKeys.SHINY, PokedexFilterValues.ALL)
        },
        {
          text: t('box_filter_shiny_only'),
          focusKey: 'dex-chip-shiny-only',
          active: this._filterState[PokedexFilterKeys.SHINY] === PokedexFilterValues.SHINY,
          onClick: () => this._setFilter(PokedexFilterKeys.SHINY, PokedexFilterValues.SHINY)
        },
        {
          text: t('box_filter_non_shiny_only'),
          focusKey: 'dex-chip-shiny-normal',
          active: this._filterState[PokedexFilterKeys.SHINY] === PokedexFilterValues.NORMAL,
          onClick: () => this._setFilter(PokedexFilterKeys.SHINY, PokedexFilterValues.NORMAL)
        }
      ],
      fields,
      search: {
        value: this._filterState[PokedexFilterKeys.SEARCH],
        placeholder: t('box_filter_search_placeholder'),
        focusKey: 'dex-search',
        onInput: (value) => this._setSearch(value)
      },
      reset: { text: t('box_filter_reset'), focusKey: 'dex-reset', onClick: () => this._resetFilters() }
    });
    bar.searchInput?.setAttribute('aria-label', t('pokedex_search_label'));
    return bar;
  }

  /** @private @param {ReadonlyArray<Object>} entries @param {Object|null} dex @returns {Object[]} */
  _filterSpecies(entries, dex) {
    const filters = this._filterState;
    const query = String(filters[PokedexFilterKeys.SEARCH] || '').trim().toLocaleLowerCase();
    let visible = entries.filter((entry) => {
      if (filters[PokedexFilterKeys.REGION] !== PokedexFilterValues.ALL &&
          entry.region !== filters[PokedexFilterKeys.REGION]) return false;
      if (filters[PokedexFilterKeys.TYPE] !== PokedexFilterValues.ALL &&
          !entry.types.includes(filters[PokedexFilterKeys.TYPE])) return false;
      if (filters[PokedexFilterKeys.SHINY] === PokedexFilterValues.SHINY &&
          dex?.getCaughtStatus(entry.id) !== CaughtStatus.SHINY) return false;
      if (filters[PokedexFilterKeys.SHINY] === PokedexFilterValues.NORMAL &&
          dex?.getCaughtStatus(entry.id) === CaughtStatus.SHINY) return false;
      if (filters[PokedexFilterKeys.RANK] !== PokedexFilterValues.ALL &&
          PokemonRankRules.getRank(entry.id) !== filters[PokedexFilterKeys.RANK]) return false;
      if (query) {
        const name = t(entry.getNameKey()).toLocaleLowerCase();
        const haystack = `${name} ${entry.id} ${entry.dex}`.toLocaleLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const byDex = (a, b) => a.dex - b.dex;
    const nameOf = (entry) => t(entry.getNameKey());
    switch (filters[PokedexFilterKeys.SORT]) {
      case PokedexSorts.DEX_DESC:
        visible.sort((a, b) => b.dex - a.dex);
        break;
      case PokedexSorts.NAME_ASC:
        visible.sort((a, b) => nameOf(a).localeCompare(nameOf(b)) || byDex(a, b));
        break;
      case PokedexSorts.NAME_DESC:
        visible.sort((a, b) => nameOf(b).localeCompare(nameOf(a)) || byDex(a, b));
        break;
      case PokedexSorts.RANK_DESC:
        visible.sort((a, b) => PokemonRankRules.rankValue(PokemonRankRules.getRank(b.id)) - PokemonRankRules.rankValue(PokemonRankRules.getRank(a.id)) || byDex(a, b));
        break;
      case PokedexSorts.RANK_ASC:
        visible.sort((a, b) => PokemonRankRules.rankValue(PokemonRankRules.getRank(a.id)) - PokemonRankRules.rankValue(PokemonRankRules.getRank(b.id)) || byDex(a, b));
        break;
      default:
        visible.sort(byDex);
    }
    return visible;
  }

  /** @private @param {Object[]} entries @param {Object|null} dex @param {Object|null} selected */
  _renderContent(entries, dex, selected, { preserveScroll = false } = {}) {
    const grid = new PokemonGrid({ className: 'pw-pokedex-grid', ariaLabel: t('panel_pokedex_title') });
    for (const entry of entries) grid.addChild(this._entry(entry, dex));

    const content = [];
    if (selected) content.push(this._detail(selected));
    if (entries.length === 0) {
      content.push(new UIText({ tagName: 'div', className: 'pw-empty-state-md pw-pokedex-empty', text: t('pokedex_no_results') }));
    } else {
      content.push(grid);
    }
    this.setContent(content, { preserveScroll });
  }

  /** @private @param {Readonly<Object>} species @param {Object|null} dex */
  _entry(species, dex) {
    const isSeen = !!dex?.isSeen(species.id);
    const isCaught = !!dex?.isCaught(species.id);
    const isShiny = dex?.getCaughtStatus(species.id) === CaughtStatus.SHINY;
    const name = isSeen ? t(species.getNameKey()) : t('pokedex_entry_unknown');
    const number = t('pokedex_number', { number: String(species.dex).padStart(3, '0') });
    const stateClass = !isSeen ? 'unknown' : isCaught ? 'caught' : 'seen';
    return new PokemonGridEntry({
      species: species.id,
      shiny: isShiny,
      alt: isCaught ? name : '',
      marker: number,
      markerClassName: 'dex-number pw-pokedex-number',
      shinyClassName: 'dex-shiny pw-pokedex-shiny',
      className: `pw-pokedex-entry dex-entry ${stateClass}${isSeen ? ' is-seen' : ' is-unseen'}${isCaught ? ' is-caught' : ''}${isShiny ? ' is-shiny' : ''}${species.id === this._selectedSpecies ? ' is-selected' : ''}`,
      title: isSeen ? name : t('pokedex_entry_unknown'),
      ariaLabel: t('pokedex_entry_aria', { number: species.dex, name }),
      ariaPressed: species.id === this._selectedSpecies,
      focusKey: `dex-${species.id}`,
      disabled: !isSeen,
      onClick: isSeen ? () => this._selectSpecies(species.id) : null
    });
  }

  /** @private @param {Readonly<Object>} species */
  _detail(species) {
    const locations = LocationDB.getInstance().getAll()
      .filter((location) => location.encounters.some((encounter) => encounter.species === species.id))
      .map((location) => t(`location.${location.id}`));
    const talents = species.talents.map((id) => t(`talent.${id}.name`));
    if (species.hiddenTalent) talents.push(t(`talent.${species.hiddenTalent}.name`));
    return new UIContainer({
      className: 'pw-pokedex-detail',
      children: [
        new UIPokemonSprite({ species: species.id, alt: t(species.getNameKey()), size: PokemonSpriteSizes.STANDARD }),
        new UIContainer({
          className: 'pw-pokedex-detail-copy',
          children: [
            new UIText({ className: 'pw-pokedex-detail-title', text: t('pokedex_detail_title', { name: t(species.getNameKey()), number: String(species.dex).padStart(3, '0') }) }),
            new UIText({ className: 'pw-pokedex-detail-line', text: t('pokedex_types', { types: species.types.map((id) => t(`type.${id}`)).join(', ') }) }),
            new UIText({ className: 'pw-pokedex-detail-line', text: t('pokedex_talents', { talents: talents.join(', ') }) }),
            new UIText({ className: 'pw-pokedex-detail-line', text: t('pokedex_locations', { locations: locations.length ? locations.join(', ') : t('pokedex_no_locations') }) })
          ]
        })
      ]
    });
  }

  /** @private @param {string} speciesId */
  _selectSpecies(speciesId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save?.pokedex.isSeen(speciesId)) return;
    this._selectedSpecies = speciesId;
    EventBus.getInstance().dispatch(new PokedexEntryOpenedEvent(speciesId));
    this._render();
  }

  /** @private @param {string} key @param {string} value */
  _setFilter(key, value) {
    if (!Object.values(PokedexFilterKeys).includes(key)) return;
    this._filterState[key] = String(value ?? '');
    this._selectedSpecies = null;
    this._render();
  }

  /** @private @param {string} value */
  _setSearch(value) {
    this._filterState[PokedexFilterKeys.SEARCH] = String(value || '');
    const save = SaveSystem.getInstance().getCurrentSave();
    const dex = save?.pokedex ?? null;
    const shown = this._filterSpecies(this._visibleSpecies, dex);
    const selected = shown.find((entry) => entry.id === this._selectedSpecies && dex?.isSeen(entry.id)) || null;
    this._renderContent(shown, dex, selected, { preserveScroll: true });
  }

  /** @private */
  _resetFilters() {
    this._filterState = { ...DEFAULT_POKEDEX_FILTERS };
    this._selectedSpecies = null;
    this._render();
  }
}
