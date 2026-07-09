function saveGame(manual){
  try{
    safeStorage.set('pokeworld_save',JSON.stringify({
      G:G, version:2
    }));
    if(manual) notify('💾 Partie sauvegardée !');
  } catch(e){ if(manual) setMsg('Erreur de sauvegarde.');}
}

function loadGame(manual){
  try{
    const raw=safeStorage.get('pokeworld_save');
    if(!raw){ if(manual) setMsg('Aucune sauvegarde trouvée.'); return;}
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
    if(manual) notify('📂 Partie chargée !');
  } catch(e){ if(manual) setMsg('Erreur de chargement.');}
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
  notify('🔄 Sauvegarde supprimée, nouvelle partie !','var(--blue)');
  setTimeout(()=>{ if(typeof checkStarterNeeded==='function') checkStarterNeeded(); else if(!G.starter) chooseStarter(); },400);
}
function resetGame(){ confirmDelete(); openSettings(); }

// ============================================================
// SETTINGS (theme, export/import, delete save)
// ============================================================

function useRareCandy(teamIdx){
  if((G.inventory['rarecandy']||0) < 1) return;
  const p = G.team[teamIdx];
  if(!p) return;
  G.inventory['rarecandy']--;
  if(G.inventory['rarecandy'] <= 0) delete G.inventory['rarecandy'];
  levelUp(p);
  saveGame();
  const lang = G.lang || 'fr';
  notify(lang==='en' ? `🍬 ${p.name} grew to Level ${p.level}!` : `🍬 ${p.name} monte au Niveau ${p.level} !`, 'var(--purple)');
  updateHeader();
  renderTeamWindow();
  if(document.querySelector('.tab.active')?.textContent.includes('Sac')) onInventoryClick('rarecandy');
}
function useBoxRareCandy(boxId){
  if((G.inventory['rarecandy']||0) < 1) return;
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  G.inventory['rarecandy']--;
  if(G.inventory['rarecandy'] <= 0) delete G.inventory['rarecandy'];
  levelUp(p);
  saveGame();
  const lang = G.lang || 'fr';
  notify(lang==='en' ? `🍬 ${p.name} grew to Level ${p.level}!` : `🍬 ${p.name} monte au Niveau ${p.level} !`, 'var(--purple)');
  updateHeader();
  renderTeamWindow();
  if(document.querySelector('.tab.active')?.textContent.includes('Sac')) onInventoryClick('rarecandy');
}

function copyExportText(){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const ta = document.getElementById('export-textarea');
  if(!ta) return;
  ta.select();
  ta.setSelectionRange(0, 999999);
  let copied = false;
  try {
    if(document.execCommand && document.execCommand('copy')){
      copied = true;
    }
  } catch(_){}
  if(!copied && navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(ta.value).then(()=>{
      notify(lang==='en' ? '📋 Copied to clipboard!' : '📋 Copié dans le presse-papier !', 'var(--green)');
    }).catch(()=>{
      notify(lang==='en' ? '⚠️ Veuillez copier manuellement le texte sélectionné ci-dessus (Ctrl+C).' : '⚠️ Veuillez copier manuellement le texte sélectionné ci-dessus (Ctrl+C).', 'var(--gold)');
    });
    return;
  }
  if(copied){
    notify(lang==='en' ? '📋 Copied to clipboard!' : '📋 Copié dans le presse-papier !', 'var(--green)');
  } else {
    notify(lang==='en' ? '⚠️ Appuyez sur Ctrl+C pour copier le texte sélectionné.' : '⚠️ Appuyez sur Ctrl+C pour copier le texte sélectionné.', 'var(--gold)');
  }
}

function exportSave(){
  try{
    const data=JSON.stringify({G:G, dashboardCols, version:3},null,2);
    try{ if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data).catch(()=>{}); }catch(_){}
    try{
      const blob=new Blob([data],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=`pokeworld-save-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }catch(_){}

    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    const settingsBody = document.querySelector('#settings-modal .modal-body') || document.querySelector('#settings-modal > div');
    if(settingsBody){
      let exportBox = document.getElementById('export-save-box');
      if(!exportBox){
        exportBox = document.createElement('div');
        exportBox.id = 'export-save-box';
        exportBox.style = "margin-top:14px;background:#111;padding:10px;border-radius:8px;border:1px solid var(--gold);";
        settingsBody.appendChild(exportBox);
      }
      exportBox.innerHTML = `
        <div style="font-size:12px;color:var(--gold);font-weight:bold;margin-bottom:6px;">📦 ${lang==='en'?'Export Save Data (.json)':'Données de sauvegarde (.json)'}</div>
        <textarea id="export-textarea" style="width:100%;height:100px;background:#0c0a09;color:#fff;font-family:monospace;font-size:10px;padding:6px;border:1px solid #333;border-radius:4px;resize:none;" readonly onclick="this.select()">${data}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="hbtn" style="flex:1;padding:8px;background:var(--green);color:#fff;font-weight:bold;" onclick="copyExportText()">📋 ${lang==='en'?'Copy to Clipboard':'Copier le code'}</button>
          <a class="hbtn" href="data:application/json;charset=utf-8,${encodeURIComponent(data)}" download="pokeworld_save.json" style="flex:1;padding:8px;background:var(--blue);color:#fff;font-weight:bold;text-align:center;text-decoration:none;border-radius:6px;display:flex;align-items:center;justify-content:center;">⬇️ ${lang==='en'?'Download .json':'Télécharger .json'}</a>
        </div>
      `;
      const ta = document.getElementById('export-textarea');
      if(ta){ ta.focus(); ta.select(); }
    }
    notify(lang==='en' ? '⬇️ Save generated below!' : '⬇️ Sauvegarde générée ci-dessous !');
  } catch(e){ setMsg('Erreur lors de l\'export.'); }
}

function importSave(event){
  const file=event.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const save=JSON.parse(e.target.result);
      if(!save.G){setMsg('Fichier de sauvegarde invalide.');return;}
      G=save.G;
      if(!G.collection) G.collection={};
      if(!G.evolvedSpecies) G.evolvedSpecies=[];
      if(!G.dupeCatches) G.dupeCatches={};
      if(!G.teamPresets) G.teamPresets = { preset1:{name:"Équipe Aventure",uids:[]}, preset2:{name:"Équipe Boss",uids:[]}, preset3:{name:"Équipe Entraînement",uids:[]} };
      if(!G.activePresetId) G.activePresetId = 'preset1';
      if(!G.automation) G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
      for(const p of G.team){
        if(!p.moves) p.moves=[];
        for(const m of p.moves){
          if(m.maxPP===undefined) m.maxPP=MOVES[m.id]?.pp||10;
          if(m.pp===undefined) m.pp=m.maxPP;
        }
      }
      safeStorage.set('pokeworld_save',JSON.stringify({G:G,version:2}));
      ensureQuestState();
      syncShinyState();
      updateHeader();
      renderDashboardColumns();
      renderMap();
      showTab('info');
      closeSettings();
      notify('⬆️ Sauvegarde importée !');
    } catch(err){ setMsg('Erreur : fichier illisible.'); }
  };
  reader.readAsText(file);
  event.target.value='';
}

// ============================================================
// INIT
// ============================================================
