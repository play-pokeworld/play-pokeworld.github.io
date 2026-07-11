// ============================================================
// BATTLE SWITCH — (split from battle.js)
// ============================================================
function switchBattlePoke(idx){
 if(!battle.active) return;
 const p=G.team[idx];
 if(!p||p.currentHP<=0||idx===battle.playerPokeIdx) return;
 if(battle.paused){
 // Transition en cours (KO / spawn) : le changement est mémorisé et
 // appliqué en priorité dès que la transition se termine.
 battle.pendingSwitchIdx=idx;
 setMsg(`⏳ ${p.name} entrera en jeu dès que possible...`);
 return;
 }
 doSwitchBattlePoke(idx);
}

function doSwitchBattlePoke(idx){
 if(battle.isTraining){
 notify("Switch impossible : votre Pokémon s'entraîne en solo au Dojo !","var(--red)");
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
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 const shinyTag = wasShiny ? '<div style="color:var(--light2);font-weight:bold;font-size: 13px;margin-bottom:8px;"> POKÉMON SHINY CAPTURÉ ! </div>' : '';
 cont.innerHTML = `
 <div style="font-size: 13px;color:var(--light2);font-weight:bold;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">
 🎊 ${lang==='en'?'Capture!':'Capture !'}
 </div>
 ${shinyTag}
 <div style="display:flex;justify-content:center;margin:16px 0;">
 <div class="poke-sprite${wasShiny?' is-shiny':''}"style="width:96px;height:96px;border:3px solid ${wasShiny?'var(--light2)':TYPE_COLORS[legMon.type1]||'#888'};background:${TYPE_COLORS[legMon.type1]||'#333'}22;border-radius:12px;display:flex;align-items:center;justify-content:center;">
 ${spriteImg(legMon.id, legMon.emoji, {shiny:wasShiny, size:72})}
 </div>
 </div>
 <div style="font-size: 15px;font-weight:bold;color:#fff;margin-bottom:14px;">
 ${wasShiny?' ':''}${legMon.name}
 </div>
 <div style="margin-bottom:20px;">
 ${typeSpan(legMon.type1)}${legMon.type2?typeSpan(legMon.type2):''}
 </div>
 <button class="hbtn"style="width:100%;padding:10px;background:var(--green);color:#fff;font-weight:bold;font-size: 13px;"onclick="document.getElementById('quest-capture-screen').style.display='none'">
 ${lang==='en'?'Continue':'Continuer'}
 </button>
 `;
 el.style.display = 'flex';
}

async function champVictory(){
 if(battle.champId === 'training' || battle.isTraining){
 const trainee = battle.trainee || G.team[0];
 const mode = battle.trainingMode || 'ev';
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
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
 rewardMsg = ` (Talent Caché débloqué !)`;
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
 notify(lang==='en' ? ` Training Complete!${rewardMsg}` : ` Entraînement réussi !${rewardMsg}`, 'var(--green)');
 updateHeader(); renderTeamWindow(); renderTrainingWindow();
 await wait(1200); endBattle(); renderMap(); showTab('info');
 return;
 }
 if(battle.champId && String(battle.champId).startsWith('quest_')){
 const qId = Number(battle.champId.split('_')[1]);
 const q = STORY_QUESTS.find(x => x.id === qId);
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 if(q){
 addBattleLog(lang === 'en' ? ` You defeated Legendary Boss ${getPokeName(q.rewardPoke)}!` : ` Vous avez vaincu le Boss Légendaire ${getPokeName(q.rewardPoke)} !`);
 // (récompense argent/objets déjà appliquée dans claimQuest)
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
 notify(lang === 'en' ? ` Boss defeated! Captured ${legMon.name}${wasShiny?' ':''}!` : ` Boss vaincu ! ${legMon.name}${wasShiny?' ':''} capturé !`, 'var(--green)');
 showQuestCapturePanel(legMon, wasShiny || isSpeciesShiny(q.rewardPoke));
 }
 }
 // (complétion gérée par completedQuests dans claimQuest)
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
 addBattleLog(`<span style="color:var(--light2)"> Vous avez vaincu le Maître Kanto et triomphé des 5 combats de la Ligue !</span>`);
 notify(` Félicitations ! Vous obtenez le Titre de Maître Pokémon ! (+${(champ.reward||15000).toLocaleString()}₽)`, 'var(--light2)');
 } else {
 if(isFirstWin) G.badges.push(battle.champId);
 EventBus.emit(EVENTS.BADGE_EARNED, { champId: battle.champId });
 G.money += champ.reward;
 updateHeader();
 addBattleLog(`<span style="color:var(--light2)"> Vous avez vaincu ${getChampName(battle.champId)} !</span>`);
 if(isFirstWin){
 addBattleLog(`Vous recevez le <b>${champ.badgeName}</b> ${champ.badgeEmoji} !`);
 notify(` ${champ.badgeName} obtenu ! ${champ.badgeEmoji}`,'var(--accent)');
 } else {
 addBattleLog(`Victoire de revanche contre ${getChampName(battle.champId)} !`);
 notify(` Revanche remportée contre ${getChampName(battle.champId)} ! (+${champ.reward.toLocaleString()}₽)`,'var(--green)');
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
 document.getElementById('victory-msg').textContent=` Félicitations ! Vous avez triomphé des 5 combats de la Ligue Kanto et obtenez le Titre de Maître Pokémon !`;
 document.getElementById('victory-screen').classList.add('open');
 } else {
 notify(` ${champ.badgeName} obtenu ! ${champ.badgeEmoji}`,'var(--accent)');
 }

 saveGame();
}

