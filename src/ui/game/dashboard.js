// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Storage service (engine boot layer): resolved once, shared through the
// global object — concatenated VM harnesses and all chunks share ONE binding.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

if (typeof globalThis !== 'undefined' && !globalThis.safeStorage) {
  globalThis.safeStorage = (typeof window !== 'undefined' && window.safeStorage) || (typeof PokeWorldCore !== 'undefined' && PokeWorldCore.storage) || null;
}
// Colonnes de base (ordre validé par le joueur — Passe 26g) :
// gauche  = Poké Balls · Quêtes · Équipe · Pension
// milieu  = Monnaies · Carte · Combat · Base secrète
// droite  = Raccourcis · Lieu · Entraînement · Mine
let dashboardCols = {
 1: ['win-pokeballs', 'win-story', 'win-team', 'win-hatchery'],
 2: ['win-currency', 'win-map', 'win-battle', 'win-base'],
 3: ['win-shortcuts', 'win-tabs', 'win-training', 'win-mine']
};

// FIX (2026-08, window drag & drop): `dashboardCols` was a module-scope `let`
// read/reassigned as a free identifier by win-drag.js and bootstrap.js —
// in ES modules (strict mode), such access throws a ReferenceError: the drag
// broke at the first mousemove and the saved layout was lost on every boot.
// Canonical accessors below; window.dashboardCols is re-synced on each
// render for legacy consumers.
function getDashboardCols(){ return dashboardCols; }

function setDashboardCols(cols, opts){
 if(cols && typeof cols === 'object') dashboardCols = cols;
 if(!(opts && opts.persist === false)){
   try{ safeStorage.set('pokeworld_cols_v13', JSON.stringify(dashboardCols)); }catch(_e){}
 }
 renderDashboardColumns();
 return dashboardCols;
}

function renderDashboardColumns(){
 // Re-sync the global mirror before any legacy access.
 try{ if(typeof window !== 'undefined') window.dashboardCols = dashboardCols; if(typeof globalThis !== 'undefined') globalThis.dashboardCols = dashboardCols; }catch(_){}
 // Fenêtres permanentes : chaque fenêtre du tableau de bord doit exister
 // (migration des anciennes sauvegardes) — injectée dans sa colonne de base
 // (Passe 26g) si absente de toutes les colonnes.
 const DEFAULT_COL = {
  'win-story':1, 'win-team':1, 'win-hatchery':1, 'win-pokeballs':1,
  'win-currency':2, 'win-map':2, 'win-battle':2, 'win-base':2,
  'win-shortcuts':3, 'win-tabs':3, 'win-training':3, 'win-mine':3
 };
 for(const wid of Object.keys(DEFAULT_COL)){
  let found = false;
  for(let c=1; c<=3; c++){ if((dashboardCols[c]||[]).includes(wid)){ found = true; break; } }
  if(!found){
   const col = DEFAULT_COL[wid];
   if(!dashboardCols[col]) dashboardCols[col] = [];
   dashboardCols[col].push(wid);
  }
 }
 updateFeatureWindows();

 for(let c=1; c<=3; c++){
 const colEl = document.getElementById('col-' + c);
 if(!colEl) continue;
 const wins = dashboardCols[c] || [];
 if(wins.length === 0){
 colEl.style.display = 'none';
 } else {
 colEl.style.display = 'flex';
 if(c === 2) colEl.style.flex = '2';
 else colEl.style.flex = '1';

 wins.forEach(wId => {
 const wEl = document.getElementById(wId);
 if(wEl) colEl.appendChild(wEl);
 });
 }
 }
}

function moveWinToCol(winId, targetCol){
 for(let c=1; c<=3; c++){
 dashboardCols[c] = (dashboardCols[c] || []).filter(id => id !== winId);
 }
 if(!dashboardCols[targetCol]) dashboardCols[targetCol] = [];
 dashboardCols[targetCol].push(winId);
 try{ safeStorage.set('pokeworld_cols_v13', JSON.stringify(dashboardCols)); }catch(_e){}
 renderDashboardColumns();
}

function scrollToWin(winId){
 const win = document.getElementById(winId);
 if(win){
 win.scrollIntoView({behavior: 'smooth', block: 'start'});
 // Wave 14: the focus flash is a DS class (pw-win-flash), not an inline
 // style — restart the animation if a jump happens mid-flash.
 win.classList.remove('pw-win-flash');
 void win.offsetWidth;
 win.classList.add('pw-win-flash');
 setTimeout(() => win.classList.remove('pw-win-flash'), 1000);
 }
}

/**
 * Dashboard chrome — classic adapter (wave 14, rebuilt from zero).
 *
 * Stamps each static #main-dashboard window header ONCE with the ECS
 * title cluster (DashboardChromeView: grip + icon + label). The icon SVG
 * is LIFTED from the legacy shell before stamping (no duplicated markup);
 * the title label keeps its id + data-i18n hook; right-side tool nodes
 * (region selector, base controls, map "?" button) are re-appended as
 * LIVE elements so their state and listeners survive.
 */
