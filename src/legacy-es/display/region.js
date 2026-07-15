function travelToRegion(targetReg){
 if(typeof G === 'undefined' || !G) return;
 if(targetReg === G.region) return;
 if(targetReg === 'johto'){
 G.region = 'johto';
 G.location = 'newbark';
 markVisited('newbark');
 notify(t('welcome_johto'), 'var(--blue)');
 } else {
 G.region = 'kanto';
 G.location = 'vermilion';
 markVisited('vermilion');
 notify(t('arrived_kanto_harbor'), 'var(--blue)');
 }
 const sel = document.getElementById('map-region-select');
 if(sel) sel.value = G.region || 'kanto';
 const mapTitle = document.getElementById('map-win-title');
 if(mapTitle) mapTitle.textContent = t('map_title_prefix') + (G.region === 'johto' ? 'Johto' : 'Kanto');
 renderMap();
 
 showTab(_activeTab);
 saveGame();
 setTimeout(()=>{ if(typeof checkStarterNeeded==='function') checkStarterNeeded(); }, 300);
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
 const mapTitle = document.getElementById('map-win-title');
 if(mapTitle) mapTitle.textContent = t('map_title_prefix') + (G.region === 'johto' ? 'Johto' : 'Kanto');
 renderMap();
 
 showTab(_activeTab);
 saveGame();
}


// --- Migrated to ES module, globals exposed ---
if (typeof travelToRegion !== 'undefined' && typeof window !== 'undefined') window.travelToRegion = travelToRegion;
if (typeof switchMapRegion !== 'undefined' && typeof window !== 'undefined') window.switchMapRegion = switchMapRegion;

export {};
