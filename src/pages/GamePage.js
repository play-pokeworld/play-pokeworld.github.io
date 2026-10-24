/**
 * @file GamePage.js
 * @brief Game screen: header, mobile navigation, three-column dashboard and modals
 * (C++: class GamePage : public BasePage). Composition only: every window and modal is its own class,
 * created here with `new` and never referenced afterwards (windows talk through the EventBus;
 * modals open themselves on a ModalOpenRequestedEvent).
 */

import { FacilityManagementModal } from '../panels/facilities/FacilityManagementModal.js';
import { FossilPickerModal } from '../panels/facilities/FossilPickerModal.js';
import { FossilLabModal } from '../panels/facilities/FossilLabModal.js';
import { BasePage } from './BasePage.js';
import { UIText } from '../ui/UIText.js';
import { PokemonBackgroundView } from '../ui/PokemonBackgroundView.js';
import { DashboardView } from '../ui/dashboard/DashboardView.js';
import { MobileDashboardNav } from '../ui/dashboard/MobileDashboardNav.js';
import { DashboardLayoutSystem } from '../systems/DashboardLayoutSystem.js';
import { HeaderPanel } from '../panels/HeaderPanel.js';
import { StoryPanel } from '../panels/StoryPanel.js';
import { AchievementsPanel } from '../panels/AchievementsPanel.js';
import { ActiveTeamPanel } from '../panels/ActiveTeamPanel.js';
import { HatcheryPanel } from '../panels/HatcheryPanel.js';
import { MinePanel } from '../panels/MinePanel.js';
import { MapPanel } from '../panels/MapPanel.js';
import { MapHelpModal } from '../panels/MapHelpModal.js';
import { BattlePanel } from '../panels/BattlePanel.js';
import { BattleSummaryModal } from '../panels/BattleSummaryModal.js';
import { NpcTalkModal } from '../panels/NpcTalkModal.js';
import { RepeatableQuestModal } from '../panels/RepeatableQuestModal.js';
import { RepeatableSlotUpgradeModal } from '../panels/RepeatableSlotUpgradeModal.js';
import { SecretBasePanel } from '../panels/SecretBasePanel.js';
import { SecretBaseVisitModal } from '../panels/SecretBaseVisitModal.js';
import { ShortcutsPanel } from '../panels/ShortcutsPanel.js';
import { CurrenciesPanel } from '../panels/CurrenciesPanel.js';
import { PokeballsPanel } from '../panels/PokeballsPanel.js';
import { LocationPanel } from '../panels/LocationPanel.js';
import { TrainingCenterPanel } from '../panels/TrainingCenterPanel.js';
import { TeamModal } from '../panels/TeamModal.js';
import { TeamPresetsPanel } from '../panels/fullscreen/TeamPresetsPanel.js';
import { TeamPresetEditorModal } from '../panels/team-presets/TeamPresetEditorModal.js';
import { PokemonInfoModal } from '../panels/PokemonInfoModal.js';
import { PokemonMoveLearningModal } from '../panels/PokemonMoveLearningModal.js';
import { SettingsModal } from '../panels/settings/SettingsModal.js';
import { BallFilterEditorModal } from '../panels/BallFilterEditorModal.js';
import { BallPickerModal } from '../panels/BallPickerModal.js';
import { MarketPanel } from '../panels/fullscreen/MarketPanel.js';
import { ShopPanel } from '../panels/fullscreen/ShopPanel.js';
import { BadgesPanel } from '../panels/fullscreen/BadgesPanel.js';
import { BagPanel } from '../panels/fullscreen/BagPanel.js';
import { BoxPanel } from '../panels/fullscreen/BoxPanel.js';
import { PokedexPanel } from '../panels/fullscreen/PokedexPanel.js';
import { GuidePanel } from '../panels/fullscreen/GuidePanel.js';
import { DictionaryPanel } from '../panels/fullscreen/DictionaryPanel.js';
import { DictionaryDetailModal } from '../panels/DictionaryDetailModal.js';
import { PuzzleListPanel } from '../panels/fullscreen/PuzzleListPanel.js';
import { PuzzleSolveModal } from '../panels/PuzzleSolveModal.js';
import { RegionalStarterModal } from '../panels/RegionalStarterModal.js';
import { RegionalStarterSystem } from '../systems/RegionalStarterSystem.js';
import { ItemTargetModal } from '../panels/ItemTargetModal.js';
import { DebugWidget } from '../panels/components/DebugWidget.js';
import { DashboardColumns } from '../config/DashboardLayout.js';
import { t } from '../localization/LocalizationManager.js';

export class GamePage extends BasePage {
  /**
   * @param {Object} [params={}]
   */
  constructor(params = {}) {
    super('GamePage', params);
    this.addClass('pw-game-screen');

    // Dashboard: each window is created with its starting column; within a column,
    // the first window created is at the top. The layout saved by the player is restored on top.
    const dashboard = new DashboardView(DashboardLayoutSystem.getInstance());
    dashboard.addWindows([
      new AchievementsPanel(DashboardColumns.LEFT),
      new PokeballsPanel(DashboardColumns.LEFT),
      new StoryPanel(DashboardColumns.LEFT),
      new ActiveTeamPanel(DashboardColumns.LEFT),
      new HatcheryPanel(DashboardColumns.LEFT),
      new CurrenciesPanel(DashboardColumns.CENTER),
      new MapPanel(DashboardColumns.CENTER),
      new BattlePanel(DashboardColumns.CENTER),
      new SecretBasePanel(DashboardColumns.CENTER),
      new ShortcutsPanel(DashboardColumns.RIGHT),
      new LocationPanel(DashboardColumns.RIGHT),
      new TrainingCenterPanel(DashboardColumns.RIGHT),
      new MinePanel(DashboardColumns.RIGHT)
    ]);

    this.addChildren([
      new PokemonBackgroundView(),
      new HeaderPanel(),
      new MobileDashboardNav(dashboard),
      dashboard,
      // Bottom message line (shown by the mobile CSS only)
      new UIText({ id: 'msg-log', tagName: 'div', text: t('welcome_msg') }),
      new FacilityManagementModal('hatchery'),
      new FacilityManagementModal('training'),
      new FacilityManagementModal('mine'),
      new FossilPickerModal(),
      new FossilLabModal(),
      new TeamModal(),
      new TeamPresetsPanel(),
      new TeamPresetEditorModal(),
      new PokemonInfoModal(),
      new PokemonMoveLearningModal(),
      new BattleSummaryModal(),
      new NpcTalkModal(),
      new MapHelpModal(),
      new PuzzleSolveModal(),
      new SettingsModal(),
      new BallFilterEditorModal(),
      // After the editor: the picker opens above it.
      new BallPickerModal(),
      new RepeatableQuestModal(),
      new RepeatableSlotUpgradeModal(),
      new SecretBaseVisitModal(),
      new ShopPanel(),
      new MarketPanel(),
      new BadgesPanel(),
      new BagPanel(),
      new ItemTargetModal(),
      new BoxPanel(),
      new PokedexPanel(),
      new GuidePanel(),
      new DictionaryPanel(),
      new DictionaryDetailModal(),
      new PuzzleListPanel(),
      new RegionalStarterModal(),
      new DebugWidget()
    ]);
    RegionalStarterSystem.getInstance().requestCurrentRegionStarter();
  }
}
