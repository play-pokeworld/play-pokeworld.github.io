// --- Dimensions des rectangles (style PokéClicker : routes = longues barres) ---
function nodeDims(loc, id){
  if(loc.w && loc.h) return {w:loc.w, h:loc.h}; // dimensions calées sur la carte PokéClicker
  if(loc.type==='town')    return {w:96,  h:48};
  if(loc.type==='dungeon') return {w:82,  h:48};
  if(loc.type==='sea')     return {w:120, h:44};
  // route : on étire l'axe principal vers les lieux connectés
  const reg = getCurrentRegionLocs();
  const conns = (loc.conn||[]).map(c=>reg[c]).filter(Boolean);
  if(conns.length){
    const ax = conns.reduce((s,c)=>s+c.x,0)/conns.length;
    const ay = conns.reduce((s,c)=>s+c.y,0)/conns.length;
    if(Math.abs(ax-loc.x) >= Math.abs(ay-loc.y)) return {w:134, h:46};
    return {w:46, h:134};
  }
  return {w:134, h:46};
}

// --- Progression par nombre de Pokémon battus (style PokéClicker) ---
// Chaque lieu (sauf les villes, minWins 0) exige de remporter `minWins`
// combats sauvages DANS ce lieu pour débloquer les lieux qui lui sont
// connectés (propagation via `conn`). On "farm" un lieu -> ses voisins se
// déverrouillent. Aucun blocage possible : on peut toujours battre des
// Pokémon dans le lieu courant pour avancer.
function _regLocs(){ return getCurrentRegionLocs(); }
function _startNodes(){ return (G.region==='johto') ? ['newbark','olivine'] : ['pallet']; }
function locCleared(id){
  const loc = _regLocs()[id]; if(!loc) return false;
  return (((G.wildWinsByLoc||{})[id])||0) >= (loc.minWins||0);
}
function locReachable(id, _seen){
  const loc = _regLocs()[id]; if(!loc) return false;
  // Sécurité anti-blocage : on est toujours "présent" là où on se trouve,
  // et on peut toujours retomber sur les villes connectées (minWins 0).
  if(id === G.location) return true;
  if(_startNodes().indexOf(id) >= 0) return true;
  _seen = _seen || new Set();
  if(_seen.has(id)) return false;
  _seen.add(id);
  const conn = loc.conn || [];
  for(let i=0;i<conn.length;i++){
    const n = conn[i];
    if(locReachable(n, _seen) && locCleared(n)) return true;
  }
  return false;
}
// Voisin "bloquante" : atteignable mais pas encore "cleared" -> c'est lui
// qu'il faut farmer pour débloquer `id`.
function blockingNeighbor(id){
  const loc = _regLocs()[id]; if(!loc) return null;
  const conn = loc.conn || [];
  for(let i=0;i<conn.length;i++){
    const n = conn[i];
    if(locReachable(n) && !locCleared(n)) return n;
  }
  return null;
}

// --- Déblocage PERMANENT (à vie) : un lieu atteint via la chaîne reste
// débloqué même si la chaîne se "casse" (reset partiel de sauvegarde, etc.).
// On union les lieux atteignables courants dans G.unlockedLocs ; on n'en
// retire jamais (les lieux déjà ouverts le restent définitivement). ---
function recomputeUnlocks(){
  if(!G) return;
  if(!G.unlockedLocs || typeof G.unlockedLocs!=='object') G.unlockedLocs={};
  const locs=_regLocs();
  for(const id in locs){ if(locReachable(id)) G.unlockedLocs[id]=true; }
}
function isLocUnlocked(id){
  if(!G || !G.unlockedLocs || typeof G.unlockedLocs!=='object') return true; // sécurité : jamais bloquant
  if(id===G.location) return true;                 // lieu courant : toujours accessible (on peut y farmer)
  if(_startNodes().indexOf(id) >= 0) return true;  // villes de départ
  return !!G.unlockedLocs[id];
}

// --- Fenêtres PENSION & ENTRAÎNEMENT : déverrouillage ciblé ---
// Pension (Couveuse/Day Care) : débloquée ENSEMBLE avec la route qui y
// mène (Route 5 à Kanto, Route 34 à Johto) -> "route de la pension".
function hatcheryUnlocked(){
  return isLocUnlocked('route5') || isLocUnlocked('jroute34');
}
// Entraînement : débloqué en battant l'arène du Major Bob (Lt. Surge) à Carmin.
function trainingUnlocked(){
  return !!(G.badges && G.badges.includes('surge'));
}
// (R)applique la visibilité des fenêtres selon les conditions ci-dessus.
// À appeler à chaque renderMap / fin de combat pour qu'elles apparaissent
// dès que la condition est remplie (pas seulement au (re)chargement).
function updateFeatureWindows(){
  const hWin = document.getElementById('win-hatchery');
  if(hWin) hWin.style.display = hatcheryUnlocked() ? 'flex' : 'none';
  const tWin = document.getElementById('win-training');
  if(tWin) tWin.style.display = trainingUnlocked() ? 'flex' : 'none';
}

// --- Code couleur de la carte (priorité : gris > vert > violet > bleu > jaune > transparent) ---
function mapNodeState(id){
  const loc=getLocObj(id);
  if(!loc) return {locked:false, color:'rgba(58,63,68,0.55)', kind:'locked'};
  const badgeReq=loc.badgeReq||0;
  const storyReq=loc.storyReq||0;
  if(badgeReq>G.badges.length || storyReq>(G.storyIdx||0) || !isLocUnlocked(id)) return {locked:true, color:'rgba(58,63,68,0.55)', kind:'locked'};
  const hasQuest = (G.activeQuests||[]).some(i=>{
    const def = i.cat==='main' ? getMainQuestDef(i.qid) : (i.cat==='side' ? SIDE_QUESTS[i.qid] : null);
    return def && def.loc && locGroup(def.loc)===locGroup(id);
  });
  if(hasQuest) return {locked:false, color:'rgba(31,138,59,0.55)', kind:'quest'};
  const roam=getRoamingLegendaryForRoute(id);
  if(roam && !speciesOwned(roam)) return {locked:false, color:'rgba(123,31,162,0.55)', kind:'roaming'};
  const comp=locCompletion(id);
  if(comp && comp.caught < comp.total) return {locked:false, color:'rgba(21,101,194,0.55)', kind:'catch'};
  if(comp && comp.ids && comp.ids.some(sp=>!isSpeciesShiny(sp))) return {locked:false, color:'rgba(201,160,0,0.60)', kind:'shiny'};
  return {locked:false, color:'rgba(255,255,255,0.10)', kind:'done'};
}

function renderMap(){
  recomputeUnlocks();
  updateFeatureWindows();
  const svg=document.getElementById('map-svg');
  if(svg) svg.setAttribute('viewBox','0 0 1600 960');
  const connG=document.getElementById('connections');
  const nodeG=document.getElementById('nodes');
  const terrainG=document.getElementById('map-terrain');
  const reg = (typeof G!=='undefined'&&G&&G.region)?G.region:'kanto';
  const img = reg==='johto'?JOHTO_MAP_IMG:KANTO_MAP_IMG;
  if(terrainG){
    terrainG.innerHTML = `<image href="${img}" xlink:href="${img}" x="0" y="0" width="1600" height="960" preserveAspectRatio="xMidYMid meet"/>`;
  }
  const regLocs = getCurrentRegionLocs();

  // Connexions : la carte de fond (style PokéClicker) porte déjà les routes.
  // On n'affiche plus de traits droits qui traversaient la carte d'un bord à l'autre.
  connG.innerHTML='';

  // Draw nodes (marqueurs RECTANGULAIRES = « zones », façon PokéClicker)
  let rectsHTML = '';
  let labelsHTML = '';
  for(const [id, loc] of Object.entries(regLocs)){
    const isCurrent=id===G.location;
    const badgeReq=loc.badgeReq||0;
    const storyReq=loc.storyReq||0;
    const isLocked=badgeReq>G.badges.length || storyReq>(G.storyIdx||0) || !isLocUnlocked(id);
    const isReachable=!isLocked&&!isCurrent;
        const dims=nodeDims(loc, id);
        const w=dims.w, h=dims.h;
        const st=mapNodeState(id);
        const color=st.color;
        const stroke=isCurrent?'var(--gold)':isLocked?'#444':(st.kind==='done'?'rgba(255,255,255,0.25)':'#fff');
        const sw=isCurrent?4:2;
        const icon = loc.type==='town'?'🏘':loc.type==='sea'?'🌊':loc.type==='dungeon'?'⛰':'🌿';
    const lname = getLocName(id);
    const labelW = Math.max(38, lname.length*7 + 14);
    const labelH = 18;
    const labelColor = isCurrent?'#ffd54a':isReachable?'#ececec':'#9a9a9a';
    const x0=loc.x - w/2, y0=loc.y - h/2;
    const lang = (typeof G!=='undefined'&&G&&G.lang)?G.lang:'fr';
    const blk = blockingNeighbor(id);
    const reqStr = (badgeReq>G.badges.length)
      ? (lang==='en'?`requires ${badgeReq} badge(s) (you have ${G.badges.length})`:`n\u00e9cessite ${badgeReq} badge(s) (vous en avez ${G.badges.length})`)
      : (blk)
      ? (lang==='en'?`win ${getLocObj(blk).minWins||0} wild battles in ${getLocName(blk)} (you have ${((G.wildWinsByLoc||{})[blk]||0)})`:`remporte ${getLocObj(blk).minWins||0} combats sauvages \u00e0 ${getLocName(blk)} (tu en as ${((G.wildWinsByLoc||{})[blk]||0)})`)
      : (lang==='en'?`locked by story \u2014 ${G.storyIdx||0}/${storyReq}`:`verrouill\u00e9 par l'histoire \u2014 ${G.storyIdx||0}/${storyReq}`);
    const title = isLocked?`${getLocName(id)} \u2014 ${reqStr}`:getLocName(id);
    rectsHTML+=`
      <g class="loc-node${isCurrent?' current':''}${isReachable?' adjacent':''}${isLocked?' locked':''}" onclick="clickLocation('${id}')" style="cursor:${isLocked?'not-allowed':'pointer'}">
        <title>${title}</title>
        <rect x="${x0-2}" y="${y0-2}" width="${w+4}" height="${h+4}" rx="11" fill="#000" opacity="${isLocked?0.35:0.4}"/>
        <rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="9" fill="${color}" stroke="${stroke}" stroke-width="${sw}"/>
        ${isCurrent?`<rect x="${x0-6}" y="${y0-6}" width="${w+12}" height="${h+12}" rx="13" fill="none" stroke="var(--gold)" stroke-width="3" opacity="0.9" class="pulse"/>`:''}
        <text x="${loc.x}" y="${loc.y - h/2 + 14}" text-anchor="middle" dominant-baseline="middle" font-size="${isCurrent?18:15}" fill="#fff" opacity="${isLocked?0.6:1}">${isLocked?'🔒':icon}</text>
      </g>`;
    labelsHTML += `<g class="map-label" style="pointer-events:none;">
        <rect x="${loc.x - labelW/2}" y="${loc.y - labelH/2}" width="${labelW}" height="${labelH}" rx="9" fill="rgba(0,0,0,0.80)" stroke="${isCurrent?'#ffd54a':'rgba(255,255,255,0.25)'}" stroke-width="0.8"/>
        <text x="${loc.x}" y="${loc.y+0.5}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="bold" fill="${labelColor}" style="paint-order:stroke;stroke:#000;stroke-width:3px;" opacity="${isLocked?0.6:1}">${lname}</text>
      </g>`;
    // NPC markers
    const npcs = (typeof NPCS!=='undefined')?NPCS[id]:null;
    if(npcs && npcs.length && !isLocked){
      let pni=-1;
      for(let ni=0; ni<npcs.length; ni++){
        const npc=npcs[ni];
        if(npc.mainTalk!=null){
          const inst=(typeof G!=='undefined'&&G)?G.activeQuests.find(i=>i.qid===npc.mainTalk && i.cat==='main'):null;
          const def=(typeof getMainQuestDef==='function')?getMainQuestDef(npc.mainTalk):null;
          if(inst && def && !questDone(inst,def)){ pni=ni; break; }
        }
        if(npc.quest && (typeof SIDE_QUESTS!=='undefined') && SIDE_QUESTS[npc.quest]){
          const done=(typeof G!=='undefined'&&G)?!!G.completedQuests['side_'+npc.quest]:false;
          const active=(typeof G!=='undefined'&&G)?G.activeQuests.some(i=>i.qid===npc.quest && i.cat==='side'):false;
          if(!done && !active){ pni=ni; break; }
        }
      }
      if(pni>=0){
        const npc=npcs[pni];
        const nx=loc.x + labelW/2 + 10, ny=loc.y - 13;
        rectsHTML+=`<g class="npc-node" onclick="event.stopPropagation();openNpc('${id}',${pni})" style="cursor:pointer"><title>${npc.name}</title>`
          +`<circle cx="${nx}" cy="${ny}" r="11" fill="#7b3fa0" stroke="#fff" stroke-width="2"/>`
          +`<text x="${nx}" y="${ny+1}" text-anchor="middle" dominant-baseline="middle" font-size="13">🗣</text></g>`;
      }
    }
  }
  nodeG.innerHTML = rectsHTML + labelsHTML;
  ensureMapHelpButton();

}


