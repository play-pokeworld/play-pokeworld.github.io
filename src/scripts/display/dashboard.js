// ============================================================
// DASHBOARD — (split from map.js)
// ============================================================
let dashboardCols = {
  1: ['win-story', 'win-team', 'win-hatchery'],
  2: ['win-battle', 'win-map'],
  3: ['win-tabs', 'win-training']
};

function renderDashboardColumns(){
  let hasStory = false;
  for(let c=1; c<=3; c++){
    if((dashboardCols[c]||[]).includes('win-story')) hasStory = true;
  }
  if(!hasStory) {
    if(!dashboardCols[1]) dashboardCols[1] = [];
    dashboardCols[1].unshift('win-story');
  }
  let hasHatch = false, hasTrain = false;
  for(let c=1; c<=3; c++){
    if((dashboardCols[c]||[]).includes('win-hatchery')) hasHatch = true;
    if((dashboardCols[c]||[]).includes('win-training')) hasTrain = true;
  }
  if(!hasHatch){
    if(!dashboardCols[1]) dashboardCols[1] = [];
    dashboardCols[1].push('win-hatchery');
  }
  if(!hasTrain){
    if(!dashboardCols[3]) dashboardCols[3] = [];
    dashboardCols[3].push('win-training');
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
  try{ safeStorage.set('pokeworld_cols_v12', JSON.stringify(dashboardCols)); }catch(e){}
  renderDashboardColumns();
}

function moveWinVert(winId, dir){
  let col = null;
  let idx = -1;
  for(let c=1; c<=3; c++){
    const arr = dashboardCols[c] || [];
    const i = arr.indexOf(winId);
    if(i !== -1){ col = c; idx = i; break; }
  }
  if(!col) return;
  const arr = dashboardCols[col];
  const targetIdx = idx + dir;
  if(targetIdx < 0 || targetIdx >= arr.length) return;
  const tmp = arr[idx];
  arr[idx] = arr[targetIdx];
  arr[targetIdx] = tmp;
  try{ safeStorage.set('pokeworld_cols_v12', JSON.stringify(dashboardCols)); }catch(e){}
  renderDashboardColumns();
}

function scrollToWin(winId){
  const win = document.getElementById(winId);
  if(win){
    win.scrollIntoView({behavior: 'smooth', block: 'start'});
    win.style.boxShadow = '0 0 20px var(--gold)';
    setTimeout(() => win.style.boxShadow = '', 1000);
  }
}

// ============================================================
// TAB SYSTEM

function resetAllWins(){
  setWindowLayout('cols3');
}

function setWindowLayout(preset){
  if(preset === 'cols3'){
    dashboardCols = { 1: ['win-story', 'win-team', 'win-hatchery'], 2: ['win-battle', 'win-map'], 3: ['win-tabs', 'win-training'] };
  }
  try{ safeStorage.set('pokeworld_cols_v12', JSON.stringify(dashboardCols)); }catch(e){}
  renderDashboardColumns();
}


