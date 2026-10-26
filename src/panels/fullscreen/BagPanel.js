/**
 * @file BagPanel.js
 * @brief Bag full-screen panel with category tabs, counters, sorting, search,
 * stone evolution, treasure sales, target selection routing and item inspection.
 */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIPokemonSprite } from '../../ui/UIPokemonSprite.js';
import { ModalIds } from '../../config/ModalIds.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { BAG_CATEGORIES, BAG_SORT_OPTIONS, BagCategoryIds, BagSorts } from '../../config/BagCategories.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { ItemKinds } from '../../data/items/ItemKinds.js';
import { PokemonDB } from '../../data/pokemon/PokemonDB.js';
import { SaleSystem } from '../../systems/SaleSystem.js';
import { ItemUseSystem } from '../../systems/ItemUseSystem.js';
import { ItemUseActions, ItemUseRules } from '../../config/ItemUseRules.js';
import { HeldItemSystem } from '../../systems/HeldItemSystem.js';
import { TeamSystem } from '../../systems/TeamSystem.js';
import { BoxSystem } from '../../systems/BoxSystem.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { BagQuery } from '../../systems/inventory/BagQuery.js';
import { InventoryChangedEvent } from '../../core/events/InventoryChangedEvent.js';
import { TeamChangedEvent } from '../../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../../core/events/BoxChangedEvent.js';
import { BattleStartedEvent } from '../../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../../core/events/BattleEndedEvent.js';
import { FilterBar } from '../components/FilterBar.js';
import { BagItemRow } from '../components/BagItemRow.js';
import { t } from '../../localization/LocalizationManager.js';

