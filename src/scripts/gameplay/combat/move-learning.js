
// ===== extracted from src/scripts/gameplay/battle.js =====
function getLearnLevelForMove(pokeId, moveId){
 // Return the level at which a Pokemon can learn a move
 if(typeof POKE_MOVE_POOLS === 'undefined' || !POKE_MOVE_POOLS[pokeId]) return 1;
 const pool = POKE_MOVE_POOLS[pokeId];
 const idx = pool.indexOf(moveId);
 if(idx === -1) return 999; // can't learn
 // First 4 moves available at level 1, rest progressively
 if(idx < 4) return 1;
 // Every 4 moves after that, +5 levels
 return 1 + Math.floor((idx - 3) * 5);
}

function learnableMoves(p){
 const known=new Set(p.moves.map(m=>m.id));
 // Use official per-species move pool if available
 if(typeof POKE_MOVE_POOLS !== 'undefined' && POKE_MOVE_POOLS[p.id]){
 const pool = POKE_MOVE_POOLS[p.id];
 // Filter: must be in MOVES, not already known, and learnable at current level
 return pool.filter(id => {
 if(known.has(id)) return false;
 if(!MOVES[id]) return false;
 const reqLvl = getLearnLevelForMove(p.id, id);
 return p.level >= reqLvl;
 });
 }
 // Fallback: only include types the Pokemon actually has
 const types=new Set([p.type1,p.type2].filter(Boolean));
 return Object.keys(MOVES).filter(id=>!known.has(id)&&types.has(MOVES[id].type));
}

// Track which move slot is"selected"(grayed) for replacement
var moveReplaceSlot = null;

function forgetMove(idx,moveIdx){
 const p=G.team[idx];
 if(!p||p.moves.length<=1){ notify(t("n.un_pokémon_doit_conserver_au_moins_une_c")); return; }
 const removed=p.moves.splice(moveIdx,1)[0];
 notify(tr("m.move_learning.1", {p0:p.name, p1:getMoveName(removed.id)||removed.id}));
 moveReplaceSlot = null;
 saveGame();
 openPokeModal(idx);
}

function learnMove(idx,moveId){
 const p=G.team[idx];
 if(!p) return;
 // If a slot is selected for replacement, replace it
 if(moveReplaceSlot !== null && p.moves[moveReplaceSlot]){
 const oldId = p.moves[moveReplaceSlot].id;
 p.moves[moveReplaceSlot] = {id:moveId};
 notify(tr("m.move_learning.2", {p0:p.name, p1:getMoveName(moveId)||moveId, p2:getMoveName(oldId)||oldId}));
 moveReplaceSlot = null;
 saveGame();
 openPokeModal(idx);
 return;
 }
 // Otherwise just add if room
 if(p.moves.length>=4){ notify(t("n.capacités_pleines_4_oubliezen_une_dabord")); return; }
 if(p.moves.find(m=>m.id===moveId)) return;
 p.moves.push({id:moveId});
 notify(tr("m.move_learning.3", {p0:p.name, p1:getMoveName(moveId)||moveId}));
 saveGame();
 openPokeModal(idx);
}

// Click a current move to select it for replacement (gray it out)
function toggleMoveSelect(idx, moveIdx){
 const p = G.team[idx];
 if(!p) return;
 if(moveReplaceSlot === moveIdx){
 moveReplaceSlot = null; // deselect
 } else {
 moveReplaceSlot = moveIdx; // select for replacement
 }
 openPokeModal(idx);
}

function toggleMoveEditor(idx){
 moveEditorFor=(moveEditorFor===idx)?null:idx;
 openPokeModal(idx);
}
let moveEditorFor=null;

