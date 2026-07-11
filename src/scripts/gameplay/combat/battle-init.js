// ============================================================
// BATTLE INIT — (split from battle-init.js)
// ============================================================
function startBattle(enemyPoke, isChamp, champId=null, champPokeList=null){
 if(!G.team.length){setMsg(' Vous n\'avez pas de Pokémon !');return;}
 if(isChamp && (!champPokeList || !champPokeList.length)){
 setMsg(' Erreur : équipe adverse vide.');
 return;
 }
 if(!isChamp && !enemyPoke){
 setMsg(' Erreur : Pokémon adverse introuvable.');
 return;
 }
 clearInterval(battle.timerId);
 // Pokémon Centers removed: the whole team is FULLY healed at the start of every battle.
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
 // Nouvelle session de combat sauvage : on repart avec un butin vierge.
 battle.sessionCatches=[];
 battle.sessionItems={};
 }

 if(isChamp&&champPokeList&&champPokeList.length){
 battle.champTeam=champPokeList.map(p=>({...p,currentHP:p.maxHP,status:null,moves:(p.moves||[]).map(m=>({...m}))}));
 battle.enemyPoke={...battle.champTeam[0]};
 } else {
 battle.enemyPoke=enemyPoke;
 }
 if(!battle.enemyPoke){
 battle.active=false;
 setMsg(' Erreur : Pokémon adverse introuvable.');
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
 if(battle.enemyPoke?.shiny) addBattleLog(`<span class="shiny-tag"></span> Un ${eName} sauvage apparaît... il brille étrangement !`);
 else addBattleLog(`Un ${eName} apparaît !`);
 if(isChamp){
 const cName = getChampName(champId || battle.champId);
 addBattleLog(`${cName} envoie ${eName} !`);
 }

 const leaveBtn=document.getElementById('leave-btn');
 leaveBtn.disabled=false;
 leaveBtn.textContent=isChamp?'🏳 Abandonner':'🚪 Quitter';

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
 setMsg(` Il vous faut ${champ.badgeReq} badge(s) pour défier ${getChampName(champId || battle.champId)}.`);
 return;
 }
 if(!G.team.length){setMsg(' Vous n\'avez pas de Pokémon !');return;}

 if(champId === 'elite4'){
 battle.isLeague = true;
 battle.leagueStage = 0;
 const firstTrainer = LEAGUE_TRAINERS[0];
 const team = firstTrainer.team.map(([id, lv]) => createPoke(id, lv, false));
 addBattleLog(` LIGUE KANTO - Combat 1/5 : ${firstTrainer.name} vous défie !`);
 startBattle(null, true, 'elite4', team);
 addBattleLog(`${firstTrainer.name} : « Préparez-vous à affronter la puissance du Conseil 4 ! »`);
 return;
 }

 battle.isLeague = false;
 const team = getChampTeam(champId);
 if(!team || !team.length){
 setMsg(` Erreur d'équipe pour le champion ${getChampName(champId)}.`);
 return;
 }
 addBattleLog(`🎮 Combat contre ${getChampName(champId || battle.champId)} !`);
 startBattle(null, true, champId, team);
 addBattleLog(`${getChampName(champId || battle.champId)} : « Je suis le champion de cette arène ! »`);
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

// ===== extracted from src/scripts/gameplay/world.js =====

