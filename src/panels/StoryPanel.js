/**
 * @file StoryPanel.js
 * @brief Story & quests window: one QuestCard per active quest, main quest first
 * (C++: class StoryPanel : public DraggablePanel). Reads QuestSystem, never the save directly.
 */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { QuestCard } from './components/QuestCard.js';
import { TutorialCard } from './components/TutorialCard.js';
import { TutorialSystem } from '../systems/TutorialSystem.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { ModalIds } from '../config/ModalIds.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { DashboardWindowFocusRequestedEvent } from '../core/events/DashboardWindowFocusRequestedEvent.js';
import { EventBus } from '../core/EventBus.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { QuestCategories } from '../data/quests/QuestCategories.js';
import { QuestDB } from '../data/quests/QuestDB.js';
import { TrainerSystem } from '../systems/TrainerSystem.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { QuestActivatedEvent } from '../core/events/QuestActivatedEvent.js';
import { QuestProgressedEvent } from '../core/events/QuestProgressedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { RepeatableBoardChangedEvent } from '../core/events/RepeatableBoardChangedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { TutorialProgressChangedEvent } from '../core/events/TutorialProgressChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

const QUEST_SECTIONS = Object.freeze([
  Object.freeze({ category: QuestCategories.MAIN, titleKey: 'guide_main_quests' }),
  Object.freeze({ category: QuestCategories.SIDE, titleKey: 'guide_side_quests' }),
  Object.freeze({ category: QuestCategories.REPEATABLE, titleKey: 'guide_repeatable_quests' })
]);

/** @param {QuestSystem} quests @returns {{region:string,step:number,total:number}|null} */
function getMainQuestProgress(quests) {
  const status = quests.getMainQuest();
  if (!status) return null;
  const region = status.quest.region;
  const chain = QuestDB.getInstance().getMainChain(region);
  const index = chain.findIndex((quest) => quest.key === status.quest.key);
  return index < 0 ? null : { region, step: index + 1, total: chain.length };
}

export class StoryPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.STORY,
      column,
      title: t('story_quests_title'),
      icon: 'book',
      bodyId: 'story-panel',
      bodyClassName: 'pw-static-022',
      name: 'StoryPanel'
    });
    for (const eventClass of [QuestActivatedEvent, QuestProgressedEvent, QuestClaimedEvent, RepeatableBoardChangedEvent, SaveLoadedEvent, LocationChangedEvent, TutorialProgressChangedEvent]) {
      this.listen(eventClass, () => this._render());
    }
    this._render();
  }

  /** @private */
  _render() {
    const quests = QuestSystem.getInstance();
    const repeatableUnlocked = quests.isRepeatableUnlocked();
    const statuses = quests.getActiveQuests().filter((status) =>
      repeatableUnlocked || status.quest.category !== QuestCategories.REPEATABLE
    );
    const mainProgress = getMainQuestProgress(quests);
    const tutorialStatus = TutorialSystem.getInstance().getCardStatus();
    this.clearChildren();
    if (tutorialStatus) {
      const tutorialCard = new TutorialCard(
        (status) => this._performTutorialAction(status),
        () => TutorialSystem.getInstance().setEnabled(false),
        () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.GUIDE))
      );
      tutorialCard.setStatus(tutorialStatus);
      this.addChild(tutorialCard);
    }
    if (statuses.length === 0 && !tutorialStatus) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-empty-center', text: t('story_no_quest') }));
    }
    for (const section of QUEST_SECTIONS) {
      const sectionStatuses = statuses.filter((status) => status.quest.category === section.category);
      if (!sectionStatuses.length) continue;
      const group = new UIContainer({ className: `pw-story-quest-section pw-story-quest-section--${section.category}` });
      group.addChild(new UIText({
        tagName: 'h3',
        className: 'pw-story-quest-section-title',
        text: section.category === QuestCategories.MAIN && mainProgress
          ? t('story_main_quest_progress', {
              region: t(`region_${mainProgress.region}`),
              step: mainProgress.step,
              total: mainProgress.total
            })
          : t(section.titleKey)
      }));
      for (const status of sectionStatuses) {
        const card = new QuestCard({
          onClaim: (key) => this._claim(key),
          onChallenge: (key) => TrainerSystem.getInstance().challengeQuest(key)
        });
        card.setStatus(
          status,
          TrainerSystem.getInstance().isStoryRivalOrTeamOpponent(status.quest.key),
          status.quest.category === QuestCategories.MAIN ? mainProgress?.step ?? null : null
        );
        group.addChild(card);
      }
      this.addChild(group);
    }

    if (repeatableUnlocked) {
      const repeatableAccess = new UIContainer({ className: 'pw-story-repeatable-action' });
      repeatableAccess.addChild(new UIButton({
        variant: 'hbtn',
        icon: 'book',
        text: t('repeatable_board_open'),
        onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.REPEATABLE_QUESTS))
      }));
      this.addChild(repeatableAccess);
    }
  }

  /** @private @param {Object} status */
  _performTutorialAction(status) {
    const bus = EventBus.getInstance();
    switch (status.action) {
      case 'route1':
      case 'viridianforest': {
        const locationId = status.action === 'route1' ? 'route1' : 'viridianforest';
        if (LocationSystem.getInstance().travelTo(locationId)) {
          bus.dispatch(new DashboardWindowFocusRequestedEvent(WindowIds.LOCATION));
        }
        break;
      }
      case 'ball_filters':
        bus.dispatch(new ModalOpenRequestedEvent(ModalIds.BALL_FILTERS));
        break;
      case 'shop': {
        const location = LocationSystem.getInstance();
        if (location.getCurrentLocationId() === 'pallet' || location.travelTo('pallet')) {
          bus.dispatch(new ModalOpenRequestedEvent(ModalIds.SHOP));
        }
        break;
      }
      case 'pokemon_sheet':
        bus.dispatch(new ModalOpenRequestedEvent(ModalIds.POKEMON_INFO, { teamIndex: 0 }));
        break;
      case 'bag':
        bus.dispatch(new ModalOpenRequestedEvent(ModalIds.BAG));
        break;
      case 'pokedex':
        bus.dispatch(new ModalOpenRequestedEvent(ModalIds.POKEDEX, { region: 'kanto' }));
        break;
      case 'currencies':
        bus.dispatch(new DashboardWindowFocusRequestedEvent(WindowIds.CURRENCY));
        break;
      default:
        break;
    }
  }

  /**
   * @private
   * @param {string} questKey
   */
  _claim(questKey) {
    const status = QuestSystem.getInstance().getStatus(questKey);
    if (!status) return;
    const title = t(`quests.${status.quest.category}.${status.quest.id}.title`);
    if (QuestSystem.getInstance().claim(questKey)) {
      NotificationSystem.getInstance().notify(t('quest_reward_claimed', { title }), {
        channel: NotificationChannels.ACHIEVEMENT, tone: NotificationTones.SUCCESS
      });
    }
  }
}
