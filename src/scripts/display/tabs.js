// ============================================================
// TABS — (split from map.js)
// ============================================================
var _activeTab='info';

function showTab(tab){
  // Starter gate – force modal if needed
  try{ if(typeof checkStarterNeeded==="function" && checkStarterNeeded()) return; }catch(e){}
  _activeTab=tab;
  syncShinyState();
  renderTeamWindow();
  if(tab==='team'){ showTab('info'); return; }
  if(tab === 'mine' && G.badges.length < 2){
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    notify(lang==='en' ? "🔒 The Underground Mine unlocks alongside Diglett's Cave (requires 2 Badges)!" : "🔒 La Mine Souterraine se débloque en même temps que la Cave Taupiqueur (2 Badges) !", "var(--red)");
    showTab('info');
    return;
  }
  document.querySelectorAll('.tab').forEach((t,i)=>{
    t.classList.toggle('active',['info','box','mine','inventory','shop','market','pokedex'][i]===tab);
  });
  const content=document.getElementById('tab-content');
  if(tab==='info') renderLocInfo(content);
  else if(tab==='team') renderTeam(content);
  else if(tab==='box') renderBox(content);
  else if(tab==='mine') renderMine(content);
  else if(tab==='inventory') renderInventory(content);
  else if(tab==='shop') renderShop(content);
  else if(tab==='market') renderMarket(content);
  else if(tab==='pokedex') renderPokedex(content);
}
