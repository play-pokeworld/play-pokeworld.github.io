/**
 * @file main.js
 * @brief Application entry point (C++ equivalent: int main(int argc, char** argv)).
 * Boots localization and preferences, mirrors them on the document, registers the
 * engine systems and pages, then opens the save menu.
 */

import { Engine } from './core/Engine.js';
import { SaveLifecycle } from './ui/SaveLifecycle.js';
import { FacilityStaffSystem } from './systems/FacilityStaffSystem.js';
import { FacilityManagementSystem } from './systems/FacilityManagementSystem.js';
import { FacilityPokemonSelectionSystem } from './systems/FacilityPokemonSelectionSystem.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { FeatureAccessSystem } from './systems/FeatureAccessSystem.js';
import { NotificationSystem } from './systems/NotificationSystem.js';
import { BonusSystem } from './systems/BonusSystem.js';
import { SecretBaseFlagBonusProvider } from './systems/secret-base/SecretBaseFlagBonusProvider.js';
import { AchievementBonusProvider } from './systems/achievements/AchievementBonusProvider.js';
import { AchievementSystem } from './systems/AchievementSystem.js';
import { AtollSystem } from './systems/AtollSystem.js';
import { BonusRules } from './config/BonusRules.js';
import { DashboardLayoutSystem } from './systems/DashboardLayoutSystem.js';
import { PreferencesSystem } from './systems/PreferencesSystem.js';
import { LocationSystem } from './systems/LocationSystem.js';
import { RegionalStarterSystem } from './systems/RegionalStarterSystem.js';
import { RoamingSystem } from './systems/RoamingSystem.js';
import { TeamAmbushSystem } from './systems/TeamAmbushSystem.js';
import { BattleSystem } from './systems/BattleSystem.js';
import { RelaunchSystem } from './systems/RelaunchSystem.js';
import { DungeonAutoSystem } from './systems/DungeonAutoSystem.js';
import { DungeonSystem } from './systems/DungeonSystem.js';
import { TeamSystem } from './systems/TeamSystem.js';
import { BoxSystem } from './systems/BoxSystem.js';
import { PokemonUsageSystem } from './systems/PokemonUsageSystem.js';
import { TeamBoxTransferSystem } from './systems/TeamBoxTransferSystem.js';
import { TeamPresetEditSystem } from './systems/TeamPresetEditSystem.js';
import { TeamPresetSystem } from './systems/TeamPresetSystem.js';
import { PokeballSystem } from './systems/PokeballSystem.js';
import { CatchSystem } from './systems/CatchSystem.js';
import { QuestSystem } from './systems/QuestSystem.js';
import { TutorialSystem } from './systems/TutorialSystem.js';
import { TrainerSystem } from './systems/TrainerSystem.js';
import { HatcherySystem } from './systems/HatcherySystem.js';
import { MineSystem } from './systems/MineSystem.js';
import { SecretBaseSystem } from './systems/SecretBaseSystem.js';
import { SaleSystem } from './systems/SaleSystem.js';
import { FossilSystem } from './systems/FossilSystem.js';
import { FastForwardSystem } from './systems/FastForwardSystem.js';
import { TrainingSystem } from './systems/TrainingSystem.js';
import { ShopSystem } from './systems/ShopSystem.js';
import { DiagnosticsSystem } from './systems/DiagnosticsSystem.js';
import { BrowserDiagnostics } from './ui/BrowserDiagnostics.js';
import { registerAllPages } from './pages/PageRegistry.js';
import { PageIds } from './pages/PageIds.js';
import { AppShell } from './ui/AppShell.js';
import { NotificationCenterView } from './ui/notifications/NotificationCenterView.js';
import { LocalizationManager, t } from './localization/LocalizationManager.js';
import { GameConfig } from './config/GameConfig.js';

