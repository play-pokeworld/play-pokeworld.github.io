// ============================================================
// SAVE — (split from save.js)
// ============================================================
function saveGame(manual){
  try{
    safeStorage.set('pokeworld_save',JSON.stringify({
      G:G, version:2
    }));
    if(manual) notify(t("n.partie_sauvegardée"));
  } catch(e){ if(manual) setMsg(t("n.erreur_de_sauvegarde"));}
}


function loadGame(manual){
  try{
    const raw=safeStorage.get('pokeworld_save');
    if(!raw){ if(manual) setMsg(t("n.aucune_sauvegarde_trouvée")); return;}
    const save=JSON.parse(raw);
    if(save.version>=2){
      G=save.G;
      if(!G.collection) G.collection={};
      if(!G.evolvedSpecies) G.evolvedSpecies=[];
      if(!G.dupeCatches) G.dupeCatches={};
      if(!G.teamPresets) G.teamPresets = { preset1:{name:"Équipe Aventure",uids:[]}, preset2:{name:"Équipe Boss",uids:[]}, preset3:{name:"Équipe Entraînement",uids:[]} };
      if(!G.activePresetId) G.activePresetId = 'preset1';
      if(!G.automation) G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
      if(!G.mainStep || typeof G.mainStep!=='object') G.mainStep={kanto:0,johto:0};
      if(G.mainStep.kanto==null) G.mainStep.kanto=0;
      if(G.mainStep.johto==null) G.mainStep.johto=0;
      if(!G.mainProgress || typeof G.mainProgress!=='object') G.mainProgress={kanto:0,johto:0};
      if(G.mainProgress.kanto==null) G.mainProgress.kanto=0;
      if(G.mainProgress.johto==null) G.mainProgress.johto=0;
      if(typeof G.totalWildWins!=='number') G.totalWildWins=0;
      if(typeof G.maxRepeatables!=='number') G.maxRepeatables=3;
      // Migration boîte : {normal, shiny} → instance unique
      for(const [idStr,slot] of Object.entries(G.collection)){
        if(slot && typeof slot==='object' && ('normal' in slot || 'shiny' in slot)){
          const inst=slot.normal||slot.shiny||null;
          if(inst){
            inst.shinyUnlocked=!!slot.shiny||!!inst.shiny;
            inst.shinyActive=!!inst.shiny;
            inst.heldItem=inst.heldItem||null;
            G.collection[idStr]=inst;
          } else delete G.collection[idStr];
        }
      }
      // Nettoyage inventaire : supprime les anciens objets non équipables
      for(const k of Object.keys(G.inventory||{})){
        if(!ITEMS[k]) delete G.inventory[k];
        else if(ITEMS[k].buff) G.inventory[k]=Math.min(BAG_MAX,G.inventory[k]);
      }
      // Migration Pokémon d'équipe
      for(const p of G.team){
        if(!p) continue;
        if(!p.uid) p.uid='p_'+Math.random().toString(36).substr(2,9)+'_'+Math.random().toString(36).substr(2,5);
        if(!p.moves) p.moves=[];
        for(const m of p.moves){
          if(m.maxPP===undefined) m.maxPP=MOVES[m.id]?.pp||10;
          if(m.pp===undefined) m.pp=m.maxPP;
        }
        if(!p.battleMods) p.battleMods={atk:1,def:1,spe:1};
        if(p.heldItem===undefined) p.heldItem=null;
        if(p.shinyUnlocked===undefined) p.shinyUnlocked=!!p.shiny;
        if(p.shinyActive===undefined) p.shinyActive=!!p.shiny;
        p.shiny=p.shinyActive;
        if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
        if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);
      }
      for(const p of Object.values(G.collection||{})){
        if(!p) continue;
        if(!p.uid) p.uid='p_'+Math.random().toString(36).substr(2,9)+'_'+Math.random().toString(36).substr(2,5);
        if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
        if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);
      }
    }
    syncShinyState();
    syncAllNames();
    updateHeader();
    renderDashboardColumns();
    renderMap();
    showTab('info');
    ensureQuestState();
    if(manual) notify(t("n.partie_chargée"));
  } catch(e){ if(manual) setMsg(t("n.erreur_de_chargement"));}
}


function askConfirm(message, onYes){
  document.getElementById('confirm-text').textContent=message;
  const btn=document.getElementById('confirm-yes');
  const fresh=btn.cloneNode(true); // strip old listeners
  btn.parentNode.replaceChild(fresh,btn);
  fresh.addEventListener('click',()=>{ closeConfirm(); onYes(); });
  document.getElementById('confirm-modal').classList.add('open');
}

function closeConfirm(){
  document.getElementById('confirm-modal').classList.remove('open');
}


function confirmDelete(){
  document.getElementById('delete-row').style.display='none';
  document.getElementById('delete-confirm-row').style.display='flex';
}

function cancelDelete(){
  document.getElementById('delete-row').style.display='flex';
  document.getElementById('delete-confirm-row').style.display='none';
}

function doDelete(){
  safeStorage.remove('pokeworld_save');
  G={location:'pallet',region:'kanto',team:[],inventory:{},money:2000,
    badges:[],defeatedChamps:{},pokedex:{},stepsLeft:0,starter:false, starterKanto:false, starterJohto:false, regionStarter:{kanto:false,johto:false}, collection:{},evolvedSpecies:[],dupeCatches:{},storyIdx:0,storyProgress:0,unlockedTalents:{},activeQuests:[],repeatables:[],visitedMaps:{},completedQuests:{},mainStep:{kanto:0,johto:0},mainProgress:{kanto:0,johto:0},totalWildWins:0,maxRepeatables:3,lang:G.lang||'fr'};
  updateHeader();
  renderMap();
  showTab('info');
  cancelDelete();
  closeSettings();
  notify(t("n.sauvegarde_supprimée_nouvelle_partie"),'var(--blue)');
  setTimeout(()=>{ if(typeof checkStarterNeeded==='function') checkStarterNeeded(); else if(!G.starter) chooseStarter(); },400);
}

function resetGame(){ confirmDelete(); openSettings(); }

// ============================================================
// SETTINGS (theme, export/import, delete save)
// ============================================================

