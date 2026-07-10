// ============================================================
// SAVE EXTRAS — (split from save.js)
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
  notify(tr("m.save.10", {p0:p.name, p1:p.level}), 'var(--purple)');
  updateHeader();
  renderTeamWindow();
  // Refresh poke modal if open
  if(document.getElementById('poke-modal')?.classList.contains('open')){
    openPokeModal(teamIdx);
  }
  // Refresh fullscreen panel (inventory) if open
  const fsModal = document.getElementById('fullscreen-panel-modal');
  if(fsModal && fsModal.style.display === 'flex'){
    const fsContent = document.getElementById('fs-panel-content');
    if(fsContent){
      const fsTitle = document.getElementById('fs-panel-title');
      if(fsTitle && (fsTitle.textContent.includes('Sac') || fsTitle.textContent.includes('Bag'))){
        renderInventory(fsContent);
      }
    }
  }
  // Stay on candy page to continue using
  onInventoryClick('rarecandy');
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
  notify(tr("m.save.9", {p0:p.name, p1:p.level}), 'var(--purple)');
  updateHeader();
  renderTeamWindow();
  // Refresh fullscreen panel (inventory) if open
  const fsModal = document.getElementById('fullscreen-panel-modal');
  if(fsModal && fsModal.style.display === 'flex'){
    const fsContent = document.getElementById('fs-panel-content');
    if(fsContent){
      const fsTitle = document.getElementById('fs-panel-title');
      if(fsTitle && (fsTitle.textContent.includes('Sac') || fsTitle.textContent.includes('Bag'))){
        renderInventory(fsContent);
      }
    }
  }
  // Stay on candy page to continue using
  onInventoryClick('rarecandy');
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
      notify(t("m.save.8"), 'var(--green)');
    }).catch(()=>{
      notify(t("m.save.7"), 'var(--gold)');
    });
    return;
  }
  if(copied){
    notify(t("m.save.6"), 'var(--green)');
  } else {
    notify(t("m.save.5"), 'var(--gold)');
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
        <div style="font-size:12px;color:var(--gold);font-weight:bold;margin-bottom:6px;">📦 ${t("m.save.4")}</div>
        <textarea id="export-textarea" style="width:100%;height:100px;background:#0c0a09;color:#fff;font-family:monospace;font-size:10px;padding:6px;border:1px solid #333;border-radius:4px;resize:none;" readonly onclick="this.select()">${data}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="hbtn" style="flex:1;padding:8px;background:var(--green);color:#fff;font-weight:bold;" onclick="copyExportText()">📋 ${t("m.save.3")}</button>
          <a class="hbtn" href="data:application/json;charset=utf-8,${encodeURIComponent(data)}" download="pokeworld_save.json" style="flex:1;padding:8px;background:var(--blue);color:#fff;font-weight:bold;text-align:center;text-decoration:none;border-radius:6px;display:flex;align-items:center;justify-content:center;">⬇️ ${t("m.save.2")}</a>
        </div>
      `;
      const ta = document.getElementById('export-textarea');
      if(ta){ ta.focus(); ta.select(); }
    }
    notify(t("m.save.1"));
  } catch(e){ setMsg(t("n.erreur_lors_de_lexport")); }
}


function importSave(event){
  const file=event.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const save=JSON.parse(e.target.result);
      if(!save.G){setMsg(t("n.fichier_de_sauvegarde_invalide"));return;}
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
      notify(t("n.sauvegarde_importée"));
    } catch(err){ setMsg(t("n.erreur_fichier_illisible")); }
  };
  reader.readAsText(file);
  event.target.value='';
}

// ============================================================
// INIT
// ============================================================