window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app-root');
  if (!root) {
    console.error(t('debug_root_missing'));
    return;
  }

  // 1. Localization and preferences (document mirrors their state from now on)
  const localization = LocalizationManager.getInstance();
  const preferences = PreferencesSystem.getInstance();
  AppShell.bind({
    lang: localization.currentLang,
    theme: preferences.getTheme(),
    debug: preferences.isDebugMode(),
    animationPreferences: preferences.getAnimationPreferences()
  });

  console.log(t('debug_engine_boot', { version: GameConfig.VERSION }));

  // 2. Engine and systems
  const engine = Engine.getInstance();
  engine.init(root);
  const bonusSystem = BonusSystem.getInstance();
  bonusSystem.registerProvider(BonusRules.SOURCE_IDS.SECRET_BASE_FLAGS, new SecretBaseFlagBonusProvider());
  bonusSystem.registerProvider(BonusRules.SOURCE_IDS.ACHIEVEMENTS, new AchievementBonusProvider());
  engine.registerSystem('PreferencesSystem', preferences);
  engine.registerSystem('SaveSystem', SaveSystem.getInstance());
  engine.registerSystem('BonusSystem', bonusSystem);
  engine.registerSystem('AchievementSystem', AchievementSystem.getInstance());
  engine.registerSystem('FeatureAccessSystem', FeatureAccessSystem.getInstance());
  engine.registerSystem('NotificationSystem', NotificationSystem.getInstance());
  engine.registerSystem('DiagnosticsSystem', DiagnosticsSystem.getInstance());
  BrowserDiagnostics.install();
  SaveLifecycle.install();
  engine.registerSystem('DashboardLayoutSystem', DashboardLayoutSystem.getInstance());
  engine.registerSystem('LocationSystem', LocationSystem.getInstance());
  engine.registerSystem('RegionalStarterSystem', RegionalStarterSystem.getInstance());
  engine.registerSystem('RoamingSystem', RoamingSystem.getInstance());
  engine.registerSystem('TeamAmbushSystem', TeamAmbushSystem.getInstance());
  engine.registerSystem('PokemonUsageSystem', PokemonUsageSystem.getInstance());
  engine.registerSystem('TeamSystem', TeamSystem.getInstance());
  engine.registerSystem('BoxSystem', BoxSystem.getInstance());
  engine.registerSystem('TeamBoxTransferSystem', TeamBoxTransferSystem.getInstance());
  engine.registerSystem('TeamPresetSystem', TeamPresetSystem.getInstance());
  engine.registerSystem('TeamPresetEditSystem',TeamPresetEditSystem.getInstance());
  engine.registerSystem('PokeballSystem', PokeballSystem.getInstance());
  engine.registerSystem('CatchSystem', CatchSystem.getInstance());
  engine.registerSystem('BattleSystem', BattleSystem.getInstance());
  engine.registerSystem('AtollSystem', AtollSystem.getInstance());
  engine.registerSystem('SecretBaseSystem', SecretBaseSystem.getInstance());
  engine.registerSystem('DungeonSystem', DungeonSystem.getInstance());
  engine.registerSystem('RelaunchSystem',RelaunchSystem.getInstance());
  engine.registerSystem('DungeonAutoSystem',DungeonAutoSystem.getInstance());
  engine.registerSystem('QuestSystem', QuestSystem.getInstance());
  engine.registerSystem('TutorialSystem', TutorialSystem.getInstance());
  engine.registerSystem('TrainerSystem', TrainerSystem.getInstance());
  engine.registerSystem('FacilityStaffSystem', FacilityStaffSystem.getInstance());
  engine.registerSystem('FacilityManagementSystem', FacilityManagementSystem.getInstance());
  engine.registerSystem('FacilityPokemonSelectionSystem', FacilityPokemonSelectionSystem.getInstance());
  engine.registerSystem('HatcherySystem', HatcherySystem.getInstance());
  engine.registerSystem('MineSystem', MineSystem.getInstance());
  engine.registerSystem('SaleSystem', SaleSystem.getInstance());
  engine.registerSystem('FossilSystem', FossilSystem.getInstance());
  engine.registerSystem('FastForwardSystem', FastForwardSystem.getInstance());
  engine.registerSystem('TrainingSystem', TrainingSystem.getInstance());
  engine.registerSystem('ShopSystem', ShopSystem.getInstance());

  let hiddenTimestamp = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenTimestamp = Date.now();
    } else if (hiddenTimestamp) {
      const elapsedMs = Date.now() - hiddenTimestamp;
      hiddenTimestamp = null;
      if (elapsedMs >= 4000) {
        FastForwardSystem.getInstance().triggerCatchUp(elapsedMs);
      }
    }
  });

  // 3. Overlays living above every page
  AppShell.mountOverlay(new NotificationCenterView());

  // 4. Pages (composition root) and first screen
  registerAllPages(engine.getPageManager());
  engine.getPageManager().openPage(PageIds.SAVE_MENU);

  console.log(t('debug_engine_ready'));
});
