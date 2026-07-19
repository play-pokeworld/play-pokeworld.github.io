function resolveBattleStateAnomalies(){
 if(!battle.active || battle.resolvingKO) return true;
 if(!Number.isFinite(battle.pCd)) resetPlayerCd();
 if(!Number.isFinite(battle.eCd)) resetEnemyCd();
 const p = getActivePlayerPoke();
 const e = battle.enemyPoke;
 const nextAlive = (typeof firstAlive === 'function') ? firstAlive() : (G.team || []).findIndex(pk => pk && pk.currentHP > 0);
 if(!p){
  if(nextAlive >= 0){
   battle.playerPokeIdx = nextAlive;
   resetPlayerCd();
   updateBattleUI();
   renderMoveButtons();
   renderBattleTeamRow();
   return true;
  }
  if(typeof endBattle === 'function') endBattle();
  return true;
 }
 if(!e){
  if(battle.isChamp && battle.champTeam && battle.champPokeIdx < battle.champTeam.length){
   battle.enemyPoke = battle.champTeam[battle.champPokeIdx];
   resetEnemyCd();
   updateBattleUI();
   renderEnemyMoveBars();
   renderBattleTeamRow();
   return true;
  }
  if(typeof endBattle === 'function') endBattle();
  return true;
 }
 if(e.currentHP <= 0){
  battle.resolvingKO = true;
  battle.paused = true;
  Promise.resolve(onEnemyFaint()).finally(() => { battle.resolvingKO = false; });
  return true;
 }
 if(p.currentHP <= 0){
  battle.resolvingKO = true;
  battle.paused = true;
  Promise.resolve(onPlayerPokeFaint()).finally(() => { battle.resolvingKO = false; });
  return true;
 }
 return false;
}

function battleTick(){
 if(!battle.active||battle.paused||battle.resolvingKO) return;
 if(resolveBattleStateAnomalies()) return;
 const dt=100*(battle.speed||1);
 battle.pCd-=dt;
 battle.eCd-=dt;
 updateMoveBars();
 if(battle.pCd<=0){ doPlayerMove(); }
 if(!battle.active||battle.paused||battle.resolvingKO) return;
 if(resolveBattleStateAnomalies()) return;
 if(battle.eCd<=0){ doEnemyMove(); }
}


function doPlayerMove(){
 const p=getActivePlayerPoke();
 const e=battle.enemyPoke;
 if(!p||!e||p.currentHP<=0||e.currentHP<=0){
  resolveBattleStateAnomalies();
  resetPlayerCd();
  return;
 }
 if(!Array.isArray(p.moves) || !p.moves.length){ resetPlayerCd(); return; }

 applyEndOfTurnStatus(p);
 if(p.currentHP<=0){ updateBattleUI(); resolveBattleStateAnomalies(); return; }

 if(handleStatusBeforeMove(p,'player')){
 const mv=p.moves[battle.pMoveIdx%p.moves.length];
 if(!mv || !mv.id){ resetPlayerCd(); updateBattleUI(); return; }
 battle.pMoveIdx=(battle.pMoveIdx+1)%p.moves.length;
 flashMoveFiring(mv.id,'player');
 executeAttack(p,e,mv.id,'player');
 }
 resetPlayerCd();
 updateBattleUI();

 if(resolveBattleStateAnomalies()) return;
}


function doEnemyMove(){
 const p=getActivePlayerPoke();
 const e=battle.enemyPoke;
 if(!p||!e||p.currentHP<=0||e.currentHP<=0){
  resolveBattleStateAnomalies();
  resetEnemyCd();
  return;
 }
 if(!Array.isArray(e.moves) || !e.moves.length){ resetEnemyCd(); return; }

 applyEndOfTurnStatus(e);
 if(e.currentHP<=0){ updateBattleUI(); resolveBattleStateAnomalies(); return; }

 if(handleStatusBeforeMove(e,'enemy')){
 const mv=e.moves[battle.eMoveIdx%e.moves.length];
 if(!mv || !mv.id){ resetEnemyCd(); updateBattleUI(); return; }
 battle.eMoveIdx=(battle.eMoveIdx+1)%e.moves.length;
 flashMoveFiring(mv.id,'enemy');
 executeAttack(e,p,mv.id,'enemy');
 }
 resetEnemyCd();
 updateBattleUI();

 if(resolveBattleStateAnomalies()) return;
}



function triggerEntryTalents(side){
 if(!battle.active) return;
 const p = getActivePlayerPoke();
 const e = battle.enemyPoke;
 if(!p || !e) return;
 if(side === 'player' || side === 'both'){
 if(p.talent === 'intimidate'){
 battle.enemyMods.atk = Math.max(0.25, battle.enemyMods.atk * 0.75);
 addBattleLog(tr('talent_intimidate_player', {name:e.name}));
 } else if(p.talent === 'regenerator'){
 p.currentHP = Math.min(p.maxHP, p.currentHP + Math.floor(p.maxHP * 0.25));
 addBattleLog(tr('talent_regenerator_player', {name:p.name}));
 }
 }
 if(side === 'enemy' || side === 'both'){
 if(e.talent === 'intimidate'){
 battle.playerMods.atk = Math.max(0.25, battle.playerMods.atk * 0.75);
 addBattleLog(tr('talent_intimidate_enemy', {name:p.name}));
 } else if(e.talent === 'regenerator'){
 e.currentHP = Math.min(e.maxHP, e.currentHP + Math.floor(e.maxHP * 0.25));
 }
 }
 if(typeof updateBattleUI === 'function') updateBattleUI();
}

