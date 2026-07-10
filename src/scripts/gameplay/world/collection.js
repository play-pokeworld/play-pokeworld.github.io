
// ===== extracted from src/scripts/gameplay/world.js =====
function rollShiny(){
  const baseRate = 1 / 4096;
  const rolls = (typeof G !== 'undefined' && G && G.inventory && G.inventory['chroma_charm'] > 0) ? 3 : 1;
  return Math.random() < (baseRate * rolls);
}
function speciesOwned(id){
  const nid = Number(id);
  if(G.team.some(p=>Number(p.id)===nid)) return true;
  if(G.collection[nid]) return true;
  if(G.collection[String(nid)]) return true;
  for(const k in G.collection){
    const poke = G.collection[k];
    if(poke && Number(poke.id)===nid) return true;
  }
  return false;
}
function getSpeciesInstance(id){
  const nid=Number(id);
  const inTeam=G.team.find(p=>Number(p.id)===nid);
  if(inTeam) return {loc:'team', poke:inTeam};
  const box = G.collection[nid] || G.collection[String(nid)] || null;
  if(box) return {loc:'box', poke:box};
  for(const k in G.collection){
    const poke=G.collection[k];
    if(poke && Number(poke.id)===nid) return {loc:'box', poke};
  }
  return null;
}
function isSpeciesShiny(id){
  const nid = Number(id);
  if(!nid) return false;
  if(G.pokedex && G.pokedex[nid]?.shiny) return true;
  if(G.team.some(p=>Number(p.id)===nid && (p.shinyUnlocked || p.shinyActive || p.shiny))) return true;
  const box = G.collection[nid] || G.collection[String(nid)];
  if(box && (box.shinyUnlocked || box.shinyActive || box.shiny)) return true;
  for(const k in G.collection){
    const poke = G.collection[k];
    if(poke && Number(poke.id)===nid && (poke.shinyUnlocked || poke.shinyActive || poke.shiny)) return true;
  }
  return false;
}
function syncShinyState(){
  if(!G.pokedex) G.pokedex = {};
  const shinySpecies = new Set();
  for(const idStr in G.pokedex){
    if(G.pokedex[idStr]?.shiny) shinySpecies.add(Number(idStr));
  }
  for(const p of G.team){
    if(p && (p.shinyUnlocked || p.shinyActive || p.shiny)) shinySpecies.add(Number(p.id));
  }
  for(const k in G.collection){
    const p = G.collection[k];
    if(p && (p.shinyUnlocked || p.shinyActive || p.shiny)) shinySpecies.add(Number(p.id));
  }
  for(const nid of shinySpecies){
    if(!G.pokedex[nid]) G.pokedex[nid] = {seen:true, caught:true};
    G.pokedex[nid].shiny = true;
  }
  for(const p of G.team){
    if(p && shinySpecies.has(Number(p.id))){
      p.shinyUnlocked = true;
      p.shinyActive = true;
      p.shiny = true;
    }
  }
  for(const k in G.collection){
    const p = G.collection[k];
    if(p && shinySpecies.has(Number(p.id))){
      p.shinyUnlocked = true;
      p.shinyActive = true;
      p.shiny = true;
    }
  }
}
function unlockShinyForSpecies(id){
  const nid = Number(id);
  if(!G.pokedex[nid]) G.pokedex[nid] = {seen:true, caught:true};
  G.pokedex[nid].shiny = true;
  for(const p of G.team){
    if(Number(p.id)===nid){
      p.shinyUnlocked = true;
      p.shinyActive = true;
      p.shiny = true;
    }
  }
  const box = G.collection[nid] || G.collection[String(nid)];
  if(box){
    box.shinyUnlocked = true;
    box.shinyActive = true;
    box.shiny = true;
  }
  for(const k in G.collection){
    const poke = G.collection[k];
    if(poke && Number(poke.id)===nid){
      poke.shinyUnlocked = true;
      poke.shinyActive = true;
      poke.shiny = true;
    }
  }
}
function locCompletion(locId){
  const loc=getLocObj(locId);
  if(!loc||!loc.wild||!loc.wild.length) return null;
  const ids=[...new Set(loc.wild.map(w=>w[0]))];
  const caught=ids.filter(id=>speciesOwned(id)).length;
  return {caught, total:ids.length, ids};
}
function boxedEntries(){
  const out=[];
  for(const [idStr,poke] of Object.entries(G.collection||{})){
    if(!poke) continue;
    const cid = poke.id || parseInt(String(idStr).replace(/\D/g, ''), 10) || 1;
    out.push({id: idStr, cleanId: +cid, poke});
  }
  out.sort((a,b)=>a.cleanId-b.cleanId);
  return out;
}



