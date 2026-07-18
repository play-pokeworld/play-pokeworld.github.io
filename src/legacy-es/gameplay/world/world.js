function getRoamingLegendaryForRoute(locId){
 if(typeof G === 'undefined' || !G) return null;
 const nowWindow = Math.floor(Date.now() / (12 * 3600 * 1000));
 if(!G.roamingWindow || G.roamingWindow !== nowWindow || !G.roamingPool){
 G.roamingWindow = nowWindow;
 
 const kantoOutdoor = ['route1','route22','route2','route3','route4','route24','route25','route5','route6','route11','route9','route10','route8','route7','route16','route17','route18','route15','route14','route13','route12','route19','route20','route21','route23'];
 
 const johtoOutdoor = ['jroute29','jroute30','jroute31','jroute32','jroute33','jroute34','jroute35','jroute36','jroute37','jroute38','jroute39','jroute42','jroute43','jroute44','jroute45','jroute46','jroute47','jroute48','nationalpark','jroute26','jroute27','jroute28'];
 let kIdx = nowWindow % kantoOutdoor.length;
 let jIdx = (nowWindow + 5) % johtoOutdoor.length;
 G.roamingPool = {
 [kantoOutdoor[(kIdx) % kantoOutdoor.length]]: 144,
 [kantoOutdoor[(kIdx+7) % kantoOutdoor.length]]: 145,
 [kantoOutdoor[(kIdx+13) % kantoOutdoor.length]]: 146,
 [kantoOutdoor[(kIdx+19) % kantoOutdoor.length]]: 151,
 [johtoOutdoor[(jIdx) % johtoOutdoor.length]]: 243,
 [johtoOutdoor[(jIdx+7) % johtoOutdoor.length]]: 244,
 [johtoOutdoor[(jIdx+13) % johtoOutdoor.length]]: 245
 };
 }
 return G.roamingPool[locId] || null;
}


function getBadgeDisplayTotal(){
 const supportedRegions = ['kanto','johto'];
 let regions = 1;
 try{ regions = supportedRegions.filter(r => (typeof canAccessRegion === 'function') ? canAccessRegion(r) : r === 'kanto').length || 1; }catch(_){ regions = 1; }
 return regions * 8;
}
function updateHeader(){
 document.getElementById('h-money').textContent=G.money.toLocaleString();
 document.getElementById('h-badges').textContent=G.badges.length;
 const totalEl = document.getElementById('h-badges-total');
 if(totalEl) totalEl.textContent = getBadgeDisplayTotal();
 try{ renderTeamWindow(); }catch(_){}
 try{ renderStoryWindow(); }catch(_){}
 try{ renderHatcheryWindow(); }catch(_){}
 try{ renderTrainingWindow(); }catch(_){}
 try{ renderMineWindow(); }catch(_){}
 try{ renderAutomationWindow(); }catch(_){}
 try{ renderShortcutsWindow(); }catch(_){}
}


// --- Migrated to ES module, globals exposed ---
if (typeof getRoamingLegendaryForRoute !== 'undefined' && typeof window !== 'undefined') window.getRoamingLegendaryForRoute = getRoamingLegendaryForRoute;
if (typeof getBadgeDisplayTotal !== 'undefined' && typeof window !== 'undefined') window.getBadgeDisplayTotal = getBadgeDisplayTotal;
if (typeof updateHeader !== 'undefined' && typeof window !== 'undefined') window.updateHeader = updateHeader;

export {};
