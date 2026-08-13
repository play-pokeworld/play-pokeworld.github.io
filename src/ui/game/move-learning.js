// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
function getLearnLevelForMove(pokeId, moveId){
  // New system: use the deterministic per-species pool
  if (typeof getMoveLearnLevel === 'function') {
    return getMoveLearnLevel(pokeId, moveId);
  }
  // Fallback simple base on the rarete
  const mv = (typeof MOVES !== 'undefined') ? MOVES[moveId] : null;
  const rarity = (mv && mv.rarity) ? mv.rarity : 1;
  if (rarity >= 4) return 40;
  if (rarity === 3) return 30;
  if (rarity === 2) return 20;
  return 5;
}

function learnableMoves(p){
  const moveData = (typeof globalThis !== 'undefined' && globalThis.MOVES) ? globalThis.MOVES : MOVES;
  const known=new Set((p.moves||[]).map(m=>typeof m==='string'?m:m.id).filter(Boolean));
  
  // New system: use the full learnable pool
  if (typeof getSpeciesFullLearnablePool === 'function') {
    const fullPool = getSpeciesFullLearnablePool(p.id);
    return fullPool.filter(function(id) {
      if (known.has(id)) return false;
      if (!moveData[id]) return false;
      if (typeof isMoveTrainingLocked === 'function' && isMoveTrainingLocked(p, id)) return false;
      return true;
    });
  }
  
  // Fallback : old systeme type-based
  const types = [p.type1, p.type2].filter(Boolean).map(function(t) { return String(t).toLowerCase(); });
  let maxTier = 3;
  if (p.level < 10) maxTier = 1;
  else if (p.level < 20) maxTier = 2;
  return Object.keys(moveData).filter(function(id) {
    if (known.has(id)) return false;
    if (!moveData[id]) return false;
    const mv = moveData[id];
    if (typeof isMoveTrainingLocked === 'function' && isMoveTrainingLocked(p, id)) return false;
    const mvRarity = mv.rarity || 1;
    if (mvRarity > maxTier) return false;
    const mvTypes = mv.moveset || [mv.type] || [];
    if (mvTypes.includes('all')) return true;
    return mvTypes.some(function(t) { return types.indexOf(String(t).toLowerCase()) !== -1; });
  });
}



function isTeamPokeMoveEditLocked(idx){
 const g = globalThis.G || (typeof G !== 'undefined' ? G : null);
 const p = g && g.team ? g.team[idx] : null;
 return !!(globalThis.isPokemonLockedForBattleEdits && globalThis.isPokemonLockedForBattleEdits(p, idx, null));
}

function notifyMoveEditLocked(){
 if(globalThis.notifyBattleEditLocked) globalThis.notifyBattleEditLocked();
 else if(typeof notify === 'function') notify(t('action_blocked_in_battle'), 'var(--red)');
}

// Replace-mode selection: shared global state (the runtime bridge and the VM
// harnesses mutate it through window/globalThis — a lexical binding would shadow).
if (typeof globalThis.moveReplaceSlot === 'undefined') globalThis.moveReplaceSlot = null;

function forgetMove(idx,moveIdx){
 if(isTeamPokeMoveEditLocked(idx)){ notifyMoveEditLocked(); return; }
 if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
 const p=G.team[idx];
 if(!p||p.moves.length<=1){ notify(t("legacy_message_n_un_pok_mon_doit_conserver_au_moins_une_c")); return; }
 const removed=p.moves.splice(moveIdx,1)[0];
 notify(tr("m.move_learning.1", {p0:p.name, p1:getMoveName(removed.id)||removed.id}));
 moveReplaceSlot = null;
 saveGame();
 openPokeModal(idx);
 if (typeof window !== 'undefined' && typeof window.refreshLearnableMovesPanelIfOpen === 'function') window.refreshLearnableMovesPanelIfOpen();
}

function learnMove(idx,moveId){
 if(isTeamPokeMoveEditLocked(idx)){ notifyMoveEditLocked(); return; }
 if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
 const p=G.team[idx];
 if(!p) return;
 
 if(moveReplaceSlot !== null && p.moves[moveReplaceSlot]){
 const oldId = p.moves[moveReplaceSlot].id;
 p.moves[moveReplaceSlot] = {id:moveId};
 notify(tr("m.move_learning.2", {p0:p.name, p1:getMoveName(moveId)||moveId, p2:getMoveName(oldId)||oldId}));
 moveReplaceSlot = null;
 saveGame();
 openPokeModal(idx);
 if (typeof window !== 'undefined' && typeof window.refreshLearnableMovesPanelIfOpen === 'function') window.refreshLearnableMovesPanelIfOpen();
 return;
 }
 
 if(p.moves.length>=4){ notify(t("legacy_message_n_capacit_s_pleines_4_oubliezen_une_dabord")); return; }
 if(p.moves.find(m=>m.id===moveId)) return;
 p.moves.push({id:moveId});
 notify(tr("m.move_learning.3", {p0:p.name, p1:getMoveName(moveId)||moveId}));
 saveGame();
 openPokeModal(idx);
 if (typeof window !== 'undefined' && typeof window.refreshLearnableMovesPanelIfOpen === 'function') window.refreshLearnableMovesPanelIfOpen();
}


