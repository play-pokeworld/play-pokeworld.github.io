/**
 * @file BagPanel.js
 * @brief Bag full-screen panel (original ui/game/inventory.js + BagView): category tabs with
 * counters, sort, global search, reset; item grid; the clicked item shows its description.
 * Item USE (TMs, evolution stones, candies, vitamins, treasure sale) is not wired yet.
 */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { UIButton } from '../../ui/UIButton.js';
import { ModalIds } from '../../config/ModalIds.js';
import { BAG_CATEGORIES, BAG_SORT_OPTIONS, BagSorts } from '../../config/BagCategories.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { ItemKinds } from '../../data/items/ItemKinds.js';
import { SaleSystem } from '../../systems/SaleSystem.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { BagQuery } from '../../systems/inventory/BagQuery.js';
import { InventoryChangedEvent } from '../../core/events/InventoryChangedEvent.js';
import { FilterBar } from '../components/FilterBar.js';
import { BagItemRow } from '../components/BagItemRow.js';
import { t } from '../../localization/LocalizationManager.js';

const nameOf = (itemId) => t(`item.${itemId}.name`);
const descOf = (itemId) => t(`item.${itemId}.desc`);

export class BagPanel extends UIFullscreenPanel {
  constructor() {
    super({ id: ModalIds.BAG, title: t('shortcut_bag'), name: 'BagPanel' });
    /** @private */
    this._category = null;
    /** @private Set once the player picked a tab: no more jump to the first non-empty one */
    this._categoryTouched = false;
    /** @private */
    this._sort = BagSorts.NAME_ASC;
    /** @private */
    this._search = '';
    /** @private @type {string|null} */
    this._selected = null;
    this.listen(InventoryChangedEvent, () => {
      if (this.isOpen()) this._render();
    });
  }

  /** @override */
  onOpen() {
    this._render();
  }

  /** @private Filters + content (tab, sort or bag change). */
  _render() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const entries = save ? BagQuery.entries(save, nameOf) : [];
    const counts = BagQuery.counts(entries);
    if (!this._categoryTouched && !(counts[this._category] > 0)) {
      this._category = BAG_CATEGORIES.find((category) => counts[category.id] > 0)?.id ?? BAG_CATEGORIES[0].id;
    }
    this._entries = entries;
    this.setFilters([new FilterBar({
      className: 'inv-toolbar',
      chips: BAG_CATEGORIES.map((category) => ({
        text: t(category.labelKey),
        count: counts[category.id] || 0,
        active: category.id === this._category,
        onClick: () => this._setCategory(category.id)
      })),
      fields: [{
        label: t('sort_label'),
        options: BAG_SORT_OPTIONS.map((option) => ({ value: option.id, label: t(option.labelKey) })),
        value: this._sort,
        onChange: (value) => {
          this._sort = value;
          this._renderContent();
        }
      }],
      search: {
        value: this._search,
        placeholder: t('bag_search_placeholder'),
        onInput: (value) => {
          this._search = value;
          this._renderContent();
        }
      },
      reset: { text: t('box_filter_reset'), onClick: () => this._reset() }
    })]);
    this._renderContent();
  }

  /** @private Content only (search typing keeps the input focused). */
  _renderContent() {
    const entries = this._entries ?? [];
    if (entries.length === 0) {
      this.setContent([new UIText({ tagName: 'div', className: 'pw-empty-state-lg', richText: t('inv_empty') })]);
      return;
    }
    const shown = BagQuery.filter([...entries], { category: this._category, search: this._search, sort: this._sort }, descOf);
    const children = [];
    const selected = entries.find((entry) => entry.itemId === this._selected);
    if (selected) children.push(this._detail(selected));
    if (shown.length === 0) {
      children.push(new UIText({ tagName: 'div', className: 'pw-empty-state-md', text: t('m.inventory.6') }));
    } else {
      const list = new UIContainer({ className: 'inv-list-root' });
      for (const entry of shown) list.addChild(new BagItemRow(entry, entry.itemId === this._selected, (itemId) => this._select(itemId)));
      children.push(list);
    }
    this.setContent(children);
  }

  /** @private Description card of the clicked item. */
  _detail(entry) {
    const definition = ItemDB.getInstance().getById(entry.itemId);
    const details = new UIContainer({
      className: 'pw-bag-detail-text',
      children: [
        new UIText({ tagName: 'div', className: 'pw-bag-detail-name', text: `${entry.name} ${t('bag_qty', { n: entry.quantity })}` }),
        new UIText({ tagName: 'div', className: 'pw-bag-detail-desc', richText: descOf(entry.itemId) })
      ]
    });
    if (definition?.kind === ItemKinds.TREASURE) {
      const quote = SaleSystem.getInstance().getQuote(entry.itemId, 1);
      const price = quote?.currencyId === 'money'
        ? t('money_amount', { value: TextFormatter.formatNumber(quote.gain) })
        : `${TextFormatter.formatNumber(quote?.gain ?? 0)} ${t('currency_diamonds')}`;
      details.addChild(new UIContainer({
        className: 'pw-bag-sale-controls',
        children: [
          new UIText({ className: 'pw-bag-sale-price', text: t('sale_price', { price }) }),
          new UIButton({
            variant: 'success',
            size: 'sm',
            text: t('sale_sell_one'),
            onClick: () => SaleSystem.getInstance().sell(entry.itemId, 1)
          }),
          entry.quantity > 1 ? new UIButton({
            variant: 'secondary',
            size: 'sm',
            text: t('sale_sell_all', { count: TextFormatter.formatNumber(entry.quantity) }),
            onClick: () => SaleSystem.getInstance().sell(entry.itemId, entry.quantity)
          }) : null
        ]
      }));
    }
    return new UIContainer({
      className: 'pw-bag-detail',
      children: [
        new UIImage({ src: ItemDB.getInstance().getImagePath(entry.itemId), alt: entry.name, className: 'pw-bag-detail-icon', pixelated: true }),
        details
      ]
    });
  }

  /** @private */
  _select(itemId) {
    this._selected = this._selected === itemId ? null : itemId;
    this._renderContent();
  }

  /** @private */
  _setCategory(category) {
    this._category = category;
    this._categoryTouched = true;
    this._search = '';
    this._render();
  }

  /** @private */
  _reset() {
    this._sort = BagSorts.NAME_ASC;
    this._search = '';
    this._selected = null;
    this._categoryTouched = false;
    this._render();
  }
}
