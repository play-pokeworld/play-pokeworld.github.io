/**
 * @file GamePage.js
 * @brief Game screen: header, mobile navigation, three-column dashboard and modals
 * (C++: class GamePage : public BasePage). Composition only: every window and modal is its own class,
 * created here with `new` and never referenced afterwards (windows talk through the EventBus;
 * modals open themselves on a ModalOpenRequestedEvent).
 */

import { BasePage } from './BasePage.js';
import { UIText } from '../ui/UIText.js';
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
import { BattlePanel } from '../panels/BattlePanel.js';
import { SecretBasePanel } from '../panels/SecretBasePanel.js';
import { ShortcutsPanel } from '../panels/ShortcutsPanel.js';
import { CurrenciesPanel } from '../panels/CurrenciesPanel.js';
import { PokeballsPanel } from '../panels/PokeballsPanel.js';
import { LocationPanel } from '../panels/LocationPanel.js';
import { TrainingCenterPanel } from '../panels/TrainingCenterPanel.js';
import { TeamModal } from '../panels/TeamModal.js';
import { SettingsModal } from '../panels/settings/SettingsModal.js';
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
      new StoryPanel(DashboardColumns.LEFT),
      new AchievementsPanel(DashboardColumns.LEFT),
      new ActiveTeamPanel(DashboardColumns.LEFT),
      new HatcheryPanel(DashboardColumns.LEFT),
      new MinePanel(DashboardColumns.LEFT),

      new MapPanel(DashboardColumns.CENTER),
      new BattlePanel(DashboardColumns.CENTER),
      new SecretBasePanel(DashboardColumns.CENTER),
      
      new ShortcutsPanel(DashboardColumns.RIGHT),
      new CurrenciesPanel(DashboardColumns.RIGHT),
      new PokeballsPanel(DashboardColumns.RIGHT),
      new LocationPanel(DashboardColumns.RIGHT),
      new TrainingCenterPanel(DashboardColumns.RIGHT)
    ]);

    this.addChildren([
      new HeaderPanel(),
      new MobileDashboardNav(dashboard),
      dashboard,
      // Bottom message line (shown by the mobile CSS only)
      new UIText({ id: 'msg-log', tagName: 'div', text: t('welcome_msg') }),
      new TeamModal(),
      new SettingsModal()
    ]);
  }
}
