// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
function ensureTeamSlotItems(){
 if(typeof G === 'undefined' || !G) return [];
 if(!Array.isArray(G.teamSlotItems)) G.teamSlotItems = [];
 for(let i=0;i<6;i++){
  if(G.teamSlotItems[i] === undefined) G.teamSlotItems[i] = null;
 }
 const team = G.team || [];
 for(let i=0;i<team.length;i++){
  const p = team[i];
  if(p && p.heldItem && !G.teamSlotItems[i]) G.teamSlotItems[i] = p.heldItem;
 }
 syncTeamSlotHeldItems();
 return G.teamSlotItems;
}
function syncTeamSlotHeldItems(){
 if(typeof G === 'undefined' || !G) return;
 if(!Array.isArray(G.teamSlotItems)) G.teamSlotItems = [];
 for(let i=0;i<6;i++) if(G.teamSlotItems[i] === undefined) G.teamSlotItems[i] = null;
 const team = G.team || [];
 // Phase 16: purge the "orphan" items beyond the team size — a ghost
 // left by an old, badly synchronized deletion/swap.
 for(let i=team.length;i<6;i++) G.teamSlotItems[i] = null;
 for(let i=0;i<team.length;i++){
  if(team[i]) team[i].heldItem = G.teamSlotItems[i] || null;
 }
 for(const boxed of Object.values(G.collection || {})){
  if(boxed) boxed.heldItem = null;
 }
 for(const slot of (G.hatchery || [])){
  if(slot && slot.poke) slot.poke.heldItem = null;
 }
}
// Phase 17: global "battle in progress" lock — Pokemon order, move order
// and team held items are all frozen during a battle.
function isTeamStructureLocked(){
 const b = (typeof battle !== 'undefined') ? battle : (globalThis.battle || null);
 return !!(b && b.active);
}
function notifyTeamStructureLocked(){
 if(typeof notify === 'function') notify(t('action_blocked_in_battle'), 'var(--red)');
}
function getTeamSlotItem(idx){
 ensureTeamSlotItems();
 return (G.teamSlotItems && G.teamSlotItems[idx]) || null;
}
function setTeamSlotItem(idx, key){
 ensureTeamSlotItems();
 if(idx == null || idx < 0 || idx >= 6) return;
 G.teamSlotItems[idx] = key || null;
 syncTeamSlotHeldItems();
}
function clearTeamSlotItem(idx){ setTeamSlotItem(idx, null); }
// Phase 16: held items follow the POKEMON, not the slot.
// NB: these two helpers do NOT call ensureTeamSlotItems — its p.heldItem
// fill logic and orphan-slot purge are indexed on the CURRENT team
// size; but the caller has already reordered/removed Pokemon, so the old
// indices must keep being read as-is until the final splice/swap.
function _teamSlotItemsPadded(){
 if(typeof G === 'undefined' || !G) return null;
 if(!Array.isArray(G.teamSlotItems)) G.teamSlotItems = [];
 for(let i=0;i<6;i++) if(G.teamSlotItems[i] === undefined) G.teamSlotItems[i] = null;
 return G.teamSlotItems;
}
// Swaps two team positions (drag & drop): the items swap places with
// their carriers.
function swapTeamSlotItems(a, b){
 const slots = _teamSlotItemsPadded();
 if(!slots) return;
 a = Number(a); b = Number(b);
 if(isNaN(a) || isNaN(b) || a === b || a < 0 || b < 0 || a >= 6 || b >= 6) return;
 const tmp = slots[a];
 slots[a] = slots[b];
 slots[b] = tmp;
 syncTeamSlotHeldItems();
}
// Removing a Pokemon from the team: its item leaves with it (the slot
// is freed) and the following Pokemon's items shift by one position to
// stay on their carrier.
function removeTeamSlotItemAt(idx){
 const slots = _teamSlotItemsPadded();
 if(!slots) return;
 idx = Number(idx);
 if(isNaN(idx) || idx < 0 || idx >= 6) return;
 slots.splice(idx, 1);
 while(slots.length < 6) slots.push(null);
 syncTeamSlotHeldItems();
}
function clearPokemonHeldItem(p){ if(p) p.heldItem = null; }
function getTeamIndexOfPokemon(p){ return (G && G.team && p) ? G.team.indexOf(p) : -1; }
function getHeldItemForPokemon(p){
 if(!p) return null;
 const idx = getTeamIndexOfPokemon(p);
 if(idx >= 0) return getTeamSlotItem(idx);
 return p.heldItem || null;
}
function itemEquippedOnTeam(key){
 ensureTeamSlotItems();
 for(let i=0;i<(G.team||[]).length;i++){
  if(G.teamSlotItems[i] === key) return G.team[i] || {name:tr('team_slot_name', {slot:i+1})};
 }
 return null;
}
function getHeldBuff(p){
 const out={atk:0,def:0,spe:0,hpMax:0,spa:0,spd:0};
 const heldKey = getHeldItemForPokemon(p);
 if(!p||!heldKey) return out;
 const itm=ITEMS[heldKey];
 if(!itm) return out;
 // New system items
 if(itm.stat && itm.mult && out[itm.stat] !== undefined) {
   out[itm.stat] = itm.mult - 1;
   return out;
 }
 // Type boost: translate to atk/spa boost
 if(itm.category === 'type_boost') {
   // Phase 17: these items (Mystic Water, Hard Stone…) were INERT in
   // battle — their power was only consumed for the description text.
   // Their effect becomes active: +10% damage (×1.10 displayed,
   // powerFormula level 1), translated as an atk/spa bonus — neutral
   // typing, so valid
    // Team management and slot position swap rules
   out.atk = itm.boost || 0.1;
   out.spa = itm.boost || 0.1;
   return out;
 }
 // Legacy buff system
 if(itm.buff){
   const count=Math.min(25, G.inventory[heldKey]||0);
   const ratio=count/25;
   for(const k of Object.keys(itm.buff)) out[k]=itm.buff[k]*ratio;
 }
 return out;
}
function buffedStat(p, stat){
 const b=getHeldBuff(p);
 if(stat==='hpMax') return Math.floor(p.maxHP*(1+b.hpMax));
 return Math.floor(p[stat]*(1+(b[stat]||0)));
}
// Phase 18 — an item is "equippable" if it is of type 'held' (all the
// modern categories: type_boost, choice, berries…) or if it belongs to
// the legacy `buff` system (Pomeg-class berries & co). Evolution stones,
// TM/HM, treasures… are NOT held: they are used from the bag.
function isHeldEquippableItem(key){
 const itm=(typeof ITEMS!=='undefined' && ITEMS) ? ITEMS[key] : null;
 return !!(itm && (itm.type==='held' || itm.buff));
}
function equipItemOn(teamIdx, key){
 if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
 ensureTeamSlotItems();
 const p=G.team[teamIdx];
 if(!p) return;
 if(!ITEMS[key]){ setMsg(t("m.team.6")); return; }
 if(!isHeldEquippableItem(key)){ setMsg(t("m.team.6")); return; }
 if(!(G.inventory[key]>0)){ setMsg(t("m.team.5")); return; }
 const other=itemEquippedOnTeam(key);
 if(other && other!==p){
 setMsg(tr("m.team.4", {p0:getItemName(key), p1:other.name}));
 return;
 }
 setTeamSlotItem(teamIdx, key);
 notify(tr("m.team.3", {p0:p.name, p1:getItemName(key)}));
 saveGame();
 showTab('inventory');
}
function unequipItem(teamIdx){
 if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
 ensureTeamSlotItems();
 const p=G.team[teamIdx];
 const heldKey = getTeamSlotItem(teamIdx);
 if(!p||!heldKey) return;
 const nm=getItemName(heldKey)||heldKey;
 clearTeamSlotItem(teamIdx);
 notify(tr("m.team.2", {p0:p.name, p1:nm}));
 saveGame();
 showTab('inventory');
}
function changePokeTalent(teamIdx, boxId, newTal){
 // Fix: cannot change talent if in current battle
 try {
   if (typeof battle !== 'undefined' && battle && battle.active) {
     const activePoke = (typeof getActivePlayerPoke === 'function') ? getActivePlayerPoke() : null;
     let thisPoke = null;
     if (typeof boxId !== 'undefined' && boxId && G.collection) {
       thisPoke = G.collection[boxId] || G.collection[String(boxId)];
     } else if (typeof teamIdx !== 'undefined' && G.team) {
       thisPoke = G.team[teamIdx];
     } else if (typeof idx !== 'undefined' && G.team) {
       thisPoke = G.team[idx];
     }
     if (activePoke && thisPoke && activePoke.uid && thisPoke.uid && activePoke.uid === thisPoke.uid) {
       if (typeof notify === 'function') notify(t('action_blocked_in_battle'), 'var(--red)');
       return;
     }
   }
 } catch(_){}
 if(!newTal) return;
 let p = null;
 if(boxId && boxId !== 'undefined' && boxId !== 'null'){
 p = G.collection[boxId] || G.collection[String(boxId)];
 } else if(teamIdx !== null && teamIdx !== undefined && teamIdx >= 0){
 p = G.team[teamIdx];
 }
 if(!p) return;
 p.talent = newTal;
 saveGame();
 notify(tr("m.team.1", {p0:p.name, p1:getTalentName(newTal)}), 'var(--accent)');
 if(boxId && boxId !== 'undefined' && boxId !== 'null') openBoxPokeModal(boxId);
 else openPokeModal(teamIdx);
}


