var _activeTab='info';

function showTab(tab){
 
 try{ if(typeof checkStarterNeeded==="function"&& checkStarterNeeded()) return; }catch(e){}
 
 if(tab === 'inventory' || tab === 'shop' || tab === 'market' || tab === 'pokedex'){
 if(typeof openFullscreenPanel === 'function'){ openFullscreenPanel(tab); }
 return;
 }
 if(tab === 'box'){
 if(typeof openUnifiedSelectorModal === 'function'){ openUnifiedSelectorModal('box_view'); }
 return;
 }
 _activeTab=tab;
 syncShinyState();
 renderTeamWindow();
 if(tab==='team'){ _activeTab='info'; }
 if(tab === 'mine' && G.badges.length < 2){
 _activeTab='info';
 return;
 }
 document.querySelectorAll('.tab').forEach((t,i)=>{
 t.classList.toggle('active', i===0 && (tab==='info'||tab==='team'));
 });
 const content=document.getElementById('tab-content');
 if(tab==='info' || tab==='team') renderLocInfo(content);
 else if(tab==='shop') renderShop(content);
 else if(tab==='mine') renderMine(content);
}


// --- Migrated to ES module, globals exposed ---
if (typeof showTab !== 'undefined' && typeof window !== 'undefined') window.showTab = showTab;

export {};

