// ============================================================
// REGION — (split from map.js)
// ============================================================
function travelToRegion(targetReg){
  if(typeof G === 'undefined' || !G) return;
  if(targetReg === G.region) return;
  const lang = G.lang || 'fr';
  if(targetReg === 'johto'){
    G.region = 'johto';
    G.location = 'newbark';
    markVisited('newbark');
    notify(lang==='en' ? "🚢 Welcome to the Johto region — New Bark Town!" : "🚢 Bienvenue dans la région de Johto — Bourg Geon !", 'var(--blue)');
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
  // Re-render l'onglet actif (marché inclus) pour refléter la nouvelle région.
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
  const lang = G.lang || 'fr';
  const mapTitle = document.getElementById('map-win-title');
  if(mapTitle) mapTitle.textContent = (lang==='en' ? 'Map: ' : 'Carte : ') + (G.region === 'johto' ? 'Johto' : 'Kanto');
  renderMap();
  // Re-render l'onglet actif (marché inclus) pour refléter la nouvelle région.
  showTab(_activeTab);
  saveGame();
}

// ============================================================
// DOCKING COLUMN SYSTEM (Dashboard 3 Colonnes façon PokéClicker)


