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
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const keys = ['hp','atk','def','spa','spd','spe'];
 const avail = keys.filter(k => (trainee.evs[k]||0) < 6);
 if(avail.length > 0){
 const pk = avail[rand(0, avail.length - 1)];
 trainee.evs[pk]++;
 }
 if(mode === 'level'){
 levelUp(trainee);
 rewardMsg = ` (+1 Niveau -> Nv.${trainee.level})`;
 } else if(mode === 'hidden_ability'){
 trainee.hiddenTalentUnlocked = true;
 const tals = getSpeciesTalents(trainee.id);
 if(tals && tals[2]) trainee.talent = tals[2];
 rewardMsg = t('hidden_talent_unlocked_reward');
 } else if(mode === 'ability'){
 const tals = getSpeciesTalents(trainee.id);
 if(tals && tals[0] && tals[1]){
 trainee.talent = (trainee.talent === tals[0]) ? tals[1] : tals[0];
 rewardMsg = ` (Nouveau talent : ${getTalentName(trainee.talent)})`;
 }
 } else {
 trainee.xp += (trainee.level || 20) * 60;
 while(trainee.xp >= trainee.xpNext && trainee.level < 100) levelUp(trainee);
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
 const isLeague = (battle.champId === 'elite4' || battle.isLeague);
 const isFirstWin = !isLeague && !G.badges.includes(battle.champId);
 G.defeatedChamps[battle.champId] = true;

 if(isLeague){
 G.championTitle = true;
 EventBus.emit(EVENTS.LEAGUE_WON, {});
 G.money += (champ.reward || 15000);
 updateHeader();
 addBattleLog(`<span class="extracted-template-style-002">${t('league_master_victory_log')}</span>`);
 notify(tr('league_master_title_reward', {money:(champ.reward||15000).toLocaleString()}), 'var(--light2)');
 } else {
 if(isFirstWin) G.badges.push(battle.champId);
 EventBus.emit(EVENTS.BADGE_EARNED, { champId: battle.champId });
 G.money += champ.reward;
 updateHeader();
 addBattleLog(`<span class="extracted-template-style-002"> Vous avez vaincu ${getChampName(battle.champId)} !</span>`);
 if(isFirstWin){
 addBattleLog(`Vous recevez le <b>${champ.badgeName}</b> ${champ.badgeEmoji} !`);
 notify(` ${champ.badgeName} obtenu ! ${champ.badgeEmoji}`,'var(--accent)');
 } else {
 addBattleLog(`Victoire de revanche contre ${getChampName(battle.champId)} !`);
 notify(tr('rematch_won_reward', {champion:getChampName(battle.champId), money:champ.reward.toLocaleString()}),'var(--green)');
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
 document.getElementById('victory-msg').textContent=t('league_victory_message');
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
