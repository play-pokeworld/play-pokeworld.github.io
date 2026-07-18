
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
var _trainingSlotTicker = null;

function hasActiveTrainingBattle(){
 return !!(G && Array.isArray(G.trainingSlots) && G.trainingSlots.some(slot => slot && slot.active && slot.battle));
}

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
  if(slot.active && !slot.battle){
   slot.active = false;
   slot.mode = null;
   slot.startedAt = 0;
   slot.endsAt = 0;
  }
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
function trainingBattleHpPct(p){ return clamp(Math.floor(((p && p.maxHP) ? (p.currentHP / p.maxHP) : 0) * 100), 0, 100); }
function trainingBattlePctClass(p){ return 'pct-' + Math.max(0, Math.min(100, Math.round(trainingBattleHpPct(p) / 5) * 5)); }
function trainingCdPctClass(cur, max){
 const pct = max ? clamp(Math.floor(100 - ((cur || 0) / max) * 100), 0, 100) : 0;
 return 'pct-' + Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
}
function trainingBattleLog(slot, msg){
 if(!slot) return;
 if(!slot.battle) slot.battle = {};
 if(!Array.isArray(slot.battle.logs)) slot.battle.logs = [];
 slot.battle.logs.push(msg);
 if(slot.battle.logs.length > 6) slot.battle.logs = slot.battle.logs.slice(-6);
}
function trainingCalcCd(p){
 if(typeof calcAttackCd === 'function') return calcAttackCd(p && p.spe ? p.spe : 50);
 const spe = p && p.spe ? p.spe : 50;
 return Math.round(clamp(1900 * (100/(100+Math.min(spe,180))), 500, 2600));
}
function trainingCreateEnemyTeam(trainee, mode){
 const offset = mode === 'move' ? -2 : mode === 'talent' ? -1 : mode === 'level' ? 2 : 0;
 const bLv = Math.max(3, (trainee.level || 15) + offset);
 const team = pickTrainingBots(trainee, mode, bLv).slice(0,6);
 while(team.length < 6){
  const fallback = createPoke([132,137,113,122,185,143][team.length%6], bLv, false);
  if(fallback) team.push(fallback); else break;
 }
 team.forEach((enemy, i)=>{
  if(!enemy) return;
  enemy.name = `Coach ${i+1} — ${getPokeName(enemy.id)}`;
  enemy.currentHP = enemy.maxHP;
  enemy.status = null;
  enemy.statusTurns = 0;
  if(enemy.moves) for(const m of enemy.moves) m.pp = m.maxPP || (MOVES[m.id]?.pp || 10);
 });
 return team.filter(Boolean);
}
function trainingHealBetweenRounds(trainee){
 if(!trainee) return;
 trainee.currentHP = trainee.maxHP;
 trainee.status = null;
 trainee.statusTurns = 0;
 if(trainee.moves) for(const m of trainee.moves) m.pp = m.maxPP || (MOVES[m.id]?.pp || 10);
}
function trainingStartNextOpponent(slotIndex){
 const slot = G.trainingSlots[slotIndex];
 if(!slot || !slot.battle) return false;
 const tb = slot.battle;
 if(!Array.isArray(tb.enemies) || !tb.enemies.length){
  if(tb.enemy) tb.enemies = [tb.enemy];
  else return false;
 }
 tb.enemyIndex = (tb.enemyIndex || 0) + 1;
 if(tb.enemyIndex >= tb.enemies.length) return false;
 const trainee = findPokemonByTrainingSlot(slot);
 const enemy = tb.enemies[tb.enemyIndex];
 trainingHealBetweenRounds(trainee);
 enemy.currentHP = enemy.maxHP;
 enemy.status = null;
 enemy.statusTurns = 0;
 if(enemy.moves) for(const m of enemy.moves) m.pp = m.maxPP || (MOVES[m.id]?.pp || 10);
 tb.enemy = enemy;
 tb.pMoveIdx = 0;
 tb.eMoveIdx = 0;
 tb.pCdMax = trainingCalcCd(trainee);
 tb.eCdMax = trainingCalcCd(enemy);
 tb.pCd = tb.pCdMax;
 tb.eCd = tb.eCdMax;
 trainingBattleLog(slot, tr('training_live_next_round', {round:tb.enemyIndex+1, total:tb.enemies.length, enemy:enemy.name}));
 return true;
}
function trainingMoveDamage(attacker, defender, moveId){
 const mv = MOVES[moveId];
 if(!attacker || !defender || !mv) return {damage:0, text:''};
 if(mv.cat === 'stat' || mv.pow === null || mv.pow === undefined || !mv.pow){
  return {damage:0, text:tr('training_live_status_move', {move:getMoveName(moveId)})};
 }
 let acc = mv.acc || 100;
 if(attacker.talent === 'compoundeyes') acc += 30;
 if(!chance(acc)) return {damage:0, text:tr('training_live_miss', {name:attacker.name, move:getMoveName(moveId)})};
 const eff = typeEff(mv.type, defender.type1, defender.type2);
 if(eff === 0) return {damage:0, text:tr('training_live_no_effect', {name:defender.name})};
 const isSpec = mv.cat === 'spec';
 const atkBuff = typeof getHeldBuff === 'function' ? (getHeldBuff(attacker)[isSpec ? 'spa' : 'atk'] || 0) : 0;
 const defBuff = typeof getHeldBuff === 'function' ? (getHeldBuff(defender)[isSpec ? 'spd' : 'def'] || 0) : 0;
 let atk = (isSpec ? (attacker.spa || attacker.atk) : attacker.atk) * (1 + atkBuff);
 let def = Math.max(1, (isSpec ? (defender.spd || defender.def) : defender.def) * (1 + defBuff));
 let power = mv.pow;
 const stab = (attacker.type1 === mv.type || attacker.type2 === mv.type) ? 1.5 : 1;
 const crit = (mv.crit && chance(15)) ? 1.5 : 1;
 const randMult = rand(85,100) / 100;
 let dmg = Math.max(1, Math.floor(((2*(attacker.level||1)/5+2)*power*atk/def/50+2)*stab*eff*crit*randMult));
 if(attacker.status === 'burn' && mv.cat === 'phys') dmg = Math.max(1, Math.floor(dmg/2));
 return {damage:dmg, text:tr('training_live_hit', {name:attacker.name, move:getMoveName(moveId), target:defender.name, damage:dmg})};
}
function trainingDoAttack(slotIndex, side){
 ensureTrainingSlots();
 const slot = G.trainingSlots[slotIndex];
 if(!slot || !slot.active || !slot.battle) return;
 const tb = slot.battle;
 const trainee = findPokemonByTrainingSlot(slot);
 const enemy = tb.enemy;
 if(!trainee || !enemy) return;
 const attacker = side === 'player' ? trainee : enemy;
 const defender = side === 'player' ? enemy : trainee;
 if(!attacker || !defender || attacker.currentHP <= 0 || defender.currentHP <= 0) return;
 const moves = (attacker.moves || []).filter(m => m && MOVES[m.id]);
 if(!moves.length) return;
 const idxKey = side === 'player' ? 'pMoveIdx' : 'eMoveIdx';
 const mv = moves[(tb[idxKey] || 0) % moves.length];
 tb[idxKey] = ((tb[idxKey] || 0) + 1) % moves.length;
 const res = trainingMoveDamage(attacker, defender, mv.id);
 if(res.text) trainingBattleLog(slot, res.text);
 if(res.damage > 0){
  defender.currentHP = Math.max(0, defender.currentHP - res.damage);
 }
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
function completeTrainingSlot(slotIndex, success=true){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 const slot = G.trainingSlots[idx];
 if(!slot || !slot.active) return false;
 const trainee = findPokemonByTrainingSlot(slot);
 const mode = (slot.battle && slot.battle.mode) || slot.mode || 'ev';
 slot.active = false;
 slot.mode = null;
 const enemyName = slot.battle && slot.battle.enemy ? slot.battle.enemy.name : '';
 slot.battle = null;
 if(!trainee){
  slot.lastResult = t('training_slot_missing');
  notify(t('training_slot_missing'), 'var(--red)');
  renderTrainingBattlePanel();
  return false;
 }
 if(success){
  const rewardMsg = applyTrainingReward(trainee, mode);
  trainee.currentHP = trainee.maxHP;
  if(trainee.moves) for(const m of trainee.moves) m.pp = m.maxPP || (MOVES[m.id]?.pp || 10);
  slot.lastResult = tr('training_slot_last_success', {mode:getTrainingModeLabel(mode), reward:rewardMsg || ''});
  notify(tr('training_complete', {reward:rewardMsg}), 'var(--green)');
 } else {
  trainee.currentHP = trainee.maxHP;
  if(trainee.moves) for(const m of trainee.moves) m.pp = m.maxPP || (MOVES[m.id]?.pp || 10);
  slot.lastResult = tr('training_slot_last_failed', {mode:getTrainingModeLabel(mode)});
  notify(tr('training_slot_failed', {name:trainee.name}), 'var(--red)');
 }
 updateHeader();
 renderTeamWindow();
 renderTrainingBattlePanel();
 saveGame();
 return true;
}
function updateTrainingSlots(){
 if(typeof G === 'undefined' || !G || !Array.isArray(G.trainingSlots)) return;
 const dt = 100 * ((typeof battle !== 'undefined' && battle && battle.speed) ? battle.speed : 1);
 let changed = false;
 for(let i=0;i<G.trainingSlots.length;i++){
  const slot = G.trainingSlots[i];
  if(!slot || !slot.active || !slot.battle) continue;
  const trainee = findPokemonByTrainingSlot(slot);
  if(!Array.isArray(slot.battle.enemies) && slot.battle.enemy) slot.battle.enemies = [slot.battle.enemy];
  const enemy = slot.battle.enemy || (slot.battle.enemies ? slot.battle.enemies[slot.battle.enemyIndex||0] : null);
  if(!trainee || !enemy){ completeTrainingSlot(i, false); changed = true; continue; }
  slot.battle.pCd -= dt;
  slot.battle.eCd -= dt;
  if(slot.battle.pCd <= 0){
   trainingDoAttack(i, 'player');
   slot.battle.pCdMax = trainingCalcCd(trainee);
   slot.battle.pCd = slot.battle.pCdMax;
   changed = true;
  }
  if(enemy.currentHP <= 0){
   trainingBattleLog(slot, tr('training_live_enemy_down', {enemy:enemy.name}));
   if(trainingStartNextOpponent(i)){ changed = true; continue; }
   completeTrainingSlot(i, true); changed = true; continue;
  }
  if(slot.battle.eCd <= 0){
   trainingDoAttack(i, 'enemy');
   slot.battle.eCdMax = trainingCalcCd(enemy);
   slot.battle.eCd = slot.battle.eCdMax;
   changed = true;
  }
  if(trainee.currentHP <= 0){ completeTrainingSlot(i, false); changed = true; continue; }
 }
 if(changed){
  try{ renderTrainingBattlePanel(); }catch(_){}
  try{ renderTrainingWindow(); }catch(_){}
  try{ renderTeamWindow(); }catch(_){}
 }
}
function startTrainingSlotTicker(){
 if(_trainingSlotTicker) return;
 _trainingSlotTicker = setInterval(()=>{
  updateTrainingSlots();
  if(Array.isArray(G.trainingSlots) && G.trainingSlots.some(s=>s && s.active)){
   try{ renderTrainingBattlePanel(); }catch(_){}
  }
 }, 100);
}
function cancelTrainingSlot(slotIndex){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 const slot = G.trainingSlots[idx];
 if(!slot || !slot.active) return;
 const trainee = findPokemonByTrainingSlot(slot);
 if(trainee){
  trainee.currentHP = trainee.maxHP;
  if(trainee.moves) for(const m of trainee.moves) m.pp = m.maxPP || (MOVES[m.id]?.pp || 10);
 }
 slot.active = false;
 slot.mode = null;
 slot.battle = null;
 slot.lastResult = t('training_slot_cancelled');
 notify(t('training_slot_cancelled'), 'var(--light1)');
 saveGame();
 renderTrainingBattlePanel();
 renderTrainingWindow();
}
function ensureTrainingBattlePanelElement(){
 const activeScene = document.getElementById('battle-active-scene');
 if(!activeScene) return null;
 let panel = document.getElementById('training-battle-live-panel');
 if(!panel){
  panel = document.createElement('div');
  panel.id = 'training-battle-live-panel';
  activeScene.appendChild(panel);
 }
 return panel;
}
function renderTrainingBattlePanel(){
 const panel = ensureTrainingBattlePanelElement();
 if(!panel || typeof G === 'undefined' || !G) return;
 ensureTrainingSlots();
 const activeSlots = (G.trainingSlots || []).map((slot, i)=>({slot, i})).filter(x=>x.slot && x.slot.active && x.slot.battle);
 const idleScreen = document.getElementById('battle-idle-screen');
 const activeScene = document.getElementById('battle-active-scene');
 const leaveBtn = document.getElementById('leave-btn');
 if(!activeSlots.length){
  panel.innerHTML = '';
  panel.classList.remove('open');
  if(typeof battle !== 'undefined' && battle && !battle.active){
   if(idleScreen) idleScreen.style.display = 'flex';
   if(activeScene) activeScene.style.display = 'none';
   if(leaveBtn){ leaveBtn.disabled = false; leaveBtn.textContent = t('leave_battle_button') || 'Quitter le combat'; }
  }
  return;
 }
 if(idleScreen) idleScreen.style.display = 'none';
 if(activeScene) activeScene.style.display = 'flex';
 if(leaveBtn && typeof battle !== 'undefined' && battle && !battle.active){
  leaveBtn.disabled = true;
  leaveBtn.textContent = t('training_live_running');
 }
 if(typeof battle !== 'undefined' && battle && !battle.active){
  const row = document.getElementById('battle-team-row');
  if(row) row.innerHTML = '';
 }
 panel.classList.add('open');
 panel.innerHTML = `<div class="training-live-title">⚔️ ${t('training_live_title')}</div>` + activeSlots.map(({slot, i})=>{
  const trainee = findPokemonByTrainingSlot(slot);
  const tb = slot.battle;
  if(!Array.isArray(tb.enemies) && tb.enemy) tb.enemies = [tb.enemy];
  const enemy = tb.enemy || (tb.enemies ? tb.enemies[tb.enemyIndex||0] : null);
  if(!trainee || !enemy) return '';
  const pHpClass = trainingBattleHpPct(trainee) > 50 ? 'high' : trainingBattleHpPct(trainee) > 20 ? 'medium' : 'low';
  const eHpClass = trainingBattleHpPct(enemy) > 50 ? 'high' : trainingBattleHpPct(enemy) > 20 ? 'medium' : 'low';
  const pMove = (trainee.moves||[])[(tb.pMoveIdx||0) % Math.max(1,(trainee.moves||[]).length)];
  const eMove = (enemy.moves||[])[(tb.eMoveIdx||0) % Math.max(1,(enemy.moves||[]).length)];
  return `<div class="training-live-card">
   <div class="training-live-head"><b>${tr('training_slot_title', {slot:i+1})}</b><span>${getTrainingModeLabel(tb.mode)} · ${tr('training_round_label', {round:(tb.enemyIndex||0)+1, total:(tb.enemies||[]).length||1})}</span></div>
   <div class="training-live-duel">
    <div class="training-live-poke">
     <div class="training-live-sprite">${spriteImg(trainee.id, trainee.emoji, {size:70, shiny:trainee.shinyActive})}</div>
     <b>${trainee.name}</b><span>Nv.${trainee.level}</span>
     <div class="hp-bar"><div class="hp-fill ${pHpClass}" data-pct="${trainingBattleHpPct(trainee)}"></div></div>
     <small>${trainee.currentHP}/${trainee.maxHP} PV</small>
     <div class="training-live-move">${pMove ? getMoveName(pMove.id) : '-'}</div>
     <div class="training-live-cd"><div class="${trainingCdPctClass(tb.pCd, tb.pCdMax)}"></div></div>
    </div>
    <div class="training-live-vs">VS</div>
    <div class="training-live-poke enemy">
     <div class="training-live-sprite">${spriteImg(enemy.id, enemy.emoji, {size:70, shiny:enemy.shinyActive})}</div>
     <b>${enemy.name}</b><span>Nv.${enemy.level}</span>
     <div class="hp-bar"><div class="hp-fill ${eHpClass}" data-pct="${trainingBattleHpPct(enemy)}"></div></div>
     <small>${enemy.currentHP}/${enemy.maxHP} PV</small>
     <div class="training-live-move">${eMove ? getMoveName(eMove.id) : '-'}</div>
     <div class="training-live-cd"><div class="${trainingCdPctClass(tb.eCd, tb.eCdMax)}"></div></div>
    </div>
   </div>
   <button class="hbtn" data-action="legacy-call" data-call="cancelTrainingSlot" data-call-args="${i}">✖ ${t('training_slot_cancel')}</button>
  </div>`;
 }).join('');
 try{ if(typeof applyDynamicStyles === 'function') applyDynamicStyles(panel); }catch(_){}
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
function renderTrainingManagementTabs(active){
 return `<div class="management-tabs">
  <button class="hbtn ${active==='upgrades'?'active':''}" data-action="legacy-call" data-call="openTrainingManagementMenu" data-call-args="'upgrades'">⬆ ${t('management_upgrades')}</button>
  <button class="hbtn ${active==='automation'?'active':''}" data-action="legacy-call" data-call="openTrainingManagementMenu" data-call-args="'automation'">🤖 ${t('management_automation')}</button>
  <button class="hbtn ${active==='trainers'?'active':''}" data-action="legacy-call" data-call="openTrainingManagementMenu" data-call-args="'trainers'">🧑‍🏫 ${t('management_trainers')}</button>
 </div>`;
}
function openTrainingManagementMenu(page='upgrades'){
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 ensureTrainingSlots();
 const body = page === 'trainers'
  ? `<div class="dict-info-block"><b>🧑‍🏫 ${t('management_trainers')}</b><br>${t('training_trainers_soon')}</div>`
  : page === 'automation'
  ? `<div class="dict-info-block"><b>${t('training_automation_title')}</b><br>${t('training_automation_desc')}</div>
     <div class="training-auto-slot-list">${[0,1].map(i=>{
       const slot = G.trainingSlots[i];
       const p = slot ? findPokemonByTrainingSlot(slot) : null;
       const unlocked = i < getTrainingSlotCount();
       return `<div class="training-auto-slot-card ${unlocked?'':'is-locked'}">
        <b>${tr('training_slot_title', {slot:i+1})}</b>
        <span>${unlocked ? (p ? `${p.name} · Nv.${p.level}${slot.active?' · '+t('training_slot_active'):''}` : t('training_slot_empty')) : t('training_slot_locked')}</span>
       </div>`;
     }).join('')}</div>`
  : `<div class="dict-info-block"><b>${t('training_slots')}</b><br>${tr('training_slots_current', {count:getTrainingSlotCount(), max:2})}</div>
     <div class="dict-info-block">${G.trainingMultiSlot ? t('training_multi_slot_max') : `<button class="hbtn purchase-btn" data-action="legacy-call" data-call="upgradeTrainingMultiSlot" data-call-args="">⬆ ${tr('training_multi_slot_buy', {price:TRAINING_MULTI_SLOT_COST.toLocaleString()})}</button>`}</div>
     <div class="dict-info-block"><b>${t('note')} :</b><br>${t('training_multi_slot_note')}</div>`;
 inner.innerHTML = `<div class="modal-title"><div>⚙️ ${t('training_management_title')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 ${renderTrainingManagementTabs(page)}
 ${body}`;
 modal.classList.add('open');
}
function openTrainingUpgradeMenu(){ openTrainingManagementMenu('upgrades'); }
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
  ${active?`<div class="training-slot-result">${t('training_live_visible_hint')}</div>`:''}
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
 const count = getTrainingSlotCount();
 const slotHtml = [];
 for(let i=0;i<count;i++) slotHtml.push(renderTrainingSlot(i));
 const lockedHint = !G.trainingMultiSlot ? `<div class="training-locked-slot"><b>${t('training_slot_locked')}</b><button class="hbtn" data-action="legacy-call" data-call="openTrainingUpgradeMenu" data-call-args="">⚙️ ${tr('training_multi_slot_buy', {price:TRAINING_MULTI_SLOT_COST.toLocaleString()})}</button></div>` : '';
 el.innerHTML = `<div class="training-header-card">
  <div><b class="extracted-template-style-186">${t('training_center_title')}</b><br><span class="extracted-template-style-188">${t('training_slots')} ${count}/2 · ${t('training_parallel_hint')}</span></div>
  <div class="training-header-actions"><button class="hbtn" data-action="legacy-call" data-call="openTrainingManagementMenu" data-call-args="'upgrades'">⚙️ ${t('training_management_button')}</button></div>
 </div>
 <div class="training-slot-grid">${slotHtml.join('')}${lockedHint}</div>`;
}
function startTrainingBattle(mode='ev', slotIndex=0){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 const slot = G.trainingSlots[idx];
 if(!slot){ notify(t('training_slot_no_pokemon'), 'var(--red)'); return; }
 if(slot.active){ notify(t('training_slot_busy'), 'var(--red)'); return; }
 if(typeof battle !== 'undefined' && battle && battle.active){ notify(t('battle_in_progress_no_training'), 'var(--red)'); return; }
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
 const enemies = trainingCreateEnemyTeam(trainee, mode);
 if(!enemies.length){ notify(t('enemy_not_found_error'), 'var(--red)'); return; }
 const enemy = enemies[0];
 trainingHealBetweenRounds(trainee);
 slot.mode = mode;
 slot.active = true;
 slot.lastResult = null;
 slot.uid = makeTrainingUid(trainee);
 slot.battle = {
  mode,
  enemies,
  enemyIndex:0,
  enemy,
  pMoveIdx:0,
  eMoveIdx:0,
  pCdMax:trainingCalcCd(trainee),
  eCdMax:trainingCalcCd(enemy),
  pCd:trainingCalcCd(trainee),
  eCd:trainingCalcCd(enemy),
  logs:[]
 };
 trainingBattleLog(slot, tr('training_live_started', {name:trainee.name, enemy:enemy.name, mode:getTrainingModeLabel(mode)}));
 trainingBattleLog(slot, tr('training_live_next_round', {round:1, total:enemies.length, enemy:enemy.name}));
 notify(tr('training_slot_started', {name:trainee.name, mode:getTrainingModeLabel(mode)}), 'var(--green)');
 saveGame();
 renderTrainingWindow();
 renderTrainingBattlePanel();
}


// --- Migrated to ES module, globals exposed ---
if (typeof isMoveTrainingLocked !== 'undefined' && typeof window !== 'undefined') window.isMoveTrainingLocked = isMoveTrainingLocked;
if (typeof getTrainingLockedMoves !== 'undefined' && typeof window !== 'undefined') window.getTrainingLockedMoves = getTrainingLockedMoves;
if (typeof getTrainableLockedMoves !== 'undefined' && typeof window !== 'undefined') window.getTrainableLockedMoves = getTrainableLockedMoves;
if (typeof hasActiveTrainingBattle !== 'undefined' && typeof window !== 'undefined') window.hasActiveTrainingBattle = hasActiveTrainingBattle;
if (typeof getTrainingSlotCount !== 'undefined' && typeof window !== 'undefined') window.getTrainingSlotCount = getTrainingSlotCount;
if (typeof ensureTrainingSlots !== 'undefined' && typeof window !== 'undefined') window.ensureTrainingSlots = ensureTrainingSlots;
if (typeof setTrainingSlotPokemon !== 'undefined' && typeof window !== 'undefined') window.setTrainingSlotPokemon = setTrainingSlotPokemon;
if (typeof clearTrainingSlot !== 'undefined' && typeof window !== 'undefined') window.clearTrainingSlot = clearTrainingSlot;
if (typeof openTrainingSlotSelector !== 'undefined' && typeof window !== 'undefined') window.openTrainingSlotSelector = openTrainingSlotSelector;
if (typeof applyTrainingReward !== 'undefined' && typeof window !== 'undefined') window.applyTrainingReward = applyTrainingReward;
if (typeof completeTrainingSlot !== 'undefined' && typeof window !== 'undefined') window.completeTrainingSlot = completeTrainingSlot;
if (typeof cancelTrainingSlot !== 'undefined' && typeof window !== 'undefined') window.cancelTrainingSlot = cancelTrainingSlot;
if (typeof updateTrainingSlots !== 'undefined' && typeof window !== 'undefined') window.updateTrainingSlots = updateTrainingSlots;
if (typeof renderTrainingBattlePanel !== 'undefined' && typeof window !== 'undefined') window.renderTrainingBattlePanel = renderTrainingBattlePanel;
if (typeof upgradeTrainingMultiSlot !== 'undefined' && typeof window !== 'undefined') window.upgradeTrainingMultiSlot = upgradeTrainingMultiSlot;
if (typeof openTrainingManagementMenu !== 'undefined' && typeof window !== 'undefined') window.openTrainingManagementMenu = openTrainingManagementMenu;
if (typeof openTrainingUpgradeMenu !== 'undefined' && typeof window !== 'undefined') window.openTrainingUpgradeMenu = openTrainingUpgradeMenu;
if (typeof pickTrainingBots !== 'undefined' && typeof window !== 'undefined') window.pickTrainingBots = pickTrainingBots;
if (typeof getTraineePoke !== 'undefined' && typeof window !== 'undefined') window.getTraineePoke = getTraineePoke;
if (typeof renderTrainingWindow !== 'undefined' && typeof window !== 'undefined') window.renderTrainingWindow = renderTrainingWindow;
if (typeof startTrainingBattle !== 'undefined' && typeof window !== 'undefined') window.startTrainingBattle = startTrainingBattle;

