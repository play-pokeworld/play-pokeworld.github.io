/**
 * @file PuzzleCard.js
 * @brief Exploration puzzle card with explicit prerequisite and completion states.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { PuzzleDB } from '../../data/quests/PuzzleDB.js';
import { t } from '../../localization/LocalizationManager.js';

const STATUS_KEYS = Object.freeze({
  locked: 'puzzles.generic.status_locked',
  solved: 'puzzles.generic.status_solved',
  open: 'puzzles.generic.status_open'
});

export class PuzzleCard extends UIContainer {
  /** @param {{puzzle:Readonly<Object>,status:string,onOpen:(id:string)=>void}} options */
  constructor({ puzzle, status, onOpen }) {
    const state = status === 'solved' ? 'solved' : status === 'locked' ? 'locked' : 'open';
    super({ className: `pw-puzzle-card pw-puzzle-card--${state}`, name: 'PuzzleCard' });
    this.addChild(new UIIcon({ name: puzzle.icon || 'star', className: 'pw-puzzle-card-icon' }));
    this.addChildren([
      new UIContainer({
        className: 'pw-puzzle-card-main',
        children: [
          new UIContainer({
            className: 'pw-puzzle-card-heading',
            children: [
              new UIText({ tagName: 'h3', className: 'pw-puzzle-card-title', text: t(puzzle.titleKey) }),
              new UIText({ tagName: 'span', className: 'pw-puzzle-card-status', text: t(STATUS_KEYS[state]) })
            ]
          }),
          new UIText({ className: 'pw-puzzle-card-summary', text: t(puzzle.summaryKey) })
        ]
      })
    ]);

    if (state === 'locked') {
      const requiredNames = puzzle.requires
        .map((id) => PuzzleDB.getInstance().getById(id))
        .filter(Boolean)
        .map((required) => t(required.titleKey))
        .join(', ');
      this.addChild(new UIText({ className: 'pw-puzzle-card-lock', text: t('puzzles.generic.lock_line') }));
      if (requiredNames) {
        this.addChild(new UIText({ className: 'pw-puzzle-card-requires', text: t('puzzles.generic.requires', { puzzles: requiredNames }) }));
      }
    } else {
      this.addChild(new UIButton({
        variant: state === 'solved' ? 'secondary' : 'hbtn',
        size: 'sm',
        text: t(state === 'solved' ? 'puzzles.generic.return' : 'puzzles.generic.approach'),
        onClick: () => onOpen(puzzle.id)
      }));
    }
  }
}
