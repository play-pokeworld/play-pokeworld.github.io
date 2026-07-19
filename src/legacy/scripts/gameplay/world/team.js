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
 if(!itm||!itm.buff) return out;
 const count=Math.min(BAG_MAX, G.inventory[heldKey]||0);
 const ratio=count/BAG_MAX;
 for(const k of Object.keys(itm.buff)) out[k]=itm.buff[k]*ratio;
 return out;
}
function buffedStat(p, stat){
 const b=getHeldBuff(p);
 if(stat==='hpMax') return Math.floor(p.maxHP*(1+b.hpMax));
 return Math.floor(p[stat]*(1+(b[stat]||0)));
}
function equipItemOn(teamIdx, key){
 ensureTeamSlotItems();
 const p=G.team[teamIdx];
 if(!p) return;
 if(!ITEMS[key]||!ITEMS[key].buff){ setMsg(t("m.team.6")); return; }
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
     var activePoke = (typeof getActivePlayerPoke === 'function') ? getActivePlayerPoke() : null;
     var thisPoke = null;
     if (typeof boxId !== 'undefined' && boxId && G.collection) {
       thisPoke = G.collection[boxId] || G.collection[String(boxId)];
     } else if (typeof teamIdx !== 'undefined' && G.team) {
       thisPoke = G.team[teamIdx];
     } else if (typeof idx !== 'undefined' && G.team) {
       thisPoke = G.team[idx];
     }
     if (activePoke && thisPoke && activePoke.uid && thisPoke.uid && activePoke.uid === thisPoke.uid) {
       if (typeof notify === 'function') notify((typeof t === 'function' ? t('action_blocked_in_battle') : 'Action impossible en combat'), 'var(--red)');
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
 const lang = G.lang || 'fr';
 notify(tr("m.team.1", {p0:p.name, p1:getTalentName(newTal)}), 'var(--accent)');
 if(boxId && boxId !== 'undefined' && boxId !== 'null') openBoxPokeModal(boxId);
 else openPokeModal(teamIdx);
}

