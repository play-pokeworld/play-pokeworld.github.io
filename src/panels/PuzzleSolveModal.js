/**
 * @file PuzzleSolveModal.js
 * @brief Localized sequence, code, Braille, wait, and party puzzle interaction.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UITextInput } from '../ui/UITextInput.js';
import { QuestRewardsView } from './components/QuestRewardsView.js';
import { PuzzleDB } from '../data/quests/PuzzleDB.js';
import { PuzzleSystem, PuzzleOutcomes } from '../systems/PuzzleSystem.js';
import { PuzzleRules } from '../config/PuzzleRules.js';
import { PuzzleTypes } from '../config/PuzzleTypes.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { t } from '../localization/LocalizationManager.js';

export class PuzzleSolveModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.PUZZLE_SOLVE,
      title: t('puzzles.generic.panel_title'),
      size: 'md',
      bodyClassName: 'pw-puzzle-solve-modal',
      name: 'PuzzleSolveModal'
    });
    this._puzzleId = null;
    this._selectedKeys = [];
    this._answer = '';
    this._options = [];
    this._startedAtMs = 0;
    this._feedbackKey = null;
    this._result = null;
    this.listen(LocationChangedEvent, () => {
      if (this.isOpen()) this.close();
    });
  }

  /** @override @param {{puzzleId?:string}} [params={}] */
  onEnter({ puzzleId } = {}) {
    super.onEnter();
    this._puzzleId = typeof puzzleId === 'string' ? puzzleId : null;
    this._selectedKeys = [];
    this._answer = '';
    this._options = PuzzleSystem.getInstance().getShuffledOptions(this._puzzleId || '');
    this._startedAtMs = Date.now();
    this._feedbackKey = null;
    this._result = null;
    this._render();
  }

  /** @override */
  onExit() {
    super.onExit();
    this._puzzleId = null;
    this._selectedKeys = [];
    this._answer = '';
    this._options = [];
    this._startedAtMs = 0;
    this._feedbackKey = null;
    this._result = null;
  }

  /** @private */
  _render() {
    this.clearChildren();
    const puzzle = PuzzleDB.getInstance().getById(this._puzzleId);
    if (!puzzle) {
      this.setTitle(t('puzzles.generic.panel_title'));
      this.addChild(new UIText({ className: 'pw-puzzle-feedback is-error', text: t('puzzles.generic.unavailable') }));
      return;
    }
    this.setTitle(t(puzzle.titleKey));
    this.addChildren([
      new UIText({ className: 'pw-puzzle-summary', text: t(puzzle.summaryKey) }),
      new UIContainer({
        className: 'pw-puzzle-clue',
        children: [
          new UIText({ tagName: 'span', className: 'pw-puzzle-clue-label', text: t('puzzles.generic.clue_label') }),
          new UIText({ tagName: 'div', className: 'pw-puzzle-clue-text', text: t(puzzle.clueKey) })
        ]
      })
    ]);
    if (puzzle.brailleCells?.length) {
      this.addChild(new UIContainer({
        className: 'pw-puzzle-braille',
        children: [
          new UIText({ tagName: 'span', className: 'pw-puzzle-braille-label', text: t('puzzles.generic.braille_label') }),
          new UIText({ className: 'pw-puzzle-braille-cells', text: puzzle.brailleCells.join(' ') })
        ]
      }));
    }

    if (LocationSystem.getInstance().getCurrentLocationId() !== puzzle.locationId) {
      this.addChild(new UIText({ className: 'pw-puzzle-feedback is-error', text: t('puzzles.generic.unavailable') }));
      return;
    }
    const status = PuzzleSystem.getInstance().getStatus(puzzle.id);
    if (status === PuzzleOutcomes.NO_SAVE) {
      this.addChild(new UIText({ className: 'pw-puzzle-feedback is-error', text: t('puzzles.generic.no_save') }));
      return;
    }
    if (status === PuzzleOutcomes.LOCKED) {
      this.addChild(new UIText({ className: 'pw-puzzle-feedback is-locked', text: t('puzzles.generic.lock_line') }));
      return;
    }
    if (status === PuzzleOutcomes.SOLVED && !this._result) {
      this.addChild(new UIText({ className: 'pw-puzzle-previously-solved', text: t('puzzles.generic.previously_solved') }));
    }

    if (this._feedbackKey) {
      this.addChild(new UIText({ className: 'pw-puzzle-feedback is-error', text: t(this._feedbackKey) }));
    }
    if (this._result) {
      this._renderResult(puzzle);
      return;
    }
    if (puzzle.type === PuzzleTypes.SEQUENCE) this._renderSequence(puzzle);
    else if ([PuzzleTypes.CODE, PuzzleTypes.BRAILLE].includes(puzzle.type)) this._renderCode(puzzle);
    else if (puzzle.type === PuzzleTypes.WAIT) this._renderWait(puzzle);
    else if (puzzle.type === PuzzleTypes.PARTY) this._renderParty();
  }

  /** @private @param {Readonly<Object>} puzzle */
  _renderSequence(puzzle) {
    const labels = new Map(puzzle.options.map((option) => [option.key, t(option.labelKey)]));
    const selection = this._selectedKeys.map((key) => labels.get(key) || key).join(' · ');
    this.addChild(new UIText({ className: 'pw-puzzle-instructions', text: t('puzzles.generic.sequence_hint') }));
    this.addChildren([
      new UIText({ tagName: 'div', className: 'pw-puzzle-selection-label', text: t('puzzles.generic.selected_sequence') }),
      new UIText({ className: 'pw-puzzle-selection', text: selection || t('puzzles.generic.empty_sequence') }),
      new UIText({ className: 'pw-puzzle-progress', text: t('puzzles.generic.progress', {
        value: this._selectedKeys.length,
        max: puzzle.solutionKeys.length
      }) })
    ]);

    const choices = new UIContainer({ className: 'pw-puzzle-options' });
    for (const option of this._options) {
      choices.addChild(new UIButton({
        variant: 'secondary',
        className: this._selectedKeys.includes(option.key) ? 'is-selected' : '',
        text: t(option.labelKey),
        onClick: () => this._selectOption(option.key)
      }));
    }
    this.addChild(choices);
    this.addChild(new UIContainer({
      className: 'pw-puzzle-actions',
      children: [
        new UIButton({ variant: 'hbtn', text: t('puzzles.generic.submit'), onClick: () => this._submitSequence() }),
        this._selectedKeys.length > 0 && new UIButton({
          variant: 'secondary',
          text: t('puzzles.generic.reset'),
          onClick: () => {
            this._selectedKeys = [];
            this._feedbackKey = null;
            this._render();
          }
        }),
        new UIButton({ variant: 'ghost', text: t('puzzles.generic.leave'), onClick: () => this.close() })
      ]
    }));
  }

  /** @private @param {Readonly<Object>} puzzle */
  _renderCode(puzzle) {
    const input = new UITextInput({
      id: 'pw-puzzle-answer-input',
      value: this._answer,
      placeholder: t('puzzles.generic.code_placeholder'),
      maxLength: PuzzleRules.CODE_INPUT_MAX_LENGTH,
      className: 'pw-puzzle-code-input',
      onInput: (value) => { this._answer = value; },
      onSubmit: (value) => this._submitCode(value)
    });
    input.setAriaLabel(t('puzzles.generic.code_placeholder'));
    this.addChildren([
      new UIText({ className: 'pw-puzzle-instructions', text: t('puzzles.generic.code_hint') }),
      input,
      new UIContainer({
        className: 'pw-puzzle-actions',
        children: [
          new UIButton({ variant: 'hbtn', text: t('puzzles.generic.submit'), onClick: () => this._submitCode(input.getValue()) }),
          new UIButton({ variant: 'ghost', text: t('puzzles.generic.leave'), onClick: () => this.close() })
        ]
      })
    ]);
  }

  /** @private @param {Readonly<Object>} puzzle */
  _renderWait(puzzle) {
    this.addChildren([
      new UIText({ className: 'pw-puzzle-instructions', text: t('puzzles.generic.wait_hint', { seconds: puzzle.waitSeconds }) }),
      new UIContainer({
        className: 'pw-puzzle-actions',
        children: [
          new UIButton({ variant: 'hbtn', text: t('puzzles.generic.submit'), onClick: () => this._submitWait() }),
          new UIButton({ variant: 'ghost', text: t('puzzles.generic.leave'), onClick: () => this.close() })
        ]
      })
    ]);
  }

  /** @private */
  _renderParty() {
    this.addChildren([
      new UIText({ className: 'pw-puzzle-instructions', text: t('puzzles.generic.party_hint') }),
      new UIContainer({
        className: 'pw-puzzle-actions',
        children: [
          new UIButton({ variant: 'hbtn', text: t('puzzles.generic.submit'), onClick: () => this._submitParty() }),
          new UIButton({ variant: 'ghost', text: t('puzzles.generic.leave'), onClick: () => this.close() })
        ]
      })
    ]);
  }

  /** @private @param {string} key */
  _selectOption(key) {
    const puzzle = PuzzleDB.getInstance().getById(this._puzzleId);
    if (!puzzle || puzzle.type !== PuzzleTypes.SEQUENCE || !puzzle.options.some((option) => option.key === key)) return;
    this._selectedKeys.push(key);
    if (this._selectedKeys.length > puzzle.solutionKeys.length) {
      this._selectedKeys = this._selectedKeys.slice(-puzzle.solutionKeys.length);
    }
    this._feedbackKey = null;
    this._render();
  }

  /** @private */
  _submitSequence() {
    this._applyResult(PuzzleSystem.getInstance().solveSequence(this._puzzleId, this._selectedKeys));
  }

  /** @private @param {string} value */
  _submitCode(value) {
    this._answer = value;
    this._applyResult(PuzzleSystem.getInstance().solveCode(this._puzzleId, value));
  }

  /** @private */
  _submitWait() {
    this._applyResult(PuzzleSystem.getInstance().solveWait(this._puzzleId, this._startedAtMs));
  }

  /** @private */
  _submitParty() {
    this._applyResult(PuzzleSystem.getInstance().solveParty(this._puzzleId));
  }

  /** @private @param {Object} result */
  _applyResult(result) {
    if (result.result === PuzzleOutcomes.INCORRECT) {
      this._selectedKeys = [];
      this._feedbackKey = 'puzzles.generic.try_again';
    } else if (result.result === PuzzleOutcomes.SOLVED_FIRST || result.result === PuzzleOutcomes.SOLVED_AGAIN) {
      this._result = result;
      this._feedbackKey = null;
    } else {
      const key = result.result === PuzzleOutcomes.LOCKED
        ? 'puzzles.generic.lock_line'
        : result.result === PuzzleOutcomes.NO_SAVE
          ? 'puzzles.generic.no_save'
          : 'puzzles.generic.unavailable';
      this._feedbackKey = key;
    }
    this._render();
  }

  /** @private @param {Readonly<Object>} puzzle */
  _renderResult(puzzle) {
    const first = this._result.firstTime === true;
    const message = first
      ? t('puzzles.generic.success_first', { message: t(puzzle.successTextKey) })
      : t('puzzles.generic.success_repeat');
    this.addChild(new UIText({ className: 'pw-puzzle-success', text: message }));
    const rewards = new QuestRewardsView();
    rewards.setRewards({ currencies: { money: this._result.money }, items: this._result.items });
    if (rewards.getChildren().length > 0) {
      this.addChildren([
        new UIText({ className: 'pw-puzzle-reward-label', text: t('puzzles.generic.result_reward') }),
        rewards
      ]);
    }
    this.addChild(new UIButton({ variant: 'hbtn', text: t('puzzles.generic.leave'), onClick: () => this.close() }));
  }
}
