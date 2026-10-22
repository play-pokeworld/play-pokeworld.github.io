/**
 * @file HatcheryPanel.js
 * @brief Daycare and Pewter fossil-lab view, backed by HatcherySystem / FossilSystem.
 */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIImage } from '../ui/UIImage.js';
import { UIButton } from '../ui/UIButton.js';
import { UIDropdown } from '../ui/UIDropdown.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { HatcheryRules } from '../config/HatcheryRules.js';
import { FossilRules } from '../config/FossilRules.js';
import { HatcherySystem } from '../systems/HatcherySystem.js';
import { FossilSystem } from '../systems/FossilSystem.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { HatcheryChangedEvent } from '../core/events/HatcheryChangedEvent.js';
import { HatcheryLevelUpEvent } from '../core/events/HatcheryLevelUpEvent.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { InventoryChangedEvent } from '../core/events/InventoryChangedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { t } from '../localization/LocalizationManager.js';

export class HatcheryPanel extends DraggablePanel {
  /** @param {string} column */
  constructor(column) {
    super({
      id: WindowIds.HATCHERY,
      column,
      title: t('hatchery_management_title'),
      icon: 'egg',
      bodyId: 'hatchery-window-body',
      bodyClassName: 'pw-static-022 pw-hatchery-body',
      name: 'HatcheryPanel'
    });
    for (const eventClass of [
      HatcheryChangedEvent, HatcheryLevelUpEvent, TeamChangedEvent, BoxChangedEvent,
      InventoryChangedEvent, LocationChangedEvent, SaveCreatedEvent, SaveLoadedEvent,
      SaveDeletedEvent, ContentAccessChangedEvent
    ]) this.listen(eventClass, () => this._render());
    this._render();
  }

  /** @override */
  onEnter() {
    super.onEnter();
    this._render();
  }

  /** @private */
  _syncVisibility() {
    const locationId = LocationSystem.getInstance().getCurrentLocationId();
    const hatcheryUnlocked = HatcherySystem.getInstance().isUnlocked();
    const fossilLabUnlocked = locationId === FossilRules.LAB_LOCATION_ID && FossilSystem.getInstance().isRevivalUnlocked();
    const visible = hatcheryUnlocked || fossilLabUnlocked;
    this.toggleClass('pw-progression-hidden', !visible);
    return visible;
  }