let _chromeStamped = false;
let _chromeRetries = 0;
function renderDashboardChrome(){
 if(_chromeStamped) return;
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.DashboardChromeView){
  // PokeUI is assigned late in main.js — retry briefly at boot.
  if(_chromeRetries++ < 40) setTimeout(renderDashboardChrome, 120);
  return;
 }
 _chromeStamped = true;
 document.querySelectorAll('#main-dashboard .pw-win-hdr[data-drag-window]').forEach((head) => {
  const title = head.querySelector('.pw-win-hdr-title');
  const icon = title ? title.querySelector('.pw-win-hdr-icon') : null;
  const label = title
   ? (Array.from(title.querySelectorAll('span[id]')).find((el) => /-win-title$/.test(el.id)) || title.lastElementChild)
   : null;
  const model = {
   iconHtml: icon ? icon.innerHTML : '',
   labelId: (label && label.id) || '',
   labelKey: (label && label.dataset && label.dataset.i18n) || '',
   labelText: label ? label.textContent : '',
  };
  // Preserve every right-side tool node as a LIVE child.
  const tools = Array.from(head.children).filter((c) => c !== title);
  head.classList.add('pw-win-hdr');
  _pwSetHtmlSafe(head, views.DashboardChromeView.titleHTML(model));
  const toolsWrap = document.createElement('div');
  toolsWrap.className = 'pw-win-hdr-tools';
  tools.forEach((node) => toolsWrap.appendChild(node));
  head.appendChild(toolsWrap);
  const WIN_GUIDE_SECTION = {
   'win-story':'quests', 'win-team':'pokemon', 'win-hatchery':'hatchery', 'win-mine':'mine',
   'win-battle':'combat', 'win-base':'base', 'win-currency':'economy', 'win-pokeballs':'economy',
   'win-training':'training', 'win-tabs':'map', 'win-shortcuts':false,
  };
  const winId = head.dataset.dragWindow;
  const guideMap = (typeof window !== 'undefined' && window.WIN_GUIDE_SECTION) ? window.WIN_GUIDE_SECTION : WIN_GUIDE_SECTION;
  const section = Object.prototype.hasOwnProperty.call(guideMap, winId) ? guideMap[winId] : null;
  if (winId !== 'win-map' && section !== false && !head.querySelector('.pw-win-help-btn')) {
   const btn = document.createElement('button');
   btn.type = 'button';
   btn.className = 'pw-win-tool-btn pw-win-help-btn';
   btn.dataset.action = 'open-guide-section';
   btn.dataset.section = section || '';
   btn.dataset.stopDrag = 'true';
   btn.title = '?';
   btn.setAttribute('aria-label', '?');
   btn.textContent = '?';
   toolsWrap.appendChild(btn);
  }
 });
}


function resetAllWins(){
 setWindowLayout('cols3');
}

function setWindowLayout(preset){
 if(preset === 'cols3'){
 dashboardCols = { 1: ['win-pokeballs', 'win-story', 'win-team', 'win-hatchery'], 2: ['win-currency', 'win-map', 'win-battle', 'win-base'], 3: ['win-shortcuts', 'win-tabs', 'win-training', 'win-mine'] };
 }
 try{ safeStorage.set('pokeworld_cols_v13', JSON.stringify(dashboardCols)); }catch(_e){}
 renderDashboardColumns();
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderDashboardColumns !== 'undefined') { if (typeof window !== 'undefined') window.renderDashboardColumns = renderDashboardColumns; if (typeof globalThis !== 'undefined') globalThis.renderDashboardColumns = renderDashboardColumns; }
if (typeof moveWinToCol !== 'undefined') { if (typeof window !== 'undefined') window.moveWinToCol = moveWinToCol; if (typeof globalThis !== 'undefined') globalThis.moveWinToCol = moveWinToCol; }
if (typeof getDashboardCols !== 'undefined') { if (typeof window !== 'undefined') window.getDashboardCols = getDashboardCols; if (typeof globalThis !== 'undefined') globalThis.getDashboardCols = getDashboardCols; }
if (typeof setDashboardCols !== 'undefined') { if (typeof window !== 'undefined') window.setDashboardCols = setDashboardCols; if (typeof globalThis !== 'undefined') globalThis.setDashboardCols = setDashboardCols; }
try{ if(typeof window !== 'undefined') window.dashboardCols = dashboardCols; if(typeof globalThis !== 'undefined') globalThis.dashboardCols = dashboardCols; }catch(_){}
if (typeof scrollToWin !== 'undefined') { if (typeof window !== 'undefined') window.scrollToWin = scrollToWin; if (typeof globalThis !== 'undefined') globalThis.scrollToWin = scrollToWin; }
if (typeof resetAllWins !== 'undefined') { if (typeof window !== 'undefined') window.resetAllWins = resetAllWins; if (typeof globalThis !== 'undefined') globalThis.resetAllWins = resetAllWins; }
if (typeof renderDashboardChrome !== 'undefined') { if (typeof window !== 'undefined') window.renderDashboardChrome = renderDashboardChrome; if (typeof globalThis !== 'undefined') globalThis.renderDashboardChrome = renderDashboardChrome; }
if (typeof setWindowLayout !== 'undefined') { if (typeof window !== 'undefined') window.setWindowLayout = setWindowLayout; if (typeof globalThis !== 'undefined') globalThis.setWindowLayout = setWindowLayout; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderDashboardColumns,
  moveWinToCol,
  getDashboardCols,
  setDashboardCols,
  scrollToWin,
  resetAllWins,
  renderDashboardChrome,
  setWindowLayout,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('scrollToWin', scrollToWin); } catch (_) {} }



