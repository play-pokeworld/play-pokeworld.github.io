function endBattle(){
 if(typeof restoreAllTransformedPokemon === 'function') restoreAllTransformedPokemon();
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


function restartLastBattle(){
 closeBattleSummary();
 if(battle.lastIsChamp && battle.lastChampId){
 startChampBattle(battle.lastChampId);
 } else {
 exploreArea();
 }
}


async function doLeaveBattle(){
 if(!battle.active) return;
 battle.paused=true;
 if(battle.isChamp){
 const cName = getChampName(battle.champId);
 notify(tr('forfeit_champion', {champion:cName}),'var(--blue)');
 } else {
 notify(t('leave_battle_notify'),'var(--blue)');
 }
 await wait(300);
 endBattle();
}

function leaveBattle(){
 if(!battle.active) return;
 if(battle.paused){
 
 
 battle.pendingLeave=true;
 const btn=document.getElementById('leave-btn');
 if(btn){ btn.disabled=true; btn.textContent=t('leaving_button'); }
 return;
 }
 doLeaveBattle();
}


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