  /** @private */
  _render() {
    const visible = this._syncVisibility();
    this.clearChildren();
    if (!visible) return;
    const locationId = LocationSystem.getInstance().getCurrentLocationId();
    if (locationId === FossilRules.LAB_LOCATION_ID) {
      this._renderFossilLab();
      return;
    }
    const hatchery = HatcherySystem.getInstance();
    if (!hatchery.isUnlocked()) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-hatchery-locked', text: t('hatchery_locked_desc') }));
      return;
    }
    if (!hatchery.canUseHere()) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-hatchery-empty', text: t('hatchery_choose_location', {
        route: t(`location.${HatcheryRules.LOCATION_ID}`),
        lab: t(`location.${FossilRules.LAB_LOCATION_ID}`)
      }) }));
      return;
    }
    this._renderHatchery();
  }

  /** @private */
  _renderHatchery() {
    const system = HatcherySystem.getInstance();
    const { maxSlots, slots } = system.getSnapshot();
    const candidates = system.getCandidates();
    const fossils = system.getFossilCandidates();
    const header = new UIContainer({
      className: 'pw-hatchery-header',
      children: [
        new UIText({ text: t('hatchery_slots_current', { count: maxSlots, max: HatcheryRules.MAX_SLOT_COUNT }) }),
        new UIButton({
          variant: 'secondary',
          size: 'sm',
          text: t('hatchery_add_slot_btn', { cost: TextFormatter.formatNumber(HatcheryRules.SLOT_UPGRADE_COSTS[maxSlots - 1] || 0) }),
          disabled: maxSlots >= HatcheryRules.MAX_SLOT_COUNT,
          onClick: () => system.upgradeSlot()
        })
      ]
    });
    this.addChild(header);
    this.addChild(new UIText({ tagName: 'div', className: 'pw-hatchery-hint', text: t('hatchery_daycare_hint', {
      kos: HatcheryRules.DAYCARE_KOS_PER_LEVEL
    }) }));
    for (let index = 0; index < maxSlots; index++) {
      const slot = slots[index] ?? null;
      this.addChild(slot?.kind === 'daycare'
        ? this._daycareSlot(index, slot)
        : slot?.kind === 'fossil'
          ? this._fossilSlot(index, slot)
          : this._emptySlot(index, candidates, fossils));
    }
  }

  /** @private @param {number} index @param {Object} slot */
  _daycareSlot(index, slot) {
    const pokemon = slot.pokemon;
    return new UIContainer({
      className: 'pw-hatchery-slot pw-hatchery-slot--occupied',
      children: [
        new UIImage({
          src: AssetPaths.pokemonSprite(pokemon.species, pokemon.form, pokemon.shiny),
          alt: pokemon.getDisplayName(),
          className: 'pw-hatchery-pokemon-icon',
          pixelated: true
        }),
        new UIContainer({
          className: 'pw-hatchery-info',
          children: [
            new UIContainer({
              className: 'pw-hatchery-title-row',
              children: [
                new UIText({ text: t('hatchery_daycare_slot', { slot: index + 1 }) }),
                new UIText({ text: `${pokemon.getDisplayName()} · ${t('level_short_value', { level: pokemon.level })}` })
              ]
            }),
            new UIText({ className: 'pw-hatchery-progress-label', text: t('hatchery_daycare_progress', {
              current: slot.knockouts,
              required: HatcheryRules.DAYCARE_KOS_PER_LEVEL
            }) }),
            new UIProgressBar({
              value: slot.knockouts,
              max: HatcheryRules.DAYCARE_KOS_PER_LEVEL,
              variant: 'exp',
              size: 'sm',
              className: 'pw-hatchery-progress'
            }),
            new UIButton({
              variant: 'secondary',
              size: 'sm',
              text: t('hatchery_withdraw_btn'),
              onClick: () => HatcherySystem.getInstance().withdrawPokemon(index)
            })
          ]
        })
      ]
    });
  }

  /** @private @param {number} index @param {Object} slot */
  _fossilSlot(index, slot) {
    const item = ItemDB.getInstance().getById(slot.itemId);
    const name = t(`pokemon.${slot.speciesId}`);
    const unlocked = FossilSystem.getInstance().isRevivalUnlocked();
    const progress = Math.min(slot.knockouts, slot.required);
    return new UIContainer({
      className: `pw-hatchery-slot pw-hatchery-slot--fossil${slot.ready ? ' is-ready' : ''}`,
      children: [
        new UIImage({
          src: ItemDB.getInstance().getImagePath(slot.itemId),
          alt: item ? t(`item.${slot.itemId}.name`) : slot.itemId,
          className: 'pw-hatchery-pokemon-icon',
          pixelated: true
        }),
        new UIContainer({
          className: 'pw-hatchery-info',
          children: [
            new UIContainer({
              className: 'pw-hatchery-title-row',
              children: [
                new UIText({ text: t('hatchery_fossil_slot', { slot: index + 1 }) }),
                new UIText({ text: t('hatchery_fossil_species', { fossil: t(`item.${slot.itemId}.name`), species: name }) })
              ]
            }),
            new UIText({ className: 'pw-hatchery-progress-label', text: slot.ready
              ? unlocked ? t('hatchery_fossil_ready') : t('hatchery_fossil_locked')
              : t('hatchery_fossil_progress', { current: progress, required: slot.required }) }),
            new UIProgressBar({ value: progress, max: slot.required, variant: 'exp', size: 'sm', className: 'pw-hatchery-progress' }),
            new UIButton({
              variant: slot.ready && unlocked ? 'success' : 'secondary',
              size: 'sm',
              text: slot.ready ? t(unlocked ? 'hatchery_collect_fossil' : 'hatchery_fossil_locked') : t('hatchery_fossil_incubating'),
              disabled: !slot.ready || !unlocked,
              onClick: () => HatcherySystem.getInstance().collectFossil(index)
            })
          ]
        })
      ]
    });
  }

  /** @private @param {number} index @param {Array<Object>} candidates @param {Array<Object>} fossils */
  _emptySlot(index, candidates, fossils) {
    const pokemonSelect = new UIDropdown({
      className: 'pw-hatchery-select',
      options: [
        { value: '', label: t('hatchery_select_pokemon'), disabled: true },
        ...candidates.map((entry) => ({
          value: entry.uid,
          label: t('hatchery_candidate_label', { name: entry.label, source: t(`hatchery_source_${entry.source}`) })
        }))
      ],
      value: ''
    });
    const fossilSelect = new UIDropdown({
      className: 'pw-hatchery-select',
      options: [
        { value: '', label: t('hatchery_select_fossil'), disabled: true },
        ...fossils.map((entry) => ({
          value: entry.itemId,
          label: t('hatchery_fossil_candidate', {
            item: t(`item.${entry.itemId}.name`),
            count: entry.quantity
          })
        }))
      ],
      value: ''
    });
    const children = [
      new UIText({ tagName: 'div', className: 'pw-hatchery-empty-text', text: t('hatchery_slot_title', { slot: index + 1 }) })
    ];
    if (candidates.length > 0) {
      children.push(new UIContainer({ className: 'pw-hatchery-action-row', children: [
        pokemonSelect,
        new UIButton({
          variant: 'primary',
          size: 'sm',
          text: t('hatchery_deposit_btn'),
          onClick: () => {
            if (pokemonSelect.getValue()) HatcherySystem.getInstance().depositPokemon(pokemonSelect.getValue());
          }
        })
      ] }));
    } else {
      children.push(new UIText({ tagName: 'div', className: 'pw-hatchery-empty-hint', text: t('hatchery_no_candidates') }));
    }
    if (fossils.length > 0) {
      children.push(new UIContainer({ className: 'pw-hatchery-action-row', children: [
        fossilSelect,
        new UIButton({
          variant: 'secondary',
          size: 'sm',
          text: t('hatchery_incubate_btn'),
          onClick: () => {
            if (fossilSelect.getValue()) HatcherySystem.getInstance().startFossilIncubation(fossilSelect.getValue());
          }
        })
      ] }));
    }
    return new UIContainer({ className: 'pw-hatchery-slot pw-hatchery-empty-slot', children });
  }

  /** @private */
  _renderFossilLab() {
    const system = FossilSystem.getInstance();
    const candidates = system.getCandidates();
    this.addChild(new UIText({ tagName: 'h3', className: 'pw-hatchery-section-title', text: t('fossil_lab_title') }));
    if (!system.isRevivalUnlocked()) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-hatchery-empty', text: t('fossil_story_locked') }));
      return;
    }
    this.addChild(new UIText({ tagName: 'div', className: 'pw-hatchery-hint', text: t('fossil_lab_hint') }));
    if (candidates.length === 0) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-hatchery-empty', text: t('fossil_no_candidates') }));
      return;
    }
    const select = new UIDropdown({
      className: 'pw-hatchery-select',
      options: [
        { value: '', label: t('fossil_select_item'), disabled: true },
        ...candidates.map((entry) => ({
          value: entry.itemId,
          label: t('fossil_candidate_label', {
            item: t(`item.${entry.itemId}.name`),
            species: t(`pokemon.${entry.speciesId}`),
            count: entry.quantity
          })
        }))
      ],
      value: ''
    });
    this.addChild(new UIContainer({
      className: 'pw-hatchery-action-row',
      children: [select, new UIButton({
        variant: 'primary',
        text: t('fossil_revive_btn'),
        onClick: () => {
          if (select.getValue()) system.revive(select.getValue());
        }
      })]
    }));
  }
}
