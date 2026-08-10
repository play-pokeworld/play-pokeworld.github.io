// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
/**
 * PokeWorld UI — dashboard header reads (money/badges) + batched window refresh
 *
 * Pure presentation helpers (DOM). Moved to the UI layer in wave 33; the
 * public surface (updateHeader / updateHeaderImmediate / getBadgeDisplayTotal)
 * is unchanged.
 */
function getBadgeDisplayTotal(){
 const supportedRegions = ['kanto','johto','hoenn'];
 let regions = 1;
 try{ regions = supportedRegions.filter(r => (typeof canAccessRegion === 'function') ? canAccessRegion(r) : r === 'kanto').length || 1; }catch(_){ regions = 1; }
 return regions * 8;
}
let _headerRaf = null;
let _headerPending = false;
function _flushHeaderWindows(){
  _headerRaf = null;
  _headerPending = false;
  try{ renderTeamWindow(); }catch(_){}
  try{ renderStoryWindow(); }catch(_){}
  try{ renderHatcheryWindow(); }catch(_){}
  try{ renderTrainingWindow(); }catch(_){}
  try{ renderMineWindow(); }catch(_){}
  try{ renderAutomationWindow(); }catch(_){}
  try{ renderShortcutsWindow(); }catch(_){}
}
function updateHeader(){
  try{
    const m = document.getElementById('h-money');
    if(m) m.textContent = (G && typeof G.money === 'number') ? G.money.toLocaleString() : '0';
    const b = document.getElementById('h-badges');
    if(b) b.textContent = (G && Array.isArray(G.badges)) ? G.badges.length : 0;
    const totalEl = document.getElementById('h-badges-total');
    if(totalEl) totalEl.textContent = getBadgeDisplayTotal();
  }catch(_){}
  // RAF batch for the heavy windows to avoid jitter on each K.O.
  if(_headerPending) return;
  _headerPending = true;
  try{
    if(typeof requestAnimationFrame === 'function'){
      _headerRaf = requestAnimationFrame(_flushHeaderWindows);
    } else {
      _flushHeaderWindows();
    }
  }catch(_){
    _flushHeaderWindows();
  }
}
function updateHeaderImmediate(){
  // for cases where we want to force a synchronous refresh (e.g. location change)
  if(_headerRaf && typeof cancelAnimationFrame === 'function'){
    try{ cancelAnimationFrame(_headerRaf); }catch(_){}
  }
  _headerRaf = null;
  _headerPending = false;
  try{
    const m = document.getElementById('h-money');
    if(m) m.textContent = (G && typeof G.money === 'number') ? G.money.toLocaleString() : '0';
    const b = document.getElementById('h-badges');
    if(b) b.textContent = (G && Array.isArray(G.badges)) ? G.badges.length : 0;
    const totalEl = document.getElementById('h-badges-total');
    if(totalEl) totalEl.textContent = getBadgeDisplayTotal();
  }catch(_){}
  _flushHeaderWindows();
}


// --- Migrated to ES module, globals exposed ---
if (typeof getBadgeDisplayTotal !== 'undefined') { if (typeof window !== 'undefined') window.getBadgeDisplayTotal = getBadgeDisplayTotal; if (typeof globalThis !== 'undefined') globalThis.getBadgeDisplayTotal = getBadgeDisplayTotal; }
if (typeof updateHeader !== 'undefined') { if (typeof window !== 'undefined') window.updateHeader = updateHeader; if (typeof globalThis !== 'undefined') globalThis.updateHeader = updateHeader; }
if (typeof updateHeaderImmediate !== 'undefined') { if (typeof window !== 'undefined') window.updateHeaderImmediate = updateHeaderImmediate; if (typeof globalThis !== 'undefined') globalThis.updateHeaderImmediate = updateHeaderImmediate; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  getBadgeDisplayTotal,
  updateHeader,
  updateHeaderImmediate,
};
