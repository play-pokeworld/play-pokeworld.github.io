
function rollWeightedTalentForSpecies(speciesId){
 const tals = (typeof getSpeciesTalents === 'function') ? getSpeciesTalents(speciesId) : [];
 const available = tals.filter(tal => typeof TALENTS_FULL !== 'undefined' && TALENTS_FULL[tal]);
 if(!available.length) return null;
 const weighted = [];
 available.forEach(tal => {
   const rarity = TALENTS_FULL[tal].rarity || 1;
   const weight = rarity === 1 ? 60 : rarity === 2 ? 30 : 12;
   for(let i=0;i<weight;i++) weighted.push(tal);
 });
 return weighted[rand(0, weighted.length-1)] || available[0];
}
function unlockCapturedTalent(speciesId, talent){
 if(!talent || typeof TALENTS_FULL === 'undefined' || !TALENTS_FULL[talent]) return false;
 if(!G.unlockedTalents) G.unlockedTalents = {};
 if(!G.unlockedTalents[speciesId]) G.unlockedTalents[speciesId] = [];
 const already = G.unlockedTalents[speciesId].includes(talent);
 const rarity = TALENTS_FULL[talent].rarity || 1;
 const chancePct = rarity === 1 ? 100 : rarity === 2 ? 55 : 30;
 if(!already && chance(chancePct)){
   G.unlockedTalents[speciesId].push(talent);
   return true;
 }
 if(!already && G.unlockedTalents[speciesId].length === 0){
   G.unlockedTalents[speciesId].push(talent);
   return true;
 }
 return false;
}
function rollCaptureIv(caughtMon){
 if(!caughtMon) return null;
 if(!caughtMon.ivs) caughtMon.ivs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 if(!chance(10)) return null;
 const keys = ['hp','atk','def','spa','spd','spe'];
 const avail = keys.filter(k => (caughtMon.ivs[k]||0) < 6);
 if(!avail.length) return null;
 const picked = avail[rand(0, avail.length-1)];
 caughtMon.ivs[picked] = (caughtMon.ivs[picked]||0) + 1;
 try{ recalcPokeStats(caughtMon); }catch(_){}
 return picked;
}

function attemptAutoCatch(e){
 const wasShiny = !!(e.shinyActive || e.shiny);
 if(!wasShiny && !battle.legendaryCatch && !chance(10)){
 addBattleLog(tr("m.catch.7", {p0:e.name}));
 return;
 }
 addBattleLog(tr("m.catch.6", {p0:e.name}));
 G.pokedex[e.id]={...(G.pokedex[e.id]||{}),seen:true,caught:true};
 if(wasShiny) unlockShinyForSpecies(e.id);
 const alreadyOwned=speciesOwned(e.id);
 const caughtMon = createPoke(e.id, 1, wasShiny || isSpeciesShiny(e.id));
 if(caughtMon){
   const rolledTalent = rollWeightedTalentForSpecies(e.id);
   if(rolledTalent) caughtMon.talent = rolledTalent;
   const talentUnlocked = unlockCapturedTalent(e.id, caughtMon.talent);
   const ivKey = rollCaptureIv(caughtMon);
   caughtMon.shinyActive = wasShiny || isSpeciesShiny(e.id);
   caughtMon.shiny = caughtMon.shinyActive;
   caughtMon.shinyUnlocked = caughtMon.shinyActive || caughtMon.shinyUnlocked;
   caughtMon.heldItem = null;
   if(talentUnlocked){
     const talentInfo = getTalentByKey(caughtMon.talent);
     if(talentInfo && typeof notify === 'function') notify(tr("m.talent_unlocked", {name:getPokeName(e.id), talent:talentInfo.name, rarity:getRarityLabel(talentInfo.rarity)}), 'var(--accent)');
     addBattleLog(`🧬 Talent découvert : ${getTalentName(caughtMon.talent)} !`);
   }
   if(ivKey) addBattleLog(`⭐ IV gagné sur ${caughtMon.name} : ${ivKey.toUpperCase()} +1 !`);
 }
 if(!battle.sessionCatches) battle.sessionCatches=[];
 battle.sessionCatches.push({id:e.id, name:e.name, emoji:e.emoji||PD[e.id]?.[12]||'❓', shiny:wasShiny, dupe:alreadyOwned});
 try{ if (typeof renderBattleLoot === 'function') renderBattleLoot(); }catch(_){}
 try{ if (typeof renderBattleSummary === 'function') { const m=document.getElementById('battle-summary-modal'); if(m&&m.classList.contains('open')) renderBattleSummary(); } }catch(_){}
 if(alreadyOwned){
   if(!G.dupeCatches) G.dupeCatches={};
   G.dupeCatches[e.id]=(G.dupeCatches[e.id]||0)+1;
   if(wasShiny) addBattleLog(tr("m.catch.5", {p0:e.name}));
   addBattleLog(tr('capture_duplicate_no_money', {name:e.name}));
 } else {
   if(speciesOwned(e.id)){
     addBattleLog(tr('capture_duplicate_no_money', {name:e.name}));
   } else if(caughtMon){
     if(G.team.length < 6){
       G.team.push(caughtMon);
       addBattleLog(tr("m.catch.2", {p0:e.name}));
     } else {
       let boxId = 'box_' + e.id + '_' + Date.now();
       while(G.collection[boxId]) boxId = 'box_' + e.id + '_' + Date.now() + Math.floor(Math.random()*1000);
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
 try{ if(typeof _activeTab !== 'undefined' && _activeTab === 'team') showTab('team'); }catch(_){}
 try{ if(typeof _activeTab !== 'undefined' && _activeTab === 'box') showTab('box'); }catch(_){}
 saveGame();
}
