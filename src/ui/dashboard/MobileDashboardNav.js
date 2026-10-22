/**
 * @file MobileDashboardNav.js
 * @brief Mobile navigation of the dashboard (C++: class MobileDashboardNav : public UIElement).
 * Bottom tab bar + "manage" sub-tab bar; switches the body to the mobile layout below the breakpoint
 * and shows only the windows of the selected tab. Hidden on desktop by CSS.
 * The wrapper uses `display: contents`, so both bars keep their original sticky positioning.
 */

import { UIElement } from '../UIElement.js';
import { UITabBar } from '../UITabBar.js';
import { AppShell } from '../AppShell.js';
import { DashboardWindowFocusRequestedEvent } from '../../core/events/DashboardWindowFocusRequestedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { QuestClaimedEvent } from '../../core/events/QuestClaimedEvent.js';
import { ContentAccessChangedEvent } from '../../core/events/ContentAccessChangedEvent.js';
import { LocationChangedEvent } from '../../core/events/LocationChangedEvent.js';
import { FeatureAccessSystem } from '../../systems/FeatureAccessSystem.js';
import { CONTENT_FEATURES } from '../../config/ContentAccessRules.js';
import { FossilRules } from '../../config/FossilRules.js';
import { FossilSystem } from '../../systems/FossilSystem.js';
import { LocationSystem } from '../../systems/LocationSystem.js';
import { SecretBaseAccessSystem } from '../../systems/SecretBaseAccessSystem.js';
import {
  MOBILE_BREAKPOINT_PX,
  MOBILE_VIEWS,
  MOBILE_MANAGE_VIEWS,
  MOBILE_MANAGE_VIEW_ID
} from '../../config/DashboardLayout.js';
import { t } from '../../localization/LocalizationManager.js';

export class MobileDashboardNav extends UIElement {
  /**
   * @param {import('./DashboardView.js').DashboardView} dashboard - Windows filtered by the tabs
   */
  constructor(dashboard) {
    super({ className: 'pw-mobile-dashboard-nav', name: 'MobileDashboardNav' });
    /** @private */
    this._dashboard = dashboard;
    /** @private */
    this._view = MOBILE_VIEWS[0].id;
    /** @private */
    this._manageView = MOBILE_MANAGE_VIEWS[0].id;
    /** @private @type {Function|null} */
    this._unsubscribeResize = null;

    /** @private */
    this._mainBar = new UITabBar({
      className: 'mobile-nav-bar',
      buttonClassName: 'mob-btn',
      tabs: this._availableMainViews().map((view) => ({ id: view.id, label: t(view.labelKey) })),
      onSelect: (id) => {
        this._view = id;
        this._applyVisibility();
      }
    });
    /** @private */
    this._subBar = new UITabBar({
      className: 'mobile-subnav-bar is-hidden',
      buttonClassName: 'mob-sub-btn',
      tabs: this._availableManageViews().map((view) => ({ id: view.id, label: t(view.labelKey) })),
      onSelect: (id) => {
        this._manageView = id;
        this._applyVisibility();
      }
    });
    this.addChildren([this._mainBar, this._subBar]);
    this.listen(SaveCreatedEvent, () => this._refreshManageViews());
    this.listen(SaveLoadedEvent, () => this._refreshManageViews());
    this.listen(SaveDeletedEvent, () => this._refreshManageViews());
    this.listen(QuestClaimedEvent, () => this._refreshManageViews());
    this.listen(ContentAccessChangedEvent, () => this._refreshManageViews());
    this.listen(LocationChangedEvent, () => this._refreshManageViews());
    this.listen(DashboardWindowFocusRequestedEvent, (event) => this._focusWindow(event.windowId));
  }

  /** @override */
  onEnter() {
    super.onEnter();
    this._unsubscribeResize = AppShell.onViewportResize((width) => this._updateMode(width));
    this._updateMode(AppShell.viewportWidth());
  }

  /** @override */
  onExit() {
    if (this._unsubscribeResize) this._unsubscribeResize();
    this._unsubscribeResize = null;
    AppShell.setMobileMode(false);
    super.onExit();
  }

  /**
   * @private
   * @param {number} viewportWidth
   */
  _updateMode(viewportWidth) {
    AppShell.setMobileMode(viewportWidth <= MOBILE_BREAKPOINT_PX);
    this._applyVisibility();
  }

  /** @private Selects the mobile view containing a window, then scrolls to it. */
  _focusWindow(windowId) {
    const mainView = this._availableMainViews().find((view) => view.windows.includes(windowId));
    if (mainView) {
      this._view = mainView.id;
      this._mainBar.select(mainView.id, false);
    } else {
      const manageView = this._availableManageViews().find((view) => view.windows.includes(windowId));
      if (manageView) {
        this._view = MOBILE_MANAGE_VIEW_ID;
        this._manageView = manageView.id;
        this._mainBar.select(MOBILE_MANAGE_VIEW_ID, false);
        this._subBar.select(manageView.id, false);
      }
    }
    this._applyVisibility();
    this._dashboard.focusWindow(windowId);
  }

  /** @private Adds the management tab only when at least one management feature is available. */
  _availableMainViews(manageViews = this._availableManageViews()) {
    return MOBILE_VIEWS.filter((view) => view.id !== MOBILE_MANAGE_VIEW_ID || manageViews.length > 0);
  }

  /** @private Returns only management views whose progression gate has been reached. */
  _availableManageViews() {
    const access = FeatureAccessSystem.getInstance();
    const atFossilLab = LocationSystem.getInstance().getCurrentLocationId() === FossilRules.LAB_LOCATION_ID;
    const hatcheryAvailable = access.isFeatureUnlocked(CONTENT_FEATURES.HATCHERY) ||
      (atFossilLab && FossilSystem.getInstance().isRevivalUnlocked());
    const available = {
      hatchery: hatcheryAvailable,
      training: access.isFeatureUnlocked(CONTENT_FEATURES.TRAINING),
      mine: access.isFeatureUnlocked(CONTENT_FEATURES.MINE),
      base: SecretBaseAccessSystem.getInstance().isUnlocked()
    };
    return MOBILE_MANAGE_VIEWS.filter((view) => available[view.id] === true);
  }

  /** @private Rebuilds mobile tabs when save, location, or progression state changes. */
  _refreshManageViews() {
    const manageViews = this._availableManageViews();
    const mainViews = this._availableMainViews(manageViews);
    if (!mainViews.some((view) => view.id === this._view)) this._view = mainViews[0]?.id || MOBILE_VIEWS[0].id;
    if (!manageViews.some((view) => view.id === this._manageView)) this._manageView = manageViews[0]?.id || '';
    this._mainBar.setTabs(mainViews.map((view) => ({ id: view.id, label: t(view.labelKey) })), this._view);
    this._subBar.setTabs(manageViews.map((view) => ({ id: view.id, label: t(view.labelKey) })), this._manageView);
    this._applyVisibility();
  }

  /** @private Shows the windows of the selected tab (every available window on desktop). */
  _applyVisibility() {
    const managing = this._view === MOBILE_MANAGE_VIEW_ID;
    this._subBar.toggleClass('is-hidden', !managing);
    if (!AppShell.isMobileMode()) {
      this._dashboard.setVisibleWindows(null);
      return;
    }
    const views = managing ? this._availableManageViews() : this._availableMainViews();
    const selectedId = managing ? this._manageView : this._view;
    this._dashboard.setVisibleWindows(views.find((view) => view.id === selectedId)?.windows ?? []);
  }
}
