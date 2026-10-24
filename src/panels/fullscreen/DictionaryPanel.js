/**
 * @file DictionaryPanel.js
 * @brief Full-screen dictionary panel (items, moves, talents) matching the main reference.
 * The toolbar sits in the fixed filter slot and the grid scrolls in the content area.
 */

import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UITextInput } from '../../ui/UITextInput.js';
import { DictionaryCard } from '../components/DictionaryCard.js';
import { DictionaryCatalog } from '../../systems/dictionary/DictionaryCatalog.js';
import { ModalIds } from '../../config/ModalIds.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { FeatureAccessSystem } from '../../systems/FeatureAccessSystem.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { LanguageChangedEvent } from '../../core/events/LanguageChangedEvent.js';
import { InventoryChangedEvent } from '../../core/events/InventoryChangedEvent.js';
import { TeamChangedEvent } from '../../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../../core/events/BoxChangedEvent.js';
import { ContentAccessChangedEvent } from '../../core/events/ContentAccessChangedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class DictionaryPanel extends UIFullscreenPanel {
  constructor() {
    super({
      id: ModalIds.DICTIONARY,
      title: t('dictionary_title'),
      name: 'DictionaryPanel',
    });

    this._tab = 'items';
    this._search = '';

    for (const eventClass of [
      LanguageChangedEvent,
      InventoryChangedEvent,
      TeamChangedEvent,
      BoxChangedEvent,
      ContentAccessChangedEvent,
    ]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {{tab?: string}} [params={}] */
  onOpen(params = {}) {
    if (params.tab && ['items', 'moves', 'abilities'].includes(params.tab)) {
      this._tab = params.tab;
    }
    this.setTitle(t('dictionary_title'));
    this._render();
  }

  /** @private */
  _render() {
    this.setTitle(t('dictionary_title'));

    const tabDefs = [
      { id: 'items', labelKey: 'dict_items' },
      { id: 'moves', labelKey: 'dict_moves' },
      { id: 'abilities', labelKey: 'dict_abilities' },
    ];

    const tabButtons = tabDefs.map((def) => {
      const btn = new UIButton({
        className: `hbtn dict-tab${this._tab === def.id ? ' active' : ''}`,
        text: t(def.labelKey),
        onClick: () => this._setTab(def.id),
      });
      btn.setData('tab', def.id);
      return btn;
    });

    const searchInput = new UITextInput({
      className: 'dict-search pw-ui-toolbar-search',
      value: this._search,
      placeholder: t('dict_search_placeholder'),
      onInput: (value) => {
        this._search = value;
        this._renderContent();
      },
    });

    const toolbar = new UIContainer({
      className: 'dict-toolbar pw-ui-toolbar',
      children: [
        new UIContainer({
          className: 'dict-tabs',
          children: tabButtons,
        }),
        searchInput,
      ],
    });

    this.setFilters([toolbar]);
    this._renderContent();
  }

  /** @private */
  _renderContent() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const accessibleRegions = FeatureAccessSystem.getInstance().getSnapshot()
      .regions || ['kanto'];

    let rawEntries = [];
    if (this._tab === 'items') {
      rawEntries = DictionaryCatalog.getItems(save, accessibleRegions);
    } else if (this._tab === 'moves') {
      rawEntries = DictionaryCatalog.getMoves(save);
    } else if (this._tab === 'abilities') {
      rawEntries = DictionaryCatalog.getAbilities(save);
    }

    const filtered = DictionaryCatalog.filter(rawEntries, this._search);

    const grid = new UIContainer({ className: 'dict-grid' });
    if (filtered.length === 0) {
      grid.addChild(
        new UIText({
          className: 'dict-muted',
          text: t('dict_no_results'),
        }),
      );
    } else {
      for (const entry of filtered) {
        grid.addChild(
          new DictionaryCard(entry, (clicked) => this._openDetail(clicked)),
        );
      }
    }

    const gridRoot = new UIContainer({
      className: 'dict-grid-root',
      children: [grid],
    });

    this.setContent([gridRoot], { preserveScroll: true });
  }

  /** @private @param {string} tab */
  _setTab(tab) {
    if (this._tab === tab) return;
    this._tab = tab;
    this._search = '';
    this._render();
  }

  /** @private @param {Object} entry */
  _openDetail(entry) {
    EventBus.getInstance().dispatch(
      new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
        kind: entry.kind,
        id: entry.id,
      }),
    );
  }
}
