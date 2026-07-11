
// ===== extracted from src/scripts/gameplay/battle.js =====
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
 el.innerHTML = `<div style="text-align:center;padding:14px;color:var(--light1);font-size:13px;">
 <div style="font-size: 15px;margin-bottom:4px;"></div>
 <b>${t("m.training.13")}</b><br>
 ${t("m.training.12")}
 </div>`;
 return;
 }

 const trainee = getTraineePoke();
 if(!trainee){
 el.innerHTML = `<div style="text-align:center;padding:12px;color:var(--light1);">Aucun Pokémon actif.</div>`;
 return;
 }
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const totalEvs = Object.values(trainee.evs).reduce((a,b)=>a+b, 0);

 el.innerHTML = `
 <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;border:1px solid var(--light2);margin-bottom:8px;">
 <div style="display:flex;align-items:center;gap:8px;">
 <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
 ${spriteImg(trainee.id, trainee.emoji, {size:60, shiny:trainee.shinyActive})}
 </div>
 <div>
 <b style="color:#fff;font-size:13px;">${trainee.name}</b> <span style="font-size:13px;color:#eee;">Nv.${trainee.level}</span><br>
 <span style="font-size: 13px;color:var(--light2);">EVs : ${totalEvs}/36 🟢 (${G.selectedTraineeLoc==='team'?' Équipe':' Boîte'})</span>
 </div>
 </div>
 <button class="hbtn"style="padding:5px 8px;font-size:13px;background:var(--blue);color:#fff;"onclick="openUnifiedSelectorModal('training')"> ${t("m.training.11")}</button>
 </div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
 <div class="pokechill-row"style="background:#18261e;border:1px solid #2e4a3c;border-radius:6px;padding:8px;cursor:pointer;text-align:left;"onclick="startTrainingBattle('move')">
 <div style="font-weight:bold;color:#4ade80;font-size:13px;">${t("m.training.10")}</div>
 <div style="font-size: 13px;color:var(--light1);">${t("m.training.9")} (Facile : -2 Nv.)</div>
 </div>
 <div class="pokechill-row"style="background:#1f1826;border:1px solid #3c2e4a;border-radius:6px;padding:8px;cursor:pointer;text-align:left;"onclick="startTrainingBattle('talent')">
 <div style="font-weight:bold;color:#c084fc;font-size:13px;">${t("m.training.8")}</div>
 <div style="font-size: 13px;color:var(--light1);">${t("m.training.7")} (Facile : -1 Nv.)</div>
 </div>
 <div class="pokechill-row"style="background:#26181e;border:1px solid #4a2e3c;border-radius:6px;padding:8px;cursor:pointer;text-align:left;"onclick="startTrainingBattle('ev')">
 <div style="font-weight:bold;color:#f472b6;font-size:13px;">${t("m.training.6")}</div>
 <div style="font-size: 13px;color:var(--light1);">${t("m.training.5")}★ (Moyen : +2 Nv.)</div>
 </div>
 <div class="pokechill-row"style="background:#261f18;border:1px solid #4a3c2e;border-radius:6px;padding:8px;cursor:pointer;text-align:left;"onclick="startTrainingBattle('level')">
 <div style="font-weight:bold;color:#94886B;font-size:13px;">${t("m.training.4")}</div>
 <div style="font-size: 13px;color:var(--light1);">${t("m.training.3")}★ (Moyen : +3 Nv.)</div>
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
 if(!trainee){ setMsg(t("n.aucun_pokémon_à_entraîner")); return; }

 if(mode === 'level' && trainee.level >= 100){
 notify(t("n.ce_pokémon_est_déjà_au_niveau_100_maximu"),"var(--red)");
 return;
 }
 if(mode === 'ev'){
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const totEv = Object.values(trainee.evs).reduce((a,b)=>a+b, 0);
 if(totEv >= 36){
 notify(t("n.ce_pokémon_possède_déjà_6_étoiles_ev_sur"),"var(--red)");
 return;
 }
 }
 if(mode === 'move'){
 const pool = learnableMoves(trainee);
 if(!pool || !pool.length){
 notify(t("n.ce_pokémon_connaît_ou_a_déjà_débloqué_to"),"var(--red)");
 return;
 }
 }
 if(mode === 'talent'){
 // Talent training mode - unlock a new talent or re-roll existing
 if(typeof TALENTS_FULL === 'undefined'){
 notify("Système de talents non disponible", "var(--red)");
 return;
 }
 const speciesTalents = getSpeciesTalents(trainee.id);
 if(!speciesTalents || speciesTalents.length === 0){
 notify("Aucun talent disponible pour cette espèce", "var(--red)");
 return;
 }
 const available = speciesTalents.filter(t => TALENTS_FULL[t]);
 if(available.length === 0){
 notify("Aucun talent compatible trouvé", "var(--red)");
 return;
 }
 // Check locked talents
 if(!G.unlockedTalents) G.unlockedTalents = {};
 if(!G.unlockedTalents[trainee.id]) G.unlockedTalents[trainee.id] = [trainee.talent];
 const lockedTalents = available.filter(t => !G.unlockedTalents[trainee.id].includes(t));
 if(lockedTalents.length === 0){
 // All talents unlocked, can still re-roll
 notify("Tous les talents sont débloqués ! L'entraînement peut encore re-roller.", "var(--green)");
 }
 }

 battle.isTraining = true;
 battle.trainingStage = 0;
 battle.trainee = trainee;
 battle.trainingMode = mode;

 let offset = 0;
 if(mode === 'move') offset = -2;
 else if(mode === 'talent') offset = -1; // Talent training is slightly easier
 else if(mode === 'ev') offset = 0;
 else if(mode === 'level') offset = 1;

 const bLv = Math.max(3, (trainee.level || 15) + offset);
 const b1 = createPoke(132, bLv, false); // Métamorph Hologramme
 const b2 = createPoke(137, bLv, false); // Porygon Hologramme
 const b3 = createPoke(113, bLv, false); // Leveinard Sac de Frappe
 if(b1){ b1.name ="Holo-Métamorph"; }
 if(b2){ b2.name ="Holo-Porygon"; }
 if(b3){ b3.name ="Sac de Frappe"; }
 const bots = [b1, b2, b3].filter(Boolean);

 addBattleLog(` SALLE D'ENTRAÎNEMENT (${mode.toUpperCase()}) - Round 1/3 : ${bots[0].name} Nv.${bLv} !`);
 startBattle(null, true, 'training', bots);
}



