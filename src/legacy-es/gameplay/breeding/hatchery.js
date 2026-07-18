const FOSSIL_REVIVE_MAP = {
 fossil: 138,
 ancient_fossil: 138,
 old_fossil: 138,
 fossil_ancien: 138,
 helix_fossil: 138,
 dome_fossil: 140,
 old_amber: 142,
 root_fossil: 138,
 claw_fossil: 140
};
const FOSSIL_DISPLAY_KEY = {
 ancient_fossil: 'fossil',
 old_fossil: 'fossil',
 fossil_ancien: 'fossil'
};
function getFossilDisplayKey(key){
 return FOSSIL_DISPLAY_KEY[key] || key;
}
function getFossilReviveId(key){
 return FOSSIL_REVIVE_MAP[key] || (ITEMS[key] && ITEMS[key].type === 'fossil' ? ITEMS[key].revive : null);
}

const HATCHERY_SLOT_UPGRADE_COSTS = [100000, 300000, 750000];
function getHatcherySlotUpgradeCost(){
 const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
 return HATCHERY_SLOT_UPGRADE_COSTS[maxSlots - 1] || null;
}
function upgradeHatcherySlots(cost){
 const expected = getHatcherySlotUpgradeCost();
 if(!expected){ notify(t('hatchery_slots_max'), 'var(--green)'); return; }
 cost = expected;
 if(G.money < cost){
 notify(t("n.pas_assez_dargent"),"var(--red)");
 return;
 }
 G.money -= cost;
 G.hatcheryMaxSlots = (G.hatcheryMaxSlots || 1) + 1;
 updateHeader();
 renderHatcheryWindow();
 if(typeof openHatcheryUpgradeMenu === 'function') openHatcheryUpgradeMenu();
 notify(tr('hatchery_upgraded', {slots:G.hatcheryMaxSlots}),"var(--green)");
}