// Phase 17: swap the positions of two equipped moves (move order) —
// used by the Party window drag & drop and by clicking a 2nd move in
// replacement mode. Locked during battle.
function swapTeamMoves(teamIdx, fromIdx, toIdx){
 if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return false; }
 const g = (typeof G !== 'undefined') ? G : globalThis.G;
 const p = g && g.team ? g.team[teamIdx] : null;
 if(!p || !Array.isArray(p.moves)) return false;
 fromIdx = Number(fromIdx); toIdx = Number(toIdx);
 if(isNaN(fromIdx) || isNaN(toIdx) || fromIdx === toIdx) return false;
 if(fromIdx < 0 || toIdx < 0 || fromIdx >= p.moves.length || toIdx >= p.moves.length) return false;
 if(!p.moves[fromIdx] || !p.moves[toIdx]) return false;
 const tmp = p.moves[fromIdx];
 p.moves[fromIdx] = p.moves[toIdx];
 p.moves[toIdx] = tmp;
 if(typeof notify === 'function') notify(tr('moves_swapped', {a:getMoveName(p.moves[fromIdx].id), b:getMoveName(p.moves[toIdx].id)}), 'var(--green)');
 try{ saveGame(); }catch(_){}
 try{ renderTeamWindow(); }catch(_){}
 return true;
}

function toggleMoveSelect(idx, moveIdx){
 if(isTeamPokeMoveEditLocked(idx)){ notifyMoveEditLocked(); return; }
 // Phase 17: total freeze of the team's moves during a battle.
 if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
 const p = G.team[idx];
 if(!p) return;
 if(moveReplaceSlot === moveIdx){
 moveReplaceSlot = null; 
 } else if(moveReplaceSlot !== null && p.moves[moveReplaceSlot] && p.moves[moveIdx]){
 // Phase 17 — legacy feature update
 if(swapTeamMoves(idx, moveReplaceSlot, moveIdx)){ moveReplaceSlot = null; openPokeModal(idx); }
 return;
 } else {
 moveReplaceSlot = moveIdx; 
 }
 openPokeModal(idx);
}

// ── Move editing from the sheet of a PC-box Pokemon ──────────
// Phase 6 — these handlers used to be global functions invoked via
// learnBoxMove in data-call, but they did not exist → callGlobal
 // Move learning validation and level threshold rules
function getBoxPokemon(boxId){
 const g = (typeof G !== 'undefined') ? G : (globalThis.G || null);
 if(!g || !g.collection) return null;
 return g.collection[boxId] || g.collection[String(boxId)] || null;
}

function toggleBoxMoveSelect(boxId, moveIdx){
 const p = getBoxPokemon(boxId);
 if(!p) return;
 const prev = window.boxMoveReplaceSlot;
 if(prev !== null && prev !== undefined && prev !== moveIdx && p.moves && p.moves[prev] && p.moves[moveIdx]){
 // Phase 17 — legacy feature update
 const tmp = p.moves[prev]; p.moves[prev] = p.moves[moveIdx]; p.moves[moveIdx] = tmp;
 window.boxMoveReplaceSlot = null;
 if(typeof notify === 'function') notify(tr('moves_swapped', {a:getMoveName(p.moves[prev].id), b:getMoveName(p.moves[moveIdx].id)}), 'var(--green)');
 try{ saveGame(); }catch(_){}
 if(typeof openBoxPokeModal === 'function') openBoxPokeModal(boxId);
 return;
 }
 window.boxMoveReplaceSlot = (prev === moveIdx) ? null : moveIdx;
 if(typeof openBoxPokeModal === 'function') openBoxPokeModal(boxId);
}

