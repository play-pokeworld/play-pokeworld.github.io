function getLearnLevelForMove(pokeId, moveId){
 
 if(typeof POKE_MOVE_POOLS === 'undefined' || !POKE_MOVE_POOLS[pokeId]) return 1;
 const pool = POKE_MOVE_POOLS[pokeId];
 const idx = pool.indexOf(moveId);
 if(idx === -1) return 999; 
 
 if(idx < 4) return 1;
 
 return 1 + Math.floor((idx - 3) * 5);
}

function learnableMoves(p){
 const known=new Set(p.moves.map(m=>m.id));
 
 if(typeof POKE_MOVE_POOLS !== 'undefined' && POKE_MOVE_POOLS[p.id]){
 const pool = POKE_MOVE_POOLS[p.id];
 
 return pool.filter(id => {
 if(known.has(id)) return false;
 if(!MOVES[id]) return false;
 const reqLvl = getLearnLevelForMove(p.id, id);
 return p.level >= reqLvl;
 });
 }
 
 const types=new Set([p.type1,p.type2].filter(Boolean));
 return Object.keys(MOVES).filter(id=>!known.has(id)&&types.has(MOVES[id].type));
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