const HATCHERY_AUTO_QUEUE_LIMIT = 24;
const HATCHERY_LEGENDARY_IDS = [144,145,146,150,151,243,244,245,249,250,251];
function pokemonIvTotal(p){ return Object.values((p && p.ivs) || {}).reduce((a,b)=>a+(Number(b)||0),0); }
function pokemonEvTotal(p){ return Object.values((p && p.evs) || {}).reduce((a,b)=>a+(Number(b)||0),0); }
function pokemonBaseStatTotal(id){
 const d = PD && PD[id];
 if(!d) return 300;
 return Number(d[3]||0)+Number(d[4]||0)+Number(d[5]||0)+Number(d[6]||0)+Number(d[7]||0)+Number(d[8]||0);
}
function hatcheryStepsForPokemon(pOrId){
 const id = Number(typeof pOrId === 'object' ? pOrId.id : pOrId);
 let base = 100;
 if(HATCHERY_LEGENDARY_IDS.includes(id)) base = 100;
 else {
  const bst = pokemonBaseStatTotal(id);
  if(bst <= 250) base = 25;
  else if(bst <= 330) base = 35;
  else if(bst <= 420) base = 50;
  else if(bst <= 520) base = 70;
  else if(bst <= 600) base = 85;
 }
 const bonus = (typeof getStaffBonus === 'function') ? getStaffBonus('hatchery','hatchery_speed') : 0;
 return clamp(Math.ceil(base * (1 - bonus)), 25, 100);
}
function ensurePokemonUid(p){
 if(p && !p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9) + '_' + Math.random().toString(36).substr(2, 5);
 return p ? p.uid : null;
}
function findBoxKeyByUid(uid){
 if(!uid) return null;
 for(const k in (G.collection||{})){
  const p = G.collection[k];
  if(p && p.uid === uid) return k;
 }
 return null;
}
function isPokemonInTeamByUid(uid){ return !!((G.team||[]).find(p => p && p.uid === uid)); }
function ensureHatcheryAutomation(){
 if(!G.hatcheryAutomation || typeof G.hatcheryAutomation !== 'object') G.hatcheryAutomation = {};
 const a = G.hatcheryAutomation;
 if(!a.filterShiny) a.filterShiny = 'all';
 if(!a.sort) a.sort = 'iv_desc';
 if(!a.filterIv) a.filterIv = 'all';
 if(a.excludeLocked !== false) a.excludeLocked = true;
 if(!Array.isArray(G.hatcheryQueue)) G.hatcheryQueue = [];
 return a;
}
const HATCHERY_QUEUE_UPGRADE_COSTS = [250000, 750000, 1500000, 3000000];
function getHatcheryQueueLimit(){ return 3 + clamp(G.hatcheryQueueUpgradeLevel || 0, 0, HATCHERY_QUEUE_UPGRADE_COSTS.length) * 3; }
function getHatcheryQueueUpgradeCost(){ return HATCHERY_QUEUE_UPGRADE_COSTS[G.hatcheryQueueUpgradeLevel || 0] || null; }
function upgradeHatcheryQueueSize(){
 const cost = getHatcheryQueueUpgradeCost();
 if(!cost){ notify(t('queue_size_maxed'), 'var(--green)'); return; }
 if(G.money < cost){ notify(t('n.pas_assez_dargent'), 'var(--red)'); return; }
 G.money -= cost;
 G.hatcheryQueueUpgradeLevel = (G.hatcheryQueueUpgradeLevel || 0) + 1;
 updateHeader(); saveGame();
 notify(tr('queue_size_upgraded', {count:getHatcheryQueueLimit()}), 'var(--green)');
 try{ openHatcheryManagementMenu('automation'); }catch(_){}
}
function isUidInHatchery(uid){ return !!((G.hatchery||[]).find(slot => slot && slot.poke && slot.poke.uid === uid)); }
function isUidInAnyTrainingQueue(uid){
 const a = G.trainingAutomation;
 return !!(a && Array.isArray(a.slots) && a.slots.some(s => s && Array.isArray(s.queue) && s.queue.includes(uid)));
}
function findEmptyHatcherySlot(){
 if(!G.hatchery) G.hatchery = [null];
 const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
 while(G.hatchery.length < maxSlots) G.hatchery.push(null);
 for(let i=0;i<maxSlots;i++) if(!G.hatchery[i]) return i;
 return -1;
}
function addPokemonToHatcheryQueue(boxId, silent=false){
 ensureHatcheryAutomation(); cleanHatcheryQueue();
 const p = G.collection[boxId] || G.collection[String(boxId)];
 if(!p){ notify(t('pokemon_not_found'), 'var(--red)'); return false; }
 ensurePokemonUid(p);
 if(p.locked){ notify(t('queue_locked_rejected'), 'var(--red)'); return false; }
 if(isPokemonInTeamByUid(p.uid)){ notify(t('queue_team_rejected'), 'var(--red)'); return false; }
 if(isUidInHatchery(p.uid)){ notify(t('queue_already_busy'), 'var(--red)'); return false; }
 if(isUidInAnyTrainingQueue(p.uid)){ notify(t('queue_already_other'), 'var(--red)'); return false; }
 if(G.hatcheryQueue.includes(p.uid)){ notify(t('queue_already_added'), 'var(--light1)'); return false; }
 const emptyIdx = findEmptyHatcherySlot();
 if(emptyIdx >= 0){
  delete G.collection[boxId];
  delete G.collection[String(boxId)];
  G.hatchery[emptyIdx] = { poke:p, steps:0, stepsReq:hatcheryStepsForPokemon(p), queuedUid:p.uid };
  saveGame();
  try{ renderHatcheryWindow(); renderTeamWindow(); }catch(_){}
  try{ if(typeof openHatcheryManagementMenu === 'function' && document.getElementById('poke-modal')?.classList.contains('open')) openHatcheryManagementMenu('automation'); }catch(_){}
  if(!silent) notify(tr('deposited_hatchery', {name:p.name}), 'var(--green)');
  return 'slot';
 }
 if(G.hatcheryQueue.length >= getHatcheryQueueLimit()){ notify(tr('queue_full', {count:getHatcheryQueueLimit()}), 'var(--red)'); return false; }
 G.hatcheryQueue.push(p.uid);
 try{ processHatcheryQueue(true); }catch(_){}
 saveGame();
 try{ renderHatcheryWindow(); }catch(_){}
 try{ if(typeof openHatcheryManagementMenu === 'function' && document.getElementById('poke-modal')?.classList.contains('open')) openHatcheryManagementMenu('automation'); }catch(_){}
 if(!silent) notify(tr('queue_added_hatchery', {name:p.name}), 'var(--green)');
 if(!silent){ try{ openBoxPokeModal(boxId); }catch(_){} }
 return 'queue';
}
function removePokemonFromHatcheryQueue(uid){
 ensureHatcheryAutomation();
 G.hatcheryQueue = (G.hatcheryQueue||[]).filter(x=>x!==uid);
 saveGame();
 try{ openHatcheryManagementMenu('automation'); }catch(_){}
}
function clearHatcheryQueue(){ ensureHatcheryAutomation(); G.hatcheryQueue=[]; saveGame(); try{ openHatcheryManagementMenu('automation'); }catch(_){} }
function isPokemonQueuedHatchery(p){ return !!(p && p.uid && G.hatcheryQueue && G.hatcheryQueue.includes(p.uid)); }
function hatcheryCandidateEntries(){
 const cfg = ensureHatcheryAutomation();
 let list = [];
 for(const k in (G.collection||{})){
  const p = G.collection[k];
  if(!p) continue;
  ensurePokemonUid(p);
  if(cfg.excludeLocked && p.locked) continue;
  if(isPokemonInTeamByUid(p.uid)) continue;
  const shiny = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id));
  if(cfg.filterShiny === 'non_shiny' && shiny) continue;
  if(cfg.filterShiny === 'shiny' && !shiny) continue;
  const ivTotal = pokemonIvTotal(p);
  if(cfg.filterIv === 'complete' && ivTotal < 36) continue;
  if(cfg.filterIv === 'incomplete' && ivTotal >= 36) continue;
  list.push({key:k, uid:p.uid, p, iv:ivTotal, ev:pokemonEvTotal(p)});
 }
 const sort = cfg.sort || 'iv_desc';
 list.sort((a,b)=>{
  if(sort === 'iv_asc') return a.iv - b.iv || a.p.id - b.p.id;
  if(sort === 'level_desc') return (b.p.level||1) - (a.p.level||1) || b.iv - a.iv;
  if(sort === 'level_asc') return (a.p.level||1) - (b.p.level||1) || a.iv - b.iv;
  if(sort === 'dex') return (a.p.id||0) - (b.p.id||0);
  return b.iv - a.iv || (b.p.level||1) - (a.p.level||1);
 });
 return list;
}
function rebuildHatcheryQueue(){
 cleanHatcheryQueue();
 saveGame();
 try{ if(typeof openHatcheryManagementMenu === 'function') openHatcheryManagementMenu('automation'); }catch(_){}
 notify(t('queue_refreshed'), 'var(--green)');
}
function setHatcheryAutomationOption(key, value){
 const cfg = ensureHatcheryAutomation();
 cfg[key] = value;
 saveGame();
 try{ openHatcheryManagementMenu('automation'); }catch(_){}
}
function cleanHatcheryQueue(){
 ensureHatcheryAutomation();
 const seen = new Set();
 G.hatcheryQueue = (G.hatcheryQueue||[]).filter(uid=>{
  if(!uid || seen.has(uid) || isPokemonInTeamByUid(uid)) return false;
  seen.add(uid);
  const key = findBoxKeyByUid(uid);
  if(!key) return false;
  const p = G.collection[key];
  if(!p || p.locked) return false;
  return true;
 });
 return G.hatcheryQueue;
}
function fillHatcherySlotFromQueue(slotIdx){
 cleanHatcheryQueue();
 if(!G.hatchery) G.hatchery = [null];
 while(G.hatcheryQueue.length){
  const uid = G.hatcheryQueue.shift();
  const key = findBoxKeyByUid(uid);
  if(!key) continue;
  const p = G.collection[key];
  if(!p || p.locked || isPokemonInTeamByUid(uid)) continue;
  delete G.collection[key];
  G.hatchery[slotIdx] = { poke:p, steps:0, stepsReq:hatcheryStepsForPokemon(p), queuedUid:uid };
  return true;
 }
 return false;
}
function refillHatcheryQueueFromRules(){
 ensureHatcheryAutomation();
 cleanHatcheryQueue();
 const cap = getHatcheryQueueLimit();
 let added = 0;
 const queued = new Set(G.hatcheryQueue || []);
 const busy = new Set((G.hatchery||[]).filter(Boolean).map(slot => slot.poke && slot.poke.uid).filter(Boolean));
 for(const entry of hatcheryCandidateEntries()){
  if((G.hatcheryQueue||[]).length >= cap) break;
  if(queued.has(entry.uid) || busy.has(entry.uid) || isUidInAnyTrainingQueue(entry.uid)) continue;
  G.hatcheryQueue.push(entry.uid);
  queued.add(entry.uid);
  added++;
 }
 return added;
}
function processHatcheryQueue(force=false){
 ensureHatcheryAutomation();
 const autoFill = !!(G.automation && G.automation.autoSeedHatchery);
 if(!force && !autoFill) return false;
 if(!G.hatchery) G.hatchery = [null];
 const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
 while(G.hatchery.length < maxSlots) G.hatchery.push(null);
 let changed = false;
 const hasEmpty = () => {
  for(let i=0;i<maxSlots;i++) if(!G.hatchery[i]) return true;
  return false;
 };
 // Always consume the manual queue first.
 for(let i=0;i<maxSlots;i++){
  if(!G.hatchery[i]) changed = fillHatcherySlotFromQueue(i) || changed;
 }
 // Auto-fill must fill every empty slot, even if the queue capacity is lower than slot count.
 if(force || autoFill){
  let guard = 0;
  while(hasEmpty() && guard++ < 8){
   if(!(G.hatcheryQueue||[]).length) refillHatcheryQueueFromRules();
   if(!(G.hatcheryQueue||[]).length) break;
   let filledThisPass = false;
   for(let i=0;i<maxSlots;i++){
    if(!G.hatchery[i]){
     const ok = fillHatcherySlotFromQueue(i);
     changed = ok || changed;
     filledThisPass = ok || filledThisPass;
    }
   }
   if(!filledThisPass) break;
  }
  // Then refill the waiting list itself up to its upgrade capacity.
  const added = refillHatcheryQueueFromRules();
  if(added) changed = true;
 }
 if(changed){
  saveGame();
  try{ renderHatcheryWindow(); }catch(_){}
  try{ if(typeof openHatcheryManagementMenu === 'function' && document.getElementById('poke-modal')?.classList.contains('open')) openHatcheryManagementMenu('automation'); }catch(_){}
 }
 return changed;
}
function renderHatcheryQueuePreview(limit=24){
 cleanHatcheryQueue();
 const cap = getHatcheryQueueLimit();
 const rows = (G.hatcheryQueue||[]).slice(0,limit).map(uid=>{
  const key = findBoxKeyByUid(uid);
  const p = key ? G.collection[key] : null;
  if(!p) return '';
  return `<div class="queue-chip">${spriteImg(p.id,p.emoji,{size:28,shiny:p.shinyActive})}<span>${p.name} · IV ${pokemonIvTotal(p)} · ${hatcheryStepsForPokemon(p)} KO</span><button class="queue-remove-btn" data-action="legacy-call" data-call="removePokemonFromHatcheryQueue" data-call-args="'${uid}'">✕</button></div>`;
 }).join('');
 return `<div class="queue-cap">${tr('queue_capacity', {count:(G.hatcheryQueue||[]).length, max:cap})}</div>` + (rows || `<div class="dict-muted">${t('queue_empty')}</div>`);
}

