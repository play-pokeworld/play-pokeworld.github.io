// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
function createPoke(id, level, shinyUnlocked=false){
 const d = PD[id];
 if(!d) return null;
 const [_enName,t1,t2,bhp,batk,bdef,bspa,bspd,bspe,moveset,cr,xpY] = d;
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
 
 
 let talent = null;
 const tals = getSpeciesTalents(id);
 if(tals && tals.length > 0) {
   // Phase 24: lookup via getTalentRecord (resout the ids herites camelCase
   // of the anciennes saves ; the pools are desormais in minuscules).
   const hasTF = typeof TALENTS_FULL !== 'undefined';
   const recOf = (typeof getTalentRecord === 'function') ? getTalentRecord : (x) => (hasTF ? TALENTS_FULL[x] : null);
   if(hasTF) {
     const available = tals.filter(t => recOf(t));
     if(available.length > 0) {
       const roll = rand(0, 99);
       if(roll < 60) {
         const commons = available.filter(t => recOf(t).rarity === 1);
         talent = commons.length > 0 ? commons[rand(0, commons.length-1)] : available[0];
       } else if(roll < 90) {
         const uncommons = available.filter(t => recOf(t).rarity === 2);
         talent = uncommons.length > 0 ? uncommons[rand(0, uncommons.length-1)] : available[0];
       } else {
         const rares = available.filter(t => recOf(t).rarity === 3);
         talent = rares.length > 0 ? rares[rand(0, rares.length-1)] : available[0];
       }
     }
   }
   
   if(!talent) {
     talent = tals[0] || 'sturdy';
   // Also use learnPkmnAbility as fallback
   if (typeof learnPkmnAbility === 'function' && (!talent || talent === 'sturdy')) {
     try { talent = learnPkmnAbility(id); } catch(_){}
   }
   }
 }
 
 
 if(typeof G !== 'undefined' && G && !G.unlockedTalents) G.unlockedTalents = {};
 if(typeof G !== 'undefined' && G && G.unlockedTalents && !G.unlockedTalents[id]) {
   G.unlockedTalents[id] = [talent];
 }
 
 return {id, name, type1:t1, type2:t2, level, catchRate:cr, xpYield:xpY,
 uid: 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5),
 maxHP:hp, currentHP:hp, atk, def, spa, spd, spe,
 shinyUnlocked:isShiny, shinyActive:isShiny, shiny:isShiny,
 talent:talent,
 heldItem:null,
 moves: (typeof getMovesForSpeciesLevel === 'function' ? getMovesForSpeciesLevel(id, moveset, level) : getMovesForLevel(moveset, level)),
 ivs, evs, status:null, statusTurns:0, xp: xpForLevel(level), xpNext: xpForLevel(level+1),
 battleMods:{atk:1,def:1,spa:1,spd:1,spe:1},
 };
}


// --- Migrated to ES module, globals exposed ---
if (typeof createPoke !== 'undefined') { if (typeof window !== 'undefined') window.createPoke = createPoke; if (typeof globalThis !== 'undefined') globalThis.createPoke = createPoke; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  createPoke,
};
