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
let activeDragWinId = null;
let dragGhostEl = null;
// Wave 15 (user feedback): remember where the dragged window CAME FROM —
// re-dropping it at its previous spot must restore its exact index, not
// push it to the bottom of the column.
let dragOrigin = { col: null, index: -1 };

function startWinDrag(e, winId){
 if(e.target.tagName === 'BUTTON') return;
 const win = document.getElementById(winId);
 if(!win) return;

 activeDragWinId = winId;
 win.style.opacity = '0.5';
 const _colsNow0 = (typeof getDashboardCols === 'function') ? getDashboardCols() : (window.dashboardCols || {});
 dragOrigin = { col: null, index: -1 };
 for (let c = 1; c <= 3; c++) {
   const _i = (_colsNow0[c] || []).indexOf(winId);
   if (_i !== -1) { dragOrigin = { col: c, index: _i }; break;
 }
 }

 dragGhostEl = document.createElement('div');
 const titleText = win.querySelector('.pw-win-hdr-label')?.textContent || winId;
 // Phase 26: same vignette of drag that the Pokemon/moves (look unifie).
 dragGhostEl.className = 'pw-drag-ghost pw-drag-ghost-win';
 _pwSetHtmlSafe(dragGhostEl, (typeof pwDragGhostHtml === 'function')
 ? pwDragGhostHtml('🗔', titleText, (typeof t === 'function' ? t('drag_win_hint') : 'Déplacer la fenêtre'))
 : `<span>${titleText}</span>`);
 // Wave 14: position/pointer-events/z-index live on the .pw-drag-ghost-win
 // class (DS2814) — only the cursor-follow offsets stay inline (dynamic).
 dragGhostEl.style.left = (e.clientX - 60) + 'px';
 dragGhostEl.style.top = (e.clientY - 20) + 'px';
 document.body.appendChild(dragGhostEl);

 updateFeatureWindows();

 for(let c=1; c<=3; c++){
 const colEl = document.getElementById('col-' + c);
 if(colEl && colEl.style.display === 'none'){
 colEl.style.display = 'flex';
 colEl.classList.add('temp-uncollapsed');
 }
 }

 e.preventDefault();
}

// Wave 18 (user feedback): a HIDDEN window (display:none → zero rect —
// e.g. win-mine disabled in settings) is never a valid drop boundary.
// Before, hovering the bottom of a column whose LAST entry was hidden
// marked the INVISIBLE window → no strip showed at all ("the strip does
// does not always position correctly"). Boundaries are computed on the
// VISIBLE windows only, then mapped back to the full data array.
function pwVisibleWinEls(ids){
 const out = [];
 for (const id of (ids || [])) {
  const el = document.getElementById(id);
  if (!el) continue;
  const r = el.getBoundingClientRect();
  if (r.height <= 0 || r.width <= 0) continue; // display:none / hidden
  out.push({ id, el, r });
 }
 return out;
}

window.addEventListener('mousemove', (e) => {
 if(!activeDragWinId || !dragGhostEl) return;
 dragGhostEl.style.left = (e.clientX - 60) + 'px';
 dragGhostEl.style.top = (e.clientY - 20) + 'px';

 document.querySelectorAll('.dash-win').forEach(w => {
 w.classList.remove('insert-above', 'insert-below');
 });

 updateFeatureWindows();

 for(let c=1; c<=3; c++){
 const colEl = document.getElementById('col-' + c);
 if(!colEl) continue;
 const rect = colEl.getBoundingClientRect();
 const isOverCol = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
 colEl.classList.toggle('col-hovered', isOverCol);

 if(isOverCol){
 // Wave 15 (user feedback): boundary-based marking — there is EXACTLY ONE
 // insertion point per column (above the first window whose middle sits
 // below the cursor, else after the last one). When the point falls
 // BETWEEN two windows, BOTH neighbours show the marker (above on the
 // lower window, below on the upper one), on every column — the old code
 // could only light the window directly under the cursor.
 const colsNow = (typeof getDashboardCols === 'function') ? getDashboardCols() : (window.dashboardCols || {});
 // Wave 18: visible windows only — a hidden last entry used to swallow
 // the bottom-of-column strip onto an invisible element.
 const vis = pwVisibleWinEls((colsNow[c] || []).filter(id => id !== activeDragWinId));
 let vi = vis.length;
 for (let i = 0; i < vis.length; i++) {
   const r = vis[i].r;
   if (e.clientY < r.top + r.height / 2) { vi = i; break; }
 }
 if (vi < vis.length) vis[vi].el.classList.add('insert-above');
 if (vi > 0) vis[vi - 1].el.classList.add('insert-below');
 }
 }
});

