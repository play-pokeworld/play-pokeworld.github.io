/** @file HatcherySlotCard.js @brief Stable daycare/incubation machine slot; no gameplay gates in the view. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIPokemonSprite } from '../../ui/UIPokemonSprite.js';
import { UIItemSprite } from '../../ui/UIItemSprite.js';
import { UIProgressBar } from '../../ui/UIProgressBar.js';
import { HatcherySystem } from '../../systems/HatcherySystem.js';
import { FacilityPokemonSelectionSystem } from '../../systems/FacilityPokemonSelectionSystem.js';
import { HatcheryRules } from '../../config/HatcheryRules.js';
import { PokemonRules } from '../../config/PokemonRules.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../../config/ModalIds.js';
import { t } from '../../localization/LocalizationManager.js';

export class HatcherySlotCard extends UIContainer {
  /** @param {number} index */
  constructor(index) {
    super({
      className: 'hatchery-slot-card pw-facility-slot-card',
      name: 'HatcherySlotCard',
    });
    this._index = index;
    this._uid = '';
    this._kind = '';
    this._mode = new UIText({ className: 'pw-facility-mode' });
    this._modeButton = new UIButton({
      text: t('hatchery_mode_switch'),
      variant: 'secondary',
      size: 'sm',
      onClick: () => HatcherySystem.getInstance().toggleMode(this._index),
    });
    this._pending = new UIText({
      tagName: 'div',
      className: 'pw-facility-pending',
    });
    this._pokemon = new UIPokemonSprite({
      loading: 'eager',
      species: '',
      size: 'context',
      className: 'pw-hatchery-slot-sprite',
    });
    this._item = new UIItemSprite({
      loading: 'eager',
      itemId: '',
      className: 'pw-hatchery-slot-sprite',
    });
    this._pokemonName = new UIText({ tagName: 'strong' });
    this._description = new UIText({
      tagName: 'div',
      className: 'pw-facility-subtle',
    });
    this._progress = new UIProgressBar({ variant: 'exp', size: 'sm' });
    this._progressText = new UIText({
      tagName: 'div',
      className: 'pw-facility-subtle',
    });
    this._choose = new UIButton({
      text: t('training_slot_choose'),
      className: 'pw-hatchery-offer',
      onClick: () =>
        FacilityPokemonSelectionSystem.getInstance().openSelection(
          'hatchery',
          this._index,
        ),
    });
    this._choose.setAriaLabel(t('training_slot_choose'));
    this._offerHint = new UIText({
      tagName: 'small',
      className: 'pw-hatchery-offer-description',
    });
    this._choose.addChild(this._offerHint);
    this._fossil = new UIButton({
      icon: 'egg',
      className: 'pw-hatchery-fossil-shortcut',
      variant: 'ghost',
      size: 'sm',
      onClick: () =>
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.HATCHERY_FOSSILS, {
            slotIndex: this._index,
          }),
        ),
    });
    this._fossil.setAriaLabel(t('hatchery_select_fossil'));
    this._fossil.setTooltip(t('hatchery_select_fossil'));
    this._withdraw = new UIButton({
      text: t('hatchery_withdraw_btn'),
      variant: 'secondary',
      size: 'sm',
      onClick: () => HatcherySystem.getInstance().withdrawPokemon(this._index),
    });
    this._collect = new UIButton({
      text: t('hatchery_collect_fossil'),
      variant: 'success',
      size: 'sm',
      onClick: () =>
        this._kind === 'fossil'
          ? HatcherySystem.getInstance().collectFossil(this._index)
          : HatcherySystem.getInstance().collectPokemon(this._index),
    });
    this._occupied = new UIContainer({
      className: 'hatchery-slot-main',
      children: [
        this._pokemon,
        this._item,
        new UIContainer({
          className: 'hatchery-slot-info',
          children: [
            new UIText({
              tagName: 'small',
              className: 'pw-hatchery-slot-number',
              text: t('facility_slot_number', { slot: index + 1 }),
            }),
            this._pokemonName,
            this._description,
            this._progress,
            this._progressText,
          ],
        }),
      ],
    });
    this._occupied.setAttribute('role', 'button');
    this._occupied.setAttribute('tabindex', '0');
    this._occupied.setAriaLabel(t('pokemon_info_panel'));
    const showInformation = () => {
      if (this._uid)
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.POKEMON_INFO, {
            pokemonUid: this._uid,
          }),
        );
    };
    this._occupied.addDomListener('click', showInformation);
    this._occupied.addDomListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showInformation();
      }
    });
    this._withdraw.setText(t('facility_remove_short'));
    this._withdraw.setAriaLabel(t('hatchery_withdraw_btn'));
    this._modeButton.addClass('hatchery-mode-toggle');
    this._modeButton.setAriaLabel(t('hatchery_mode_switch'));
    this.addChildren([
      this._occupied,
      new UIContainer({
        className: 'hatchery-slot-footer',
        children: [
          this._withdraw,
          this._collect,
          this._fossil,
          this._modeButton,
        ],
      }),
      this._pending,
      this._choose,
    ]);
    this.setData('slotIndex', index);
  }
  /** @param {Object} entry @param {Object} state */
  setEntry(entry, state) {
    const slot = entry.slot;
    const pokemon = slot?.pokemon;
    const daycare = entry.mode === HatcheryRules.MODE_DAYCARE;
    this._kind = slot?.kind || '';
    this._uid = pokemon?.uid || '';
    this._mode.setText(
      t(daycare ? 'hatchery_mode_daycare' : 'hatchery_mode_incubation'),
    );
    this._modeButton.setVisible(state.modeSwitchUnlocked);
    this._modeButton.setText(
      entry.pendingMode
        ? t('facility_cancel_mode_change')
        : t(daycare ? 'hatchery_mode_daycare' : 'hatchery_mode_incubation'),
    );
    this._pending.setVisible(!!entry.pendingMode);
    this._pending.setText(
      entry.pendingMode
        ? t('facility_pending_mode', {
            mode: t(`hatchery_mode_${entry.pendingMode}`),
          })
        : '',
    );
    this._pokemon.setVisible(!!pokemon);
    this._item.setVisible(slot?.kind === 'fossil');
    this._occupied.setVisible(Boolean(slot));
    if (pokemon) {
      this._pokemon.setSpecies(pokemon.species, pokemon.form, pokemon.shiny);
      this._pokemon.setAlt(pokemon.getDisplayName());
    }
    if (slot?.kind === 'fossil') {
      this._item.setItem(slot.itemId);
      this._item.setAlt(t(`item.${slot.itemId}.name`));
    }
    this._pokemonName.setText(
      pokemon
        ? `${pokemon.getDisplayName()} ${t('facility_slot_number', { slot: entry.index + 1 })}`
        : slot?.kind === 'fossil'
          ? t(`item.${slot.itemId}.name`)
          : '',
    );
    this._description.setVisible(!daycare);
    this._description.setText(
      slot?.kind === 'fossil'
        ? t('hatchery_fossil_species', {
            fossil: t(`item.${slot.itemId}.name`),
            species: t(`pokemon.${slot.speciesId}`),
          })
        : !daycare && !state.breedingUnlocked
          ? t('facility_breeding_gate')
          : t(
              daycare
                ? 'facility_daycare_slot_hint'
                : 'facility_incubation_slot_hint',
            ),
    );
    this._progress.setVisible(!!slot);
    this._progressText.setVisible(!!slot);
    const required = daycare
      ? HatcheryRules.DAYCARE_KOS_PER_LEVEL
      : slot?.required || 1;
    const complete = daycare
      ? pokemon?.level >= PokemonRules.MAX_LEVEL
      : slot?.ready;
    this._progress.setValue(
      complete ? required : Math.min(slot?.knockouts || 0, required),
      required,
    );
    this._progressText.setText(
      daycare
        ? t('facility_hatchery_daycare_status', {
            level: pokemon?.level || 0,
            current: slot?.knockouts || 0,
            required,
          })
        : complete
          ? t('hatchery_fossil_ready')
          : t('hatchery_fossil_progress', {
              current: slot?.knockouts || 0,
              required,
            }),
    );
    this._choose.setVisible(!slot && (daycare || state.breedingUnlocked));
    this._choose.setText(t('hatchery_place_slot', { slot: entry.index + 1 }));
    this._offerHint.setText(
      t(
        daycare
          ? 'facility_hatchery_offer_daycare_short'
          : 'facility_hatchery_offer_incubation_short',
      ),
    );
    this._choose.setTooltip(
      t(
        daycare
          ? 'facility_hatchery_daycare_offer'
          : 'facility_hatchery_incubation_offer',
      ),
    );
    this._fossil.setVisible(!slot && !daycare && state.modeSwitchUnlocked);
    this._withdraw.setVisible(slot?.kind === HatcheryRules.MODE_DAYCARE);
    this._collect.setVisible(!!slot?.ready);
    this._collect.setText(
      t(
        slot?.kind === 'fossil'
          ? 'hatchery_collect_fossil'
          : 'facility_collect_pokemon',
      ),
    );
    this._occupied.setAttribute('role', pokemon ? 'button' : 'group');
    this._occupied.setAttribute('tabindex', pokemon ? '0' : '-1');
    this.toggleClass('is-empty', !slot);
    this.toggleClass('is-exp', daycare);
    this.toggleClass('is-breed', !daycare);
    this.toggleClass('is-done', !!complete);
  }
}