function learnBoxMove(boxId, moveId){
 const p = getBoxPokemon(boxId);
 if(!p) return;
 if(!p.moves) p.moves = [];
 const slot = window.boxMoveReplaceSlot;
 if(slot !== null && slot !== undefined && p.moves[slot]){
   // replaces the selected slot (mirror of learnMove on the team side)
   const oldId = p.moves[slot].id;
   p.moves[slot] = {id:moveId};
   if(typeof notify === 'function') notify(tr("m.move_learning.2", {p0:p.name, p1:getMoveName(moveId)||moveId, p2:getMoveName(oldId)||oldId}));
   window.boxMoveReplaceSlot = null;
 } else {
   if(p.moves.length>=4){ if(typeof notify === 'function') notify(t("legacy_message_n_capacit_s_pleines_4_oubliezen_une_dabord")); return; }
   if(p.moves.find(m=>m && m.id===moveId)) return;
   p.moves.push({id:moveId});
   if(typeof notify === 'function') notify(tr("m.move_learning.3", {p0:p.name, p1:getMoveName(moveId)||moveId}));
 }
 if(typeof saveGame === 'function') saveGame();
 if(typeof openBoxPokeModal === 'function') openBoxPokeModal(boxId);
 if (typeof window !== 'undefined' && typeof window.refreshLearnableMovesPanelIfOpen === 'function') window.refreshLearnableMovesPanelIfOpen();
}

function toggleMoveEditor(idx){
 if(isTeamPokeMoveEditLocked(idx)){ notifyMoveEditLocked(); return; }
 moveEditorFor=(moveEditorFor===idx)?null:idx;
 openPokeModal(idx);
}
let moveEditorFor=null;


// --- Migrated to ES module, globals exposed ---
if (typeof getLearnLevelForMove !== 'undefined') { if (typeof window !== 'undefined') window.getLearnLevelForMove = getLearnLevelForMove; if (typeof globalThis !== 'undefined') globalThis.getLearnLevelForMove = getLearnLevelForMove; }
if (typeof learnableMoves !== 'undefined') { if (typeof window !== 'undefined') window.learnableMoves = learnableMoves; if (typeof globalThis !== 'undefined') globalThis.learnableMoves = learnableMoves; }
if (typeof forgetMove !== 'undefined') { if (typeof window !== 'undefined') window.forgetMove = forgetMove; if (typeof globalThis !== 'undefined') globalThis.forgetMove = forgetMove; }
if (typeof learnMove !== 'undefined') { if (typeof window !== 'undefined') window.learnMove = learnMove; if (typeof globalThis !== 'undefined') globalThis.learnMove = learnMove; }
if (typeof toggleMoveSelect !== 'undefined') { if (typeof window !== 'undefined') window.toggleMoveSelect = toggleMoveSelect; if (typeof globalThis !== 'undefined') globalThis.toggleMoveSelect = toggleMoveSelect; }
if (typeof swapTeamMoves !== 'undefined') { if (typeof window !== 'undefined') window.swapTeamMoves = swapTeamMoves; if (typeof globalThis !== 'undefined') globalThis.swapTeamMoves = swapTeamMoves; }
if (typeof toggleMoveEditor !== 'undefined') { if (typeof window !== 'undefined') window.toggleMoveEditor = toggleMoveEditor; if (typeof globalThis !== 'undefined') globalThis.toggleMoveEditor = toggleMoveEditor; }
if (typeof toggleBoxMoveSelect !== 'undefined') { if (typeof window !== 'undefined') window.toggleBoxMoveSelect = toggleBoxMoveSelect; if (typeof globalThis !== 'undefined') globalThis.toggleBoxMoveSelect = toggleBoxMoveSelect; }
if (typeof learnBoxMove !== 'undefined') { if (typeof window !== 'undefined') window.learnBoxMove = learnBoxMove; if (typeof globalThis !== 'undefined') globalThis.learnBoxMove = learnBoxMove; }
if (typeof getBoxPokemon !== 'undefined') { if (typeof window !== 'undefined') window.getBoxPokemon = getBoxPokemon; if (typeof globalThis !== 'undefined') globalThis.getBoxPokemon = getBoxPokemon; }



// --- Exported globals ---
if (typeof isTeamPokeMoveEditLocked !== 'undefined') { if (typeof window !== 'undefined') window.isTeamPokeMoveEditLocked = isTeamPokeMoveEditLocked; if (typeof globalThis !== 'undefined') globalThis.isTeamPokeMoveEditLocked = isTeamPokeMoveEditLocked; }
if (typeof notifyMoveEditLocked !== 'undefined') { if (typeof window !== 'undefined') window.notifyMoveEditLocked = notifyMoveEditLocked; if (typeof globalThis !== 'undefined') globalThis.notifyMoveEditLocked = notifyMoveEditLocked; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  getLearnLevelForMove,
  learnableMoves,
  forgetMove,
  learnMove,
  toggleMoveSelect,
  swapTeamMoves,
  toggleMoveEditor,
  toggleBoxMoveSelect,
  learnBoxMove,
  getBoxPokemon,
  isTeamPokeMoveEditLocked,
  notifyMoveEditLocked,
};

