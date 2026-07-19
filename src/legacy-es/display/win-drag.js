let activeDragWinId = null;
let dragGhostEl = null;

function startWinDrag(e, winId){
 if(e.target.tagName === 'BUTTON') return;
 const win = document.getElementById(winId);
 if(!win) return;

 activeDragWinId = winId;
 win.style.opacity = '0.5';

 dragGhostEl = document.createElement('div');
 const titleText = win.querySelector('.win-header-title')?.textContent || winId;
 dragGhostEl.innerHTML = `<div class="extracted-template-style-124">
 <span>Glisser pour ancrer : ${titleText}</span>
 </div>`;
 dragGhostEl.style.position = 'fixed';
 dragGhostEl.style.pointerEvents = 'none';
 dragGhostEl.style.zIndex = '10000';
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
 const wins = dashboardCols[c] || [];
 wins.forEach(wId => {
 if(wId === activeDragWinId) return;
 const wEl = document.getElementById(wId);
 if(!wEl) return;
 const wRect = wEl.getBoundingClientRect();
 if(e.clientY >= wRect.top && e.clientY <= wRect.bottom){
 const midY = wRect.top + wRect.height / 2;
 if(e.clientY < midY){
 wEl.classList.add('insert-above');
 } else {
 wEl.classList.add('insert-below');
 }
 }
 });
 }
 }
});

window.addEventListener('mouseup', (e) => {
 if(!activeDragWinId) return;
 const win = document.getElementById(activeDragWinId);
 if(win) win.style.opacity = '1';

 let targetWinId = null;
 let insertMode = null;
 document.querySelectorAll('.dash-win').forEach(w => {
 if(w.classList.contains('insert-above')){
 targetWinId = w.id;
 insertMode = 'above';
 } else if(w.classList.contains('insert-below')){
 targetWinId = w.id;
 insertMode = 'below';
 }
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

 if(targetWinId && insertMode){
 let targetCol = null;
 let targetIndex = -1;
 for(let c=1; c<=3; c++){
 const arr = dashboardCols[c] || [];
 const idx = arr.indexOf(targetWinId);
 if(idx !== -1){ targetCol = c; targetIndex = idx; break; }
 }
 if(targetCol !== null){
 for(let c=1; c<=3; c++){
 dashboardCols[c] = (dashboardCols[c] || []).filter(id => id !== activeDragWinId);
 }
 let newIdx = targetIndex;
 if(insertMode === 'below') newIdx = targetIndex + 1;
 dashboardCols[targetCol].splice(newIdx, 0, activeDragWinId);
 try{ safeStorage.set('pokeworld_cols_v12', JSON.stringify(dashboardCols)); }catch(err){}
 renderDashboardColumns();
 }
 } else if(droppedCol){
 moveWinToCol(activeDragWinId, droppedCol);
 } else {
 renderDashboardColumns();
 }

 if(dragGhostEl && dragGhostEl.parentNode) dragGhostEl.parentNode.removeChild(dragGhostEl);
 activeDragWinId = null;
 dragGhostEl = null;
});


// --- Migrated to ES module, globals exposed ---
if (typeof startWinDrag !== 'undefined' && typeof window !== 'undefined') window.startWinDrag = startWinDrag;

export {};

