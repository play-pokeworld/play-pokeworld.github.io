function getTraineePoke(){
 if(G.selectedTraineeUid){
 const inTeamIdx = G.team.findIndex(p => p && p.uid === G.selectedTraineeUid);
 if(inTeamIdx !== -1){
 G.selectedTraineeLoc = 'team';
 G.selectedTraineeId = String(inTeamIdx);
 return G.team[inTeamIdx];
 }
 for(const k in (G.collection||{})){
 const p = G.collection[k];
 if(p && p.uid === G.selectedTraineeUid){
 G.selectedTraineeLoc = 'box';
 G.selectedTraineeId = k;
 return p;
 }
 }
 }
 if(G.selectedTraineeLoc === 'box' && G.selectedTraineeId != null){
 let p = G.collection[G.selectedTraineeId] || G.collection[String(G.selectedTraineeId)];
 if(!p && String(G.selectedTraineeId).startsWith('box_')){
 p = G.collection[String(G.selectedTraineeId).replace('box_','')] || G.collection[Number(String(G.selectedTraineeId).replace('box_',''))];
 }
 if(p){
 if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5);
 G.selectedTraineeUid = p.uid;
 return p;
 }
 }
 if(G.selectedTraineeLoc === 'team' && G.selectedTraineeId != null){
 const idx = Number(G.selectedTraineeId);
 if(G.team[idx]){
 const p = G.team[idx];
 if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5);
 G.selectedTraineeUid = p.uid;
 return p;
 }
 }
 const fallback = G.team[0] || null;
 if(fallback){
 if(!fallback.uid) fallback.uid = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5);
 G.selectedTraineeUid = fallback.uid;
 G.selectedTraineeLoc = 'team';
 G.selectedTraineeId = '0';
 }
 return fallback;
}
function renderTrainingWindow(){
 const el = document.getElementById('training-window-body');
 if(!el) return;
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 const unlocked = G.badges.includes('surge') || G.badges.length >= 3;
 if(!unlocked){
 el.innerHTML = `<div class="extracted-template-style-141">
 <div class="extracted-template-style-142"></div>
 <b>${t("m.training.13")}</b><br>
 ${t("m.training.12")}
 </div>`;
 return;
 }

 const trainee = getTraineePoke();
 if(!trainee){
 el.innerHTML = `<div class="extracted-template-style-183">${t('no_active_pokemon')}</div>`;
 return;
 }
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const totalEvs = Object.values(trainee.evs).reduce((a,b)=>a+b, 0);

 el.innerHTML = `
 <div class="extracted-template-style-184">
 <div class="extracted-template-style-087">
 <div class="extracted-template-style-185">
 ${spriteImg(trainee.id, trainee.emoji, {size:60, shiny:trainee.shinyActive})}
 </div>
 <div>
 <b class="extracted-template-style-186">${trainee.name}</b> <span class="extracted-template-style-187">Nv.${trainee.level}</span><br>
 <span class="extracted-template-style-188">EVs : ${totalEvs}/36 🟢 (${G.selectedTraineeLoc==='team'?t('team_location'):t('box_location')})</span>
 </div>
 </div>
 <button class="hbtn extracted-bridge-style-035" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'training'"> ${t("m.training.11")}</button>
 </div>
 <div class="extracted-template-style-189">
 <div class="pokechill-row extracted-bridge-style-036" data-action="legacy-call" data-call="startTrainingBattle" data-call-args="'move'">
 <div class="extracted-template-style-190">${t("m.training.10")}</div>
 <div class="extracted-template-style-007">${t("m.training.9")} (${t('easy_minus_two')})</div>
 </div>
 <div class="pokechill-row extracted-bridge-style-037" data-action="legacy-call" data-call="startTrainingBattle" data-call-args="'talent'">
 <div class="extracted-template-style-191">${t("m.training.8")}</div>
 <div class="extracted-template-style-007">${t("m.training.7")} (${t('easy_minus_one')})</div>
 </div>
 <div class="pokechill-row extracted-bridge-style-038" data-action="legacy-call" data-call="startTrainingBattle" data-call-args="'ev'">
 <div class="extracted-template-style-192">${t("m.training.6")}</div>
 <div class="extracted-template-style-007">${t("m.training.5")}★ (${t('medium_plus_two')})</div>
 </div>
 <div class="pokechill-row extracted-bridge-style-039" data-action="legacy-call" data-call="startTrainingBattle" data-call-args="'level'">
 <div class="extracted-template-style-193">${t("m.training.4")}</div>
 <div class="extracted-template-style-007">${t("m.training.3")}★ (${t('medium_plus_three')})</div>
 </div>
 </div>
 `;
}
function startTrainingBattle(mode='ev'){
 if(typeof battle !== 'undefined' && battle && battle.active){
 notify(t("n2.combat_en_cours_terminez_ou_quittez_dabo"),"var(--red)");
 return;
 }
 const trainee = getTraineePoke();
 if(!trainee){ setMsg(t("legacy_message_n_aucun_pok_mon_entra_ner")); return; }

 if(mode === 'level' && trainee.level >= 100){
 notify(t("legacy_message_n_ce_pok_mon_est_d_j_au_niveau_100_maximu"),"var(--red)");
 return;
 }
 if(mode === 'ev'){
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const totEv = Object.values(trainee.evs).reduce((a,b)=>a+b, 0);
 if(totEv >= 36){
 notify(t("legacy_message_n_ce_pok_mon_poss_de_d_j_6_toiles_ev_sur"),"var(--red)");
 return;
 }
 }
 if(mode === 'move'){
 const pool = learnableMoves(trainee);
 if(!pool || !pool.length){
 notify(t("legacy_message_n_ce_pok_mon_conna_t_ou_a_d_j_d_bloqu_to"),"var(--red)");
 return;
 }
 }
 if(mode === 'talent'){
 
 if(typeof TALENTS_FULL === 'undefined'){
 notify(t('talent_system_unavailable'), 'var(--red)');
 return;
 }
 const speciesTalents = getSpeciesTalents(trainee.id);
 if(!speciesTalents || speciesTalents.length === 0){
 notify(t('no_talent_species'), 'var(--red)');
 return;
 }
 const available = speciesTalents.filter(t => TALENTS_FULL[t]);
 if(available.length === 0){
 notify(t('no_compatible_talent'), 'var(--red)');
 return;
 }
 
 if(!G.unlockedTalents) G.unlockedTalents = {};
 if(!G.unlockedTalents[trainee.id]) G.unlockedTalents[trainee.id] = [trainee.talent];
 const lockedTalents = available.filter(t => !G.unlockedTalents[trainee.id].includes(t));
 if(lockedTalents.length === 0){
 
 notify(t('all_talents_unlocked'), 'var(--green)');
 }
 }

 battle.isTraining = true;
 battle.trainingStage = 0;
 battle.trainee = trainee;
 battle.trainingMode = mode;

 let offset = 0;
 if(mode === 'move') offset = -2;
 else if(mode === 'talent') offset = -1; 
 else if(mode === 'ev') offset = 0;
 else if(mode === 'level') offset = 1;

 const bLv = Math.max(3, (trainee.level || 15) + offset);
 const b1 = createPoke(132, bLv, false); 
 const b2 = createPoke(137, bLv, false); 
 const b3 = createPoke(113, bLv, false); 
 if(b1){ b1.name = t('holo_ditto'); }
 if(b2){ b2.name = t('holo_porygon'); }
 if(b3){ b3.name = t('punching_bag'); }
 const bots = [b1, b2, b3].filter(Boolean);

 addBattleLog(tr('training_room_battle_start', {mode:mode.toUpperCase(), pokemon:bots[0].name, level:bLv}));
 startBattle(null, true, 'training', bots);
}
