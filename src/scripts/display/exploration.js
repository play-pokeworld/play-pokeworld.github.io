// ============================================================
// EXPLORATION — (split from map.js)
// ============================================================
function pickWildEncounter(loc, roamingId){
  if(roamingId && Math.random() < 0.01){
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    const wp = createPoke(roamingId, 45, rollShiny());
    if(wp) addBattleLog(lang === 'en' ? `⚡ ROAMING LEGENDARY APPEARED: ${wp.name}!` : `⚡ UN LÉGENDAIRE ERRANT APPARAÎT : ${wp.name} !`);
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
  if(G.team.length===0){setMsg('❌ Vous n\'avez pas de Pokémon !'); return;}
  const loc=getLocObj(G.location);
  if(!loc || !loc.wild || !loc.wild.length){setMsg('Aucun Pokémon sauvage ici.'); return;}
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
      for(const m of p.moves) m.pp=m.maxPP;
      healed=true;
    }
  }
  if(healed){
    notify('🏥 Équipe soignée au Centre Pokémon !');
    setMsg('💊 Tous vos Pokémon ont été soignés !');
    renderTeamWindow();
  } else setMsg('Vos Pokémon sont déjà en pleine forme !');
}


function addToInventory(key, qty){
  if(!ITEMS[key]) return;
  const cur=G.inventory[key]||0;
  const maxLimit = ITEMS[key].buff ? BAG_MAX : 999999;
  G.inventory[key]=Math.min(maxLimit, cur+qty);
}

// ============================================================
// TEAM TAB
// ============================================================

