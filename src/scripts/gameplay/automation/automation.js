
// ===== extracted from src/scripts/gameplay/battle.js =====
function renderAutomationWindow(){
  const el = document.getElementById('automation-window-body');
  if(!el) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(!G.automation) G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
  
  el.innerHTML = `
    <div style="font-size:11px;color:var(--dim);margin-bottom:4px;">
      ${lang==='en'?'Toggle PokéClicker automation tools:':'Outils automatiques (PokéClicker Tools) :'}
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;">
      <label style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.25);padding:8px;border-radius:6px;border:1px solid #3c5c27;cursor:pointer;">
        <div>
          <b style="color:#fff;font-size:12px;">🥚 ${lang==='en'?'Auto-Hatch Eggs':'Éclosion Automatique'}</b>
          <div style="font-size:10px;color:var(--dim);">${lang==='en'?'Instantly hatches eggs when 100% ready':'Éclot instantanément vers le PC dès que prêt'}</div>
        </div>
        <input type="checkbox" ${G.automation.autoHatch ? 'checked' : ''} onchange="toggleAutomation('autoHatch', this.checked)" style="width:18px;height:18px;cursor:pointer;">
      </label>
      <label style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.25);padding:8px;border-radius:6px;border:1px solid #3c5c27;cursor:pointer;">
        <div>
          <b style="color:#fff;font-size:12px;">🔄 ${lang==='en'?'Auto-Seed Daycare':'Recharge Auto Couveuse'}</b>
          <div style="font-size:10px;color:var(--dim);">${lang==='en'?'Puts Boxed Pokémon into empty egg slots':'Place automatiquement un Pokémon du PC dans la couveuse'}</div>
        </div>
        <input type="checkbox" ${G.automation.autoSeedHatchery ? 'checked' : ''} onchange="toggleAutomation('autoSeedHatchery', this.checked)" style="width:18px;height:18px;cursor:pointer;">
      </label>
    </div>
  `;
}
function toggleAutomation(key, val){
  if(!G.automation) G.automation = {};
  G.automation[key] = val;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  notify(`⚙️ ${key} ${val ? (lang==='en'?'Enabled':'Activé') : (lang==='en'?'Disabled':'Désactivé')}`, val ? 'var(--green)' : 'var(--dim)');
  saveGame();
}

