function renderShortcutsWindow(){
  const el = document.getElementById('shortcuts-window-body');
  if(!el) return;
  const iconHtml = (name, fallback='') => (typeof getIcon === 'function' ? getIcon(name, 18) : fallback);
  const buttons = [
    {iconHtml:iconHtml('box','□'), label: t('shortcut_pc_box'), action:'open-unified-selector', value:'box_view', color:'var(--blue)'},
    {iconHtml:iconHtml('bag','□'), label: t('shortcut_bag'), action:'open-fullscreen-panel', value:'inventory', color:'var(--green)'},
    {iconHtml:iconHtml('shop','□'), label: t('shortcut_market'), action:'open-fullscreen-panel', value:'market', color:'var(--accent)'},
    {iconHtml:iconHtml('pokeball','○'), label:t('panel_pokedex_title'), action:'open-fullscreen-panel', value:'pokedex', color:'var(--light2)'},
    {iconHtml:iconHtml('dictionary','□'), label:t('dictionary_title'), action:'open-fullscreen-panel', value:'dictionary', color:'var(--purple)'},
    {iconHtml:iconHtml('guide','?'), label:t('guide_title'), action:'open-fullscreen-panel', value:'guide', color:'var(--orange)'},
    {iconHtml:iconHtml('atoll','○'), label:t('battle_atoll_title'), action:'open-fullscreen-panel', value:'atoll', color:'var(--red)'},
  ];

  el.innerHTML = buttons.map(b => 
    `<button class="shortcut-action-btn" data-action="${b.action}" data-panel="${b.value}" data-color="${b.color}">
      <span class="shortcut-action-icon">${b.iconHtml}</span>
      <span>${b.label}</span>
    </button>`
  ).join('');
}

