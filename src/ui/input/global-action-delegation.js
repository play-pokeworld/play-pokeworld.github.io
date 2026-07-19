const callGlobal = (name, ...args) => {
  const fn = window[name];
  if (typeof fn === 'function') return fn(...args);
  console.warn(`[PokeWorld] Missing global action handler: ${name}`);
  return undefined;
};


function toggleDebugDrawerDirect() {
  const drawer = document.getElementById('debug-drawer');
  if (!drawer) return;
  drawer.classList.toggle('open');
  if (drawer.classList.contains('open')) {
    drawer.style.display = 'flex';
  } else {
    drawer.style.display = 'none';
  }
}

function parseLegacyArgs(raw, event, element) {
  if (!raw || !raw.trim()) return [];
  try {
    return Function('event', 'element', `return [${raw}];`).call(element, event, element);
  } catch (error) {
    console.error('[PokeWorld] Could not parse legacy call args:', raw, error);
    return [];
  }
}

const ACTIONS = {
  'open-settings': () => callGlobal('openSettings'),
  'close-settings': () => callGlobal('closeSettings'),
  'set-language': (el) => callGlobal('setLanguage', el.dataset.lang),
  'set-theme': (el) => callGlobal('setTheme', el.dataset.themeValue),
  'save-game': () => callGlobal('saveGame', true),
  'load-game': () => callGlobal('loadGame', true),
  'export-save': () => callGlobal('exportSave'),
  'confirm-delete': () => callGlobal('confirmDelete'),
  'do-delete': () => callGlobal('doDelete'),
  'cancel-delete': () => callGlobal('cancelDelete'),
  'close-confirm': () => callGlobal('closeConfirm'),
  'scroll-to-window': (el) => callGlobal('scrollToWin', el.dataset.targetWindow),
  'set-mobile-view': (el) => callGlobal('setMobileView', el.dataset.mobileView),
  'set-mobile-manage-view': (el) => callGlobal('setMobileManageView', el.dataset.mobileManageView),
  'set-battle-speed': (el) => callGlobal('setBattleSpeed', Number(el.dataset.speed)),
  'open-battle-summary': () => callGlobal('openBattleSummary', false),
  'leave-battle': () => callGlobal('doLeaveBattle'),
  'show-tab': (el) => callGlobal('showTab', el.dataset.tab),
  'close-unified-selector': () => callGlobal('closeUnifiedSelectorModal'),
  'sort-unified-grid': (el) => callGlobal('sortUnifiedGrid', el.dataset.sort),
  'close-battle-summary': () => callGlobal('closeBattleSummary'),
  'restart-last-battle': () => callGlobal('restartLastBattle'),
  'toggle-debug-menu': () => toggleDebugDrawerDirect(),
  'debug-give-money': () => callGlobal('debugGiveMoney'),
  'debug-give-candies': () => callGlobal('debugGiveCandies'),
  'debug-unlock-badges': () => callGlobal('debugUnlockBadges'),
  'debug-fill-mine': () => callGlobal('debugFillMine'),
  'debug-timeskip-10m': () => callGlobal('debugTimeSkipAfk10Minutes'),
  'toggle-battle-speed-x10': () => callGlobal('toggleBattleSpeedX10'),
  'close-victory-screen': () => document.getElementById('victory-screen')?.classList.remove('open'),
  'toggle-map-help': () => callGlobal('toggleMapHelp'),
  'open-fullscreen-panel': (el) => callGlobal('openFullscreenPanel', el.dataset.panel),
  'open-unified-selector': (el) => callGlobal('openUnifiedSelectorModal', el.dataset.panel),
  'close-fullscreen-panel': () => callGlobal('closeFullscreenPanel'),
  'copy-export-text': () => callGlobal('copyExportText'),
  'legacy-call': (el, event) => callGlobal(el.dataset.call, ...parseLegacyArgs(el.dataset.callArgs || '', event, el)),
  'legacy-code': (el, event) => { try { Function('event', el.dataset.code || '').call(el, event); } catch (error) { console.error('[PokeWorld] Legacy code action failed', error); } },

  'call-close-poke': (el, event) => { callGlobal(el.dataset.call, ...parseLegacyArgs(el.dataset.callArgs || '', event, el)); document.getElementById('poke-modal')?.classList.remove('open'); },
  'cancel-box-move-replace': (el) => { window.boxMoveReplaceSlot = null; callGlobal('openBoxPokeModal', el.dataset.boxId); },
  'cancel-move-replace': (el) => { window.moveReplaceSlot = null; callGlobal('openPokeModal', Number(el.dataset.teamIndex)); },
  'legacy-call-stop': (el, event) => { event.stopPropagation(); callGlobal(el.dataset.call, ...parseLegacyArgs(el.dataset.callArgs || '', event, el)); },
  'call-close-selector': (el, event) => { callGlobal(el.dataset.call, ...parseLegacyArgs(el.dataset.callArgs || '', event, el)); callGlobal('closeUnifiedSelectorModal'); },
  'return-inventory': () => { const fsM = document.getElementById('fullscreen-panel-modal'); if (fsM && fsM.style.display === 'flex') callGlobal('renderInventory', document.getElementById('fs-panel-content')); else callGlobal('showTab', 'inventory'); },
  'back-to-move-context': () => { if (window._moveInfoContext?.boxId) callGlobal('openBoxPokeModal', window._moveInfoContext.boxId); else if (window._moveInfoContext && window._moveInfoContext.idx !== null) callGlobal('openPokeModal', window._moveInfoContext.idx); else document.getElementById('poke-modal')?.classList.remove('open'); },

  'close-poke-modal': (el) => { if (el.dataset.resetMoveInfo) window._moveInfoContext = null; if (el.dataset.resetBoxMove) window.boxMoveReplaceSlot = null; if (el.dataset.resetMoveEditor) window.moveEditorFor = null; document.getElementById('poke-modal')?.classList.remove('open'); },
  'hide-element': (el) => { const target = document.getElementById(el.dataset.targetElement); if (target) target.style.display = 'none'; },
  'stop-propagation': (_el, event) => event.stopPropagation(),
  'select-self': (el) => { if (typeof el.select === 'function') el.select(); },
  'set-usm-subtab': (el) => { window._usmSubTab = el.dataset.subtab; callGlobal('renderUnifiedGrid'); },
  'close-selector-show-tab': (el) => { callGlobal('closeUnifiedSelectorModal'); callGlobal('showTab', el.dataset.tab); },
  'generate-mine-layer': () => { callGlobal('generateMineLayer'); callGlobal('renderMineWindow'); },
};

