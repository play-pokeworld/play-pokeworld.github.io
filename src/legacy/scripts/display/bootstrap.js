function initializeGameInterface(){
 try{
 window.PokeWorldGameStarted = true;
 document.body.classList.remove('save-menu-active');
 document.body.classList.add('game-started');
 const saveMenu = document.getElementById('save-menu-screen');
 if(saveMenu) saveMenu.classList.remove('is-open');
 applySavedTheme();
 if(typeof updateSaveProfileControls === 'function') updateSaveProfileControls();
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
 if(!window._pokeWorldRuntimeIntervalsStarted){
 window._pokeWorldRuntimeIntervalsStarted = true;
 setInterval(saveGame, 60000);
 setInterval(() => {
 if(!window.PokeWorldGameStarted || !G.mine) return;
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
 }
 setTimeout(()=>{
 if(!window.PokeWorldGameStarted) return;
 if(typeof checkStarterNeeded==="function") checkStarterNeeded(); else if(!G.starter) chooseStarter();
 }, 200);
 }catch(e){
 console.warn('initializeGameInterface error',e);
 try{ renderMap(); updateHeader(); showTab('info'); }catch(_){}
 }
}
function init(){
 try{
 applySavedTheme();
 window.PokeWorldGameStarted = false;
 if(typeof renderSaveMenu === 'function') renderSaveMenu();
 else { loadGame(); initializeGameInterface(); }
 }catch(e){
 console.warn('init error',e);
 try{ renderSaveMenu(); }catch(_){ try{ renderMap(); updateHeader(); showTab('info'); }catch(__){} }
 }
}
document.getElementById('poke-modal').addEventListener('click',function(e){ if(e.target===this) this.classList.remove('open'); });
document.getElementById('settings-modal').addEventListener('click',function(e){ if(e.target===this) closeSettings(); });
document.getElementById('battle-summary-modal').addEventListener('click',function(e){ if(e.target===this) closeBattleSummary(); });
init();
if (typeof init !== 'undefined' && typeof window !== 'undefined') window.init = init;
if (typeof initializeGameInterface !== 'undefined' && typeof window !== 'undefined') window.initializeGameInterface = initializeGameInterface;

