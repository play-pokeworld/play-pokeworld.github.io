// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}
function getOfficialMovePoolForTraining(p){
  // new systeme : pool complete apprenable (all the moves compatibles)
  const known = new Set((p.moves||[]).map(function(m){ return m.id; }));
  if (typeof getSpeciesFullLearnablePool === 'function') {
    const fullPool = getSpeciesFullLearnablePool(p.id);
    return fullPool.filter(function(id) {
      return !known.has(id);
    });
  }
  // Fallback : old systeme
  const types = [p.type1, p.type2].filter(Boolean).map(function(t) { return String(t).toLowerCase(); });
  const moveData = (typeof MOVES !== 'undefined') ? MOVES : {};
  return Object.keys(moveData).filter(function(id) {
    const mv = moveData[id];
    if (!mv || mv.power === undefined) return false;
    if (known.has(id)) return false;
    const mvTypes = mv.moveset || [mv.type] || [];
    return mvTypes.includes('all') || mvTypes.some(function(t) { return types.indexOf(String(t).toLowerCase()) !== -1; });
  });
}
function getTrainingLockedMoves(p){
  // PokeChill: ALL moves not yet known by this Pokemon
  return getOfficialMovePoolForTraining(p);
}
function isMoveTrainingLocked(p, moveId){
 if(!p || !moveId) return false;
 const locked = getTrainingLockedMoves(p);
 if(!locked.includes(moveId)) return false;
 // Phase 6: a level-pool move whose learning level is already reached
 // counts as "learned by level-up" — it must appear in the learnable
 // moves. Remaining locked: pool moves beyond the current level (to
 // unlock via a future level-up) and the moves
 // outside pool of level (dressage / CT).
 if (typeof getMoveLearnLevel === 'function') {
   const learnLvl = getMoveLearnLevel(p.id, moveId);
   if (learnLvl <= (p.level || 1)) return false;
 }
 return !(p.trainingUnlockedMoves||[]).includes(moveId);
}
function getTrainableLockedMoves(p){
 const known = new Set((p.moves||[]).map(m=>typeof m==='string'?m:m.id).filter(Boolean));
 // Phase 10: training only offers the "training" category
 // (global learnable pool − level pool − TM/HM), not the global list of
 // all learnable moves. Level moves unlock by
 // level-up, the TM/HM by using the item.
 const pool = (typeof getSpeciesTrainingOnlyPool === 'function') ? getSpeciesTrainingOnlyPool(p.id) : getTrainingLockedMoves(p);
 return pool.filter(id => !known.has(id) && isMoveTrainingLocked(p, id));
}
function getUnlockedTalentListForSpecies(id){
 return (G.unlockedTalents && G.unlockedTalents[id]) ? G.unlockedTalents[id] : [];
}
function getTrainableTalents(p){
 // Phase 24: lookup tolerant the casse (old saves camelCase).
 const recOf = (typeof getTalentRecord === 'function') ? getTalentRecord : (x) => ((typeof TALENTS_FULL !== 'undefined') ? TALENTS_FULL[x] : null);
 const all = (typeof getSpeciesTalents === 'function' ? getSpeciesTalents(p.id) : []).filter(tal => !!recOf(tal));
 const known = new Set(getUnlockedTalentListForSpecies(p.id));
 const knownLow = new Set([...known].map(k => String(k).toLowerCase()));
 return all.filter(tal => !known.has(tal) && !knownLow.has(String(tal).toLowerCase()));
}
function rollTrainingTalent(p){
 const recOf = (typeof getTalentRecord === 'function') ? getTalentRecord : (x) => ((typeof TALENTS_FULL !== 'undefined') ? TALENTS_FULL[x] : null);
 const all = (typeof getSpeciesTalents === 'function' ? getSpeciesTalents(p.id) : []).filter(tal => !!recOf(tal));
 if(!all.length) return null;
 const weighted=[];
 all.forEach(tal=>{
   const rarity = recOf(tal).rarity || 1;
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
 if (typeof window !== 'undefined' && typeof window.refreshLearnableMovesPanelIfOpen === 'function') window.refreshLearnableMovesPanelIfOpen();
 if((p.moves||[]).length < 4){
   p.moves.push({id:moveId});
 }
 return moveId;
}

const TRAINING_MULTI_SLOT_COST = 750000;
let _trainingSlotTicker = null;
const _lastTrainingPanelRenderAt = 0;
function appSetInterval(name, callback, delay){
 if(typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers?.set) return PokeWorldTimers.set(name, callback, delay);
 return setInterval(callback, delay);
}

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
// Wave 41 — fallback kept for sandboxes: tests graft a
// fixture version onto the global object (the bare call read classic script
// scope; in an ESM module it would read the closure). The global version wins
// when different (in prod, the shim places the same reference → local path).
function _pwTrainingModeAvailability(p){ const g = (typeof globalThis !== 'undefined') ? globalThis.trainingModeAvailability : null; return (typeof g === 'function' && g !== trainingModeAvailability) ? g(p) : trainingModeAvailability(p); }

function trainingModeAvailability(trainee){
 if(!trainee) return {move:false,talent:false,ev:false,level:false,hidden:false,totalEvs:0};
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const totalEvs = Object.values(trainee.evs).reduce((a,b)=>a+b,0);
 let hiddenAvail = false;
 try{
  if(typeof tryUnlockHiddenAbility==="function"){
   const nid=Number(trainee.id);
   const pt=(typeof POKEMON_TALENTS!=="undefined")?POKEMON_TALENTS:(globalThis.POKEMON_TALENTS||{});
   hiddenAvail = !!(pt[nid]&&pt[nid].hiddenAbility&&!(G.unlockedTalents&&G.unlockedTalents[nid]&&G.unlockedTalents[nid].includes(pt[nid].hiddenAbility)));
  }
 } catch(_e){}
 return {
  move: getTrainableLockedMoves(trainee).length > 0,
  talent: getTrainableTalents(trainee).length > 0,
  ev: totalEvs < 36,
  level: (trainee.level||1) < 100,
  hidden: hiddenAvail,
  totalEvs
 };
}// Phase 24: a League victory NEVER registers the 'elite4' badge in
// G.badges (battle-switch.js calls markRegionLeagueWon instead) — without this
// fix, the ability / hidden-ability workshop stayed locked forever.
function isLeagueBeaten(){
  if(typeof isRegionLeagueWon === 'function' && (isRegionLeagueWon('kanto') || isRegionLeagueWon('johto'))) return true;
  if(G && (G.championTitle || G.leagueWon)) return true;
  return !!(G && G.badges && (G.badges.includes('elite4') || G.badges.includes('johto_elite4')));
}
function isTrainingModeUnlocked(mode){
  if(mode === 'move') return true;
  if(mode === 'level') return !!(G.badges && G.badges.includes('blaine'));
  if(mode === 'ev') return !!(G.badges && G.badges.includes('giovanni'));
  if(mode === 'talent') return isLeagueBeaten();
  if(mode === 'hidden') return isLeagueBeaten();
  return true;
}

// UI overhaul: trainingButtonHtml now returns a MODE MODEL — the actual
// markup is owned by the DS MachineWindow component (unusable modes render
// as INFORMATIONAL rows, never as fake buttons — design-system rule).
function trainingModeModel(mode, enabled, slotIndex){
 // Each training mode carries a dedicated color class
 // (training-mode--<mode>) to be recognizable at a glance, with a
 // matching hover state (see pw-unified.css).
 const modeCls = `training-mode--${mode}`;
 if(!isTrainingModeUnlocked(mode)){
   const reqGym = mode === 'level' ? (typeof t==='function'?t('req_gym_level'):'Blaine (Cinnabar)') : mode === 'ev' ? (typeof t==='function'?t('req_gym_ev'):'Giovanni (Viridian)') : (typeof t==='function'?t('req_league_kanto'):'the Kanto League');
   return { classes: modeCls, title: `🔒 ${getTrainingModeLabel(mode)}`,
     descHtml: `${typeof t==='function'?t('unlocked_after'):'Unlocked after '}${reqGym}`, clickable: false };
 }
 return { classes: modeCls, title: getTrainingModeLabel(mode),
   descHtml: getTrainingModeDescription(mode, enabled), clickable: !!enabled,
   call: 'startTrainingBattle', callArgs: `'${mode}', ${slotIndex}` };
}
function trainingBattleHpPct(p){ return clamp(Math.floor(((p && p.maxHP) ? (p.currentHP / p.maxHP) : 0) * 100), 0, 100); }
function trainingBattlePctClass(p){ return 'pct-' + Math.max(0, Math.min(100, Math.round(trainingBattleHpPct(p) / 5) * 5)); }
function trainingCdPctClass(cur, max){
 const pct = max ? clamp(Math.floor(100 - ((cur || 0) / max) * 100), 0, 100) : 0;
 return 'pct-' + Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
}
function trainingCdPctValue(cur, max){ return max ? clamp(Math.floor(100 - ((cur || 0) / max) * 100), 0, 100) : 0; }
function setTrainingPct(el, pct){ if(el){ el.dataset.pct = String(pct); el.style.width = pct + '%'; } }
function updateTrainingLiveProgress(){
 if(!G || !Array.isArray(G.trainingSlots)) return;
 for(let i=0;i<G.trainingSlots.length;i++){
  const slot = G.trainingSlots[i];
  if(!slot || !slot.active || !slot.battle) continue;
  const card = document.querySelector(`[data-training-slot-card="${i}"]`);
  if(!card) continue;
  const trainee = findPokemonByTrainingSlot(slot);
  const tb = slot.battle;
  const enemy = tb.enemy || (tb.enemies ? tb.enemies[tb.enemyIndex||0] : null);
  if(!trainee || !enemy) continue;
  setTrainingPct(card.querySelector('[data-training-fill="player-hp"]'), trainingBattleHpPct(trainee));
  setTrainingPct(card.querySelector('[data-training-fill="enemy-hp"]'), trainingBattleHpPct(enemy));
  setTrainingPct(card.querySelector('[data-training-fill="player-cd"]'), trainingCdPctValue(tb.pCd, tb.pCdMax));
  setTrainingPct(card.querySelector('[data-training-fill="enemy-cd"]'), trainingCdPctValue(tb.eCd, tb.eCdMax));
  const pText = card.querySelector('[data-training-text="player-hp"]'); if(pText) pText.textContent = `${trainee.currentHP}/${trainee.maxHP} PV`;
  const eText = card.querySelector('[data-training-text="enemy-hp"]'); if(eText) eText.textContent = `${enemy.currentHP}/${enemy.maxHP} PV`;
  // Move names: updated IN PLACE (no DOM rebuild, otherwise the buttons
  // "shake" and swallow clicks at ×3/×10 speed).
  const pMoves = (trainee.moves||[]);
  const eMoves = (enemy.moves||[]);
  const pMv = pMoves[(tb.pMoveIdx||0) % Math.max(1, pMoves.length)];
  const eMv = eMoves[(tb.eMoveIdx||0) % Math.max(1, eMoves.length)];
  const pMoveEl = card.querySelector('[data-training-text="player-move"]');
  if(pMoveEl) pMoveEl.textContent = pMv ? getMoveName(pMv.id) : '-';
  const eMoveEl = card.querySelector('[data-training-text="enemy-move"]');
  if(eMoveEl) eMoveEl.textContent = eMv ? getMoveName(eMv.id) : '-';
 }
}
// Structural signature of the live panel: it only changes when the
// STRUCTURE changes (slot, round, enemy, mode, language). As long as it
// stays identical, the panel is not rebuilt → the "Forfeit" button stays clickable.
let _trainingBattlePanelSig = '';
function trainingBattlePanelSignature(activeSlots){
 const lang = (typeof currentLang === 'function') ? currentLang() : ((G && G.lang) || '');
 return lang + '|' + activeSlots.map(({slot, i})=>{
  const tb = slot.battle || {};
  const trainee = findPokemonByTrainingSlot(slot);
  const enemy = tb.enemy || (tb.enemies ? tb.enemies[tb.enemyIndex||0] : null);
  return [i, tb.mode||'', tb.enemyIndex||0, (tb.enemies && tb.enemies.length) || 0, (trainee && trainee.uid) || '-', (enemy && enemy.id) || 0, (enemy && enemy.name) || ''].join(':');
 }).join('|');
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
 const offset = mode === 'move' ? -2 : (mode === 'talent' || mode === 'hidden') ? -1 : mode === 'level' ? 2 : 0;
 const bLv = Math.max(3, (trainee.level || 15) + offset);
 let reqCount = 6;
 try {
   const active = (G.staff && G.staff.active && G.staff.active.training) || [];
   if (active.includes('trainer_saffron')) {
     const lvl = (typeof staffLevel === 'function') ? staffLevel('trainer_saffron') : 1;
     const red = Math.round(3 * (lvl - 1) / 99);
     reqCount = Math.max(3, Math.min(6, 6 - red));
   }
 } catch(_){}
 const team = pickTrainingBots(trainee, mode, bLv).slice(0, reqCount);
 while(team.length < reqCount){
  const fallback = createPoke([132,137,113,122,185,143][team.length%6], bLv, false);
  if(fallback) team.push(fallback); else break;
 }
 team.forEach((enemy, i)=>{
  if(!enemy) return;
  enemy.name = `Coach ${i+1} — ${getPokeName(enemy.id)}`;
  enemy.currentHP = enemy.maxHP;
  enemy.status = null;
  enemy.statusTurns = 0;
 });
 return team.filter(Boolean);
}
function trainingHealBetweenRounds(trainee){
 if(!trainee) return;
 trainee.currentHP = trainee.maxHP;
 trainee.status = null;
 trainee.statusTurns = 0;
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
function trainingMoveDamage(attacker, defender, moveId, side='player'){
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
 const atk = (isSpec ? (attacker.spa || attacker.atk) : attacker.atk) * (1 + atkBuff);
 const def = Math.max(1, (isSpec ? (defender.spd || defender.def) : defender.def) * (1 + defBuff));
 const power = mv.pow;
 const stab = (attacker.type1 === mv.type || attacker.type2 === mv.type) ? 1.5 : 1;
 const crit = (mv.crit && chance(15)) ? 1.5 : 1;
 const randMult = rand(85,100) / 100;
 let dmg = Math.max(1, Math.floor(((2*(attacker.level||1)/5+2)*power*atk/def/50+2)*stab*eff*crit*randMult));
 const staffEase = (typeof getStaffBonus === 'function') ? getStaffBonus('training','training_ease') : 0;
 if(side === 'player' && staffEase) dmg = Math.max(1, Math.floor(dmg * (1 + staffEase)));
 if(side === 'enemy' && staffEase) dmg = Math.max(1, Math.floor(dmg * (1 - staffEase)));
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
 const res = trainingMoveDamage(attacker, defender, mv.id, side);
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
 } else if(mode === 'hidden'){
   if(typeof tryUnlockHiddenAbility === 'function') tryUnlockHiddenAbility(trainee);
   rewardMsg = (typeof t === 'function' ? t('hidden_talent_unlocked') : '★ Talent Caché débloqué !');
  } else if(mode === 'talent'){
  const chosen = (typeof rollTrainingTalent === 'function') ? rollTrainingTalent(trainee) : null;
  if(chosen){
   if(!G.unlockedTalents) G.unlockedTalents = {};
   if(!G.unlockedTalents[trainee.id]) G.unlockedTalents[trainee.id] = [];
   const wasNew = !G.unlockedTalents[trainee.id].includes(chosen);
   if(wasNew) G.unlockedTalents[trainee.id].push(chosen);
   trainee.talent = chosen;
   rewardMsg = ` (${wasNew?(typeof t==='function'?t('new_talent'):'Nouveau talent'):(typeof t==='function'?t('talent_confirmed'):'Talent confirmé')} : ${getTalentName(chosen)})`;
  } else rewardMsg = ' (' + (typeof t === 'function' ? t('no_talent_available') : 'aucun talent disponible') + ')';
 } else if(mode === 'move'){
  const unlocked = (typeof unlockTrainingMove === 'function') ? unlockTrainingMove(trainee) : null;
  rewardMsg = unlocked ? ` (${typeof t==='function'?t('move_unlocked'):'Capacité débloquée'} : ${getMoveName(unlocked)})` : ' ('+(typeof t==='function'?t('all_moves_unlocked'):'toutes les capacités sont déjà débloquées')+')';
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
 const _enemyName = slot.battle && slot.battle.enemy ? slot.battle.enemy.name : '';
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
  slot.lastResult = '_RES_:success:' + mode + ':' + (rewardMsg || '');
  notify(tr('training_complete', {reward:rewardMsg}), 'var(--green)');
 } else {
  trainee.currentHP = trainee.maxHP;
  slot.lastResult = '_RES_:failed:' + mode;
  notify(tr('training_slot_failed', {name:trainee.name}), 'var(--red)');
 }
 if(typeof addStaffXp === 'function') addStaffXp('training', success ? 1 : 0.5);
 if(success) {
   try {
     const active = (G.staff && G.staff.active && G.staff.active.training) || [];
     if (active.includes('trainer_blackthorn')) {
       const lvl = (typeof staffLevel === 'function') ? staffLevel('trainer_blackthorn') : 1;
       if (Math.random() < (0.002 * lvl)) {
         const drops = ['potion', 'superpotion', 'oran_berry', 'sitrus_berry'];
         const pick = drops[Math.floor(Math.random() * drops.length)];
         if (typeof addToInventory === 'function') addToInventory(pick, 1);
       }
     }
   } catch(_){}
 }
 updateHeader();
 renderTeamWindow();
 renderTrainingBattlePanel();
 saveGame();
  const autoCfg = (G.trainingAutomation && G.trainingAutomation.slots) ? G.trainingAutomation.slots[idx] : null;
  const autoActive = !!(autoCfg && autoCfg.enabled && (typeof isTrainingAutomationPurchased === 'function' ? isTrainingAutomationPurchased(idx) : false));
  if(autoActive && success){
   // Phase 24 — SINGLE rule for both slots: stay on the Pokemon as long as
   // an UNLOCKED training of its chain remains useful, then free the slot
   // and the queue advances. Previously, the "do everything" chain
   // launched locked sessions or looped endlessly on the same
   // Pokemon while the other slot jumped ahead too early.
   const nextMode = trainingAutomationEligible(trainee, mode) ? resolveTrainingAutoMode(trainee, autoCfg) : null;
   if(nextMode){
    try{ startTrainingBattle(nextMode, idx); }catch(_){}
   } else {
    // clearTrainingSlot also purges selectedTraineeUid — otherwise
    // ensureTrainingSlots would immediately reinstall the same Pokemon
    // and the queue would never advance.
    clearTrainingSlot(idx);
    try{ processTrainingAutomationQueues(); }catch(_){}
   }
  } else {
   let freed = false;
   if(success && !hasAnyUnlockedTrainingAvailable(trainee) && G.trainingSlots && G.trainingSlots[idx]){
    clearTrainingSlot(idx);
    freed = true;
   }
   // Without automation, the next queued Pokemon TAKES the freed slot
   // (without starting a battle: the player picks the session themselves).
   if(freed){ try{ pullNextQueuedTraining(idx); }catch(_){} }
   try{ processTrainingAutomationQueues(); }catch(_){}
  }
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
   // Phase 30: each training opponent knocked out counts for the
   // hatchery (incubation + daycare, depending on the slot's mode) —
   // live and FF.
   try{ if(typeof hatcheryRegisterBattleKills === 'function') hatcheryRegisterBattleKills(1); }catch(_){ }
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
  // Training/team windows: rebuilt only on a structural change
  // (signature). During battle ticks they stay frozen so that buttons
  // never move under the cursor (phase 14).
  try{ maybeRenderTrainingWindowTick(); }catch(_){}
 }
}
// Structural signature of the training window: slots, active state,
// mode — rebuilt only when one of these changes. Pure ticks (HP,
// cooldowns) are not part of it.
let _trainingWindowTickSig = '';
function trainingWindowSignature(){
 const a = (G.trainingAutomation && G.trainingAutomation.slots) || [];
 const lang = (typeof currentLang === 'function') ? currentLang() : ((G && G.lang) || '');
 const parts = [lang, G.trainingMultiSlot ? 1 : 0, getTrainingSlotCount(), (G.badges||[]).length];
 (G.trainingSlots||[]).forEach(function(slot, i){
  const t = slot ? findPokemonByTrainingSlot(slot) : null;
  const au = a[i] || {};
  const evTotal = t ? Object.values(t.evs||{}).reduce(function(x,y){ return x + (Number(y)||0); }, 0) : -1;
  parts.push([i, (slot && slot.active) ? 1 : 0, (slot && slot.uid) || '', (slot && slot.lastResult) || '', au.enabled ? 1 : 0, (typeof isTrainingAutomationPurchased === 'function' && isTrainingAutomationPurchased(i)) ? 1 : 0, t ? t.level : -1, evTotal, t ? (t.moves||[]).length : -1].join(':'));
 });
 return parts.join('|');
}
function maybeRenderTrainingWindowTick(){
 const sig = trainingWindowSignature();
 if(sig === _trainingWindowTickSig) return;
 _trainingWindowTickSig = sig;
 try{ renderTrainingWindow(); }catch(_){}
 try{ renderTeamWindow(); }catch(_){}
}
function startTrainingSlotTicker(){
 if(_trainingSlotTicker) return;
 _trainingSlotTicker = appSetInterval('training', ()=>{
  updateTrainingSlots();
  if(Array.isArray(G.trainingSlots) && G.trainingSlots.some(s=>s && s.active)){
   try{ updateTrainingLiveProgress(); }catch(_){}
  } else {
   try{ processTrainingAutomationQueues(); }catch(_){}
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
 }
 slot.active = false;
 slot.mode = null;
 slot.battle = null;
 slot.lastResult = '_KEY_:training_slot_cancelled';
 const a = ensureTrainingAutomation();
 if(a.slots[idx]) a.slots[idx].enabled = false;
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
  // Wave 17 (user feedback): the live training panel goes at the TOP of
  // the scene — same place a real battle's own cards occupy — not under
  // the battle chrome row.
  activeScene.insertBefore(panel, activeScene.firstChild);
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
  _trainingBattlePanelSig = '';
  panel.replaceChildren();
  panel.classList.remove('open');
  const chromeOff = leaveBtn ? leaveBtn.closest('.pw-static-038') : null;
  if(chromeOff) chromeOff.style.display = ''; // wave 17: restore the battle chrome for real battles
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
  // Wave 17 (user feedback): during a pure training session the battle
  // chrome (resume/forfeit buttons) is useless — HIDE the whole row
  // instead of just renaming/disabling the leave button.
  const chrome = leaveBtn.closest('.pw-static-038');
  if(chrome) chrome.style.display = 'none';
  leaveBtn.disabled = true;
  leaveBtn.textContent = t('training_live_running');
 }
 if(typeof battle !== 'undefined' && battle && !battle.active){
  const row = document.getElementById('battle-team-row');
  if(row) row.replaceChildren();
 }
 // Phase 14 — stable live panel: the ticker fires several times per
 // second; rebuilding innerHTML each time used to recreate the buttons
 // mid-click (unreachable "Forfeit"). We only rebuild when the STRUCTURE
 // changes — the rest is patched in place by
 // updateTrainingLiveProgress().
 const battleSig = trainingBattlePanelSignature(activeSlots);
 if(battleSig === _trainingBattlePanelSig && panel.classList.contains('open')) return;
 _trainingBattlePanelSig = battleSig;
 panel.classList.add('open');
 _pwSetHtmlSafe(panel, `<div class="training-live-title">${typeof getIcon==='function'?getIcon('battle',16):''} ${t('training_live_title')}</div>` + activeSlots.map(({slot, i})=>{
  const trainee = findPokemonByTrainingSlot(slot);
  const tb = slot.battle;
  if(!Array.isArray(tb.enemies) && tb.enemy) tb.enemies = [tb.enemy];
  const enemy = tb.enemy || (tb.enemies ? tb.enemies[tb.enemyIndex||0] : null);
  if(!trainee || !enemy) return '';
  const pHpClass = trainingBattleHpPct(trainee) > 50 ? 'high' : trainingBattleHpPct(trainee) > 20 ? 'medium' : 'low';
  const eHpClass = trainingBattleHpPct(enemy) > 50 ? 'high' : trainingBattleHpPct(enemy) > 20 ? 'medium' : 'low';
  const pMove = (trainee.moves||[])[(tb.pMoveIdx||0) % Math.max(1,(trainee.moves||[]).length)];
  const eMove = (enemy.moves||[])[(tb.eMoveIdx||0) % Math.max(1,(enemy.moves||[]).length)];
  return `<div class="training-live-card" data-training-slot-card="${i}">
   <div class="training-live-head"><b>${tr('training_slot_title', {slot:i+1})}</b><span>${getTrainingModeLabel(tb.mode)} · ${tr('training_round_label', {round:(tb.enemyIndex||0)+1, total:(tb.enemies||[]).length||1})}</span></div>
   <div class="training-live-duel">
    <div class="training-live-poke">
     <div class="training-live-sprite" data-context-call="openTrainingSlotPokeModal" data-context-args="${i}">${spriteImg(trainee.id, trainee.emoji, {size:70, shiny:trainee.shinyActive})}</div>
     <b>${trainee.name}</b><span>Nv.${trainee.level}</span>
     <div class="hp-bar"><div class="hp-fill ${pHpClass}" data-training-fill="player-hp" data-pct="${trainingBattleHpPct(trainee)}"></div></div>
     <small data-training-text="player-hp">${trainee.currentHP}/${trainee.maxHP} PV</small>
     <div class="training-live-move" data-training-text="player-move">${pMove ? getMoveName(pMove.id) : '-'}</div>
     <div class="training-live-cd"><div class="training-cd-fill" data-training-fill="player-cd" data-pct="${trainingCdPctValue(tb.pCd, tb.pCdMax)}"></div></div>
    </div>
    <div class="training-live-vs">VS</div>
    <div class="training-live-poke enemy">
     <div class="training-live-sprite">${spriteImg(enemy.id, enemy.emoji, {size:70, shiny:enemy.shinyActive})}</div>
     <b>${enemy.name}</b><span>Nv.${enemy.level}</span>
     <div class="hp-bar"><div class="hp-fill ${eHpClass}" data-training-fill="enemy-hp" data-pct="${trainingBattleHpPct(enemy)}"></div></div>
     <small data-training-text="enemy-hp">${enemy.currentHP}/${enemy.maxHP} PV</small>
     <div class="training-live-move" data-training-text="enemy-move">${eMove ? getMoveName(eMove.id) : '-'}</div>
     <div class="training-live-cd"><div class="training-cd-fill" data-training-fill="enemy-cd" data-pct="${trainingCdPctValue(tb.eCd, tb.eCdMax)}"></div></div>
    </div>
   </div>
   <button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="cancelTrainingSlot" data-call-args="${i}">${typeof getIcon==='function'?getIcon('close',14):''} ${t('training_slot_cancel')}</button>
  </div>`;
 }).join(''));
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
const TRAINING_AUTOMATION_SLOT_COST = 1000000;
const TRAINING_QUEUE_UPGRADE_COSTS = [250000, 750000, 1500000, 3000000];
function getTrainingQueueLimit(){
 const a = ensureTrainingAutomation();
 return 3 + clamp(a.queueUpgradeLevel || 0, 0, TRAINING_QUEUE_UPGRADE_COSTS.length) * 3;
}
function getTrainingQueueUpgradeCost(){
 const a = ensureTrainingAutomation();
 return TRAINING_QUEUE_UPGRADE_COSTS[a.queueUpgradeLevel || 0] || null;
}
function upgradeTrainingQueueSize(){
 const cost = getTrainingQueueUpgradeCost();
 if(!cost){ notify(t('queue_size_maxed'), 'var(--green)'); return; }
 if(G.money < cost){ notify(t('n.pas_assez_dargent'), 'var(--red)'); return; }
 G.money -= cost;
 const a = ensureTrainingAutomation();
 a.queueUpgradeLevel = (a.queueUpgradeLevel || 0) + 1;
 updateHeader(); saveGame();
 notify(tr('queue_size_upgraded', {count:getTrainingQueueLimit()}), 'var(--green)');
 try{ openTrainingManagementMenu('automation'); }catch(_){}
}
function ensureTrainingAutomation(){
 if(!G.trainingAutomation || typeof G.trainingAutomation !== 'object') G.trainingAutomation = {};
 if(!G.trainingAutomation.purchasedSlots || typeof G.trainingAutomation.purchasedSlots !== 'object') G.trainingAutomation.purchasedSlots = {};
 if(!Array.isArray(G.trainingAutomation.slots)) G.trainingAutomation.slots = [];
 for(let i=0;i<2;i++){
  if(!G.trainingAutomation.slots[i]) G.trainingAutomation.slots[i] = {enabled:false, mode:'ev', filterShiny:'all', filterEv:'all', sort:'ev_asc', queue:[]};
  const cfg = G.trainingAutomation.slots[i];
  if(!cfg.mode) cfg.mode = 'ev';
  if(!cfg.filterShiny) cfg.filterShiny = 'all';
  if(!cfg.filterEv) cfg.filterEv = cfg.filterIv || 'all';
  if(!cfg.sort || cfg.sort === 'iv_desc' || cfg.sort === 'iv_asc') cfg.sort = 'ev_asc';
  if(!Array.isArray(cfg.queue)) cfg.queue = [];
 }
 return G.trainingAutomation;
}
function isTrainingAutomationPurchased(slotIndex){
 const a = ensureTrainingAutomation();
 return !!a.purchasedSlots[String(slotIndex)];
}
function buyTrainingAutomationSlot(slotIndex){
 const idx = clamp(Number(slotIndex)||0, 0, 1);
 if(isTrainingAutomationPurchased(idx)){ notify(t('automation_already_bought'), 'var(--green)'); return; }
 if(G.money < TRAINING_AUTOMATION_SLOT_COST){ notify(tr('automation_upgrade_need_money', {price:TRAINING_AUTOMATION_SLOT_COST.toLocaleString()}), 'var(--red)'); return; }
 G.money -= TRAINING_AUTOMATION_SLOT_COST;
 const a = ensureTrainingAutomation();
 a.purchasedSlots[String(idx)] = true;
 updateHeader();
 saveGame();
 notify(tr('automation_upgrade_bought', {name:tr('training_slot_title',{slot:idx+1}), price:TRAINING_AUTOMATION_SLOT_COST.toLocaleString()}), 'var(--green)');
 openTrainingManagementMenu('automation');
}
function setTrainingAutomationOption(slotIndex, key, value){
 const idx = clamp(Number(slotIndex)||0, 0, 1);
 const a = ensureTrainingAutomation();
 a.slots[idx][key] = value;
 saveGame();
 openTrainingManagementMenu('automation');
}
function toggleTrainingAutomationSlot(slotIndex, openMenu=true){
 const idx = clamp(Number(slotIndex)||0, 0, 1);
 if(!isTrainingAutomationPurchased(idx)){ buyTrainingAutomationSlot(idx); return; }
 const a = ensureTrainingAutomation();
 const willEnable = !a.slots[idx].enabled;
 if(willEnable && typeof battle !== 'undefined' && battle && battle.active){
  notify(t('battle_in_progress_no_training'), 'var(--red)');
  return;
 }
 a.slots[idx].enabled = willEnable;
 saveGame();
 if(willEnable) processTrainingAutomationQueues();
 renderTrainingWindow();
 try{ renderTrainingBattlePanel(); }catch(_){}
 if(openMenu) openTrainingManagementMenu('automation');
}
function trainingAutomationEligible(p, mode){
 if(!p || p.locked) return false;
 if(mode === 'all') return hasAnyUnlockedTrainingAvailable(p);
 // Phase 24: a still-LOCKED mode (abilities before the League, EV before
 // Giovanni…) is never eligible — the automation must skip it.
 if(typeof isTrainingModeUnlocked === 'function' && !isTrainingModeUnlocked(mode)) return false;
 if(mode === 'ev') return Object.values(p.evs||{}).reduce((a,b)=>a+(Number(b)||0),0) < 36;
 if(mode === 'talent') return getTrainableTalents(p).length > 0;
 if(mode === 'move') return getTrainableLockedMoves(p).length > 0;
 if(mode === 'level') return (p.level||1) < 100;
  if(mode === 'hidden') return typeof tryUnlockHiddenAbility === 'function' && (function(){ const nid=Number(p.id); const pt=(typeof POKEMON_TALENTS!=='undefined')?POKEMON_TALENTS:(globalThis.POKEMON_TALENTS||{}); return pt[nid] && pt[nid].hiddenAbility && !(G.unlockedTalents&&G.unlockedTalents[nid]&&G.unlockedTalents[nid].includes(pt[nid].hiddenAbility)); })();
 return hasAnyTrainingAvailable(p);
}
function resolveTrainingAutoMode(p, cfg){
 const wanted = (cfg && cfg.mode) || 'ev';
 if(wanted !== 'all') return (typeof isTrainingModeUnlocked === 'function' && !isTrainingModeUnlocked(wanted)) ? null : wanted;
 // Phase 24: "do all" only chains sessions that are UNLOCKED and still
 // useful — before this fix, "do all" would start the ability/hidden
 // workshop even when locked instead of moving to the next training.
 const order = ['talent','hidden','move','ev','level'];
 for(const m of order){
  if(typeof isTrainingModeUnlocked === 'function' && !isTrainingModeUnlocked(m)) continue;
  if(trainingAutomationEligible(p, m)) return m;
 }
 return null;
}
function trainingAutomationCandidates(slotIndex){
 const a = ensureTrainingAutomation();
 const cfg = a.slots[slotIndex];
 const mode = cfg.mode || 'ev';
 const list=[];
 for(const k in (G.collection||{})){
  const p = G.collection[k];
  if(!p) continue;
  if(typeof ensurePokemonUid === 'function') ensurePokemonUid(p); else if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2,9);
  if((G.team||[]).some(tp=>tp && tp.uid === p.uid)) continue;
  if(!trainingAutomationEligible(p, mode)) continue;
  const shiny = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id));
  if(cfg.filterShiny === 'non_shiny' && shiny) continue;
  if(cfg.filterShiny === 'shiny' && !shiny) continue;
  const ivTotal = (typeof pokemonIvTotal==='function'?pokemonIvTotal(p):0);
  const evTotal = (typeof pokemonEvTotal==='function'?pokemonEvTotal(p):0);
  if(cfg.filterEv === 'complete' && evTotal < 36) continue;
  if(cfg.filterEv === 'incomplete' && evTotal >= 36) continue;
  if (cfg.filterFav === 'fav_only' && !(p.favorite || p.fav || p.locked)) continue;
  if (cfg.filterFav === 'no_fav' && (p.favorite || p.fav || p.locked)) continue;
  if (cfg.filterRegion && cfg.filterRegion !== 'all') {
    const nid = Number(p.id);
    const reg = nid <= 151 ? 'kanto' : nid <= 251 ? 'johto' : 'hoenn';
    if (reg !== cfg.filterRegion) continue;
  }
  if (cfg.filterRank && cfg.filterRank !== 'all') {
    const ivTotalVal = typeof pokemonIvTotal === 'function' ? pokemonIvTotal(p) : 0;
    if (cfg.filterRank === 'S_or_better' && ivTotalVal < 24) continue;
    if (cfg.filterRank === 'A_or_worse' && ivTotalVal >= 24) continue;
  }
  if (cfg.filterType && cfg.filterType !== 'all') {
    const t1 = String(p.type1 || '').toLowerCase();
    const t2 = String(p.type2 || '').toLowerCase();
    if (t1 !== cfg.filterType && t2 !== cfg.filterType) continue;
  }
  list.push({key:k, uid:p.uid, p, iv:ivTotal, ev:evTotal, talents:getTrainableTalents(p).length, moves:getTrainableLockedMoves(p).length, levelMissing:(p.level||1)<100?1:0});
 }
 const sort = cfg.sort || 'ev_asc';
 list.sort((a,b)=>{
  if(sort === 'ev_desc') return b.ev - a.ev || a.p.id - b.p.id;
  if(sort === 'level_desc') return (b.p.level||1) - (a.p.level||1) || a.ev - b.ev;
  if(sort === 'level_asc') return (a.p.level||1) - (b.p.level||1) || a.ev - b.ev;
  if(sort === 'talent_missing') return b.talents - a.talents || a.ev - b.ev;
  if(sort === 'move_missing') return b.moves - a.moves || a.ev - b.ev;
  if(sort === 'level_missing') return b.levelMissing - a.levelMissing || (a.p.level||1) - (b.p.level||1);
  if(sort === 'dex') return (a.p.id||0) - (b.p.id||0);
  return a.ev - b.ev || (a.p.level||1) - (b.p.level||1);
 });
 return list;
}
function rebuildTrainingQueue(slotIndex){
 const idx = clamp(Number(slotIndex)||0, 0, 1);
 cleanTrainingQueue(idx);
 saveGame();
 openTrainingManagementMenu('automation');
 notify(t('queue_refreshed'), 'var(--green)');
}
function findPokemonByUidAnywhere(uid){
 for(const p of (G.team||[])) if(p && p.uid === uid) return {p, loc:'team', idStr:String(G.team.indexOf(p))};
 for(const k in (G.collection||{})) if(G.collection[k] && G.collection[k].uid === uid) return {p:G.collection[k], loc:'box', idStr:k};
 return null;
}
function cleanTrainingQueue(slotIndex){
 const a = ensureTrainingAutomation();
 const cfg = a.slots[slotIndex];
 const seen = new Set();
 cfg.queue = (cfg.queue||[]).filter(uid=>{
  if(!uid || seen.has(uid)) return false;
  seen.add(uid);
  const found = findPokemonByUidAnywhere(uid);
  if(!found || found.loc !== 'box') return false;
  return trainingAutomationEligible(found.p, cfg.mode || 'ev');
 });
 return cfg.queue;
}
function refillTrainingQueueFromRules(slotIndex){
 const a = ensureTrainingAutomation();
 const cfg = a.slots[slotIndex];
 cleanTrainingQueue(slotIndex);
 const cap = getTrainingQueueLimit();
 let added = 0;
 const queued = new Set(cfg.queue || []);
 const busy = new Set((G.trainingSlots||[]).filter(Boolean).map(slot => slot.uid).filter(Boolean));
 if(G.hatcheryQueue) for(const uid of G.hatcheryQueue) busy.add(uid);
 for(const entry of trainingAutomationCandidates(slotIndex)){
  if((cfg.queue||[]).length >= cap) break;
  if(queued.has(entry.uid) || busy.has(entry.uid)) continue;
  cfg.queue.push(entry.uid);
  queued.add(entry.uid);
  added++;
 }
 return added;
}
function processTrainingAutomationQueues(){
 const a = ensureTrainingAutomation();
 if(typeof battle !== 'undefined' && battle && battle.active) return false;
 ensureTrainingSlots();
 let changed = false;
 for(let i=0;i<getTrainingSlotCount();i++){
  const slot = G.trainingSlots && G.trainingSlots[i];
  const cfg = a.slots[i];
  if(!cfg || !cfg.enabled || !isTrainingAutomationPurchased(i)) continue;
  cleanTrainingQueue(i);
  const added = refillTrainingQueueFromRules(i);
  if(added) changed = true;
  if(slot && slot.active) continue;
  if(slot && slot.uid){
   const current = findPokemonByTrainingSlot(slot);
   if(current && trainingAutomationEligible(current, cfg.mode || 'ev')){
    startTrainingBattle(resolveTrainingAutoMode(current, cfg), i);
    changed = true;
    continue;
   }
   if(current && !hasAnyTrainingAvailable(current)){
    G.trainingSlots[i] = {uid:null, loc:null, idStr:null, active:false};
   } else if(current) {
    continue;
   }
  }
  while(cfg.queue.length){
   const uid = cfg.queue.shift();
   const found = findPokemonByUidAnywhere(uid);
   if(!found || found.loc !== 'box') continue;
   if(!trainingAutomationEligible(found.p, cfg.mode || 'ev')) continue;
   setTrainingSlotPokemon(i, found.loc, found.idStr, found.p);
   startTrainingBattle(resolveTrainingAutoMode(found.p, cfg), i);
   changed = true;
   break;
  }
 }
 if(changed) saveGame();
 return changed;
}
// Phase 24: pulls the next queued Pokemon into a FREED slot without
// starting a training (manual use — the player then picks the session).
function pullNextQueuedTraining(slotIndex){
 const idx = clamp(Number(slotIndex)||0, 0, 1);
 const a = ensureTrainingAutomation();
 const cfg = a.slots[idx];
 if(!cfg || !Array.isArray(cfg.queue)) return false;
 ensureTrainingSlots();
 const slot = G.trainingSlots[idx];
 if(!slot || slot.active || slot.uid) return false;
 while(cfg.queue.length){
  const uid = cfg.queue.shift();
  const found = findPokemonByUidAnywhere(uid);
  if(!found || found.loc !== 'box') continue;
  if(!hasAnyUnlockedTrainingAvailable(found.p)) continue;
  setTrainingSlotPokemon(idx, found.loc, found.idStr, found.p);
  notify(tr('training_slot_next_from_queue', {name:found.p.name, slot:idx+1}), 'var(--light1)');
  saveGame();
  return true;
 }
 return false;
}
function isUidInAnyAutomationQueue(uid){
 if(G.hatcheryQueue && G.hatcheryQueue.includes(uid)) return true;
 const a = ensureTrainingAutomation();
 return a.slots.some(s => s && Array.isArray(s.queue) && s.queue.includes(uid));
}
function isUidTrainingActive(uid){ return !!((G.trainingSlots||[]).find(slot => slot && slot.uid === uid && slot.active)); }
function hasAnyTrainingAvailable(p){
 if(!p) return false;
 const st = _pwTrainingModeAvailability(p);
 return !!(st.move || st.talent || st.ev || st.level);
}
 // Training live battle panel and automation state
