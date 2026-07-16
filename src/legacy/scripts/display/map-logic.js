function nodeDims(loc, id){
 if(loc.w && loc.h) return {w:loc.w, h:loc.h}; 
 if(loc.type==='town') return {w:96, h:48};
 if(loc.type==='dungeon') return {w:82, h:48};
 if(loc.type==='sea') return {w:120, h:44};
 
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


function _regLocs(){ return getCurrentRegionLocs(); }

function _startNodes(){ return (G.region==='johto') ? ['newbark'] : ['pallet']; }

function regionOfLoc(id){
 if(LOCS_JOHTO && LOCS_JOHTO[id]) return 'johto';
 return 'kanto';
}
const KANTO_BADGES = ['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
const JOHTO_BADGES = ['falkner','bugsy','whitney','morty','chuck','jasmine','pryce','clair'];
function regionBadgeCount(region){
 const ids = region === 'johto' ? JOHTO_BADGES : KANTO_BADGES;
 return ids.filter(b => G.badges && G.badges.includes(b)).length;
}
function locBadgeCount(id){ return regionBadgeCount(regionOfLoc(id)); }
function hasQuestDone(id){ return !!(G.completedQuests && G.completedQuests[id]); }
function hasRequiredItem(key){ return !!(key && G.inventory && G.inventory[key] > 0); }
const EXTRA_LOC_GATES = {
 route12: {quest:52, item:'pokeflute', label:t('snorlax_flute_gate')},
 route16: {quest:52, item:'pokeflute', label:t('snorlax_flute_gate')},
 ceruleancave: {champion:true, label:t('league_gate')},
 mtsilver: {champion:true, label:t('league_gate')},
 tohjofalls: {champion:true, label:t('league_gate')}
};
function locGateStatus(id){
 const loc = _regLocs()[id] || getLocObj(id);
 if(!loc) return {ok:false, reason:'missing'};
 const need = loc.badgeReq || 0;
 const have = locBadgeCount(id);
 if(need > have) return {ok:false, reason:'badge', need, have};
 const gate = EXTRA_LOC_GATES[id];
 if(gate){
   if(gate.item && !hasRequiredItem(gate.item)) return {ok:false, reason:'item', item:gate.item, label:gate.label};
   if(gate.quest && !hasQuestDone(gate.quest)) return {ok:false, reason:'quest', quest:gate.quest, label:gate.label};
   if(gate.champion && !G.championTitle) return {ok:false, reason:'champion', label:gate.label};
 }
 return {ok:true};
}
function locGateSatisfied(id){ return locGateStatus(id).ok; }
function locGateMessage(id){
 const st = locGateStatus(id);
 if(st.ok) return '';
 if(st.reason === 'badge') return tr('requires_badges', {need:st.need, have:st.have});
 if(st.reason === 'item') return 'Objet requis : ' + getItemName(st.item);
 if(st.reason === 'quest') return tr('quest_required_gate',{label:(st.label||'progression')});
 if(st.reason === 'champion') return t('league_required_gate');
 return tr('location_not_reachable', {location:getLocName(id)});
}

function locCleared(id){
 const loc = _regLocs()[id]; if(!loc) return false;
 return (((G.wildWinsByLoc||{})[id])||0) >= (loc.minWins||0);
}

function locReachable(id, _seen){
 const loc = _regLocs()[id]; if(!loc) return false;
 if(id === G.location) return true;
 if(_startNodes().indexOf(id) >= 0) return true;
 if(!locGateSatisfied(id)) return false;
 _seen = _seen || new Set();
 if(_seen.has(id)) return false;
 _seen.add(id);
 const conn = loc.conn || [];
 for(let i=0;i<conn.length;i++){
 const n = conn[i];
 if(locReachable(n, new Set(_seen)) && locCleared(n)) return true;
 }
 return false;
}

function canUnlockDirectlyFrom(fromId, targetId){
 if(!fromId || !targetId || fromId === targetId) return false;
 const locs = _regLocs();
 const target = locs[targetId];
 if(!locs[fromId] || !target) return false;
 return zonesUnlockedByClearing(fromId).indexOf(targetId) >= 0;
}
function zonesUnlockedByClearing(id){
 const locs = _regLocs();
 const loc = locs[id];
 if(!loc || (loc.minWins||0) <= 0 || locCleared(id) || !locReachable(id)) return [];
 const before = new Set(Object.keys(locs).filter(locId => locReachable(locId)));
 if(!G.wildWinsByLoc) G.wildWinsByLoc = {};
 const oldWins = G.wildWinsByLoc[id] || 0;
 G.wildWinsByLoc[id] = Math.max(oldWins, loc.minWins || 0);
 const after = Object.keys(locs).filter(locId => locReachable(locId));
 if(oldWins > 0) G.wildWinsByLoc[id] = oldWins;
 else delete G.wildWinsByLoc[id];
 return after.filter(locId => locId !== id && !before.has(locId));
}

function blockingNeighbor(id){
 const loc = _regLocs()[id]; if(!loc) return null;
 if(!locGateSatisfied(id)) return null;
 const conn = loc.conn || [];
 for(let i=0;i<conn.length;i++){
 const n = conn[i];
 if(locReachable(n) && !locCleared(n)) return n;
 }
 return null;
}

function recomputeUnlocks(){
 if(!G) return;
 if(!G.unlockedLocs || typeof G.unlockedLocs!=='object') G.unlockedLocs={};
 const locs=_regLocs();
 for(const id in locs){ if(locReachable(id)) G.unlockedLocs[id]=true; }
}

function isLocUnlocked(id){
 if(!G) return true;
 if(!locGateSatisfied(id)) return false;
 if(id==='route1'){
 const hasKantoStarter = !!(G.starterKanto || G.starter || (G.regionStarter && G.regionStarter.kanto));
 if(!hasKantoStarter) return false;
 }
 if(id==='jroute29'){
 const hasJohtoStarter = !!(G.starterJohto || (G.regionStarter && G.regionStarter.johto));
 if(!hasJohtoStarter) return false;
 }
 if(id===G.location) return true;
 if(_startNodes().indexOf(id) >= 0) return true;
 return locReachable(id);
}


function hatcheryUnlocked(){
 return isLocUnlocked('route5') || isLocUnlocked('jroute34');
}


function trainingUnlocked(){
 return !!(G.badges && G.badges.includes('surge'));
}


function mineUnlocked(){ return G.badges && G.badges.length >= 2; }
function updateFeatureWindows(){
 const hWin = document.getElementById('win-hatchery');
 if(hWin) hWin.style.display = hatcheryUnlocked() ? 'flex' : 'none';
 const tWin = document.getElementById('win-training');
 if(tWin) tWin.style.display = trainingUnlocked() ? 'flex' : 'none';
 const mWin = document.getElementById('win-mine');
 if(mWin) mWin.style.display = mineUnlocked() ? 'flex' : 'none';
 
}


function mapNodeState(id){
 const loc=getLocObj(id);
 if(!loc) return {locked:false, color:'rgba(58,63,68,0.55)', kind:'locked'};
 const badgeReq=loc.badgeReq||0;
 const storyReq=loc.storyReq||0;
 if(storyReq>(G.storyIdx||0) || !isLocUnlocked(id)) return {locked:true, color:'rgba(58,63,68,0.55)', kind:'locked'};
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


function showMapLegend(){
  const legendHTML = `
    <div class="extracted-template-style-076">
      <div class="extracted-template-style-077">${t('map_legend_title')}</div>
      <div class="extracted-template-style-078">
        <div class="extracted-template-style-006">
          <div class="extracted-template-style-079"></div>
          <span class="extracted-template-style-080">${t('current_location')}</span>
        </div>
        <div class="extracted-template-style-006">
          <div class="extracted-template-style-081"></div>
          <span class="extracted-template-style-080">${t('reachable_location')}</span>
        </div>
        <div class="extracted-template-style-006">
          <div class="extracted-template-style-082"></div>
          <span class="extracted-template-style-080">${t('locked_location')}</span>
        </div>
      </div>
    </div>
  `;
  
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = legendHTML;
  modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
}