// --- Migrated to ES module, globals exposed ---
if (typeof ensureTeamSlotItems !== 'undefined') { if (typeof window !== 'undefined') window.ensureTeamSlotItems = ensureTeamSlotItems; if (typeof globalThis !== 'undefined') globalThis.ensureTeamSlotItems = ensureTeamSlotItems; }
if (typeof syncTeamSlotHeldItems !== 'undefined') { if (typeof window !== 'undefined') window.syncTeamSlotHeldItems = syncTeamSlotHeldItems; if (typeof globalThis !== 'undefined') globalThis.syncTeamSlotHeldItems = syncTeamSlotHeldItems; }
if (typeof getTeamSlotItem !== 'undefined') { if (typeof window !== 'undefined') window.getTeamSlotItem = getTeamSlotItem; if (typeof globalThis !== 'undefined') globalThis.getTeamSlotItem = getTeamSlotItem; }
if (typeof setTeamSlotItem !== 'undefined') { if (typeof window !== 'undefined') window.setTeamSlotItem = setTeamSlotItem; if (typeof globalThis !== 'undefined') globalThis.setTeamSlotItem = setTeamSlotItem; }
if (typeof clearTeamSlotItem !== 'undefined') { if (typeof window !== 'undefined') window.clearTeamSlotItem = clearTeamSlotItem; if (typeof globalThis !== 'undefined') globalThis.clearTeamSlotItem = clearTeamSlotItem; }
if (typeof swapTeamSlotItems !== 'undefined') { if (typeof window !== 'undefined') window.swapTeamSlotItems = swapTeamSlotItems; if (typeof globalThis !== 'undefined') globalThis.swapTeamSlotItems = swapTeamSlotItems; }
if (typeof isTeamStructureLocked !== 'undefined') { if (typeof window !== 'undefined') window.isTeamStructureLocked = isTeamStructureLocked; if (typeof globalThis !== 'undefined') globalThis.isTeamStructureLocked = isTeamStructureLocked; }
if (typeof notifyTeamStructureLocked !== 'undefined') { if (typeof window !== 'undefined') window.notifyTeamStructureLocked = notifyTeamStructureLocked; if (typeof globalThis !== 'undefined') globalThis.notifyTeamStructureLocked = notifyTeamStructureLocked; }
if (typeof removeTeamSlotItemAt !== 'undefined') { if (typeof window !== 'undefined') window.removeTeamSlotItemAt = removeTeamSlotItemAt; if (typeof globalThis !== 'undefined') globalThis.removeTeamSlotItemAt = removeTeamSlotItemAt; }
if (typeof clearPokemonHeldItem !== 'undefined') { if (typeof window !== 'undefined') window.clearPokemonHeldItem = clearPokemonHeldItem; if (typeof globalThis !== 'undefined') globalThis.clearPokemonHeldItem = clearPokemonHeldItem; }
if (typeof getHeldItemForPokemon !== 'undefined') { if (typeof window !== 'undefined') window.getHeldItemForPokemon = getHeldItemForPokemon; if (typeof globalThis !== 'undefined') globalThis.getHeldItemForPokemon = getHeldItemForPokemon; }
if (typeof itemEquippedOnTeam !== 'undefined') { if (typeof window !== 'undefined') window.itemEquippedOnTeam = itemEquippedOnTeam; if (typeof globalThis !== 'undefined') globalThis.itemEquippedOnTeam = itemEquippedOnTeam; }
if (typeof getHeldBuff !== 'undefined') { if (typeof window !== 'undefined') window.getHeldBuff = getHeldBuff; if (typeof globalThis !== 'undefined') globalThis.getHeldBuff = getHeldBuff; }
if (typeof buffedStat !== 'undefined') { if (typeof window !== 'undefined') window.buffedStat = buffedStat; if (typeof globalThis !== 'undefined') globalThis.buffedStat = buffedStat; }
if (typeof equipItemOn !== 'undefined') { if (typeof window !== 'undefined') window.equipItemOn = equipItemOn; if (typeof globalThis !== 'undefined') globalThis.equipItemOn = equipItemOn; }
if (typeof isHeldEquippableItem !== 'undefined') { if (typeof window !== 'undefined') window.isHeldEquippableItem = isHeldEquippableItem; if (typeof globalThis !== 'undefined') globalThis.isHeldEquippableItem = isHeldEquippableItem; }
if (typeof unequipItem !== 'undefined') { if (typeof window !== 'undefined') window.unequipItem = unequipItem; if (typeof globalThis !== 'undefined') globalThis.unequipItem = unequipItem; }
if (typeof changePokeTalent !== 'undefined') { if (typeof window !== 'undefined') window.changePokeTalent = changePokeTalent; if (typeof globalThis !== 'undefined') globalThis.changePokeTalent = changePokeTalent; }



// --- Exported globals ---
if (typeof getTeamIndexOfPokemon !== 'undefined') { if (typeof window !== 'undefined') window.getTeamIndexOfPokemon = getTeamIndexOfPokemon; if (typeof globalThis !== 'undefined') globalThis.getTeamIndexOfPokemon = getTeamIndexOfPokemon; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  ensureTeamSlotItems,
  syncTeamSlotHeldItems,
  getTeamSlotItem,
  setTeamSlotItem,
  clearTeamSlotItem,
  swapTeamSlotItems,
  isTeamStructureLocked,
  notifyTeamStructureLocked,
  removeTeamSlotItemAt,
  clearPokemonHeldItem,
  getHeldItemForPokemon,
  itemEquippedOnTeam,
  getHeldBuff,
  buffedStat,
  equipItemOn,
  isHeldEquippableItem,
  unequipItem,
  changePokeTalent,
  getTeamIndexOfPokemon,
};

