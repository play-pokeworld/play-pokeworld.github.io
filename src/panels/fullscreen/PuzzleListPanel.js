/**
 * @file PuzzleListPanel.js
 * @brief Full-screen list of the puzzles physically present at the current location.
 */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { ModalIds } from '../../config/ModalIds.js';
import { PuzzleSystem } from '../../systems/PuzzleSystem.js';
import { LocationSystem } from '../../systems/LocationSystem.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { PuzzleSolvedEvent } from '../../core/events/PuzzleSolvedEvent.js';
import { LocationChangedEvent } from '../../core/events/LocationChangedEvent.js';
import { PuzzleCard } from '../components/PuzzleCard.js';
import { t } from '../../localization/LocalizationManager.js';

export class PuzzleListPanel extends UIFullscreenPanel {
  constructor() {
    super({ id: ModalIds.PUZZLES, title: t('puzzles.generic.panel_title'), name: 'PuzzleListPanel' });
    this._locationId = null;
    this.listen(PuzzleSolvedEvent, () => {
      if (this.isOpen()) this._render();
    });
    this.listen(LocationChangedEvent, () => {
      if (this.isOpen()) this.close();
    });
  }

  /** @override @param {{locationId?:string}} [params={}] */
  onOpen({ locationId } = {}) {
    const current = LocationSystem.getInstance().getCurrentLocationId();
    this._locationId = locationId === current ? locationId : current;
    this.setTitle(t('puzzles.generic.panel_title'));
    this._render();
  }

  /** @override */
  onClose() {
    this._locationId = null;
  }

  /** @private */
  _render() {
    const entries = PuzzleSystem.getInstance().getPuzzlesAtLocation(this._locationId || '');
    if (entries.length === 0) {
      this.setContent([new UIText({ tagName: 'div', className: 'pw-empty-state-md', text: t('puzzles.generic.nothing_here') })]);
      return;
    }
    const list = new UIContainer({ className: 'pw-puzzle-list' });
    for (const entry of entries) {
      list.addChild(new PuzzleCard({
        ...entry,
        onOpen: (puzzleId) => EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.PUZZLE_SOLVE, { puzzleId })
        )
      }));
    }
    this.setContent([
      new UIText({ className: 'pw-puzzle-list-hint', text: t('puzzles.generic.list_hint') }),
      list
    ]);
  }
}