export function installGlobalActionDelegation(root = document) {
  root.addEventListener('click', (event) => {
    if (event.__pokeWorldHandled) return;
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;
    if (action === 'import-save-file' || action === 'switch-map-region') return;
    const handler = ACTIONS[action];
    if (!handler) return;
    handler(actionTarget, event);
  });

  root.addEventListener('contextmenu', (event) => {
    const target = event.target.closest('[data-context-call], [data-context-code]');
    if (!target) return;
    event.preventDefault();
    if (target.dataset.contextCall) callGlobal(target.dataset.contextCall, ...parseLegacyArgs(target.dataset.contextArgs || '', event, target));
    else { try { Function('event', target.dataset.contextCode || '').call(target, event); } catch (error) { console.error('[PokeWorld] Legacy context code failed', error); } }
  });

  root.addEventListener('change', (event) => {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    if (actionTarget.dataset.action === 'import-save-file') {
      if (actionTarget.files?.[0]) callGlobal('importSave', event);
    }
    if (actionTarget.dataset.action === 'switch-map-region') {
      callGlobal('switchMapRegion', actionTarget.value);
    }
    const legacyChangeTarget = event.target.closest('[data-change-call]');
    if (legacyChangeTarget) {
      callGlobal(legacyChangeTarget.dataset.changeCall, ...parseLegacyArgs(legacyChangeTarget.dataset.changeArgs || '', event, legacyChangeTarget));
    }
  });

  root.addEventListener('input', (event) => {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    if (actionTarget.dataset.action === 'filter-unified-grid') callGlobal('filterUnifiedGrid');
    if (actionTarget.dataset.action === 'filter-dictionary') callGlobal('setDictionarySearch', actionTarget.value);
  });

  root.addEventListener('mouseover', (event) => {
    const target = event.target.closest('[data-hover-in]');
    if (!target) return;
    try { Function('event', target.dataset.hoverIn || '').call(target, event); } catch (error) { console.error('[PokeWorld] Legacy hover-in code failed', error); }
  });

  root.addEventListener('mouseout', (event) => {
    const target = event.target.closest('[data-hover-out]');
    if (!target) return;
    try { Function('event', target.dataset.hoverOut || '').call(target, event); } catch (error) { console.error('[PokeWorld] Legacy hover-out code failed', error); }
  });

  root.addEventListener('mousedown', (event) => {
    if (event.target.closest('[data-stop-drag]')) {
      event.stopPropagation();
      return;
    }
    const header = event.target.closest('[data-drag-window]');
    if (!header) return;
    if (window.matchMedia('(pointer: coarse), (max-width: 850px)').matches) return;
    callGlobal('startWinDrag', event, header.dataset.dragWindow);
  });
}