// Fast travel: any location whose badge requirement is met can be reached
// directly from anywhere, exactly like clicking a node on PokéClicker's map.
function clickLocation(id){
  const loc=getLocObj(id);
  if(!loc) return;
  const badgeReq=loc.badgeReq||0;
  if(badgeReq>G.badges.length){
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    const msg = lang === 'en'
      ? `⛔ You need ${badgeReq} badge(s) to access ${getLocName(id)}! (you have ${G.badges.length})`
      : `⛔ Il vous faut ${badgeReq} badge(s) pour accéder à ${getLocName(id)} ! (vous en avez ${G.badges.length})`;
    setMsg(msg);
    return;
  }
  const storyReq=loc.storyReq||0;
  if(storyReq>(G.storyIdx||0)){
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    const msg = lang === 'en'
      ? `📖 The story hasn't reached ${getLocName(id)} yet! (Story progress ${G.storyIdx||0}/${storyReq})`
      : `📖 L'histoire n'a pas encore débloqué ${getLocName(id)} ! (Progrès histoire ${G.storyIdx||0}/${storyReq})`;
    setMsg(msg);
    return;
  }
  if(!isLocUnlocked(id)){
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    const blk = blockingNeighbor(id);
    const msg = blk
      ? (lang === 'en'
          ? `⛔ Win ${getLocObj(blk).minWins||0} wild battles in ${getLocName(blk)} to unlock ${getLocName(id)}! (you have ${((G.wildWinsByLoc||{})[blk]||0)})`
          : `⛔ Remporte ${getLocObj(blk).minWins||0} combats sauvages à ${getLocName(blk)} pour débloquer ${getLocName(id)} ! (tu en as ${((G.wildWinsByLoc||{})[blk]||0)})`)
      : (lang === 'en'
          ? `⛔ ${getLocName(id)} is not reachable yet.`
          : `⛔ ${getLocName(id)} n'est pas encore accessible.`);
    setMsg(msg);
    return;
  }
  if(id===G.location){
    showTab('info');
    return;
  }
  G.location=id;
  markVisited(id);
  renderMap();
  showTab('info');
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  setMsg(lang === 'en' ? `📍 Teleported to ${getLocName(id)}.` : `📍 Vous vous téléportez à ${getLocName(id)}.`);
  saveGame();
}

function travelToRegion(targetReg){
  if(typeof G === 'undefined' || !G) return;
  if(targetReg === G.region) return;
  const lang = G.lang || 'fr';
  if(targetReg === 'johto'){
    G.region = 'johto';
    G.location = 'olivine';
    markVisited('olivine');
    markVisited('newbark');
    notify(lang==='en' ? "🚢 Arrived at Olivine City harbor in Johto!" : "🚢 Arrivée au port d'Oliville dans la région de Johto !", 'var(--blue)');
  } else {
    G.region = 'kanto';
    G.location = 'vermilion';
    markVisited('vermilion');
    notify(lang==='en' ? "🚢 Arrived at Vermilion City harbor in Kanto!" : "🚢 Arrivée au port de Carmin sur Mer dans la région de Kanto !", 'var(--blue)');
  }
  const sel = document.getElementById('map-region-select');
  if(sel) sel.value = G.region || 'kanto';
  const mapTitle = document.getElementById('map-win-title');
  if(mapTitle) mapTitle.textContent = (lang==='en' ? 'Map: ' : 'Carte : ') + (G.region === 'johto' ? 'Johto' : 'Kanto');
  renderMap();
  showTab('info');
  saveGame();
}

function switchMapRegion(reg){
  if(G.region !== reg){
    if(reg === 'johto'){
      if(!LOCS_JOHTO[G.location]) G.location = 'newbark';
    } else {
      if(!LOCS[G.location]) G.location = 'pallet';
    }
    G.region = reg;
  }
  markVisited(G.location);
  const sel = document.getElementById('map-region-select');
  if(sel) sel.value = G.region || 'kanto';
  const lang = G.lang || 'fr';
  const mapTitle = document.getElementById('map-win-title');
  if(mapTitle) mapTitle.textContent = (lang==='en' ? 'Map: ' : 'Carte : ') + (G.region === 'johto' ? 'Johto' : 'Kanto');
  renderMap();
  showTab('info');
  saveGame();
}

// ============================================================
// DOCKING COLUMN SYSTEM (Dashboard 3 Colonnes façon PokéClicker)
// ============================================================
let dashboardCols = {
  1: ['win-story', 'win-team', 'win-hatchery'],
  2: ['win-battle', 'win-map'],
  3: ['win-tabs', 'win-training']
};

let activeDragWinId = null;
let dragGhostEl = null;

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

