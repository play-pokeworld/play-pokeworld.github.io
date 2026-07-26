function getLearnLevelForMove(pokeId, moveId){
  // Nouveau systeme : utilise le pool deterministe par espece
  if (typeof getMoveLearnLevel === 'function') {
    return getMoveLearnLevel(pokeId, moveId);
  }
  // Fallback simple base sur la rarete
  var mv = (typeof MOVES !== 'undefined') ? MOVES[moveId] : null;
  var rarity = (mv && mv.rarity) ? mv.rarity : 1;
  if (rarity >= 4) return 40;
  if (rarity === 3) return 30;
  if (rarity === 2) return 20;
  return 5;
}

function learnableMoves(p){
  const moveData = (typeof globalThis !== 'undefined' && globalThis.MOVES) ? globalThis.MOVES : MOVES;
  const known=new Set((p.moves||[]).map(m=>typeof m==='string'?m:m.id).filter(Boolean));
  
  // Nouveau systeme : utilise le pool complet apprenable
  if (typeof getSpeciesFullLearnablePool === 'function') {
    var fullPool = getSpeciesFullLearnablePool(p.id);
    return fullPool.filter(function(id) {
      if (known.has(id)) return false;
      if (!moveData[id]) return false;
      if (typeof isMoveTrainingLocked === 'function' && isMoveTrainingLocked(p, id)) return false;
      return true;
    });
  }
  
  // Fallback : ancien systeme type-based
  const types = [p.type1, p.type2].filter(Boolean).map(function(t) { return String(t).toLowerCase(); });
  var maxTier = 3;
  if (p.level < 10) maxTier = 1;
  else if (p.level < 20) maxTier = 2;
  return Object.keys(moveData).filter(function(id) {
    if (known.has(id)) return false;
    if (!moveData[id]) return false;
    var mv = moveData[id];
    if (typeof isMoveTrainingLocked === 'function' && isMoveTrainingLocked(p, id)) return false;
    var mvRarity = mv.rarity || 1;
    if (mvRarity > maxTier) return false;
    var mvTypes = mv.moveset || [mv.type] || [];
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
 else if(typeof notify === 'function') notify((typeof t === 'function' ? t('action_blocked_in_battle') : 'Action impossible en combat'), 'var(--red)');
}

var moveReplaceSlot = null;

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


// Passe 17 : échange les positions de deux attaques équipées (ordre des
// attaques) — utilisé par le glisser-déposer de la fenêtre Party et par le
// clic sur une 2e attaque en mode remplacement. Verrouillé pendant combat.
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
 // Passe 17 : gel total des attaques de l'équipe pendant un combat.
 if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
 const p = G.team[idx];
 if(!p) return;
 if(moveReplaceSlot === moveIdx){
 moveReplaceSlot = null; 
 } else if(moveReplaceSlot !== null && p.moves[moveReplaceSlot] && p.moves[moveIdx]){
 // Clic sur une 2e attaque DÉJÀ ÉQUIPÉE : échange les positions (passe 17).
 if(swapTeamMoves(idx, moveReplaceSlot, moveIdx)){ moveReplaceSlot = null; openPokeModal(idx); }
 return;
 } else {
 moveReplaceSlot = moveIdx; 
 }
 openPokeModal(idx);
}

// ── Édition des attaques depuis la fiche d'un Pokémon en boîte PC ──────────
// (passe 6 : les lignes de la fiche box appelaient toggleBoxMoveSelect /
// learnBoxMove via data-call, mais ces fonctions n'existaient pas -> callGlobal
// retournait undefined en silence et l'apprentissage en boîte ne faisait rien.)
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
 // Clic sur une 2e attaque équipée : échange des positions (passe 17, box).
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
   // Remplacement du slot sélectionné (miroir de learnMove côté équipe)
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
if (typeof getLearnLevelForMove !== 'undefined' && typeof window !== 'undefined') window.getLearnLevelForMove = getLearnLevelForMove;
if (typeof learnableMoves !== 'undefined' && typeof window !== 'undefined') window.learnableMoves = learnableMoves;
if (typeof forgetMove !== 'undefined' && typeof window !== 'undefined') window.forgetMove = forgetMove;
if (typeof learnMove !== 'undefined' && typeof window !== 'undefined') window.learnMove = learnMove;
if (typeof toggleMoveSelect !== 'undefined' && typeof window !== 'undefined') window.toggleMoveSelect = toggleMoveSelect;
if (typeof swapTeamMoves !== 'undefined' && typeof window !== 'undefined') window.swapTeamMoves = swapTeamMoves;
if (typeof toggleMoveEditor !== 'undefined' && typeof window !== 'undefined') window.toggleMoveEditor = toggleMoveEditor;
if (typeof toggleBoxMoveSelect !== 'undefined' && typeof window !== 'undefined') window.toggleBoxMoveSelect = toggleBoxMoveSelect;
if (typeof learnBoxMove !== 'undefined' && typeof window !== 'undefined') window.learnBoxMove = learnBoxMove;
if (typeof getBoxPokemon !== 'undefined' && typeof window !== 'undefined') window.getBoxPokemon = getBoxPokemon;