function hatchEgg(slotIdx=0){
 if(!G.hatchery || !G.hatchery[slotIdx]) return;
 const slot = G.hatchery[slotIdx];
 if(slot.steps < slot.stepsReq) return;
 
 
 let p;
 if(slot.isFossil){
 
 const isShiny = rollShiny();
 p = createPoke(slot.reviveId, 1, isShiny);
 if(!p){ return; }
 G.pokedex[slot.reviveId] = {...(G.pokedex[slot.reviveId]||{}), seen:true, caught:true};
 if(isShiny){ p.shinyUnlocked=true; p.shinyActive=true; p.shiny=true; unlockShinyForSpecies(slot.reviveId); }
 } else {
 p = slot.poke;
 }

 if(!p.ivs) p.ivs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const keys = ['hp','atk','def','spa','spd','spe'];
 const avail = keys.filter(k => (p.ivs[k]||0) < 6);
 let ivMsg = '';
 if(avail.length > 0){
 const picked = avail[rand(0, avail.length - 1)];
 p.ivs[picked] = (p.ivs[picked]||0) + 1;
 ivMsg = ` (+1 IV ${picked.toUpperCase()})`;
 } else {
 G.money += 5000;
 ivMsg = t('iv_money_bonus');
 }
 if(!slot.isFossil){
 const wasShiny = rollShiny();
 if(wasShiny){
 p.shinyUnlocked = true; p.shinyActive = true; p.shiny = true;
 unlockShinyForSpecies(p.id);
 }
 }
 p.level = 1;
 p.xp = xpForLevel(1);
 p.xpNext = xpForLevel(2);
 recalcPokeStats(p);
 p.currentHP = p.maxHP;
 
 G.collection[String(p.id)] = p;
 G.hatchery[slotIdx] = null;
 if(typeof addStaffXp === 'function') addStaffXp('hatchery', 1);
 
 if(G.automation && G.automation.autoSeedHatchery){
 processHatcheryQueue();
 }

 updateHeader();
 renderTeamWindow();
 renderHatcheryWindow();
 const prefix = slot.isFossil ? '🧬' : '';
 if((slot.isFossil && (p.shinyUnlocked||p.shinyActive||p.shiny)) || (!slot.isFossil && rollShiny())){
 notify(tr("m.hatchery.2", {p0:p.name}),"var(--light2)");
 } else {
 notify(tr("m.hatchery.1", {p0:p.name, p1:ivMsg}),"var(--green)");
 }
}


