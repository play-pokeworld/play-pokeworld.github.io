function pickWildEncounter(loc, roamingId){
 if(roamingId && Math.random() < 0.01){
 const wp = createPoke(roamingId, 45, rollShiny());
 if(wp) addBattleLog(tr('roaming_legendary_appeared', {name:wp.name}));
 return wp;
 }
 const wild = loc?.wild || [];
 if(!wild.length) return null;

 const r = Math.random();
 let targetBucket = r < 0.04 ? 'rare' : r < 0.24 ? 'uncommon' : 'common';
 let bucketEntries = wild.filter(w => (w[3] || 'common') === targetBucket);
 if(!bucketEntries.length){
 bucketEntries = wild.filter(w => (w[3] || 'common') === 'common');
 if(!bucketEntries.length) bucketEntries = wild;
 }
 const entry = bucketEntries[rand(0, bucketEntries.length - 1)];
 const lv = rand(entry[1], entry[2]);
 return createPoke(entry[0], lv, rollShiny());
}


function exploreArea(){
 if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){ notify(t('training_in_progress_no_battle'), 'var(--red)'); return; }
 if(G.team.length===0){setMsg(t('no_pokemon_in_team')); return;}
 const loc=getLocObj(G.location);
 if(!loc || !loc.wild || !loc.wild.length){setMsg(t('no_wild_pokemon_here')); return;}
 const roamingId = getRoamingLegendaryForRoute(G.location);
 const wp = pickWildEncounter(loc, roamingId);
 if(wp) startBattle(wp, false);
}


function healTeam(){
 let healed=false;
 for(const p of G.team){
 if(p.currentHP<p.maxHP||p.status){
 p.currentHP=p.maxHP;
 p.status=null;
 healed=true;
 }
 }
 if(healed){
 notify(t('team_healed_center'));
 setMsg(t('all_pokemon_healed'));
 renderTeamWindow();
 } else setMsg(t('pokemon_already_healthy'));
}


function addToInventory(key, qty){
 if(!ITEMS[key]) return;
 const cur=G.inventory[key]||0;
 const maxLimit = ITEMS[key].buff ? BAG_MAX : 999999;
 G.inventory[key]=Math.min(maxLimit, cur+qty);
}


// --- Migrated to ES module, globals exposed ---
if (typeof pickWildEncounter !== 'undefined' && typeof window !== 'undefined') window.pickWildEncounter = pickWildEncounter;
if (typeof exploreArea !== 'undefined' && typeof window !== 'undefined') window.exploreArea = exploreArea;
if (typeof healTeam !== 'undefined' && typeof window !== 'undefined') window.healTeam = healTeam;
if (typeof addToInventory !== 'undefined' && typeof window !== 'undefined') window.addToInventory = addToInventory;


