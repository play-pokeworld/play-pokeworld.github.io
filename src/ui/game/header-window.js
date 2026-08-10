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

function renderUpdateBanner(){
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('pw-update-banner-container');
  if (!G || !G.updateAvailable || G.updateBannerDismissed) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return;
  const container = document.createElement('div');
  container.id = 'pw-update-banner-container';
  container.className = 'pw-update-banner';
  container.setAttribute('role', 'alert');

  const textWrap = document.createElement('div');
  textWrap.className = 'pw-update-banner-text';
  textWrap.textContent = (typeof t === 'function' ? t('app_update_banner_text') : 'Une nouvelle version est disponible !');

  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'pw-update-banner-actions';
  actionsWrap.style.cssText = 'display:flex;align-items:center;gap:8px;';

  const updateBtn = document.createElement('button');
  updateBtn.className = 'pw-update-banner-btn';
  updateBtn.type = 'button';
  updateBtn.setAttribute('data-action', 'legacy-call');
  updateBtn.setAttribute('data-call', 'applyAppUpdate');
  updateBtn.textContent = (typeof t === 'function' ? t('app_update_banner_btn') : 'Mettre à jour');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'pw-update-banner-close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('data-action', 'legacy-call');
  closeBtn.setAttribute('data-call', 'dismissAppUpdate');
  closeBtn.setAttribute('aria-label', (typeof t === 'function' ? t('app_update_banner_close') : 'Fermer'));
  closeBtn.textContent = '✕';

  actionsWrap.appendChild(updateBtn);
  actionsWrap.appendChild(closeBtn);
  container.appendChild(textWrap);
  container.appendChild(actionsWrap);

  const header = document.getElementById('header');
  if (header && header.nextSibling) {
    header.parentNode.insertBefore(container, header.nextSibling);
  } else if (header && header.parentNode) {
    header.parentNode.appendChild(container);
  }
}

function updateHeader(){
  try{ renderUpdateBanner(); }catch(_){}
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
