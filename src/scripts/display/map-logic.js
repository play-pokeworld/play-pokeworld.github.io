// ============================================================
// MAP LOGIC — (split from map.js)
// ============================================================
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

function _startNodes(){ return (G.region==='johto') ? ['newbark'] : ['pallet']; }

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
  if(!G) return true;
  // --- 8 Badges = toutes les routes débloquées ---
  if(G.badges && G.badges.length >= 8) return true;
  // --- Blocage Starter : Route 1 (Kanto) & Route 29 (Johto) ---
  if(id==='route1'){
    const hasKantoStarter = !!(G.starterKanto || G.starter || (G.regionStarter && G.regionStarter.kanto));
    if(!hasKantoStarter) return false;
  }
  if(id==='jroute29'){
    const hasJohtoStarter = !!(G.starterJohto || (G.regionStarter && G.regionStarter.johto));
    if(!hasJohtoStarter) return false;
  }
  if(!G.unlockedLocs || typeof G.unlockedLocs!=='object') return true; // sécurité : jamais bloquant
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

function mineUnlocked(){ return G.badges && G.badges.length >= 2; }
function updateFeatureWindows(){
  const hWin = document.getElementById('win-hatchery');
  if(hWin) hWin.style.display = hatcheryUnlocked() ? 'flex' : 'none';
  const tWin = document.getElementById('win-training');
  if(tWin) tWin.style.display = trainingUnlocked() ? 'flex' : 'none';
  const mWin = document.getElementById('win-mine');
  if(mWin) mWin.style.display = mineUnlocked() ? 'flex' : 'none';
  // Automation is now rendered inside the hatchery window (no standalone window)
}

// --- Code couleur de la carte (priorité : gris > vert > violet > bleu > jaune > transparent) ---

function mapNodeState(id){
  const loc=getLocObj(id);
  if(!loc) return {locked:false, color:'rgba(58,63,68,0.55)', kind:'locked'};
  const badgeReq=loc.badgeReq||0;
  const storyReq=loc.storyReq||0;
  if((G.badges.length<8 && badgeReq>G.badges.length) || storyReq>(G.storyIdx||0) || !isLocUnlocked(id)) return {locked:true, color:'rgba(58,63,68,0.55)', kind:'locked'};
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

