// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
/**
 * PokeWorld Application — Roaming legendaries (world state rule)
 *
 * Deterministic UTC-window roaming pool per region, persisted on G. Moved to
 * the application layer in wave 33 (rule on game state, not rendering); the
 * public surface (window.getRoamingLegendaryForRoute) is unchanged.
 */
function getRoamingLegendaryForRoute(locId){
 if(typeof G === 'undefined' || !G) return null;
 // Phase 22 — roaming legendaries: deterministic window seed, same
 // UTC-dated seed for everyone, timer shown on the routes (location-info).
 const nowWindow = (typeof getRotationWindow === 'function') ? getRotationWindow() : Math.floor(Date.now() / (12 * 3600 * 1000));
 if(!G.roamingWindow || G.roamingWindow !== nowWindow || !G.roamingPool){
 G.roamingWindow = nowWindow;
 
 const kantoOutdoor = ['route1','route22','route2','route3','route4','route24','route25','route5','route6','route11','route9','route10','route8','route7','route16','route17','route18','route15','route14','route13','route12','route19','route20','route21','route23'];
 
 const johtoOutdoor = ['jroute29','jroute30','jroute31','jroute32','jroute33','jroute34','jroute35','jroute36','jroute37','jroute38','jroute39','jroute42','jroute43','jroute44','jroute45','jroute46','jroute47','jroute48','nationalpark','jroute26','jroute27','jroute28'];
 const hoennOutdoor = ['route101','route102','route103','route104','route110','route111','route112','route113','route114','route115','route116','route117','route118','route119','route120','route121','route123'];
 const kIdx = nowWindow % kantoOutdoor.length;
 const jIdx = (nowWindow + 5) % johtoOutdoor.length;
 const hIdx = (nowWindow + 11) % hoennOutdoor.length;
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



if (typeof getRoamingLegendaryForRoute !== 'undefined') { if (typeof window !== 'undefined') window.getRoamingLegendaryForRoute = getRoamingLegendaryForRoute; if (typeof globalThis !== 'undefined') globalThis.getRoamingLegendaryForRoute = getRoamingLegendaryForRoute; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  getRoamingLegendaryForRoute,
};

