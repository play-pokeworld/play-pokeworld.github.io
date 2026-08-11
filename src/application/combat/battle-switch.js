// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Shared async wait service (engine timer abstraction). globalThis-backed so
// concatenated VM harnesses, the offline engine's instant-wait patch and the
// classic boot all see ONE binding.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function applySecretBaseMoneyBonus(...args) { const f = __pwV43Link('applySecretBaseMoneyBonus'); return f ? f(...args) : undefined; }
function baseDialogNpcResult(...args) { const f = __pwV43Link('baseDialogNpcResult'); return f ? f(...args) : undefined; }
function baseEditorCreditBattle(...args) { const f = __pwV43Link('baseEditorCreditBattle'); return f ? f(...args) : undefined; }
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

if (typeof globalThis !== 'undefined' && typeof globalThis.wait !== 'function') {
  globalThis.wait = (ms) => new Promise((r) => setTimeout(r, ms));
}
function switchBattlePoke(idx){
 if(!battle.active) return;
 const p=G.team[idx];
 if(!p||p.currentHP<=0||idx===battle.playerPokeIdx) return;
 if(battle.paused){
 
 
 battle.pendingSwitchIdx=idx;
 setMsg(tr('switch_pending', {name:p.name}));
 return;
 }
 doSwitchBattlePoke(idx);
}

function doSwitchBattlePoke(idx){
 if(battle.isTraining){
 notify(t('solo_training_no_switch'),'var(--red)');
 return;
 }
 const p=G.team[idx];
 if(!p||p.currentHP<=0) return;
 if(typeof regionRequiresNativeTeam === 'function' && regionRequiresNativeTeam(G.region || 'kanto') && !isPokemonNativeToRegion(p.id, G.region || 'kanto')){
 notify(regionTeamRestrictionMessage(G.region || 'kanto'), 'var(--red)');
 return;
 }
if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 try {
   const oldP = G.team[battle.playerPokeIdx];
   if (oldP && oldP.currentHP > 0 && oldP !== p) {
     if (oldP.talent === 'naturalcure' && oldP.status) {
       oldP.status = null;
       oldP.statusTurns = 0;
     }
     if (oldP.talent === 'regenerator' && oldP.currentHP < oldP.maxHP) {
       const heal = Math.max(1, Math.floor(oldP.maxHP * 0.25));
       oldP.currentHP = Math.min(oldP.maxHP, oldP.currentHP + heal);
     }
   }
 } catch (_) {}
 battle.playerPokeIdx=idx;
 battle.playerMods={atk:1,def:1,spe:1};
 battle.pMoveIdx=0;
 resetPlayerCd();
 addBattleLog(`Allez, <b>${p.name}</b> !`);
 triggerEntryTalents('player');
 updateBattleUI();
 renderMoveButtons();
 renderBattleTeamRow();
}


function healTeamHalf(){
 for(const p of G.team){
 if(p.currentHP<=0) p.currentHP=Math.floor(p.maxHP/2);
 p.status=null;
 }
}


function showQuestCapturePanel(legMon, wasShiny){
 const el = document.getElementById('quest-capture-screen');
 const cont = document.getElementById('qcap-content');
 if(!el || !cont) return;
 const shinyTag = wasShiny ? `<div class="pw-capture-shiny">${t('shiny_captured')}</div>` : '';
 _pwSetHtmlSafe(cont, `
 <div class="pw-capture-banner">
 🎊 ${t('capture_title')}
 </div>
 ${shinyTag}
 <div class="pw-capture-sprite-box">
 <div class="poke-sprite${wasShiny?' is-shiny':''}">
 ${spriteImg(legMon.id, legMon.emoji, {shiny:wasShiny, size:72})}
 </div>
 </div>
 <div class="pw-capture-poke-name">
 ${wasShiny?' ':''}${legMon.name}
 </div>
 <div class="pw-capture-actions">
 ${typeSpan(legMon.type1)}${legMon.type2?typeSpan(legMon.type2):''}
 </div>
 <button class="hbtn extracted-bridge-style-034" data-action="hide-element" data-target-element="quest-capture-screen">
 ${t('continue') || t('close')}
 </button>
 `);
 el.style.display = 'flex';
}

