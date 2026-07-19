import { createElement, replaceChildren } from '../components/dom.js';

export function renderShortcutsWindow() {
  const el = document.getElementById('shortcuts-window-body');
  if (!el) return;
  const iconHtml = (name, fallback = '') => (typeof getIcon === 'function' ? getIcon(name, 18) : fallback);
  const buttons = [
    {iconHtml: iconHtml('box', '□'), label: (typeof t==='function'?t('shortcut_pc_box'):'Box'), action:'open-unified-selector', value:'box_view', color:'var(--blue)'},
    {iconHtml: iconHtml('bag', '□'), label: (typeof t==='function'?t('shortcut_bag'):'Bag'), action:'open-fullscreen-panel', value:'inventory', color:'var(--green)'},
    {iconHtml: iconHtml('shop', '□'), label: (typeof t==='function'?t('shortcut_market'):'Market'), action:'open-fullscreen-panel', value:'market', color:'var(--accent)'},
    {iconHtml: iconHtml('pokeball', '○'), label:(typeof t==='function'?t('panel_pokedex_title'):'Pokedex'), action:'open-fullscreen-panel', value:'pokedex', color:'var(--light2)'},
    {iconHtml: iconHtml('dictionary', '□'), label:(typeof t==='function'?t('dictionary_title'):'Dictionnaire'), action:'open-fullscreen-panel', value:'dictionary', color:'var(--purple)'},
    {iconHtml: iconHtml('guide', '?'), label:(typeof t==='function'?t('guide_title'):'Guide'), action:'open-fullscreen-panel', value:'guide', color:'var(--orange)'},
    {iconHtml: iconHtml('atoll', '○'), label:(typeof t==='function'?t('battle_atoll_title'):'Battle Atoll'), action:'open-fullscreen-panel', value:'atoll', color:'var(--red)'},
  ];

  const btnElements = buttons.map(b => {
    const btn = createElement('button', {
      className: 'shortcut-action-btn',
      dataset: { action: b.action, panel: b.value },
    }, [
      createElement('span', { className: 'shortcut-action-icon', html: b.iconHtml }),
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

