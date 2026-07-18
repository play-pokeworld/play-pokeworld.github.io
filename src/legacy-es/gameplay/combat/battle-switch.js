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
 const shinyTag = wasShiny ? `<div class="extracted-template-style-168">${t('shiny_captured')}</div>` : '';
 cont.innerHTML = `
 <div class="extracted-template-style-169">
 🎊 ${t('capture_title')}
 </div>
 ${shinyTag}
 <div class="extracted-template-style-170">
 <div class="poke-sprite${wasShiny?' is-shiny':''}">
 ${spriteImg(legMon.id, legMon.emoji, {shiny:wasShiny, size:72})}
 </div>
 </div>
 <div class="extracted-template-style-171">
 ${wasShiny?' ':''}${legMon.name}
 </div>
 <div class="extracted-template-style-172">
 ${typeSpan(legMon.type1)}${legMon.type2?typeSpan(legMon.type2):''}
 </div>
 <button class="hbtn extracted-bridge-style-034" data-action="hide-element" data-target-element="quest-capture-screen">
 ${t('continue') || t('close')}
 </button>
 `;
 el.style.display = 'flex';
}

async function champVictory(){
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
       rewardMsg = ` (${wasNew?'Nouveau talent':'Talent confirmé'} : ${getTalentName(chosen)})`;
     } else rewardMsg = ' (aucun talent disponible)';
   } else if(mode === 'move'){
     const unlocked = (typeof unlockTrainingMove === 'function') ? unlockTrainingMove(trainee) : null;
     rewardMsg = unlocked ? ` (Capacité débloquée : ${getMoveName(unlocked)})` : ' (toutes les capacités sont déjà débloquées)';
   }
   recalcPokeStats(trainee);
 }
 battle.isTraining = false;
 notify(tr('training_complete', {reward:rewardMsg}), 'var(--green)');
 updateHeader(); renderTeamWindow(); renderTrainingWindow();
 await wait(1200); endBattle(); renderMap(); showTab('info');
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
 else G.collection[String(legMon.id)] = legMon;
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

 const champ = CHAMPIONS[battle.champId] || { name: getChampName(battle.champId), reward: 5000, badgeName: 'Badge', badgeEmoji: '', team: battle.champTeam || [] };
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
 if(leagueMoney) G.money += leagueMoney;
 updateHeader();
 addBattleLog(`<span class="extracted-template-style-002">${tr('league_master_victory_log_region', {region:getRegionDisplayName(leagueRegion)})}</span>`);
 notify(leagueMoney ? tr('league_master_title_reward_region', {region:getRegionDisplayName(leagueRegion), money:leagueMoney.toLocaleString()}) : t('rematch_no_money'), leagueMoney ? 'var(--light2)' : 'var(--light1)');
 } else {
 if(isFirstWin) G.badges.push(battle.champId);
 EventBus.emit(EVENTS.BADGE_EARNED, { champId: battle.champId });
 if(isFirstWin) G.money += champ.reward;
 updateHeader();
 addBattleLog(`<span class="extracted-template-style-002"> Vous avez vaincu ${getChampName(battle.champId)} !</span>`);
 if(isFirstWin){
 addBattleLog(`Vous recevez le <b>${champ.badgeName}</b> ${champ.badgeEmoji} !`);
 notify(` ${champ.badgeName} obtenu ! ${champ.badgeEmoji}`,'var(--accent)');
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

 await wait(1500);
 endBattle();
 renderMap();
 showTab('info');

 if(isLeague){
 document.getElementById('victory-msg').textContent=tr('league_victory_message_region', {region:getRegionDisplayName(leagueRegion)});
 document.getElementById('victory-screen').classList.add('open');
 } else {
 notify(` ${champ.badgeName} obtenu ! ${champ.badgeEmoji}`,'var(--accent)');
 }

 saveGame();
}


// --- Migrated to ES module, globals exposed ---
if (typeof switchBattlePoke !== 'undefined' && typeof window !== 'undefined') window.switchBattlePoke = switchBattlePoke;
if (typeof doSwitchBattlePoke !== 'undefined' && typeof window !== 'undefined') window.doSwitchBattlePoke = doSwitchBattlePoke;
if (typeof healTeamHalf !== 'undefined' && typeof window !== 'undefined') window.healTeamHalf = healTeamHalf;
if (typeof showQuestCapturePanel !== 'undefined' && typeof window !== 'undefined') window.showQuestCapturePanel = showQuestCapturePanel;

export {};
