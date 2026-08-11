// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
let _activeTab='info';
// FIX (2026-08): _activeTab is read as a free identifier by game-helpers.js,
// catch.js and box-ui.js — inside ES modules it was never visible (silent
// guards => lost tab refreshes). Kept in sync via a global mirror.
function _syncActiveTab(){ try{ if(typeof window !== 'undefined') window._activeTab = _activeTab; if(typeof globalThis !== 'undefined') globalThis._activeTab = _activeTab; }catch(_){} }
_syncActiveTab();

function showTab(tab){
 
 try{ if(typeof checkStarterNeeded==="function"&& checkStarterNeeded()) return; }catch(_e){}
 
 if(tab === 'inventory' || tab === 'shop' || tab === 'market' || tab === 'pokedex'){
 if(typeof openFullscreenPanel === 'function'){ openFullscreenPanel(tab); }
 return;
 }
 if(tab === 'box'){
 if(typeof openUnifiedSelectorModal === 'function'){ openUnifiedSelectorModal('box_view'); }
 return;
 }
 _activeTab=tab;
 _syncActiveTab();
 syncShinyState();
 renderTeamWindow();
 if(tab==='team'){ _activeTab='info'; _syncActiveTab(); }
 if(tab === 'mine' && G.badges.length < 2){
 _activeTab='info';
 _syncActiveTab();
 return;
 }
 document.querySelectorAll('.tab').forEach((t,i)=>{
 t.classList.toggle('active', i===0 && (tab==='info'||tab==='team'));
 });
 const content=document.getElementById('tab-content');
 if(tab==='info' || tab==='team') renderLocInfo(content);
 else if(tab==='shop') renderShop(content);
 else if(tab==='mine') renderMine(content);
}


function toggleMobileDrawer(e) {
  let tb = null;
  if (e && e.target && typeof e.target.closest === 'function') {
    const btn = e.target.closest('.pw-drawer-toggle, button');
    if (btn) tb = btn.closest('.box-filter-panel, .dict-toolbar, .inv-toolbar');
  }
  if (!tb && typeof document !== 'undefined') {
    const activeBtn = document.activeElement;
    if (activeBtn) tb = activeBtn.closest('.box-filter-panel, .dict-toolbar, .inv-toolbar');
  }
  if (tb) {
    tb.classList.toggle('mobile-drawer-open');
  }
}

// --- Migrated to ES module, globals exposed ---
if (typeof showTab !== 'undefined') { if (typeof window !== 'undefined') window.showTab = showTab; if (typeof globalThis !== 'undefined') globalThis.showTab = showTab; }
if (typeof toggleMobileDrawer !== 'undefined') { if (typeof window !== 'undefined') window.toggleMobileDrawer = toggleMobileDrawer; if (typeof globalThis !== 'undefined') globalThis.toggleMobileDrawer = toggleMobileDrawer; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  showTab,
  toggleMobileDrawer,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('showTab', showTab); PokeActions.register('toggleMobileDrawer', toggleMobileDrawer); } catch (_) {} }
