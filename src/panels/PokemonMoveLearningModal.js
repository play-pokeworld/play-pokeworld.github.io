/**
 * @file PokemonMoveLearningModal.js
 * @brief Chooses an empty or replaced move slot from a Pokémon's information sheet.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { ModalIds } from '../config/ModalIds.js';
import { MoveConfig } from '../config/MoveConfig.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { MoveLearningResults } from '../config/ItemUseRules.js';
import { MoveLearningSystem } from '../systems/MoveLearningSystem.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { PokemonUsageChangedEvent } from '../core/events/PokemonUsageChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class PokemonMoveLearningModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.MOVE_LEARN,
      title: t('pokemon_move_learning_title'),
      size: 'sm',
      overlayClassName: 'pw-move-learning-overlay',
      bodyClassName: 'pw-move-learning-modal',
      name: 'PokemonMoveLearningModal'
    });
    this._uid = null;
    this._moveId = null;
    this._feedbackKey = null;
    for (const eventClass of [TeamChangedEvent, BoxChangedEvent, PokemonUsageChangedEvent, BattleStartedEvent, BattleEndedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {{pokemonUid?:string,moveId?:string}} [params={}] */
  onEnter({ pokemonUid, moveId } = {}) {
    super.onEnter();
    this._uid = typeof pokemonUid === 'string' ? pokemonUid : null;
    this._moveId = typeof moveId === 'string' ? moveId : null;
    this._feedbackKey = null;
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._uid = null;
    this._moveId = null;
    this._feedbackKey = null;
  }

  /** @private */
  _render() {
    this.clearChildren();
    const system = MoveLearningSystem.getInstance();
    const pokemon = this._uid ? system.getPokemon(this._uid) : null;
    const move = this._moveId ? MoveDB.getInstance().getById(this._moveId) : null;
    if (!pokemon || !move || !system.getLearnableMoveIds(pokemon).includes(this._moveId)) {
      this.addChild(new UIText({ className: 'pw-move-learning-feedback is-error', text: t('pokemon_move_learning_unavailable') }));
      this.addChild(new UIButton({ variant: 'ghost', text: t('modal_close_btn'), onClick: () => this.close() }));
      return;
    }

    this.setTitle(t('pokemon_move_learning_heading', {
      name: pokemon.getDisplayName(),
      move: t(`move.${this._moveId}`)
    }));
    this.addChild(new UIText({ className: 'pw-move-learning-instruction', text: t('pokemon_move_learning_choose_slot') }));
    if (this._feedbackKey) this.addChild(new UIText({ className: 'pw-move-learning-feedback is-error', text: t(this._feedbackKey) }));
    const lockKey = system.isBattleLocked()
      ? 'pokemon_move_learning_battle_locked'
      : system.isUsageLocked(pokemon.uid) ? 'pokemon_move_learning_in_use' : null;
    if (lockKey) {
      this.addChild(new UIText({ className: 'pw-move-learning-feedback is-locked', text: t(lockKey) }));
    }

    const options = new UIContainer({ className: 'pw-move-learning-slots' });
    const canChange = !lockKey;
    if (pokemon.moves.length < MoveConfig.ACTIVE_SLOTS) {
      options.addChild(new UIContainer({
        className: 'pw-move-learning-slot',
        children: [
          new UIContainer({
            className: 'pw-move-learning-slot-info',
            children: [
              new UIText({ tagName: 'strong', text: t('pokemon_move_learning_empty_slot') }),
              new UIText({ tagName: 'span', text: t('pokemon_move_learning_add_description') })
            ]
          }),
          new UIButton({
            variant: 'hbtn',
            size: 'sm',
            text: t('pokemon_move_learning_add'),
            disabled: !canChange,
            onClick: () => this._learn(null)
          })
        ]
      }));
    }

    pokemon.moves.forEach((moveId, slot) => {
      const oldMove = MoveDB.getInstance().getById(moveId);
      const label = oldMove ? t(`move.${moveId}`) : moveId;
      options.addChild(new UIContainer({
        className: 'pw-move-learning-slot',
        children: [
          new UIContainer({
            className: 'pw-move-learning-slot-info',
            children: [
              new UIText({ tagName: 'strong', text: t('pokemon_move_learning_replace_slot', { slot: slot + 1 }) }),
              new UIText({ tagName: 'span', text: label })
            ]
          }),
          new UIButton({
            variant: 'secondary',
            size: 'sm',
            text: t('pokemon_move_learning_replace'),
            disabled: !canChange,
            onClick: () => this._learn(slot)
          })
        ]
      }));
    });
    this.addChildren([
      options,
      new UIButton({ variant: 'ghost', text: t('modal_close_btn'), onClick: () => this.close() })
    ]);
  }

  /** @private @param {number|null} replaceSlot */
  _learn(replaceSlot) {
    const result = MoveLearningSystem.getInstance().learnMove(
      this._uid,
      this._moveId,
      replaceSlot
    );
    if (result.result === MoveLearningResults.SUCCESS) {
      this.close();
      return;
    }
    this._feedbackKey = ({
      [MoveLearningResults.NO_SAVE]: 'pokemon_move_learning_no_save',
      [MoveLearningResults.TARGET_MISSING]: 'pokemon_move_learning_unavailable',
      [MoveLearningResults.MOVE_UNKNOWN]: 'pokemon_move_learning_unavailable',
      [MoveLearningResults.MOVE_NOT_AVAILABLE]: 'pokemon_move_learning_unavailable',
      [MoveLearningResults.BATTLE_ACTIVE]: 'pokemon_move_learning_battle_locked',
      [MoveLearningResults.POKEMON_IN_USE]: 'pokemon_move_learning_in_use',
      [MoveLearningResults.REPLACEMENT_REQUIRED]: 'pokemon_move_learning_choose_slot',
      [MoveLearningResults.INVALID_SLOT]: 'pokemon_move_learning_unavailable'
    })[result.result] || 'pokemon_move_learning_unavailable';
    this._render();
  }
}
