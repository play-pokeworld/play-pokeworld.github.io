function tickStatusDurations(p){
 if(!p) return;
 if(p.statusTurns && p.statusTurns > 0){
 p.statusTurns--;
 if(p.statusTurns <= 0){
 const oldStatus = p.status;
 
 if(p.status !== 'badpoison'){
 p.status = null;
 p.statusTurns = 0;
 if(oldStatus === 'burn') addBattleLog(tr('status_burn_faded', {name:p.name}));
 else if(oldStatus === 'poison') addBattleLog(tr('status_poison_faded', {name:p.name}));
 else if(oldStatus === 'para') addBattleLog(tr('status_para_faded', {name:p.name}));
 else if(oldStatus === 'freeze') addBattleLog(tr('status_freeze_faded', {name:p.name}));
 else if(oldStatus === 'sleep') addBattleLog(tr('status_sleep_faded', {name:p.name}));
 }
 }
 }
}

function applyEndOfTurnStatus(p){
 if(!p||p.currentHP<=0) return;
 
 
 if(p.talent === 'speedboost' || p.talent === 'quickfeet' || p.talent === 'swiftswim' || p.talent === 'chlorophyll'){
 const isPlayerSide = (p === getActivePlayerPoke() || p === G.team[battle.playerPokeIdx]);
 const mods = isPlayerSide ? battle.playerMods : battle.enemyMods;
 if(mods) mods.spe = Math.min(3.0, (mods.spe || 1) * 1.15);
 }
 
 
 if(p.status==='burn'){
 const bd=Math.max(1,Math.floor(p.maxHP/16));
 p.currentHP=Math.max(0,p.currentHP-bd);
 addBattleLog(tr('burn_damage', {name:p.name, damage:bd}));
 tickStatusDurations(p);
 }
 
 else if(p.status==='poison'){
 const pd=Math.max(1,Math.floor(p.maxHP/8));
 p.currentHP=Math.max(0,p.currentHP-pd);
 addBattleLog(tr('poison_damage', {name:p.name, damage:pd}));
 tickStatusDurations(p);
 }
 
 else if(p.status==='badpoison'){
 p.statusTurns=(p.statusTurns||0)+1;
 const bd=Math.max(1,Math.floor(p.maxHP*p.statusTurns/16));
 p.currentHP=Math.max(0,p.currentHP-bd);
 addBattleLog(tr('bad_poison_damage', {name:p.name, damage:bd}));
 
 }
 
 else if(p.status==='sleep'){
 
 tickStatusDurations(p);
 }
 
 else if(p.status==='freeze'){
 tickStatusDurations(p);
 }
 
 else if(p.status==='para'){
 tickStatusDurations(p);
 }
 
 
 if((typeof getHeldItemForPokemon === 'function' ? getHeldItemForPokemon(p) : p.heldItem) === 'leftovers' && p.currentHP > 0 && p.currentHP < p.maxHP){
 const heal = Math.max(1, Math.floor(p.maxHP / 16));
 p.currentHP = Math.min(p.maxHP, p.currentHP + heal);
 addBattleLog(tr('leftovers_heal', {name:p.name, heal:heal}));
 }
}


