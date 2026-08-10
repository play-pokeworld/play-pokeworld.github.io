// Shortcuts rendering for quick access buttons
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

// Wave 41 — native ESM module (internal IIFE removed): module-private helpers,
// exported function; the “already defined” guard becomes useless (a module
// runs once — prod via ESM import, VM harness via isolated bundle).

function createElement(tagName, options, children) {
  options = options || {};
  children = children || [];
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text != null) element.textContent = options.text;
  if (options.html != null) _pwSetHtmlSafe(element, options.html);
  const attrs = options.attributes || {};
  for (const name in attrs) {
    if (attrs[name] == null || attrs[name] === false) continue;
    if (attrs[name] === true) element.setAttribute(name, '');
    else element.setAttribute(name, String(attrs[name]));
  }
  const ds = options.dataset || {};
  for (const d in ds) {
    if (ds[d] != null) element.dataset[d] = String(ds[d]);
  }
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child == null) continue;
    element.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return element;
}

function clearElement(element) {
  if (!element) return;
  while (element.firstChild) element.removeChild(element.firstChild);
}

function replaceChildren(element, children) {
  if (!element) return;
  children = children || [];
  clearElement(element);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child == null) continue;
    element.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
}

export function renderShortcutsWindow() {
  const el = document.getElementById('shortcuts-window-body');
  if (!el) return;

  function iconHtml(name, fallback) {
    return typeof getIcon === 'function' ? getIcon(name, 18) : (fallback || '');
  }

  const state = (typeof window !== 'undefined' ? window.G : null) || {};
  const badges = state.badges || [];
  const region = state.region || 'kanto';
  const isBrockBeaten = badges.indexOf('brock') !== -1 || badges.length >= 1 || region === 'johto';
  const isLeagueBeaten = badges.indexOf('elite4') !== -1 || badges.indexOf('johto_elite4') !== -1 || state.championTitle || badges.length >= 8 || region === 'johto';

  const allButtons = [
    { iconHtml: iconHtml('box', '□'), label: (typeof t === 'function' ? t('shortcut_pc_box') : 'Box'), action: 'open-unified-selector', value: 'box_view', color: 'var(--blue)', unlocked: true },
    { iconHtml: iconHtml('bag', '□'), label: (typeof t === 'function' ? t('shortcut_bag') : 'Bag'), action: 'open-fullscreen-panel', value: 'inventory', color: 'var(--green)', unlocked: true },
    { iconHtml: iconHtml('shop', '□'), label: (typeof t === 'function' ? t('shortcut_market') : 'Market'), action: 'open-fullscreen-panel', value: 'market', color: 'var(--accent)', unlocked: isBrockBeaten },
    { iconHtml: iconHtml('pokeball', '○'), label: (typeof t === 'function' ? t('panel_pokedex_title') : 'Pokedex'), action: 'open-fullscreen-panel', value: 'pokedex', color: 'var(--light2)', unlocked: true },
    { iconHtml: iconHtml('dictionary', '□'), label: (typeof t === 'function' ? t('dictionary_title') : 'Dictionnaire'), action: 'open-fullscreen-panel', value: 'dictionary', color: 'var(--purple)', unlocked: true },
    { iconHtml: iconHtml('guide', '?'), label: (typeof t === 'function' ? t('guide_title') : 'Guide'), action: 'open-fullscreen-panel', value: 'guide', color: 'var(--orange)', unlocked: true },
    { iconHtml: iconHtml('atoll', '○'), label: (typeof t === 'function' ? t('battle_atoll_title') : 'Battle Atoll'), action: 'open-fullscreen-panel', value: 'atoll', color: 'var(--red)', unlocked: isLeagueBeaten },
  ];

  const buttons = allButtons.filter(function(b) { return b.unlocked; });

  const btnElements = buttons.map(function(b) {
    const btn = createElement('button', {
      className: 'shortcut-action-btn',
      dataset: { action: b.action, panel: b.value },
    }, [
      createElement('span', { className: 'shortcut-action-icon', html: b.iconHtml }),
      createElement('span', { text: b.label }),
    ]);
    btn.style.setProperty('--shortcut-color', b.color);
    return btn;
  });

  replaceChildren(el, btnElements);
}

// Wave 41 — surface kept (ex `window.renderShortcutsWindow = …` inside
// the IIFE): classic consumers, VM harnesses and the engine registry.
if (typeof globalThis !== 'undefined') globalThis.renderShortcutsWindow = renderShortcutsWindow;
