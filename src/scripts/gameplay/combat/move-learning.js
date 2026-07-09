
// ===== extracted from src/scripts/gameplay/battle.js =====
function learnableMoves(p){
  const known=new Set(p.moves.map(m=>m.id));
  const types=new Set([p.type1,p.type2,'Normal'].filter(Boolean));
  return Object.keys(MOVES).filter(id=>!known.has(id)&&types.has(MOVES[id].type));
}
function forgetMove(idx,moveIdx){
  const p=G.team[idx];
  if(!p||p.moves.length<=1){setMsg(t("n.un_pokémon_doit_conserver_au_moins_une_c"));return;}
  const removed=p.moves.splice(moveIdx,1)[0];
  notify(`${p.name} oublie ${getMoveName(removed.id)||removed.id}.`);
  saveGame();
  openPokeModal(idx);
}
function learnMove(idx,moveId){
  const p=G.team[idx];
  if(!p) return;
  if(p.moves.length>=4){setMsg(t("n.capacités_pleines_4_oubliezen_une_dabord"));return;}
  if(p.moves.find(m=>m.id===moveId)) return;
  p.moves.push({id:moveId,pp:MOVES[moveId]?.pp||10,maxPP:MOVES[moveId]?.pp||10});
  notify(`✅ ${p.name} apprend ${getMoveName(moveId)||moveId} !`);
  saveGame();
  openPokeModal(idx);
}
function toggleMoveEditor(idx){
  moveEditorFor=(moveEditorFor===idx)?null:idx;
  openPokeModal(idx);
}
let moveEditorFor=null;