async function onEnemyFaint(){
 if(!battle || !battle.enemyPoke) return;
 if(G.hatchery && Array.isArray(G.hatchery)){
 let updated = false;
 for(let i=0; i<G.hatchery.length; i++) {
 if(G.hatchery[i]){
 G.hatchery[i].steps = (G.hatchery[i].steps || 0) + 1;
 if(G.automation && G.automation.autoHatch && G.hatchery[i].steps >= (G.hatchery[i].stepsReq || 10)){
 hatchEgg(i);
 }
 updated = true;
 }
 }
 if(updated && typeof renderHatcheryWindow === 'function') renderHatcheryWindow();
 }
 battle.paused=true;
 const e=battle.enemyPoke;
 addBattleLog(tr('pokemon_fainted', {name:e.name}));
 updateBattleUI();
 await wait(500);

 if(battle.isChamp){
 battle.champPokeIdx++;
 if(battle.champTeam && battle.champPokeIdx < battle.champTeam.length){
 const next=battle.champTeam[battle.champPokeIdx];
 battle.enemyPoke=next;
 battle.eMoveIdx=0;
 if(battle.isTraining && battle.trainee){
 battle.trainingStage = battle.champPokeIdx;
 battle.trainee.currentHP = battle.trainee.maxHP;
 if(battle.trainee.moves) for(const m of battle.trainee.moves) m.pp = m.maxPP;
 addBattleLog(tr('training_room_round', {round:battle.champPokeIdx+1, pokemon:next.name}));
} else {
 addBattleLog(tr('champion_sends', {champion:getChampName(battle.champId), pokemon:next.name}));
}
 G.pokedex[next.id]={...(G.pokedex[next.id]||{}),seen:true};
 resetEnemyCd();
 updateBattleUI();
 renderMoveButtons();
 renderEnemyMoveBars();
 renderBattleTeamRow();
 await wait(1000);
 resumeBattleActions();
 return;
 } else {
 if(battle.isLeague && typeof battle.leagueStage === 'number'){
 const leagueTrainers = (typeof getLeagueTrainersForRegion === 'function') ? getLeagueTrainersForRegion(battle.leagueRegion || 'kanto') : LEAGUE_TRAINERS;
 if(battle.leagueStage < leagueTrainers.length - 1){
 battle.leagueStage++;
 const trainer = leagueTrainers[battle.leagueStage];
 for(const p of G.team){
 p.currentHP = p.maxHP;
 p.status = null;
 p.statusTurns = 0;
 if(p.moves) for(const m of p.moves) m.pp = m.maxPP;
 }
 addBattleLog(`<span class="extracted-template-style-156">${tr('league_stage_victory', {trainer:leagueTrainers[battle.leagueStage - 1].name})}</span>`);
 notify(tr('league_stage_success', {stage:battle.leagueStage, trainer:trainer.name}), 'var(--green)');
 updateBattleUI();
 renderBattleTeamRow();
 await wait(2200);

 if(!battle.active) return;
 battle.champTeam = trainer.team.map(([id, lv]) => createPoke(id, lv, false));
 battle.champPokeIdx = 0;
 const nextPoke = battle.champTeam[0];
 battle.enemyPoke = nextPoke;
 battle.eMoveIdx = 0;
 addBattleLog(tr('league_next_battle_region', {region:getRegionDisplayName(battle.leagueRegion || 'kanto'), stage:battle.leagueStage + 1, trainer:trainer.name, pokemon:nextPoke.name}));
 G.pokedex[nextPoke.id] = {...(G.pokedex[nextPoke.id]||{}), seen:true};
 resetPlayerCd();
 resetEnemyCd();
 updateBattleUI();
 renderMoveButtons();
 renderEnemyMoveBars();
 renderBattleTeamRow();
 await wait(400);
 resumeBattleActions();
 return;
 }
 }
 await champVictory();
 return;
 }
 }

 
 const questLoc = battle.questDefeatLoc || G.location;
 const isQuestRewardBattle = battle.questRewardQuestId != null;
 const xp=gainXP(e);
 addBattleLog(tr('team_gains_xp', {xp:xp}));

 
 if(!isQuestRewardBattle){
 G.totalWildWins = (G.totalWildWins||0) + 1;
 if(!G.wildWinsByLoc) G.wildWinsByLoc = {};
 G.wildWinsByLoc[questLoc] = (G.wildWinsByLoc[questLoc]||0) + 1;
 }

 
 if(!battle.noAutoCatch) attemptAutoCatch(e);
 if(isQuestRewardBattle && typeof completeQuestRewardBattle === 'function'){
  const completedQuestId = battle.questRewardQuestId;
  battle.questRewardQuestId = null;
  battle.questRewardCat = null;
  battle.questRewardRegion = null;
  battle.questRewardDefId = null;
  completeQuestRewardBattle(completedQuestId);
 }
 if(!isQuestRewardBattle){
  EventBus.emit(EVENTS.WILD_DEFEATED, { loc: questLoc });
  try{ if(document.getElementById('map-svg')) renderMap(); }catch(_){}
 }

 
 const drops=isQuestRewardBattle ? null : ROUTE_DROPS[questLoc];
 if(drops&&drops.length&&chance(4)){
 const drop=drops[rand(0,drops.length-1)];
 const reward = (typeof grantRewardItem === 'function') ? grantRewardItem(drop,1) : (addToInventory(drop,1), {added:1,money:0});
 if(reward.added){
 if(!battle.sessionItems) battle.sessionItems={};
 battle.sessionItems[drop]=(battle.sessionItems[drop]||0)+reward.added;
 try{ if (typeof renderBattleLoot === 'function') renderBattleLoot(); }catch(_){}
 addBattleLog(tr('item_found_log', {icon:itemIcon(drop,16), item:getItemName(drop)}));
 } else if(reward.money){
 addBattleLog(tr('duplicate_item_money_log', {item:getItemName(drop), money:reward.money.toLocaleString()}));
 }
 }

 updateHeader();

 await wait(700);

 
 if(battle.chill && battle.active && aliveCount()>0){
 spawnNextWild();
 } else if(battle.active){
 endBattle();
 }
}


// --- Migrated to ES module, globals exposed ---
if (typeof tickStatusDurations !== 'undefined' && typeof window !== 'undefined') window.tickStatusDurations = tickStatusDurations;
if (typeof applyEndOfTurnStatus !== 'undefined' && typeof window !== 'undefined') window.applyEndOfTurnStatus = applyEndOfTurnStatus;

