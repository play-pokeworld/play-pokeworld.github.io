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
      tabs: MOBILE_VIEWS.map((view) => ({ id: view.id, label: t(view.labelKey) })),
      onSelect: (id) => {
        this._view = id;
        this._applyVisibility();
      }
    });
    /** @private */
    this._subBar = new UITabBar({
      className: 'mobile-subnav-bar is-hidden',
      buttonClassName: 'mob-sub-btn',
      tabs: MOBILE_MANAGE_VIEWS.map((view) => ({ id: view.id, label: t(view.labelKey) })),
      onSelect: (id) => {
        this._manageView = id;
        this._applyVisibility();
      }
    });
    this.addChildren([this._mainBar, this._subBar]);
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
    const mainView = MOBILE_VIEWS.find((view) => view.windows.includes(windowId));
    if (mainView) {
      this._view = mainView.id;
      this._mainBar.select(mainView.id, false);
    } else {
      const manageView = MOBILE_MANAGE_VIEWS.find((view) => view.windows.includes(windowId));
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

  /** @private Shows the windows of the selected tab (every window on desktop). */
  _applyVisibility() {
    const managing = this._view === MOBILE_MANAGE_VIEW_ID;
    this._subBar.toggleClass('is-hidden', !managing);
    if (!AppShell.isMobileMode()) {
      this._dashboard.setVisibleWindows(null);
      return;
    }
    const views = managing ? MOBILE_MANAGE_VIEWS : MOBILE_VIEWS;
    const selectedId = managing ? this._manageView : this._view;
    this._dashboard.setVisibleWindows(views.find((view) => view.id === selectedId)?.windows ?? []);
  }
}
