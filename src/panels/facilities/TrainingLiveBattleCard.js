/** @file TrainingLiveBattleCard.js @brief Actual training combatants reuse the canonical battle cards and move charge bars. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { BattleCombatantCard } from '../components/BattleCombatantCard.js';
import { BattleZoneEffects } from '../components/BattleZoneEffects.js';
import { BattleSides } from '../../config/BattleSides.js';
import { FacilityUiRules } from '../../config/FacilityUiRules.js';
import { TrainingSystem } from '../../systems/TrainingSystem.js';
import { t } from '../../localization/LocalizationManager.js';

export class TrainingLiveBattleCard extends UIContainer {
  /** @param {number} index */
  constructor(index) {
    super({
      className: 'pw-training-live-card',
      name: 'TrainingLiveBattleCard',
    });
    this._round = new UIText({ className: 'pw-training-round' });
    this._mode = new UIText({ className: 'pw-facility-subtle' });
    this._player = new BattleCombatantCard({
      side: BattleSides.PLAYER,
      showMoves: true,
    });
    this._foe = new BattleCombatantCard({
      side: BattleSides.FOE,
      showMoves: true,
    });
    this._field = new BattleZoneEffects();
    this.addChildren([
      new UIContainer({
        className: 'pw-facility-title-row',
        children: [
          new UIText({
            tagName: 'h3',
            text: t('training_slot_title', { slot: index + 1 }),
          }),
          this._round,
        ],
      }),
      this._mode,
      this._field,
      new UIContainer({
        className: 'pw-training-live-fighters',
        children: [this._player, this._foe],
      }),
      new UIButton({
        text: t('training_slot_cancel'),
        variant: 'danger',
        size: 'sm',
        onClick: () => TrainingSystem.getInstance().cancelSession(index),
      }),
    ]);
  }
  /** @param {Object} state */
  setState(state) {
    this._round.setText(
      t('training_round_label', {
        round: Math.min(state.opponentsDefeated + 1, state.opponentCount),
        total: state.opponentCount,
      }),
    );
    this._mode.setText(t(FacilityUiRules.MODE_KEYS[state.mode]));
    this._player.setPokemon(state.pokemon, state.foePokemon);
    this._player.setCombatant(state.player);
    this._player.setActive(true);
    this._foe.setPokemon(state.foePokemon, state.pokemon);
    this._foe.setCombatant(state.foe);
    this._field.setField(state.field);
    const percent = (remaining, total) =>
      total > 0 ? 100 * Math.max(0, Math.min(1, 1 - remaining / total)) : 100;
    this._player.setChargeProgress(
      state.player.moveIndex,
      percent(state.playerCooldownMs, state.playerCooldownTotalMs),
    );
    this._foe.setChargeProgress(
      state.foe.moveIndex,
      percent(state.foeCooldownMs, state.foeCooldownTotalMs),
    );
  }
}
