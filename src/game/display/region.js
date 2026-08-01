function travelToRegion(targetReg){
 if(typeof G === 'undefined' || !G) return;
 if(targetReg === G.region) return;
 if(typeof canAccessRegion === 'function' && !canAccessRegion(targetReg)){
 const msg = regionAccessMessage(targetReg);
 setMsg(msg); notify(msg, 'var(--red)');
 const sel = document.getElementById('map-region-select'); if(sel) sel.value = G.region || 'kanto';
 return;
 }
 if(targetReg === 'johto'){
 G.region = 'johto';
 G.location = 'newbark';
 markVisited('newbark');
 notify(t('welcome_johto') || 'Bienvenue à Johto !', 'var(--blue)');
 } else if(targetReg === 'hoenn'){
 G.region = 'hoenn';
 G.location = 'littleroot';
 markVisited('littleroot');
 notify(t('welcome_hoenn') || 'Bienvenue à Hoenn !', 'var(--blue)');
 } else {
 G.region = 'kanto';
 G.location = 'vermilion';
 markVisited('vermilion');
 notify(t('arrived_kanto_harbor'), 'var(--blue)');
 }
 if(typeof ensureQuestState === 'function') ensureQuestState();
 if(!G.mainStep || typeof G.mainStep !== 'object') G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
 if(G.mainStep.hoenn == null) G.mainStep.hoenn = 0;
 if(!G.mainProgress || typeof G.mainProgress !== 'object') G.mainProgress = { kanto: 0, johto: 0, hoenn: 0 };
 if(G.mainProgress.hoenn == null) G.mainProgress.hoenn = 0;
 if(typeof syncActiveMain === 'function') syncActiveMain();
 const sel = document.getElementById('map-region-select');
 if(sel) sel.value = G.region || 'kanto';
 const mapTitle = document.getElementById('map-win-title');
 if(mapTitle) mapTitle.textContent = t('map_title_prefix') + (G.region === 'johto' ? 'Johto' : G.region === 'hoenn' ? 'Hoenn' : 'Kanto');
 renderMap();
 
 showTab(_activeTab);
 saveGame();
 setTimeout(()=>{ if(typeof checkStarterNeeded==='function') checkStarterNeeded(); }, 300);
}

function switchMapRegion(reg){
 if(typeof canAccessRegion === 'function' && !canAccessRegion(reg)){
 const msg = regionAccessMessage(reg);
 setMsg(msg); notify(msg, 'var(--red)');
 const sel = document.getElementById('map-region-select'); if(sel) sel.value = G.region || 'kanto';
 return;
 }
 if(G.region !== reg){
 if(reg === 'johto'){
 if(!LOCS_JOHTO[G.location]) G.location = 'newbark';
 } else if(reg === 'hoenn'){
 if(typeof LOCS_HOENN !== 'undefined' && !LOCS_HOENN[G.location]) G.location = 'littleroot';
 } else {
 if(!LOCS[G.location]) G.location = 'pallet';
 }
 G.region = reg;
 }
 if(typeof ensureQuestState === 'function') ensureQuestState();
 if(!G.mainStep || typeof G.mainStep !== 'object') G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
 if(G.mainStep.hoenn == null) G.mainStep.hoenn = 0;
 if(!G.mainProgress || typeof G.mainProgress !== 'object') G.mainProgress = { kanto: 0, johto: 0, hoenn: 0 };
 if(G.mainProgress.hoenn == null) G.mainProgress.hoenn = 0;
 if(typeof syncActiveMain === 'function') syncActiveMain();
 markVisited(G.location);
 const sel = document.getElementById('map-region-select');
 if(sel) sel.value = G.region || 'kanto';
 const mapTitle = document.getElementById('map-win-title');
 if(mapTitle) mapTitle.textContent = t('map_title_prefix') + (G.region === 'johto' ? 'Johto' : G.region === 'hoenn' ? 'Hoenn' : 'Kanto');
 renderMap();
 
 showTab(_activeTab);
 saveGame();
 setTimeout(()=>{ if(typeof checkStarterNeeded==='function') checkStarterNeeded(); }, 300);
}


// --- Migrated to ES module, globals exposed ---
if (typeof travelToRegion !== 'undefined' && typeof window !== 'undefined') window.travelToRegion = travelToRegion;
if (typeof switchMapRegion !== 'undefined' && typeof window !== 'undefined') window.switchMapRegion = switchMapRegion;


