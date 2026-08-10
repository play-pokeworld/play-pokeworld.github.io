// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Storage service (engine boot layer): resolved once, shared through the
// global object — concatenated VM harnesses and all chunks share ONE binding.
if (typeof globalThis !== 'undefined' && !globalThis.safeStorage) {
  globalThis.safeStorage = (typeof window !== 'undefined' && window.safeStorage) || (typeof PokeWorldCore !== 'undefined' && PokeWorldCore.storage) || null;
}
function appTimer(name, callback, delay) {
 if(typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers?.set) return PokeWorldTimers.set(name, callback, delay);
 return setInterval(callback, delay);
}

function initializeGameInterface(){
 try{
 window.PokeWorldGameStarted = true;
 document.body.classList.remove('save-menu-active');
 document.body.classList.add('game-started');
 const saveMenu = document.getElementById('save-menu-screen');
 if(saveMenu) saveMenu.classList.remove('is-open');
 applySavedTheme();
 if(typeof updateSaveProfileControls === 'function') updateSaveProfileControls();
 try{
 const savedCols = safeStorage.get('pokeworld_cols_v12');
 if(savedCols){
 // FIX (2026-08): go through the canonical accessor (module-safe reassignment).
 setDashboardCols(JSON.parse(savedCols), {persist:false});
 } else {
 setWindowLayout('cols3');
 }
 }catch(_){ setWindowLayout('cols3'); }
 // Wave 14: stamp the dashboard window headers from the ECS design system
 // (once — the adapter retries until PokeUI is assigned).
 try{ renderDashboardChrome(); }catch(e){ console.error('[ui] dashboard chrome stamp failed', e); }
 try{ if(typeof renderTrainingWindow === 'function') renderTrainingWindow(); }catch(_){}
 renderMap();
 updateHeader();
 showTab('info');
 updateI18nLabels();
 ensureQuestState();
 markVisited(G.location);
 if(!window._pokeWorldRuntimeIntervalsStarted){
 window._pokeWorldRuntimeIntervalsStarted = true;
 appTimer('mine-energy-recharge', () => {
 if(!window.PokeWorldGameStarted || !G.mine) return;
 if((G.mine.energy||0) < (G.mine.maxEnergy||100)){
 G.mine.energy = Math.min(G.mine.maxEnergy||100, (G.mine.energy||0) + 2);
 const el = document.getElementById('mine-energy-val');
 const bar = document.getElementById('mine-energy-bar');
 if(el && bar){
 el.textContent = `${G.mine.energy} / ${G.mine.maxEnergy}`;
 bar.style.width = `${(G.mine.energy/G.mine.maxEnergy)*100}%`;
 }
 }
 }, 1000);
 }
  setTimeout(()=>{
  if(!window.PokeWorldGameStarted) return;
  if(typeof checkStarterNeeded==="function") checkStarterNeeded(); else if(!G.starter) chooseStarter();
  
  // Auto-start active automation tickers on reload/boot
  if(typeof startMineAutomationTicker === 'function' && G.mine && G.mine.automation && G.mine.automation.enabled) {
    try { startMineAutomationTicker(); } catch(_){}
  }
  if(typeof startTrainingSlotTicker === 'function') {
    try { startTrainingSlotTicker(); } catch(_){}
  }
  }, 200);
 }catch(e){
 console.warn('initializeGameInterface error',e);
 try{ renderMap(); updateHeader(); showTab('info'); }catch(_){}
 }
}
function init(){
 try{
 applySavedTheme();
 window.PokeWorldGameStarted = false;
 if(typeof renderSaveMenu === 'function') _renderSaveMenuAtBoot();
 else { loadGame(); initializeGameInterface(); }
 }catch(e){
 console.warn('init error',e);
 try{ renderSaveMenu(); }catch(_){ try{ renderMap(); updateHeader(); showTab('info'); }catch(__){} }
 }
}
// The design-system views register on window.PokeUI at the END of the
// module graph (src/main.js) — init() runs DURING evaluation, so when the
// menu face is DS-rendered its very first paint happens on the next tick,
// once the design system is actually loaded.
function _renderSaveMenuAtBoot(){
 try{ renderSaveMenu(); }
 catch(err){
  if(err && /PokeUI views not loaded/.test(String((err && err.message) || err))){ setTimeout(function(){ try{ renderSaveMenu(); }catch(_){} }, 0); }
  else throw err;
 }
}
// ── Universal click-outside-to-close ──────────────────────────────────────
// Clicking DIRECTLY on a modal overlay backdrop (not its content) closes
// it, everywhere. Mandatory/pending dialogs never close this way
// (starter choice, save menu, confirm prompts) and any modal can opt out
// with data-no-outside-close="true".
(function(){
  const NO_OUTSIDE_CLOSE = {
    'starter-modal': 1,
    'save-menu-modal': 1,
    'save-menu-screen': 1,
    'confirm-modal': 1
  };
  // Dedicated close functions (proper cleanup) per known overlay.
  const CLOSE_FNS = {
    'settings-modal': 'closeSettings',
    'battle-summary-modal': 'closeBattleSummary',
    'quest-modal': 'closeQuestModal',
    'afk-result-modal': 'closeAfkResultPanel',
    'unified-selector-modal': 'closeUnifiedSelectorModal',
    'fullscreen-panel-modal': 'closeFullscreenPanel',
    'save-card-context-menu': 'closeSaveCardContextMenu'
  };
  function pwIsOpenBackdrop(el){
    if(!el || typeof el.className !== 'string') return false;
    if(!el.classList || !el.classList.contains) return false;
    const isOpen = el.classList.contains('open') || (el.style && el.style.display === 'flex');
    if(!isOpen) return false;
    if(el.id && /modal|overlay|dialog/i.test(el.id)) return true;
    return /modal-overlay|modal-backdrop|pw-window-overlay|-modal/.test(el.className);
  }
  document.addEventListener('click', function(e){
    const t = e.target;
    if(t === document || !pwIsOpenBackdrop(t)) return;
    if(t.id && NO_OUTSIDE_CLOSE[t.id]) return;
    if(t.getAttribute && t.getAttribute('data-no-outside-close') === 'true') return;
    const fnName = t.id ? CLOSE_FNS[t.id] : null;
    if(fnName && typeof window[fnName] === 'function'){ try{ window[fnName](); return; }catch(_){} }
    const closeBtn = t.querySelector ? t.querySelector('.modal-close, .pw-modal-close, [data-action="close-modal"], [data-action="legacy-call"][data-call^="close"]') : null;
    if(closeBtn){ try{ closeBtn.click(); return; }catch(_){} }
    t.classList.remove('open');
    if(t.style && t.style.display === 'flex') t.style.display = 'none';
  }, true);
})();