function getFossilInventory(){
 const inv = G.inventory || {};
 const list = [];
 const seenKeys = new Set();
 const addFossil = (key, qty) => {
   if(seenKeys.has(key) || !(qty > 0)) return;
   const reviveId = getFossilReviveId(key);
   if(!reviveId) return;
   seenKeys.add(key);
   list.push({key, displayKey:getFossilDisplayKey(key), qty, reviveId});
 };
 for(const key in FOSSIL_REVIVE_MAP) addFossil(key, inv[key] || 0);
 for(const key in inv){
   if(ITEMS[key] && ITEMS[key].type === 'fossil') addFossil(key, inv[key] || 0);
 }
 return list;
}

function reviveFossil(fossilKey){
 const invQty = (G.inventory && G.inventory[fossilKey]) || 0;
 if(invQty < 1){
 notify(t('no_fossil_left'),'var(--red)');
 return;
 }
 const pokeId = getFossilReviveId(fossilKey);
 if(!pokeId){
 notify(t('unknown_fossil'),'var(--red)');
 return;
 }
 
 G.inventory[fossilKey]--;
 if(G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];

 const isShiny = rollShiny();
 const p = createPoke(pokeId, 1, isShiny);
 if(!p){
 notify(t("n.erreur_revival"),'var(--red)');
 return;
 }
 
 if(G.team.length < 6){
 G.team.push(p);
 notify(tr('fossil_revived_party', {name:p.name}), isShiny ? 'var(--light2)' : 'var(--green)');
 } else {
 G.collection[pokeId] = p;
 notify(tr('fossil_revived_box', {name:p.name}), isShiny ? 'var(--light2)' : 'var(--green)');
 }
 G.pokedex[pokeId] = {...(G.pokedex[pokeId]||{}), seen:true, caught:true};
 if(isShiny) G.pokedex[pokeId].shiny = true;
 saveGame();
 try{ autoSave(); }catch(e){}
 updateHeader();
 renderTeamWindow();
 
 const el = document.getElementById('tab-content');
 if(el && _activeTab === 'fossil') renderFossilLab(el);
}


