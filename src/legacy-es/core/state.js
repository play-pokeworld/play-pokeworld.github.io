var safeStorage = window.PokeWorldCore.storage;

var G = window.PokeWorldState.gameState;


var TYPES = window.PokeWorldDomain.typeSystem.TYPES;
var TYPE_COLORS = window.PokeWorldDomain.typeSystem.TYPE_COLORS;
var CHART = window.PokeWorldDomain.typeSystem.TYPE_CHART;
function typeEff(atkType, defType1, defType2){
 return window.PokeWorldDomain.typeSystem.typeEffect(atkType, defType1, defType2);
}
function effText(mult){
 return window.PokeWorldDomain.typeSystem.effectivenessText(mult, (typeof t === 'function') ? t : undefined);
}


var battle = window.PokeWorldBattleState.battleState;


// --- Migrated to ES module, globals exposed ---
if (typeof typeEff !== 'undefined' && typeof window !== 'undefined') window.typeEff = typeEff;
if (typeof effText !== 'undefined' && typeof window !== 'undefined') window.effText = effText;
if (typeof G !== 'undefined' && typeof window !== 'undefined') window.G = G;
if (typeof battle !== 'undefined' && typeof window !== 'undefined') window.battle = battle;
if (typeof TYPES !== 'undefined' && typeof window !== 'undefined') window.TYPES = TYPES;
if (typeof TYPE_COLORS !== 'undefined' && typeof window !== 'undefined') window.TYPE_COLORS = TYPE_COLORS;
if (typeof CHART !== 'undefined' && typeof window !== 'undefined') window.CHART = CHART;

export {};

