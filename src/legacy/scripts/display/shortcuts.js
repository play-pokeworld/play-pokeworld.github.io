function renderShortcutsWindow(){
  const el = document.getElementById('shortcuts-window-body');
  if(!el) return;
  const buttons = [
    {icon:'📦', label: t('shortcut_pc_box'), action:'open-unified-selector', value:'box_view', color:'var(--blue)'},
    {icon:'🎒', label: t('shortcut_bag'), action:'open-fullscreen-panel', value:'inventory', color:'var(--green)'},
    {icon:'🏪', label: t('shortcut_market'), action:'open-fullscreen-panel', value:'market', color:'var(--accent)'},
    {icon:'', label:t('panel_pokedex_title'), action:'open-fullscreen-panel', value:'pokedex', color:'var(--light2)'},
  ];

  el.innerHTML = buttons.map(b => 
    `<button class="shortcut-action-btn" data-action="${b.action}" data-panel="${b.value}" data-style="--shortcut-color:${b.color}">
      <span class="shortcut-action-icon">${b.icon}</span>
      <span>${b.label}</span>
    </button>`
  ).join('');
}
