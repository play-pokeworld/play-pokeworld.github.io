// ============================================================
// BATTLE FLOW — (split from battle.js)
// ============================================================
function endBattle(){
  clearInterval(battle.timerId);
  const hadLoot=!battle.isChamp&&(((battle.sessionCatches||[]).length)||Object.keys(battle.sessionItems||{}).length);
  battle.active=false;
  battle.paused=false;
  battle.legendaryCatch=false;
  battle.isTraining=false;
  battle.trainee=null;
  battle.enemyPoke=null;
  battle.champTeam=null;
  const idleScreen = document.getElementById('battle-idle-screen');
  const activeScene = document.getElementById('battle-active-scene');
  if(idleScreen) idleScreen.style.display = 'flex';
  if(activeScene) activeScene.style.display = 'none';
  renderTeamWindow();
  try{ renderMap(); }catch(_){}
  if(hadLoot) openBattleSummary(true);
}

// ============================================================
// UNIFIED SELECTOR & FULL-SCREEN BOX GRID MODAL
// ============================================================

// ============================================================
// HATCHERY SYSTEM (Pension & Couveuse Route 5)
// ============================================================

// ============================================================
// TRAINING SYSTEM (Salle d'Entraînement Major Bob)
// ============================================================


function restartLastBattle(){
  closeBattleSummary();
  if(battle.lastIsChamp && battle.lastChampId){
    startChampBattle(battle.lastChampId);
  } else {
    exploreArea();
  }
}

// ============================================================
// QUITTER / FUIR LE COMBAT — un seul bouton fait les deux (comportement
// identique), et il est PRIORITAIRE : un clic pendant une transition
// (KO adverse, nouveau Pokémon sauvage qui apparaît, changement de Pokémon
// après un KO côté joueur) est mémorisé et exécuté dès que la transition
// se termine, au lieu d'être ignoré silencieusement.
// ============================================================
async function doLeaveBattle(){
  if(!battle.active) return;
  battle.paused=true;
  if(battle.isChamp){
    const cName = getChampName(battle.champId);
    notify(`Vous abandonnez le combat contre ${cName}. Vous pourrez le redéfier à tout moment.`,'var(--blue)');
  } else {
    notify('🚪 Vous quittez le combat.','var(--blue)');
  }
  await wait(300);
  endBattle();
}

function leaveBattle(){
  if(!battle.active) return;
  if(battle.paused){
    // Une transition est en cours (KO / spawn) : le clic est mémorisé et
    // sera exécuté en priorité dès que la transition se termine.
    battle.pendingLeave=true;
    const btn=document.getElementById('leave-btn');
    if(btn){ btn.disabled=true; btn.textContent='⏳ Départ...'; }
    return;
  }
  doLeaveBattle();
}
// Appelé à la fin de chaque transition (KO, nouveau Pokémon sauvage, etc.)
// à la place d'un simple "battle.paused=false" : exécute en priorité toute
// action que le joueur a cliquée pendant que le jeu était en pause.

function resumeBattleActions(){
  if(battle.pendingLeave){
    battle.pendingLeave=false;
    doLeaveBattle();
    return;
  }
  if(battle.pendingSwitchIdx!=null){
    const idx=battle.pendingSwitchIdx;
    battle.pendingSwitchIdx=null;
    const p=G.team[idx];
    battle.paused=false;
    if(p&&p.currentHP>0&&idx!==battle.playerPokeIdx) doSwitchBattlePoke(idx);
    return;
  }
  battle.paused=false;
}


function wait(ms){return new Promise(r=>setTimeout(r,ms));}

// ============================================================
// MENU BUTIN (remplace l'ancien cadre de texte affiché pendant le combat)
// ============================================================

