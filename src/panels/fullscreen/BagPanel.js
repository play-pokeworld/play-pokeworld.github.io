/**
 * @file BagPanel.js
 * @brief Bag full-screen panel (original ui/game/inventory.js + BagView): category tabs with
 * counters, sort, global search, reset; item grid; the clicked item shows its description.
 * Supported item use is delegated to ItemUseSystem; treasure sale remains independent.
 */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { UIButton } from '../../ui/UIButton.js';
import { ModalIds } from '../../config/ModalIds.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { BAG_CATEGORIES, BAG_SORT_OPTIONS, BagCategoryIds, BagSorts } from '../../config/BagCategories.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { ItemKinds } from '../../data/items/ItemKinds.js';
import { SaleSystem } from '../../systems/SaleSystem.js';
import { ItemUseSystem } from '../../systems/ItemUseSystem.js';
import { HeldItemSystem } from '../../systems/HeldItemSystem.js';
import { TeamSystem } from '../../systems/TeamSystem.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { BagQuery } from '../../systems/inventory/BagQuery.js';
import { InventoryChangedEvent } from '../../core/events/InventoryChangedEvent.js';
import { TeamChangedEvent } from '../../core/events/TeamChangedEvent.js';
import { BattleStartedEvent } from '../../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../../core/events/BattleEndedEvent.js';
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
    /** @private 'bag' or held-item equipment selection. */
    this._mode = 'bag';
    /** @private @type {number|null} */
    this._heldItemTeamIndex = null;
    for (const eventClass of [InventoryChangedEvent, TeamChangedEvent, BattleStartedEvent, BattleEndedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {{mode?:string,teamIndex?:number}} [params] */
  onOpen(params = {}) {
    this._mode = params.mode === 'held-item' && Number.isInteger(Number(params.teamIndex)) ? 'held-item' : 'bag';
    this.toggleClass('pw-bag-held-item-mode', this._mode === 'held-item');
    this._heldItemTeamIndex = this._mode === 'held-item' ? Number(params.teamIndex) : null;
    if (this._mode === 'held-item') {
      this._category = BagCategoryIds.HELD;
      this._categoryTouched = true;
      this._search = '';
      this._selected = null;
    }
    this._render();
  }

  /** @override */
  onClose() {
    this._mode = 'bag';
    this._heldItemTeamIndex = null;
    this.removeClass('pw-bag-held-item-mode');
    this.setFooter([]);
  }

  /** @private Filters + content (tab, sort or bag change). */
  _render() {
    if (this._mode !== 'held-item') this.setFooter([]);
    const save = SaveSystem.getInstance().getCurrentSave();
    const entries = save ? BagQuery.entries(save, nameOf) : [];
    const counts = BagQuery.counts(entries);
    if (!this._categoryTouched && !(counts[this._category] > 0)) {
      this._category = BAG_CATEGORIES.find((category) => counts[category.id] > 0)?.id ?? BAG_CATEGORIES[0].id;
    }
    this._entries = entries;
    const visibleCategories = this._mode === 'held-item'
      ? BAG_CATEGORIES.filter((category) => category.id === BagCategoryIds.HELD)
      : BAG_CATEGORIES;
    this.setFilters([new FilterBar({
      className: `inv-toolbar${this._mode === 'held-item' ? ' pw-held-item-toolbar' : ''}`,
      mobileDrawer: true,
      chips: visibleCategories.map((category) => ({
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
    if (this._mode === 'held-item') {
      this._renderHeldItemContent(entries);
      return;
    }
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

  /** @private Equipment-only view shown in the normal full-screen bag shell. */
  _renderHeldItemContent(entries) {
    const team = TeamSystem.getInstance().getTeam();
    const pokemon = team[this._heldItemTeamIndex];
    if (!pokemon) {
      this.setFooter([this._heldItemFooter(null, false)]);
      this.setContent([new UIText({ tagName: 'div', className: 'pw-empty-state-lg', text: t('pokemon_info_no_pokemon') })]);
      return;
    }

    const currentItemId = pokemon.heldItem || null;
    const currentNameKey = currentItemId ? `item.${currentItemId}.name` : '';
    const localizedCurrentName = currentItemId ? nameOf(currentItemId) : '';
    const currentName = currentItemId
      ? (localizedCurrentName === currentNameKey ? currentItemId : localizedCurrentName)
      : t('pokemon_info_no_item');
    const locked = HeldItemSystem.getInstance().isLocked();
    this.setFooter([this._heldItemFooter(currentItemId, locked)]);
    const shown = BagQuery.filter(
      entries.filter((entry) => entry.category === BagCategoryIds.HELD),
      { category: BagCategoryIds.HELD, search: this._search, sort: this._sort },
      descOf
    );
    const currentItemRow = new UIContainer({
      className: 'pw-held-item-current',
      children: [
        new UIText({ className: 'pw-text-sm pw-light1', text: `${t('equipped_item_label')}:` }),
        currentItemId ? new UIImage({
          src: ItemDB.getInstance().getImagePath(currentItemId),
          alt: '',
          className: 'pw-held-item-current-icon',
          pixelated: true
        }) : null,
        new UIText({ className: 'pw-held-item-current-value', text: currentName })
      ]
    });
    const children = [new UIContainer({
      className: 'pw-held-item-target',
      children: [
        new UIImage({
          src: pokemon.getSpritePath(),
          alt: pokemon.getDisplayName(),
          className: 'pw-held-item-target-sprite',
          pixelated: true
        }),
        new UIContainer({
          className: 'pw-held-item-target-details',
          children: [
            new UIText({
              tagName: 'div',
              className: 'pw-text-md pw-bold pw-light1',
              text: `${pokemon.getDisplayName()} ${t('level_short_value', { level: pokemon.level })}`
            }),
            currentItemRow
          ]
        })
      ]
    })];

    if (locked) children.push(new UIText({ tagName: 'div', className: 'pw-held-item-lock-note', text: t('held_item_battle_locked') }));
    if (shown.length === 0) {
      children.push(new UIText({ tagName: 'div', className: 'pw-empty-state-md', text: t('held_item_picker_empty') }));
    } else {
      const list = new UIContainer({ className: 'inv-list-root pw-held-item-list' });
      for (const entry of shown) {
        const holderIsOther = !!entry.holder && entry.holder.uid !== pokemon.uid;
        const holderLabel = holderIsOther
          ? t('held_item_equipped_elsewhere', { name: entry.holder.getDisplayName() })
          : '';
        const descriptionKey = `item.${entry.itemId}.desc`;
        const localizedDescription = descOf(entry.itemId);
        list.addChild(new BagItemRow(entry, entry.itemId === currentItemId, (itemId) => this._equipHeldItem(itemId), {
          description: localizedDescription === descriptionKey ? '' : localizedDescription,
          quantityLabel: t('bag_qty', { n: entry.quantity }),
          holderLabel,
          disabled: locked || holderIsOther,
          rowClassName: 'pw-held-item-row'
        }));
      }
      children.push(list);
    }

    this.setContent(children);
  }

  /** @private @param {string|null} currentItemId @param {boolean} locked */
  _heldItemFooter(currentItemId, locked) {
    const actions = new UIContainer({
      className: 'pw-held-item-actions',
      children: [
        new UIButton({
          className: 'pw-held-item-remove',
          variant: 'danger',
          text: t('held_item_remove_btn'),
          disabled: locked || !currentItemId,
          onClick: () => this._removeHeldItem()
        }),
        new UIButton({
          className: 'pw-held-item-cancel',
          variant: 'secondary',
          text: t('cancel'),
          onClick: () => this.close()
        })
      ]
    });
    actions.setAttribute('role', 'group');
    actions.setAriaLabel(`${t('held_item_remove_btn')} / ${t('cancel')}`);
    return actions;
  }

  /** @private @param {string} itemId */
  _equipHeldItem(itemId) {
    if (this._heldItemTeamIndex == null) return;
    if (HeldItemSystem.getInstance().equip(this._heldItemTeamIndex, itemId)) this.close();
    else this._render();
  }

  /** @private */
  _removeHeldItem() {
    if (this._heldItemTeamIndex == null) return;
    if (HeldItemSystem.getInstance().unequip(this._heldItemTeamIndex)) this.close();
    else this._render();
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
    const action = ItemUseSystem.getInstance().getUseAction(entry.itemId);
    if (action) {
      const targets = ItemUseSystem.getInstance().getEligibleTargets(entry.itemId);
      const controls = [new UIButton({
        className: 'pw-bag-use-button',
        variant: 'primary',
        size: 'sm',
        text: t('bag_item_use_button'),
        disabled: targets.length === 0,
        onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.ITEM_TARGET, { itemId: entry.itemId }))
      })];
      if (targets.length === 0) controls.push(new UIText({ className: 'pw-bag-use-note', text: t('item_use_no_targets') }));
      details.addChild(new UIContainer({ className: 'pw-bag-use-controls', children: controls }));
    } else if ([ItemKinds.TM, ItemKinds.HM, ItemKinds.STONE, ItemKinds.EVOLUTION, ItemKinds.CANDY, ItemKinds.CONSUMABLE].includes(definition?.kind)) {
      details.addChild(new UIText({ className: 'pw-bag-use-note', text: t('item_use_deferred') }));
    }
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
    if (this._mode === 'held-item' && category !== BagCategoryIds.HELD) return;
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
    this._categoryTouched = this._mode === 'held-item';
    if (this._mode === 'held-item') this._category = BagCategoryIds.HELD;
    this._render();
  }
}