function startWinDrag(e, winId){
  if(e.target.tagName === 'BUTTON') return;
  const win = document.getElementById(winId);
  if(!win) return;

  activeDragWinId = winId;
  win.style.opacity = '0.5';

  dragGhostEl = document.createElement('div');
  const titleText = win.querySelector('.win-header-title')?.textContent || winId;
  dragGhostEl.innerHTML = `<div style="background:#ffd700;color:#000;font-weight:bold;padding:10px 16px;border-radius:8px;box-shadow:0 8px 25px rgba(0,0,0,0.85);display:flex;align-items:center;gap:8px;font-size:14px;border:2px solid #fff;">
    <span>📌 Glisser pour Ancrer : ${titleText}</span>
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

function setWindowLayout(preset){
  if(preset === 'cols3'){
    dashboardCols = { 1: ['win-story', 'win-team', 'win-hatchery'], 2: ['win-battle', 'win-map'], 3: ['win-tabs', 'win-training'] };
  }
  try{ safeStorage.set('pokeworld_cols_v12', JSON.stringify(dashboardCols)); }catch(e){}
  renderDashboardColumns();
}

function resetAllWins(){
  setWindowLayout('cols3');
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
// ============================================================
var _activeTab='info';
function showTab(tab){
  _activeTab=tab;
  syncShinyState();
  renderTeamWindow();
  if(tab==='team'){ showTab('info'); return; }
  if(tab === 'mine' && G.badges.length < 2){
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    notify(lang==='en' ? "🔒 The Underground Mine unlocks alongside Diglett's Cave (requires 2 Badges)!" : "🔒 La Mine Souterraine se débloque en même temps que la Cave Taupiqueur (2 Badges) !", "var(--red)");
    showTab('info');
    return;
  }
  document.querySelectorAll('.tab').forEach((t,i)=>{
    t.classList.toggle('active',['info','box','mine','inventory','shop','market','pokedex'][i]===tab);
  });
  const content=document.getElementById('tab-content');
  if(tab==='info') renderLocInfo(content);
  else if(tab==='team') renderTeam(content);
  else if(tab==='box') renderBox(content);
  else if(tab==='mine') renderMine(content);
  else if(tab==='inventory') renderInventory(content);
  else if(tab==='shop') renderShop(content);
  else if(tab==='market') renderMarket(content);
  else if(tab==='pokedex') renderPokedex(content);
}

function saveCurrentTeamToPreset(key){
  if(!G.teamPresets) G.teamPresets = { preset1:{name:"Équipe Aventure",uids:[]}, preset2:{name:"Équipe Boss",uids:[]}, preset3:{name:"Équipe Entraînement",uids:[]} };
  if(!G.teamPresets[key]) G.teamPresets[key] = { name: "Preset " + key, uids: [] };
  G.teamPresets[key].uids = G.team.map(p => p && p.uid).filter(Boolean);
  notify(`💾 ${G.teamPresets[key].name} sauvegardée (${G.team.length} Pokémon) !`, 'var(--blue)');
  renderTeamWindow();
  saveGame();
}

function loadTeamFromPreset(key){
  if(typeof battle !== 'undefined' && battle && battle.active){
    notify("🔒 Impossible de changer d'équipe de combat pendant un affrontement !", "var(--red)");
    return;
  }
  const preset = G.teamPresets && G.teamPresets[key];
  if(!preset || !preset.uids || !preset.uids.length){
    notify("❌ Ce preset d'équipe est vide ! Mettez des Pokémon en équipe et cliquez sur Sauvegarder.", "var(--red)");
    return;
  }
  const newTeam = [];
  for(const uid of preset.uids){
    let found = G.team.find(p => p && p.uid === uid);
    if(!found){
      for(const k in (G.collection || {})){
        if(G.collection[k] && G.collection[k].uid === uid){
          found = G.collection[k];
          delete G.collection[k];
          break;
        }
      }
    }
    if(found) newTeam.push(found);
  }
  if(!newTeam.length){
    notify("❌ Aucun Pokémon du preset n'a été trouvé !", "var(--red)");
    return;
  }
  for(const oldP of G.team){
    if(!newTeam.includes(oldP)){
      G.collection[String(oldP.id)] = oldP;
    }
  }
  G.team = newTeam;
  G.activePresetId = key;
  notify(`⚡ ${preset.name} chargée avec succès (${newTeam.length} Pokémon) !`, 'var(--green)');
  renderTeamWindow();
  const tabEl = document.getElementById('tab-content');
  if(tabEl && document.querySelector('.tab[onclick*="team"]')?.classList.contains('active')) renderTeam(tabEl);
  saveGame();
}

function renderTeamPresetsToolbar(){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(!G.teamPresets) G.teamPresets = { preset1:{name:"Équipe Aventure",uids:[]}, preset2:{name:"Équipe Boss",uids:[]}, preset3:{name:"Équipe Entraînement",uids:[]} };
  return `<div style="display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.3);padding:6px;border-radius:6px;margin-bottom:8px;border:1px solid #3a322c;flex-wrap:wrap;">
    <span style="font-size:10px;color:var(--gold);font-weight:bold;">📑 ${lang==='en'?'Presets:':'Presets :'}</span>
    ${['preset1','preset2','preset3'].map((pk, idx) => {
      const active = G.activePresetId === pk;
      const count = (G.teamPresets[pk]?.uids || []).length;
      return `<div style="display:flex;align-items:center;gap:2px;"><button class="hbtn" style="padding:3px 6px;font-size:10px;${active?'background:var(--accent);border-color:#ff8a80;':''}" onclick="loadTeamFromPreset('${pk}')" title="Charger ${G.teamPresets[pk]?.name}">#${idx+1} (${count})</button>
      <button class="hbtn" style="padding:2px 5px;font-size:9px;color:var(--dim);" onclick="saveCurrentTeamToPreset('${pk}')" title="Sauvegarder l'équipe actuelle">💾</button></div>`;
    }).join('')}
  </div>`;
}

function renderTeamWindow(){
  const el = document.getElementById('team-window-body');
  if(!el) return;
  if(G.team.length===0){
    el.innerHTML=`<div style="text-align:center;padding:20px;color:var(--dim);font-size:12px;">
      ${t('team_empty')}<br><br>
      ${!G.starter?`<button class="hbtn" onclick="chooseStarter()">${t('choose_starter')}</button>`:t('explore_routes')}
    </div>`;
    return;
  }
  const battleLockBanner = battle.active ? `<div style="background:rgba(244,67,54,0.15);border:1px solid var(--red);padding:6px 8px;border-radius:4px;margin-bottom:6px;color:#ff8a80;font-size:11px;display:flex;align-items:center;gap:6px;">
    <span>🔒</span><span>${t('battle_lock_team')}</span>
  </div>` : '';
  
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  el.innerHTML = renderTeamPresetsToolbar() + battleLockBanner + G.team.map((p, i) => {
    if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
    if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);
    const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
    const itm = p.heldItem ? ITEMS[p.heldItem] : null;
    const curLevelBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, p.xp - curLevelBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
    const xpPct = clamp(Math.floor((xpInLevel / xpReqLevel) * 100), 0, 100);
    return `<div class="poke-card" draggable="true"
        style="padding:6px;margin-bottom:6px;cursor:pointer;${isShiny?'border:1px solid var(--yellow);background:rgba(255,215,0,0.06);':''}"
        ondragstart="onTeamDragStart(event,${i})"
        ondragover="onTeamDragOver(event)"
        ondragleave="onTeamDragLeave(event)"
        ondrop="onTeamDrop(event,${i})"
        onclick="onTeamCardClick(event,${i})"
        oncontextmenu="event.preventDefault(); openPokeModal(${i}); return false;"
        title="Clic: échanger avec boîte | Clic Droit: fiche">
      <div class="poke-card-top" style="gap:6px;">
        <div class="poke-sprite${isShiny?' is-shiny':''}" style="width:34px;height:34px;font-size:15px;background:${TYPE_COLORS[p.type1]||'#333'}22;border:2px solid ${isShiny?'var(--yellow)':TYPE_COLORS[p.type1]}">${spriteImg(p.id,p.emoji,{shiny:isShiny,size:30})}</div>
        <div class="poke-info" style="min-width:0;flex:1;">
          <div class="poke-name" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${isShiny?'✨ ':''}${p.name} <span style="font-size:10px;color:var(--dim)">${lang==='en'?'Lv.':'Nv.'}${p.level}</span></div>
          <div style="font-size:10px;color:${itm?'var(--gold)':'var(--dim)'};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🎒 ${itm ? itm.icon + ' ' + getItemName(p.heldItem) : (lang==='en'?'No item':'Aucun objet')}</div>
          <div style="height:3px;width:100%;background:#1a1412;border-radius:1.5px;overflow:hidden;margin-top:4px;" title="XP: ${xpInLevel}/${xpReqLevel}">
            <div style="width:${xpPct}%;background:var(--purple);height:100%;"></div>
          </div>
          <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:4px;">
            ${(p.moves||[]).map(m=>{
              const mv = MOVES[m.id];
              return `<span style="background:${TYPE_COLORS[mv?.type]||'#444'};color:#fff;font-size:9px;padding:1px 4px;border-radius:3px;">${getMoveName(m.id)}</span>`;
            }).join('')}
          </div>
        </div>
        <button class="hbtn" style="padding:2px 6px;font-size:10px;" onclick="event.stopPropagation();openPokeModal(${i})" title="Fiche">📋</button>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// LOCATION INFO TAB
// ============================================================
function renderLocInfo(el){
  const loc=getLocObj(G.location);
  if(!loc) return;
  const champId=loc.champ;
  const champ=champId?CHAMPIONS[champId]:null;
  const champDefeated=champId&&G.defeatedChamps[champId];
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  let html=`<div class="loc-title">${loc.type==='town'?'🏙':'🌿'} ${getLocName(G.location)}</div>`;
  html+=`<div class="loc-sub">${typeLabel(loc.type)}</div>`;

  const lore = STORY_LORE[G.location];
  if(lore){
    const spk = lang === 'en' ? lore.speaker_en : lore.speaker_fr;
    const txt = lang === 'en' ? lore.text_en : lore.text_fr;
    html += `<div style="background:rgba(255,255,255,0.05);border-left:3px solid var(--accent);padding:8px 10px;border-radius:0 6px 6px 0;margin:8px 0;font-size:11px;color:#ddd;line-height:1.4;">
      <div style="font-weight:bold;color:var(--accent);margin-bottom:3px;">💬 ${spk} :</div>
      <div style="font-style:italic;">« ${txt} »</div>
    </div>`;
  }

  // Habitants / PNJ — boutons d'action (taille identique à Boutique / Arène)
  const locNpcs = (typeof NPCS!=='undefined') ? (NPCS[G.location]||[]) : [];
  let npcActions='';
  if(locNpcs.length){
    npcActions += `<div style="grid-column:1/-1;margin-bottom:8px;">`;
    npcActions += `<div style="font-size:11px;color:var(--gold);font-weight:bold;margin-bottom:5px;">👥 ${lang==='en'?'Talk to inhabitants':'Parlez aux habitants'}</div>`;
    npcActions += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">`;
    locNpcs.forEach((npc, ni)=>{
      npcActions += `<div class="action-btn" onclick="openNpc('${G.location}',${ni})" style="border:1px solid #7b3fa0;background:rgba(123,63,160,0.20)"><span class="ab-icon">🗣️</span><span class="ab-label">${npc.name}</span></div>`;
    });
    npcActions += `</div></div>`;
  }

  // Actions
  html+=`<div class="action-grid">`+npcActions;

  if(G.location === 'vermilion'){
    html += `<div class="action-btn" onclick="travelToRegion('johto')" style="border:1px solid #2196f3;background:rgba(33,150,243,0.18)"><span class="ab-icon">🚢</span><span class="ab-label">${lang==='en'?'Sail to Johto Region (Harbor)':'Prendre le bateau vers Johto (Port)'}</span></div>`;
  } else if(G.location === 'olivine'){
    html += `<div class="action-btn" onclick="travelToRegion('kanto')" style="border:1px solid #2196f3;background:rgba(33,150,243,0.18)"><span class="ab-icon">🚢</span><span class="ab-label">${lang==='en'?'Sail to Kanto Region (Harbor)':'Prendre le bateau vers Kanto (Port)'}</span></div>`;
  }

  // Explore (route/dungeon/sea) — searching for items now happens through
  // wild encounters: defeating a Pokémon can drop an item AND/OR capture it.
  if(loc.type!=='town'){
    html+=`<div class="action-btn" onclick="exploreArea()"><span class="ab-icon">🌾</span><span class="ab-label">${t('explore_btn')}</span></div>`;
  }

  // Shop
  if(loc.shopId&&SHOPS[loc.shopId]){
    if(loc.shopId === 'indigo' && !G.championTitle){
      html+=`<div class="action-btn disabled" title="${lang==='en'?'Requires winning Kanto League':'Nécessite d\'avoir vaincu la Ligue Kanto'}"><span class="ab-icon">🔒</span><span class="ab-label">${t('tab_shop')} (${lang==='en'?'Locked: League Champion only':'Verrouillé : Maître Ligue uniquement'})</span></div>`;
    } else {
      html+=`<div class="action-btn" onclick="showTab('shop')"><span class="ab-icon">🛒</span><span class="ab-label">${t('tab_shop')}</span></div>`;
    }
  }

  // Champion
  if(champId){
    const champBadgeReq=champ?(champ.badgeReq||0):0;
    const champLocked=champBadgeReq>G.badges.length;
    if(champLocked){
      html+=`<div class="action-btn disabled"><span class="ab-icon">🔒</span><span class="ab-label">${getChampName(champId)} (${champBadgeReq}🏅 ${t('req_lbl')})</span></div>`;
    } else if(champDefeated){
      html+=`<div class="action-btn" onclick="startChampBattle('${champId}')" style="border:1px solid var(--gold)"><span class="ab-icon">🔄</span><span class="ab-label">${t('rematch_btn')} ${getChampName(champId)}</span></div>`;
    } else {
      html+=`<div class="action-btn" onclick="startChampBattle('${champId}')"><span class="ab-icon">⚔️</span><span class="ab-label">${t('challenge_btn')} ${getChampName(champId)}</span></div>`;
    }
  }

  // Pokémon Centers removed: your team auto-heals at the start of every battle.

  html+=`</div>`;

  const roamingId = getRoamingLegendaryForRoute(G.location);
  if(roamingId){
    html += `<div style="background:rgba(255,215,0,0.12);border:1px solid var(--gold);padding:6px 10px;border-radius:6px;margin:8px 0;font-size:11px;color:var(--gold);display:flex;align-items:center;gap:8px;">
      <span style="font-size:18px;">⚡</span>
      <span><b>${lang==='en'?'Roaming Legendary Notice (12h rotation):':'Légendaire errant en rotation (12h) :'}</b> ${getPokeName(roamingId)} ${lang==='en'?'can be encountered in wild battles here!':'peut apparaître dans les combats sauvages ici !'}</span>
    </div>`;
  }

  // Wild Pokémon
  if(loc.wild&&loc.wild.length){
    const comp=locCompletion(G.location);
    const complete=comp&&comp.caught===comp.total;
    const shinyCount=comp?comp.ids.filter(id=>isSpeciesShiny(id)).length:0;
    html+=`<div style="margin-top:10px;font-size:12px;color:var(--dim);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <span>${t('wild_poke')}</span>
      <span style="color:${complete?'var(--green)':'var(--gold)'};font-weight:bold">${comp?`${comp.caught}/${comp.total}`:''}</span>
      ${complete?'✅':''}
      ${shinyCount>0?`<span style="color:var(--yellow);background:rgba(255,215,0,0.1);padding:1px 6px;border-radius:8px;border:1px solid var(--yellow);font-weight:bold" title="Pokémon Shiny capturés ici">✨ Shiny : ${shinyCount}/${comp.total}</span>`:''}
    </div>`;
    html+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">`;
    for(const w of loc.wild){
      const [id,lo,hi,rarity] = w;
      const r = rarity||"common";
      const pd=PD[id];
      if(!pd) continue;
      const seen=G.pokedex[id];
      const owned=speciesOwned(id);
      const shinyOwned=isSpeciesShiny(id);
      html+=`<div style="background:var(--card);border-radius:6px;padding:6px 8px;font-size:11px;text-align:center;position:relative;${owned?`border:1px solid ${shinyOwned?'var(--yellow)':'var(--green)'};${shinyOwned?'box-shadow:0 0 8px rgba(255,215,0,0.3);':''}`:''}">
        ${owned?`<div style="position:absolute;top:2px;right:3px;font-size:10px">${shinyOwned?'<span class="shiny-tag" title="Capturé en Shiny">✨</span>':''}✅</div>`:''}
        <div class="${shinyOwned?'is-shiny':''}" style="height:32px;display:flex;align-items:center;justify-content:center;margin-bottom:2px">${seen?spriteImg(id,pd[8],{size:28, shiny:shinyOwned}):'❓'}</div>
        <div style="font-weight:${shinyOwned?'bold':'normal'}">${shinyOwned?'<span class="shiny-tag">✨</span>':''}${seen?getPokeName(id):'???'}</div>
        <div style="color:var(--dim)">Nv.${lo}-${hi}</div><div style="font-size:9px;margin-top:2px;color:${r==='rare'?'var(--gold)':r==='uncommon'?'var(--blue)':'var(--dim)'}">${r==='rare'?t('rarity_rare'):r==='uncommon'?t('rarity_uncom'):t('rarity_com')}</div>
      </div>`;
    }
    if(roamingId){
      const pd = PD[roamingId];
      const seen = G.pokedex[roamingId];
      const owned = speciesOwned(roamingId);
      const shinyOwned = isSpeciesShiny(roamingId);
      html += `<div style="background:var(--card);border-radius:6px;padding:6px 8px;font-size:11px;text-align:center;position:relative;border:1px solid var(--purple);box-shadow:0 0 10px rgba(156,39,176,0.3);">
        ${owned?`<div style="position:absolute;top:2px;right:3px;font-size:10px">${shinyOwned?'<span class="shiny-tag" title="Capturé en Shiny">✨</span>':''}✅</div>`:''}
        <div class="${shinyOwned?'is-shiny':''}" style="height:32px;display:flex;align-items:center;justify-content:center;margin-bottom:2px">${seen?spriteImg(roamingId,pd[8],{size:28, shiny:shinyOwned}):'❓'}</div>
        <div style="font-weight:bold;color:var(--purple);">${shinyOwned?'<span class="shiny-tag">✨</span>':''}${seen?getPokeName(roamingId):'???'}</div>
        <div style="color:var(--dim)">Nv.45</div>
        <div style="font-size:9px;margin-top:2px;color:var(--purple);font-weight:bold;">⚡ ${lang==='en'?'Roaming (1%)':'Errant (1%)'}</div>
      </div>`;
    }
    html+=`</div>`;
  }

  // Drop items preview
  const drops=ROUTE_DROPS[G.location];
  if(drops&&drops.length){
    html+=`<div style="margin-top:10px;font-size:12px;color:var(--dim)">${t('drop_items_lbl')}</div>`;
    html+=`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">`;
    for(const d of drops){
      const itm=ITEMS[d];
      html+=`<span style="background:var(--card);border-radius:4px;padding:2px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px">${itm?itemIcon(d,16):'?'} ${getItemName(d)}</span>`;
    }
    html+=`</div>`;
  }

  // Badges
  if(G.badges.length>0){
    html+=`<div style="margin-top:12px;font-size:12px;color:var(--dim)">Badges :</div>`;
    html+=`<div class="badge-row">`;
    const badgeList=['brock','misty','surge','erika','koga','blaine','giovanni','elite4'];
    for(const b of badgeList){
      const c=CHAMPIONS[b];
      const has=G.badges.includes(b);
      html+=`<div class="badge${has?' earned':''}" style="background:${has?'var(--card)':'#111'}" title="${c.badgeName}">${has?c.badgeEmoji:'⬛'}</div>`;
    }
    html+=`</div>`;
  }

  el.innerHTML=html;
}

function typeLabel(typ){
  return t('typ_' + typ) || typ;
}

// ============================================================
// EXPLORE (wild encounter — items & captures both happen via combat)
// ============================================================
function pickWildEncounter(loc, roamingId){
  if(roamingId && Math.random() < 0.01){
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    const wp = createPoke(roamingId, 45, rollShiny());
    if(wp) addBattleLog(lang === 'en' ? `⚡ ROAMING LEGENDARY APPEARED: ${wp.name}!` : `⚡ UN LÉGENDAIRE ERRANT APPARAÎT : ${wp.name} !`);
    return wp;
  }
  const wild = loc?.wild || [];
  if(!wild.length) return null;

  const r = Math.random();
  let targetBucket = r < 0.04 ? 'rare' : r < 0.24 ? 'uncommon' : 'common';
  let bucketEntries = wild.filter(w => (w[3] || 'common') === targetBucket);
  if(!bucketEntries.length){
    bucketEntries = wild.filter(w => (w[3] || 'common') === 'common');
    if(!bucketEntries.length) bucketEntries = wild;
  }
  const entry = bucketEntries[rand(0, bucketEntries.length - 1)];
  const lv = rand(entry[1], entry[2]);
  return createPoke(entry[0], lv, rollShiny());
}

function exploreArea(){
  if(G.team.length===0){setMsg('❌ Vous n\'avez pas de Pokémon !'); return;}
  const loc=getLocObj(G.location);
  if(!loc || !loc.wild || !loc.wild.length){setMsg('Aucun Pokémon sauvage ici.'); return;}
  const roamingId = getRoamingLegendaryForRoute(G.location);
  const wp = pickWildEncounter(loc, roamingId);
  if(wp) startBattle(wp, false);
}

function healTeam(){
  let healed=false;
  for(const p of G.team){
    if(p.currentHP<p.maxHP||p.status){
      p.currentHP=p.maxHP;
      p.status=null;
      for(const m of p.moves) m.pp=m.maxPP;
      healed=true;
    }
  }
  if(healed){
    notify('🏥 Équipe soignée au Centre Pokémon !');
    setMsg('💊 Tous vos Pokémon ont été soignés !');
    renderTeamWindow();
  } else setMsg('Vos Pokémon sont déjà en pleine forme !');
}

function addToInventory(key, qty){
  if(!ITEMS[key]) return;
  const cur=G.inventory[key]||0;
  const maxLimit = ITEMS[key].buff ? BAG_MAX : 999999;
  G.inventory[key]=Math.min(maxLimit, cur+qty);
}

// ============================================================
// TEAM TAB
// ============================================================
function renderTeam(el){
  if(G.team.length===0){
    el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim)">
      Vous n'avez pas encore de Pokémon !<br><br>
      ${!G.starter?`<button class="hbtn" onclick="chooseStarter()">Choisir votre Starter !</button>`:'Explorez les routes pour en capturer.'}
    </div>`;
    return;
  }
  const battleLockBanner = battle.active ? `<div style="background:rgba(244,67,54,0.15);border:1px solid var(--red);padding:8px 12px;border-radius:6px;margin-bottom:10px;color:#ff8a80;font-size:11px;display:flex;align-items:center;gap:8px;">
    <span style="font-size:16px;">🔒</span>
    <span><b>Combat en direct en cours :</b> L'équipe active est verrouillée. Vous ne pouvez ni échanger, ni réordonner, ni modifier le stuff pendant le combat.</span>
  </div>` : '';
  el.innerHTML= renderTeamPresetsToolbar() + battleLockBanner + G.team.map((p,i)=>renderPokeCard(p,i)).join('');
}

function renderPokeCard(p, i){
  if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
  if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);
  const curLevelBase = xpForLevel(p.level);
  const xpInLevel = Math.max(0, p.xp - curLevelBase);
  const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
  const itmKey=p.heldItem;
  const itm=(itmKey && ITEMS[itmKey]) ? {...ITEMS[itmKey], name:getItemName(itmKey), desc:getItemDesc(itmKey)} : null;
  const heldHtml=itm
    ? `<div style="font-size:10px;color:var(--gold);margin-top:2px">🎒 ${itm.icon} ${itm.name}</div>`
    : `<div style="font-size:10px;color:var(--dim);margin-top:2px">🎒 Aucun objet</div>`;
  const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
  return `<div class="poke-card" draggable="true"
      style="${isShiny?'border:1px solid var(--yellow);background:rgba(255,215,0,0.06);box-shadow:0 0 8px rgba(255,215,0,0.3);':''}"
      ondragstart="onTeamDragStart(event,${i})"
      ondragover="onTeamDragOver(event)"
      ondragleave="onTeamDragLeave(event)"
      ondrop="onTeamDrop(event,${i})"
      onclick="onTeamCardClick(event,${i})"
      oncontextmenu="event.preventDefault(); openPokeModal(${i}); return false;"
      title="Clic: échanger avec boîte | Clic Droit: voir la fiche">
    <div class="poke-card-top">
      <div class="poke-sprite${isShiny?' is-shiny':''}" style="background:${TYPE_COLORS[p.type1]||'#333'}22;border:2px solid ${isShiny?'var(--yellow)':TYPE_COLORS[p.type1]}">${spriteImg(p.id,p.emoji,{shiny:isShiny,size:40})}</div>
      <div class="poke-info">
        <div class="poke-name">${isShiny?'<span class="shiny-tag" title="Forme Shiny">✨</span>':''}${p.name} <span style="color:var(--dim);font-size:10px">Nv.${p.level}</span></div>
        <div style="margin-top:2px">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
        ${heldHtml}
      </div>
      <button class="hbtn" style="padding:3px 8px;font-size:11px" onclick="event.stopPropagation();openPokeModal(${i})" title="Sheet">${t("fiche_btn")}</button>
    </div>
    <div style="font-size:10px;color:var(--dim);margin-top:4px">XP: ${xpInLevel}/${xpReqLevel} · <span style="color:var(--dim)">Glisser réordonner · Clic échanger · Clic Droit Fiche</span></div>
  </div>`;
}

// ---------- Drag & Drop team ordering ----------
let _teamDragIdx=null;
function onTeamDragStart(ev, i){
  if(battle.active){
    notify("🔒 Action impossible : l'équipe est bloquée pendant un combat actif.", "var(--red)");
    ev.preventDefault(); return;
  }
  _teamDragIdx=i;
  ev.dataTransfer.effectAllowed='move';
  try{ ev.dataTransfer.setData('text/plain', String(i)); }catch(e){}
}
function onTeamDragOver(ev){
  ev.preventDefault();
  ev.dataTransfer.dropEffect='move';
  ev.currentTarget.style.borderColor='var(--accent)';
}
function onTeamDragLeave(ev){ ev.currentTarget.style.borderColor=''; }
function onTeamDrop(ev, j){
  ev.preventDefault();
  ev.currentTarget.style.borderColor='';
  if(battle.active) return;
  const i=_teamDragIdx; _teamDragIdx=null;
  if(i==null||i===j||!G.team[i]||!G.team[j]) return;
  const tmp=G.team[i]; G.team[i]=G.team[j]; G.team[j]=tmp;
  saveGame();
  renderTeamWindow();
}

// ---------- Click to swap with the box ----------
let _swapFromTeamIdx=null;
function onTeamCardClick(ev, i){
  if(ev.defaultPrevented) return;
  if(battle.active){
    notify("🔒 Action impossible : impossible d'échanger l'équipe en plein combat.", "var(--red)");
    return;
  }
  _swapFromTeamIdx=i;
  showTab('box');
}
function cancelBoxSwap(){ _swapFromTeamIdx=null; showTab('box'); renderTeamWindow(); }

// ============================================================
// BOX TAB (Pokémon hors équipe)
// ============================================================
function renderBox(el){
  const entries=boxedEntries();
  const swap=(_swapFromTeamIdx!=null && G.team[_swapFromTeamIdx]);
  const battleLockBanner = battle.active ? `<div style="background:rgba(244,67,54,0.15);border:1px solid var(--red);padding:8px 12px;border-radius:6px;margin-bottom:10px;color:#ff8a80;font-size:11px;display:flex;align-items:center;gap:8px;">
    <span style="font-size:16px;">🔒</span>
    <span>${t('battle_lock_box')}</span>
  </div>` : '';
  if(!entries.length){
    el.innerHTML= battleLockBanner + `<div style="text-align:center;padding:40px;color:var(--dim)">
      ${t('box_empty')}
    </div>${swap?`<div style="text-align:center;margin-top:10px"><button class="hbtn" onclick="cancelBoxSwap()">${t('finish_btn')}</button></div>`:''}`;
    return;
  }
  const header=swap
    ? `<div class="loc-sub" style="margin-bottom:8px">${t('box_swap_header')} <b>${G.team[_swapFromTeamIdx]?.name}</b>. <button class="hbtn" style="margin-left:6px" onclick="cancelBoxSwap()">✕</button></div>`
    : `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span class="loc-sub">📦 ${entries.length} ${t('box_header')}</span>
        <button class="hbtn" style="padding:4px 8px;font-size:11px;background:var(--blue);color:#fff;font-weight:bold;" onclick="openUnifiedSelectorModal('box_view')">🔍 ${typeof G!=='undefined'&&G&&G.lang==='en'?'Full-Screen PC Box':'Agrandir la Boîte'}</button>
      </div>`;
  el.innerHTML= battleLockBanner + `${header}
  <div class="box-grid">
    ${entries.map(({id, cleanId, poke})=>{
      const isShiny = poke.shinyUnlocked || poke.shinyActive || poke.shiny || isSpeciesShiny(poke.id);
      return `
    <div class="box-card" style="cursor:pointer;${isShiny?'border:1px solid var(--yellow);background:rgba(255,215,0,0.06);box-shadow:0 0 8px rgba(255,215,0,0.3);':''}" onclick="openBoxPokeModal('${id}')" oncontextmenu="event.preventDefault(); openBoxPokeModal('${id}'); return false;" title="Clic ou Clic Droit pour voir la fiche">
      <div class="ab-icon${isShiny?' shiny-spark is-shiny':''}">${spriteImg(poke.id,poke.emoji,{shiny:isShiny,size:44})}</div>
      <div style="font-weight:bold;font-size:12px">${isShiny?'<span class="shiny-tag" title="Forme Shiny">✨</span>':''}${poke.name}</div>
      <div style="font-size:10px;color:var(--dim)">Nv.${poke.level}</div>
      <div class="box-actions" onclick="event.stopPropagation()">
        <button class="hbtn" style="padding:3px 6px;font-size:11px" onclick="openBoxPokeModal('${id}')" title="Sheet">${t("fiche_btn")}</button>
        ${swap
          ? `<button class="hbtn" style="padding:3px 6px;font-size:11px" onclick="swapBoxWithTeam('${id}')" ${battle.active?'disabled title="Combat en cours"':''}>${t("swap_btn")}</button>`
          : `<button class="hbtn" style="padding:3px 6px;font-size:11px" onclick="addBoxedToTeam('${id}')" ${G.team.length>=6||battle.active?'disabled':''}>${t("team_btn")}</button>`}
      </div>
    </div>`;
    }).join('')}
  </div>`;
}

function addBoxedToTeam(id){
  if(battle.active){
    notify("🔒 Action impossible en combat : quittez le combat d'abord !", "var(--red)");
    return;
  }
  const poke=G.collection[id] || G.collection[String(id)];
  if(!poke) return;
  if(G.team.length>=6){
    setMsg('❌ Votre équipe est déjà pleine (6/6). Retirez un Pokémon d\'abord.');
    return;
  }
  if(G.team.some(p=>Number(p.id)===Number(poke.id))){
    setMsg('❌ Espèce déjà dans l\'équipe.');
    return;
  }
  // retire l'item éventuel (boîte = pas d'item actif)
  poke.heldItem = null;
  // supprime de la collection avec la bonne clé
  delete G.collection[id];
  delete G.collection[String(id)];
  for(const k of Object.keys(G.collection)){ if(G.collection[k]===poke) delete G.collection[k]; }
  G.team.push(poke);
  notify(`${poke.name} rejoint votre équipe !`);
  showTab('box');
  renderTeamWindow();
  saveGame();
}


function swapBoxWithTeam(id){
  if(battle.active){
    notify("🔒 Action impossible en combat : quittez le combat d'abord !", "var(--red)");
    return;
  }
  const idx=_swapFromTeamIdx;
  if(idx==null||!G.team[idx]) return cancelBoxSwap();
  const boxed=G.collection[id] || G.collection[String(id)];
  if(!boxed) return;
  const teamP=G.team[idx];
  const slotItem = teamP.heldItem || null;
  // le sortant perd son item
  teamP.heldItem = null;
  // l'entrant prend l'item du slot
  if(boxed.heldItem && boxed.heldItem !== slotItem){
    // rend l'item de boîte à l'inventaire, sécurité
    try{ addToInventory(boxed.heldItem,1); }catch(_){}
  }
  boxed.heldItem = slotItem;
  // anti-doublon équipe
  const incomingSpecies = Number(boxed.id);
  const duplicateInTeam = G.team.some((tp,ti)=>ti!==idx && Number(tp.id)===incomingSpecies);
  if(duplicateInTeam){
    setMsg('❌ Espèce déjà présente dans l\'équipe.');
    teamP.heldItem = slotItem;
    boxed.heldItem = null;
    return;
  }
  // --- correction clé collection ---
  // supprime l'entrée boxed
  delete G.collection[id];
  delete G.collection[String(id)];
  // supprime aussi toute référence à l'objet boxed (sécurité)
  for(const k of Object.keys(G.collection)){
    if(G.collection[k] === boxed) delete G.collection[k];
  }
  // insère le sortant sous SA propre clé espèce
  const outId = Number(teamP.id);
  if(G.collection[outId] || G.collection[String(outId)]){
    // collision inattendue : annule
    setMsg('❌ Conflit boîte.');
    teamP.heldItem = slotItem;
    boxed.heldItem = null;
    // restore boxed
    G.collection[incomingSpecies] = boxed;
    return;
  }
  G.collection[outId] = teamP;
  // teamP en boîte = pas d'item
  teamP.heldItem = null;
  // place l'entrant en équipe
  G.team[idx] = boxed;
  _swapFromTeamIdx=null;
  notify(`🔁 ${teamP.name} ↔ ${boxed.name}`);
  showTab('box');
  renderTeamWindow();
  saveGame();
}


// Renvoie un Pokémon de l'équipe vers la boîte (bouton "Retirer")
function sendTeamToBox(idx){
  if(G.team.length<=1){ setMsg('❌ Vous devez garder au moins un Pokémon dans l\'équipe.'); return; }
  const p=G.team[idx];
  if(!p) return;
  const pid = Number(p.id);
  if(G.collection[pid] || G.collection[String(pid)]){
    setMsg('❌ Cette espèce est déjà dans la boîte.');
    return;
  }
  // l'item ne suit pas en boîte : on le rend au sac
  if(p.heldItem){
    try{ addToInventory(p.heldItem,1); }catch(_){}
    p.heldItem = null;
  }
  G.collection[pid]=p;
  G.team.splice(idx,1);
  document.getElementById('poke-modal').classList.remove('open');
  notify(`${p.name} est envoyé dans la boîte.`);
  showTab('box');
  saveGame();
}


// Bascule shiny/normal (uniquement si débloqué)
function toggleShinySkin(idx){
  const p=G.team[idx];
  if(!p||!p.shinyUnlocked) return;
  p.shinyActive=!p.shinyActive;
  p.shiny=p.shinyActive;
  saveGame();
  openPokeModal(idx);
}

function statusColor(s){
  return {burn:'#c06030',poison:'#a040a0',badpoison:'#800080',para:'#c0a000',sleep:'#6070c0',freeze:'#4090d0',confuse:'#d060d0'}[s]||'#555';
}
function statusLabel(s){
  return {burn:'🔥BRÛ',poison:'☠️POI',badpoison:'☠️TXQ',para:'⚡PAR',sleep:'💤SOM',freeze:'🧊GEL',confuse:'💫CON'}[s]||s.toUpperCase();
}

function aliveCount(){return G.team.filter(p=>p.currentHP>0).length;}
function firstAlive(){return G.team.findIndex(p=>p.currentHP>0);}

function buildTalentSelectorHtml(p, idx, boxId){
  const nid = Number(p.id);
  const tals = getSpeciesTalents(nid);
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  if(!G.unlockedTalents) G.unlockedTalents = {};
  if(!G.unlockedTalents[nid]) G.unlockedTalents[nid] = [tals[0]];
  if(p.talent && !G.unlockedTalents[nid].includes(p.talent)) G.unlockedTalents[nid].push(p.talent);

  const uniqueTals = [];
  tals.forEach((tal, ti) => {
    if(!uniqueTals.some(x => x.tal === tal)){
      const isHid = ti === 2 && tals[0] !== tal && tals[1] !== tal;
      uniqueTals.push({tal, isHid});
    }
  });

  return `<div style="background:#181412;border-radius:6px;padding:8px;margin-bottom:10px;border:1px solid #4a3c2a;">
    <div style="font-size:11px;color:var(--gold);font-weight:bold;margin-bottom:4px;">🧬 ${lang==='en'?'Abilities / Talents':'Talents du Pokémon'}</div>
    <select onmousedown="event.stopPropagation()" onchange="changePokeTalent(${idx!=null?idx:'null'}, '${boxId||''}', this.value)" style="width:100%;background:#0c0a09;color:#fff;border:1px solid var(--accent);padding:6px;border-radius:4px;font-size:12px;margin-bottom:4px;cursor:pointer;">
      ${uniqueTals.map(item => {
        const {tal, isHid} = item;
        const unlocked = (G.unlockedTalents?.[nid] || []).includes(tal);
        const talName = getTalentName(tal);
        const tag = isHid ? (lang==='en' ? 'Hidden Talent ✨' : 'Talent Caché ✨') : (lang==='en' ? 'Normal Talent' : 'Talent Normal');
        if(!unlocked){
          return `<option value="" disabled>🔒 ${talName} [${tag}] — (${lang==='en'?'Locked: Farm/catch to unlock':'Verrouillé : à capturer pour débloquer'})</option>`;
        }
        return `<option value="${tal}" ${p.talent===tal?'selected':''}>✅ ${talName} [${tag}]</option>`;
      }).join('')}
    </select>
    <div style="font-size:11px;color:#ddd;line-height:1.3;">${getTalentDesc(p.talent)}</div>
  </div>`;
}

// ============================================================
// POKEMON MODAL
// ============================================================
function openPokeModal(idx){
  const p=G.team[idx];
  if(!p){ moveEditorFor=null; return; }
  const modal=document.getElementById('poke-modal');
  const inner=document.getElementById('poke-modal-inner');
  const editing=moveEditorFor===idx;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  const moves=p.moves.map((m,mi)=>{
    const mv=MOVES[m.id];
    const mvName = getMoveName(m.id);
    return `<div style="background:var(--bg);border-radius:6px;padding:6px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center">
      <span class="type-badge" style="background:${TYPE_COLORS[mv?.type]||'#888'}">${mv?.type||'?'}</span>
      <span>${mvName}</span>
      <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv?.pow||'-'} | PP: ${m.pp}/${m.maxPP}</span>
      ${editing?`<button class="hbtn" style="padding:2px 8px;font-size:10px;border-color:var(--red)" onclick="forgetMove(${idx},${mi})">${lang==='en'?'Forget':'Oublier'}</button>`:''}
    </div>`;
  }).join('');

  let learnHtml='';
  if(editing){
    const pool=learnableMoves(p);
    const full=p.moves.length>=4;
    learnHtml=`<div style="font-size:12px;color:var(--dim);margin:10px 0 4px">${lang==='en' ? 'Learnable moves '+(full?'<span style="color:var(--red)">(forget one first)</span>':'') + ':' : 'Capacités apprenables '+(full?'<span style="color:var(--red)">(oubliez-en une d\'abord)</span>':'') + ' :'}</div>
    <div style="max-height:170px;overflow-y:auto">
    ${pool.length?pool.map(id=>{
      const mv=MOVES[id];
      return `<div style="background:var(--card);border-radius:6px;padding:5px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center">
        <span class="type-badge" style="background:${TYPE_COLORS[mv.type]||'#888'}">${mv.type}</span>
        <span>${getMoveName(id)}</span>
        <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv.pow||'-'}</span>
        <button class="hbtn" style="padding:2px 8px;font-size:10px" ${full?'disabled':''} onclick="learnMove(${idx},'${id}')">${lang==='en'?'Learn':'Apprendre'}</button>
      </div>`;
    }).join(''):`<div style="color:var(--dim);font-size:11px">${lang==='en'?'No other moves available.':'Aucune autre capacité disponible.'}</div>`}
    </div>`;
  }

  const stLabels = lang === 'en' ? ['Max HP','Attack','Defense','Sp. Atk','Sp. Def','Speed'] : ['PV Max','Attaque','Défense','Atk Spé','Déf Spé','Vitesse'];
  const buff=getHeldBuff(p);
  const buffedAtk=Math.floor(p.atk*(1+(buff.atk||0)));
  const buffedDef=Math.floor(p.def*(1+(buff.def||0)));
  const buffedSpe=Math.floor(p.spe*(1+(buff.spe||0)));
  const buffedHP =Math.floor(p.maxHP*(1+(buff.hpMax||0)));
  const showDelta=(base,cur)=> cur>base ? `<span style="color:var(--green);font-size:10px"> +${cur-base}</span>` : '';
  const buffedSpa=Math.floor((p.spa||p.atk)*(1+(buff.spa||0)));
  const buffedSpd=Math.floor((p.spd||p.def)*(1+(buff.spd||0)));
  const stats=[
    [stLabels[0], buffedHP, 500, '#4caf50', p.maxHP],
    [stLabels[1], buffedAtk,200, '#f44336', p.atk],
    [stLabels[2], buffedDef,200, '#2196f3', p.def],
    [stLabels[3], buffedSpa,200, '#e91e63', p.spa||p.atk],
    [stLabels[4], buffedSpd,200, '#9c27b0', p.spd||p.def],
    [stLabels[5], buffedSpe,200, '#ff9800', p.spe],
  ];

  // Held item block
  const itmKey=p.heldItem;
  const itm=(itmKey && ITEMS[itmKey]) ? {...ITEMS[itmKey], name:getItemName(itmKey), desc:getItemDesc(itmKey)} : null;
  const count=itmKey?Math.min(BAG_MAX,G.inventory[itmKey]||0):0;
  const heldBlock=itm
    ? `<div style="background:var(--bg);border-radius:6px;padding:8px;margin-bottom:10px">
        <div style="font-size:11px;color:var(--dim);margin-bottom:4px">${lang==='en'?'Equipped Item':'Objet équipé'}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-size:22px">${itm.icon}</div>
          <div style="flex:1">
            <div style="font-weight:bold">${getItemName(itmKey)}</div>
            <div style="font-size:11px;color:var(--dim)">${lang==='en'?'Power:':'Puissance :'} ${count}/${BAG_MAX} — buff ${Math.round(count/BAG_MAX*100)}%</div>
          </div>
          <button class="hbtn" style="padding:3px 8px;font-size:11px;border-color:var(--red)" onclick="unequipItem(${idx})">${lang==='en'?'Remove':'Retirer'}</button>
        </div>
      </div>`
    : `<div style="background:var(--bg);border-radius:6px;padding:8px;margin-bottom:10px;text-align:center;color:var(--dim);font-size:11px">
        ${lang==='en'?'No item equipped. Choose one from the 🎒 Bag tab.':'Aucun objet équipé. Choisissez-en un depuis l\'onglet 🎒 Sac.'}
      </div>`;

  inner.innerHTML=`<div class="modal-title">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="font-size:32px" class="${p.shinyActive?'shiny-spark':''}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:56})}</div>
      <div>
        <div>${p.shinyActive?'<span class="shiny-tag">✨</span>':''}${p.name}</div>
        <div style="font-size:12px;color:var(--dim)">${lang==='en'?'Level':'Niveau'} ${p.level}</div>
        <div style="margin-top:3px">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
      </div>
    </div>
    <span class="modal-close" onclick="moveEditorFor=null;document.getElementById('poke-modal').classList.remove('open')">✕</span>
  </div>
  ${p.shinyUnlocked?`<label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;background:var(--bg);padding:6px 10px;border-radius:6px;cursor:pointer">
    <input type="checkbox" ${p.shinyActive?'checked':''} onchange="toggleShinySkin(${idx})">
    <span>✨ ${lang==='en'?'Shiny Skin':'Skin Shiny'}</span>
    <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Cosmetic switch only':'Bascule d\'apparence uniquement'}</span>
  </label>`:''}
  ${heldBlock}
  ${buildTalentSelectorHtml(p, idx, null)}
  ${getEvolutionMethodsHtml(p.id)}
  <div style="margin-bottom:10px">
    ${stats.map(([l,v,m,c,base], sIdx)=>{
      const keys = ['hp','atk','def','spa','spd','spe'];
      const k = keys[sIdx] || 'hp';
      const ivVal = (p.ivs||{})[k] || 0;
      const evVal = (p.evs||{})[k] || 0;
      return `<div class="stat-row" style="flex-direction:column;align-items:stretch;margin-bottom:8px;background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;height:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <span class="stat-label" style="font-weight:bold;width:auto;">${l}</span>
          <span class="stat-val" style="width:auto;">${v}${showDelta(base,v)}</span>
        </div>
        <div class="stat-bar" style="margin-bottom:4px;"><div class="stat-fill" style="width:${Math.min(100,v/m*100)}%;background:${c}"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#bbb;">
          <span><b>IV:</b> ${renderStars(ivVal, false)} (${ivVal}/6)</span>
          <span><b>EV:</b> ${renderStars(evVal, true)} (${evVal}/6)</span>
        </div>
      </div>`;
    }).join('')}
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <span style="font-size:12px;color:var(--dim)">${t('moves_lbl')}</span>
    <button class="hbtn" style="padding:3px 10px;font-size:11px" onclick="toggleMoveEditor(${idx})">${editing?t('finish_btn'):t('modify_btn')}</button>
  </div>
  ${moves}
  ${learnHtml}
  ${(() => {
    const curLevelBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, (p.xp||0) - curLevelBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
    return `<div style="font-size:12px;color:var(--dim);margin:8px 0 4px">XP : ${xpInLevel} / ${xpReqLevel} <span style="font-size:10px;">(${p.xp||0} total)</span></div>`;
  })()}
  ${(() => {
    const evos = STONE_EVO[p.id];
    if(!evos) return '';
    let html = `<div style="background:var(--bg);border-radius:8px;padding:8px;margin:8px 0"><div style="font-size:12px;color:var(--gold);margin-bottom:6px">${t('stone_evo_title')}</div><div style="display:flex;flex-wrap:wrap;gap:6px">`;
    for(const [stoneKey, targetId] of Object.entries(evos)){
      const stone = ITEMS[stoneKey];
      const owned = G.inventory[stoneKey]||0;
      const target = PD[targetId];
      const already = speciesOwned(targetId);
      html += `<button class="hbtn" onclick="tryStoneEvo(${idx},'${stoneKey}')" ${owned<1||already?'disabled':''} title="${stone?.desc||''}">${stone?.icon||'🪨'} ${target?target[0]:'#'+targetId} ${owned>0?`(${owned})`:''}${already?' ✅':''}</button>`;
    }
    html += '</div></div>';
    return html;
  })()}
  <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
    <button class="hbtn" onclick="sendTeamToBox(${idx})" ${G.team.length<=1?'disabled':''}>${t('to_box_btn')}</button>
  </div>`;

  modal.classList.add('open');
}

function toggleBoxShinySkin(boxId){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  p.shinyActive = !p.shinyActive;
  p.shiny = p.shinyActive;
  saveGame();
  openBoxPokeModal(boxId);
}
function forgetBoxMove(boxId, moveIdx){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p||(p.moves||[]).length<=1){setMsg('Un Pokémon doit conserver au moins une capacité.');return;}
  const removed=p.moves.splice(moveIdx,1)[0];
  notify(`${p.name} oublie ${getMoveName(removed.id)||removed.id}.`);
  saveGame();
  openBoxPokeModal(boxId);
}
function learnBoxMove(boxId, moveId){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  if(!p.moves) p.moves=[];
  if(p.moves.length>=4){setMsg('Capacités pleines (4). Oubliez-en une d\'abord.');return;}
  if(p.moves.find(m=>m.id===moveId)) return;
  p.moves.push({id:moveId,pp:MOVES[moveId]?.pp||10,maxPP:MOVES[moveId]?.pp||10});
  notify(`✅ ${p.name} apprend ${getMoveName(moveId)||moveId} !`);
  saveGame();
  openBoxPokeModal(boxId);
}
function toggleBoxMoveEditor(boxId){
  const key = 'box_'+boxId;
  moveEditorFor = (moveEditorFor===key) ? null : key;
  openBoxPokeModal(boxId);
}
function tryBoxStoneEvo(boxId, stoneKey){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  const evo = STONE_EVO[p.id]?.[stoneKey];
  if(!evo){ setMsg("Cet objet n'a aucun effet sur ce Pokémon."); return; }
  if((G.inventory[stoneKey]||0)<1){ setMsg("Pierre manquante."); return; }
  G.inventory[stoneKey]--;
  if(G.inventory[stoneKey]<=0) delete G.inventory[stoneKey];
  const shinyUnlock = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(evo));
  const evoMon = createPoke(evo, 1, shinyUnlock);
  if(evoMon){
    evoMon.shinyActive = shinyUnlock; evoMon.shiny = shinyUnlock;
    delete G.collection[boxId];
    delete G.collection[String(boxId)];
    G.collection[evo] = evoMon;
    G.pokedex[evo] = {...(G.pokedex[evo]||{}), seen:true, caught:true};
    if(shinyUnlock) unlockShinyForSpecies(evo);
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    notify(lang==='en' ? `✨ ${p.name} evolved into ${evoMon.name} using ${getItemName(stoneKey)}!` : `✨ ${p.name} évolue en ${evoMon.name} grâce à ${getItemName(stoneKey)} !`,"var(--purple)");
    saveGame();
    if(document.querySelector('.tab.active')?.textContent.includes('Sac')){
      onInventoryClick(stoneKey);
    } else {
      openBoxPokeModal(evo);
      showTab('box');
    }
  }
}

function openBoxPokeModal(boxId){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p){ moveEditorFor=null; return; }
  const modal=document.getElementById('poke-modal');
  const inner=document.getElementById('poke-modal-inner');
  const key = 'box_'+boxId;
  const editing = moveEditorFor===key;
  const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  if(isShiny){
    p.shinyUnlocked = true;
    if(p.shinyActive === undefined) p.shinyActive = true;
    p.shiny = p.shinyActive;
  }

  const moves = (p.moves||[]).map((m,mi)=>{
    const mv=MOVES[m.id];
    const mvName = getMoveName(m.id);
    return `<div style="background:var(--bg);border-radius:6px;padding:6px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center">
      <span class="type-badge" style="background:${TYPE_COLORS[mv?.type]||'#888'}">${mv?.type||'?'}</span>
      <span>${mvName}</span>
      <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv?.pow||'-'} | PP: ${m.pp}/${m.maxPP}</span>
      ${editing?`<button class="hbtn" style="padding:2px 8px;font-size:10px;border-color:var(--red)" onclick="forgetBoxMove('${boxId}',${mi})">${lang==='en'?'Forget':'Oublier'}</button>`:''}
    </div>`;
  }).join('');

  let learnHtml='';
  if(editing){
    const pool=learnableMoves(p);
    const full=(p.moves||[]).length>=4;
    learnHtml=`<div style="font-size:12px;color:var(--dim);margin:10px 0 4px">${lang==='en' ? 'Learnable moves '+(full?'<span style="color:var(--red)">(forget one first)</span>':'') + ':' : 'Capacités apprenables '+(full?'<span style="color:var(--red)">(oubliez-en une d\'abord)</span>':'') + ' :'}</div>
    <div style="max-height:170px;overflow-y:auto">
    ${pool.length?pool.map(id=>{
      const mv=MOVES[id];
      return `<div style="background:var(--card);border-radius:6px;padding:5px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center">
        <span class="type-badge" style="background:${TYPE_COLORS[mv.type]||'#888'}">${mv.type}</span>
        <span>${getMoveName(id)}</span>
        <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv.pow||'-'}</span>
        <button class="hbtn" style="padding:2px 8px;font-size:10px" ${full?'disabled':''} onclick="learnBoxMove('${boxId}','${id}')">${lang==='en'?'Learn':'Apprendre'}</button>
      </div>`;
    }).join(''):`<div style="color:var(--dim);font-size:11px">${lang==='en'?'No other moves available.':'Aucune autre capacité disponible.'}</div>`}
    </div>`;
  }

  const stLabels = lang === 'en' ? ['Max HP','Attack','Defense','Sp. Atk','Sp. Def','Speed'] : ['PV Max','Attaque','Défense','Atk Spé','Déf Spé','Vitesse'];
  const stats=[
    [stLabels[0], p.maxHP, 500, '#4caf50'],
    [stLabels[1], p.atk,   200, '#f44336'],
    [stLabels[2], p.def,   200, '#2196f3'],
    [stLabels[3], p.spa||p.atk,200, '#e91e63'],
    [stLabels[4], p.spd||p.def,200, '#9c27b0'],
    [stLabels[5], p.spe,   200, '#ff9800'],
  ];

  const swap = (_swapFromTeamIdx!=null && G.team[_swapFromTeamIdx]);

  inner.innerHTML=`<div class="modal-title">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="font-size:32px" class="${p.shinyActive?'shiny-spark is-shiny':''}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:56})}</div>
      <div>
        <div>${p.shinyActive?'<span class="shiny-tag">✨</span>':''}${p.name} <span style="color:var(--dim);font-size:11px">#${p.id}</span></div>
        <div style="font-size:12px;color:var(--dim)">${lang==='en'?'Level':'Niveau'} ${p.level} (${lang==='en'?'PC Box':'Boîte PC'})</div>
        <div style="margin-top:3px">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
      </div>
    </div>
    <span class="modal-close" onclick="moveEditorFor=null;document.getElementById('poke-modal').classList.remove('open')">✕</span>
  </div>
  ${isShiny?`<label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;background:var(--bg);padding:6px 10px;border-radius:6px;cursor:pointer">
    <input type="checkbox" ${p.shinyActive?'checked':''} onchange="toggleBoxShinySkin('${boxId}')">
    <span>✨ ${lang==='en'?'Shiny Skin':'Skin Shiny'}</span>
    <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Cosmetic switch only':'Bascule d\'apparence'}</span>
  </label>`:''}
  ${buildTalentSelectorHtml(p, null, boxId)}
  ${getEvolutionMethodsHtml(p.id)}
  <div style="background:var(--bg);border-radius:6px;padding:8px;margin-bottom:10px;text-align:center;color:var(--dim);font-size:11px">
    ${lang==='en'?'📦 This Pokémon is in your PC box. Place it in your active party to train or equip items!':'📦 Ce Pokémon est dans votre boîte PC. Placez-le dans votre équipe pour l\'entraîner ou lui équiper des objets !'}
  </div>
  <div style="margin-bottom:10px">
    ${stats.map(([l,v,m,c])=>`<div class="stat-row">
      <div class="stat-label">${l}</div>
      <div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,v/m*100)}%;background:${c}"></div></div>
      <div class="stat-val">${v}</div>
    </div>`).join('')}
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <span style="font-size:12px;color:var(--dim)">Capacités :</span>
    <button class="hbtn" style="padding:3px 10px;font-size:11px" onclick="toggleBoxMoveEditor('${boxId}')">${editing?'✓ Terminer':'✏️ Modifier'}</button>
  </div>
  ${moves}
  ${learnHtml}
  ${(() => {
    const curLevelBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, (p.xp||0) - curLevelBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
    return `<div style="font-size:12px;color:var(--dim);margin:8px 0 4px">XP : ${xpInLevel} / ${xpReqLevel} <span style="font-size:10px;">(${p.xp||0} total)</span></div>`;
  })()}
  ${(() => {
    const evos = STONE_EVO[p.id];
    if(!evos) return '';
    let html = '<div style="background:var(--bg);border-radius:8px;padding:8px;margin:8px 0"><div style="font-size:12px;color:var(--gold);margin-bottom:6px">🪨 Évolution par pierre</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
    for(const [stoneKey, targetId] of Object.entries(evos)){
      const stone = ITEMS[stoneKey];
      const owned = G.inventory[stoneKey]||0;
      const target = PD[targetId];
      const already = speciesOwned(targetId);
      html += `<button class="hbtn" onclick="tryBoxStoneEvo('${boxId}','${stoneKey}')" ${owned<1||already?'disabled':''} title="${stone?.desc||''}">${stone?.icon||'🪨'} ${target?target[0]:'#'+targetId} ${owned>0?`(${owned})`:''}${already?' ✅':''}</button>`;
    }
    html += '</div></div>';
    return html;
  })()}
  <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
    ${swap
      ? `<button class="hbtn" style="background:var(--blue);color:#fff" onclick="swapBoxWithTeam('${boxId}'); document.getElementById('poke-modal').classList.remove('open');">🔁 Échanger avec ${G.team[_swapFromTeamIdx]?.name||"l'équipe"}</button>`
      : `<button class="hbtn" style="background:var(--green);color:#fff" onclick="addBoxedToTeam('${boxId}'); document.getElementById('poke-modal').classList.remove('open');" ${G.team.length>=6?'disabled title="Équipe pleine (6/6)"':''}>➕ Ajouter à l'équipe</button>`}
  </div>`;

  modal.classList.add('open');
}
// ============================================================
function chooseStarter(){
  const isEn = (typeof G !== 'undefined' && G && G.lang === 'en');
  const starters=[
    {id:1, name: getPokeName(1), desc: isEn ? 'Grass/Poison - Solid defensive resilience' : 'Plante/Poison - Solide défensivement'},
    {id:4, name: getPokeName(4), desc: isEn ? 'Fire - High offensive firepower' : 'Feu - Puissance offensive élevée'},
    {id:7, name: getPokeName(7), desc: isEn ? 'Water - Great balanced durability' : 'Eau - Grande endurance'},
  ];
  const el=document.getElementById('tab-content');
  if(!el) return;
  el.innerHTML=`<div style="text-align:center;padding:10px">
    <div class="loc-title">${isEn ? 'Choose your Starter!' : 'Choisissez votre Starter !'}</div>
    <div style="color:var(--dim);font-size:12px;margin-bottom:16px">${isEn ? 'This Pokémon will accompany you throughout your adventure.' : 'Ce Pokémon vous accompagnera tout au long de votre aventure.'}</div>
    ${starters.map(s=>`<div class="poke-card" onclick="pickStarter(${s.id})" style="cursor:pointer;text-align:left">
      <div class="poke-card-top">
        <div class="poke-sprite" style="background:${TYPE_COLORS[PD[s.id][1]]}22;border:2px solid ${TYPE_COLORS[PD[s.id][1]]}">${spriteImg(s.id,'',{size:44})}</div>
        <div>
          <div class="poke-name">${s.name}</div>
          <div style="font-size:11px;color:var(--dim)">${s.desc}</div>
        </div>
      </div>
    </div>`).join('')}
  </div>`;
}

function pickStarter(id){
  const p=createPoke(id,5);
  G.team.push(p);
  G.starter=true;
  G.pokedex[id]={...(G.pokedex[id]||{}), seen:true,caught:true};
  notify(`🎉 ${p.name} rejoint votre équipe !`);
  setMsg(`${p.name} est maintenant votre partenaire !`);
  showTab('team');
  saveGame();
}

// ============================================================
// UNDERGROUND MINE (Souterrain / Mine de Pierres d'Évolution)
// ============================================================
const MINE_W = 10;
const MINE_H = 8;
const MINE_ITEMS = [
  {key:'firestone',    name:'Pierre Feu',       shape:[[1,1,1],[1,1,1],[1,1,1]]},
  {key:'waterstone',   name:'Pierre Eau',       shape:[[1,1,1],[1,1,1],[1,1,0]]},
  {key:'thunderstone', name:'Pierre Foudre',    shape:[[0,1,0],[1,1,1],[0,1,0]]},
  {key:'leafstone',    name:'Pierre Plante',    shape:[[0,1,0],[1,1,1],[1,1,1]]},
  {key:'moonstone',    name:'Pierre Lune',      shape:[[1,1],[1,1]]},
  {key:'nugget',       name:'Pépite',           shape:[[1,1,1],[1,1,1]]},
  {key:'stardust',     name:'Poussière Étoile', shape:[[1,1],[1,1]]},
  {key:'fossil',       name:'Fossile',          shape:[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]]},
];


// --- Bouton "?" + fenêtre d'aide au code couleur de la carte ---
function ensureMapHelpButton(){
  if(document.getElementById('map-help-btn')) return;
  const header=document.querySelector('#win-map .win-header');
  if(!header) return;
  const btn=document.createElement('button');
  btn.id='map-help-btn';
  btn.className='win-tool-btn';
  btn.textContent='?';
  btn.title='Aide — code couleur de la carte';
  btn.setAttribute('onclick','toggleMapHelp()');
  header.appendChild(btn);
}

function toggleMapHelp(){
  let m=document.getElementById('map-help-modal');
  if(!m){
    m=document.createElement('div');
    m.id='map-help-modal';
    m.className='map-help-modal';
    m.innerHTML=`<div class="map-help-card">
      <div class="map-help-head">🗺️ Code couleur de la carte<button class="win-tool-btn" onclick="toggleMapHelp()">✕</button></div>
      <div class="map-help-body">
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(31,138,59,0.55)"></span><b>Vert</b> — Une quête (principale ou secondaire) est à faire ici.</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(123,31,162,0.55)"></span><b>Violet</b> — Un Pokémon légendaire errant est présent (non capturé).</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(21,101,194,0.55)"></span><b>Bleu</b> — Des Pokémon sont encore à capturer.</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(201,160,0,0.60)"></span><b>Jaune</b> — Un shiny est encore à capturer.</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(58,63,68,0.55)"></span><b>Gris</b> — Zone verrouillée (badge ou histoire manquant).</div>
        <div class="legend-row"><span class="legend-swatch" style="background:rgba(255,255,255,0.12);border:1px solid #777"></span><b>Transparent</b> — Zone terminée (tout est capturé).</div>
      </div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e=>{ if(e.target===m) toggleMapHelp(); });
  }
  m.classList.toggle('open');
}

// Rafraîchit la carte et la fiche du lieu courant (capture / victoire /
// prise de quête) pour une mise à jour instantanée de l'UI.
function refreshMapAndLoc(){
  try{ if(document.getElementById('map-svg')) renderMap(); }catch(e){}
  try{ if(_activeTab==='info'){ const tc=document.getElementById('tab-content'); if(tc) renderLocInfo(tc); } }catch(e){}
}
