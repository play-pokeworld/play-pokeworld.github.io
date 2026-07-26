function appBattleTimer(name, callback, delay){
 if(typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers?.set) return PokeWorldTimers.set(name, callback, delay);
 return setInterval(callback, delay);
}
function stopBattleTimer(name, id){
 if(typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers?.stop) PokeWorldTimers.stop(name);
 else if(id) clearInterval(id);
}

function startBattle(enemyPoke, isChamp, champId=null, champPokeList=null){
 if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){
  notify(t('training_in_progress_no_battle'), 'var(--red)');
  return false;
 }
 if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 if(!G.team.length){setMsg(t('no_pokemon_in_team'));return;}
 if(typeof canUseCurrentTeamForRegion === 'function' && !canUseCurrentTeamForRegion(G.region || 'kanto')){
 battle.isLeague = false; battle.leagueRegion = null;
 setMsg(regionTeamRestrictionMessage(G.region || 'kanto'));
 notify(regionTeamRestrictionMessage(G.region || 'kanto'), 'var(--red)');
 return;
 }
 if(isChamp && (!champPokeList || !champPokeList.length)){
 setMsg(t('empty_enemy_team_error'));
 return;
 }
 if(!isChamp && !enemyPoke){
 setMsg(t('enemy_not_found_error'));
 return;
 }
 stopBattleTimer('battle', battle.timerId);
 
 for(const mp of G.team){
 mp.currentHP=mp.maxHP;
 mp.status=null;
 mp.statusTurns=0;
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
 battle.weather='none';
 battle.weatherTurns=0;
 battle.terrain='none';
 battle.terrainTurns=0;
 battle.speed=battle.speed||1;
 battle.playerMods={atk:1,def:1,spe:1};
 battle.enemyMods={atk:1,def:1,spe:1};
 battle.pMoveIdx=0;
 battle.eMoveIdx=0;
 battle.pendingLeave=false;
 battle.pendingSwitchIdx=null;
 battle.resolvingKO=false;
 battle.trainerVisual=null;
 battle.sessionWins=0;
 battle.sessionPlayerKOs=0;
 battle.sessionStartedAt=Date.now();
 battle.sessionDamageByPokemon={};
 if(!isChamp){
 
 battle.sessionCatches=[];
 battle.sessionItems={};
 try{ if (typeof renderBattleLoot === 'function') renderBattleLoot(); }catch(_){}
 try{ if (typeof renderBattleSummary === 'function') renderBattleSummary(); }catch(_){}
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
 battle.timerId=appBattleTimer('battle', battleTick, 100);
 return true;
}


function getChampTeam(champId){
 // Passe 19 : équipe officielle instanciée (movesets/talents/objets réels)
 // — le legacy reconstruisait des Pokémon aléatoires sans moveset.
 if(typeof OFFICIAL_TEAMS !== 'undefined' && OFFICIAL_TEAMS[champId] && typeof getOfficialTeam === 'function'){
  const team = getOfficialTeam(champId) || [];
  if(team.length) return team;
 }
 const champ = (typeof getChampDef === 'function') ? getChampDef(champId) : null;
 if(!champ || !champ.team || !champ.team.length) return [];
 return champ.team;
}


function startChampBattle(champId){
 if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){
  notify(t('training_in_progress_no_battle'), 'var(--red)');
  return;
 }
 const champ=(typeof getChampDef==='function')?getChampDef(champId):null;
 if(!champ){return;}
 const champRegion = champ.region || ((typeof JOHTO_BADGES !== 'undefined' && JOHTO_BADGES.includes(champId)) || champId === 'johto_elite4' ? 'johto' : 'kanto');
 const haveRegionBadges = (typeof regionBadgeCount === 'function') ? regionBadgeCount(champRegion) : (G.badges||[]).length;
 if((champ.badgeReq||0)>haveRegionBadges){
 setMsg(tr('need_badges_challenge', {need:champ.badgeReq, champion:getChampName(champId || battle.champId)}));
 return;
 }
 if(!G.team.length){setMsg(t('no_pokemon_in_team'));return;}
 if(typeof canUseCurrentTeamForRegion === 'function' && !canUseCurrentTeamForRegion(G.region || 'kanto')){
 battle.isLeague = false; battle.leagueRegion = null;
 setMsg(regionTeamRestrictionMessage(G.region || 'kanto'));
 notify(regionTeamRestrictionMessage(G.region || 'kanto'), 'var(--red)');
 return;
 }

 if(typeof isLeagueChampionId === 'function' ? isLeagueChampionId(champId) : champId === 'elite4'){
 const leagueRegion = (typeof getLeagueRegionForChampion === 'function') ? getLeagueRegionForChampion(champId) : 'kanto';
 const trainers = (typeof getLeagueTrainersForRegion === 'function') ? getLeagueTrainersForRegion(leagueRegion) : [];
 battle.isLeague = true;
 battle.leagueRegion = leagueRegion;
 battle.leagueStage = 0;
 const firstTrainer = trainers[0];
 // Passe 19 : équipe officielle complète (Maître Blue : variante selon le
 // starter du joueur via getPlayerStarterSpecies).
 const leagueStarterId = (typeof getPlayerStarterSpecies === 'function') ? getPlayerStarterSpecies(leagueRegion) : null;
 const team = (typeof getOfficialLeagueTeam === 'function' && getOfficialLeagueTeam(leagueRegion, 0, leagueStarterId).length)
  ? getOfficialLeagueTeam(leagueRegion, 0, leagueStarterId)
  : (firstTrainer ? firstTrainer.team.map(([id, lv]) => createPoke(id, lv, false)) : []);
 addBattleLog(tr('league_battle_challenge_region', {region:getRegionDisplayName(leagueRegion), trainer:firstTrainer.name}));
 startBattle(null, true, champId, team);
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


function getMoveCooldownMultiplier(mv){
  if(!mv) return 1.0;
  const mvId = String(mv.id || '').toLowerCase();
  if(mv.prio > 0 || mvId === 'quickattack' || mvId === 'extremespeed' || mvId === 'machpunch' || mvId === 'iceshard' || mvId === 'aquajet') {
    return 0.5; // Fast move
  }
  if(mv.recharge || mv.charge || mvId === 'hyperbeam' || mvId === 'solarbeam') {
    return 2.0; // Slow move
  }
  return 1.0; // Normal move
}

function getActivePlayerPoke(){
  // Simple fallback — no self-recursion
  var g = (typeof G !== 'undefined') ? G : null;
  var b = (typeof battle !== 'undefined') ? battle : null;
  if(g && g.team && b && b.playerPokeIdx !== undefined && g.team[b.playerPokeIdx]) return g.team[b.playerPokeIdx];
  if(g && g.team && g.team.length) return g.team[0] || null;
  return null;
}
function resetPlayerCd(){
  const p=getActivePlayerPoke();
  let baseCd=calcAttackCd(effectiveSpeed(p,battle.playerMods));
  if(p && Array.isArray(p.moves) && p.moves.length > 0){
    const nextMv = p.moves[battle.pMoveIdx % p.moves.length];
    baseCd *= getMoveCooldownMultiplier(nextMv);
  }
  battle.pCd=Math.round(baseCd);
  battle.pCdMax=battle.pCd;
}


function resetEnemyCd(){
  const e=battle.enemyPoke;
  let baseCd=calcAttackCd(effectiveSpeed(e,battle.enemyMods));
  if(e && Array.isArray(e.moves) && e.moves.length > 0){
    const nextMv = e.moves[battle.eMoveIdx % e.moves.length];
    baseCd *= getMoveCooldownMultiplier(nextMv);
  }
  battle.eCd=Math.round(baseCd);
  battle.eCdMax=battle.eCd;
}


// --- Migrated to ES module, globals exposed ---
if (typeof startBattle !== 'undefined' && typeof window !== 'undefined') window.startBattle = startBattle;
if (typeof getChampTeam !== 'undefined' && typeof window !== 'undefined') window.getChampTeam = getChampTeam;
if (typeof startChampBattle !== 'undefined' && typeof window !== 'undefined') window.startChampBattle = startChampBattle;
if (typeof calcAttackCd !== 'undefined' && typeof window !== 'undefined') window.calcAttackCd = calcAttackCd;
if (typeof effectiveSpeed !== 'undefined' && typeof window !== 'undefined') window.effectiveSpeed = effectiveSpeed;
if (typeof resetPlayerCd !== 'undefined' && typeof window !== 'undefined') window.resetPlayerCd = resetPlayerCd;
if (typeof resetEnemyCd !== 'undefined' && typeof window !== 'undefined') window.resetEnemyCd = resetEnemyCd;