async function champVictory(){ // shared-scope battle API: called from battle-status.js
 if(battle.champId === 'training' || battle.isTraining){
 const trainee = battle.trainee || G.team[0];
 const mode = battle.trainingMode || 'ev';
 let rewardMsg = '';
 if(trainee){
   if(mode === 'ev'){
     if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
     const keys = ['hp','atk','def','spa','spd','spe'];
     const avail = keys.filter(k => (trainee.evs[k]||0) < 6);
     if(avail.length){
       const pk = avail[rand(0, avail.length - 1)];
       trainee.evs[pk]++;
       rewardMsg = ` (+1 EV ${pk.toUpperCase()} → ${trainee.evs[pk]}/6)`;
     } else rewardMsg = ' (EV au maximum)';
   } else if(mode === 'level'){
     const gain = Math.min(rand(2,5), Math.max(0, 100 - (trainee.level||1)));
     for(let i=0;i<gain;i++) levelUp(trainee);
     rewardMsg = ` (+${gain} niveaux → Nv.${trainee.level})`;
   } else if(mode === 'talent'){
     const chosen = (typeof rollTrainingTalent === 'function') ? rollTrainingTalent(trainee) : null;
     if(chosen){
       if(!G.unlockedTalents) G.unlockedTalents = {};
       if(!G.unlockedTalents[trainee.id]) G.unlockedTalents[trainee.id] = [];
       const wasNew = !G.unlockedTalents[trainee.id].includes(chosen);
       if(wasNew) G.unlockedTalents[trainee.id].push(chosen);
       trainee.talent = chosen;
       rewardMsg = ` (${wasNew?'Nouveau talent':(typeof t==='function'?t('talent_confirmed'):'Talent confirmed')} : ${getTalentName(chosen)})`;
     } else rewardMsg = ' (' + (typeof t === 'function' ? t('no_talent_available') : 'aucun talent disponible') + ')';
   } else if(mode === 'move'){
     const unlocked = (typeof unlockTrainingMove === 'function') ? unlockTrainingMove(trainee) : null;
     rewardMsg = unlocked ? ` (Capacité débloquée : ${getMoveName(unlocked)})` : (typeof t==='function'?t('abilities_all_unlocked'):' (all abilities already unlocked)');
   }
   recalcPokeStats(trainee);
 }
 battle.isTraining = false;
 notify(tr('training_complete', {reward:rewardMsg}), 'var(--green)');
 updateHeader(); renderTeamWindow(); renderTrainingWindow();
 await wait(1200); endBattle(); renderMap(); showTab('info');
 return;
}
 if(battle.isBaseNpcBattle){
 // Phase 38: visitor victory against a secret-base buddy.
 // Credit the OWNER record (beaten buddy → l++) + defeat quote.
 const npcName = battle.baseNpcName || '';
 const loseQuote = (battle.baseNpcMsgs && battle.baseNpcMsgs.lose) || '';
 if(typeof __pwV43Link('baseEditorCreditBattle') === 'function') baseEditorCreditBattle(true);
 // Phase 52: battle-end panel (the player never saw the NPC quote — it
 // only lived in the log, which closes with the duel).
 const npcRef = battle.baseNpcRef || null;
 const npcSprite = battle.baseNpcSprite || null;
 battle.isBaseNpcBattle = false;
 battle.baseNpcName = null;
 battle.baseNpcMsgs = null;
 battle.baseNpcRef = null;
 battle.baseNpcSprite = null;
 if(loseQuote && typeof addBattleLog === 'function') addBattleLog('« ' + loseQuote + ' » — ' + npcName);
 if(typeof __pwV43Link('baseDialogNpcResult') === 'function'){
  setTimeout(()=>{ try{ baseDialogNpcResult({npc:npcRef, won:true, name:npcName, sprite:npcSprite, quote:loseQuote}); }catch(_){} }, 1400);
 }
 notify(tr('base.edit.battle_won', {name:npcName}), 'var(--green)');
 updateHeader();
 saveGame();
 await wait(1200);
 endBattle();
 renderMap();
 return;
}
 if(battle.isQuestTrainerBattle){
 const battleId = battle.questTrainerBattleId;
 if(typeof completeQuestTrainerBattle === 'function') completeQuestTrainerBattle(battleId);
 battle.isQuestTrainerBattle = false;
 battle.questTrainerBattleId = null;
 battle.questTrainerQuestId = null;
 battle.questTrainerCat = null;
 updateHeader();
 renderStoryWindow();
 saveGame();
 await wait(1200);
 endBattle();
 renderMap();
 showTab('info');
 return;
}
 if(battle.isAtollBattle){
 const reward = battle.atollReward || 0;
 if(typeof completeAtollBattle === 'function') completeAtollBattle(reward, battle.atollMode || battle.atollRank);
 battle.isAtollBattle = false;
 battle.atollReward = 0;
 battle.atollRank = null;
 battle.atollMode = null;
 updateHeader();
 saveGame();
 await wait(1200);
 endBattle();
 openFullscreenPanel('atoll');
 return;
}
 if(battle.champId && String(battle.champId).startsWith('quest_')){
 const qId = Number(battle.champId.split('_')[1]);
 const q = STORY_QUESTS.find(x => x.id === qId);
 if(q){
 addBattleLog(tr('legendary_boss_defeated', {pokemon:getPokeName(q.rewardPoke)}));
 
 if(q.rewardPoke){
 const wasShiny = !!(battle.enemyPoke && (battle.enemyPoke.shiny || battle.enemyPoke.shinyActive));
 const legMon = createPoke(q.rewardPoke, 1, wasShiny || isSpeciesShiny(q.rewardPoke));
 if(legMon){
 legMon.shinyActive = wasShiny || legMon.shinyActive;
 legMon.shiny = legMon.shinyActive;
 if(G.team.length < 6) G.team.push(legMon);
 else { const _legKey = (typeof generateUniqueBoxId==="function") ? generateUniqueBoxId(legMon.id) : ("box_" + legMon.id + "_" + Date.now()); G.collection[_legKey] = legMon; }
 G.pokedex[q.rewardPoke] = {...(G.pokedex[q.rewardPoke]||{}), seen:true, caught:true};
 if(wasShiny) unlockShinyForSpecies(q.rewardPoke);
 unlockTalentForSpecies(q.rewardPoke, legMon.talent);
 notify(tr('boss_captured', {pokemon:legMon.name, shiny:wasShiny?' ':''}), 'var(--green)');
 showQuestCapturePanel(legMon, wasShiny || isSpeciesShiny(q.rewardPoke));
 }
 }
 
 updateHeader();
 renderStoryWindow();
 saveGame();
 await wait(1500);
 endBattle();
 renderMap();
 showTab('info');
 return;
 }
 }

 const champ = ((typeof getChampDef === 'function') ? getChampDef(battle.champId) : null) || { name: getChampName(battle.champId), reward: 5000, badgeName: 'Badge', badgeEmoji: '', team: battle.champTeam || [] };
 const champBadgeName = (typeof getChampBadgeName === 'function' ? getChampBadgeName(battle.champId) : (champ.badgeName || 'Badge')) || champ.badgeName || 'Badge';
 const champBadgeEmoji = champ.badgeEmoji || '';
 const isLeague = ((typeof isLeagueChampionId === 'function' && isLeagueChampionId(battle.champId)) || battle.champId === 'elite4' || battle.isLeague);
 const leagueRegion = battle.leagueRegion || (typeof getLeagueRegionForChampion === 'function' ? getLeagueRegionForChampion(battle.champId) : 'kanto');
 const leagueFirstWin = isLeague ? !(typeof isRegionLeagueWon === 'function' && isRegionLeagueWon(leagueRegion)) : false;
 const isFirstWin = !isLeague && !G.badges.includes(battle.champId);
 G.defeatedChamps[battle.champId] = true;

 if(isLeague){
 if(typeof markRegionLeagueWon === 'function') markRegionLeagueWon(leagueRegion);
 else if(leagueRegion === 'kanto') G.championTitle = true;
 EventBus.emit(EVENTS.LEAGUE_WON, {region:leagueRegion});
 const leagueMoney = leagueFirstWin ? (champ.reward || 15000) : 0;
 if(leagueMoney) G.money += (typeof __pwV43Link('applySecretBaseMoneyBonus') === 'function' ? applySecretBaseMoneyBonus(leagueMoney) : leagueMoney);
 updateHeader();
 addBattleLog(`<span class="pw-light2">${tr('league_master_victory_log_region', {region:getRegionDisplayName(leagueRegion)})}</span>`);
 notify(leagueMoney ? tr('league_master_title_reward_region', {region:getRegionDisplayName(leagueRegion), money:leagueMoney.toLocaleString()}) : t('rematch_no_money'), leagueMoney ? 'var(--light2)' : 'var(--light1)');
 } else {
 if(isFirstWin) G.badges.push(battle.champId);
 EventBus.emit(EVENTS.BADGE_EARNED, { champId: battle.champId });
 if(isFirstWin) G.money += (typeof __pwV43Link('applySecretBaseMoneyBonus') === 'function' ? applySecretBaseMoneyBonus(champ.reward) : champ.reward);
 updateHeader();
 addBattleLog(`<span class="pw-light2"> Vous avez vaincu ${getChampName(battle.champId)} !</span>`);
 if(isFirstWin){
 addBattleLog(`Vous recevez le <b>${champBadgeName}</b> ${champBadgeEmoji} !`);
 notify(` ${champBadgeName} obtenu ! ${champBadgeEmoji}`,'var(--accent)');
 } else {
 addBattleLog(`Victoire de revanche contre ${getChampName(battle.champId)} !`);
 notify(t('rematch_no_money'),'var(--light1)');
 }
 }

  const totalXP = (champ.team || []).reduce((s,p)=>s+(p.xpYield||100)*(p.level||30),0);
  for(const pk of G.team.filter(p=>p.currentHP>0)){
  const xp=Math.floor(totalXP/Math.max(1, G.team.filter(p=>p.currentHP>0).length)/2);
  pk.xp+=xp;
  while(pk.xp>=pk.xpNext&&pk.level<100) levelUp(pk);
  }

  // Phase 30: the "Daycare EXP on Champion victory" block was removed —
  // the champion's K.O.s have ALREADY fed the daycare counters slot by
  // slot via onEnemyFaint → hatcheryRegisterBattleKills (daycare mode
  // included).

 // Gym/league quest running on this champion? The real victory just got
 // validated (badge/defeatedChamps/title): refresh the quests window
 // to show the "Claim" button immediately.
 try{ if(typeof renderStoryWindow === 'function') renderStoryWindow(); }catch(_){ }

 await wait(1500);
 endBattle();
 renderMap();
 showTab('info');

 if(isLeague){
 document.getElementById('victory-msg').textContent=tr('league_victory_message_region', {region:getRegionDisplayName(leagueRegion)});
 document.getElementById('victory-screen').classList.add('open');
 } else {
 notify(` ${champBadgeName} obtenu ! ${champBadgeEmoji}`,'var(--accent)');
 }

 saveGame();
}


