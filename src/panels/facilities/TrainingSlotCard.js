/** @file TrainingSlotCard.js @brief Persistent assignment card, unlocked mode grid and explicit removal. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIPokemonSprite } from '../../ui/UIPokemonSprite.js';
import { TrainingModeCard } from './TrainingModeCard.js';
import { FacilityAutomationToggle } from './FacilityAutomationToggle.js';
import { FacilityStaffSystem } from '../../systems/FacilityStaffSystem.js';
import { TrainingSystem } from '../../systems/TrainingSystem.js';
import { FacilityPokemonSelectionSystem } from '../../systems/FacilityPokemonSelectionSystem.js';
import { BattleSystem } from '../../systems/BattleSystem.js';
import { TrainingRules } from '../../config/TrainingRules.js';
import { FacilityUiRules } from '../../config/FacilityUiRules.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../../config/ModalIds.js';
import { t } from '../../localization/LocalizationManager.js';

export class TrainingSlotCard extends UIContainer {
  /** @param {number} index */
  constructor(index) {
    super({
      className: 'training-slot-card pw-facility-slot-card',
      name: 'TrainingSlotCard',
    });
    this._index = index;
    this._uid = '';
    this._sprite = new UIPokemonSprite({
      loading: 'eager',
      species: '',
      size: 'context',
      className: 'pw-training-slot-sprite',
    });
    this._pokemonName = new UIText({ tagName: 'strong' });
    this._metadata = new UIText({
      tagName: 'small',
      className: 'training-slot-metadata',
    });
    this._status = new UIText({
      tagName: 'div',
      className: 'pw-facility-subtle',
    });
    this._result = new UIText({
      tagName: 'div',
      className: 'pw-training-result',
    });
    this._choose = new UIButton({
      text: t('training_slot_choose'),
      icon: 'box',
      className: 'hbtn',
      size: 'sm',
      onClick: () =>
        FacilityPokemonSelectionSystem.getInstance().openSelection(
          'training',
          index,
          { replace: Boolean(this._uid) },
        ),
    });
    this._remove = new UIButton({
      text: t('facility_remove_short'),
      className: 'hbtn pw-btn-danger',
      size: 'sm',
      onClick: () => TrainingSystem.getInstance().clearSlot(index),
    });
    this._remove.setAriaLabel(t('facility_remove'));
    this._cancel = new UIButton({
      text: t('training_slot_cancel'),
      variant: 'danger',
      size: 'sm',
      onClick: () => TrainingSystem.getInstance().cancelSession(index),
    });
    this._info = new UIButton({
      icon: 'info',
      variant: 'ghost',
      size: 'sm',
      onClick: () =>
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.POKEMON_INFO, {
            pokemonUid: this._uid,
          }),
        ),
    });
    this._info.setAriaLabel(t('pokemon_info_panel'));
    this._modes = new Map();
    this._grid = new UIContainer({ className: 'training-mode-grid' });
    for (const id of FacilityUiRules.MODE_DISPLAY_ORDER) {
      const button = new TrainingModeCard(id, () =>
        TrainingSystem.getInstance().startSession(this._uid, id, index),
      );
      this._modes.set(id, button);
      this._grid.addChild(button);
    }
    this._auto = new FacilityAutomationToggle({
      icon: 'dumbbell',
      titleKey: 'facility_auto_training',
      descriptionKey: 'facility_auto_training_desc',
      price: { currency: 'questPoint', amount: TrainingRules.AUTOMATION_COST },
      onBuy: () => TrainingSystem.getInstance().buyAutomation(index),
      onToggle: () => TrainingSystem.getInstance().toggleAutomation(index),
    });
    this._auto.addClass('pw-training-slot-automation');
    this._locked = new UIText({
      tagName: 'div',
      className: 'pw-facility-subtle',
    });
    this.addChildren([
      new UIContainer({
        className: 'training-slot-head',
        children: [
          new UIText({
            tagName: 'b',
            text: t('training_slot_title', { slot: index + 1 }),
          }),
          this._status,
        ],
      }),
      (this._pokemonRow = new UIContainer({
        className: 'training-slot-pokemon',
        children: [
          this._sprite,
          new UIContainer({
            className: 'pw-facility-slot-info',
            children: [this._pokemonName, this._metadata],
          }),
          this._info,
        ],
      })),
      new UIContainer({
        className: 'pw-facility-actions',
        children: [this._choose, this._remove, this._cancel],
      }),
      this._auto,
      this._result,
      this._grid,
      this._locked,
    ]);
    this.setData('slotIndex', index);
  }
  /** @param {Object} entry */
  setEntry(entry) {
    const pokemon = entry.pokemon;
    this._uid = pokemon?.uid || '';
    this._pokemonRow.setVisible(Boolean(pokemon));
    if (pokemon) {
      this._sprite.setSpecies(pokemon.species, pokemon.form, pokemon.shiny);
      this._sprite.setAlt(pokemon.getDisplayName());
    }
    this._pokemonName.setText(
      pokemon
        ? t('facility_pokemon_level', {
            name: pokemon.getDisplayName(),
            level: pokemon.level,
          })
        : t('training_slot_empty'),
    );
    this._status.setText(
      t(
        entry.active
          ? 'training_slot_active'
          : pokemon
            ? 'facility_training_ready'
            : 'training_slot_empty',
      ),
    );
    this._metadata.setText(
      entry.metadata
        ? t('facility_training_stats', {
            ev: entry.metadata.evs,
            tal: entry.metadata.talents,
            total: entry.metadata.talentTotal,
            moves: entry.metadata.moves,
          })
        : '',
    );
    if (this._hasPokemon !== Boolean(pokemon)) {
      this._hasPokemon = Boolean(pokemon);
      this._choose.setIcon(pokemon ? '' : 'box');
    }
    this._choose.setVisible(!entry.active);
    this._choose.setText(
      t(pokemon ? 'training_slot_change' : 'training_slot_choose'),
    );
    this._auto.setVisible(Boolean(pokemon));
    this._auto.setModel({
      purchased: entry.autoPurchased,
      enabled: entry.autoEnabled,
      fee: FacilityStaffSystem.getInstance().getFee(
        'training',
        TrainingRules.AUTOMATION_FEE,
      ),
    });
    this._remove.setVisible(!!pokemon && !entry.active);
    this._cancel.setVisible(entry.active);
    this._info.setVisible(!!pokemon);
    this._grid.setVisible(!!pokemon && !entry.active);
    const battleActive = BattleSystem.getInstance().isActive();
    for (const mode of entry.modes) {
      const button = this._modes.get(mode.id);
      button.setModel(mode, battleActive || entry.active);
    }
    this._locked.setVisible(false);
    this._locked.setText(
      t(
        battleActive
          ? 'training_battle_active'
          : 'facility_training_unlock_hint',
      ),
    );
    this._result.setVisible(!!entry.result);
    const result = entry.result;
    if (result) {
      const reward = result.reward;
      const rewardLabel = reward?.move
        ? t(`move.${reward.move}`)
        : reward?.talent
          ? reward.talentNew == null
            ? t(`talent.${reward.talent}.name`)
            : t('facility_reward_talent', {
                state: t(reward.talentNew ? 'new_talent' : 'talent_confirmed'),
                name: t(`talent.${reward.talent}.name`),
              })
          : reward?.levels
            ? t('facility_reward_levels', { count: reward.levels })
            : reward?.evs
              ? t('facility_reward_ev', {
                  stat: t(`stat_${reward.stat}`),
                  count: reward.evs,
                })
              : t('training_reward_none');
      this._result.setText(
        result.result === 'cancelled'
          ? t('training_session_cancelled')
          : result.success
            ? t('training_result_success', {
                name: pokemon?.getDisplayName() || result.pokemonName || '',
                reward: rewardLabel,
              })
            : t('training_result_failed', {
                name: pokemon?.getDisplayName() || result.pokemonName || '',
              }),
      );
      this._result.toggleClass('is-success', result.success);
      this._result.toggleClass('is-failure', !result.success);
    }
    this.toggleClass('is-active', entry.active);
    this.toggleClass('is-empty', !pokemon);
  }
}
