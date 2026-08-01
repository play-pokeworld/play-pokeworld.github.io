(function () {
  function callGlobal(name) {
    const args = Array.prototype.slice.call(arguments, 1);
    const fn = window[name];
    if (typeof fn === 'function') return fn.apply(window, args);
    console.warn('[PokeWorld] Missing global action handler:', name);
    return undefined;
  }

  function toggleDebugDrawerDirect() {
    var drawer = document.getElementById('debug-drawer');
    if (!drawer) return;
    drawer.style.display = getComputedStyle(drawer).display === 'none' ? 'flex' : 'none';
  }

  function splitLegacyArgs(raw) {
    var parts = [];
    var current = '';
    var quote = null;
    for (var i = 0; i < raw.length; i++) {
      var ch = raw[i];
      var prev = raw[i - 1];
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
    var value = String(token || '').trim();
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

function installCriticalClickFallback(root) {
  root.addEventListener('click', (event) => {
    var target = event.target && event.target.closest ? event.target : null;
    if (!target) return;

    if (target.closest('#debug-toggle-btn')) {
      toggleDebugDrawerDirect();
      event.__pokeWorldHandled = true;
      return;
    }

    var close = target.closest('.modal-close');
    if (close) {
      if (close.closest('#settings-modal')) callGlobal('closeSettings');
      else if (close.closest('#unified-selector-modal')) callGlobal('closeUnifiedSelectorModal');
      else if (close.closest('#battle-summary-modal')) callGlobal('closeBattleSummary');
      else if (close.closest('#poke-modal')) { var pm = document.getElementById('poke-modal'); if (pm) pm.classList.remove('open'); }
      else if (close.closest('#confirm-modal')) callGlobal('closeConfirm');
      event.__pokeWorldHandled = true;
      return;
    }

    var teamBody = document.getElementById('team-window-body');
    var teamCard = target.closest('#team-window-body .poke-card');
    if (teamBody && teamCard && !target.closest('button, .poke-item-badge, .poke-move, [data-context-call]')) {
      var cards = Array.from(teamBody.querySelectorAll('.poke-card'));
      var index = cards.indexOf(teamCard);
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
    'base-ed-select-npc-new': function () { callGlobal('baseWindowSelectNpcNew'); },
    'base-ed-visit': function () { callGlobal('baseWindowVisitToggle'); },
    'base-ed-export': function () { callGlobal('baseWindowExport'); },
    'base-ed-import': function () { callGlobal('baseWindowImport'); },
    'debug-timeskip-30m': function () { callGlobal('debugTimeSkipAfk30Minutes'); },
    'toggle-battle-speed-x10': function () { callGlobal('toggleBattleSpeedX10'); },
    'close-victory-screen': function () { var el = document.getElementById('victory-screen'); if (el) el.classList.remove('open'); },
    'toggle-map-help': function () { callGlobal('toggleMapHelp'); },
    'open-fullscreen-panel': function (el) { callGlobal('openFullscreenPanel', el.dataset.panel); },
    'open-unified-selector': function (el) { callGlobal('openUnifiedSelectorModal', el.dataset.panel); },
    'close-fullscreen-panel': function () { callGlobal('closeFullscreenPanel'); },
    'copy-export-text': function () { callGlobal('copyExportText'); },
    'legacy-call': function (el, event) { callGlobal.apply(null, [el.dataset.call].concat(parseLegacyArgs(el.dataset.callArgs || '', event, el))); },

    'call-close-poke': function (el, event) { callGlobal.apply(null, [el.dataset.call].concat(parseLegacyArgs(el.dataset.callArgs || '', event, el))); var m = document.getElementById('poke-modal'); if (m) m.classList.remove('open'); },
    'cancel-box-move-replace': function (el) { window.boxMoveReplaceSlot = null; callGlobal('openBoxPokeModal', el.dataset.boxId); },
    'cancel-move-replace': function (el) { window.moveReplaceSlot = null; callGlobal('openPokeModal', Number(el.dataset.teamIndex)); },
    'legacy-call-stop': function (el, event) { event.stopPropagation(); callGlobal.apply(null, [el.dataset.call].concat(parseLegacyArgs(el.dataset.callArgs || '', event, el))); },
    'call-close-selector': function (el, event) { callGlobal.apply(null, [el.dataset.call].concat(parseLegacyArgs(el.dataset.callArgs || '', event, el))); callGlobal('closeUnifiedSelectorModal'); },
    'return-inventory': function () { var fsM = document.getElementById('fullscreen-panel-modal'); if (fsM && fsM.style.display === 'flex') callGlobal('renderInventory', document.getElementById('fs-panel-content')); else callGlobal('showTab', 'inventory'); },
    'back-to-move-context': function () { if (window._moveInfoContext && window._moveInfoContext.boxId) callGlobal('openBoxPokeModal', window._moveInfoContext.boxId); else if (window._moveInfoContext && window._moveInfoContext.idx !== null) callGlobal('openPokeModal', window._moveInfoContext.idx); else { var m = document.getElementById('poke-modal'); if (m) m.classList.remove('open'); } },
    'pw-info-back': function () { if (typeof window.pwInfoBack === 'function') window.pwInfoBack(); },

    'close-poke-modal': function (el) { if (el.dataset.resetMoveInfo) window._moveInfoContext = null; if (el.dataset.resetBoxMove) window.boxMoveReplaceSlot = null; if (el.dataset.resetMoveEditor) window.moveEditorFor = null; window._pwPokeSheet = null; window._pwInfoSource = null; window._atollPrepOpen = false; var target = document.getElementById('poke-modal'); if (target) { target.classList.remove('open'); target.classList.remove('atoll-prep-modal'); } if (window._presetEditorReturn) { var pmReturn = window._presetEditorReturn; window._presetEditorReturn = null; callGlobal('openPresetEditor', pmReturn); } else { window._presetEditorOpen = null; if (target) target.classList.remove('preset-editor-modal'); } },
    'hide-element': function (el) { var target = document.getElementById(el.dataset.targetElement); if (target) target.style.display = 'none'; },
    'stop-propagation': function (_el, event) { event.stopPropagation(); },
    'select-self': function (el) { if (typeof el.select === 'function') el.select(); },
    'set-usm-subtab': function (el) { window._usmSubTab = el.dataset.subtab; callGlobal('renderUnifiedGrid'); },
    'close-selector-show-tab': function (el) { callGlobal('closeUnifiedSelectorModal'); callGlobal('showTab', el.dataset.tab); },
    'generate-mine-layer': function () { callGlobal('generateMineLayer'); callGlobal('renderMineWindow'); }
  };

  document.addEventListener('click', function (event) {
    if (event.__pokeWorldHandled) return;
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'import-save-file' || action === 'switch-map-region') return;
    if (action === 'base-window-mode' || action === 'base-window-layout') return; // gérés au 'change'
    const handler = actions[action];
    if (!handler) return;
    // Passe 16 : conservation du scroll autour de l'action (filet de sécurité).
    var _pwSnap = (typeof pwSnapshotScrollAround === 'function') ? pwSnapshotScrollAround(target) : null;
    try { handler(target, event); }
    finally { if (_pwSnap && typeof pwRestoreScrollAround === 'function') pwRestoreScrollAround(_pwSnap); }
  });

  document.addEventListener('contextmenu', function (event) {
    const target = event.target.closest('[data-context-call], [data-context-code]');
    if (!target) return;
    event.preventDefault();
    var _pwSnap = (typeof pwSnapshotScrollAround === 'function') ? pwSnapshotScrollAround(target) : null;
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
    if (target.dataset.action === 'filter-bag') callGlobal('setInvSearch', target.value); // passe 26 : recherche du sac
    if (target.dataset.action === 'filter-preset-picker') callGlobal('presetPickerFilter', target.value); // passe 27 : recherche du sélecteur de preset
    if (target.dataset.action === 'filter-base-npc-picker') callGlobal('baseNpcPickerFilter', target.value); // passe 46 : recherche du sélecteur de copain
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
    const target = event.target.closest('[oncontextmenu], [data-context-action], .auto-move, .move-row, .inv-item, .box-card, .poke-sprite');
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

  function installStaticI18nBindings() {
    var bindings = [
      ['#settings-title','settings_title'], ['#settings-inner .settings-section:nth-of-type(1) h3','lang_title'],
      ['#settings-inner .settings-section:nth-of-type(2) h3','theme_title'], ['[data-theme-btn="dark"]','theme_dark'],
      ['[data-theme-btn="light"]','theme_light'], ['[data-theme-btn="gameboy"]','theme_gameboy'], ['[data-theme-btn="fire"]','theme_fire'],
      ['#settings-inner .settings-section:nth-of-type(4) h3','save_title'], ['[data-action="save-game"]','save_btn'],
      ['[data-action="load-game"]','load_btn'], ['[data-action="export-save"]','export_btn'], ['label[for="import-file"]','import_btn'],
      ['[data-action="confirm-delete"]','delete_save_btn'], ['[data-action="do-delete"]','confirm_delete_btn'], ['[data-action="cancel-delete"]','cancel_btn'],
      ['#confirm-yes','confirm_btn'], ['[data-action="close-confirm"]','cancel_btn'], ['.mobile-nav-bar [data-mobile-view="adventure"]','adventure_tab'],
      ['#mine-win-title','mine_window_title'], ['#map-region-select option[value="kanto"]','map_region_kanto'], ['#map-region-select option[value="johto"]','map_region_johto'],
      ['#usm-search','search_by_name:placeholder'], ['.usm-sort-btn[data-sort="name"]','sort_name'], ['#battle-summary-title','battle_summary_title'],
      ['#loot-restart-btn','loot_restart_btn'], ['#loot-continue-btn','loot_continue_btn'], ['#debug-drawer .pw-static-068 span','debug_menu_title_short'],
      ['#debug-drawer [data-action="debug-give-money"]','debug_money'], ['#debug-drawer [data-action="debug-give-candies"]','debug_candies'],
      ['#debug-drawer [data-action="debug-unlock-badges"]','debug_badges'], ['#debug-drawer [data-action="debug-fill-mine"]','debug_mine'],
      ['#debug-drawer [data-action="debug-give-ct-cs"]','debug_ctcs'], ['#debug-drawer [data-call="debugTimeSkip30Minutes"]','debug_afk'],
      ['#debug-toggle-btn','debug_toggle_btn'], ['#victory-title','victory_title'], ['#victory-msg','victory_message'], ['#victory-screen [data-action="close-victory-screen"]','continue_btn']
    ];
    bindings.forEach(function(pair){
      var selector = pair[0];
      var parts = pair[1].split(':');
      var key = parts[0];
      var attr = parts[1];
      document.querySelectorAll(selector).forEach(function(el){
        if (attr === 'placeholder') el.dataset.i18nPlaceholder = key;
        else el.dataset.i18n = key;
      });
    });
    try { if (typeof updateI18nLabels === 'function') updateI18nLabels(); } catch(_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installStaticI18nBindings);
  else installStaticI18nBindings();


  // --- Dynamic styles for file:// mode (data-pct, data-grid-cols, etc.) ---
  function applyDynamicStylesFile(root) {
    root = root || document;
    if (!root.querySelectorAll) return;
    root.querySelectorAll('[data-pct]').forEach(function(el){
      var pct = el.dataset.pct;
      if (pct != null) {
        el.style.setProperty('--pct', pct + '%');
        if (el.classList.contains('stat-fill') || el.classList.contains('location-progress-bar') || el.classList.contains('hatchery-progress') || el.classList.contains('mine-energy-fill') || el.classList.contains('quest-progress-bar') || el.classList.contains('xp-fill') || el.classList.contains('hp-fill') || el.classList.contains('battle-damage-fill')) {
          el.style.width = pct + '%';
        }
      }
      if (el.dataset.bg) {
        el.style.setProperty('--bg', el.dataset.bg);
        el.style.background = el.dataset.bg;
      }
    });
    root.querySelectorAll('[data-grid-cols]').forEach(function(el){
      el.style.gridTemplateColumns = 'repeat(' + el.dataset.gridCols + ', 1fr)';
    });
    root.querySelectorAll('[data-bg]').forEach(function(el){
      if (!el.dataset.pct) { // avoid double handling
        // Only set if not already handled
        if (el.classList.contains('mine-tile') || el.classList.contains('mine-revealed-item') || el.classList.contains('starter-card--custom') || el.classList.contains('poke-sprite--custom') || el.classList.contains('starter-choose-btn')) {
          el.style.background = el.dataset.bg;
        }
      }
    });
    root.querySelectorAll('[data-type-color]').forEach(function(el){
      var color = el.dataset.typeColor;
      if (color) {
        el.style.setProperty('--type-color', color);
        if (el.classList.contains('type-badge') || el.classList.contains('move-desc-badge') || el.classList.contains('status-badge')) el.style.background = color;
      }
    });
  }
  // Initial apply and observer
  try {
    applyDynamicStylesFile(document);
    var obs = new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        if (m.type === 'childList') {
          m.addedNodes.forEach(function(node){
            if (node.nodeType === 1) applyDynamicStylesFile(node);
          });
        }
        if (m.type === 'attributes' && (m.attributeName === 'data-pct' || m.attributeName === 'data-grid-cols' || m.attributeName === 'data-type-color')) {
          applyDynamicStylesFile(m.target.parentElement || m.target);
        }
      });
    });
    obs.observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['data-pct','data-bg','data-grid-cols','data-type-color']});
  } catch(_){}

  // Fix debug toggle to use class open
  function fixDebugToggle() {
    var btn = document.getElementById('debug-toggle-btn');
    var drawer = document.getElementById('debug-drawer');
    if (!btn || !drawer) return;
    // Ensure drawer hidden initially
    if (!drawer.classList.contains('open') && drawer.style.display !== 'flex') {
      // keep hidden via CSS, nothing
    }
    btn.addEventListener('click', function(e){
      e.preventDefault();
      drawer.classList.toggle('open');
      if (drawer.classList.contains('open')) {
        drawer.style.display = 'flex';
      } else {
        drawer.style.display = 'none';
      }
    });
  }
  // Try to fix after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixDebugToggle);
  } else {
    fixDebugToggle();
  }

  // Plus de Proxy – déduplication gérée à l'init dans save.js via deduplicateCollectionAndFixBox()

})();



