// ============================================================
// BATTLE ENCOUNTER — (split from battle-init.js)
// ============================================================
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
  if(!G.team.length){ setMsg('❌ Vous n\'avez pas de Pokémon !'); return; }
  const isShiny = isSpeciesShiny(pokeId) || rollShiny();
  const legPoke = createPoke(pokeId, 65, isShiny);
  if(!legPoke) return;
  legPoke.maxHP = Math.floor(legPoke.maxHP * 2.2);
  legPoke.currentHP = legPoke.maxHP;
  const lang = G.lang || 'fr';
  battle.legendaryCatch = true; // capture GARANTIE à la victoire (combat sauvage)
  addBattleLog(lang === 'en' ? `⚔️ WILD LEGENDARY: ${legPoke.name} (Lv.65) appeared! Defeat it to capture!` : `⚔️ LÉGENDAIRE SAUVAGE : ${legPoke.name} (Nv.65) apparaît ! Vainquez-le pour le capturer !`);
  startBattle(legPoke, false);
  battle.chill = false; // un seul combat légendaire, puis capture + fin (pas de enchaînement sauvage)
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
  battle.eMoveIdx=0;
  battle.escaped=false;
  resetEnemyCd();
  G.pokedex[battle.enemyPoke.id]={...(G.pokedex[battle.enemyPoke.id]||{}),seen:true};
  clearBattleLog();
  triggerEntryTalents('both');
  updateBattleUI();
  if(battle.enemyPoke.shiny) addBattleLog(`<span class="shiny-tag">✨</span> Un ${battle.enemyPoke.name} sauvage apparaît... il brille étrangement !`);
  else addBattleLog(`Un ${battle.enemyPoke.name} sauvage apparaît !`);
  renderMoveButtons();
  renderEnemyMoveBars();
  renderBattleTeamRow();
  resumeBattleActions();
}

// Pierres d'évolution – mapping espèce -> {stone: targetId}

async function onPlayerPokeFaint(){
  battle.paused=true;
  const p=getActivePlayerPoke();
  addBattleLog(`${p.name} est KO !`);
  updateBattleUI();
  await wait(500);

  if(battle.isTraining){
    addBattleLog(`<span style="color:var(--red)">❌ Votre Pokémon à l'entraînement est KO ! Entraînement échoué...</span>`);
    notify("❌ Entraînement échoué ! Votre Pokémon a été mis KO.", "var(--red)");
    if(battle.trainee) battle.trainee.currentHP = battle.trainee.maxHP;
    await wait(1200);
    endBattle();
    return;
  }

  const nextAlive=G.team.findIndex((pk,i)=>i!==battle.playerPokeIdx&&pk.currentHP>0);
  if(nextAlive===-1){
    addBattleLog(`<span style="color:var(--red)">Tous vos Pokémon sont KO ! Vous avez perdu...</span>`);
    const penalty=Math.floor(G.money*0.1);
    G.money-=penalty;
    updateHeader();
    addBattleLog(`Vous perdez ${penalty}₽ !`);
    await wait(1200);
    endBattle();
    setMsg('❌ Vous avez perdu ! Relancez un combat quand vous voulez : votre équipe est soignée à chaque début de combat.');
    return;
  }

  battle.playerPokeIdx=nextAlive;
  battle.playerMods={atk:1,def:1,spe:1};
  battle.pMoveIdx=0;
  addBattleLog(`Allez, ${G.team[nextAlive].name} !`);
  resetPlayerCd();
  updateBattleUI();
  renderMoveButtons();
  renderBattleTeamRow();
  await wait(300);
  resumeBattleActions();
}