// ── Wave 28 (user feedback): Escape AND the mobile "back" button close the
// TOP open overlay. Mandatory screens never close (starter / save menu /
// confirm prompts, same exclusions as click-outside). The history seed is
// pushed when the FIRST overlay opens and popped when the LAST one closes,
// so every hardware/software back press closes exactly one panel. ─────────
(function(){
  const NO_ESC_CLOSE = {
    'starter-modal': 1,
    'save-menu-modal': 1,
    'save-menu-screen': 1,
    'confirm-modal': 1
  };
  // Same cleanup table as click-outside (kept in sync on purpose).
  const CLOSE_FNS = {
    'settings-modal': 'closeSettings',
    'battle-summary-modal': 'closeBattleSummary',
    'quest-modal': 'closeQuestModal',
    'afk-result-modal': 'closeAfkResultPanel',
    'unified-selector-modal': 'closeUnifiedSelectorModal',
    'fullscreen-panel-modal': 'closeFullscreenPanel',
    'save-card-context-menu': 'closeSaveCardContextMenu'
  };
  const TRACKED_IDS = [
    'save-card-context-menu',
    'unified-selector-modal',
    'quest-modal',
    'afk-result-modal',
    'settings-modal',
    'battle-summary-modal',
    'poke-modal',
    'fullscreen-panel-modal'
  ];
  function trackedEls(){
    const els = [];
    TRACKED_IDS.forEach(function(id){ const el = document.getElementById(id); if(el) els.push(el); });
    return els;
  }
  function pwIsOpenLayer(el){
    if(!el || !el.classList) return false;
    return el.classList.contains('open') || (el.style && el.style.display === 'flex');
  }
  function pwOpenOverlays(){
    return trackedEls().filter(pwIsOpenLayer);
  }
  function pwTopOverlay(){
    const open = pwOpenOverlays();
    if(!open.length) return null;
    let best = null, bestZ = -Infinity;
    open.forEach(function(el){
      let z = 0;
      try{ z = parseInt((getComputedStyle(el).zIndex || '0'), 10) || 0; }catch(_){ z = 0; }
      if(el.id === 'poke-modal' && el.classList.contains('poke-detail-front')) z = Math.max(z, 31000);
      if(z >= bestZ){ bestZ = z; best = el; }
    });
    return best;
  }
  function pwCloseOneOverlay(el){
    if(!el || NO_ESC_CLOSE[el.id]) return false;
    const fnName = el.id ? CLOSE_FNS[el.id] : null;
    if(fnName && typeof window[fnName] === 'function'){ try{ window[fnName](); return true; }catch(_){/* fall through */} }
    const closeBtn = el.querySelector ? el.querySelector('.modal-close, .pw-modal-close, [data-action="close-modal"], [data-action="legacy-call"][data-call^="close"]') : null;
    if(closeBtn){ try{ closeBtn.click(); return true; }catch(_){/* fall through */} }
    el.classList.remove('open');
    if(el.style && el.style.display === 'flex') el.style.display = 'none';
    return true;
  }
  function pwCloseTopOverlay(){ return pwCloseOneOverlay(pwTopOverlay()); }
if (typeof globalThis !== 'undefined') globalThis.pwCloseTopOverlay = pwCloseTopOverlay;
if (typeof globalThis !== 'undefined') globalThis.pwOpenOverlays = pwOpenOverlays;

  // Escape key: closes the top overlay (capture phase, before field-level
  // handlers swallow the key). No overlay → default behaviour untouched.
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape' || e.defaultPrevented) return;
    if(pwCloseTopOverlay()) e.preventDefault();
  }, true);

  // History seed: one state while ≥1 overlay is open; every popstate (the
  // mobile back gesture/button) closes the top layer instead of navigating
  // away from the game.
  let seedPushed = false;
  let inPopHandler = false;
  function historyUsable(){
    try{ return typeof history !== 'undefined' && typeof history.pushState === 'function'; }catch(_){ return false; }
  }
  function isSeedState(st){ return !!(st && st.pwOverlaySeed === 1); }
  function syncSeed(){
    if(!historyUsable()) return;
    const openN = pwOpenOverlays().length;
    if(openN > 0 && !seedPushed){
      if(!isSeedState(history.state)){ try{ history.pushState({ pwOverlaySeed: 1 }, ''); seedPushed = true; }catch(_){ /* opaque origin (file://) */ } }
      else seedPushed = true;
    }
    else if(openN === 0 && seedPushed){
      seedPushed = false;
      if(!inPopHandler && isSeedState(history.state)){ try{ history.back(); }catch(_){ /* noop */ } }
    }
  }
  window.addEventListener('popstate', function(){
    if(!historyUsable()) return;
    inPopHandler = true;
    try{
      if(pwOpenOverlays().length){
        pwCloseTopOverlay();
        // While overlays remain, re-seed so the next back press keeps closing.
        if(pwOpenOverlays().length){ try{ history.pushState({ pwOverlaySeed: 1 }, ''); seedPushed = true; }catch(_){ seedPushed = false; } }
        else seedPushed = false;
      } else {
        seedPushed = false;
      }
    } finally { inPopHandler = false; }
  });
  // Attribute watcher on the tracked layers only (open/close transitions).
  try{
    const obs = new MutationObserver(function(){ setTimeout(syncSeed, 0); });
    trackedEls().forEach(function(el){ obs.observe(el, { attributes: true, attributeFilter: ['class', 'style'] }); });
    setTimeout(syncSeed, 0);
  }catch(_){ /* MutationObserver unavailable — seeds skipped, Escape still works */ }
})();
init();
if (typeof init !== 'undefined') { if (typeof window !== 'undefined') window.init = init; if (typeof globalThis !== 'undefined') globalThis.init = init; }
if (typeof initializeGameInterface !== 'undefined') { if (typeof window !== 'undefined') window.initializeGameInterface = initializeGameInterface; if (typeof globalThis !== 'undefined') globalThis.initializeGameInterface = initializeGameInterface; }


// --- Exported globals ---
if (typeof appTimer !== 'undefined') { if (typeof window !== 'undefined') window.appTimer = appTimer; if (typeof globalThis !== 'undefined') globalThis.appTimer = appTimer; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  init,
  initializeGameInterface,
  appTimer,
};
