
// ===== extracted from src/scripts/gameplay/battle.js =====
function attemptAutoCatch(e){
  const wasShiny = !!(e.shinyActive || e.shiny);
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(!wasShiny && !battle.legendaryCatch && !chance(10)){
    addBattleLog(tr("m.catch.7", {p0:e.name}));
    return;
  }
  addBattleLog(tr("m.catch.6", {p0:e.name}));
  G.pokedex[e.id]={...(G.pokedex[e.id]||{}),seen:true,caught:true};
  if(wasShiny){
    unlockShinyForSpecies(e.id);
  }
  const alreadyOwned=speciesOwned(e.id);
  const caughtMon = createPoke(e.id, 1, wasShiny || isSpeciesShiny(e.id));
  if(caughtMon){
    caughtMon.shinyActive = wasShiny || isSpeciesShiny(e.id);
    caughtMon.shiny = caughtMon.shinyActive;
    caughtMon.shinyUnlocked = caughtMon.shinyActive || caughtMon.shinyUnlocked;
    caughtMon.heldItem = null;
  }
  if(!battle.sessionCatches) battle.sessionCatches=[];
  battle.sessionCatches.push({id:e.id, name:e.name, emoji:e.emoji||PD[e.id]?.[8]||'❓', shiny:wasShiny, dupe:alreadyOwned});
  if(alreadyOwned){
    if(!G.dupeCatches) G.dupeCatches={};
    G.dupeCatches[e.id]=(G.dupeCatches[e.id]||0)+1;
    const bonus=rand(150,350);
    G.money+=bonus;
    if(wasShiny){
      addBattleLog(tr("m.catch.5", {p0:e.name}));
    }
    addBattleLog(tr("m.catch.4", {p0:e.name, p1:bonus}));
  } else {
    if(speciesOwned(e.id)){
      const bonus=rand(150,350);
      G.money+=bonus;
      addBattleLog(tr("m.catch.3", {p0:bonus}));
    } else {
      if(G.team.length < 6){
        G.team.push(caughtMon);
        addBattleLog(tr("m.catch.2", {p0:e.name}));
      } else {
        G.collection[e.id] = caughtMon;
        addBattleLog(tr("m.catch.1", {p0:e.name}));
      }
    }
  }
  if(G.mine) G.mine.energy = Math.min(G.mine.maxEnergy||100, (G.mine.energy||0) + 15);
  EventBus.emit(EVENTS.POKEMON_CAUGHT, { loc: G.location });
  updateHeader();
  try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
  try{ renderBattleTeamRow(); }catch(_){}
  try{ if(document.querySelector('.tab.active')?.textContent.includes('Équipe')) showTab('team'); }catch(_){}
  try{ if(document.querySelector('.tab.active')?.textContent.includes('Boîte')) showTab('box'); }catch(_){}
  saveGame();
}



