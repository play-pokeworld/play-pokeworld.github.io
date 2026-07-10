// ============================================================
// SHORTCUTS WINDOW — renders the shortcut buttons in the dashboard
// ============================================================
function renderShortcutsWindow(){
  const el = document.getElementById('shortcuts-window-body');
  if(!el) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const isEn = lang === 'en';

  const buttons = [
    {icon:'📦', label: isEn?'PC Box':'Boîte PC', action: "openUnifiedSelectorModal('box_view')", color:'var(--blue)'},
    {icon:'🎒', label: isEn?'Bag':'Sac', action: "openFullscreenPanel('inventory')", color:'var(--green)'},
    {icon:'🏪', label: isEn?'Poké Market':'Marché', action: "openFullscreenPanel('market')", color:'var(--purple)'},
    {icon:'📖', label:'Pokédex', action: "openFullscreenPanel('pokedex')", color:'var(--gold)'},
  ];

  el.innerHTML = buttons.map(b => 
    `<button onclick="${b.action}" style="width:100%;padding:10px 12px;background:var(--card);border:2px solid ${b.color};border-radius:8px;cursor:pointer;font-size:13px;font-weight:bold;color:#fff;display:flex;align-items:center;gap:10px;transition:0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
      <span style="font-size:20px">${b.icon}</span>
      <span>${b.label}</span>
    </button>`
  ).join('');
}

