// ============================================================================
// POKEMON FACTORY
// Point unique de création d'une instance de Pokémon (Factory pattern).
// Tout le jeu passe par createPoke() : ainsi la logique de création (niveau,
// shiny, talents, moves, stats) est centralisée et réutilisable (sauvage,
// rencontre, capture, évolution, marché, boss, hall de formation…).
// ============================================================================

// ===== extracted from src/scripts/data/game-data.js =====
function createPoke(id, level, shinyUnlocked=false){
  const d = PD[id];
  if(!d) return null;
  const [enName,t1,t2,bhp,batk,bdef,bspa,bspd,bspe,moveset,cr,xpY] = d;
  const isShiny = !!shinyUnlocked;
  const ivs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
  const evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
  const hp = calcStat(bhp, level, true, isShiny, 0, 0);
  const atk = calcStat(batk, level, false, isShiny, 0, 0);
  const def = calcStat(bdef, level, false, isShiny, 0, 0);
  const spa = calcStat(bspa, level, false, isShiny, 0, 0);
  const spd = calcStat(bspd, level, false, isShiny, 0, 0);
  const spe = calcStat(bspe, level, false, isShiny, 0, 0);
  const name = getPokeName(id);
  const tals = getSpeciesTalents(id);
  const roll = rand(0, 99);
  const talent = roll < 50 ? tals[0] : roll < 85 ? tals[1] : tals[2];
  return {id, name, type1:t1, type2:t2, level, catchRate:cr, xpYield:xpY,
    uid: 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5),
    maxHP:hp, currentHP:hp, atk, def, spa, spd, spe,
    shinyUnlocked:isShiny, shinyActive:isShiny, shiny:isShiny,
    talent:talent,
    heldItem:null,
    moves: getMovesForLevel(moveset, level),
    ivs, evs, status:null, statusTurns:0, xp: xpForLevel(level), xpNext: xpForLevel(level+1),
    battleMods:{atk:1,def:1,spa:1,spd:1,spe:1},
  };
}