// --- Migrated to ES module, globals exposed ---
if (typeof getHatcherySlotUpgradeCost !== 'undefined' && typeof window !== 'undefined') window.getHatcherySlotUpgradeCost = getHatcherySlotUpgradeCost;
if (typeof upgradeHatcherySlots !== 'undefined' && typeof window !== 'undefined') window.upgradeHatcherySlots = upgradeHatcherySlots;
if (typeof hatchEgg !== 'undefined' && typeof window !== 'undefined') window.hatchEgg = hatchEgg;
if (typeof getFossilInventory !== 'undefined' && typeof window !== 'undefined') window.getFossilInventory = getFossilInventory;
if (typeof getFossilDisplayKey !== 'undefined' && typeof window !== 'undefined') window.getFossilDisplayKey = getFossilDisplayKey;
if (typeof getFossilReviveId !== 'undefined' && typeof window !== 'undefined') window.getFossilReviveId = getFossilReviveId;
if (typeof reviveFossil !== 'undefined' && typeof window !== 'undefined') window.reviveFossil = reviveFossil;

if (typeof hatcheryStepsForPokemon !== 'undefined' && typeof window !== 'undefined') window.hatcheryStepsForPokemon = hatcheryStepsForPokemon;
if (typeof pokemonIvTotal !== 'undefined' && typeof window !== 'undefined') window.pokemonIvTotal = pokemonIvTotal;
if (typeof pokemonEvTotal !== 'undefined' && typeof window !== 'undefined') window.pokemonEvTotal = pokemonEvTotal;
if (typeof ensurePokemonUid !== 'undefined' && typeof window !== 'undefined') window.ensurePokemonUid = ensurePokemonUid;
if (typeof ensureHatcheryAutomation !== 'undefined' && typeof window !== 'undefined') window.ensureHatcheryAutomation = ensureHatcheryAutomation;
if (typeof rebuildHatcheryQueue !== 'undefined' && typeof window !== 'undefined') window.rebuildHatcheryQueue = rebuildHatcheryQueue;
if (typeof setHatcheryAutomationOption !== 'undefined' && typeof window !== 'undefined') window.setHatcheryAutomationOption = setHatcheryAutomationOption;
if (typeof processHatcheryQueue !== 'undefined' && typeof window !== 'undefined') window.processHatcheryQueue = processHatcheryQueue;
if (typeof renderHatcheryQueuePreview !== 'undefined' && typeof window !== 'undefined') window.renderHatcheryQueuePreview = renderHatcheryQueuePreview;
if (typeof getHatcheryQueueLimit !== 'undefined' && typeof window !== 'undefined') window.getHatcheryQueueLimit = getHatcheryQueueLimit;
if (typeof upgradeHatcheryQueueSize !== 'undefined' && typeof window !== 'undefined') window.upgradeHatcheryQueueSize = upgradeHatcheryQueueSize;
if (typeof addPokemonToHatcheryQueue !== 'undefined' && typeof window !== 'undefined') window.addPokemonToHatcheryQueue = addPokemonToHatcheryQueue;
if (typeof removePokemonFromHatcheryQueue !== 'undefined' && typeof window !== 'undefined') window.removePokemonFromHatcheryQueue = removePokemonFromHatcheryQueue;
if (typeof clearHatcheryQueue !== 'undefined' && typeof window !== 'undefined') window.clearHatcheryQueue = clearHatcheryQueue;
if (typeof isPokemonQueuedHatchery !== 'undefined' && typeof window !== 'undefined') window.isPokemonQueuedHatchery = isPokemonQueuedHatchery;

export {};
