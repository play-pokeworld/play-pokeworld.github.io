// ============================================================
// BATTLE STATUS — (split from battle.js)
// Durées basées sur Pokéchill: burn=3, poison=3, paralysis=2, sleep=1-3, freeze=3
// badpoison (Toxik) = persistant (dégâts croissants)
// ============================================================

// Décrément les buffs de statut à la fin du tour pour un Pokémon
function tickStatusDurations(p){
 if(!p) return;
 if(p.statusTurns && p.statusTurns > 0){
 p.statusTurns--;
 if(p.statusTurns <= 0){
 const oldStatus = p.status;
 // badpoison ne s'efface jamais par le temps (persistant comme dans les jeux)
 if(p.status !== 'badpoison'){
 p.status = null;
 p.statusTurns = 0;
 if(oldStatus === 'burn') addBattleLog(`La brûlure de ${p.name} s'est estompée !`);
 else if(oldStatus === 'poison') addBattleLog(`${p.name} n'est plus empoisonné !`);
 else if(oldStatus === 'para') addBattleLog(`${p.name} n'est plus paralysé !`);
 else if(oldStatus === 'freeze') addBattleLog(`${p.name} a dégelé !`);
 else if(oldStatus === 'sleep') addBattleLog(`${p.name} s'est réveillé !`);
 }
 }
 }
}

