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
 // Passe 16 : purge les objets « orphelins » au-delà de la taille de
 // l'équipe — sinon un Pokémon ajouté plus tard hériterait d'un objet
 // fantôme laissé par une ancienne suppression/échange mal synchronisé.
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
// Passe 17 : verrou global « combat en cours » — ordre des Pokémon, ordre
// des attaques et objets tenus de l'équipe sont TOUS gelés pendant un combat.
function isTeamStructureLocked(){
 const b = (typeof battle !== 'undefined') ? battle : (globalThis.battle || null);
 return !!(b && b.active);
}
function notifyTeamStructureLocked(){
 if(typeof notify === 'function') notify((typeof t === 'function' ? t('action_blocked_in_battle') : 'Action impossible en combat'), 'var(--red)');
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
// Passe 16 : les objets tenus suivent le POKÉMON, pas le slot.
// NB : ces deux helpers n'appellent PAS ensureTeamSlotItems — sa logique de
// remplissage depuis p.heldItem et sa purge des slots orphelins sont
// indexées sur la taille ACTUELLE de l'équipe ; or l'appelant a déjà
// réordonné/retiré des Pokémon, les anciens indices doivent rester lus
// tels quels jusqu'au splice/swap définitif.
function _teamSlotItemsPadded(){
 if(typeof G === 'undefined' || !G) return null;
 if(!Array.isArray(G.teamSlotItems)) G.teamSlotItems = [];
 for(let i=0;i<6;i++) if(G.teamSlotItems[i] === undefined) G.teamSlotItems[i] = null;
 return G.teamSlotItems;
}
// Échange de deux positions d'équipe (glisser-déposer) : les objets
// échangent de place avec leurs porteurs.
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
// Suppression d'un Pokémon de l'équipe : son objet part avec lui (le slot
// est libéré) et les objets des Pokémon suivants glissent d'une position
// pour rester sur leur porteur.
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
   // Passe 17 : ces objets (Eau Mystique, Pierre Dure…) étaient INERTES en
   // combat — leur puissance n'était consommée que pour la description.
   // Leur effet devient actif : +10% dégâts (×1.10 affiché, powerFormula
   // de niveau 1), traduit en bonus atk/spa — neutre de côté, donc valable
   // pour les équipes ennemies officielles comme pour le joueur.
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
// Passe 18 — un objet est « tenable » s'il est de type 'held' (toutes les
// catégories modernes : type_boost, choice, baies…) ou s'il relève du
// système legacy `buff` (Baie Prine & co). Les pierres d'évolution, CT/CS,
// trésors… ne se TIENNENT pas : elles s'utilisent depuis le sac.
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


// --- Migrated to ES module, globals exposed ---
if (typeof ensureTeamSlotItems !== 'undefined' && typeof window !== 'undefined') window.ensureTeamSlotItems = ensureTeamSlotItems;
if (typeof syncTeamSlotHeldItems !== 'undefined' && typeof window !== 'undefined') window.syncTeamSlotHeldItems = syncTeamSlotHeldItems;
if (typeof getTeamSlotItem !== 'undefined' && typeof window !== 'undefined') window.getTeamSlotItem = getTeamSlotItem;
if (typeof setTeamSlotItem !== 'undefined' && typeof window !== 'undefined') window.setTeamSlotItem = setTeamSlotItem;
if (typeof clearTeamSlotItem !== 'undefined' && typeof window !== 'undefined') window.clearTeamSlotItem = clearTeamSlotItem;
if (typeof swapTeamSlotItems !== 'undefined' && typeof window !== 'undefined') window.swapTeamSlotItems = swapTeamSlotItems;
if (typeof isTeamStructureLocked !== 'undefined' && typeof window !== 'undefined') window.isTeamStructureLocked = isTeamStructureLocked;
if (typeof notifyTeamStructureLocked !== 'undefined'&& typeof window !== 'undefined') window.notifyTeamStructureLocked = notifyTeamStructureLocked;
if (typeof removeTeamSlotItemAt !== 'undefined'&& typeof window !== 'undefined') window.removeTeamSlotItemAt = removeTeamSlotItemAt;
if (typeof clearPokemonHeldItem !== 'undefined' && typeof window !== 'undefined') window.clearPokemonHeldItem = clearPokemonHeldItem;
if (typeof getHeldItemForPokemon !== 'undefined' && typeof window !== 'undefined') window.getHeldItemForPokemon = getHeldItemForPokemon;
if (typeof itemEquippedOnTeam !== 'undefined' && typeof window !== 'undefined') window.itemEquippedOnTeam = itemEquippedOnTeam;
if (typeof getHeldBuff !== 'undefined' && typeof window !== 'undefined') window.getHeldBuff = getHeldBuff;
if (typeof buffedStat !== 'undefined' && typeof window !== 'undefined') window.buffedStat = buffedStat;
if (typeof equipItemOn !== 'undefined' && typeof window !== 'undefined') window.equipItemOn = equipItemOn;
if (typeof isHeldEquippableItem !== 'undefined' && typeof window !== 'undefined') window.isHeldEquippableItem = isHeldEquippableItem;
if (typeof unequipItem !== 'undefined' && typeof window !== 'undefined') window.unequipItem = unequipItem;
if (typeof changePokeTalent !== 'undefined' && typeof window !== 'undefined') window.changePokeTalent = changePokeTalent;


