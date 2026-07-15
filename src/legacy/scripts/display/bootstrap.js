function init(){
 try{
 applySavedTheme();
 
 
 
 loadGame();
 try{
 const savedCols = safeStorage.get('pokeworld_cols_v12');
 if(savedCols){
 dashboardCols = JSON.parse(savedCols);
 renderDashboardColumns();
 } else {
 setWindowLayout('cols3');
 }
 }catch(_){ setWindowLayout('cols3'); }
 renderMap();
 updateHeader();
 showTab('info');
 updateI18nLabels();
 ensureQuestState();
 markVisited(G.location);
 
 setInterval(saveGame, 60000);
 setInterval(() => {
 if(!G.mine) return;
 if((G.mine.energy||0) < (G.mine.maxEnergy||100)){
 G.mine.energy = Math.min(G.mine.maxEnergy||100, (G.mine.energy||0) + 2);
 const el = document.getElementById('mine-energy-val');
 const bar = document.getElementById('mine-energy-bar');
 if(el && bar){
 el.textContent = `${G.mine.energy} / ${G.mine.maxEnergy}`;
 bar.style.width = `${(G.mine.energy/G.mine.maxEnergy)*100}%`;
 }
 }
 }, 1000);
 
 setTimeout(()=>{
 if(typeof checkStarterNeeded==="function") checkStarterNeeded(); else if(!G.starter) chooseStarter();
 }, 200);
 }catch(e){
 console.warn('init error',e);
 try{ renderMap(); updateHeader(); showTab('info'); }catch(_){}
 }
}


document.getElementById('poke-modal').addEventListener('click',function(e){
 if(e.target===this) this.classList.remove('open');
});
document.getElementById('settings-modal').addEventListener('click',function(e){
 if(e.target===this) closeSettings();
});
document.getElementById('battle-summary-modal').addEventListener('click',function(e){
 if(e.target===this) closeBattleSummary();
});

init();
