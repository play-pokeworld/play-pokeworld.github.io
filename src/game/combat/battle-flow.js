// Passe 30 : « le joueur est-il en pleine chaîne d'exploration sauvage ? »
// Condition EXACTE pour que le rattrapage hors-ligne (OfflineEngine) rejoue des
// combats sauvages : uniquement si le joueur ÉTAIT réellement en train
// d'explorer une route (chaîne chill active), jamais s'il était inactif ou à
// l'entraînement. Persisté dans G.wildSessionActive au moment de la sauvegarde.
function isWildChillChainActive(){
 if(typeof battle === 'undefined' || !battle || !battle.active || !battle.chill) return false;
 if(battle.isChamp || battle.isTraining || battle.isAtollBattle || battle.isQuestDefeatBattle) return false;
 if(battle.questRewardQuestId != null || battle.legendaryCatch) return false;
 return true;
}

function endBattle(){
 if(typeof restoreAllTransformedPokemon === 'function') restoreAllTransformedPokemon();
 clearInterval(battle.timerId);
 const hadLoot = !battle.isChamp && !battle.isQuestTrainerBattle && !battle.isBaseNpcBattle && !battle.isQuestDefeatBattle && ((((battle.sessionCatches||[]).length)||Object.keys(battle.sessionItems||{}).length||(battle.sessionWins||0)||(battle.sessionPlayerKOs||0)));
 const wasAtollLoss = !!battle.isAtollBattle;
 const wasAtollBorrowedLoss = wasAtollLoss && !!battle.atollBorrowed;
 battle.active=false;
 try{ if(typeof G !== 'undefined' && G) G.wildSessionActive = false; }catch(_){ } // passe 30 : chaîne sauvage terminée → plus de rattrapage offline
 battle.paused=false;
 battle.resolvingKO=false;
 battle.legendaryCatch=false;
 battle.isTraining=false;
 battle.trainee=null;
 battle.noAutoCatch=false;
 battle.questDefeatLoc=null;
 battle.isQuestDefeatBattle=false;
 if(wasAtollLoss && G && G.atoll){ G.atoll.streak = 0; try{ if(typeof restoreAtollTeam === 'function') restoreAtollTeam(); notify(t('atoll_streak_lost'), 'var(--red)'); }catch(_){} }
 if(wasAtollLoss) battle.atollBorrowed = false;
 if(wasAtollBorrowedLoss && typeof abandonAtollFactoryRun === 'function'){ try{ abandonAtollFactoryRun(battle.atollMode || null); notify(t('atoll_factory_run_ended'), 'var(--red)'); }catch(_){} } // défaite Usine : série prêtée terminée (passe 22)
 battle.isAtollBattle=false;
 battle.atollReward=0;
 battle.atollRank=null;
 battle.atollMode=null;
 battle.isBaseNpcBattle=false;
 battle.baseNpcName=null;
 battle.baseNpcMsgs=null; battle.baseNpcRef=null; battle.baseNpcSprite=null;
 battle.questRewardQuestId=null;
 battle.questRewardCat=null;
 battle.questRewardRegion=null;
 battle.questRewardDefId=null;
 battle.trainerVisual=null;
 battle.enemyPoke=null;
 battle.champTeam=null;
 const idleScreen = document.getElementById('battle-idle-screen');
 const activeScene = document.getElementById('battle-active-scene');
 if(idleScreen) idleScreen.style.display = 'flex';
 if(activeScene) activeScene.style.display = 'none';
 renderTeamWindow();
 try{ renderMap(); }catch(_){}
 if(hadLoot) openBattleSummary(true);
 try{ if(typeof renderTrainingBattlePanel === 'function') renderTrainingBattlePanel(); }catch(_){}
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
 if(battle.isBaseNpcBattle){
 // Abandon face à un copain de base secrète = défaite du visiteur (passe 38)
 const npcName = battle.baseNpcName || '';
 const winQuote = (battle.baseNpcMsgs && battle.baseNpcMsgs.win) || '';
 if(typeof baseEditorCreditBattle === 'function') baseEditorCreditBattle(false);
 // Passe 52 : panneau de fin de combat (abandon = défaite du visiteur).
 const npcRef = battle.baseNpcRef || null;
 const npcSprite = battle.baseNpcSprite || null;
 battle.isBaseNpcBattle=false; battle.baseNpcName=null; battle.baseNpcMsgs=null;
 battle.baseNpcRef=null; battle.baseNpcSprite=null;
 if(winQuote && typeof addBattleLog === 'function') addBattleLog('« ' + winQuote + ' » — ' + npcName);
 notify(tr('base.edit.battle_lost', {name:npcName}),'var(--red)');
 if(typeof baseDialogNpcResult === 'function'){
  setTimeout(()=>{ try{ baseDialogNpcResult({npc:npcRef, won:false, name:npcName, sprite:npcSprite, quote:winQuote}); }catch(_){} }, 900);
 }
 await wait(300);
 endBattle();
 return;
}
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


// --- Migrated to ES module, globals exposed ---
if (typeof endBattle !== 'undefined' && typeof window !== 'undefined') window.endBattle = endBattle;
if (typeof isWildChillChainActive !== 'undefined' && typeof window !== 'undefined') window.isWildChillChainActive = isWildChillChainActive;
if (typeof restartLastBattle !== 'undefined' && typeof window !== 'undefined') window.restartLastBattle = restartLastBattle;
if (typeof leaveBattle !== 'undefined' && typeof window !== 'undefined') window.leaveBattle = leaveBattle;
if (typeof resumeBattleActions !== 'undefined' && typeof window !== 'undefined') window.resumeBattleActions = resumeBattleActions;
if (typeof wait !== 'undefined' && typeof window !== 'undefined') window.wait = wait;


