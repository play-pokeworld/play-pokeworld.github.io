const MOBILE_BREAKPOINT = 850;

const VIEW_WINDOWS = {
  adventure: ['win-map', 'win-tabs'],
  combat: ['win-battle'],
  team: ['win-team'],
  quests: ['win-story'],
  manage: [],
};

const MANAGE_WINDOWS = {
  hatchery: ['win-hatchery'],
  training: ['win-training'],
  mine: ['win-mine'],
  shortcuts: ['win-shortcuts'],
};

function isMobileLayout() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px), (pointer: coarse)`).matches;
}

function getVisibleWindowsForCurrentMobileState() {
  const view = document.body.dataset.mobileView || 'adventure';
  if (view !== 'manage') return VIEW_WINDOWS[view] || VIEW_WINDOWS.adventure;
  const manageView = document.body.dataset.mobileManageView || 'hatchery';
  return MANAGE_WINDOWS[manageView] || MANAGE_WINDOWS.hatchery;
}

function updateMobileNavSelection() {
  const view = document.body.dataset.mobileView || 'adventure';
  const manageView = document.body.dataset.mobileManageView || 'hatchery';
  document.querySelectorAll('.mobile-nav-bar [data-mobile-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.mobileView === view);
  });
  document.querySelectorAll('.mobile-subnav-bar [data-mobile-manage-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.mobileManageView === manageView);
  });
}

function applyMobileView() {
  const mobile = isMobileLayout();
  document.body.classList.toggle('mobile-mode', mobile);
  const allWindows = Array.from(document.querySelectorAll('#main-dashboard .dash-win'));
  if (!mobile) {
    allWindows.forEach((win) => {
      win.classList.remove('mobile-visible');
      win.style.removeProperty('display');
    });
    const subnav = document.querySelector('.mobile-subnav-bar');
    if (subnav) subnav.style.display = 'none';
    updateMobileNavSelection();
    return;
  }
  const visible = new Set(getVisibleWindowsForCurrentMobileState());
  allWindows.forEach((win) => {
    const shouldShow = visible.has(win.id);
    win.classList.toggle('mobile-visible', shouldShow);
    win.style.display = shouldShow ? 'flex' : 'none';
  });
  const subnav = document.querySelector('.mobile-subnav-bar');
  if (subnav) subnav.style.display = (document.body.dataset.mobileView === 'manage') ? 'flex' : 'none';
  updateMobileNavSelection();
}

export function setMobileView(view = 'adventure') {
  document.body.dataset.mobileView = view;
  if (view !== 'manage' && !document.body.dataset.mobileManageView) {
    document.body.dataset.mobileManageView = 'hatchery';
  }
  applyMobileView();
}

export function setMobileManageView(view = 'hatchery') {
  document.body.dataset.mobileView = 'manage';
  document.body.dataset.mobileManageView = view;
  applyMobileView();
}

export function installMobileViewRouter() {
  if (!document.body.dataset.mobileView) document.body.dataset.mobileView = 'adventure';
  if (!document.body.dataset.mobileManageView) document.body.dataset.mobileManageView = 'hatchery';
  applyMobileView();
  window.addEventListener('resize', applyMobileView, { passive: true });
  window.addEventListener('orientationchange', applyMobileView, { passive: true });
  return applyMobileView;
}

if (typeof window !== 'undefined') {
  window.setMobileView = setMobileView;
  window.setMobileManageView = setMobileManageView;
  window.applyMobileView = applyMobileView;
}
