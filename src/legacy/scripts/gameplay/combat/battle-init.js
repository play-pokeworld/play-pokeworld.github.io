function startBattle(enemyPoke, isChamp, champId=null, champPokeList=null){
 if(!G.team.length){setMsg(t('no_pokemon_in_team'));return;}
 if(isChamp && (!champPokeList || !champPokeList.length)){
 setMsg(t('empty_enemy_team_error'));
 return;
 }
 if(!isChamp && !enemyPoke){
 setMsg(t('enemy_not_found_error'));
 return;
 }
 clearInterval(battle.timerId);
 
 for(const mp of G.team){
 mp.currentHP=mp.maxHP;
 mp.status=null;
 mp.statusTurns=0;
 if(mp.moves) for(const m of mp.moves) m.pp=m.maxPP;
 }
 battle.active=true;
 battle.isChamp=isChamp;
 battle.champId=champId;
 battle.lastIsChamp=isChamp;
 battle.lastChampId=champId;
 battle.champPokeIdx=0;
 battle.escaped=false;
 battle.paused=false;
 battle.chill=!isChamp;
 battle.speed=battle.speed||1;
 battle.playerMods={atk:1,def:1,spe:1};
 battle.enemyMods={atk:1,def:1,spe:1};
 battle.pMoveIdx=0;
 battle.eMoveIdx=0;
 battle.pendingLeave=false;
 battle.pendingSwitchIdx=null;
 if(!isChamp){
 
 battle.sessionCatches=[];
 battle.sessionItems={};
 try{ if (typeof renderBattleLoot === 'function') renderBattleLoot(); }catch(_){}
 }

 if(isChamp&&champPokeList&&champPokeList.length){
 battle.champTeam=champPokeList.map(p=>({...p,currentHP:p.maxHP,status:null,moves:(p.moves||[]).map(m=>({...m}))}));
 battle.enemyPoke={...battle.champTeam[0]};
 } else {
 battle.enemyPoke=enemyPoke;
 }
 if(!battle.enemyPoke){
 battle.active=false;
 setMsg(t('enemy_not_found_error'));
 return;
 }
 battle.playerPokeIdx=firstAlive();

 const idleScreen = document.getElementById('battle-idle-screen');
 const activeScene = document.getElementById('battle-active-scene');
 if(idleScreen) idleScreen.style.display = 'none';
 if(activeScene) activeScene.style.display = 'flex';
 clearBattleLog();
 G.pokedex[battle.enemyPoke.id]={...(G.pokedex[battle.enemyPoke.id]||{}),seen:true};

 resetPlayerCd();
 resetEnemyCd();
 triggerEntryTalents('both');

 updateBattleUI();
 const eName = battle.enemyPoke?.name || 'Adversaire';
 if(battle.enemyPoke?.shiny) addBattleLog(`<span class="shiny-tag"></span>${tr('wild_shiny_appears', {name:eName})}`);
 else addBattleLog(tr('pokemon_appears', {name:eName}));
 if(isChamp){
 const cName = getChampName(champId || battle.champId);
 addBattleLog(tr('trainer_sends', {trainer:cName, pokemon:eName}));
 }

 const leaveBtn=document.getElementById('leave-btn');
 leaveBtn.disabled=false;
 leaveBtn.textContent=isChamp?t('give_up'):t('leave_battle_button');

 renderMoveButtons();
 renderEnemyMoveBars();
 renderBattleTeamRow();
 battle.timerId=setInterval(battleTick,100);
}


function getChampTeam(champId){
 const champ = CHAMPIONS[champId];
 if(!champ || !champ.team || !champ.team.length) return [];
 return champ.team.filter(p => p && p.id).map(p => createPoke(p.id, p.level || 20, p.shiny || false));
}


function startChampBattle(champId){
 const champ=CHAMPIONS[champId];
 if(!champ){return;}
 if((champ.badgeReq||0)>G.badges.length){
 setMsg(tr('need_badges_challenge', {need:champ.badgeReq, champion:getChampName(champId || battle.champId)}));
 return;
 }
 if(!G.team.length){setMsg(t('no_pokemon_in_team'));return;}

 if(champId === 'elite4'){
 battle.isLeague = true;
 battle.leagueStage = 0;
 const firstTrainer = LEAGUE_TRAINERS[0];
 const team = firstTrainer.team.map(([id, lv]) => createPoke(id, lv, false));
 addBattleLog(tr('league_battle_challenge', {trainer:firstTrainer.name}));
 startBattle(null, true, 'elite4', team);
 addBattleLog(tr('league_intro_quote', {trainer:firstTrainer.name}));
 return;
 }

 battle.isLeague = false;
 const team = getChampTeam(champId);
 if(!team || !team.length){
 setMsg(tr('champion_team_error', {champion:getChampName(champId)}));
 return;
 }
 addBattleLog(tr('champion_battle_start', {champion:getChampName(champId || battle.champId)}));
 startBattle(null, true, champId, team);
 addBattleLog(tr('champion_intro_quote', {champion:getChampName(champId || battle.champId)}));
}


function calcAttackCd(spe){
 const base=1900;
 const cd=base*(100/(100+Math.min(spe,180)));
 return Math.round(clamp(cd,500,2600));
}


function effectiveSpeed(poke, mods){
 if(!poke) return 50;
 let s=poke.spe*(mods?.spe||1);
 try{
 const b = getHeldBuff(poke);
 if(b && b.spe) s *= (1 + b.spe);
 }catch(_){}
 if(poke.status==='para') s*=0.5;
 return Math.max(5,s);
}


function resetPlayerCd(){
 const p=getActivePlayerPoke();
 battle.pCd=calcAttackCd(effectiveSpeed(p,battle.playerMods));
 battle.pCdMax=battle.pCd;
}


function resetEnemyCd(){
 const e=battle.enemyPoke;
 battle.eCd=calcAttackCd(effectiveSpeed(e,battle.enemyMods));
 battle.eCdMax=battle.eCd;
}
