// PokeEngine Input — action dispatcher (engine input system)
// Owner of the classic action surface: inline data-action / data-call /
// data-change / data-context handling, argument parsing, click fallbacks and
// the legacy inline-handler sanitizer. Absorbed into the engine in wave T2
// (was the dispatch half of application/runtime-legacy-bridge.js).
// Wave 41 — native ESM module (IIFE removed): the kept classic surface
// (window.callGlobal + global guard) is unchanged below; plus
// the grouped export of the same names.

  function callGlobal(name) {
    const args = Array.prototype.slice.call(arguments, 1);
    // Wave 34 (T2-B): resolve through the ENGINE action registry first —
    // modules register their entry points as named actions instead of
    // writing one global per action. window[name] remains the fallback for
    // not-yet-migrated classic globals (and for VM harnesses, where the
    // registry service is absent and `typeof PokeActions` is false).
    const fn = (typeof PokeActions !== 'undefined' && PokeActions)
      ? (PokeActions.get(name) || window[name])
      : window[name];
    // Beacon (measure-only): who dispatches what, through which channel.
    try { if (typeof PokeTrace !== 'undefined' && PokeTrace) PokeTrace.hit('action', name, { via: (typeof fn !== 'function') ? 'missing' : ((typeof PokeActions !== 'undefined' && PokeActions && PokeActions.get(name) === fn) ? 'registry' : 'window-fallback') }); } catch (_) {}
    if (typeof fn === 'function') return fn.apply(window, args);
    console.warn('[PokeWorld] Missing global action handler:', name);
    return undefined;
  }

  // Expose: pwInfoBack / pwBuildInfoPanel are defined outside of this IIFE
  // and only need it at call time (otherwise silent ReferenceError ->
  // contextual return fails).
  window.callGlobal = callGlobal;

  function toggleDebugDrawerDirect() {
    const drawer = document.getElementById('debug-drawer');
    if (!drawer) return;
    drawer.style.display = getComputedStyle(drawer).display === 'none' ? 'flex' : 'none';
  }

  function splitLegacyArgs(raw) {
    const parts = [];
    let current = '';
    let quote = null;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      const prev = raw[i - 1];
      if ((ch === '"' || ch === "'") && prev !== '\\') {
        if (quote === ch) quote = null;
        else if (!quote) quote = ch;
        current += ch;
        continue;
      }
      if (ch === ',' && !quote) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  function resolveLegacyArg(token, event, element) {
    const value = String(token || '').trim();
    if (!value) return undefined;
    if (value === 'event') return event;
    if (value === 'this.value' || value === 'element.value') return element && element.value;
    if (value === 'this.checked' || value === 'element.checked') return !!(element && element.checked);
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if ((value[0] === "'" && value[value.length - 1] === "'") || (value[0] === '"' && value[value.length - 1] === '"')) {
      return value.slice(1, -1).replace(/\\'/g, "'").replace(/\\\"/g, '"');
    }
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
    return value;
  }

  function parseLegacyArgs(raw, event, element) {
    if (!raw || !raw.trim()) return [];
    try { return splitLegacyArgs(raw).map(function (token) { return resolveLegacyArg(token, event, element); }); }
    catch (error) { console.error('[PokeWorld] Could not parse legacy call args:', raw, error); return []; }
  }

  function closeNearestModal(closeButton) {
    if (closeButton.closest('#settings-modal')) return callGlobal('closeSettings');
    if (closeButton.closest('#unified-selector-modal')) return callGlobal('closeUnifiedSelectorModal');
    if (closeButton.closest('#battle-summary-modal')) return callGlobal('closeBattleSummary');
    if (closeButton.closest('#confirm-modal')) return callGlobal('closeConfirm');
    if (closeButton.closest('#fullscreen-panel-modal')) return callGlobal('closeFullscreenPanel');
    const pokeModal = document.getElementById('poke-modal');
    if (pokeModal && closeButton.closest('#poke-modal')) {
      pokeModal.classList.remove('open');
      pokeModal.classList.remove('atoll-prep-modal');
      // Purge the stored sheet (otherwise it becomes a "ghost" source
      // on the next info panel open). Phase 6 — legacy feature update
      window._pwPokeSheet = null;
      window._pwInfoSource = null;
      window._atollPrepOpen = false; // phase 25 : preparation Usine refermee
    }
    const mapHelp = document.getElementById('map-help-modal');
    if (mapHelp && closeButton.closest('#map-help-modal')) mapHelp.classList.toggle('open');
    return undefined;
  }

  function runAction(element, event) {
    const action = element.dataset.action;
    if (!action) return false;
    // Beacon (measure-only): UI event origin (click, contextmenu, timer...).
    try { if (typeof PokeTrace !== 'undefined' && PokeTrace) PokeTrace.hit('ui-event', action, { via: (event && event.type) || 'unknown' }); } catch (_) {}
    if (action === 'legacy-call') { callGlobal.apply(null, [element.dataset.call].concat(parseLegacyArgs(element.dataset.callArgs || '', event, element))); return true; }
    if (action === 'legacy-call-stop') { event.stopPropagation(); callGlobal.apply(null, [element.dataset.call].concat(parseLegacyArgs(element.dataset.callArgs || '', event, element))); return true; }
    if (action === 'call-close-poke') { callGlobal.apply(null, [element.dataset.call].concat(parseLegacyArgs(element.dataset.callArgs || '', event, element))); const pm = document.getElementById('poke-modal'); if (pm) pm.classList.remove('open'); return true; }
    if (action === 'call-close-selector') { callGlobal.apply(null, [element.dataset.call].concat(parseLegacyArgs(element.dataset.callArgs || '', event, element))); callGlobal('closeUnifiedSelectorModal'); return true; }
    if (action === 'close-poke-modal') { window._moveInfoContext = element.dataset.resetMoveInfo ? null : window._moveInfoContext; window.boxMoveReplaceSlot = element.dataset.resetBoxMove ? null : window.boxMoveReplaceSlot; window.moveEditorFor = element.dataset.resetMoveEditor ? null : window.moveEditorFor; window._pwPokeSheet = null; window._pwInfoSource = null; window._atollPrepOpen = false; const pm2 = document.getElementById('poke-modal'); if (pm2) { pm2.classList.remove('open'); pm2.classList.remove('atoll-prep-modal'); } if (window._presetEditorReturn) { const _pmPk = window._presetEditorReturn; window._presetEditorReturn = null; callGlobal('openPresetEditor', _pmPk); } else { window._presetEditorOpen = null; if (pm2) pm2.classList.remove('preset-editor-modal'); } return true; }
    if (action === 'cancel-box-move-replace') { window.boxMoveReplaceSlot = null; callGlobal('openBoxPokeModal', element.dataset.boxId); return true; }
    if (action === 'cancel-move-replace') { window.moveReplaceSlot = null; callGlobal('openPokeModal', Number(element.dataset.teamIndex)); return true; }
    if (action === 'back-to-move-context') { if (window._moveInfoContext && window._moveInfoContext.boxId) callGlobal('openBoxPokeModal', window._moveInfoContext.boxId); else if (window._moveInfoContext && window._moveInfoContext.idx !== null) callGlobal('openPokeModal', window._moveInfoContext.idx); else { const pm3 = document.getElementById('poke-modal'); if (pm3) pm3.classList.remove('open'); } return true; }
    if (action === 'pw-info-back') { callGlobal('pwInfoBack'); return true; } // registry-first (T2-C.2)
    if (action === 'hide-element') { const target = document.getElementById(element.dataset.targetElement); if (target) target.style.display = 'none'; return true; }
    if (action === 'stop-propagation') { event.stopPropagation(); return true; }
    if (action === 'select-self') { if (typeof element.select === 'function') element.select(); return true; }
    if (action === 'set-usm-subtab') { callGlobal('setUsmSubTab', element.dataset.subtab); return true; } // wave 15: module setter (window._usmSubTab never reached it)
    if (action === 'close-selector-show-tab') { callGlobal('closeUnifiedSelectorModal'); callGlobal('showTab', element.dataset.tab); return true; }
    if (action === 'return-inventory') { const fsM = document.getElementById('fullscreen-panel-modal'); if (fsM && fsM.style.display === 'flex') callGlobal('renderInventory', document.getElementById('fs-panel-content')); else callGlobal('showTab', 'inventory'); return true; }
    if (action === 'generate-mine-layer') { callGlobal('generateMineLayer'); callGlobal('renderMineWindow'); return true; }
    const actionMap = {
      'open-settings': ['openSettings'], 'close-settings': ['closeSettings'], 'set-language': ['setLanguage', element.dataset.lang], 'set-theme': ['setTheme', element.dataset.themeValue],
      'save-game': ['saveGame', true], 'load-game': ['loadGame', true], 'export-save': ['exportSave'], 'confirm-delete': ['confirmDelete'], 'do-delete': ['doDelete'], 'cancel-delete': ['cancelDelete'],
      'close-confirm': ['closeConfirm'], 'scroll-to-window': ['scrollToWin', element.dataset.targetWindow], 'set-mobile-view': ['setMobileView', element.dataset.mobileView], 'set-mobile-manage-view': ['setMobileManageView', element.dataset.mobileManageView], 'set-battle-speed': ['setBattleSpeed', Number(element.dataset.speed)],
      'open-battle-summary': ['openBattleSummary', false], 'leave-battle': ['doLeaveBattle'], 'show-tab': ['showTab', element.dataset.tab], 'close-unified-selector': ['closeUnifiedSelectorModal'],
      'sort-unified-grid': ['sortUnifiedGrid', element.dataset.sort], 'close-battle-summary': ['closeBattleSummary'], 'restart-last-battle': ['restartLastBattle'],
      'debug-give-money': ['debugGiveMoney'], 'debug-give-ct-cs': ['debugGiveCtCs'], 'debug-give-candies': ['debugGiveCandies'], 'debug-unlock-badges': ['debugUnlockBadges'], 'debug-fill-mine': ['debugFillMine'], 'debug-timeskip-30m': ['debugTimeSkipAfk30Minutes'],
      'toggle-battle-speed-x10': ['toggleBattleSpeedX10'], 'toggle-map-help': ['toggleMapHelp'], 'open-fullscreen-panel': ['openFullscreenPanel', element.dataset.panel], 'open-unified-selector': ['openUnifiedSelectorModal', element.dataset.panel],
      'close-fullscreen-panel': ['closeFullscreenPanel'], 'copy-export-text': ['copyExportText']
    };
    if (action === 'close-victory-screen') { const v = document.getElementById('victory-screen'); if (v) v.classList.remove('open'); return true; }
    if (actionMap[action]) { callGlobal.apply(null, actionMap[action]); return true; }
    return false;
  }

  function installRobustClickFallback() {
    function preflightClickHandler(event) {
      const target = event.target && event.target.closest ? event.target : null;
      if (!target) return;
      const closeButton = target.closest('.modal-close');
      // Phase 47: modal close buttons are re-routed through the action
      // system: it goes back to the origin menu instead of closing
      // blindly. Without a data-action, we keep the generic closure.
      if (closeButton) {
        if (closeButton.dataset && closeButton.dataset.action && runAction(closeButton, event)) { event.__pokeWorldHandled = true; return; }
        closeNearestModal(closeButton); event.__pokeWorldHandled = true; return;
      }
      if (target.closest('#debug-toggle-btn') || target.closest('[data-action="toggle-debug-menu"]')) { toggleDebugDrawerDirect(); event.__pokeWorldHandled = true; return; }
      const actionElement = target.closest('[data-action]');
      if (actionElement && runAction(actionElement, event)) { event.__pokeWorldHandled = true; return; }
      const teamCard = target.closest('#team-window-body .poke-card');
      if (teamCard && !target.closest('button, .poke-item-badge, .poke-move')) {
        const cards = Array.prototype.slice.call(document.querySelectorAll('#team-window-body .poke-card'));
        const index = cards.indexOf(teamCard);
        if (index >= 0) {
          if (typeof window.onTeamCardClick === 'function') window.onTeamCardClick(event, index);
          else { window._swapFromTeamIdx = index; callGlobal('openUnifiedSelectorModal', 'team'); }
          event.__pokeWorldHandled = true;
        }
      }
    }

    // Phase 16: safety net against "jump to top" — freeze the scroll of the
    // clicked element's ancestors (panels, lists, page) before the action, then
    // restore it (synchronous + deferred) no matter what, even if the action
    // triggered a re-render not covered by pwSetHtml.
    document.addEventListener('click', function (event) {
      if (event.__pokeWorldHandled) return;
      const _pwSnap = (typeof pwSnapshotScrollAround === 'function') ? pwSnapshotScrollAround(event.target) : null;
      try { preflightClickHandler(event); }
      finally { if (_pwSnap && typeof pwRestoreScrollAround === 'function') pwRestoreScrollAround(_pwSnap); }
    }, true);

    document.addEventListener('contextmenu', function (event) {
      const target = event.target && event.target.closest ? event.target.closest('[data-context-call]') : null;
      if (!target) return;
      event.preventDefault();
      const _pwSnap = (typeof pwSnapshotScrollAround === 'function') ? pwSnapshotScrollAround(target) : null;
      try { callGlobal.apply(null, [target.dataset.contextCall].concat(parseLegacyArgs(target.dataset.contextArgs || '', event, target))); }
      finally { if (_pwSnap && typeof pwRestoreScrollAround === 'function') pwRestoreScrollAround(_pwSnap); }
      event.__pokeWorldHandled = true;
    }, true);

    document.addEventListener('change', function (event) {
      const target = event.target && event.target.closest ? event.target.closest('[data-change-call]') : null;
      if (!target) return;
      callGlobal.apply(null, [target.dataset.changeCall].concat(parseLegacyArgs(target.dataset.changeArgs || '', event, target)));
      event.__pokeWorldHandled = true;
    }, true);
  }
  installRobustClickFallback();

// Wave 41 — 2nd IIFE removed as well (installCriticalClickFallback).
function installCriticalClickFallback(root) {
  root.addEventListener('click', (event) => {
    const target = event.target && event.target.closest ? event.target : null;
    if (!target) return;

    if (target.closest('#debug-toggle-btn')) {
      toggleDebugDrawerDirect();
      event.__pokeWorldHandled = true;
      return;
    }

    const close = target.closest('.modal-close');
    if (close) {
      if (close.closest('#settings-modal')) callGlobal('closeSettings');
      else if (close.closest('#unified-selector-modal')) callGlobal('closeUnifiedSelectorModal');
      else if (close.closest('#battle-summary-modal')) callGlobal('closeBattleSummary');
      else if (close.closest('#poke-modal')) { const pm = document.getElementById('poke-modal'); if (pm) pm.classList.remove('open'); }
      else if (close.closest('#confirm-modal')) callGlobal('closeConfirm');
      event.__pokeWorldHandled = true;
      return;
    }

    const teamBody = document.getElementById('team-window-body');
    const teamCard = target.closest('#team-window-body .poke-card');
    if (teamBody && teamCard && !target.closest('button, .poke-item-badge, .poke-move, [data-context-call]')) {
      const cards = Array.from(teamBody.querySelectorAll('.poke-card'));
      const index = cards.indexOf(teamCard);
      if (index >= 0) { callGlobal('onTeamCardClick', event, index); event.__pokeWorldHandled = true; }
    }
  }, true);
}


  installCriticalClickFallback(document);

  const actions = {
    'open-settings': function () { callGlobal('openSettings'); },
    'close-settings': function () { callGlobal('closeSettings'); },
    'set-language': function (el) { callGlobal('setLanguage', el.dataset.lang); },
    'set-theme': function (el) { callGlobal('setTheme', el.dataset.themeValue); },
    'save-game': function () { callGlobal('saveGame', true); },
    'load-game': function () { callGlobal('loadGame', true); },
    'export-save': function () { callGlobal('exportSave'); },
    'confirm-delete': function () { callGlobal('confirmDelete'); },
    'do-delete': function () { callGlobal('doDelete'); },
    'cancel-delete': function () { callGlobal('cancelDelete'); },
    'close-confirm': function () { callGlobal('closeConfirm'); },
    'scroll-to-window': function (el) { callGlobal('scrollToWin', el.dataset.targetWindow); },
    'set-mobile-view': function (el) { callGlobal('setMobileView', el.dataset.mobileView); },
    'set-mobile-manage-view': function (el) { callGlobal('setMobileManageView', el.dataset.mobileManageView); },
    'set-battle-speed': function (el) { callGlobal('setBattleSpeed', Number(el.dataset.speed)); },
    'open-battle-summary': function () { callGlobal('openBattleSummary', false); },
    'leave-battle': function () { callGlobal('doLeaveBattle'); },
    'show-tab': function (el) { callGlobal('showTab', el.dataset.tab); },
    'close-unified-selector': function () { callGlobal('closeUnifiedSelectorModal'); },
    'sort-unified-grid': function (el) { callGlobal('sortUnifiedGrid', el.dataset.sort); },
    'close-battle-summary': function () { callGlobal('closeBattleSummary'); },
    'restart-last-battle': function () { callGlobal('restartLastBattle'); },
    'toggle-debug-menu': function () { toggleDebugDrawerDirect(); },
    'debug-give-money': function () { callGlobal('debugGiveMoney'); },
    'debug-give-ct-cs': function () { callGlobal('debugGiveCtCs'); },
    'debug-give-candies': function () { callGlobal('debugGiveCandies'); },
    'debug-unlock-badges': function () { callGlobal('debugUnlockBadges'); },
    'debug-fill-mine': function () { callGlobal('debugFillMine'); },
    'debug-base-grant-all': function () { callGlobal('baseDebugGrantAll'); },
    'debug-base-add-npc': function () { callGlobal('baseDebugAddNpc'); },
    'base-window-refresh': function () { callGlobal('baseWindowRender'); },

    'base-ed-select': function (el) { callGlobal('baseWindowSelectSlug', el.dataset.slug); },
    'base-ed-select-npc': function (el) { callGlobal('baseWindowSelectNpc', el.dataset.npc); },
    'base-ed-tab': function (el) { callGlobal('baseWindowSelectTab', el.dataset.cat); },
    'base-ed-rotate': function () { callGlobal('baseWindowRotateSel'); },
    'base-ed-pickup': function () { callGlobal('baseWindowPickupSel'); },
    'base-ed-npc-edit': function () { callGlobal('baseWindowEditSelectedNpc'); },
    'base-ed-pc-edit': function () { callGlobal('baseWindowEditSelectedPc'); },
    'base-ed-select-npc-new': function () { callGlobal('baseWindowSelectNpcNew'); },
    'base-ed-visit': function () { callGlobal('baseWindowVisitToggle'); },
    'base-ed-export': function () { callGlobal('baseWindowExport'); },
    'base-ed-import': function () { callGlobal('baseWindowImport'); },
    'debug-timeskip-30m': function () { callGlobal('debugTimeSkipAfk30Minutes'); },
    'toggle-battle-speed-x10': function () { callGlobal('toggleBattleSpeedX10'); },
    'close-victory-screen': function () { const el = document.getElementById('victory-screen'); if (el) el.classList.remove('open'); },
    'toggle-map-help': function () { callGlobal('toggleMapHelp'); },
    'open-fullscreen-panel': function (el) { callGlobal('openFullscreenPanel', el.dataset.panel); },
    'open-unified-selector': function (el) { callGlobal('openUnifiedSelectorModal', el.dataset.panel); },
    'close-fullscreen-panel': function () { callGlobal('closeFullscreenPanel'); },
    'copy-export-text': function () { callGlobal('copyExportText'); },
    'legacy-call': function (el, event) { callGlobal.apply(null, [el.dataset.call].concat(parseLegacyArgs(el.dataset.callArgs || '', event, el))); },

    'call-close-poke': function (el, event) { callGlobal.apply(null, [el.dataset.call].concat(parseLegacyArgs(el.dataset.callArgs || '', event, el))); const m = document.getElementById('poke-modal'); if (m) m.classList.remove('open'); },
    'cancel-box-move-replace': function (el) { window.boxMoveReplaceSlot = null; callGlobal('openBoxPokeModal', el.dataset.boxId); },
    'cancel-move-replace': function (el) { window.moveReplaceSlot = null; callGlobal('openPokeModal', Number(el.dataset.teamIndex)); },
    'legacy-call-stop': function (el, event) { event.stopPropagation(); callGlobal.apply(null, [el.dataset.call].concat(parseLegacyArgs(el.dataset.callArgs || '', event, el))); },
    'call-close-selector': function (el, event) { callGlobal.apply(null, [el.dataset.call].concat(parseLegacyArgs(el.dataset.callArgs || '', event, el))); callGlobal('closeUnifiedSelectorModal'); },
    'return-inventory': function () { const fsM = document.getElementById('fullscreen-panel-modal'); if (fsM && fsM.style.display === 'flex') callGlobal('renderInventory', document.getElementById('fs-panel-content')); else callGlobal('showTab', 'inventory'); },
    'back-to-move-context': function () { if (window._moveInfoContext && window._moveInfoContext.boxId) callGlobal('openBoxPokeModal', window._moveInfoContext.boxId); else if (window._moveInfoContext && window._moveInfoContext.idx !== null) callGlobal('openPokeModal', window._moveInfoContext.idx); else { const m = document.getElementById('poke-modal'); if (m) m.classList.remove('open'); } },
    'pw-info-back': function () { callGlobal('pwInfoBack'); }, // registry-first (T2-C.2)

    'close-poke-modal': function (el) { if (el.dataset.resetMoveInfo) window._moveInfoContext = null; if (el.dataset.resetBoxMove) window.boxMoveReplaceSlot = null; if (el.dataset.resetMoveEditor) window.moveEditorFor = null; window._pwPokeSheet = null; window._pwInfoSource = null; window._atollPrepOpen = false; const target = document.getElementById('poke-modal'); if (target) { target.classList.remove('open'); target.classList.remove('atoll-prep-modal'); } if (window._presetEditorReturn) { const pmReturn = window._presetEditorReturn; window._presetEditorReturn = null; callGlobal('openPresetEditor', pmReturn); } else { window._presetEditorOpen = null; if (target) target.classList.remove('preset-editor-modal'); } },
    'hide-element': function (el) { const target = document.getElementById(el.dataset.targetElement); if (target) target.style.display = 'none'; },
    'stop-propagation': function (_el, event) { event.stopPropagation(); },
    'select-self': function (el) { if (typeof el.select === 'function') el.select(); },
    'set-usm-subtab': function (el) { callGlobal('setUsmSubTab', el.dataset.subtab); }, // wave 15: module setter
    'close-selector-show-tab': function (el) { callGlobal('closeUnifiedSelectorModal'); callGlobal('showTab', el.dataset.tab); },
    'generate-mine-layer': function () { callGlobal('generateMineLayer'); callGlobal('renderMineWindow'); }
  };

  document.addEventListener('click', function (event) {
    if (event.__pokeWorldHandled) return;
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'import-save-file' || action === 'switch-map-region') return;
    if (action === 'base-window-mode' || action === 'base-window-layout') return; // handled on 'change'
    const handler = actions[action];
    if (!handler) return;
    // Phase 16: scroll preservation around the action (safety net).
    const _pwSnap = (typeof pwSnapshotScrollAround === 'function') ? pwSnapshotScrollAround(target) : null;
    try { handler(target, event); }
    finally { if (_pwSnap && typeof pwRestoreScrollAround === 'function') pwRestoreScrollAround(_pwSnap); }
  });

  document.addEventListener('contextmenu', function (event) {
    const target = event.target.closest('[data-context-call], [data-context-code]');
    if (!target) return;
    event.preventDefault();
    const _pwSnap = (typeof pwSnapshotScrollAround === 'function') ? pwSnapshotScrollAround(target) : null;
    try {
      if (target.dataset.contextCall) callGlobal.apply(null, [target.dataset.contextCall].concat(parseLegacyArgs(target.dataset.contextArgs || '', event, target)));
      else console.warn('[PokeWorld] Ignored deprecated context code.');
    } finally { if (_pwSnap && typeof pwRestoreScrollAround === 'function') pwRestoreScrollAround(_pwSnap); }
  });

  document.addEventListener('change', function (event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    if (target.dataset.action === 'import-save-file' && target.files && target.files[0]) callGlobal('importSave', event);
    if (target.dataset.action === 'switch-map-region') callGlobal('switchMapRegion', target.value);
    if (target.dataset.action === 'base-window-mode') callGlobal('baseWindowSetMode', target.value);
    if (target.dataset.action === 'base-window-layout') callGlobal('baseWindowSetLayout', target.value);
    const legacyChangeTarget = event.target.closest('[data-change-call]');
    if (legacyChangeTarget) { callGlobal.apply(null, [legacyChangeTarget.dataset.changeCall].concat(parseLegacyArgs(legacyChangeTarget.dataset.changeArgs || '', event, legacyChangeTarget))); }
  });

  document.addEventListener('input', function (event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    if (target.dataset.action === 'filter-unified-grid') callGlobal('filterUnifiedGrid');
    if (target.dataset.action === 'filter-dictionary') callGlobal('setDictionarySearch', target.value);
    if (target.dataset.action === 'filter-bag') callGlobal('setInvSearch', target.value); // phase 26 : recherche of the sac
    if (target.dataset.action === 'filter-box') callGlobal('setBoxSearch', target.value); // unified bar: PC box name search
    if (target.dataset.action === 'filter-dex') callGlobal('setDexSearch', target.value); // unified bar: Pokédex name search
    if (target.dataset.action === 'filter-preset-picker') callGlobal('presetPickerFilter', target.value); // phase 27 : recherche of the selector of preset
    if (target.dataset.action === 'filter-base-npc-picker') callGlobal('baseNpcPickerFilter', target.value); // phase 46 : recherche of the selector of copain
    if (target.dataset.action === 'filter-base-npc-sprite') callGlobal('baseNpcEditorFilterSprite', target.value);
  });

  document.addEventListener('mousedown', function (event) {
    if (event.target.closest('[data-stop-drag]')) {
      event.stopPropagation();
      return;
    }
    const header = event.target.closest('[data-drag-window]');
    if (!header) return;
    if (window.matchMedia('(pointer: coarse), (max-width: 850px)').matches) return;
    callGlobal('startWinDrag', event, header.dataset.dragWindow);
  });

  let longPressTimer = null;
  let startX = 0;
  let startY = 0;
  function clearLongPress() {
    if (longPressTimer) window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  document.addEventListener('pointerdown', function (event) {
    if (event.pointerType !== 'touch') return;
    // Long-press = right-click on mobile. MUST include the design-system
    // context channel [data-context-call] (poke cards, save cards, machine
    // sprites…) — the legacy classes alone left the new screens dead on
    // touch devices.
    const target = event.target.closest('[oncontextmenu], [data-context-action], [data-context-call], .auto-move, .move-row, .inv-item, .box-card, .poke-sprite');
    if (!target) return;
    startX = event.clientX;
    startY = event.clientY;
    clearLongPress();
    longPressTimer = window.setTimeout(function () {
      target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: startX, clientY: startY }));
    }, 560);
  }, { passive: true });
  document.addEventListener('pointermove', function (event) {
    if (!longPressTimer) return;
    if (Math.abs(event.clientX - startX) > 12 || Math.abs(event.clientY - startY) > 12) clearLongPress();
  }, { passive: true });
  document.addEventListener('pointerup', clearLongPress, { passive: true });
  document.addEventListener('pointercancel', clearLongPress, { passive: true });

  // ── Wheel relay (user feedback 2026-08-05): scrolling a modal must work
  // EVERYWHERE — the dimmed margins around the panel were dead zones (the
  // only scroller is the inner panel, so the wheel did nothing unless the
  // pointer sat precisely above it). When the wheel is used over the
  // backdrop (outside the inner), forward the delta to the inner panel.
  // Native scrolling is untouched when the pointer IS over the panel.
  document.addEventListener('wheel', function (event) {
    const target = event.target;
    if (!target || !target.closest) return;
    const host = target.closest('#poke-modal, #settings-modal, #quest-modal, #confirm-modal, #battle-summary-modal, #map-help-modal');
    if (!host || !host.classList || !host.classList.contains('open')) return;
    const inner = host.querySelector('#poke-modal-inner, #settings-inner, #quest-inner, #confirm-inner, #battle-summary-inner, .pw-map-help-card');
    if (!inner || inner.contains(target)) return; // native wheel scroll applies
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16;           // lines → px
    else if (event.deltaMode === 2) delta *= (inner.clientHeight || 600); // pages → px
    inner.scrollTop += delta;
  }, { passive: true });


  function installInlineHandlerSanitizerClassic(root) {
    const eventNames = ['click', 'contextmenu', 'change', 'mousedown', 'input', 'mouseover', 'mouseout'];
    const runtimeStyleMap = new Map();
    let runtimeStyleCount = 0;
    let runtimeStyleEl = null;
    function styleSheet() {
      if (runtimeStyleEl) return runtimeStyleEl;
      runtimeStyleEl = document.createElement('style');
      runtimeStyleEl.id = 'pokeworld-runtime-extracted-inline-styles';
      runtimeStyleEl.textContent = '/* Runtime-extracted legacy inline styles. */\n';
      document.head.appendChild(runtimeStyleEl);
      return runtimeStyleEl;
    }
    function extractStyle(element) {
      const text = element.getAttribute && (element.getAttribute('data-style') || element.getAttribute('data-inline-css'));
      if (!text) return;
      const normalized = text.trim().replace(/;\s*/g, ';').replace(/\s*:\s*/g, ':');
      if (!normalized) return;
      if (!runtimeStyleMap.has(normalized)) {
        const className = 'pw-runtime-' + (++runtimeStyleCount);
        runtimeStyleMap.set(normalized, className);
        styleSheet().appendChild(document.createTextNode('.' + className + '{' + normalized + '}\n'));
      }
      element.classList.add(runtimeStyleMap.get(normalized));
      element.removeAttribute('data-style');
      element.removeAttribute('data-inline-css');
    }
    function bind(element, eventName) {
      const attr = 'on' + eventName;
      const dataAttr = 'data-inline-' + eventName;
      const code = element.getAttribute && (element.getAttribute(attr) || element.getAttribute('data-code-' + eventName) || element.getAttribute(dataAttr));
      if (!code) return;
      element.removeAttribute(attr);
      element.removeAttribute('data-code-' + eventName);
      element.removeAttribute(dataAttr);
      console.warn('[PokeWorld] Ignored deprecated inline ' + attr + ' handler.', code);
    }
    function sanitize(node) {
      if (!node || node.nodeType !== 1) return;
      extractStyle(node);
      eventNames.forEach(function (eventName) { bind(node, eventName); });
      const selector = ['[data-style]', '[data-inline-css]'].concat(eventNames.reduce(function (arr, eventName) { arr.push('[on' + eventName + ']'); arr.push('[data-code-' + eventName + ']'); arr.push('[data-inline-' + eventName + ']'); return arr; }, [])).join(',');
      if (node.querySelectorAll) {
        node.querySelectorAll(selector).forEach(function (element) {
          extractStyle(element);
          eventNames.forEach(function (eventName) { bind(element, eventName); });
        });
      }
    }
    sanitize(root.documentElement || root);
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') mutation.addedNodes.forEach(sanitize);
        else if (mutation.type === 'attributes') sanitize(mutation.target);
      });
    });
    observer.observe(root.documentElement || root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-style', 'data-inline-css'].concat(eventNames.reduce(function (arr, eventName) { arr.push('on' + eventName); arr.push('data-code-' + eventName); arr.push('data-inline-' + eventName); return arr; }, []))
    });
  }

  installInlineHandlerSanitizerClassic(document);


// --- Exported globals ---
if (typeof installCriticalClickFallback !== 'undefined') { if (typeof window !== 'undefined') window.installCriticalClickFallback = installCriticalClickFallback; if (typeof globalThis !== 'undefined') globalThis.installCriticalClickFallback = installCriticalClickFallback; }

export { callGlobal, installCriticalClickFallback };
