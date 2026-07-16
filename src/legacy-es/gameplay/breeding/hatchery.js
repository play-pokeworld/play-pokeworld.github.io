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

function upgradeHatcherySlots(cost){
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
 
 if(G.automation && G.automation.autoSeedHatchery){
 const boxKeys = Object.keys(G.collection||{});
 const candKey = boxKeys.find(k => G.collection[k] && G.collection[k].uid !== p.uid);
 if(candKey){
 const cand = G.collection[candKey];
 if(cand){
 G.hatchery[slotIdx] = { poke: cand, steps: 0, stepsReq: clamp(Math.floor((cand.level||1)*1.2)+8, 10, 50) };
 delete G.collection[candKey];
 }
 }
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
if (typeof upgradeHatcherySlots !== 'undefined' && typeof window !== 'undefined') window.upgradeHatcherySlots = upgradeHatcherySlots;
if (typeof hatchEgg !== 'undefined' && typeof window !== 'undefined') window.hatchEgg = hatchEgg;
if (typeof getFossilInventory !== 'undefined' && typeof window !== 'undefined') window.getFossilInventory = getFossilInventory;
if (typeof getFossilDisplayKey !== 'undefined' && typeof window !== 'undefined') window.getFossilDisplayKey = getFossilDisplayKey;
if (typeof getFossilReviveId !== 'undefined' && typeof window !== 'undefined') window.getFossilReviveId = getFossilReviveId;
if (typeof reviveFossil !== 'undefined' && typeof window !== 'undefined') window.reviveFossil = reviveFossil;

export {};
