const ROUTE_DROPS = {
 pallet:['oran_berry'],
 route1:['oran_berry','cheri_berry'], route22:['oran_berry','cheri_berry'],
 route2:['oran_berry','sitrus_berry'], route3:['sitrus_berry','prine_berry'],
 route9:['sitrus_berry','prine_berry'], route24:['oran_berry','cheri_berry'],
 route12:['prine_berry','cheri_berry'], route16:['sitrus_berry','prine_berry'],
 route19:['oran_berry','cheri_berry'], route21:['oran_berry','sitrus_berry'],
 route23:['sitrus_berry','prine_berry','cheri_berry'],
};


// --- Migrated to ES module, globals exposed ---
if (typeof ROUTE_DROPS !== 'undefined' && typeof window !== 'undefined') window.ROUTE_DROPS = ROUTE_DROPS;

