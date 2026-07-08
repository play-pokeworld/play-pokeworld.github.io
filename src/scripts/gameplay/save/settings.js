
// ===== extracted from src/scripts/gameplay/save.js =====
function openSettings(){
  document.getElementById('settings-modal').classList.add('open');
  document.getElementById('delete-row').style.display='flex';
  document.getElementById('delete-confirm-row').style.display='none';
  document.querySelectorAll('.theme-swatch').forEach(s=>{
    s.classList.toggle('active', s.dataset.themeBtn===(safeStorage.get('pokeworld_theme')||'dark'));
  });
}
function closeSettings(){
  document.getElementById('settings-modal').classList.remove('open');
}
function setTheme(theme){
  if(theme==='dark') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme',theme);
  safeStorage.set('pokeworld_theme',theme);
  document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.toggle('active',s.dataset.themeBtn===theme));
}
function applySavedTheme(){
  const theme=safeStorage.get('pokeworld_theme');
  if(theme&&theme!=='dark') document.documentElement.setAttribute('data-theme',theme);
}
function toggleDebugMenu(){
  const dr = document.getElementById('debug-drawer');
  if(!dr) return;
  dr.style.display = (dr.style.display === 'none') ? 'flex' : 'none';
}
function debugGiveMoney(){
  G.money += 50000;
  updateHeader();
  notify('🛠️ +50 000₽ ajoutés !', 'var(--gold)');
}
function debugGiveCandies(){
  addToInventory('rarecandy', 10);
  notify('🛠️ +10 Super Bonbons ajoutés !', 'var(--purple)');
  showTab('inventory');
}
function debugUnlockBadges(){
  G.badges = ['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
  updateHeader();
  renderMap();
  notify('🛠️ 8 Badges débloqués !', 'var(--blue)');
}
function debugFillMine(){
  if(G.mine) G.mine.energy = 100;
  notify('🛠️ Énergie de mine restaurée à 100 !', 'var(--green)');
}