// decide if a Pokemon is "done" for the slot (otherwise still-locked
// modes kept it forever or made the queue skip).
function hasAnyUnlockedTrainingAvailable(p){
 if(!p) return false;
 const unlocked = (typeof isTrainingModeUnlocked === 'function') ? isTrainingModeUnlocked : () => true;
 const st = _pwTrainingModeAvailability(p);
 return !!(
  (st.move && unlocked('move')) ||
  (st.talent && unlocked('talent')) ||
  (st.hidden && unlocked('hidden')) ||
  (st.ev && unlocked('ev')) ||
  (st.level && unlocked('level'))
 );
}
function addPokemonToTrainingQueue(slotIndex, boxId, silent=false){
 const idx = clamp(Number(slotIndex)||0, 0, 1);
 const a = ensureTrainingAutomation();
 const cfg = a.slots[idx];
 cleanTrainingQueue(idx);
 const p = G.collection[boxId] || G.collection[String(boxId)];
 if(!p){ notify(t('pokemon_not_found'), 'var(--red)'); return false; }
 if(typeof ensurePokemonUid === 'function') ensurePokemonUid(p); else if(!p.uid) p.uid='p_'+Math.random().toString(36).substr(2,9);
 if(p.locked){ notify(t('queue_locked_rejected'), 'var(--red)'); return false; }
 if((G.team||[]).some(tp=>tp && tp.uid === p.uid)){ notify(t('queue_team_rejected'), 'var(--red)'); return false; }
 if(!hasAnyTrainingAvailable(p)){ notify(t('training_no_available'), 'var(--red)'); return false; }
 if(!trainingAutomationEligible(p, cfg.mode || 'ev')){ notify(t('training_no_available_for_mode'), 'var(--red)'); return false; }
 if(isUidTrainingActive(p.uid)){ notify(t('queue_already_busy'), 'var(--red)'); return false; }
 if(G.hatcheryQueue && G.hatcheryQueue.includes(p.uid)){ notify(t('queue_already_other'), 'var(--red)'); return false; }
 if(cfg.queue.includes(p.uid)){ notify(t('queue_already_added'), 'var(--light1)'); return false; }
 ensureTrainingSlots();
 const slot = G.trainingSlots[idx];
 if(slot && !slot.active && !slot.uid){
  setTrainingSlotPokemon(idx, 'box', boxId, p);
  if(cfg.enabled && isTrainingAutomationPurchased(idx) && !(typeof battle !== 'undefined' && battle && battle.active)){
   startTrainingBattle(resolveTrainingAutoMode(p, cfg), idx);
  }
  if(!silent) notify(tr('selected_for_training_slot', {name:p.name, slot:idx+1}), 'var(--green)');
  return 'slot';
 }
 if(cfg.queue.length >= getTrainingQueueLimit()){ notify(tr('queue_full', {count:getTrainingQueueLimit()}), 'var(--red)'); return false; }
 cfg.queue.push(p.uid);
 saveGame();
 if(!silent) notify(tr('queue_added_training', {name:p.name, slot:idx+1}), 'var(--green)');
 if(!silent){ try{ openBoxPokeModal(boxId); }catch(_){} }
 return 'queue';
}
function removePokemonFromTrainingQueue(slotIndex, uid){
 const idx = clamp(Number(slotIndex)||0, 0, 1);
 const a = ensureTrainingAutomation();
 a.slots[idx].queue = (a.slots[idx].queue||[]).filter(x=>x!==uid);
 saveGame();
 try{ openTrainingManagementMenu('automation'); }catch(_){}
}
function clearTrainingQueue(slotIndex){
 const idx = clamp(Number(slotIndex)||0, 0, 1);
 const a = ensureTrainingAutomation();
 a.slots[idx].queue = [];
 saveGame();
 try{ openTrainingManagementMenu('automation'); }catch(_){}
}
function isPokemonQueuedTraining(p){
 if(!p || !p.uid) return false;
 const a = ensureTrainingAutomation();
 return a.slots.some(s => s && Array.isArray(s.queue) && s.queue.includes(p.uid));
}
function renderTrainingQueuePreview(slotIndex, limit=24){
 const a = ensureTrainingAutomation();
 const cfg = a.slots[slotIndex];
 cleanTrainingQueue(slotIndex);
 const cap = getTrainingQueueLimit();
 const html = (cfg.queue||[]).slice(0,limit).map(uid=>{
  const found = findPokemonByUidAnywhere(uid);
  const p = found && found.p;
  if(!p) return '';
  return `<div class="queue-chip">${spriteImg(p.id,p.emoji,{size:28,shiny:p.shinyActive})}<span>${p.name} · Nv.${p.level} · IV ${typeof pokemonIvTotal==='function'?pokemonIvTotal(p):0}</span><button class="queue-remove-btn" data-action="legacy-call" data-call="removePokemonFromTrainingQueue" data-call-args="${slotIndex}, '${uid}'">✕</button></div>`;
 }).join('');
 return `<div class="queue-cap">${tr('queue_capacity', {count:(cfg.queue||[]).length, max:cap})}</div>` + (html || `<div class="dict-muted">${t('queue_empty')}</div>`);
}
// Automation rules as a structured model (labels localized here, select
// routing unchanged: setTrainingAutomationOption via the change bridge).
function trainingAutomationRulesModel(i, cfg){
 return [
  { label: t('training_auto_mode'), changeCall: 'setTrainingAutomationOption', changeArgs: `${i}, 'mode', this.value`, options: [
    {value:'all',label:t('training_auto_mode_all'),selected:cfg.mode==='all'},
    {value:'ev',label:getTrainingModeLabel('ev'),selected:cfg.mode==='ev'},
    {value:'talent',label:getTrainingModeLabel('talent'),selected:cfg.mode==='talent'},
    {value:'move',label:getTrainingModeLabel('move'),selected:cfg.mode==='move'},
    {value:'hidden',label:getTrainingModeLabel('hidden'),selected:cfg.mode==='hidden'},
    {value:'level',label:getTrainingModeLabel('level'),selected:cfg.mode==='level'},
  ]},
  { label: t('auto_filter_shiny'), changeCall: 'setTrainingAutomationOption', changeArgs: `${i}, 'filterShiny', this.value`, options: [
    {value:'all',label:t('box_filter_all_shiny'),selected:cfg.filterShiny==='all'},
    {value:'non_shiny',label:t('box_filter_non_shiny_only'),selected:cfg.filterShiny==='non_shiny'},
    {value:'shiny',label:t('box_filter_shiny_only'),selected:cfg.filterShiny==='shiny'},
  ]},
  { label: t('box_filter_ev'), changeCall: 'setTrainingAutomationOption', changeArgs: `${i}, 'filterEv', this.value`, options: [
    {value:'all',label:t('box_filter_all_ev'),selected:cfg.filterEv==='all'},
    {value:'complete',label:t('box_filter_ev_complete'),selected:cfg.filterEv==='complete'},
    {value:'incomplete',label:t('box_filter_ev_incomplete'),selected:cfg.filterEv==='incomplete'},
  ]},
      { label: (typeof t==='function'?t('filter_fav'):'Favoris'), changeCall: 'setTrainingAutomationOption', changeArgs: `${i}, 'filterFav', this.value`, options: [
        { value: 'all', label: (typeof t==='function'?t('hatchery_filter_all'):'All'), selected: cfg.filterFav === 'all' || !cfg.filterFav },
        { value: 'fav_only', label: '⭐ Favoris', selected: cfg.filterFav === 'fav_only' },
        { value: 'no_fav', label: 'Sans ⭐', selected: cfg.filterFav === 'no_fav' },
      ]},
      { label: (typeof t==='function'?t('filter_region'):'Région'), changeCall: 'setTrainingAutomationOption', changeArgs: `${i}, 'filterRegion', this.value`, options: [
        { value: 'all', label: (typeof t==='function'?t('hatchery_filter_all'):'All'), selected: cfg.filterRegion === 'all' || !cfg.filterRegion },
        { value: 'kanto', label: 'Kanto', selected: cfg.filterRegion === 'kanto' },
        { value: 'johto', label: 'Johto', selected: cfg.filterRegion === 'johto' },
        { value: 'hoenn', label: 'Hoenn', selected: cfg.filterRegion === 'hoenn' },
      ]},
      { label: (typeof t==='function'?t('filter_rank'):'Rang / IV'), changeCall: 'setTrainingAutomationOption', changeArgs: `${i}, 'filterRank', this.value`, options: [
        { value: 'all', label: (typeof t==='function'?t('hatchery_filter_all'):'All'), selected: cfg.filterRank === 'all' || !cfg.filterRank },
        { value: 'S_or_better', label: 'Rang S+', selected: cfg.filterRank === 'S_or_better' },
        { value: 'A_or_worse', label: 'Rang A-', selected: cfg.filterRank === 'A_or_worse' },
      ]},
      { label: (typeof t==='function'?t('filter_type'):'Type'), changeCall: 'setTrainingAutomationOption', changeArgs: `${i}, 'filterType', this.value`, options: [
        { value: 'all', label: (typeof t==='function'?t('hatchery_filter_all'):'All'), selected: cfg.filterType === 'all' || !cfg.filterType },
        { value: 'fire', label: 'Feu', selected: cfg.filterType === 'fire' },
        { value: 'water', label: 'Eau', selected: cfg.filterType === 'water' },
        { value: 'grass', label: 'Plante', selected: cfg.filterType === 'grass' },
        { value: 'electric', label: 'Électrik', selected: cfg.filterType === 'electric' },
        { value: 'normal', label: 'Normal', selected: cfg.filterType === 'normal' },
        { value: 'fighting', label: 'Combat', selected: cfg.filterType === 'fighting' },
        { value: 'flying', label: 'Vol', selected: cfg.filterType === 'flying' },
        { value: 'poison', label: 'Poison', selected: cfg.filterType === 'poison' },
        { value: 'ground', label: 'Sol', selected: cfg.filterType === 'ground' },
        { value: 'rock', label: 'Roche', selected: cfg.filterType === 'rock' },
        { value: 'bug', label: 'Insecte', selected: cfg.filterType === 'bug' },
        { value: 'ghost', label: 'Spectre', selected: cfg.filterType === 'ghost' },
        { value: 'steel', label: 'Acier', selected: cfg.filterType === 'steel' },
        { value: 'psychic', label: 'Psy', selected: cfg.filterType === 'psychic' },
        { value: 'ice', label: 'Glace', selected: cfg.filterType === 'ice' },
        { value: 'dragon', label: 'Dragon', selected: cfg.filterType === 'dragon' },
        { value: 'dark', label: 'Ténèbres', selected: cfg.filterType === 'dark' },
        { value: 'fairy', label: 'Fée', selected: cfg.filterType === 'fairy' },
      ]},
  { label: t('sort_label'), changeCall: 'setTrainingAutomationOption', changeArgs: `${i}, 'sort', this.value`, options: [
    {value:'ev_asc',label:t('auto_sort_ev_asc'),selected:cfg.sort==='ev_asc'},
    {value:'ev_desc',label:t('auto_sort_ev_desc'),selected:cfg.sort==='ev_desc'},
    {value:'level_desc',label:t('auto_sort_level_desc'),selected:cfg.sort==='level_desc'},
    {value:'level_asc',label:t('auto_sort_level_asc'),selected:cfg.sort==='level_asc'},
    {value:'talent_missing',label:t('auto_sort_talent_missing'),selected:cfg.sort==='talent_missing'},
    {value:'move_missing',label:t('auto_sort_move_missing'),selected:cfg.sort==='move_missing'},
    {value:'level_missing',label:t('auto_sort_level_missing'),selected:cfg.sort==='level_missing'},
    {value:'dex',label:t('auto_sort_dex'),selected:cfg.sort==='dex'},
  ]},
 ];
}
// String-shaped legacy entry point: rendered by the DS component.
function trainingAutomationRulesHtml(i, cfg){
 const comp = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) || null;
 if(!comp || typeof comp.automationRulesGridHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (automationRulesGrid)');
 return comp.automationRulesGridHTML(trainingAutomationRulesModel(i, cfg));
}
// The training automation slot card as a structured model — the ECS
// ManagementMenuView renders it (blocks of kind 'slots').
function trainingAutomationSlotCardModel(i){
 const a = ensureTrainingAutomation();
 const cfg = a.slots[i];
 const purchased = isTrainingAutomationPurchased(i);
 const unlocked = i < getTrainingSlotCount();
 const title = tr('training_slot_title',{slot:i+1});
 if(!unlocked) return { title, state: 'locked', desc: t('training_slot_locked') };
 if(!purchased) return { title, state: 'unpurchased', lockedLabel: t('automation_locked_upgrade') };
 return {
  title, state: 'owned',
  enabled: !!cfg.enabled, onLabel: t('training_auto_on'), offLabel: t('training_auto_off'),
  toggle: { call: 'toggleTrainingAutomationSlot', args: String(i) },
  rules: trainingAutomationRulesModel(i, cfg),
  queue: {
   title: t('queue_waiting_list'),
   capacity: tr('queue_capacity', {count:(cfg.queue||[]).length, max:getTrainingQueueLimit()}),
   listHtml: renderTrainingQueuePreview(i),
   add: { label: t('queue_add_from_box'), iconHtml: (typeof getIcon==='function'?getIcon('box',14):''), call: 'openUnifiedSelectorModal', args: `'training_queue_${i}'` },
   clear: { label: t('queue_clear'), call: 'clearTrainingQueue', args: String(i) },
  },
 };
}
function renderTrainingAutomationSlotCard(i){
 const comp = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) || null;
 if(!comp || typeof comp.managementBlocksHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (management)');
 return comp.managementBlocksHTML([{ kind: 'slots', cards: [trainingAutomationSlotCardModel(i)] }]);
}
/**
 * Training management model (tabs + content blocks) consumed by
 * ui/views/ManagementMenuView. Labels stay localized via t()/tr() at call
 * time. Everything is ECS design-system now: tabs, upgrade cards,
 * automation SLOT cards (wave 11) and the staff list — no raw fragments
 * left in this screen except the queue chips (shared styled pattern).
 */
