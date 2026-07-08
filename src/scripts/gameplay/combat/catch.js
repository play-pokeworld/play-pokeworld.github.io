
// ===== extracted from src/scripts/gameplay/battle.js =====
function attemptAutoCatch(e){
  const wasShiny = !!(e.shinyActive || e.shiny);
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(!wasShiny && !battle.legendaryCatch && !chance(10)){
    addBattleLog(lang === 'en' ? `<span style="color:var(--dim)">💨 The wild ${e.name} escaped capture...</span>` : `<span style="color:var(--dim)">💨 Le ${e.name} sauvage s'est échappé après sa défaite...</span>`);
    return;
  }
  addBattleLog(lang === 'en' ? `<span style="color:var(--green)">🎊 ${e.name} was captured!</span>` : `<span style="color:var(--green)">🎊 ${e.name} a été capturé !</span>`);
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
      addBattleLog(lang === 'en' ? `<span class="shiny-tag">✨</span> Shiny Skin unlocked for ${e.name}!` : `<span class="shiny-tag">✨</span> Skin Shiny débloqué pour ${e.name} !`);
    }
    addBattleLog(lang === 'en' ? `You already own ${e.name}! Traded for ${bonus}₽.` : `Vous possédez déjà ${e.name} ! Échangé contre ${bonus}₽.`);
  } else {
    if(speciesOwned(e.id)){
      const bonus=rand(150,350);
      G.money+=bonus;
      addBattleLog(lang === 'en' ? `Duplicate bonus: +${bonus}₽` : `Doublon détecté – ${bonus}₽`);
    } else {
      if(G.team.length < 6){
        G.team.push(caughtMon);
        addBattleLog(lang === 'en' ? `${e.name} Lv.1 joined your active Party!` : `${e.name} Nv.1 rejoint votre Équipe active !`);
      } else {
        G.collection[e.id] = caughtMon;
        addBattleLog(lang === 'en' ? `${e.name} Lv.1 added to 📦 Box!` : `${e.name} Nv.1 rejoint votre 📦 Boîte !`);
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

