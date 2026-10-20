/**
 * @file RepeatableQuestModal.js
 * @brief Persisted repeatable-quest offers, active contracts, reroll timer and slot access.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { QuestCard } from './components/QuestCard.js';
import { RepeatableQuestOfferCard } from './components/RepeatableQuestOfferCard.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { RepeatableBoardChangedEvent } from '../core/events/RepeatableBoardChangedEvent.js';
import { QuestActivatedEvent } from '../core/events/QuestActivatedEvent.js';
import { QuestProgressedEvent } from '../core/events/QuestProgressedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { t } from '../localization/LocalizationManager.js';

export class RepeatableQuestModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.REPEATABLE_QUESTS,
      title: t('repeatable_board_title'),
      size: 'lg',
      bodyClassName: 'pw-repeatable-board',
      name: 'RepeatableQuestModal'
    });
    /** @private @type {ReturnType<typeof setInterval>|null} */
    this._rerollTimer = null;

    for (const eventClass of [RepeatableBoardChangedEvent, QuestActivatedEvent, QuestProgressedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
    this.listen(QuestClaimedEvent, () => this._refresh(false));
    this.listen(SaveLoadedEvent, () => this._refresh(true));
    this.listen(LocationChangedEvent, () => this._refresh(true));
  }

  /** @override @param {Object} [params={}] */
  open(params = {}) {
    if (!QuestSystem.getInstance().isRepeatableUnlocked()) return false;
    super.open(params);
    return true;
  }

  /** Rebuilds from the current save on every open. @override */
  onEnter() {
    super.onEnter();
    QuestSystem.getInstance().ensureRepeatableChoices();
    this._render();
    this._rerollTimer = setInterval(() => {
      if (this.isOpen()) this._render();
    }, 1000);
  }

  /** @override */
  onExit() {
    super.onExit();
    if (this._rerollTimer) clearInterval(this._rerollTimer);
    this._rerollTimer = null;
  }

  /** @private @param {boolean} ensureOffers */
  _refresh(ensureOffers = false) {
    if (!this.isOpen()) return;
    const quests = QuestSystem.getInstance();
    if (ensureOffers && quests.isRepeatableUnlocked()) quests.ensureRepeatableChoices();
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const quests = QuestSystem.getInstance();
    const state = quests.getRepeatableBoardState();
    if (!state.unlocked) {
      this.addChild(new UIText({ className: 'pw-repeatable-board-empty', text: t('repeatable_unlock_hint') }));
      return;
    }

    const timer = state.rerollRemainingMs > 0
      ? TextFormatter.formatMinutesSeconds(state.rerollRemainingMs)
      : t('ready');
    const headMeta = new UIContainer({ className: 'pw-repeatable-board-head-meta' });
    headMeta.addChildren([
      new UIText({
        tagName: 'div',
        className: 'pw-repeatable-board-slots',
        text: t('repeatable_board_slots_status', { active: state.activeCount, max: state.slotCount })
      }),
      new UIText({
        tagName: 'div',
        className: 'pw-repeatable-board-timer',
        text: t('repeatable_reroll_timer', { time: timer })
      })
    ]);
    this.addChild(new UIContainer({
      className: 'pw-repeatable-board-head',
      children: [
        headMeta,
        new UIButton({
          variant: 'hbtn',
          icon: 'settings',
          text: t('repeatable_upgrades'),
          onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.REPEATABLE_UPGRADES))
        })
      ]
    }));
    this.addChild(new UIText({ className: 'pw-repeatable-board-intro', text: t('repeatable_board_intro') }));

    const offerSection = new UIContainer({ className: 'pw-repeatable-board-section' });
    offerSection.addChild(new UIText({ tagName: 'h3', className: 'pw-repeatable-board-section-title', text: t('repeatable_offers_heading') }));
    const offers = state.offers.filter((offer) => !offer.active);
    if (offers.length === 0) {
      offerSection.addChild(new UIText({ className: 'pw-repeatable-board-empty', text: t('repeatable_board_no_offers') }));
    } else {
      const grid = new UIContainer({ className: 'pw-repeatable-board-offers' });
      for (const offer of offers) {
        grid.addChild(new RepeatableQuestOfferCard(offer.quest, {
          canAccept: offer.canAccept,
          onAccept: (key) => quests.accept(key)
        }));
      }
      offerSection.addChild(grid);
    }
    this.addChild(offerSection);

    if (state.activeQuests.length > 0) {
      const activeSection = new UIContainer({ className: 'pw-repeatable-board-section' });
      activeSection.addChild(new UIText({ tagName: 'h3', className: 'pw-repeatable-board-section-title', text: t('repeatable_active_heading') }));
      const activeCards = new UIContainer({ className: 'pw-repeatable-board-active' });
      for (const status of state.activeQuests) {
        const card = new QuestCard({
          onClaim: (key) => quests.claim(key),
          onChallenge: () => false
        });
        card.setStatus(status, false);
        activeCards.addChild(card);
      }
      activeSection.addChild(activeCards);
      this.addChild(activeSection);
    }

    const actions = new UIContainer({ className: 'pw-repeatable-board-actions' });
    if (state.rerollRemainingMs <= 0) {
      actions.addChild(new UIButton({
        variant: 'hbtn',
        icon: 'refresh',
        text: t('repeatable_board_reroll'),
        onClick: () => quests.rerollRepeatableChoices()
      }));
    }
    actions.addChild(new UIButton({ variant: 'secondary', text: t('close_btn'), onClick: () => this.close() }));
    this.addChild(actions);
  }
}