function trainingManagementModel(page){
 const icon=(n)=> (typeof getIcon==='function'?getIcon(n,14):'');
 const call='openTrainingManagementMenu';
 const tabs=[
  {id:'upgrades',label:t('management_upgrades'),iconHtml:icon('save'),call,args:`'upgrades'`,active:page==='upgrades'},
  {id:'automation',label:t('management_automation'),iconHtml:icon('settings'),call,args:`'automation'`,active:page==='automation'},
  {id:'trainers',label:t('training_trainers_title'),iconHtml:icon('team'),call,args:`'trainers'`,active:page==='trainers'},
 ];
 const blocks=[];
 if(page==='trainers'){
  // automation.js may be absent in targeted unit-test sandboxes — the
  // block then renders nothing (same as the old guarded fragment).
  blocks.push({kind:'staff',class:'management-staff-block',staff:typeof staffListModel==='function'?staffListModel('training'):null});
 }else if(page==='automation'){
  blocks.push({kind:'slots',class:'training-auto-slot-list vertical',cards:[0,1].map(i=>trainingAutomationSlotCardModel(i))});
 }else{
  const queueCost=getTrainingQueueUpgradeCost();
  const queueLimit=typeof getTrainingQueueLimit==='function'?getTrainingQueueLimit():0;
  const autoCard=(i)=>{
   const purchased=isTrainingAutomationPurchased(i);
   return purchased
    ? {title:`${tr('training_slot_title',{slot:i+1})} · ${t('management_automation')}`,value:t('automation_owned'),state:'owned',stateLabel:t('automation_owned')}
    : {title:`${tr('training_slot_title',{slot:i+1})} · ${t('management_automation')}`,value:tr('automation_buy_button',{price:TRAINING_AUTOMATION_SLOT_COST.toLocaleString()}),state:'buy',call:'buyTrainingAutomationSlot',args:String(i),buyLabel:t('buy_btn')};
  };
  blocks.push({kind:'upgrades',cards:[
   G.trainingMultiSlot
    ? {title:t('training_slots'),value:`${getTrainingSlotCount()}/2`,state:'owned',stateLabel:t('automation_owned')}
    : {title:t('training_slots'),value:`${getTrainingSlotCount()}/2`,state:'buy',call:'upgradeTrainingMultiSlot',args:'',buyLabel:`${TRAINING_MULTI_SLOT_COST.toLocaleString()}₽`},
   queueCost
    ? {title:t('queue_size_title'),value:tr('queue_capacity',{count:0,max:queueLimit}),state:'buy',call:'upgradeTrainingQueueSize',args:'',buyLabel:`${queueCost.toLocaleString()}₽`}
    : {title:t('queue_size_title'),value:tr('queue_capacity',{count:0,max:queueLimit}),state:'owned',stateLabel:t('queue_size_maxed')},
   autoCard(0),
   autoCard(1),
  ]});
 }
 return {machine:'training',title:t('training_management_title'),titleIconHtml:icon('settings'),tabs,activeTab:page,blocks};
}
let _trainingMgmtLastPage = null; // suivi of page for the conservation of the scroll
function openTrainingManagementMenu(page='upgrades'){
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 // Anti "jump to top" (passes 15+16): persistent skeleton — the
 // scrollable .management-content container is never recreated while
 // staying on this panel; only its content is rewritten (native scroll
 // preserved), and a real tab change forces a jump to top via
 // pwResetScrollNow (invalidates pwSetHtml's deferred restorations).
 // The shell itself is the ECS ManagementMenuView.
 const _keepScroll = (_trainingMgmtLastPage === page);
 _trainingMgmtLastPage = page;
 modal.classList.remove('poke-detail-front');
 inner.classList.remove('poke-detail-inner');
 inner.classList.add('management-inner');
 ensureTrainingSlots();
 const views=(typeof window!=='undefined'&&window.PokeUI&&window.PokeUI.views)?window.PokeUI.views:null;
 if(!views||typeof views.ManagementMenuView!=='function') throw new Error('[ui] PokeUI views not loaded (ManagementMenuView)');
 const model=trainingManagementModel(page);
 // Persistent skeleton (cf. hatchery): avoids recreating the scrollable
 // container at each action — the root cause of the "jump to top".
 const shell = inner.querySelector && inner.querySelector('.management-shell.management-training');
 let contentEl = shell ? shell.querySelector('.management-content') : null;
 if(!contentEl){
  _pwSetHtmlSafe(inner, views.ManagementMenuView.toHTML(model));
  contentEl = inner.querySelector('.management-content');
 }
 const tabsHost = inner.querySelector('.management-tabs-host');
 if(tabsHost) _pwSetHtmlSafe(tabsHost, views.ManagementMenuView.tabsHTML(model));
 const _pos = _keepScroll && contentEl ? (contentEl.scrollTop || 0) : 0;
 const body = views.ManagementMenuView.contentHTML(model);
 _pwSetHtmlSafe(contentEl, body);
 if(_keepScroll){ try{ contentEl.scrollTop = _pos; }catch(_){} }
 else if(typeof pwResetScrollNow === 'function') pwResetScrollNow(contentEl);
 else { try{ contentEl.scrollTop = 0; }catch(_){} }
 if(typeof window!=='undefined' && typeof window.pwModalInfo==='function') window.pwModalInfo(false);
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
function formatTrainingLastResult(lastResult) {
  if (!lastResult) return '';
  if (lastResult.startsWith('_KEY_:')) {
    return (typeof t === 'function' ? t(lastResult.replace('_KEY_:', '')) : lastResult);
  }
  if (lastResult.startsWith('_RES_:')) {
    const parts = lastResult.split(':');
    const status = parts[1] || 'failed';
    const mode = parts[2] || 'move';
    const reward = parts.slice(3).join(':') || '';
    return tr('training_slot_last_' + status, { mode: getTrainingModeLabel(mode), reward: reward });
  }
  const modeMap = {
    'Discipline Capacités': 'move', 'Move Discipline': 'move',
    'Atelier Talents': 'talent', 'Talent Workshop': 'talent',
    'Stage EV ciblé': 'ev', 'Targeted EV Stage': 'ev',
    'Stage Niveau': 'level', 'Level Stage': 'level',
    'Déblocage Talent Caché': 'hidden', 'Hidden Ability Unlock': 'hidden'
  };
  let detectedMode = null;
  for (const k in modeMap) {
    if (lastResult.includes(k)) {
      detectedMode = modeMap[k];
      break;
    }
  }
  if (detectedMode) {
    const isSuccess = lastResult.includes('réussi') || lastResult.includes('succeeded');
    const statusKey = isSuccess ? 'training_slot_last_success' : 'training_slot_last_failed';
    return tr(statusKey, { mode: getTrainingModeLabel(detectedMode), reward: '' });
  }
  return lastResult;
}
// UI overhaul: renderTrainingSlot now returns the slot MODEL consumed by
// the DS MachineWindow component (rebuilt-from-zero display). Every visual
// decision lives in src/ui/components/machine-window.js; here we only
// shape data.
function trainingSlotModel(slotIndex){
 ensureTrainingSlots();
 const slot = G.trainingSlots[slotIndex];
 const trainee = getTraineePoke(slotIndex);
 const slotTitle = tr('training_slot_title', {slot:slotIndex+1});
 if(!trainee){
  return {
   cardClass: 'training-slot-card', classes: 'is-empty',
   headClass: 'training-slot-head', title: slotTitle,
   emptyClass: 'training-slot-empty',
   empty: { label: t('training_slot_empty'),
     action: { label: t('training_slot_choose'), iconHtml: (typeof getIcon==='function'?getIcon('box',14):''), call: 'openTrainingSlotSelector', callArgs: slotIndex } },
  };
 }
 if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const state = _pwTrainingModeAvailability(trainee);
 const active = slot && slot.active;
 const lastFormatted = slot && slot.lastResult ? formatTrainingLastResult(slot.lastResult) : '';
 const notices = [];
 if(active) notices.push(`<div class="training-slot-result">${t('training_live_visible_hint')}</div>`);
 if(lastFormatted) notices.push(`<div class="training-slot-result">${lastFormatted}</div>`);
 // Colour language (user request): training buttons follow the SAME
 // families as the rest of the game — stop/cancel & remove are the
 // crimson DANGER family; the auto toggle is the shared green/dashed
 // TOGGLE family (design-system.css DS2805).
 const actions = active
  ? [{ label: t('training_slot_cancel'), iconHtml: (typeof getIcon==='function'?getIcon('close',14):''), call: 'cancelTrainingSlot', callArgs: slotIndex, classes: 'pw-btn-danger' }]
  : [{ label: t('training_slot_change'), call: 'openTrainingSlotSelector', callArgs: slotIndex }];
 if(!active && slot && slot.uid) actions.push({ label: t('remove'), call: 'clearTrainingSlot', callArgs: slotIndex, classes: 'pw-btn-danger' });
 const autoState = (G.trainingAutomation && G.trainingAutomation.slots && G.trainingAutomation.slots[slotIndex]) ? G.trainingAutomation.slots[slotIndex] : {enabled:false};
 const autoPurchased = typeof isTrainingAutomationPurchased === 'function' && isTrainingAutomationPurchased(slotIndex);
 // Phase 14: explicit "Auto: on/off" label (like the management menu
 // card) — the green color comes from the .training-slot-auto-btn CSS.
 actions.push({ label: autoPurchased ? (autoState.enabled?t('training_auto_on'):t('training_auto_off')) : tr('automation_buy_button', {price:TRAINING_AUTOMATION_SLOT_COST.toLocaleString()}),
   iconHtml: (typeof getIcon==='function'?getIcon('settings',14):''), call: 'toggleTrainingAutomationSlot', callArgs: `${slotIndex}, false`,
   classes: `training-slot-auto-btn ${autoState.enabled?'is-on':'is-off'}` });
 return {
  cardClass: 'training-slot-card pw-poke-card', classes: active ? 'is-active' : '',
  headClass: 'training-slot-head', title: slotTitle, statusLabel: active ? t('training_slot_active') : t('ready'),
  pokemonClass: 'training-slot-pokemon', spriteClass: 'training-slot-sprite',
  pokemon: {
   spriteHtml: spriteImg(trainee.id, trainee.emoji, {size:58, shiny:trainee.shinyActive}),
   contextCall: 'openTrainingSlotPokeModal', contextArgs: slotIndex,
   name: trainee.name, levelLabel: `Nv.${trainee.level}`,
   metaHtml: `<small>EVs ${state.totalEvs}/36 · ${typeof t==='function'?t('talents_label'):'Talents'} ${getUnlockedTalentListForSpecies(trainee.id).length}/${getSpeciesTalents(trainee.id).length} · ${typeof t==='function'?t('moves_label'):'Moves'} ${getTrainableLockedMoves(trainee).length}</small>`,
  },
  noticesHtml: notices,
  actionsRowClass: 'training-slot-actions', actions: actions,
  modesGridClass: 'training-mode-grid', modeRowClass: 'training-mode-row', modeTitleClass: 'training-mode-title',
  modes: [
   trainingModeModel('move', state.move && !active, slotIndex),
   trainingModeModel('talent', state.talent && !active, slotIndex),
   trainingModeModel('ev', state.ev && !active, slotIndex),
   trainingModeModel('hidden', state.hidden && !active, slotIndex),
   trainingModeModel('level', state.level && !active, slotIndex),
  ],
 };
}
function openTrainingSlotPokeModal(slotIndex){
 ensureTrainingSlots();
 const idx = clamp(Number(slotIndex)||0, 0, getTrainingSlotCount()-1);
 const slot = G.trainingSlots[idx];
 const p = findPokemonByTrainingSlot(slot);
 if(!p) return;
 if(slot && slot.loc === 'team') openPokeModal(Number(slot.idStr||0));
 else if(slot && slot.loc === 'box' && typeof openBoxPokeModal === 'function') openBoxPokeModal(slot.idStr);
 else if(typeof renderPokemonDetailModal === 'function') renderPokemonDetailModal(p,{readonly:true, locationLabel:t('selector_title_training')});
}
function renderTrainingWindow(){
 const el = document.getElementById('training-window-body');
 if(!el) return;
 startTrainingSlotTicker();
 const unlocked = G.badges.includes('surge') || G.badges.length >= 3;
 if(!unlocked){
 _pwSetHtmlSafe(el, `<div class="pw-hatchery-empty"><div class="pw-hatchery-empty-icon"></div><b>${t("m.training.13")}</b><br>${t("m.training.12")}</div>`);
 return;
 }
 ensureTrainingSlots();
 const count = getTrainingSlotCount();
 // Rebuilt display: the training window is rendered by the ECS design
 // system (TrainingWindowView over the parametrized MachineWindow
 // component) — zero legacy markup below this line.
 const slots = [];
 for(let i=0;i<count;i++) slots.push(trainingSlotModel(i));
 const lockedHint = !G.trainingMultiSlot ? `<div class="training-locked-slot"><b>${t('training_slot_locked')}</b><button class="hbtn" data-action="legacy-call" data-call="openTrainingUpgradeMenu" data-call-args="">${typeof getIcon==='function'?getIcon('settings',14):''} ${tr('training_multi_slot_buy', {price:TRAINING_MULTI_SLOT_COST.toLocaleString()})}</button></div>` : '';
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.TrainingWindowView) throw new Error('[ui] PokeUI views not loaded (TrainingWindowView)');
 _pwSetHtmlSafe(el, views.TrainingWindowView.toHTML({
  className: 'training-window',
  header: { classes: 'hatchery-upgrade-row', actions: [{ label: t('training_management_button'), iconHtml: (typeof getIcon==='function'?getIcon('settings',14):''), call: 'openTrainingManagementMenu', callArgs: `'upgrades'` }] },
  gridClass: 'training-slot-grid',
  slots: slots,
  gridFooterHtml: lockedHint,
 }));
 // Memorise the signature : the ticks following not reconstruiront the window
 // Phase 14 — legacy feature update
 try{ _trainingWindowTickSig = trainingWindowSignature(); }catch(_){}
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
 // Phase 24: nothing left to learn (null mode = "do everything" chain done)
 // or session still LOCKED (ability/hidden workshop before the League…) —
 // cleanly refuse instead of launching an out-of-scope battle.
 if(!mode){ return false; }
 if(typeof isTrainingModeUnlocked === 'function' && !isTrainingModeUnlocked(mode)){
   const req = mode === 'level' ? (t('req_gym_level')||'Blaine (Cinnabar)') : mode === 'ev' ? (t('req_gym_ev')||'Giovanni (Viridian)') : (t('req_league_kanto')||'the Kanto League');
   notify((t('unlocked_after')||'Unlocked after ') + req, 'var(--red)');
   return false;
 }
 if(mode === 'level' && trainee.level >= 100){ notify(t("legacy_message_n_ce_pok_mon_est_d_j_au_niveau_100_maximu"),"var(--red)"); return; }
 if(mode === 'ev'){
   if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
   const totEv = Object.values(trainee.evs).reduce((a,b)=>a+b,0);
   if(totEv >= 36){ notify(t("legacy_message_n_ce_pok_mon_poss_de_d_j_6_toiles_ev_sur"),"var(--red)"); return; }
 }
 if(mode === 'move' && !getTrainableLockedMoves(trainee).length){ notify(t('training_mode_move_done'), 'var(--red)'); return; }
 if(mode === 'talent' && !getTrainableTalents(trainee).length){ notify(t('all_talents_unlocked'), 'var(--red)'); return; }
 
 // Loaded fee upfront if automation is active
 const autoCfg = (G.trainingAutomation && G.trainingAutomation.slots) ? G.trainingAutomation.slots[idx] : null;
 if(autoCfg && autoCfg.enabled){
   const fee = typeof getTrainingAutomationFee === 'function' ? getTrainingAutomationFee() : 0;
   if(fee > 0) {
     if(G.money < fee) {
       autoCfg.enabled = false;
       notify(t('training_auto_no_money'), "var(--red)");
       saveGame();
       return;
     }
     G.money -= fee;
     addBattleLog(` ${typeof t==='function'?t('training_fee_log_label'):'[Training]'} -${fee}₽ ${typeof t==='function'?t('training_fee_paid'):'paid upfront for auto-trainer.'}`);
     updateHeader();
   }
 }

 if(typeof battle !== 'undefined' && battle){ battle.sessionCatches=[]; battle.sessionItems={}; try{ renderBattleLoot(); }catch(_){} }
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
if (typeof isMoveTrainingLocked !== 'undefined') { if (typeof window !== 'undefined') window.isMoveTrainingLocked = isMoveTrainingLocked; if (typeof globalThis !== 'undefined') globalThis.isMoveTrainingLocked = isMoveTrainingLocked; }
if (typeof getTrainingLockedMoves !== 'undefined') { if (typeof window !== 'undefined') window.getTrainingLockedMoves = getTrainingLockedMoves; if (typeof globalThis !== 'undefined') globalThis.getTrainingLockedMoves = getTrainingLockedMoves; }
if (typeof getTrainableLockedMoves !== 'undefined') { if (typeof window !== 'undefined') window.getTrainableLockedMoves = getTrainableLockedMoves; if (typeof globalThis !== 'undefined') globalThis.getTrainableLockedMoves = getTrainableLockedMoves; }
if (typeof hasActiveTrainingBattle !== 'undefined') { if (typeof window !== 'undefined') window.hasActiveTrainingBattle = hasActiveTrainingBattle; if (typeof globalThis !== 'undefined') globalThis.hasActiveTrainingBattle = hasActiveTrainingBattle; }
if (typeof getTrainingSlotCount !== 'undefined') { if (typeof window !== 'undefined') window.getTrainingSlotCount = getTrainingSlotCount; if (typeof globalThis !== 'undefined') globalThis.getTrainingSlotCount = getTrainingSlotCount; }
if (typeof ensureTrainingSlots !== 'undefined') { if (typeof window !== 'undefined') window.ensureTrainingSlots = ensureTrainingSlots; if (typeof globalThis !== 'undefined') globalThis.ensureTrainingSlots = ensureTrainingSlots; }
if (typeof setTrainingSlotPokemon !== 'undefined') { if (typeof window !== 'undefined') window.setTrainingSlotPokemon = setTrainingSlotPokemon; if (typeof globalThis !== 'undefined') globalThis.setTrainingSlotPokemon = setTrainingSlotPokemon; }
if (typeof clearTrainingSlot !== 'undefined') { if (typeof window !== 'undefined') window.clearTrainingSlot = clearTrainingSlot; if (typeof globalThis !== 'undefined') globalThis.clearTrainingSlot = clearTrainingSlot; }
if (typeof openTrainingSlotSelector !== 'undefined') { if (typeof window !== 'undefined') window.openTrainingSlotSelector = openTrainingSlotSelector; if (typeof globalThis !== 'undefined') globalThis.openTrainingSlotSelector = openTrainingSlotSelector; }
if (typeof applyTrainingReward !== 'undefined') { if (typeof window !== 'undefined') window.applyTrainingReward = applyTrainingReward; if (typeof globalThis !== 'undefined') globalThis.applyTrainingReward = applyTrainingReward; }
if (typeof completeTrainingSlot !== 'undefined') { if (typeof window !== 'undefined') window.completeTrainingSlot = completeTrainingSlot; if (typeof globalThis !== 'undefined') globalThis.completeTrainingSlot = completeTrainingSlot; }
if (typeof cancelTrainingSlot !== 'undefined') { if (typeof window !== 'undefined') window.cancelTrainingSlot = cancelTrainingSlot; if (typeof globalThis !== 'undefined') globalThis.cancelTrainingSlot = cancelTrainingSlot; }
if (typeof updateTrainingSlots !== 'undefined') { if (typeof window !== 'undefined') window.updateTrainingSlots = updateTrainingSlots; if (typeof globalThis !== 'undefined') globalThis.updateTrainingSlots = updateTrainingSlots; }
if (typeof renderTrainingBattlePanel !== 'undefined') { if (typeof window !== 'undefined') window.renderTrainingBattlePanel = renderTrainingBattlePanel; if (typeof globalThis !== 'undefined') globalThis.renderTrainingBattlePanel = renderTrainingBattlePanel; }
if (typeof updateTrainingLiveProgress !== 'undefined') { if (typeof window !== 'undefined') window.updateTrainingLiveProgress = updateTrainingLiveProgress; if (typeof globalThis !== 'undefined') globalThis.updateTrainingLiveProgress = updateTrainingLiveProgress; }
if (typeof openTrainingSlotPokeModal !== 'undefined') { if (typeof window !== 'undefined') window.openTrainingSlotPokeModal = openTrainingSlotPokeModal; if (typeof globalThis !== 'undefined') globalThis.openTrainingSlotPokeModal = openTrainingSlotPokeModal; }
if (typeof buyTrainingAutomationSlot !== 'undefined') { if (typeof window !== 'undefined') window.buyTrainingAutomationSlot = buyTrainingAutomationSlot; if (typeof globalThis !== 'undefined') globalThis.buyTrainingAutomationSlot = buyTrainingAutomationSlot; }
if (typeof isTrainingModeUnlocked !== 'undefined') { if (typeof window !== 'undefined') window.isTrainingModeUnlocked = isTrainingModeUnlocked; if (typeof globalThis !== 'undefined') globalThis.isTrainingModeUnlocked = isTrainingModeUnlocked; }
if (typeof isLeagueBeaten !== 'undefined') { if (typeof window !== 'undefined') window.isLeagueBeaten = isLeagueBeaten; if (typeof globalThis !== 'undefined') globalThis.isLeagueBeaten = isLeagueBeaten; }
if (typeof hasAnyUnlockedTrainingAvailable !== 'undefined') { if (typeof window !== 'undefined') window.hasAnyUnlockedTrainingAvailable = hasAnyUnlockedTrainingAvailable; if (typeof globalThis !== 'undefined') globalThis.hasAnyUnlockedTrainingAvailable = hasAnyUnlockedTrainingAvailable; }
if (typeof pullNextQueuedTraining !== 'undefined') { if (typeof window !== 'undefined') window.pullNextQueuedTraining = pullNextQueuedTraining; if (typeof globalThis !== 'undefined') globalThis.pullNextQueuedTraining = pullNextQueuedTraining; }
if (typeof toggleTrainingAutomationSlot !== 'undefined') { if (typeof window !== 'undefined') window.toggleTrainingAutomationSlot = toggleTrainingAutomationSlot; if (typeof globalThis !== 'undefined') globalThis.toggleTrainingAutomationSlot = toggleTrainingAutomationSlot; }
if (typeof setTrainingAutomationOption !== 'undefined') { if (typeof window !== 'undefined') window.setTrainingAutomationOption = setTrainingAutomationOption; if (typeof globalThis !== 'undefined') globalThis.setTrainingAutomationOption = setTrainingAutomationOption; }
if (typeof rebuildTrainingQueue !== 'undefined') { if (typeof window !== 'undefined') window.rebuildTrainingQueue = rebuildTrainingQueue; if (typeof globalThis !== 'undefined') globalThis.rebuildTrainingQueue = rebuildTrainingQueue; }
if (typeof processTrainingAutomationQueues !== 'undefined') { if (typeof window !== 'undefined') window.processTrainingAutomationQueues = processTrainingAutomationQueues; if (typeof globalThis !== 'undefined') globalThis.processTrainingAutomationQueues = processTrainingAutomationQueues; }
if (typeof trainingAutomationEligible !== 'undefined') { if (typeof window !== 'undefined') window.trainingAutomationEligible = trainingAutomationEligible; if (typeof globalThis !== 'undefined') globalThis.trainingAutomationEligible = trainingAutomationEligible; }
if (typeof upgradeTrainingQueueSize !== 'undefined') { if (typeof window !== 'undefined') window.upgradeTrainingQueueSize = upgradeTrainingQueueSize; if (typeof globalThis !== 'undefined') globalThis.upgradeTrainingQueueSize = upgradeTrainingQueueSize; }
if (typeof addPokemonToTrainingQueue !== 'undefined') { if (typeof window !== 'undefined') window.addPokemonToTrainingQueue = addPokemonToTrainingQueue; if (typeof globalThis !== 'undefined') globalThis.addPokemonToTrainingQueue = addPokemonToTrainingQueue; }
if (typeof removePokemonFromTrainingQueue !== 'undefined') { if (typeof window !== 'undefined') window.removePokemonFromTrainingQueue = removePokemonFromTrainingQueue; if (typeof globalThis !== 'undefined') globalThis.removePokemonFromTrainingQueue = removePokemonFromTrainingQueue; }
if (typeof clearTrainingQueue !== 'undefined') { if (typeof window !== 'undefined') window.clearTrainingQueue = clearTrainingQueue; if (typeof globalThis !== 'undefined') globalThis.clearTrainingQueue = clearTrainingQueue; }
if (typeof isPokemonQueuedTraining !== 'undefined') { if (typeof window !== 'undefined') window.isPokemonQueuedTraining = isPokemonQueuedTraining; if (typeof globalThis !== 'undefined') globalThis.isPokemonQueuedTraining = isPokemonQueuedTraining; }
if (typeof upgradeTrainingMultiSlot !== 'undefined') { if (typeof window !== 'undefined') window.upgradeTrainingMultiSlot = upgradeTrainingMultiSlot; if (typeof globalThis !== 'undefined') globalThis.upgradeTrainingMultiSlot = upgradeTrainingMultiSlot; }
if (typeof openTrainingManagementMenu !== 'undefined') { if (typeof window !== 'undefined') window.openTrainingManagementMenu = openTrainingManagementMenu; if (typeof globalThis !== 'undefined') globalThis.openTrainingManagementMenu = openTrainingManagementMenu; }
if (typeof openTrainingUpgradeMenu !== 'undefined') { if (typeof window !== 'undefined') window.openTrainingUpgradeMenu = openTrainingUpgradeMenu; if (typeof globalThis !== 'undefined') globalThis.openTrainingUpgradeMenu = openTrainingUpgradeMenu; }
if (typeof pickTrainingBots !== 'undefined') { if (typeof window !== 'undefined') window.pickTrainingBots = pickTrainingBots; if (typeof globalThis !== 'undefined') globalThis.pickTrainingBots = pickTrainingBots; }
if (typeof getTraineePoke !== 'undefined') { if (typeof window !== 'undefined') window.getTraineePoke = getTraineePoke; if (typeof globalThis !== 'undefined') globalThis.getTraineePoke = getTraineePoke; }
if (typeof renderTrainingWindow !== 'undefined') { if (typeof window !== 'undefined') window.renderTrainingWindow = renderTrainingWindow; if (typeof globalThis !== 'undefined') globalThis.renderTrainingWindow = renderTrainingWindow; }
if (typeof trainingBattlePanelSignature !== 'undefined') { if (typeof window !== 'undefined') window.trainingBattlePanelSignature = trainingBattlePanelSignature; if (typeof globalThis !== 'undefined') globalThis.trainingBattlePanelSignature = trainingBattlePanelSignature; }
if (typeof trainingWindowSignature !== 'undefined') { if (typeof window !== 'undefined') window.trainingWindowSignature = trainingWindowSignature; if (typeof globalThis !== 'undefined') globalThis.trainingWindowSignature = trainingWindowSignature; }
if (typeof maybeRenderTrainingWindowTick !== 'undefined') { if (typeof window !== 'undefined') window.maybeRenderTrainingWindowTick = maybeRenderTrainingWindowTick; if (typeof globalThis !== 'undefined') globalThis.maybeRenderTrainingWindowTick = maybeRenderTrainingWindowTick; }
if (typeof startTrainingBattle !== 'undefined') { if (typeof window !== 'undefined') window.startTrainingBattle = startTrainingBattle; if (typeof globalThis !== 'undefined') globalThis.startTrainingBattle = startTrainingBattle; }

// Hidden Talent Unlock - allows unlocking the hidden ability via training
function tryUnlockHiddenAbility(p) {
  if (!p || !p.id) return false;
  const nid = Number(p.id);
  const pt = (typeof POKEMON_TALENTS !== 'undefined') ? POKEMON_TALENTS : (globalThis.POKEMON_TALENTS || {});
  const ha = pt[nid] ? pt[nid].hiddenAbility : null;
  if (!ha) {
    if (typeof notify === 'function') notify(t('no_hidden_talent_species'), 'var(--red)');
    return false;
  }
  if (typeof G !== 'undefined' && G && G.unlockedTalents && G.unlockedTalents[nid] && G.unlockedTalents[nid].includes(ha)) {
    if (typeof notify === 'function') notify(t('hidden_talent_already_unlocked'), 'var(--yellow)');
    return false;
  }
  if (typeof unlockTalentForSpecies === 'function') {
    unlockTalentForSpecies(nid, ha);
    if (typeof notify === 'function') notify(t('hidden_talent_unlocked'), 'var(--green)');
    return true;
  }
  return false;
}

if (typeof tryUnlockHiddenAbility !== 'undefined') { if (typeof window !== 'undefined') window.tryUnlockHiddenAbility = tryUnlockHiddenAbility; if (typeof globalThis !== 'undefined') globalThis.tryUnlockHiddenAbility = tryUnlockHiddenAbility; }



// --- Exported globals ---
if (typeof appSetInterval !== 'undefined') { if (typeof window !== 'undefined') window.appSetInterval = appSetInterval; if (typeof globalThis !== 'undefined') globalThis.appSetInterval = appSetInterval; }
if (typeof cleanTrainingQueue !== 'undefined') { if (typeof window !== 'undefined') window.cleanTrainingQueue = cleanTrainingQueue; if (typeof globalThis !== 'undefined') globalThis.cleanTrainingQueue = cleanTrainingQueue; }
if (typeof ensureTrainingAutomation !== 'undefined') { if (typeof window !== 'undefined') window.ensureTrainingAutomation = ensureTrainingAutomation; if (typeof globalThis !== 'undefined') globalThis.ensureTrainingAutomation = ensureTrainingAutomation; }
if (typeof ensureTrainingBattlePanelElement !== 'undefined') { if (typeof window !== 'undefined') window.ensureTrainingBattlePanelElement = ensureTrainingBattlePanelElement; if (typeof globalThis !== 'undefined') globalThis.ensureTrainingBattlePanelElement = ensureTrainingBattlePanelElement; }
if (typeof findPokemonByTrainingSlot !== 'undefined') { if (typeof window !== 'undefined') window.findPokemonByTrainingSlot = findPokemonByTrainingSlot; if (typeof globalThis !== 'undefined') globalThis.findPokemonByTrainingSlot = findPokemonByTrainingSlot; }
if (typeof findPokemonByUidAnywhere !== 'undefined') { if (typeof window !== 'undefined') window.findPokemonByUidAnywhere = findPokemonByUidAnywhere; if (typeof globalThis !== 'undefined') globalThis.findPokemonByUidAnywhere = findPokemonByUidAnywhere; }
if (typeof formatTrainingLastResult !== 'undefined') { if (typeof window !== 'undefined') window.formatTrainingLastResult = formatTrainingLastResult; if (typeof globalThis !== 'undefined') globalThis.formatTrainingLastResult = formatTrainingLastResult; }
if (typeof getOfficialMovePoolForTraining !== 'undefined') { if (typeof window !== 'undefined') window.getOfficialMovePoolForTraining = getOfficialMovePoolForTraining; if (typeof globalThis !== 'undefined') globalThis.getOfficialMovePoolForTraining = getOfficialMovePoolForTraining; }
if (typeof getTrainableTalents !== 'undefined') { if (typeof window !== 'undefined') window.getTrainableTalents = getTrainableTalents; if (typeof globalThis !== 'undefined') globalThis.getTrainableTalents = getTrainableTalents; }
if (typeof getTrainingModeDescription !== 'undefined') { if (typeof window !== 'undefined') window.getTrainingModeDescription = getTrainingModeDescription; if (typeof globalThis !== 'undefined') globalThis.getTrainingModeDescription = getTrainingModeDescription; }
if (typeof getTrainingModeLabel !== 'undefined') { if (typeof window !== 'undefined') window.getTrainingModeLabel = getTrainingModeLabel; if (typeof globalThis !== 'undefined') globalThis.getTrainingModeLabel = getTrainingModeLabel; }
if (typeof getTrainingQueueLimit !== 'undefined') { if (typeof window !== 'undefined') window.getTrainingQueueLimit = getTrainingQueueLimit; if (typeof globalThis !== 'undefined') globalThis.getTrainingQueueLimit = getTrainingQueueLimit; }
if (typeof getTrainingQueueUpgradeCost !== 'undefined') { if (typeof window !== 'undefined') window.getTrainingQueueUpgradeCost = getTrainingQueueUpgradeCost; if (typeof globalThis !== 'undefined') globalThis.getTrainingQueueUpgradeCost = getTrainingQueueUpgradeCost; }
if (typeof getUnlockedTalentListForSpecies !== 'undefined') { if (typeof window !== 'undefined') window.getUnlockedTalentListForSpecies = getUnlockedTalentListForSpecies; if (typeof globalThis !== 'undefined') globalThis.getUnlockedTalentListForSpecies = getUnlockedTalentListForSpecies; }
if (typeof hasAnyTrainingAvailable !== 'undefined') { if (typeof window !== 'undefined') window.hasAnyTrainingAvailable = hasAnyTrainingAvailable; if (typeof globalThis !== 'undefined') globalThis.hasAnyTrainingAvailable = hasAnyTrainingAvailable; }
if (typeof isTrainingAutomationPurchased !== 'undefined') { if (typeof window !== 'undefined') window.isTrainingAutomationPurchased = isTrainingAutomationPurchased; if (typeof globalThis !== 'undefined') globalThis.isTrainingAutomationPurchased = isTrainingAutomationPurchased; }
if (typeof isUidInAnyAutomationQueue !== 'undefined') { if (typeof window !== 'undefined') window.isUidInAnyAutomationQueue = isUidInAnyAutomationQueue; if (typeof globalThis !== 'undefined') globalThis.isUidInAnyAutomationQueue = isUidInAnyAutomationQueue; }
if (typeof isUidTrainingActive !== 'undefined') { if (typeof window !== 'undefined') window.isUidTrainingActive = isUidTrainingActive; if (typeof globalThis !== 'undefined') globalThis.isUidTrainingActive = isUidTrainingActive; }
if (typeof makeTrainingUid !== 'undefined') { if (typeof window !== 'undefined') window.makeTrainingUid = makeTrainingUid; if (typeof globalThis !== 'undefined') globalThis.makeTrainingUid = makeTrainingUid; }
if (typeof refillTrainingQueueFromRules !== 'undefined') { if (typeof window !== 'undefined') window.refillTrainingQueueFromRules = refillTrainingQueueFromRules; if (typeof globalThis !== 'undefined') globalThis.refillTrainingQueueFromRules = refillTrainingQueueFromRules; }
if (typeof renderTrainingAutomationSlotCard !== 'undefined') { if (typeof window !== 'undefined') window.renderTrainingAutomationSlotCard = renderTrainingAutomationSlotCard; if (typeof globalThis !== 'undefined') globalThis.renderTrainingAutomationSlotCard = renderTrainingAutomationSlotCard; }
if (typeof renderTrainingQueuePreview !== 'undefined') { if (typeof window !== 'undefined') window.renderTrainingQueuePreview = renderTrainingQueuePreview; if (typeof globalThis !== 'undefined') globalThis.renderTrainingQueuePreview = renderTrainingQueuePreview; }
if (typeof trainingSlotModel !== 'undefined') { if (typeof window !== 'undefined') window.trainingSlotModel = trainingSlotModel; if (typeof globalThis !== 'undefined') globalThis.trainingSlotModel = trainingSlotModel; }
if (typeof resolveTrainingAutoMode !== 'undefined') { if (typeof window !== 'undefined') window.resolveTrainingAutoMode = resolveTrainingAutoMode; if (typeof globalThis !== 'undefined') globalThis.resolveTrainingAutoMode = resolveTrainingAutoMode; }
if (typeof rollTrainingTalent !== 'undefined') { if (typeof window !== 'undefined') window.rollTrainingTalent = rollTrainingTalent; if (typeof globalThis !== 'undefined') globalThis.rollTrainingTalent = rollTrainingTalent; }
if (typeof setTrainingPct !== 'undefined') { if (typeof window !== 'undefined') window.setTrainingPct = setTrainingPct; if (typeof globalThis !== 'undefined') globalThis.setTrainingPct = setTrainingPct; }
if (typeof startTrainingSlotTicker !== 'undefined') { if (typeof window !== 'undefined') window.startTrainingSlotTicker = startTrainingSlotTicker; if (typeof globalThis !== 'undefined') globalThis.startTrainingSlotTicker = startTrainingSlotTicker; }
if (typeof trainingAutomationCandidates !== 'undefined') { if (typeof window !== 'undefined') window.trainingAutomationCandidates = trainingAutomationCandidates; if (typeof globalThis !== 'undefined') globalThis.trainingAutomationCandidates = trainingAutomationCandidates; }
if (typeof trainingAutomationRulesHtml !== 'undefined') { if (typeof window !== 'undefined') window.trainingAutomationRulesHtml = trainingAutomationRulesHtml; if (typeof globalThis !== 'undefined') globalThis.trainingAutomationRulesHtml = trainingAutomationRulesHtml; }
if (typeof trainingAutomationRulesModel !== 'undefined') { if (typeof window !== 'undefined') window.trainingAutomationRulesModel = trainingAutomationRulesModel; if (typeof globalThis !== 'undefined') globalThis.trainingAutomationRulesModel = trainingAutomationRulesModel; }
if (typeof trainingAutomationSlotCardModel !== 'undefined') { if (typeof window !== 'undefined') window.trainingAutomationSlotCardModel = trainingAutomationSlotCardModel; if (typeof globalThis !== 'undefined') globalThis.trainingAutomationSlotCardModel = trainingAutomationSlotCardModel; }
if (typeof trainingBattleHpPct !== 'undefined') { if (typeof window !== 'undefined') window.trainingBattleHpPct = trainingBattleHpPct; if (typeof globalThis !== 'undefined') globalThis.trainingBattleHpPct = trainingBattleHpPct; }
if (typeof trainingBattleLog !== 'undefined') { if (typeof window !== 'undefined') window.trainingBattleLog = trainingBattleLog; if (typeof globalThis !== 'undefined') globalThis.trainingBattleLog = trainingBattleLog; }
if (typeof trainingBattlePctClass !== 'undefined') { if (typeof window !== 'undefined') window.trainingBattlePctClass = trainingBattlePctClass; if (typeof globalThis !== 'undefined') globalThis.trainingBattlePctClass = trainingBattlePctClass; }
if (typeof trainingModeModel !== 'undefined') { if (typeof window !== 'undefined') window.trainingModeModel = trainingModeModel; if (typeof globalThis !== 'undefined') globalThis.trainingModeModel = trainingModeModel; }
if (typeof trainingCalcCd !== 'undefined') { if (typeof window !== 'undefined') window.trainingCalcCd = trainingCalcCd; if (typeof globalThis !== 'undefined') globalThis.trainingCalcCd = trainingCalcCd; }
if (typeof trainingCdPctClass !== 'undefined') { if (typeof window !== 'undefined') window.trainingCdPctClass = trainingCdPctClass; if (typeof globalThis !== 'undefined') globalThis.trainingCdPctClass = trainingCdPctClass; }
if (typeof trainingCdPctValue !== 'undefined') { if (typeof window !== 'undefined') window.trainingCdPctValue = trainingCdPctValue; if (typeof globalThis !== 'undefined') globalThis.trainingCdPctValue = trainingCdPctValue; }
if (typeof trainingCreateEnemyTeam !== 'undefined') { if (typeof window !== 'undefined') window.trainingCreateEnemyTeam = trainingCreateEnemyTeam; if (typeof globalThis !== 'undefined') globalThis.trainingCreateEnemyTeam = trainingCreateEnemyTeam; }
if (typeof trainingDoAttack !== 'undefined') { if (typeof window !== 'undefined') window.trainingDoAttack = trainingDoAttack; if (typeof globalThis !== 'undefined') globalThis.trainingDoAttack = trainingDoAttack; }
if (typeof trainingHealBetweenRounds !== 'undefined') { if (typeof window !== 'undefined') window.trainingHealBetweenRounds = trainingHealBetweenRounds; if (typeof globalThis !== 'undefined') globalThis.trainingHealBetweenRounds = trainingHealBetweenRounds; }
if (typeof trainingModeAvailability !== 'undefined') { if (typeof window !== 'undefined') window.trainingModeAvailability = trainingModeAvailability; if (typeof globalThis !== 'undefined') globalThis.trainingModeAvailability = trainingModeAvailability; }
if (typeof trainingMoveDamage !== 'undefined') { if (typeof window !== 'undefined') window.trainingMoveDamage = trainingMoveDamage; if (typeof globalThis !== 'undefined') globalThis.trainingMoveDamage = trainingMoveDamage; }
if (typeof trainingStartNextOpponent !== 'undefined') { if (typeof window !== 'undefined') window.trainingStartNextOpponent = trainingStartNextOpponent; if (typeof globalThis !== 'undefined') globalThis.trainingStartNextOpponent = trainingStartNextOpponent; }
if (typeof unlockTrainingMove !== 'undefined') { if (typeof window !== 'undefined') window.unlockTrainingMove = unlockTrainingMove; if (typeof globalThis !== 'undefined') globalThis.unlockTrainingMove = unlockTrainingMove; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  isMoveTrainingLocked,
  getTrainingLockedMoves,
  getTrainableLockedMoves,
  hasActiveTrainingBattle,
  getTrainingSlotCount,
  ensureTrainingSlots,
  setTrainingSlotPokemon,
  clearTrainingSlot,
  openTrainingSlotSelector,
  applyTrainingReward,
  completeTrainingSlot,
  cancelTrainingSlot,
  updateTrainingSlots,
  renderTrainingBattlePanel,
  updateTrainingLiveProgress,
  openTrainingSlotPokeModal,
  buyTrainingAutomationSlot,
  isTrainingModeUnlocked,
  isLeagueBeaten,
  hasAnyUnlockedTrainingAvailable,
  pullNextQueuedTraining,
  toggleTrainingAutomationSlot,
  setTrainingAutomationOption,
  rebuildTrainingQueue,
  processTrainingAutomationQueues,
  trainingAutomationEligible,
  upgradeTrainingQueueSize,
  addPokemonToTrainingQueue,
  removePokemonFromTrainingQueue,
  clearTrainingQueue,
  isPokemonQueuedTraining,
  upgradeTrainingMultiSlot,
  openTrainingManagementMenu,
  openTrainingUpgradeMenu,
  pickTrainingBots,
  getTraineePoke,
  renderTrainingWindow,
  trainingBattlePanelSignature,
  trainingWindowSignature,
  maybeRenderTrainingWindowTick,
  startTrainingBattle,
  tryUnlockHiddenAbility,
  appSetInterval,
  cleanTrainingQueue,
  ensureTrainingAutomation,
  ensureTrainingBattlePanelElement,
  findPokemonByTrainingSlot,
  findPokemonByUidAnywhere,
  formatTrainingLastResult,
  getOfficialMovePoolForTraining,
  getTrainableTalents,
  getTrainingModeDescription,
  getTrainingModeLabel,
  getTrainingQueueLimit,
  getTrainingQueueUpgradeCost,
  getUnlockedTalentListForSpecies,
  hasAnyTrainingAvailable,
  isTrainingAutomationPurchased,
  isUidInAnyAutomationQueue,
  isUidTrainingActive,
  makeTrainingUid,
  refillTrainingQueueFromRules,
  renderTrainingAutomationSlotCard,
  renderTrainingQueuePreview,
  trainingSlotModel,
  resolveTrainingAutoMode,
  rollTrainingTalent,
  setTrainingPct,
  startTrainingSlotTicker,
  trainingAutomationCandidates,
  trainingAutomationRulesHtml,
  trainingAutomationRulesModel,
  trainingAutomationSlotCardModel,
  trainingBattleHpPct,
  trainingBattleLog,
  trainingBattlePctClass,
  trainingModeModel,
  trainingCalcCd,
  trainingCdPctClass,
  trainingCdPctValue,
  trainingCreateEnemyTeam,
  trainingDoAttack,
  trainingHealBetweenRounds,
  trainingModeAvailability,
  trainingMoveDamage,
  trainingStartNextOpponent,
  unlockTrainingMove,
};
