function startWildBattle(){
 const loc=LOCS[G.location];
 const wild=loc.wild;
 if(!wild||!wild.length||!G.team.length) return;
 const entry=wild[rand(0,wild.length-1)];
 const lv=rand(entry[1],entry[2]);
 const wp=createPoke(entry[0],lv,rollShiny());
 startBattle(wp,false);
}


function startLegendaryEncounter(pokeId){
 if(!G.team.length){ setMsg(t('no_pokemon_in_team')); return; }
 const isShiny = isSpeciesShiny(pokeId) || rollShiny();
 const legPoke = createPoke(pokeId, 65, isShiny);
 if(!legPoke) return;
 legPoke.maxHP = Math.floor(legPoke.maxHP * 2.2);
 legPoke.currentHP = legPoke.maxHP;
 battle.legendaryCatch = true; 
 addBattleLog(tr('wild_legendary_appeared', {name:legPoke.name}));
 startBattle(legPoke, false);
 battle.chill = false; 
}


function spawnNextWild(){
 const loc=getLocObj(G.location);
 const wild=loc ? loc.wild : null;
 if(!wild||!wild.length||aliveCount()===0){ endBattle(); return; }
 const roamingId = getRoamingLegendaryForRoute(G.location);
 const wp = pickWildEncounter(loc, roamingId);
 if(!wp){ endBattle(); return; }
 battle.enemyPoke=wp;
 battle.enemyMods={atk:1,def:1,spe:1};
 battle.playerMods={atk:1,def:1,spe:1}; 
 battle.eMoveIdx=0;
 battle.escaped=false;
 resetEnemyCd();
 resetPlayerCd();
 G.pokedex[battle.enemyPoke.id]={...(G.pokedex[battle.enemyPoke.id]||{}),seen:true};
 clearBattleLog();
 triggerEntryTalents('both');
 updateBattleUI();
 if(battle.enemyPoke.shiny) addBattleLog(`<span class="shiny-tag"></span>${tr('wild_pokemon_shiny_appears', {name:battle.enemyPoke.name})}`);
 else addBattleLog(tr('wild_pokemon_appears', {name:battle.enemyPoke.name}));
 renderMoveButtons();
 renderEnemyMoveBars();
 renderBattleTeamRow();
 resumeBattleActions();
}


async function onPlayerPokeFaint(){
 battle.paused=true;
 const p=getActivePlayerPoke();
 addBattleLog(tr('player_pokemon_ko', {name:p.name}));
 updateBattleUI();
 await wait(500);

 if(battle.isTraining){
 addBattleLog(`<span class="extracted-template-style-155">${t('training_failed_ko_log')}</span>`);
 notify(t('training_failed_ko_notify'),'var(--red)');
 if(battle.trainee) battle.trainee.currentHP = battle.trainee.maxHP;
 await wait(1200);
 endBattle();
 return;
 }

 const nextAlive=G.team.findIndex((pk,i)=>i!==battle.playerPokeIdx&&pk.currentHP>0);
 if(nextAlive===-1){
 addBattleLog(`<span class="extracted-template-style-155">${t('all_pokemon_ko_lost')}</span>`);
 const penalty=Math.floor(G.money*0.1);
 G.money-=penalty;
 updateHeader();
 addBattleLog(tr('money_lost', {money:penalty}));
 await wait(1200);
 endBattle();
 setMsg(t('battle_lost_recover'));
 return;
 }

 battle.playerPokeIdx=nextAlive;
 battle.playerMods={atk:1,def:1,spe:1};
 battle.pMoveIdx=0;
 addBattleLog(tr('go_pokemon', {name:G.team[nextAlive].name}));
 resetPlayerCd();
 updateBattleUI();
 renderMoveButtons();
 renderBattleTeamRow();
 await wait(300);
 resumeBattleActions();
}


// --- Migrated to ES module, globals exposed ---
if (typeof startWildBattle !== 'undefined' && typeof window !== 'undefined') window.startWildBattle = startWildBattle;
if (typeof startLegendaryEncounter !== 'undefined' && typeof window !== 'undefined') window.startLegendaryEncounter = startLegendaryEncounter;
if (typeof spawnNextWild !== 'undefined' && typeof window !== 'undefined') window.spawnNextWild = spawnNextWild;

export {};
