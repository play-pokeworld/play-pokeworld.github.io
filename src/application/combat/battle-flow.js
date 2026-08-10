// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Phase 30: "is the player in the middle of a wild exploration chain?"
// EXACT condition under which the offline catch-up (OfflineEngine) replays
// the true battle loop on return (bounded, capped in time and steps).
// of explorer a route (chaine chill active), never if il was inactif or has
// the training. Persiste in G.wildSessionActive to the moment of the save.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseDialogNpcResult(...args) { const f = __pwV43Link('baseDialogNpcResult'); return f ? f(...args) : undefined; }
function baseEditorCreditBattle(...args) { const f = __pwV43Link('baseEditorCreditBattle'); return f ? f(...args) : undefined; }
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
 try{ if(typeof G !== 'undefined' && G) G.wildSessionActive = false; }catch(_){ } // phase 30 : chaine sauvage terminee → more of rattrapage offline
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
 if(wasAtollBorrowedLoss && typeof abandonAtollFactoryRun === 'function'){ try{ abandonAtollFactoryRun(battle.atollMode || null); notify(t('atoll_factory_run_ended'), 'var(--red)'); }catch(_){} } // defaite Usine : serie pretee terminee (phase 22)
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
 if(activeScene){ activeScene.style.display = 'none'; activeScene.classList.remove('is-live'); } // wave 17 (DS2817)
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
 // Phase 38 — legacy feature update
 const npcName = battle.baseNpcName || '';
 const winQuote = (battle.baseNpcMsgs && battle.baseNpcMsgs.win) || '';
 if(typeof __pwV43Link('baseEditorCreditBattle') === 'function') baseEditorCreditBattle(false);
 // Phase 52: battle-end panel (a flee/forfeit = visitor defeat).
 const npcRef = battle.baseNpcRef || null;
 const npcSprite = battle.baseNpcSprite || null;
 battle.isBaseNpcBattle=false; battle.baseNpcName=null; battle.baseNpcMsgs=null;
 battle.baseNpcRef=null; battle.baseNpcSprite=null;
 if(winQuote && typeof addBattleLog === 'function') addBattleLog('« ' + winQuote + ' » — ' + npcName);
 notify(tr('base.edit.battle_lost', {name:npcName}),'var(--red)');
 if(typeof __pwV43Link('baseDialogNpcResult') === 'function'){
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


// Shared async wait service (engine timer abstraction). globalThis-backed so
// concatenated VM harnesses, the offline engine's instant-wait patch and the
// classic boot all see ONE binding.
if (typeof globalThis !== 'undefined' && typeof globalThis.wait !== 'function') {
  globalThis.wait = (ms) => new Promise((r) => setTimeout(r, ms));
}


// --- Migrated to ES module, globals exposed ---
if (typeof endBattle !== 'undefined') { if (typeof window !== 'undefined') window.endBattle = endBattle; if (typeof globalThis !== 'undefined') globalThis.endBattle = endBattle; }
if (typeof isWildChillChainActive !== 'undefined') { if (typeof window !== 'undefined') window.isWildChillChainActive = isWildChillChainActive; if (typeof globalThis !== 'undefined') globalThis.isWildChillChainActive = isWildChillChainActive; }
if (typeof restartLastBattle !== 'undefined') { if (typeof window !== 'undefined') window.restartLastBattle = restartLastBattle; if (typeof globalThis !== 'undefined') globalThis.restartLastBattle = restartLastBattle; }
if (typeof leaveBattle !== 'undefined') { if (typeof window !== 'undefined') window.leaveBattle = leaveBattle; if (typeof globalThis !== 'undefined') globalThis.leaveBattle = leaveBattle; }
// FIX (2026-08): doLeaveBattle is guard-called from map-render.js — exposure required.
if (typeof doLeaveBattle !== 'undefined') { if (typeof window !== 'undefined') window.doLeaveBattle = doLeaveBattle; if (typeof globalThis !== 'undefined') globalThis.doLeaveBattle = doLeaveBattle; }
if (typeof resumeBattleActions !== 'undefined') { if (typeof window !== 'undefined') window.resumeBattleActions = resumeBattleActions; if (typeof globalThis !== 'undefined') globalThis.resumeBattleActions = resumeBattleActions; }
if (typeof wait !== 'undefined') { if (typeof window !== 'undefined') window.wait = wait; if (typeof globalThis !== 'undefined') globalThis.wait = wait; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  endBattle,
  isWildChillChainActive,
  restartLastBattle,
  leaveBattle,
  doLeaveBattle,
  resumeBattleActions,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('doLeaveBattle', doLeaveBattle); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('restartLastBattle', restartLastBattle); } catch (_) {} }
