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

