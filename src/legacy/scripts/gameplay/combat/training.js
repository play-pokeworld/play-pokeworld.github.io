
function getOfficialMovePoolForTraining(p){
 const pools = globalThis.OFFICIAL_POKE_MOVE_POOLS || globalThis.POKE_MOVE_POOLS || {};
 const pool = pools[p.id] || pools[String(p.id)] || [];
 return pool.filter(id => (globalThis.MOVES||MOVES)[id]);
}
function getTrainingLockedMoves(p){
 const pool = getOfficialMovePoolForTraining(p);
 if(pool.length <= 4) return [];
 const count = Math.min(10, Math.max(0, pool.length - 4));
 return pool.slice(-count);
}
function isMoveTrainingLocked(p, moveId){
 if(!p || !moveId) return false;
 const locked = getTrainingLockedMoves(p);
 if(!locked.includes(moveId)) return false;
 return !(p.trainingUnlockedMoves||[]).includes(moveId);
}
function getTrainableLockedMoves(p){
 const known = new Set((p.moves||[]).map(m=>typeof m==='string'?m:m.id).filter(Boolean));
 return getTrainingLockedMoves(p).filter(id => !known.has(id) && !(p.trainingUnlockedMoves||[]).includes(id));
}
function getUnlockedTalentListForSpecies(id){
 return (G.unlockedTalents && G.unlockedTalents[id]) ? G.unlockedTalents[id] : [];
}
function getTrainableTalents(p){
 const all = (typeof getSpeciesTalents === 'function' ? getSpeciesTalents(p.id) : []).filter(tal => TALENTS_FULL && TALENTS_FULL[tal]);
 const known = new Set(getUnlockedTalentListForSpecies(p.id));
 return all.filter(tal => !known.has(tal));
}
function rollTrainingTalent(p){
 const all = (typeof getSpeciesTalents === 'function' ? getSpeciesTalents(p.id) : []).filter(tal => TALENTS_FULL && TALENTS_FULL[tal]);
 if(!all.length) return null;
 const weighted=[];
 all.forEach(tal=>{
   const rarity = TALENTS_FULL[tal].rarity || 1;
   const weight = rarity === 1 ? 60 : rarity === 2 ? 30 : 12;
   for(let i=0;i<weight;i++) weighted.push(tal);
 });
 return weighted[rand(0, weighted.length-1)] || all[0];
}
function unlockTrainingMove(p){
 const choices = getTrainableLockedMoves(p);
 if(!choices.length) return null;
 const moveId = choices[rand(0, choices.length-1)];
 if(!p.trainingUnlockedMoves) p.trainingUnlockedMoves=[];
 if(!p.trainingUnlockedMoves.includes(moveId)) p.trainingUnlockedMoves.push(moveId);
 if((p.moves||[]).length < 4){
   const mv = MOVES[moveId];
   p.moves.push({id:moveId, pp:mv?.pp||10, maxPP:mv?.pp||10});
 }
 return moveId;
}
function trainingButtonHtml(mode, title, desc, enabled){
 return `<div class="pokechill-row training-mode-row ${enabled?'':'is-disabled'}" ${enabled?`data-action="legacy-call" data-call="startTrainingBattle" data-call-args="'${mode}'"`:''}>
 <div class="training-mode-title">${title}</div>
 <div class="extracted-template-style-007">${desc}</div>
 </div>`;
}
function openTrainingUpgradeMenu(){
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 inner.innerHTML = `<div class="modal-title"><div>${t('training_upgrade_title')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="dict-info-block"><b>${t('training_upgrade_title')}</b><br>${t('training_upgrade_coming')}</div>
 <div class="dict-info-block">${t('training_upgrade_note')}</div>`;
 modal.classList.add('open');
}
function pickTrainingBots(trainee, mode, level){
 const byType = {
   Fire:[58,77,126,136,240,146], Water:[60,72,116,120,129,131], Grass:[43,69,102,114,187,191], Electric:[25,100,81,125,172,179],
   Psychic:[63,96,122,196,202,150], Ghost:[92,93,200,94,198,150], Poison:[23,41,88,109,167,169], Flying:[16,21,84,123,227,149],
   Ice:[86,124,220,225,144,131], Rock:[74,95,138,140,185,248], Ground:[50,104,111,207,231,232], Dragon:[147,148,230,149,246,249],
   Bug:[10,13,46,123,166,214], Fighting:[56,66,106,107,236,237], Normal:[19,52,108,128,143,242], Dark:[197,198,215,228,229,248],
   Steel:[81,95,208,212,227,205], Fairy:[35,39,173,175,183,36]
 };
 const ids = (byType[trainee.type1] || byType.Normal).slice();
 while(ids.length < 6) ids.push([132,137,113,122,185,143][ids.length%6]);
 return ids.slice(0,6).map((id,i)=>{
   const p=createPoke(id, Math.max(3, level + (i%3)-1), false);
   if(p) p.name = `Coach ${getPokeName(id)}`;
   return p;
 }).filter(Boolean);
}

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
 const unlocked = G.badges.includes('surge') || G.badges.length >= 3;
 if(!unlocked){
 el.innerHTML = `<div class="extracted-template-style-141"><div class="extracted-template-style-142"></div><b>${t("m.training.13")}</b><br>${t("m.training.12")}</div>`;
 return;
 }
 const trainee = getTraineePoke();
 if(!trainee){ el.innerHTML = `<div class="extracted-template-style-183">${t('no_active_pokemon')}</div>`; return; }
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const totalEvs = Object.values(trainee.evs).reduce((a,b)=>a+b,0);
 const canMove = getTrainableLockedMoves(trainee).length > 0;
 const canTalent = getTrainableTalents(trainee).length > 0;
 const canEv = totalEvs < 36;
 const canLevel = (trainee.level||1) < 100;
 el.innerHTML = `<div class="training-header-card">
 <div class="extracted-template-style-087"><div class="extracted-template-style-185">${spriteImg(trainee.id, trainee.emoji, {size:60, shiny:trainee.shinyActive})}</div>
 <div><b class="extracted-template-style-186">${trainee.name}</b> <span class="extracted-template-style-187">Nv.${trainee.level}</span><br>
 <span class="extracted-template-style-188">${t('training_summary_evs')} : ${totalEvs}/36 🟢 · ${t('training_summary_talents')} ${getUnlockedTalentListForSpecies(trainee.id).length}/${getSpeciesTalents(trainee.id).length} · ${t('training_summary_moves')} ${getTrainableLockedMoves(trainee).length}</span></div></div>
 <div class="training-header-actions"><button class="hbtn" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'training'">${t("m.training.11")}</button><button class="hbtn" data-action="legacy-call" data-call="openTrainingUpgradeMenu" data-call-args="">${t('training_upgrade_button')}</button></div>
 </div>
 <div class="training-mode-grid">
 ${trainingButtonHtml('move',t('training_move_title'), canMove?t('training_move_desc'):t('training_move_done'), canMove)}
 ${trainingButtonHtml('talent',t('training_talent_title'), canTalent?t('training_talent_desc'):t('training_talent_done'), canTalent)}
 ${trainingButtonHtml('ev',t('training_ev_title'), canEv?t('training_ev_desc'):t('training_ev_done'), canEv)}
 ${trainingButtonHtml('level',t('training_level_title'), canLevel?t('training_level_desc'):t('training_level_done'), canLevel)}
 </div>`;
}
function startTrainingBattle(mode='ev'){
 if(typeof battle !== 'undefined' && battle && battle.active){ notify(t("n2.combat_en_cours_terminez_ou_quittez_dabo"),"var(--red)"); return; }
 const trainee = getTraineePoke();
 if(!trainee){ setMsg(t("legacy_message_n_aucun_pok_mon_entra_ner")); return; }
 if(mode === 'level' && trainee.level >= 100){ notify(t("legacy_message_n_ce_pok_mon_est_d_j_au_niveau_100_maximu"),"var(--red)"); return; }
 if(mode === 'ev'){
   if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
   const totEv = Object.values(trainee.evs).reduce((a,b)=>a+b,0);
   if(totEv >= 36){ notify(t("legacy_message_n_ce_pok_mon_poss_de_d_j_6_toiles_ev_sur"),"var(--red)"); return; }
 }
 if(mode === 'move' && !getTrainableLockedMoves(trainee).length){ notify(t('training_move_notify_done'), 'var(--red)'); return; }
 if(mode === 'talent' && !getTrainableTalents(trainee).length){ notify(t('all_talents_unlocked'), 'var(--red)'); return; }
 battle.isTraining = true;
 battle.trainingStage = 0;
 battle.trainee = trainee;
 battle.trainingMode = mode;
 const offset = mode === 'move' ? -2 : mode === 'talent' ? -1 : mode === 'level' ? 2 : 0;
 const bLv = Math.max(3, (trainee.level || 15) + offset);
 const bots = pickTrainingBots(trainee, mode, bLv);
 addBattleLog(tr('training_room_battle_start', {mode:mode.toUpperCase(), pokemon:bots[0]?.name||'Coach', level:bLv}));
 startBattle(null, true, 'training', bots);
}


// --- Migrated to ES module, globals exposed ---
if (typeof isMoveTrainingLocked !== 'undefined' && typeof window !== 'undefined') window.isMoveTrainingLocked = isMoveTrainingLocked;
if (typeof getTrainingLockedMoves !== 'undefined' && typeof window !== 'undefined') window.getTrainingLockedMoves = getTrainingLockedMoves;
if (typeof getTrainableLockedMoves !== 'undefined' && typeof window !== 'undefined') window.getTrainableLockedMoves = getTrainableLockedMoves;
if (typeof openTrainingUpgradeMenu !== 'undefined' && typeof window !== 'undefined') window.openTrainingUpgradeMenu = openTrainingUpgradeMenu;
if (typeof pickTrainingBots !== 'undefined' && typeof window !== 'undefined') window.pickTrainingBots = pickTrainingBots;
if (typeof getTraineePoke !== 'undefined' && typeof window !== 'undefined') window.getTraineePoke = getTraineePoke;
if (typeof renderTrainingWindow !== 'undefined' && typeof window !== 'undefined') window.renderTrainingWindow = renderTrainingWindow;
if (typeof startTrainingBattle !== 'undefined' && typeof window !== 'undefined') window.startTrainingBattle = startTrainingBattle;