function applyEndOfTurnStatus(p){
 if(!p||p.currentHP<=0) return;
 
 // Talent: Speed Boost
 if(p.talent === 'speedboost'){
 const isPlayerSide = (p === getActivePlayerPoke() || p === G.team[battle.playerPokeIdx]);
 const mods = isPlayerSide ? battle.playerMods : battle.enemyMods;
 if(mods) mods.spe = Math.min(3.0, (mods.spe || 1) * 1.15);
 }
 
 // Burn DOT: 1/16 max HP
 if(p.status==='burn'){
 const bd=Math.max(1,Math.floor(p.maxHP/16));
 p.currentHP=Math.max(0,p.currentHP-bd);
 addBattleLog(`${p.name} souffre de la brûlure (-${bd} PV)`);
 tickStatusDurations(p);
 }
 // Poison DOT: 1/8 max HP
 else if(p.status==='poison'){
 const pd=Math.max(1,Math.floor(p.maxHP/8));
 p.currentHP=Math.max(0,p.currentHP-pd);
 addBattleLog(`${p.name} souffre du poison (-${pd} PV)`);
 tickStatusDurations(p);
 }
 // Bad poison (Toxic): increasing DOT, starts at 1/16, increments each turn
 else if(p.status==='badpoison'){
 p.statusTurns=(p.statusTurns||0)+1;
 const bd=Math.max(1,Math.floor(p.maxHP*p.statusTurns/16));
 p.currentHP=Math.max(0,p.currentHP-bd);
 addBattleLog(`${p.name} souffre du poison virulent (-${bd} PV)`);
 // badpoison ne tick pas de durée (persistant)
 }
 // Sleep: already handled in handleStatusBeforeMove (skip turn)
 else if(p.status==='sleep'){
 // Le Pokémon dort encore — pas de DOT, juste le tick de durée
 tickStatusDurations(p);
 }
 // Freeze: handled in handleStatusBeforeMove (skip turn + thaw chance)
 else if(p.status==='freeze'){
 tickStatusDurations(p);
 }
 // Paralysis: handled in handleStatusBeforeMove (skip chance)
 else if(p.status==='para'){
 tickStatusDurations(p);
 }
 
 // Leftovers: heal 1/16 max HP at end of turn
 if(p.heldItem === 'leftovers' && p.currentHP > 0 && p.currentHP < p.maxHP){
 const heal = Math.max(1, Math.floor(p.maxHP / 16));
 p.currentHP = Math.min(p.maxHP, p.currentHP + heal);
 addBattleLog(`${p.name} récupère ${heal} PV grâce aux Restes !`);
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
 addBattleLog(`${e.name} est mis KO !`);
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
 if(!battle.trainee.evs) battle.trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const keys = ['hp','atk','def','spa','spd','spe'];
 const avail = keys.filter(k => (battle.trainee.evs[k]||0) < 6);
 if(avail.length > 0){
 const pk = avail[rand(0, avail.length - 1)];
 battle.trainee.evs[pk]++;
 addBattleLog(`<span style="color:var(--green)">🟢 Round vaincu ! EV ${pk.toUpperCase()} augmente à ${battle.trainee.evs[pk]}/6 !</span>`);
 }
 
 // Talent training: try to unlock a talent after final round
 if(battle.trainingMode === 'talent' && typeof TALENTS_FULL !== 'undefined' && battle.champPokeIdx === 2){
 const nid = battle.trainee.id;
 const speciesTalents = getSpeciesTalents(nid);
 if(speciesTalents && speciesTalents.length > 0){
 if(!G.unlockedTalents) G.unlockedTalents = {};
 if(!G.unlockedTalents[nid]) G.unlockedTalents[nid] = [battle.trainee.talent];
 const available = speciesTalents.filter(t => TALENTS_FULL[t]);
 // Can unlock locked talents OR re-roll existing ones
 const roll = rand(0, 99);
 const chosenTalent = available[rand(0, available.length-1)];
 const talentInfo = getTalentByKey(chosenTalent);
 let unlockChance = 40; // Base 40% chance
 if(talentInfo){
 if(talentInfo.rarity === 1) unlockChance = 60;
 else if(talentInfo.rarity === 2) unlockChance = 40;
 else if(talentInfo.rarity === 3) unlockChance = 20;
 
 if(roll < unlockChance){
 const wasNew = !G.unlockedTalents[nid].includes(chosenTalent);
 if(wasNew){
 G.unlockedTalents[nid].push(chosenTalent);
 addBattleLog(`<span style="color:var(--accent)">🎉 Nouveau talent débloqué : ${talentInfo.name} (${getRarityLabel(talentInfo.rarity)}) !</span>`);
 } else {
 addBattleLog(`<span style="color:var(--green)">✨ Talent ${talentInfo.name} (${getRarityLabel(talentInfo.rarity)}) re-confirmé !</span>`);
 }
 // Apply the talent to the trainee
 battle.trainee.talent = chosenTalent;
 } else {
 addBattleLog(`<span style="color:var(--light1)">Pas de nouveau talent cette fois...</span>`);
 }
 }
 }
 }
 
 battle.trainee.currentHP = battle.trainee.maxHP;
 if(battle.trainee.moves) for(const m of battle.trainee.moves) m.pp = m.maxPP;
 addBattleLog(` SALLE D'ENTRAÎNEMENT - Round ${battle.champPokeIdx+1}/3 : ${next.name} !`);
 } else {
 addBattleLog(`${getChampName(battle.champId)} envoie ${next.name} !`);
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
 addBattleLog(`<span style="color:var(--green)"> Victoire contre ${LEAGUE_TRAINERS[battle.leagueStage - 1].name} ! Votre équipe a été entièrement soignée (100% PV) !</span>`);
 notify(` Étape ${battle.leagueStage}/5 réussie ! Équipe soignée ! Combat suivant : ${trainer.name}...`, 'var(--green)');
 updateBattleUI();
 renderBattleTeamRow();
 await wait(2200);

 if(!battle.active) return;
 battle.champTeam = trainer.team.map(([id, lv]) => createPoke(id, lv, false));
 battle.champPokeIdx = 0;
 const nextPoke = battle.champTeam[0];
 battle.enemyPoke = nextPoke;
 battle.eMoveIdx = 0;
 addBattleLog(` LIGUE KANTO - Combat ${battle.leagueStage + 1}/5 : ${trainer.name} envoie ${nextPoke.name} !`);
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

 // Wild Pokémon defeated: XP goes to the whole LIVING team (multi-XP)
 const xp=gainXP(e);
 addBattleLog(`Votre équipe gagne ${xp} XP chacun !`);

 // Compteur global de victoires sauvages (stats) + compteur PAR LIEU
 G.totalWildWins = (G.totalWildWins||0) + 1;
 if(!G.wildWinsByLoc) G.wildWinsByLoc = {};
 G.wildWinsByLoc[G.location] = (G.wildWinsByLoc[G.location]||0) + 1;

 // Auto-capture attempt (Pokéchill-style: happens automatically on KO)
 attemptAutoCatch(e);
 EventBus.emit(EVENTS.WILD_DEFEATED, { loc: G.location });
 try{ if(document.getElementById('map-svg')) renderMap(); }catch(_){}

 // Item find — rare loot chance (4%)
 const drops=ROUTE_DROPS[G.location];
 if(drops&&drops.length&&chance(4)){
 const drop=drops[rand(0,drops.length-1)];
 addToInventory(drop,1);
 if(!battle.sessionItems) battle.sessionItems={};
 battle.sessionItems[drop]=(battle.sessionItems[drop]||0)+1;
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 addBattleLog(lang==='en' ? `${itemIcon(drop,16)} Item found: ${getItemName(drop)}!` : `${itemIcon(drop,16)} Objet trouvé : ${getItemName(drop)} !`);
 }

 const mon=rand(e.level*5, e.level*10);
 G.money+=mon;
 updateHeader();
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 addBattleLog(lang==='en' ? `You won ${mon}₽!` : `Vous gagnez ${mon}₽ !`);

 await wait(700);

 // Pokéchill mode: a new wild Pokémon appears right away.
 if(battle.chill && battle.active && aliveCount()>0){
 spawnNextWild();
 } else if(battle.active){
 endBattle();
 }
}
