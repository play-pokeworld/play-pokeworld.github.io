function startWildBattle(){
 if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){ notify(t('training_in_progress_no_battle'), 'var(--red)'); return; }
 const loc=LOCS[G.location];
 const wild=loc.wild;
 if(!wild||!wild.length||!G.team.length) return;
 const entry=wild[rand(0,wild.length-1)];
 const lv=rand(entry[1],entry[2]);
 const wp=createPoke(entry[0],lv,false); // shiny: roll at capture/hatch only
 startBattle(wp,false);
}


function startLegendaryEncounter(pokeId, level=65, opts){
 if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){ notify(t('training_in_progress_no_battle'), 'var(--red)'); return false; }
 if(!G.team.length){ setMsg(t('no_pokemon_in_team')); return false; }
 if(typeof battle !== 'undefined' && battle && battle.active){ notify(t('battle_in_progress'), 'var(--red)'); return false; }
 // opts.shiny (passe 20) force la forme chromatique — ex. Léviator rouge
 // du Lac Colère (canon OAC). Sinon : règle habituelle (espèce droguée/hasard).
 const isShiny = !!(opts && opts.shiny); // pas de roll à l'apparition ; capture gère le shiny sauvage
 const legPoke = createPoke(pokeId, level || 65, isShiny);
 if(!legPoke) return false;
 legPoke.maxHP = Math.floor(legPoke.maxHP * 2.2);
 legPoke.currentHP = legPoke.maxHP;
 startBattle(legPoke, false);
 if(battle && battle.active){
  battle.legendaryCatch = true;
  battle.chill = false;
  battle.noAutoCatch = false;
  addBattleLog(tr('wild_legendary_appeared', {name:legPoke.name}));
  return true;
 }
 return false;
}


function spawnNextWild(){
 const loc=getLocObj(G.location);
 const wild=loc ? loc.wild : null;
 if(!wild||!wild.length||aliveCount()===0){ endBattle(); return; }
 // Modifié : les vagabonds apparaissent aussi en chaîne automatique (retour utilisateur : 10k combats sans aucun roaming)
 // La capture auto est maintenant garantie pour les vagabonds (catch.js), donc pas de farm abusif en AFK — 3% reste rare.
 const roamingId = (typeof getRoamingLegendaryForRoute === 'function') ? getRoamingLegendaryForRoute(G.location) : null;
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
 if(!battle.isChamp && !battle.isTraining) battle.sessionPlayerKOs = (battle.sessionPlayerKOs||0) + 1;
 addBattleLog(tr('player_pokemon_ko', {name:p.name}));
 updateBattleUI();
 await wait(500);

 if(battle.isTraining){
 addBattleLog(`<span class="pw-red">${t('training_failed_ko_log')}</span>`);
 notify(t('training_failed_ko_notify'),'var(--red)');
 if(battle.trainee) battle.trainee.currentHP = battle.trainee.maxHP;
 await wait(1200);
 endBattle();
 return;
 }

 const nextAlive=G.team.findIndex((pk,i)=>i!==battle.playerPokeIdx&&pk.currentHP>0);
 if(nextAlive===-1){
 addBattleLog(`<span class="pw-red">${t('all_pokemon_ko_lost')}</span>`);
 const penalty=Math.floor(G.money*0.1);
 G.money-=penalty;
 updateHeader();
 addBattleLog(tr('money_lost', {money:penalty}));
 if(battle.isBaseNpcBattle){
 // Passe 38 : blackout du visiteur chez un copain -> record proprio (w++).
 const npcName = battle.baseNpcName || '';
 const winQuote = (battle.baseNpcMsgs && battle.baseNpcMsgs.win) || '';
 if(typeof baseEditorCreditBattle === 'function') baseEditorCreditBattle(false);
 // Passe 52 : panneau de fin de combat (réplique de victoire du PNJ).
 const npcRef = battle.baseNpcRef || null;
 const npcSprite = battle.baseNpcSprite || null;
 battle.isBaseNpcBattle = false;
 battle.baseNpcName = null;
 battle.baseNpcMsgs = null;
 battle.baseNpcRef = null;
 battle.baseNpcSprite = null;
 if(winQuote && typeof addBattleLog === 'function') addBattleLog('« ' + winQuote + ' » — ' + npcName);
 notify(tr('base.edit.battle_lost', {name:npcName}), 'var(--red)');
 if(typeof baseDialogNpcResult === 'function'){
  setTimeout(()=>{ try{ baseDialogNpcResult({npc:npcRef, won:false, name:npcName, sprite:npcSprite, quote:winQuote}); }catch(_){} }, 1400);
 }
 }
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