// --- Migrated to ES module, globals exposed ---
if (typeof switchBattlePoke !== 'undefined') { if (typeof window !== 'undefined') window.switchBattlePoke = switchBattlePoke; if (typeof globalThis !== 'undefined') globalThis.switchBattlePoke = switchBattlePoke; }
if (typeof doSwitchBattlePoke !== 'undefined') { if (typeof window !== 'undefined') window.doSwitchBattlePoke = doSwitchBattlePoke; if (typeof globalThis !== 'undefined') globalThis.doSwitchBattlePoke = doSwitchBattlePoke; }
if (typeof healTeamHalf !== 'undefined') { if (typeof window !== 'undefined') window.healTeamHalf = healTeamHalf; if (typeof globalThis !== 'undefined') globalThis.healTeamHalf = healTeamHalf; }
if (typeof showQuestCapturePanel !== 'undefined') { if (typeof window !== 'undefined') window.showQuestCapturePanel = showQuestCapturePanel; if (typeof globalThis !== 'undefined') globalThis.showQuestCapturePanel = showQuestCapturePanel; }
if (typeof champVictory !== 'undefined') { if (typeof window !== 'undefined') window.champVictory = champVictory; if (typeof globalThis !== 'undefined') globalThis.champVictory = champVictory; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  switchBattlePoke,
  doSwitchBattlePoke,
  healTeamHalf,
  showQuestCapturePanel,
  champVictory,
};
