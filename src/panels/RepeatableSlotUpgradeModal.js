/**
 * @file RepeatableSlotUpgradeModal.js
 * @brief Slot-capacity upgrades for the repeatable quest board.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { QuestRules } from '../config/QuestRules.js';
import { ModalIds } from '../config/ModalIds.js';
import { RepeatableBoardChangedEvent } from '../core/events/RepeatableBoardChangedEvent.js';
import { CurrencyChangedEvent } from '../core/events/CurrencyChangedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { t } from '../localization/LocalizationManager.js';

export class RepeatableSlotUpgradeModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.REPEATABLE_UPGRADES,
      title: t('repeatable_upgrades'),
      size: 'sm',
      bodyClassName: 'pw-repeatable-upgrade-body',
      name: 'RepeatableSlotUpgradeModal'
    });
    for (const eventClass of [RepeatableBoardChangedEvent, CurrencyChangedEvent, SaveLoadedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** @override @param {Object} [params={}] */
  open(params = {}) {
    if (!QuestSystem.getInstance().isRepeatableUnlocked()) return false;
    super.open(params);
    return true;
  }

  /** @override */
  onEnter() {
    super.onEnter();
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const state = QuestSystem.getInstance().getRepeatableBoardState();
    if (!state.unlocked) {
      this.addChild(new UIText({ className: 'pw-repeatable-board-empty', text: t('repeatable_unlock_hint') }));
      this.addChild(new UIButton({ variant: 'secondary', text: t('close_btn'), onClick: () => this.close() }));
      return;
    }
    this.addChild(new UIText({ tagName: 'div', className: 'pw-repeatable-upgrade-current', text: t('repeatable_slots_current', {
      count: state.slotCount,
      max: QuestRules.REPEATABLE_MAX_SLOTS
    }) }));
    this.addChild(new UIText({ tagName: 'div', className: 'pw-repeatable-board-intro', text: t('repeatable_reroll_free_desc') }));

    const cost = QuestRules.REPEATABLE_SLOT_UPGRADE_COSTS[state.slotUpgrades];
    const actions = new UIContainer({ className: 'pw-repeatable-upgrade-actions' });
    if (cost) {
      actions.addChild(new UIButton({
        variant: 'hbtn',
        icon: 'save',
        text: t('repeatable_slot_upgrade_buy', {
          next: state.slotCount + 1,
          price: TextFormatter.formatNumber(cost)
        }),
        onClick: () => QuestSystem.getInstance().upgradeRepeatableSlots()
      }));
    } else {
      this.addChild(new UIText({ className: 'pw-repeatable-board-empty', text: t('repeatable_slots_max') }));
    }
    actions.addChild(new UIButton({ variant: 'secondary', text: t('close_btn'), onClick: () => this.close() }));
    this.addChild(actions);
  }
}
