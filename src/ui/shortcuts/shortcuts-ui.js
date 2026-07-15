import { createElement, replaceChildren } from '../components/dom.js';

export function renderShortcutsWindow() {
  const el = document.getElementById('shortcuts-window-body');
  if (!el) return;
  const buttons = [
    {icon:'📦', label: (typeof t==='function'?t('shortcut_pc_box'):'Box'), action:'open-unified-selector', value:'box_view', color:'var(--blue)'},
    {icon:'🎒', label: (typeof t==='function'?t('shortcut_bag'):'Bag'), action:'open-fullscreen-panel', value:'inventory', color:'var(--green)'},
    {icon:'🏪', label: (typeof t==='function'?t('shortcut_market'):'Market'), action:'open-fullscreen-panel', value:'market', color:'var(--accent)'},
    {icon:'', label:(typeof t==='function'?t('panel_pokedex_title'):'Pokedex'), action:'open-fullscreen-panel', value:'pokedex', color:'var(--light2)'},
  ];

  const btnElements = buttons.map(b => {
    const btn = createElement('button', {
      className: 'shortcut-action-btn',
      dataset: { action: b.action, panel: b.value },
    }, [
      createElement('span', { className: 'shortcut-action-icon', text: b.icon }),
      createElement('span', { text: b.label })
    ]);
    btn.style.setProperty('--shortcut-color', b.color);
    return btn;
  });

  replaceChildren(el, btnElements);
}

if (typeof window !== 'undefined') {
  window.renderShortcutsWindow = renderShortcutsWindow;
}
