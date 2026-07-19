import './assets/css/style.css';
import './assets/styles/mobile-accessibility.css';
import './assets/styles/extracted-index.css';
import './assets/styles/extracted-templates.css';
import './assets/styles/extracted-bridges.css';
import './assets/styles/cleaned-components.css';
import './assets/styles/pw-static.css';
import './app/import-localization.js';
import { validateBrowserSave } from './core/save-compatibility.js';
import { applyMobileWindowDragPolicy } from './ui/input/mobile-window-drag.js';
import { installMobileViewRouter } from './ui/input/mobile-view-router.js';
import { installGlobalActionDelegation } from './ui/input/global-action-delegation.js';
import { installInlineHandlerSanitizer } from './ui/input/inline-handler-sanitizer.js';
import { installTouchContextMenuBridge } from './ui/input/touch-context-menu.js';
// Fully migrated ES modules - no virtual bundle
import './app/legacy-imports.js';

validateBrowserSave();
applyMobileWindowDragPolicy();
installMobileViewRouter();

installGlobalActionDelegation(document);
installInlineHandlerSanitizer(document);
installTouchContextMenuBridge(document);

