function getRoamingLegendaryForRoute(locId){
 if(typeof G === 'undefined' || !G) return null;
 // Fenêtre de rotation 12 h partagée avec l'Atoll (atoll-core.js, passe 22) :
 // même graine datée UTC, minuteur affiché sur les routes (location-info).
 const nowWindow = (typeof getRotationWindow === 'function') ? getRotationWindow() : Math.floor(Date.now() / (12 * 3600 * 1000));
 if(!G.roamingWindow || G.roamingWindow !== nowWindow || !G.roamingPool){
 G.roamingWindow = nowWindow;
 
 const kantoOutdoor = ['route1','route22','route2','route3','route4','route24','route25','route5','route6','route11','route9','route10','route8','route7','route16','route17','route18','route15','route14','route13','route12','route19','route20','route21','route23'];
 
 const johtoOutdoor = ['jroute29','jroute30','jroute31','jroute32','jroute33','jroute34','jroute35','jroute36','jroute37','jroute38','jroute39','jroute42','jroute43','jroute44','jroute45','jroute46','jroute47','jroute48','nationalpark','jroute26','jroute27','jroute28'];
 const hoennOutdoor = ['route101','route102','route103','route104','route110','route111','route112','route113','route114','route115','route116','route117','route118','route119','route120','route121','route123'];
 let kIdx = nowWindow % kantoOutdoor.length;
 let jIdx = (nowWindow + 5) % johtoOutdoor.length;
 let hIdx = (nowWindow + 11) % hoennOutdoor.length;
 G.roamingPool = {
 [kantoOutdoor[(kIdx) % kantoOutdoor.length]]: 144,
 [kantoOutdoor[(kIdx+7) % kantoOutdoor.length]]: 145,
 [kantoOutdoor[(kIdx+13) % kantoOutdoor.length]]: 146,
 [kantoOutdoor[(kIdx+19) % kantoOutdoor.length]]: 151,
 [johtoOutdoor[(jIdx) % johtoOutdoor.length]]: 243,
 [johtoOutdoor[(jIdx+7) % johtoOutdoor.length]]: 244,
 [johtoOutdoor[(jIdx+13) % johtoOutdoor.length]]: 245,
 [johtoOutdoor[(jIdx+19) % johtoOutdoor.length]]: 251,
 [hoennOutdoor[(hIdx) % hoennOutdoor.length]]: 380,
 [hoennOutdoor[(hIdx+4) % hoennOutdoor.length]]: 381,
 [hoennOutdoor[(hIdx+8) % hoennOutdoor.length]]: 385,
 [hoennOutdoor[(hIdx+12) % hoennOutdoor.length]]: 386
 };
 }
 return G.roamingPool[locId] || null;
}


function getBadgeDisplayTotal(){
 const supportedRegions = ['kanto','johto','hoenn'];
 let regions = 1;
 try{ regions = supportedRegions.filter(r => (typeof canAccessRegion === 'function') ? canAccessRegion(r) : r === 'kanto').length || 1; }catch(_){ regions = 1; }
 return regions * 8;
}
let _headerRaf = null;
let _headerPending = false;
function _flushHeaderWindows(){
  _headerRaf = null;
  _headerPending = false;
  try{ renderTeamWindow(); }catch(_){}
  try{ renderStoryWindow(); }catch(_){}
  try{ renderHatcheryWindow(); }catch(_){}
  try{ renderTrainingWindow(); }catch(_){}
  try{ renderMineWindow(); }catch(_){}
  try{ renderAutomationWindow(); }catch(_){}
  try{ renderShortcutsWindow(); }catch(_){}
}
function updateHeader(){
  try{
    const m = document.getElementById('h-money');
    if(m) m.textContent = (G && typeof G.money === 'number') ? G.money.toLocaleString() : '0';
    const b = document.getElementById('h-badges');
    if(b) b.textContent = (G && Array.isArray(G.badges)) ? G.badges.length : 0;
    const totalEl = document.getElementById('h-badges-total');
    if(totalEl) totalEl.textContent = getBadgeDisplayTotal();
  }catch(_){}
  // RAF batch pour les fenêtres lourdes afin d'éviter tremblement à chaque KO
  if(_headerPending) return;
  _headerPending = true;
  try{
    if(typeof requestAnimationFrame === 'function'){
      _headerRaf = requestAnimationFrame(_flushHeaderWindows);
    } else {
      _flushHeaderWindows();
    }
  }catch(_){
    _flushHeaderWindows();
  }
}
function updateHeaderImmediate(){
  // Pour les cas où on veut forcer le refresh synchrone (ex: changement de lieu)
  if(_headerRaf && typeof cancelAnimationFrame === 'function'){
    try{ cancelAnimationFrame(_headerRaf); }catch(_){}
  }
  _headerRaf = null;
  _headerPending = false;
  try{
    const m = document.getElementById('h-money');
    if(m) m.textContent = (G && typeof G.money === 'number') ? G.money.toLocaleString() : '0';
    const b = document.getElementById('h-badges');
    if(b) b.textContent = (G && Array.isArray(G.badges)) ? G.badges.length : 0;
    const totalEl = document.getElementById('h-badges-total');
    if(totalEl) totalEl.textContent = getBadgeDisplayTotal();
  }catch(_){}
  _flushHeaderWindows();
}


// --- Migrated to ES module, globals exposed ---
if (typeof getRoamingLegendaryForRoute !== 'undefined' && typeof window !== 'undefined') window.getRoamingLegendaryForRoute = getRoamingLegendaryForRoute;
if (typeof getBadgeDisplayTotal !== 'undefined' && typeof window !== 'undefined') window.getBadgeDisplayTotal = getBadgeDisplayTotal;
if (typeof updateHeader !== 'undefined' && typeof window !== 'undefined') window.updateHeader = updateHeader;
if (typeof updateHeaderImmediate !== 'undefined' && typeof window !== 'undefined') window.updateHeaderImmediate = updateHeaderImmediate;


