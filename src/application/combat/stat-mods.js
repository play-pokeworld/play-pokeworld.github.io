// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
/**
 * DORM-04 — moteur de changements de stats (fidèle PokeChill).
 *
 * PokeChill : up1 = ×1,5 · up2 = ×2 · down1 = ÷1,5 · down2 = ÷2 ;
 * durée 3 tours par défaut (spedown = 2). Les buffs sont PAR Pokémon ;
 * PokéWorld les applique PAR CÔTÉ (playerMods/enemyMods) — l'équipe entière
 * partage donc chaque changement : Costar est satisfait par l'architecture.
 *
 * Talents gérés ici :
 *  - contrary   : inverse le sens (hausse ↔ baisse) ;
 *  - simple     : les hausses montent d'un cran (+50 % → +100 %) ;
 *  - stoned     : les hausses durent ×3 plus longtemps ;
 *  - light_clay : les hausses durent +1 tour ;
 *  - mental_herb: les baisses durent −1 tour ;
 *  - fullmetalbody (tout), hypercutter (Att), bigpecks (Déf), clear_amulet
 *    (tout) : empêchent les baisses ;
 *  - imposter   : quand l'ENNEMI se booste, l'imposteur du joueur copie.
 *
 * Durées PokéWorld : 8 tours par défaut (PokeChill = 3, mais nos combats
 * sont plus longs) — tunable, gardée par les simulations d'équilibrage.
 *
 * @module application/combat/stat-mods
 */

function _smHasTalent(poke, t){
  if(!poke) return false;
  try{
    if(typeof hasTalent === 'function') return hasTalent(poke, t);
  }catch(_){}
  return String(poke.talent || '').toLowerCase() === String(t).toLowerCase();
}
function _smHeld(poke){
  if(!poke) return null;
  try{ if(typeof getHeldItemForPokemon === 'function') return getHeldItemForPokemon(poke); }catch(_){}
  return poke.heldItem || null;
}

const DEFAULT_BOOST_TURNS = 3; // fidèle PokeChill (buffs de 3 tours)

function pwBoostTurns(){
  if(typeof battle === 'undefined' || !battle) return null;
  if(!battle.boostTurns) battle.boostTurns = { player:{}, enemy:{} };
  return battle.boostTurns;
}

/**
 * Applique un changement de stat sur un côté.
 * @param {'player'|'enemy'} side
 * @param {'atk'|'def'|'spa'|'spd'|'spe'} stat
 * @param {number} mult — multiplicateur (<1 = baisse, >1 = hausse)
 * @param {{poke?:object, log?:boolean}} opts
 */
function pwStatChange(side, stat, mult, opts){
  opts = opts || {};
  const mods = side === 'player' ? battle.playerMods : battle.enemyMods;
  if(!mods) return false;
  const poke = opts.poke || null;
  let m = Number(mult);
  if(!Number.isFinite(m) || m <= 0) m = 1;

  // Contrary : inverse le sens.
  if(_smHasTalent(poke, 'contrary') && m !== 1) m = 1 / m;
  // Simple : les hausses montent d'un cran (×1,5 → ×2).
  if(_smHasTalent(poke, 'simple') && m > 1) m = m * m;

  // Protection contre les baisses.
  if(m < 1){
    const held = _smHeld(poke);
    if(_smHasTalent(poke, 'fullmetalbody')) return false;
    if(stat === 'atk' && _smHasTalent(poke, 'hypercutter')) return false;
    if(stat === 'def' && _smHasTalent(poke, 'bigpecks')) return false;
    if(held === 'clear_amulet') return false;
  }

  const cur = mods[stat] || 1;
  const next = Math.max(0.25, Math.min(3.0, cur * m));
  if(Math.abs(next - cur) < 1e-9) return false;
  mods[stat] = next;

  // Durée.
  let turns = DEFAULT_BOOST_TURNS;
  if(m > 1 && _smHasTalent(poke, 'stoned')) turns *= 3;
  const held = _smHeld(poke);
  if(m > 1 && held === 'light_clay') turns += 1;
  if(m < 1 && held === 'mental_herb') turns = Math.max(1, turns - 1);
  const bt = pwBoostTurns();
  if(bt && bt[side]) bt[side][stat] = turns;

  // Imposter : quand l'ennemi se booste, l'imposteur du joueur copie.
  if(side === 'enemy' && m > 1){
    try{
      if(typeof G !== 'undefined' && G && Array.isArray(G.team)){
        for(const tp of G.team){
          if(tp && Number(tp.currentHP ?? tp.hp ?? 1) > 0 && _smHasTalent(tp, 'imposter')){
            const pm = battle.playerMods;
            if(pm){ pm[stat] = Math.max(0.25, Math.min(3.0, next)); const btp = pwBoostTurns(); if(btp && btp.player) btp.player[stat] = turns; }
            if(typeof addBattleLog === 'function') addBattleLog(`${tp.name} copie le boost adverse (Imposteur) !`);
            break;
          }
        }
      }
    }catch(_){}
  }
  // Costar : la hausse est partagée par toute l'équipe (mods par côté) —
  // rendu explicite ici pour le log.
  if(m > 1){
    try{
      const _co = (typeof getActivePlayerPoke === 'function') ? getActivePlayerPoke() : null;
      const hasCostar = _co && _smHasTalent(_co, 'costar');
      if(hasCostar && side === 'player' && typeof addBattleLog === 'function'){
        addBattleLog(`${_co.name} partage le boost avec toute l'équipe (Costar) !`);
      }
    }catch(_){}
  }
  return true;
}

/**
 * Décrémente les durées de boosts d'un côté ; expire les stats à 1.
 */
function pwTickBoostDurations(side){
  const bt = pwBoostTurns();
  if(!bt || !bt[side]) return;
  const mods = side === 'player' ? battle.playerMods : battle.enemyMods;
  if(!mods) return;
  for(const stat of Object.keys(bt[side])){
    bt[side][stat] = (bt[side][stat] || 0) - 1;
    if(bt[side][stat] <= 0){
      delete bt[side][stat];
      mods[stat] = 1;
    }
  }
}

/**
 * Réinitialise boosts et durées d'un côté (début de combat, switch).
 */
function pwResetBoostDurations(side){
  const bt = pwBoostTurns();
  if(bt) bt[side] = {};
}

// --- Migrated to ES module, globals exposed ---
if (typeof pwStatChange !== 'undefined') { if (typeof window !== 'undefined') window.pwStatChange = pwStatChange; if (typeof globalThis !== 'undefined') globalThis.pwStatChange = pwStatChange; }
if (typeof pwTickBoostDurations !== 'undefined') { if (typeof window !== 'undefined') window.pwTickBoostDurations = pwTickBoostDurations; if (typeof globalThis !== 'undefined') globalThis.pwTickBoostDurations = pwTickBoostDurations; }
if (typeof pwResetBoostDurations !== 'undefined') { if (typeof window !== 'undefined') window.pwResetBoostDurations = pwResetBoostDurations; if (typeof globalThis !== 'undefined') globalThis.pwResetBoostDurations = pwResetBoostDurations; }

export {
  pwStatChange,
  pwTickBoostDurations,
  pwResetBoostDurations,
};

