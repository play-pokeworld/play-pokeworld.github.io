/**
 * @file PokedexPanel.js
 * @brief Regional Pokédex list and seen-species details.
 */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { ModalIds } from '../../config/ModalIds.js';
import { REGIONS } from '../../config/Regions.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { LocationDB } from '../../data/world/LocationDB.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { PokedexChangedEvent } from '../../core/events/PokedexChangedEvent.js';
import { PokedexEntryOpenedEvent } from '../../core/events/PokedexEntryOpenedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { EventBus } from '../../core/EventBus.js';
import { t } from '../../localization/LocalizationManager.js';

const STATUS_FILTERS = Object.freeze([
  Object.freeze({ id: 'all', labelKey: 'pokedex_filter_all' }),
  Object.freeze({ id: 'seen', labelKey: 'pokedex_seen' }),
  Object.freeze({ id: 'caught', labelKey: 'pokedex_caught' })
]);
const DEFAULT_REGION = 'kanto';

export class PokedexPanel extends UIFullscreenPanel {
  constructor() {
    super({ id: ModalIds.POKEDEX, title: t('panel_pokedex_title'), name: 'PokedexPanel' });
    this._region = DEFAULT_REGION;
    this._filter = 'all';
    this._selectedSpecies = null;
    for (const eventClass of [PokedexChangedEvent, SaveLoadedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {{region?: string}} [params={}] */
  onOpen(params = {}) {
    if (REGIONS.some((region) => region.available && region.id === params.region)) this._region = params.region;
    this._selectedSpecies = null;
    this._render();
  }

  /** @private */
  _render() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const dex = save?.pokedex;
    const species = PokemonDB.getInstance().getByRegion(this._region).sort((a, b) => a.dex - b.dex);
    const seen = species.filter((entry) => dex?.isSeen(entry.id)).length;
    const caught = species.filter((entry) => dex?.isCaught(entry.id)).length;
    const selected = species.find((entry) => entry.id === this._selectedSpecies && dex?.isSeen(entry.id)) || null;

    const toolbar = new UIContainer({ className: 'pw-pokedex-toolbar' });
    const regionTabs = new UIContainer({ className: 'pw-pokedex-tabs' });
    for (const region of REGIONS.filter((entry) => entry.available)) {
      const tab = new UIButton({
        variant: 'hbtn',
        size: 'sm',
        text: t(region.labelKey),
        onClick: () => this._setRegion(region.id)
      });
      tab.setActive(region.id === this._region);
      regionTabs.addChild(tab);
    }
    const statusTabs = new UIContainer({ className: 'pw-pokedex-tabs' });
    for (const filter of STATUS_FILTERS) {
      const tab = new UIButton({
        variant: 'hbtn',
        size: 'sm',
        text: t(filter.labelKey),
        onClick: () => this._setFilter(filter.id)
      });
      tab.setActive(filter.id === this._filter);
      statusTabs.addChild(tab);
    }
    toolbar.addChildren([regionTabs, statusTabs]);
    this.setFilters([toolbar]);

    const grid = new UIContainer({ className: 'pw-pokedex-grid' });
    const visible = species.filter((entry) => {
      if (this._filter === 'seen') return dex?.isSeen(entry.id);
      if (this._filter === 'caught') return dex?.isCaught(entry.id);
      return true;
    });
    for (const entry of visible) grid.addChild(this._entry(entry, dex));

    const content = [
      new UIContainer({
        className: 'pw-pokedex-summary',
        children: [new UIText({ text: t('pokedex_count', { seen, caught, total: species.length }) })]
      }),
      grid
    ];
    if (selected) content.push(this._detail(selected));
    this.setContent(content);
  }

  /** @private @param {Readonly<Object>} species @param {import('../../data/save/PokedexData.js').PokedexData|null} dex */
  _entry(species, dex) {
    const isSeen = !!dex?.isSeen(species.id);
    const isCaught = !!dex?.isCaught(species.id);
    const isShiny = isCaught && dex.getCaughtStatus(species.id) === 'shiny';
    const name = isSeen ? t(species.getNameKey()) : t('pokedex_entry_unknown');
    const row = new UIContainer({
      tagName: 'button',
      className: `pw-pokedex-entry${isSeen ? '' : ' is-unseen'}${species.id === this._selectedSpecies ? ' is-selected' : ''}`,
      children: [
        new UIText({ className: 'pw-pokedex-number', text: t('pokedex_number', { number: String(species.dex).padStart(3, '0') }) }),
        isSeen
          ? new UIPokemonSprite({ species: species.id, alt: name, size: PokemonSpriteSizes.CONTEXT })
          : new UIIcon({ name: 'pokeball', className: 'pw-pokedex-unknown-icon' }),
        new UIText({ className: 'pw-pokedex-name', text: name }),
        new UIText({ className: 'pw-pokedex-status', text: t(isShiny ? 'pokedex_shiny' : isCaught ? 'pokedex_caught' : isSeen ? 'pokedex_seen' : 'pokedex_entry_unknown') })
      ]
    });
    row.setAttribute('type', 'button');
    row.setAttribute('aria-label', t('pokedex_entry_aria', { number: species.dex, name }));
    row.setAttribute('aria-pressed', species.id === this._selectedSpecies ? 'true' : 'false');
    if (!isSeen) {
      row.setAttribute('disabled', 'disabled');
      row.addClass('is-disabled');
    } else {
      row.addDomListener('click', () => this._selectSpecies(species.id));
    }
    return row;
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

  /** @private @param {string} regionId */
  _setRegion(regionId) {
    if (!REGIONS.some((region) => region.available && region.id === regionId)) return;
    this._region = regionId;
    this._selectedSpecies = null;
    this._render();
  }

  /** @private @param {string} filter */
  _setFilter(filter) {
    if (!STATUS_FILTERS.some((entry) => entry.id === filter)) return;
    this._filter = filter;
    this._selectedSpecies = null;
    this._render();
  }
}
