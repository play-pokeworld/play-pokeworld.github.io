// Shortcuts rendering for quick access buttons
(function() {
  if (typeof window.renderShortcutsWindow === 'function') return; // already defined

  function createElement(tagName, options, children) {
    options = options || {};
    children = children || [];
    var element = document.createElement(tagName);
    if (options.className) element.className = options.className;
    if (options.text != null) element.textContent = options.text;
    if (options.html != null) element.innerHTML = options.html;
    var attrs = options.attributes || {};
    for (var name in attrs) {
      if (attrs[name] == null || attrs[name] === false) continue;
      if (attrs[name] === true) element.setAttribute(name, '');
      else element.setAttribute(name, String(attrs[name]));
    }
    var ds = options.dataset || {};
    for (var d in ds) {
      if (ds[d] != null) element.dataset[d] = String(ds[d]);
    }
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
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
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child == null) continue;
      element.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
  }

  window.renderShortcutsWindow = function renderShortcutsWindow() {
    var el = document.getElementById('shortcuts-window-body');
    if (!el) return;

    function iconHtml(name, fallback) {
      return typeof getIcon === 'function' ? getIcon(name, 18) : (fallback || '');
    }

    var state = window.G || {};
    var badges = state.badges || [];
    var region = state.region || 'kanto';
    var isBrockBeaten = badges.indexOf('brock') !== -1 || badges.length >= 1 || region === 'johto';
    var isLeagueBeaten = badges.indexOf('elite4') !== -1 || badges.indexOf('johto_elite4') !== -1 || state.championTitle || badges.length >= 8 || region === 'johto';

    var allButtons = [
      { iconHtml: iconHtml('box', '\u25a1'), label: (typeof t === 'function' ? t('shortcut_pc_box') : 'Box'), action: 'open-unified-selector', value: 'box_view', color: 'var(--blue)', unlocked: true },
      { iconHtml: iconHtml('bag', '\u25a1'), label: (typeof t === 'function' ? t('shortcut_bag') : 'Bag'), action: 'open-fullscreen-panel', value: 'inventory', color: 'var(--green)', unlocked: true },
      { iconHtml: iconHtml('shop', '\u25a1'), label: (typeof t === 'function' ? t('shortcut_market') : 'Market'), action: 'open-fullscreen-panel', value: 'market', color: 'var(--accent)', unlocked: isBrockBeaten },
      { iconHtml: iconHtml('pokeball', '\u25cb'), label: (typeof t === 'function' ? t('panel_pokedex_title') : 'Pokedex'), action: 'open-fullscreen-panel', value: 'pokedex', color: 'var(--light2)', unlocked: true },
      { iconHtml: iconHtml('dictionary', '\u25a1'), label: (typeof t === 'function' ? t('dictionary_title') : 'Dictionnaire'), action: 'open-fullscreen-panel', value: 'dictionary', color: 'var(--purple)', unlocked: true },
      { iconHtml: iconHtml('guide', '?'), label: (typeof t === 'function' ? t('guide_title') : 'Guide'), action: 'open-fullscreen-panel', value: 'guide', color: 'var(--orange)', unlocked: true },
      { iconHtml: iconHtml('atoll', '\u25cb'), label: (typeof t === 'function' ? t('battle_atoll_title') : 'Battle Atoll'), action: 'open-fullscreen-panel', value: 'atoll', color: 'var(--red)', unlocked: isLeagueBeaten },
    ];

    var buttons = allButtons.filter(function(b) { return b.unlocked; });

    var btnElements = buttons.map(function(b) {
      var btn = createElement('button', {
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
  };
})();

