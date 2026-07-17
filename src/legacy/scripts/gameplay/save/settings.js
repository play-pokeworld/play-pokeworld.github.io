function openSettings(){
 document.getElementById('settings-modal').classList.add('open');
 document.getElementById('delete-row').style.display='flex';
 document.getElementById('delete-confirm-row').style.display='none';
 document.querySelectorAll('.theme-swatch').forEach(s=>{
 s.classList.toggle('active', s.dataset.themeBtn===(safeStorage.get('pokeworld_theme')||'dark'));
 });
 if(typeof updateSaveProfileControls === 'function') updateSaveProfileControls();
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
 dr.style.display = (getComputedStyle(dr).display === 'none') ? 'flex' : 'none';
}
function debugGiveMoney(){
 G.money += 50000;
 updateHeader();
 notify(t("legacy_message_n_50_000_ajout_s"), 'var(--light2)');
}
function debugGiveCandies(){
 addToInventory('rarecandy', 10);
 notify(t("legacy_message_n_10_super_bonbons_ajout_s"), 'var(--accent)');
 showTab('inventory');
}
function debugUnlockBadges(){
 G.badges = ['brock','misty','surge','erika','koga','sabrina','blaine','giovanni'];
 updateHeader();
 renderMap();
 notify(t("legacy_message_n_8_badges_d_bloqu_s"), 'var(--blue)');
}
let debugX10Enabled = false;

function toggleBattleSpeedX10(){
  debugX10Enabled = !debugX10Enabled;
  const x10btn = document.querySelector('.speed-x10');
  if(x10btn) x10btn.style.display = debugX10Enabled ? 'inline-block' : 'none';
  const body = document.body;
  if(debugX10Enabled) body.classList.add('debug-active');
  else body.classList.remove('debug-active');
  
  const stateEl = document.getElementById('debug-x10-state');
  const toggleBtn = document.getElementById('debug-x10-toggle');
  if(stateEl) stateEl.textContent = debugX10Enabled ? 'ON' : 'OFF';
  if(toggleBtn) {
    toggleBtn.style.background = debugX10Enabled ? '#94886B' : '#555';
  }
  notify(debugX10Enabled ? t('debug_x10_on') : t('debug_x10_off'), debugX10Enabled ? 'var(--green)' : 'var(--light1)');
}

function debugFillMine(){
 if(G.mine) G.mine.energy = 100;
 notify(t("legacy_message_n_nergie_de_mine_restaur_e_100"), 'var(--green)');
}