const nameOf = (itemId) => {
  const item = ItemDB.getInstance().getById(itemId);
  if (item && [ItemKinds.TM, ItemKinds.HM].includes(item.kind)) {
    const isCS = itemId.startsWith('cs') || item.kind === ItemKinds.HM;
    const baseName = t(`item.${itemId}.name`);
    return isCS ? `${baseName} CS` : `${baseName} CT`;
  }
  return t(`item.${itemId}.name`);
};
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
    /** @private 'bag' or held-item equipment selection. */
    this._mode = 'bag';
    /** @private @type {number|null} */
    this._heldItemTeamIndex = null;
    /** @private @type {'stone'|'treasure'|null} */
    this._subView = null;
    /** @private @type {string|null} */
    this._activeItemId = null;

    for (const eventClass of [InventoryChangedEvent, TeamChangedEvent, BoxChangedEvent, BattleStartedEvent, BattleEndedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) {
          const save = SaveSystem.getInstance().getCurrentSave();
          if (this._subView && this._activeItemId && (!save || save.inventory.count(this._activeItemId) <= 0)) {
            this._subView = null;
            this._activeItemId = null;
          }
          this._render();
        }
      });
    }
  }

  /** @override @param {{mode?:string,teamIndex?:number}} [params] */
  onOpen(params = {}) {
    this._mode = params.mode === 'held-item' && Number.isInteger(Number(params.teamIndex)) ? 'held-item' : 'bag';
    this.toggleClass('pw-bag-held-item-mode', this._mode === 'held-item');
    this._heldItemTeamIndex = this._mode === 'held-item' ? Number(params.teamIndex) : null;
    this._subView = null;
    this._activeItemId = null;
    if (this._mode === 'held-item') {
      this._category = BagCategoryIds.HELD;
      this._categoryTouched = true;
      this._search = '';
    }
    this._render();
  }

  /** @override */
  onClose() {
    this._mode = 'bag';
    this._heldItemTeamIndex = null;
    this._subView = null;
    this._activeItemId = null;
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

    if (this._subView === 'stone' && this._activeItemId) {
      this.setFilters([]);
      this._renderStoneEvolution(this._activeItemId);
      return;
    }

    if (this._subView === 'treasure' && this._activeItemId) {
      this.setFilters([]);
      this._renderTreasureSale(this._activeItemId);
      return;
    }

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
    if (shown.length === 0) {
      children.push(new UIText({ tagName: 'div', className: 'pw-empty-state-md', text: t('m.inventory.6') }));
    } else {
      const list = new UIContainer({ className: 'inv-list-root' });
      for (const entry of shown) {
        list.addChild(new BagItemRow(
          entry,
          false,
          (itemId) => this._handleItemClick(itemId),
          {
            onContext: (itemId) => this._openItemInfo(itemId)
          }
        ));
      }
      children.push(list);
    }
    this.setContent(children);
  }

  /** @private Left-click behavior dispatching to stone evolution, treasure sale, target modal or info. */
  _handleItemClick(itemId) {
    if (this._mode === 'held-item') {
      this._equipHeldItem(itemId);
      return;
    }
    const definition = ItemDB.getInstance().getById(itemId);
    if (!definition) {
      this._openItemInfo(itemId);
      return;
    }

    if (definition.kind === ItemKinds.TREASURE) {
      this._openTreasureSale(itemId);
      return;
    }

    const action = ItemUseSystem.getInstance().getUseAction(itemId);
    if (
      definition.kind === ItemKinds.STONE ||
      definition.kind === ItemKinds.EVOLUTION ||
      action === ItemUseActions.EVOLVE
    ) {
      this._openStoneEvolution(itemId);
      return;
    }

    if (
      action === ItemUseActions.RARE_CANDY ||
      action === ItemUseActions.VITAMIN ||
      action === ItemUseActions.UNLOCK_MOVE ||
      definition.kind === ItemKinds.CANDY ||
      definition.kind === ItemKinds.TM ||
      definition.kind === ItemKinds.HM ||
      (definition.kind === ItemKinds.CONSUMABLE && definition.category === ItemUseRules.VITAMIN_CATEGORY)
    ) {
      this.close();
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.BOX, { itemUseId: itemId }));
      return;
    }

    if (
      definition.kind === ItemKinds.CONSUMABLE ||
      action
    ) {
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.ITEM_TARGET, { itemId }));
      return;
    }

    this._openItemInfo(itemId);
  }

  /** @private Opens the detailed inspection modal with a "Back to bag" return button. */
  _openItemInfo(itemId) {
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.DICTIONARY_DETAIL, {
      kind: 'item',
      id: itemId,
      backLabel: t('back_bag')
    }));
  }

  /** @private Activates the stone evolution screen. */
  _openStoneEvolution(itemId) {
    this._subView = 'stone';
    this._activeItemId = itemId;
    this._render();
  }

  /** @private Inline stone evolution view with candidate cards and species catalog. */
  _renderStoneEvolution(itemId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const qty = save ? save.inventory.count(itemId) : 0;
    if (qty <= 0) {
      this._subView = null;
      this._activeItemId = null;
      this._render();
      return;
    }

    const team = TeamSystem.getInstance().getTeam();
    const allBox = BoxSystem.getInstance().getAll();
    const teamUids = new Set(team.map((p) => p.uid));
    const candidates = [];

    for (const p of team) {
      const species = PokemonDB.getInstance().getById(p.species);
      const evo = species?.evolutions?.find((e) => e.item === itemId);
      if (evo) candidates.push({ pokemon: p, evo, loc: 'team' });
    }
    for (const p of allBox) {
      if (teamUids.has(p.uid)) continue;
      const species = PokemonDB.getInstance().getById(p.species);
      const evo = species?.evolutions?.find((e) => e.item === itemId);
      if (evo) candidates.push({ pokemon: p, evo, loc: 'box' });
    }

    const header = new UIContainer({
      className: 'pw-sticky-header',
      children: [
        new UIContainer({
          className: 'pw-row',
          children: [
            new UIContainer({
              className: 'pw-icon-box',
              children: [
                new UIImage({
                  src: ItemDB.getInstance().getImagePath(itemId),
                  alt: nameOf(itemId),
                  className: 'inv-icon-img',
                  pixelated: true
                })
              ]
            }),
            new UIContainer({
              children: [
                new UIText({ tagName: 'div', className: 'pw-sticky-title', text: `${t('use_stone')} ${nameOf(itemId)}` }),
                new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: t('stone_sub') })
              ]
            })
          ]
        }),
        new UIText({ tagName: 'div', className: 'pw-count-badge', text: `×${qty}` })
      ]
    });

    const contentNodes = [header];

    if (candidates.length > 0) {
      const grid = new UIContainer({ className: 'pw-starter-grid' });
      for (const candidate of candidates) {
        const { pokemon, evo } = candidate;
        const targetSpecies = evo.to;
        const targetName = t(`pokemon.${targetSpecies}`);
        const owned = save.pokedex.isCaught(targetSpecies);
        const minLvl = Number(evo.minLevel) || 1;
        const canEvolve = pokemon.level >= minLvl;

        const orbChildren = [];
        if (pokemon.shiny) {
          orbChildren.push(new UIText({ tagName: 'div', className: 'evo-shiny-badge', text: '★' }));
        }
        orbChildren.push(new UIText({ tagName: 'div', className: 'pw-starter-level', text: `Nv.${pokemon.level}` }));
        orbChildren.push(new UIText({
          tagName: 'div',
          className: `evo-owned-badge${owned ? '' : ' is-missing'}`,
          text: owned ? '✓' : '!'
        }));
        orbChildren.push(new UIPokemonSprite({
          species: pokemon.species,
          form: pokemon.form,
          shiny: pokemon.shiny,
          size: 72,
          alt: pokemon.getDisplayName()
        }));
        orbChildren.push(new UIText({ tagName: 'div', className: 'evo-target-label', text: `→ ${targetName}` }));

        const orb = new UIContainer({ className: 'pw-starter-orb', children: orbChildren });
        const card = new UIContainer({
          className: 'pw-starter-card',
          children: [orb]
        });
        card.setAttribute('title', `${pokemon.getDisplayName()} → ${targetName} (${owned ? t('already_owned_sp') : t('non_possede')})`);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.addDomListener('click', () => {
          if (!canEvolve) {
            NotificationSystem.getInstance().notifyTemporary(
              t('item_use_min_level_required', { min: minLvl, current: pokemon.level }),
              { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.WARNING }
            );
            return;
          }
          const res = ItemUseSystem.getInstance().useOnPokemon(itemId, pokemon.uid);
          if (res?.result === 'success') {
            if (save.inventory.count(itemId) <= 0) {
              this._subView = null;
              this._activeItemId = null;
            }
            this._render();
          }
        });
        grid.addChild(card);
      }
      contentNodes.push(grid);
    } else {
      contentNodes.push(new UIText({
        tagName: 'div',
        className: 'pw-text-sm pw-light1',
        text: t('evo_catalog_hint')
      }));
      const catalogGrid = new UIContainer({ className: 'pw-starter-grid' });
      const allSpecies = PokemonDB.getInstance().getAll();
      for (const species of allSpecies) {
        const evo = species.evolutions?.find((e) => e.item === itemId);
        if (!evo) continue;
        const targetName = t(`pokemon.${evo.to}`);
        const ownedTarget = save.pokedex.isCaught(evo.to);
        const ownedBase = save.pokedex.isCaught(species.id);

        const orb = new UIContainer({
          className: 'pw-starter-orb',
          children: [
            new UIPokemonSprite({ species: species.id, size: 56, alt: t(species.getNameKey()) }),
            new UIText({ tagName: 'div', className: 'evo-target-label', text: `→ ${targetName}${ownedTarget ? ' ✓' : ''}` })
          ]
        });
        const card = new UIContainer({
          className: 'pw-starter-card',
          children: [orb]
        });
        card.setAttribute('title', `#${species.dex} → ${targetName}`);
        if (!ownedBase) card.addClass('is-disabled');
        catalogGrid.addChild(card);
      }
      contentNodes.push(catalogGrid);
    }

    const returnBtn = new UIButton({
      className: 'hbtn',
      text: t('back_bag'),
      onClick: () => {
        this._subView = null;
        this._activeItemId = null;
        this._render();
      }
    });
    contentNodes.push(new UIContainer({
      className: 'pw-starter-actions',
      children: [returnBtn]
    }));

    this.setContent(contentNodes);
  }

  /** @private Activates the treasure sale screen. */
  _openTreasureSale(itemId) {
    this._subView = 'treasure';
    this._activeItemId = itemId;
    this._render();
  }

  /** @private Inline treasure sale view matching main's design. */
  _renderTreasureSale(itemId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const qty = save ? save.inventory.count(itemId) : 0;
    if (qty <= 0) {
      this._subView = null;
      this._activeItemId = null;
      this._render();
      return;
    }

    const quote = SaleSystem.getInstance().getQuote(itemId, 1);
    const allQuote = SaleSystem.getInstance().getQuote(itemId, qty);
    const isDiamonds = quote?.currencyId === 'diamonds';
    const oneQuote = isDiamonds
      ? `+${TextFormatter.formatNumber(quote?.gain ?? 0)} ${t('currency_diamonds')}`
      : `+${TextFormatter.formatNumber(quote?.gain ?? 0)}₽`;
    const allQuoteStr = isDiamonds
      ? `+${TextFormatter.formatNumber(allQuote?.gain ?? 0)} ${t('currency_diamonds')}`
      : `+${TextFormatter.formatNumber(allQuote?.gain ?? 0)}₽`;
    const unitValue = isDiamonds
      ? `${TextFormatter.formatNumber(quote?.gain ?? 0)} ${t('currency_diamonds')}`
      : `${TextFormatter.formatNumber(quote?.gain ?? 0)}₽`;

    const titleRow = new UIContainer({
      className: 'loc-title',
      children: [
        new UIText({ text: `${t('m.inventory.5')} ` }),
        new UIImage({
          src: ItemDB.getInstance().getImagePath(itemId),
          alt: nameOf(itemId),
          className: 'inv-icon-img',
          pixelated: true
        }),
        new UIText({ text: ` ${nameOf(itemId)}` })
      ]
    });

    const subTitle = new UIText({
      tagName: 'div',
      className: 'loc-sub',
      text: t('m.treasure_sell_sub', { qty, value: unitValue })
    });

    const sellOneBtn = new UIButton({
      className: 'hbtn',
      text: `${t('sale_sell_one')} (${oneQuote})`,
      onClick: () => {
        SaleSystem.getInstance().sell(itemId, 1);
        if (save.inventory.count(itemId) <= 0) {
          this._subView = null;
          this._activeItemId = null;
        }
        this._render();
      }
    });

    const actions = [sellOneBtn];
    if (qty > 1) {
      actions.push(new UIButton({
        className: 'hbtn',
        text: `${t('sale_sell_all', { count: qty })} (${allQuoteStr})`,
        onClick: () => {
          SaleSystem.getInstance().sell(itemId, qty);
          this._subView = null;
          this._activeItemId = null;
          this._render();
        }
      }));
    }
    actions.push(new UIButton({
      className: 'hbtn',
      text: t('back_bag'),
      onClick: () => {
        this._subView = null;
        this._activeItemId = null;
        this._render();
      }
    }));

    const actionsContainer = new UIContainer({
      className: 'pw-starter-actions',
      children: actions
    });

    this.setContent([
      new UIContainer({
        children: [titleRow, subTitle, actionsContainer]
      })
    ]);
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
          rowClassName: 'pw-held-item-row',
          onContext: (itemId) => this._openItemInfo(itemId)
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
    this._categoryTouched = this._mode === 'held-item';
    if (this._mode === 'held-item') this._category = BagCategoryIds.HELD;
    this._render();
  }
}
