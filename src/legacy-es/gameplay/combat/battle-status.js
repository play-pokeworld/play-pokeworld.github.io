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
 
 
 if(p.heldItem === 'leftovers' && p.currentHP > 0 && p.currentHP < p.maxHP){
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
 if(battle.isLeague && typeof battle.leagueStage === 'number' && battle.leagueStage < 4){
 battle.leagueStage++;
 const trainer = LEAGUE_TRAINERS[battle.leagueStage];
 for(const p of G.team){
 p.currentHP = p.maxHP;
 p.status = null;
 p.statusTurns = 0;
 if(p.moves) for(const m of p.moves) m.pp = m.maxPP;
 }
 addBattleLog(`<span class="extracted-template-style-156">${tr('league_stage_victory', {trainer:LEAGUE_TRAINERS[battle.leagueStage - 1].name})}</span>`);
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
 addBattleLog(tr('league_next_battle', {stage:battle.leagueStage + 1, trainer:trainer.name, pokemon:nextPoke.name}));
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
 await champVictory();
 return;
 }
 }

 
 const xp=gainXP(e);
 addBattleLog(tr('team_gains_xp', {xp:xp}));

 
 G.totalWildWins = (G.totalWildWins||0) + 1;
 if(!G.wildWinsByLoc) G.wildWinsByLoc = {};
 G.wildWinsByLoc[G.location] = (G.wildWinsByLoc[G.location]||0) + 1;

 
 attemptAutoCatch(e);
 EventBus.emit(EVENTS.WILD_DEFEATED, { loc: G.location });
 try{ if(document.getElementById('map-svg')) renderMap(); }catch(_){}

 
 const drops=ROUTE_DROPS[G.location];
 if(drops&&drops.length&&chance(4)){
 const drop=drops[rand(0,drops.length-1)];
 addToInventory(drop,1);
 if(!battle.sessionItems) battle.sessionItems={};
 battle.sessionItems[drop]=(battle.sessionItems[drop]||0)+1;
 try{ if (typeof renderBattleLoot === 'function') renderBattleLoot(); }catch(_){}
 addBattleLog(tr('item_found_log', {icon:itemIcon(drop,16), item:getItemName(drop)}));
 }

 const mon=rand(e.level*5, e.level*10);
 G.money+=mon;
 updateHeader();
 addBattleLog(tr('money_won_log', {money:mon}));

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

export {};
