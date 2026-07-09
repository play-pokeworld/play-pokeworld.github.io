'use strict';

// storage safe wrapper for sandboxed iframes
const safeStorage = {
  get(k){ try{ return window.localStorage ? window.localStorage.getItem(k) : null }catch(e){ return null } },
  set(k,v){ try{ if(window.localStorage) window.localStorage.setItem(k,v) }catch(e){} },
  remove(k){ try{ if(window.localStorage) window.localStorage.removeItem(k) }catch(e){} }
};

var G = {
  location:'pallet', region:'kanto', team:[], inventory:{}, money:2000,
  badges:[], defeatedChamps:{}, pokedex:{}, stepsLeft:0,
  starter:false, starterKanto:false, starterJohto:false, regionStarter:{kanto:false,johto:false}, collection:{}, evolvedSpecies:[], dupeCatches:{}, lang:'fr',
  storyIdx:0, storyProgress:0, unlockedTalents:{}, activeQuests:[], repeatables:[], visitedMaps:{}, completedQuests:{}, wildWinsByLoc:{}
};


// ============================================================================
// PART 1: GAME DATA & INTERNATIONALIZATION (I18N)
// Can be separated into data.js. Contains all dictionaries, Pokémon base stats,
// moves, locations, items, shops, and localization lookup routines.
// ============================================================================

// ============================================================
// TYPE SYSTEM
// ============================================================
const TYPES = ['Normal','Fire','Water','Grass','Electric','Ice','Fighting','Poison',
               'Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
const TYPE_COLORS = {
  Normal:'#a8a878',Fire:'#f08030',Water:'#6890f0',Grass:'#78c850',Electric:'#f8d030',
  Ice:'#98d8d8',Fighting:'#c03028',Poison:'#a040a0',Ground:'#e0c068',Flying:'#a890f0',
  Psychic:'#f85888',Bug:'#a8b820',Rock:'#b8a038',Ghost:'#705898',Dragon:'#7038f8',
  Dark:'#705848',Steel:'#b8b8d0',Fairy:'#ee99ac'
};
// chart[atk][def] = multiplier (0=0, .5=.5, 1=1, 2=2)
const CHART = {
  Normal: {Rock:.5,Steel:.5,Ghost:0},
  Fire: {Fire:.5,Water:.5,Rock:.5,Dragon:.5,Grass:2,Ice:2,Bug:2,Steel:2},
  Water: {Water:.5,Grass:.5,Dragon:.5,Fire:2,Ground:2,Rock:2},
  Grass: {Fire:.5,Grass:.5,Poison:.5,Flying:.5,Bug:.5,Dragon:.5,Steel:.5,Water:2,Ground:2,Rock:2},
  Electric: {Grass:.5,Electric:.5,Dragon:.5,Ground:0,Water:2,Flying:2},
  Ice: {Water:.5,Ice:.5,Fire:2,Fighting:2,Rock:2,Steel:2,Grass:2,Ground:2,Flying:2,Dragon:2},
  Fighting: {Poison:.5,Bug:.5,Psychic:.5,Flying:.5,Fairy:.5,Ghost:0,Normal:2,Ice:2,Rock:2,Dark:2,Steel:2},
  Poison: {Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Grass:2,Fairy:2},
  Ground: {Grass:.5,Bug:.5,Flying:0,Fire:2,Electric:2,Poison:2,Rock:2,Steel:2},
  Flying: {Electric:.5,Rock:.5,Steel:.5,Grass:2,Fighting:2,Bug:2},
  Psychic: {Psychic:.5,Steel:.5,Dark:0,Fighting:2,Poison:2},
  Bug: {Fire:.5,Fighting:.5,Flying:.5,Ghost:.5,Steel:.5,Fairy:.5,Grass:2,Psychic:2,Dark:2},
  Rock: {Fighting:.5,Ground:.5,Steel:.5,Fire:2,Ice:2,Flying:2,Bug:2},
  Ghost: {Normal:0,Fighting:0,Ghost:2,Psychic:2},
  Dragon: {Steel:.5,Fairy:0,Dragon:2},
  Dark: {Fighting:.5,Dark:.5,Fairy:.5,Psychic:2,Ghost:2},
  Steel: {Fire:.5,Water:.5,Electric:.5,Steel:.5,Ice:2,Rock:2,Fairy:2},
  Fairy: {Fire:.5,Poison:.5,Steel:.5,Fighting:2,Dragon:2,Dark:2}
};
function typeEff(atkType, defType1, defType2){
  const t1 = (CHART[atkType]||{})[defType1] ?? 1;
  const t2 = defType2 ? ((CHART[atkType]||{})[defType2] ?? 1) : 1;
  return t1*t2;
}
function effText(mult){
  if(mult===0) return '⛔ Immunité !';
  if(mult>=4) return '💥 Super efficace x4 !';
  if(mult>=2) return '⚡ Super efficace !';
  if(mult<=0.25) return '😴 Très peu efficace...';
  if(mult<=0.5) return '😐 Peu efficace...';
  return '';
}

// ============================================================
// MOVES DATA
// ============================================================

// ===== extracted from src/scripts/gameplay/world.js =====
let battle = {active:false, enemy:null, enemyPoke:null, playerPokeIdx:0,
  isChamp:false, champId:null, champPokeIdx:0,
  turnLocked:false, escaped:false, chill:false,
  playerMods:{atk:1,def:1,spe:1}, enemyMods:{atk:1,def:1,spe:1},
  log:[], sessionCatches:[], sessionItems:{}, pendingLeave:false, pendingSwitchIdx:null};