window.addEventListener('mouseup', (e) => {
 if(!activeDragWinId) return;
 const win = document.getElementById(activeDragWinId);
 if(win) win.style.opacity = '1';

 document.querySelectorAll('.dash-win').forEach(w => {
 w.classList.remove('insert-above', 'insert-below');
 });

 let droppedCol = null;
 updateFeatureWindows();

 for(let c=1; c<=3; c++){
 const colEl = document.getElementById('col-' + c);
 if(!colEl) continue;
 const rect = colEl.getBoundingClientRect();
 if(e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom){
 droppedCol = c;
 }
 colEl.classList.remove('col-hovered');
 if(colEl.classList.contains('temp-uncollapsed')){
 colEl.classList.remove('temp-uncollapsed');
 }
 }

 {
  // Wave 15 (user feedback): the drop index is computed FROM THE CURSOR Y
  // on every column — never "push to the end" by default. Re-dropping at
  // the previous spot computes the original index again (visible no-op),
  // and dropping between two windows lands exactly there.
  // `others` never contains the dragged window, so the computed index is
  // already expressed in the WITHOUT-it array — insert directly.
  const cols = (typeof getDashboardCols === 'function') ? getDashboardCols() : (window.dashboardCols || {});
  if (droppedCol) {
   const others = (cols[droppedCol] || []).filter(id => id !== activeDragWinId);
   // Wave 18: cursor boundary computed on VISIBLE windows, index mapped
   // back into the full array (right before the next visible window).
   const vis = pwVisibleWinEls(others);
   let vi = vis.length;
   for (let i = 0; i < vis.length; i++) {
     const r = vis[i].r;
     if (e.clientY < r.top + r.height / 2) { vi = i; break; }
   }
   let insIdx = others.length;
   if (vi < vis.length) {
     insIdx = others.indexOf(vis[vi].id);
     if (insIdx < 0) insIdx = others.length;
   }
   for (let c = 1; c <= 3; c++) cols[c] = (cols[c] || []).filter(id => id !== activeDragWinId);
   // Re-dropped at its previous spot ⇒ computed index == origin ⇒ no-op.
   const backHome = droppedCol === dragOrigin.col && insIdx === dragOrigin.index;
   if (!backHome) {
     if (!cols[droppedCol]) cols[droppedCol] = [];
     cols[droppedCol].splice(insIdx, 0, activeDragWinId);
   }
   } else {
   // No column under the cursor: restore the exact origin slot.
   for (let c = 1; c <= 3; c++) cols[c] = (cols[c] || []).filter(id => id !== activeDragWinId);
   if (dragOrigin.col && dragOrigin.index >= 0) {
     if (!cols[dragOrigin.col]) cols[dragOrigin.col] = [];
     cols[dragOrigin.col].splice(Math.min(dragOrigin.index, cols[dragOrigin.col].length), 0, activeDragWinId);
   }
   }
   try{ safeStorage.set('pokeworld_cols_v12', JSON.stringify(cols)); }catch(_err){}
   renderDashboardColumns();
 }

 if(dragGhostEl && dragGhostEl.parentNode) dragGhostEl.parentNode.removeChild(dragGhostEl);
 activeDragWinId = null;
 dragGhostEl = null;
});


// --- Migrated to ES module, globals exposed ---
if (typeof startWinDrag !== 'undefined') { if (typeof window !== 'undefined') window.startWinDrag = startWinDrag; if (typeof globalThis !== 'undefined') globalThis.startWinDrag = startWinDrag; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  startWinDrag,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('startWinDrag', startWinDrag); } catch (_) {} }

