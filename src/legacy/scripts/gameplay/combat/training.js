
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

const TRAINING_MULTI_SLOT_COST = 750000;
const TRAINING_SLOT_DURATION_MS = 60 * 1000;
var _trainingSlotTicker = null;

function getTrainingSlotCount(){ return 1 + (G.trainingMultiSlot ? 1 : 0); }
function getTrainingModeLabel(mode){ return t('training_mode_'+mode+'_title') || String(mode || '').toUpperCase(); }
function getTrainingModeDescription(mode, canDo){
 const key = 'training_mode_'+mode+(canDo ? '_desc' : '_done');
 return t(key) || '';
}
function makeTrainingUid(p){
 if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5);
 return p.uid;
}
function ensureTrainingSlots(){
 if(!Array.isArray(G.trainingSlots)) G.trainingSlots = [];
 const count = getTrainingSlotCount();
 while(G.trainingSlots.length < count) G.trainingSlots.push({uid:null, loc:null, idStr:null, active:false});
 if(G.trainingSlots.length > count) G.trainingSlots = G.trainingSlots.slice(0, count);
 if(G.selectedTraineeUid && !G.trainingSlots[0].uid){
  G.trainingSlots[0].uid = G.selectedTraineeUid;
  G.trainingSlots[0].loc = G.selectedTraineeLoc || null;
  G.trainingSlots[0].idStr = G.selectedTraineeId != null ? String(G.selectedTraineeId) : null;
 }
 for(const slot of G.trainingSlots){
  if(!slot) continue;
  if(slot.active && (!slot.endsAt || slot.endsAt <= Date.now())) slot.readyToComplete = true;
 }
 return G.trainingSlots;
}
function findPokemonByTrainingSlot(slot){
 if(!slot) return null;
 if(slot.uid){
  const teamIdx = (G.team||[]).findIndex(p => p && p.uid === slot.uid);
  if(teamIdx !== -1){ slot.loc = 'team'; slot.idStr = String(teamIdx); return G.team[teamIdx]; }
  for(const k in (G.collection||{})){
   const p = G.collection[k];
   if(p && p.uid === slot.uid){ slot.loc = 'box'; slot.idStr = k; return p; }
  }
 }
 if(slot.loc === 'box' && slot.idStr != null){
  let p = G.collection[slot.idStr] || G.collection[String(slot.idStr)];
  if(!p && String(slot.idStr).startsWith('box_')) p = G.collection[String(slot.idStr).replace('box_','')] || G.collection[Number(String(slot.idStr).replace('box_',''))];
  if(p){ slot.uid = makeTrainingUid(p); return p; }
 }
 if(slot.loc === 'team' && slot.idStr != null){
  const p = G.team[Number(slot.idStr)];
  if(p){ slot.uid = makeTrainingUid(p); return p; }
 }
 return null;
}
function setTrainingSlotPokemon(slotIndex, loc, idStr, p){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 if(!p) p = loc === 'team' ? G.team[Number(idStr)] : G.collection[idStr];
 if(!p) return false;
 const slot = G.trainingSlots[idx];
 if(slot.active){ notify(t('training_slot_busy'), 'var(--red)'); return false; }
 slot.uid = makeTrainingUid(p);
 slot.loc = loc;
 slot.idStr = String(idStr);
 slot.active = false;
 slot.mode = null;
 slot.startedAt = 0;
 slot.endsAt = 0;
 slot.lastResult = null;
 if(idx === 0){
  G.selectedTraineeUid = slot.uid;
  G.selectedTraineeLoc = loc;
  G.selectedTraineeId = String(idStr);
 }
 saveGame();
 return true;
}
function clearTrainingSlot(slotIndex){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 const slot = G.trainingSlots[idx];
 if(!slot) return;
 if(slot.active){ notify(t('training_slot_busy'), 'var(--red)'); return; }
 G.trainingSlots[idx] = {uid:null, loc:null, idStr:null, active:false};
 if(idx === 0){ G.selectedTraineeUid = null; G.selectedTraineeLoc = null; G.selectedTraineeId = null; }
 saveGame();
 renderTrainingWindow();
}
function openTrainingSlotSelector(slotIndex){
 ensureTrainingSlots();
 G.pendingTrainingSlotIndex = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 openUnifiedSelectorModal('training');
 const titleEl = document.getElementById('usm-title');
 if(titleEl) titleEl.textContent = tr('selector_title_training_slot', {slot:G.pendingTrainingSlotIndex+1});
}
function getTraineePoke(slotIndex=0){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 const slot = G.trainingSlots[idx];
 const fromSlot = findPokemonByTrainingSlot(slot);
 if(fromSlot) return fromSlot;
 if(idx !== 0) return null;
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
 makeTrainingUid(p);
 G.selectedTraineeUid = p.uid;
 return p;
 }
 }
 if(G.selectedTraineeLoc === 'team' && G.selectedTraineeId != null){
 const teamIdx = Number(G.selectedTraineeId);
 if(G.team[teamIdx]){
 const p = G.team[teamIdx];
 makeTrainingUid(p);
 G.selectedTraineeUid = p.uid;
 return p;
 }
 }
 const fallback = G.team[0] || null;
 if(fallback){
 makeTrainingUid(fallback);
 G.selectedTraineeUid = fallback.uid;
 G.selectedTraineeLoc = 'team';
 G.selectedTraineeId = '0';
 if(G.trainingSlots[0] && !G.trainingSlots[0].uid){
  G.trainingSlots[0].uid = fallback.uid;
  G.trainingSlots[0].loc = 'team';
  G.trainingSlots[0].idStr = '0';
 }
 }
 return fallback;
}
function trainingModeAvailability(trainee){
 if(!trainee) return {move:false,talent:false,ev:false,level:false,totalEvs:0};
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const totalEvs = Object.values(trainee.evs).reduce((a,b)=>a+b,0);
 return {
  move: getTrainableLockedMoves(trainee).length > 0,
  talent: getTrainableTalents(trainee).length > 0,
  ev: totalEvs < 36,
  level: (trainee.level||1) < 100,
  totalEvs
 };
}
function trainingButtonHtml(mode, enabled, slotIndex){
 return `<div class="pokechill-row training-mode-row ${enabled?'':'is-disabled'}" ${enabled?`data-action="legacy-call" data-call="startTrainingBattle" data-call-args="'${mode}', ${slotIndex}"`:''}>
 <div class="training-mode-title">${getTrainingModeLabel(mode)}</div>
 <div class="extracted-template-style-007">${getTrainingModeDescription(mode, enabled)}</div>
 </div>`;
}
function formatTrainingTimeLeft(ms){
 const s = Math.max(0, Math.ceil(ms/1000));
 const m = Math.floor(s/60);
 const r = s % 60;
 return m ? `${m}:${String(r).padStart(2,'0')}` : `${r}s`;
}
function getTrainingProgressClass(slot){
 if(!slot || !slot.active || !slot.startedAt || !slot.endsAt) return 'pct-0';
 const pct = clamp(Math.floor(((Date.now() - slot.startedAt) / Math.max(1, slot.endsAt - slot.startedAt)) * 100), 0, 100);
 const rounded = Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
 return 'pct-' + rounded;
}
function estimateTrainingSuccessChance(trainee, mode){
 if(!trainee) return 0;
 if((trainee.currentHP||trainee.maxHP||1) <= 0) return 0;
 const offset = mode === 'move' ? -2 : mode === 'talent' ? -1 : mode === 'level' ? 2 : 0;
 const targetLv = Math.max(3, (trainee.level || 15) + offset);
 const evs = Object.values(trainee.evs||{}).reduce((a,b)=>a+b,0);
 const ivs = Object.values(trainee.ivs||{}).reduce((a,b)=>a+b,0);
 let chancePct = 76 + ((trainee.level||1) - targetLv) * 3 + evs * 0.35 + ivs * 0.25;
 if(mode === 'level') chancePct -= 8;
 if(mode === 'talent') chancePct -= 4;
 return clamp(Math.round(chancePct), 55, 98);
}
function applyTrainingReward(trainee, mode){
 let rewardMsg = '';
 if(!trainee) return rewardMsg;
 if(mode === 'ev'){
  if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
  const keys = ['hp','atk','def','spa','spd','spe'];
  const avail = keys.filter(k => (trainee.evs[k]||0) < 6);
  if(avail.length){
   const pk = avail[rand(0, avail.length - 1)];
   trainee.evs[pk]++;
   rewardMsg = ` (+1 EV ${pk.toUpperCase()} → ${trainee.evs[pk]}/6)`;
  } else rewardMsg = ' (EV au maximum)';
 } else if(mode === 'level'){
  const gain = Math.min(rand(2,5), Math.max(0, 100 - (trainee.level||1)));
  for(let i=0;i<gain;i++) levelUp(trainee);
  rewardMsg = ` (+${gain} niveaux → Nv.${trainee.level})`;
 } else if(mode === 'talent'){
  const chosen = (typeof rollTrainingTalent === 'function') ? rollTrainingTalent(trainee) : null;
  if(chosen){
   if(!G.unlockedTalents) G.unlockedTalents = {};
   if(!G.unlockedTalents[trainee.id]) G.unlockedTalents[trainee.id] = [];
   const wasNew = !G.unlockedTalents[trainee.id].includes(chosen);
   if(wasNew) G.unlockedTalents[trainee.id].push(chosen);
   trainee.talent = chosen;
   rewardMsg = ` (${wasNew?'Nouveau talent':'Talent confirmé'} : ${getTalentName(chosen)})`;
  } else rewardMsg = ' (aucun talent disponible)';
 } else if(mode === 'move'){
  const unlocked = (typeof unlockTrainingMove === 'function') ? unlockTrainingMove(trainee) : null;
  rewardMsg = unlocked ? ` (Capacité débloquée : ${getMoveName(unlocked)})` : ' (toutes les capacités sont déjà débloquées)';
 }
 recalcPokeStats(trainee);
 return rewardMsg;
}
function completeTrainingSlot(slotIndex){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 const slot = G.trainingSlots[idx];
 if(!slot || !slot.active) return false;
 const trainee = findPokemonByTrainingSlot(slot);
 const mode = slot.mode || 'ev';
 slot.active = false;
 slot.startedAt = 0;
 slot.endsAt = 0;
 slot.readyToComplete = false;
 if(!trainee){
  slot.lastResult = t('training_slot_missing');
  notify(t('training_slot_missing'), 'var(--red)');
  return false;
 }
 const successChance = estimateTrainingSuccessChance(trainee, mode);
 if(!chance(successChance)){
  slot.lastResult = tr('training_slot_last_failed', {mode:getTrainingModeLabel(mode)});
  notify(tr('training_slot_failed', {name:trainee.name}), 'var(--red)');
  return false;
 }
 const rewardMsg = applyTrainingReward(trainee, mode);
 slot.lastResult = tr('training_slot_last_success', {mode:getTrainingModeLabel(mode), reward:rewardMsg || ''});
 notify(tr('training_complete', {reward:rewardMsg}), 'var(--green)');
 updateHeader();
 renderTeamWindow();
 saveGame();
 return true;
}
function updateTrainingSlots(){
 if(typeof G === 'undefined' || !G || !Array.isArray(G.trainingSlots)) return;
 let changed = false;
 for(let i=0;i<G.trainingSlots.length;i++){
  const slot = G.trainingSlots[i];
  if(slot && slot.active && slot.endsAt && Date.now() >= slot.endsAt){
   completeTrainingSlot(i);
   changed = true;
  }
 }
 if(changed){
  try{ renderTrainingWindow(); }catch(_){}
  try{ renderTeamWindow(); }catch(_){}
  try{ saveGame(); }catch(_){}
 }
}
function startTrainingSlotTicker(){
 if(_trainingSlotTicker) return;
 _trainingSlotTicker = setInterval(()=>{
  updateTrainingSlots();
  const el = document.getElementById('training-window-body');
  if(el && Array.isArray(G.trainingSlots) && G.trainingSlots.some(s=>s && s.active)) renderTrainingWindow();
 }, 1000);
}
function cancelTrainingSlot(slotIndex){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 const slot = G.trainingSlots[idx];
 if(!slot || !slot.active) return;
 slot.active = false;
 slot.startedAt = 0;
 slot.endsAt = 0;
 slot.readyToComplete = false;
 slot.lastResult = t('training_slot_cancelled');
 notify(t('training_slot_cancelled'), 'var(--light1)');
 saveGame();
 renderTrainingWindow();
}
function upgradeTrainingMultiSlot(){
 if(G.trainingMultiSlot){ notify(t('training_multi_slot_max'), 'var(--green)'); return; }
 if(G.money < TRAINING_MULTI_SLOT_COST){ notify(t('n.pas_assez_dargent'), 'var(--red)'); return; }
 G.money -= TRAINING_MULTI_SLOT_COST;
 G.trainingMultiSlot = true;
 ensureTrainingSlots();
 updateHeader();
 saveGame();
 notify(t('training_multi_slot_bought'), 'var(--green)');
 openTrainingUpgradeMenu();
}
function openTrainingUpgradeMenu(){
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 ensureTrainingSlots();
 inner.innerHTML = `<div class="modal-title"><div>⚙️ ${t('training_center_title')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="dict-info-block"><b>${t('training_slots')}</b><br>${tr('training_slots_current', {count:getTrainingSlotCount(), max:2})}</div>
 <div class="dict-info-block">${G.trainingMultiSlot ? t('training_multi_slot_max') : `<button class="hbtn" data-action="legacy-call" data-call="upgradeTrainingMultiSlot" data-call-args="">⬆ ${tr('training_multi_slot_buy', {price:TRAINING_MULTI_SLOT_COST.toLocaleString()})}</button>`}</div>
 <div class="dict-info-block"><b>${t('note')} :</b><br>${t('training_multi_slot_note')}</div>`;
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
function renderTrainingSlot(slotIndex){
 ensureTrainingSlots();
 const slot = G.trainingSlots[slotIndex];
 const trainee = getTraineePoke(slotIndex);
 const slotTitle = tr('training_slot_title', {slot:slotIndex+1});
 if(!trainee){
  return `<div class="training-slot-card is-empty">
   <div class="training-slot-head"><b>${slotTitle}</b></div>
   <div class="training-slot-empty">${t('training_slot_empty')}</div>
   <button class="hbtn" data-action="legacy-call" data-call="openTrainingSlotSelector" data-call-args="${slotIndex}">➕ ${t('training_slot_choose')}</button>
  </div>`;
 }
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const state = trainingModeAvailability(trainee);
 const active = slot && slot.active;
 const timeLeft = active ? Math.max(0, (slot.endsAt || Date.now()) - Date.now()) : 0;
 const progressClass = getTrainingProgressClass(slot);
 const last = slot && slot.lastResult ? `<div class="training-slot-result">${slot.lastResult}</div>` : '';
 const actions = active
  ? `<button class="hbtn" data-action="legacy-call" data-call="cancelTrainingSlot" data-call-args="${slotIndex}">✖ ${t('training_slot_cancel')}</button>`
  : `<button class="hbtn" data-action="legacy-call" data-call="openTrainingSlotSelector" data-call-args="${slotIndex}">${t('training_slot_change')}</button>`;
 return `<div class="training-slot-card ${active?'is-active':''}">
  <div class="training-slot-head"><b>${slotTitle}</b><span>${active?t('training_slot_active'):t('ready')}</span></div>
  <div class="training-slot-pokemon">
   <div class="training-slot-sprite">${spriteImg(trainee.id, trainee.emoji, {size:58, shiny:trainee.shinyActive})}</div>
   <div><b>${trainee.name}</b> <span>Nv.${trainee.level}</span><br>
   <small>EVs ${state.totalEvs}/36 · Talents ${getUnlockedTalentListForSpecies(trainee.id).length}/${getSpeciesTalents(trainee.id).length} · Moves ${getTrainableLockedMoves(trainee).length}</small></div>
  </div>
  ${active?`<div class="training-slot-progress"><div class="${progressClass}"></div></div><div class="training-slot-timer">${tr('training_slot_time_left', {time:formatTrainingTimeLeft(timeLeft)})}</div>`:''}
  ${last}
  <div class="training-slot-actions">${actions}</div>
  <div class="training-mode-grid">
   ${trainingButtonHtml('move', state.move && !active, slotIndex)}
   ${trainingButtonHtml('talent', state.talent && !active, slotIndex)}
   ${trainingButtonHtml('ev', state.ev && !active, slotIndex)}
   ${trainingButtonHtml('level', state.level && !active, slotIndex)}
  </div>
 </div>`;
}
function renderTrainingWindow(){
 const el = document.getElementById('training-window-body');
 if(!el) return;
 startTrainingSlotTicker();
 const unlocked = G.badges.includes('surge') || G.badges.length >= 3;
 if(!unlocked){
 el.innerHTML = `<div class="extracted-template-style-141"><div class="extracted-template-style-142"></div><b>${t("m.training.13")}</b><br>${t("m.training.12")}</div>`;
 return;
 }
 ensureTrainingSlots();
 updateTrainingSlots();
 const count = getTrainingSlotCount();
 const slotHtml = [];
 for(let i=0;i<count;i++) slotHtml.push(renderTrainingSlot(i));
 const lockedHint = !G.trainingMultiSlot ? `<div class="training-locked-slot"><b>${t('training_slot_locked')}</b><button class="hbtn" data-action="legacy-call" data-call="openTrainingUpgradeMenu" data-call-args="">⚙️ ${tr('training_multi_slot_buy', {price:TRAINING_MULTI_SLOT_COST.toLocaleString()})}</button></div>` : '';
 el.innerHTML = `<div class="training-header-card">
  <div><b class="extracted-template-style-186">${t('training_center_title')}</b><br><span class="extracted-template-style-188">${t('training_slots')} ${count}/2 · ${t('training_parallel_hint')}</span></div>
  <div class="training-header-actions"><button class="hbtn" data-action="legacy-call" data-call="openTrainingUpgradeMenu" data-call-args="">⚙️ ${t('training_upgrades')}</button></div>
 </div>
 <div class="training-slot-grid">${slotHtml.join('')}${lockedHint}</div>`;
}
function startTrainingBattle(mode='ev', slotIndex=0){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 const slot = G.trainingSlots[idx];
 if(!slot){ notify(t('training_slot_no_pokemon'), 'var(--red)'); return; }
 if(slot.active){ notify(t('training_slot_busy'), 'var(--red)'); return; }
 const trainee = getTraineePoke(idx);
 if(!trainee){ setMsg(t("legacy_message_n_aucun_pok_mon_entra_ner")); return; }
 if(mode === 'level' && trainee.level >= 100){ notify(t("legacy_message_n_ce_pok_mon_est_d_j_au_niveau_100_maximu"),"var(--red)"); return; }
 if(mode === 'ev'){
   if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
   const totEv = Object.values(trainee.evs).reduce((a,b)=>a+b,0);
   if(totEv >= 36){ notify(t("legacy_message_n_ce_pok_mon_poss_de_d_j_6_toiles_ev_sur"),"var(--red)"); return; }
 }
 if(mode === 'move' && !getTrainableLockedMoves(trainee).length){ notify(t('training_mode_move_done'), 'var(--red)'); return; }
 if(mode === 'talent' && !getTrainableTalents(trainee).length){ notify(t('all_talents_unlocked'), 'var(--red)'); return; }
 slot.mode = mode;
 slot.active = true;
 slot.startedAt = Date.now();
 slot.endsAt = slot.startedAt + TRAINING_SLOT_DURATION_MS;
 slot.lastResult = null;
 slot.uid = makeTrainingUid(trainee);
 notify(tr('training_slot_started', {name:trainee.name, mode:getTrainingModeLabel(mode)}), 'var(--green)');
 saveGame();
 renderTrainingWindow();
}


// --- Migrated to ES module, globals exposed ---
if (typeof isMoveTrainingLocked !== 'undefined' && typeof window !== 'undefined') window.isMoveTrainingLocked = isMoveTrainingLocked;
if (typeof getTrainingLockedMoves !== 'undefined' && typeof window !== 'undefined') window.getTrainingLockedMoves = getTrainingLockedMoves;
if (typeof getTrainableLockedMoves !== 'undefined' && typeof window !== 'undefined') window.getTrainableLockedMoves = getTrainableLockedMoves;
if (typeof getTrainingSlotCount !== 'undefined' && typeof window !== 'undefined') window.getTrainingSlotCount = getTrainingSlotCount;
if (typeof ensureTrainingSlots !== 'undefined' && typeof window !== 'undefined') window.ensureTrainingSlots = ensureTrainingSlots;
if (typeof setTrainingSlotPokemon !== 'undefined' && typeof window !== 'undefined') window.setTrainingSlotPokemon = setTrainingSlotPokemon;
if (typeof clearTrainingSlot !== 'undefined' && typeof window !== 'undefined') window.clearTrainingSlot = clearTrainingSlot;
if (typeof openTrainingSlotSelector !== 'undefined' && typeof window !== 'undefined') window.openTrainingSlotSelector = openTrainingSlotSelector;
if (typeof applyTrainingReward !== 'undefined' && typeof window !== 'undefined') window.applyTrainingReward = applyTrainingReward;
if (typeof completeTrainingSlot !== 'undefined' && typeof window !== 'undefined') window.completeTrainingSlot = completeTrainingSlot;
if (typeof cancelTrainingSlot !== 'undefined' && typeof window !== 'undefined') window.cancelTrainingSlot = cancelTrainingSlot;
if (typeof updateTrainingSlots !== 'undefined' && typeof window !== 'undefined') window.updateTrainingSlots = updateTrainingSlots;
if (typeof upgradeTrainingMultiSlot !== 'undefined' && typeof window !== 'undefined') window.upgradeTrainingMultiSlot = upgradeTrainingMultiSlot;
if (typeof openTrainingUpgradeMenu !== 'undefined' && typeof window !== 'undefined') window.openTrainingUpgradeMenu = openTrainingUpgradeMenu;
if (typeof pickTrainingBots !== 'undefined' && typeof window !== 'undefined') window.pickTrainingBots = pickTrainingBots;
if (typeof getTraineePoke !== 'undefined' && typeof window !== 'undefined') window.getTraineePoke = getTraineePoke;
if (typeof renderTrainingWindow !== 'undefined' && typeof window !== 'undefined') window.renderTrainingWindow = renderTrainingWindow;
if (typeof startTrainingBattle !== 'undefined' && typeof window !== 'undefined') window.startTrainingBattle = startTrainingBattle;

