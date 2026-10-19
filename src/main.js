/**
 * @file main.js
 * @brief Application entry point (C++ equivalent: int main(int argc, char** argv)).
 * Boots localization and preferences, mirrors them on the document, registers the
 * engine systems and pages, then opens the save menu.
 */

import { Engine } from './core/Engine.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { NotificationSystem } from './systems/NotificationSystem.js';
import { DashboardLayoutSystem } from './systems/DashboardLayoutSystem.js';
import { PreferencesSystem } from './systems/PreferencesSystem.js';
import { LocationSystem } from './systems/LocationSystem.js';
import { BattleSystem } from './systems/BattleSystem.js';
import { TeamSystem } from './systems/TeamSystem.js';
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
    debug: preferences.isDebugMode()
  });

  console.log(t('debug_engine_boot', { version: GameConfig.VERSION }));

  // 2. Engine and systems
  const engine = Engine.getInstance();
  engine.init(root);
  engine.registerSystem('PreferencesSystem', preferences);
  engine.registerSystem('SaveSystem', SaveSystem.getInstance());
  engine.registerSystem('NotificationSystem', NotificationSystem.getInstance());
  engine.registerSystem('DashboardLayoutSystem', DashboardLayoutSystem.getInstance());
  engine.registerSystem('LocationSystem', LocationSystem.getInstance());
  engine.registerSystem('TeamSystem', TeamSystem.getInstance());
  engine.registerSystem('BattleSystem', BattleSystem.getInstance());

  // 3. Overlays living above every page
  AppShell.mountOverlay(new NotificationCenterView());

  // 4. Pages (composition root) and first screen
  registerAllPages(engine.getPageManager());
  engine.getPageManager().openPage(PageIds.SAVE_MENU);

  console.log(t('debug_engine_ready'));
});
