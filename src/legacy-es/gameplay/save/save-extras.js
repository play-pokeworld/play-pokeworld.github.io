function useRareCandy(teamIdx){
 if((G.inventory['rarecandy']||0) < 1) return;
 const p = G.team[teamIdx];
 if(!p) return;
 G.inventory['rarecandy']--;
 if(G.inventory['rarecandy'] <= 0) delete G.inventory['rarecandy'];
 levelUp(p);
 saveGame();
 const lang = G.lang || 'fr';
 notify(tr("m.save.10", {p0:p.name, p1:p.level}), 'var(--accent)');
 updateHeader();
 renderTeamWindow();
 
 if(document.getElementById('poke-modal')?.classList.contains('open')){
 openPokeModal(teamIdx);
 }
 
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
 notify(tr("m.save.9", {p0:p.name, p1:p.level}), 'var(--accent)');
 updateHeader();
 renderTeamWindow();
 
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
 notify(t("m.save.7"), 'var(--light2)');
 });
 return;
 }
 if(copied){
 notify(t("m.save.6"), 'var(--green)');
 } else {
 notify(t("m.save.5"), 'var(--light2)');
 }
}


function exportSave(){
 if(typeof exportActiveMultiSave === 'function') return exportActiveMultiSave();
}


function importSave(event){
 if(typeof importMultiSave === 'function') return importMultiSave(event);
}



// --- Migrated to ES module, globals exposed ---
if (typeof useRareCandy !== 'undefined' && typeof window !== 'undefined') window.useRareCandy = useRareCandy;
if (typeof useBoxRareCandy !== 'undefined' && typeof window !== 'undefined') window.useBoxRareCandy = useBoxRareCandy;
if (typeof copyExportText !== 'undefined' && typeof window !== 'undefined') window.copyExportText = copyExportText;
if (typeof exportSave !== 'undefined' && typeof window !== 'undefined') window.exportSave = exportSave;
if (typeof importSave !== 'undefined' && typeof window !== 'undefined') window.importSave = importSave;

export {};
