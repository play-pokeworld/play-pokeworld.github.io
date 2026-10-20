/**
 * @file TrainingCenterPanel.js
 * @brief Selects a trainee, starts a six-opponent session, and shows its live progress.
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
import { TrainingRules } from '../config/TrainingRules.js';
import { TrainingSystem } from '../systems/TrainingSystem.js';
import { TrainingBattleChangedEvent } from '../core/events/TrainingBattleChangedEvent.js';
import { TrainingResultChangedEvent } from '../core/events/TrainingResultChangedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class TrainingCenterPanel extends DraggablePanel {
  /** @param {string} column */
  constructor(column) {
    super({
      id: WindowIds.TRAINING,
      column,
      title: t('training_center_title'),
      icon: 'dumbbell',
      bodyId: 'training-window-body',
      bodyClassName: 'pw-static-022 pw-training-body',
      name: 'TrainingCenterPanel'
    });
    this._selectedUid = '';
    for (const eventClass of [
      TrainingBattleChangedEvent, TrainingResultChangedEvent, LocationChangedEvent,
      TeamChangedEvent, BoxChangedEvent, SaveCreatedEvent, SaveLoadedEvent
    ]) this.listen(eventClass, () => this._render());
    this._render();
  }

  /** @override */
  onEnter() {
    super.onEnter();
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const system = TrainingSystem.getInstance();
    const state = system.getSnapshot();
    const candidates = system.getCandidates();
    if (state.active) {
      this.addChild(this._activeSession(state));
      return;
    }
    if (!system.isUnlocked()) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-training-locked', text: t('training_badge_required') }));
      return;
    }
    if (!system.canUseHere()) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-training-locked', text: t('training_location_required', {
        location: t(`location.${TrainingRules.LOCATION_ID}`)
      }) }));
      return;
    }
    if (state.lastResult) this.addChild(this._resultCard(state.lastResult));
    if (candidates.length === 0) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-training-empty', text: t('training_no_candidates') }));
      return;
    }
    if (!candidates.some((candidate) => candidate.uid === this._selectedUid)) this._selectedUid = candidates[0].uid;
    const select = new UIDropdown({
      className: 'pw-training-select',
      options: candidates.map((candidate) => ({
        value: candidate.uid,
        label: t('training_candidate_label', {
          name: candidate.name,
          level: candidate.level,
          source: t(`hatchery_source_${candidate.source}`)
        })
      })),
      value: this._selectedUid,
      onChange: (uid) => { this._selectedUid = uid; }
    });
    this.addChild(new UIText({ tagName: 'div', className: 'pw-training-desc', text: t('training_session_description', {
      count: TrainingRules.OPPONENT_COUNT,
      mode: t('training_mode_move_title')
    }) }));
    this.addChild(new UIContainer({ className: 'pw-training-controls', children: [
      select,
      new UIButton({
        variant: 'primary',
        text: t('training_start_btn'),
        onClick: () => system.startSession(select.getValue(), TrainingRules.MODE_ID)
      })
    ] }));
  }

  /** @private @param {Object} state */
  _activeSession(state) {
    return new UIContainer({
      className: 'pw-training-card pw-training-card--active',
      children: [
        new UIText({ tagName: 'h3', className: 'pw-training-title', text: t('training_live_title') }),
        new UIText({ tagName: 'div', className: 'pw-training-round', text: t('training_round_label', {
          round: Math.min(state.opponentsDefeated + 1, state.opponentCount),
          total: state.opponentCount
        }) }),
        new UIContainer({ className: 'pw-training-fighter', children: [
          new UIImage({ src: AssetPaths.pokemonSprite(state.traineeSpecies), alt: state.traineeName, className: 'pw-training-sprite', pixelated: true }),
          new UIContainer({ className: 'pw-training-fighter-info', children: [
            new UIText({ tagName: 'div', text: t('training_trainee_label', { name: state.traineeName, level: state.traineeLevel }) }),
            new UIProgressBar({ value: state.traineeHp, max: state.traineeMaxHp, variant: 'hp', size: 'sm' }),
            new UIText({ className: 'pw-training-hp-text', text: t('hp_value_over_max', { value: state.traineeHp, max: state.traineeMaxHp }) })
          ] })
        ] }),
        new UIContainer({ className: 'pw-training-fighter pw-training-fighter--foe', children: [
          new UIImage({ src: AssetPaths.pokemonSprite(state.foeSpecies), alt: state.foeName, className: 'pw-training-sprite', pixelated: true }),
          new UIContainer({ className: 'pw-training-fighter-info', children: [
            new UIText({ tagName: 'div', text: t('training_opponent_label', { name: state.foeName, level: state.foeLevel }) }),
            new UIProgressBar({ value: state.foeHp, max: state.foeMaxHp, variant: 'hp', size: 'sm' }),
            new UIText({ className: 'pw-training-hp-text', text: t('hp_value_over_max', { value: state.foeHp, max: state.foeMaxHp }) })
          ] })
        ] }),
        new UIButton({
          variant: 'danger',
          text: t('training_cancel_btn'),
          onClick: () => TrainingSystem.getInstance().cancelSession()
        })
      ]
    });
  }

  /** @private @param {Object} result */
  _resultCard(result) {
    const text = result.success
      ? t('training_result_success', {
        name: result.pokemonName,
        reward: result.rewardMove ? t(`move.${result.rewardMove}.name`) : t('training_reward_none')
      })
      : result.result === 'cancelled'
        ? t('training_session_cancelled')
        : t('training_result_failed', { name: result.pokemonName || '' });
    return new UIContainer({
      className: `pw-training-result${result.success ? ' is-success' : ' is-failure'}`,
      children: [new UIText({ text })]
    });
  }
}
