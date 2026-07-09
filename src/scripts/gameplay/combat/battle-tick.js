// ============================================================
// BATTLE TICK — (split from battle.js)
// ============================================================
function battleTick(){
  if(!battle.active||battle.paused) return;
  const dt=100*(battle.speed||1);
  battle.pCd-=dt;
  battle.eCd-=dt;
  updateMoveBars();
  if(battle.pCd<=0){ doPlayerMove(); }
  if(!battle.active||battle.paused) return;
  if(battle.eCd<=0){ doEnemyMove(); }
}


function doPlayerMove(){
  const p=getActivePlayerPoke();
  const e=battle.enemyPoke;
  if(!p||!e||p.currentHP<=0||e.currentHP<=0){ resetPlayerCd(); return; }

  applyEndOfTurnStatus(p);
  if(p.currentHP<=0){ updateBattleUI(); onPlayerPokeFaint(); return; }

  if(handleStatusBeforeMove(p,'player')){
    const mv=p.moves[battle.pMoveIdx%p.moves.length];
    battle.pMoveIdx=(battle.pMoveIdx+1)%p.moves.length;
    flashMoveFiring(mv.id,'player');
    executeAttack(p,e,mv.id,'player');
  }
  resetPlayerCd();
  updateBattleUI();

  if(e.currentHP<=0){ onEnemyFaint(); }
  else if(p.currentHP<=0){ onPlayerPokeFaint(); }
}


function doEnemyMove(){
  const p=getActivePlayerPoke();
  const e=battle.enemyPoke;
  if(!p||!e||p.currentHP<=0||e.currentHP<=0){ resetEnemyCd(); return; }

  applyEndOfTurnStatus(e);
  if(e.currentHP<=0){ updateBattleUI(); onEnemyFaint(); return; }

  if(handleStatusBeforeMove(e,'enemy')){
    const mv=e.moves[battle.eMoveIdx%e.moves.length];
    battle.eMoveIdx=(battle.eMoveIdx+1)%e.moves.length;
    flashMoveFiring(mv.id,'enemy');
    executeAttack(e,p,mv.id,'enemy');
  }
  resetEnemyCd();
  updateBattleUI();

  if(p.currentHP<=0){ onPlayerPokeFaint(); }
  else if(e.currentHP<=0){ onEnemyFaint(); }
}


function triggerEntryTalents(side){
  if(!battle.active) return;
  const p = getActivePlayerPoke();
  const e = battle.enemyPoke;
  if(!p || !e) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  if(side === 'player' || side === 'both'){
    if(p.talent === 'intimidate'){
      battle.enemyMods.atk = Math.max(0.25, battle.enemyMods.atk * 0.75);
      addBattleLog(lang==='en' ? `🧬 [Intimidate] ${e.name}'s Attack fell!` : `🧬 [Intimidation] L'Attaque de ${e.name} baisse !`);
    } else if(p.talent === 'regenerator'){
      p.currentHP = Math.min(p.maxHP, p.currentHP + Math.floor(p.maxHP * 0.25));
      addBattleLog(lang==='en' ? `🧬 [Regenerator] ${p.name} restored HP!` : `🧬 [Régé-Force] ${p.name} régénère ses PV !`);
    }
  }
  if(side === 'enemy' || side === 'both'){
    if(e.talent === 'intimidate'){
      battle.playerMods.atk = Math.max(0.25, battle.playerMods.atk * 0.75);
      addBattleLog(lang==='en' ? `🧬 [Intimidate] ${p.name}'s Attack fell!` : `🧬 [Intimidation] L'Attaque de ${p.name} baisse !`);
    } else if(e.talent === 'regenerator'){
      e.currentHP = Math.min(e.maxHP, e.currentHP + Math.floor(e.maxHP * 0.25));
    }
  }
  if(typeof updateBattleUI === 'function') updateBattleUI();
}
