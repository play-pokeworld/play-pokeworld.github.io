
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
 
 // New talent system: unlock a random talent on capture
 if(caughtMon && typeof TALENTS_FULL !== 'undefined') {
   const speciesTalents = getSpeciesTalents(e.id);
   if(speciesTalents && speciesTalents.length > 0) {
     // Filter to talents that exist in TALENTS_FULL
     const available = speciesTalents.filter(t => TALENTS_FULL[t]);
     if(available.length > 0) {
       // Pick a random talent weighted by rarity
       const roll = rand(0, 99);
       let chosenTalent = null;
       
       if(roll < 50) {
         // 50% chance for common
         const commons = available.filter(t => TALENTS_FULL[t].rarity === 1);
         if(commons.length > 0) chosenTalent = commons[rand(0, commons.length-1)];
       } else if(roll < 80) {
         // 30% chance for uncommon
         const uncommons = available.filter(t => TALENTS_FULL[t].rarity === 2);
         if(uncommons.length > 0) chosenTalent = uncommons[rand(0, uncommons.length-1)];
       } else {
         // 20% chance for rare
         const rares = available.filter(t => TALENTS_FULL[t].rarity === 3);
         if(rares.length > 0) chosenTalent = rares[rand(0, rares.length-1)];
       }
       
       // Fallback
       if(!chosenTalent) chosenTalent = available[rand(0, available.length-1)];
       
       // Unlock the talent for this species
       if(!G.unlockedTalents) G.unlockedTalents = {};
       if(!G.unlockedTalents[e.id]) G.unlockedTalents[e.id] = [];
       if(!G.unlockedTalents[e.id].includes(chosenTalent)) {
         G.unlockedTalents[e.id].push(chosenTalent);
         if(!caughtMon.unlockedTalents) caughtMon.unlockedTalents = [];
         if(!caughtMon.unlockedTalents.includes(chosenTalent)) {
           caughtMon.unlockedTalents.push(chosenTalent);
         }
         const talentInfo = getTalentByKey(chosenTalent);
         if(talentInfo && typeof notify === 'function') {
           notify(tr("m.talent_unlocked", {
             name: getPokeName(e.id),
             talent: talentInfo.name,
             rarity: getRarityLabel(talentInfo.rarity)
           }), 'var(--accent)');
         }
       }
     }
   }
 }
 
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
 // Use unique key to avoid overwriting existing Pokémon in collection
 let boxId = 'box_' + e.id + '_' + Date.now();
 while(G.collection[boxId]) {
 boxId = 'box_' + e.id + '_' + Date.now() + Math.floor(Math.random()*1000);
 }
 G.collection[boxId] = caughtMon;
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



