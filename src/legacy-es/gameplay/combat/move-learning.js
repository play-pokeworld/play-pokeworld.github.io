function getLearnLevelForMove(pokeId, moveId){
 
 const pools = (globalThis.OFFICIAL_POKE_MOVE_POOLS || globalThis.POKE_MOVE_POOLS) || (typeof POKE_MOVE_POOLS !== 'undefined' ? POKE_MOVE_POOLS : null);
 if(!pools || !pools[pokeId]) return 1;
 const pool = pools[pokeId];
 const levels = globalThis.POKE_MOVE_LEVELS || null;
 const lmap = levels ? (levels[pokeId] || levels[String(pokeId)] || {}) : {};
 if(lmap[moveId] != null) return lmap[moveId];
 const idx = pool.indexOf(moveId);
 if(idx === -1) return 999; 
 if(idx < 4) return 1;
 return Math.min(100, 1 + Math.floor((idx - 3) * 2));
}

function learnableMoves(p){
 const moveData = (typeof globalThis !== 'undefined' && globalThis.MOVES) ? globalThis.MOVES : MOVES;
 const known=new Set((p.moves||[]).map(m=>typeof m==='string'?m:m.id).filter(Boolean));
 
 const pools = (globalThis.OFFICIAL_POKE_MOVE_POOLS || globalThis.POKE_MOVE_POOLS) || (typeof POKE_MOVE_POOLS !== 'undefined' ? POKE_MOVE_POOLS : null);
 if(pools && pools[p.id]){
 const pool = pools[p.id];
 
 return pool.filter(id => {
 if(known.has(id)) return false;
 if(!moveData[id]) return false;
 const reqLvl = getLearnLevelForMove(p.id, id);
 return p.level >= reqLvl;
 });
 }
 
 const types=new Set([p.type1,p.type2].filter(Boolean));
 return Object.keys(moveData).filter(id=>!known.has(id)&&types.has(moveData[id].type));
}



function isTeamPokeMoveEditLocked(idx){
 const g = globalThis.G || (typeof G !== 'undefined' ? G : null);
 const p = g && g.team ? g.team[idx] : null;
 return !!(globalThis.isPokemonLockedForBattleEdits && globalThis.isPokemonLockedForBattleEdits(p, idx, null));
}

function notifyMoveEditLocked(){
 if(globalThis.notifyBattleEditLocked) globalThis.notifyBattleEditLocked();
 else if(typeof notify === 'function') notify((typeof t === 'function' ? t('action_blocked_in_battle') : 'Action impossible en combat'), 'var(--red)');
}

var moveReplaceSlot = null;

function forgetMove(idx,moveIdx){
 if(isTeamPokeMoveEditLocked(idx)){ notifyMoveEditLocked(); return; }
 const p=G.team[idx];
 if(!p||p.moves.length<=1){ notify(t("legacy_message_n_un_pok_mon_doit_conserver_au_moins_une_c")); return; }
 const removed=p.moves.splice(moveIdx,1)[0];
 notify(tr("m.move_learning.1", {p0:p.name, p1:getMoveName(removed.id)||removed.id}));
 moveReplaceSlot = null;
 saveGame();
 openPokeModal(idx);
}

function learnMove(idx,moveId){
 if(isTeamPokeMoveEditLocked(idx)){ notifyMoveEditLocked(); return; }
 const p=G.team[idx];
 if(!p) return;
 
 if(moveReplaceSlot !== null && p.moves[moveReplaceSlot]){
 const oldId = p.moves[moveReplaceSlot].id;
 p.moves[moveReplaceSlot] = {id:moveId};
 notify(tr("m.move_learning.2", {p0:p.name, p1:getMoveName(moveId)||moveId, p2:getMoveName(oldId)||oldId}));
 moveReplaceSlot = null;
 saveGame();
 openPokeModal(idx);
 return;
 }
 
 if(p.moves.length>=4){ notify(t("legacy_message_n_capacit_s_pleines_4_oubliezen_une_dabord")); return; }
 if(p.moves.find(m=>m.id===moveId)) return;
 p.moves.push({id:moveId});
 notify(tr("m.move_learning.3", {p0:p.name, p1:getMoveName(moveId)||moveId}));
 saveGame();
 openPokeModal(idx);
}


function toggleMoveSelect(idx, moveIdx){
 if(isTeamPokeMoveEditLocked(idx)){ notifyMoveEditLocked(); return; }
 const p = G.team[idx];
 if(!p) return;
 if(moveReplaceSlot === moveIdx){
 moveReplaceSlot = null; 
 } else {
 moveReplaceSlot = moveIdx; 
 }
 openPokeModal(idx);
}

function toggleMoveEditor(idx){
 if(isTeamPokeMoveEditLocked(idx)){ notifyMoveEditLocked(); return; }
 moveEditorFor=(moveEditorFor===idx)?null:idx;
 openPokeModal(idx);
}
let moveEditorFor=null;


// --- Migrated to ES module, globals exposed ---
if (typeof getLearnLevelForMove !== 'undefined' && typeof window !== 'undefined') window.getLearnLevelForMove = getLearnLevelForMove;
if (typeof learnableMoves !== 'undefined' && typeof window !== 'undefined') window.learnableMoves = learnableMoves;
if (typeof forgetMove !== 'undefined' && typeof window !== 'undefined') window.forgetMove = forgetMove;
if (typeof learnMove !== 'undefined' && typeof window !== 'undefined') window.learnMove = learnMove;
if (typeof toggleMoveSelect !== 'undefined' && typeof window !== 'undefined') window.toggleMoveSelect = toggleMoveSelect;
if (typeof toggleMoveEditor !== 'undefined' && typeof window !== 'undefined') window.toggleMoveEditor = toggleMoveEditor;

export {};
