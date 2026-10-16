// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof pwSetHtml === 'function') pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}
/**
 * Mine management model (tabs + content blocks) consumed by
 * ui/views/ManagementMenuView. Labels stay localized via t()/tr() at call
 * time. Uniform parts (tabs, upgrade cards, automation toggle) are pure
 * ECS design-system blocks; the staff list remains a staged classic
 * fragment for now.
 */
// FIX (2026-08): the energy hint used to be a frozen string ("+2 / sec · +15
// par victoire sauvage"), so rebalancing ENERGY_PER_BATTLE from 15 to 5 left
// the UI lying to the player. It now interpolates the real constants.
function _mineEnergyHint() {
  let regen = 2,
    perBattle = 5;
  try {
    if (typeof MINE_ENERGY_REGEN === 'number') regen = MINE_ENERGY_REGEN;
  } catch (_) {}
  try {
    if (typeof MINE_ENERGY_PER_BATTLE === 'number') perBattle = MINE_ENERGY_PER_BATTLE;
  } catch (_) {}
  return typeof tr === 'function'
    ? tr('mine_energy_hint', { regen, perBattle })
    : t('mine_energy_hint');
}

/** « 1 000 Diamants » — prix de la mine automatique lu dans le code qui l'encaisse. */
function _mineAutoCostLabel() {
  const cost = Number(globalThis.MINE_AUTO_COST) || 0;
  const fmt = globalThis.formatNumber ? globalThis.formatNumber(cost) : String(cost);
  return `${fmt} ${t('currency_diamonds')}`;
}
/** V7-R3c · R3c-05 — bouton « Auto » directement dans le panneau Mine : bascule
 *  si le module est acheté, sinon achat direct avec le prix affiché. */
function mineAutoHeaderAction() {
  const auto = (G && G.mine && G.mine.automation) || { purchased: false, enabled: false };
  if (auto.purchased)
    return {
      label: `${tr('mine_auto_toggle', {
        state: t(auto.enabled ? 'automation_enabled' : 'automation_disabled'),
      })} (1 💎 / tuile)`,
      iconHtml: globalThis.getIcon ? globalThis.getIcon('mine', 14) : '',
      call: 'toggleMineAutomation',
      callArgs: '',
      active: !!auto.enabled,
      pressed: !!auto.enabled,
    };
  return {
    label: `${t('mine_auto_title')} · ${_mineAutoCostLabel()}`,
    iconHtml: globalThis.getIcon ? globalThis.getIcon('mine', 14) : '',
    call: 'buyMineAutomation',
    callArgs: '',
  };
}
function mineManagementModel(page) {
  const icon = (n) => (typeof getIcon === 'function' ? getIcon(n, 14) : '');
  const call = 'openMineManagementMenu';
  const tabs = [
    {
      id: 'upgrades',
      label: t('management_upgrades'),
      iconHtml: icon('save'),
      call,
      args: `'upgrades'`,
      active: page === 'upgrades',
    },
    {
      id: 'automation',
      label: t('management_automation'),
      iconHtml: icon('settings'),
      call,
      args: `'automation'`,
      active: page === 'automation',
    },
    {
      id: 'miners',
      label: t('management_miners'),
      iconHtml: icon('mine'),
      call,
      args: `'miners'`,
      active: page === 'miners',
    },
  ];
  const blocks = [];
  if (page === 'miners') {
    // automation.js may be absent in targeted unit-test sandboxes — the
    // block then renders nothing (same as the old guarded fragment).
    blocks.push({
      kind: 'staff',
      class: 'management-staff-block',
      staff: typeof staffListModel === 'function' ? staffListModel('mine') : null,
    });
  } else if (page === 'automation') {
    const auto = G.mine.automation || { purchased: false, enabled: false };
    blocks.push({
      kind: 'toggles',
      cards: [
        {
          iconHtml: icon('mine'),
          label: t('mine_auto_title'),
          purchased: !!auto.purchased,
          enabled: !!auto.enabled,
          usageCost: '1 💎 / tuile',
          call: 'toggleMineAutomation',
          args: '',
          onLabel: `${t('automation_enabled')} (1 💎 / tuile)`,
          offLabel: `${t('automation_disabled')} (1 💎 / tuile)`,
          // V7-R3c · R3c-04 — prix (Diamants, lu dans MINE_AUTO_COST) + achat direct
          lockedLabel: _mineAutoCostLabel(),
          buy: { call: 'buyMineAutomation', args: '', label: t('buy_btn') },
        },
      ],
    });
  } else {
    const auto = G.mine.automation || { purchased: false, enabled: false };
    const energyCost =
      typeof getMineEnergyUpgradeCost === 'function' ? getMineEnergyUpgradeCost() : null;
    const toolCard = (tool) => {
      const unlocked = typeof isMineToolUnlocked === 'function' && isMineToolUnlocked(tool);
      const def = typeof MINE_TOOL_DEFS !== 'undefined' ? MINE_TOOL_DEFS[tool] : null;
      return unlocked
        ? {
            title: t('mine_tool_' + tool),
            value: t('owned'),
            state: 'owned',
            stateLabel: t('owned'),
          }
        : {
            title: t('mine_tool_' + tool),
            value: '',
            state: 'buy',
            call: 'buyMineTool',
            args: `'${tool}'`,
            buyLabel:
              typeof diamondSpriteHtml === 'function'
                ? diamondSpriteHtml(def && def.diamondCost ? def.diamondCost : 0)
                : '',
          };
    };
    blocks.push({
      kind: 'upgrades',
      cards: [
        energyCost
          ? {
              title: t('mine_energy_upgrade_title'),
              value: String(G.mine.maxEnergy || 100),
              state: 'buy',
              call: 'upgradeMineEnergy',
              args: '',
              buyLabel:
                typeof diamondSpriteHtml === 'function' ? diamondSpriteHtml(energyCost) : '',
            }
          : {
              title: t('mine_energy_upgrade_title'),
              value: String(G.mine.maxEnergy || 100),
              state: 'owned',
              stateLabel: t('automation_owned'),
            },
        auto.purchased
          ? {
              title: t('mine_auto_title'),
              value: t('automation_owned'),
              state: 'owned',
              stateLabel: t('automation_owned'),
            }
          : {
              title: t('mine_auto_title'),
              value: '',
              state: 'buy',
              call: 'buyMineAutomation',
              args: '',
              buyLabel: typeof diamondSpriteHtml === 'function' ? diamondSpriteHtml(1000) : '',
            },
        toolCard('pickaxe'),
        toolCard('drill'),
        toolCard('dynamite'),
      ],
    });
  }
  return {
    machine: 'mine',
    title: t('mine_management_title'),
    titleIconHtml: icon('settings'),
    tabs,
    activeTab: page,
    blocks,
  };
}
let _mineMgmtLastPage = null; // suivi of page for the conservation of the scroll
function openMineManagementMenu(page = 'upgrades') {
  const inner = document.getElementById('poke-modal-inner');
  const modal = document.getElementById('poke-modal');
  if (!inner || !modal) return;
  // Anti "jump to top" (passes 15+16): persistent skeleton like the
  // hatchery and the training (scrollable container never recreated).
  // The shell itself is the ECS ManagementMenuView.
  const _keepScroll = _mineMgmtLastPage === page;
  _mineMgmtLastPage = page;
  modal.classList.remove('poke-detail-front');
  inner.classList.remove('poke-detail-inner');
  inner.classList.add('management-inner');
  if (typeof ensureMineAutomation === 'function') ensureMineAutomation();
  const views =
    typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views
      ? window.PokeUI.views
      : null;
  if (!views || typeof views.ManagementMenuView !== 'function')
    throw new Error('[ui] PokeUI views not loaded (ManagementMenuView)');
  const model = mineManagementModel(page);
  const shell = inner.querySelector && inner.querySelector('.management-shell.management-mine');
  let contentEl = shell ? shell.querySelector('.management-content') : null;
  if (!contentEl) {
    _pwSetHtmlSafe(inner, views.ManagementMenuView.toHTML(model));
    contentEl = inner.querySelector('.management-content');
  }
  const tabsHost = inner.querySelector('.management-tabs-host');
  if (tabsHost) _pwSetHtmlSafe(tabsHost, views.ManagementMenuView.tabsHTML(model));
  const _pos = _keepScroll && contentEl ? contentEl.scrollTop || 0 : 0;
  const body = views.ManagementMenuView.contentHTML(model);
  _pwSetHtmlSafe(contentEl, body);
  if (_keepScroll) {
    try {
      contentEl.scrollTop = _pos;
    } catch (_) {}
  } else if (typeof pwResetScrollNow === 'function') pwResetScrollNow(contentEl);
  else {
    try {
      contentEl.scrollTop = 0;
    } catch (_) {}
  }
  if (typeof window !== 'undefined' && typeof window.pwModalInfo === 'function')
    window.pwModalInfo(false);
  modal.classList.add('open');
}

/** V7-R3c · R3c-05 — après un achat ou une bascule de « Mine auto » depuis
 *  l'en-tête du panneau : le panneau est re-rendu ; le menu de gestion n'est
 *  re-rendu que s'il est déjà ouvert (plus de modale qui surgit à chaque clic). */
function refreshMineAutomationUi() {
  const modal = document.getElementById('poke-modal');
  const shell = modal && modal.querySelector('.management-shell.management-mine');
  if (modal && shell && modal.classList.contains('open')) {
    try {
      openMineManagementMenu('automation');
    } catch (_) {}
  }
  renderMineWindow();
}

// UI overhaul: the mine window is rendered by the ECS design system
// (MineWindowView) — zero legacy markup below. Rock/item colors are theme
// CLASSES on the design-system palette (mine-tile--d*/--item-*), not
// hardcoded hex strings in JS.
function renderMineWindow() {
  const el = document.getElementById('mine-window-body');
  if (!el) return;
  if (!mineUnlocked()) {
    _pwSetHtmlSafe(el, `<div class="pw-empty-state-sm"> ${t('mine_locked_badges')}</div>`);
    return;
  }
  renderMine(el);
}

function renderMine(el) {
  initMineIfNeeded();
  const { energy, maxEnergy, tool, grid, items } = G.mine;

  // Board model: shape detection stays here, every visual decision moves
  // to the view + design-system.css.
  const tiles = [];
  for (let y = 0; y < MINE_H; y++) {
    for (let x = 0; x < MINE_W; x++) {
      const depth = grid[y][x];
      let cellItem = null;
      let isItemCenter = false;
      for (const itm of items) {
        const dx = x - itm.x;
        const dy = y - itm.y;
        if (
          dx >= 0 &&
          dy >= 0 &&
          dy < itm.shape.length &&
          dx < itm.shape[0].length &&
          itm.shape[dy][dx] === 1
        ) {
          cellItem = itm;
          if (
            dx === Math.floor(itm.shape[0].length / 2) &&
            dy === Math.floor(itm.shape.length / 2)
          ) {
            isItemCenter = true;
          }
          break;
        }
      }
      const canClick = depth > 0 || tool === 'hammer';
      tiles.push({
        depth: depth,
        x: x,
        y: y,
        clickable: canClick,
        itemKey: depth === 0 && cellItem ? cellItem.key : null,
        itemCenter: !!(depth === 0 && cellItem && isItemCenter),
        itemCollected: !!(cellItem && cellItem.collected),
        iconHtml: depth === 0 && cellItem && isItemCenter ? itemIcon(cellItem.key, 24) : null,
      });
    }
  }
  const foundCount = items.filter((i) => i.collected).length;
  const views =
    typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views
      ? window.PokeUI.views
      : null;
  if (!views || !views.MineWindowView)
    throw new Error('[ui] PokeUI views not loaded (MineWindowView)');
  _pwSetHtmlSafe(
    el,
    views.MineWindowView.toHTML({
      className: 'mine-window',
      header: {
        classes: 'hatchery-upgrade-row',
        actions: [
          mineAutoHeaderAction(), // V7-R3c · R3c-05
          {
            label: t('mine_management_button'),
            iconHtml: typeof getIcon === 'function' ? getIcon('settings', 14) : '',
            call: 'openMineManagementMenu',
            callArgs: `'upgrades'`,
          },
        ],
      },
      title: t('mine_title'),
      subtitle: t('mine_sub'),
      energy: {
        label: t('mine_energy'),
        valueText: `${energy || 0} / ${maxEnergy || 100}`,
        pct: clamp(Math.floor(((energy || 0) / Math.max(1, maxEnergy || 100)) * 100), 0, 100),
        hint: _mineEnergyHint(),
      },
      tools: ['chisel', 'hammer', 'pickaxe', 'drill', 'dynamite']
        .filter((tl) =>
          typeof isMineToolUnlocked === 'function'
            ? isMineToolUnlocked(tl)
            : tl === 'chisel' || tl === 'hammer'
        )
        .map((tl) => ({
          id: tl,
          label: t('mine_tool_' + tl),
          cost: typeof mineToolEnergyCost === 'function' ? mineToolEnergyCost(tl) : 5,
          selected: tool === tl,
          iconHtml: mineToolIcon(tl, 16),
          title: _mineToolHint(tl),
          call: 'setMineTool',
          callArgs: `'${tl}'`,
        })),
      // V7-R3 · R3-01 — retour joueur « retour visuel de l'outil utilisé » :
      // ligne d'état de l'outil courant + grille marquée (curseur / aperçu).
      toolHint: _mineToolHint(tool || 'chisel'),
      currentTool: tool || 'chisel',
      grid: { cols: MINE_W, tiles: tiles },
      // Wave 32 (retour utilisateur) : chaque trésor est une pastille dont le
      // FOND et la couleur du nom disent s'il est encore enfoui ; une fois
      // déterré, le sprite de l'objet précède son nom. Aucun marqueur ❓/✔ :
      // le fond suffit (l'état reste annoncé aux lecteurs d'écran via `state`).
      treasures: {
        label: t('mine_treasures'),
        found: foundCount,
        total: items.length,
        rows: items.map((i) => ({
          collected: !!i.collected,
          name: getItemName(i.key),
          iconHtml: i.collected ? itemIcon(i.key, 18, 'pw-mine-treasure-icon') : '',
          state: i.collected ? t('mine_treasure_found') : t('mine_treasure_buried'),
        })),
      },
      newLayerLabel: t('mine_new_layer'),
    })
  );
}

// ── PASSE 30 (P3) — ANIMATION DE CASSAGE DES TUILES ────────────────────────
// digMineTile() nous transmet la liste des cases qui ont bougé au dernier coup
// (impact) et celles qui viennent d'atteindre la profondeur 0 (cassage). Comme
// renderMineWindow() reconstruit intégralement la grille, l'animation ne peut
// être posée qu'APRÈS le rendu : d'où cette fonction appelée en fin de coup.
// L'interrupteur d'animations (G.settings.uiAnimations, ANI-01) est respecté :
// coupé, on ne touche pas au DOM du tout.
// ── V7-R3 · R3-01 — RETOUR VISUEL DE L'OUTIL ────────────────────────────────
// Icônes des outils (SVG inline, couleur courante) — pas d'emoji : rendu
// identique partout, colorable par le thème.
const MINE_TOOL_SVG = {
  chisel: '<path d="M4 20l6-6"/><path d="M9 9l6 6 4-4-6-6z"/><path d="M14 3l3 3"/>',
  hammer: '<path d="M14 4l6 6-3 3-6-6z"/><path d="M12 8l-8 8 2 2 8-8"/><path d="M3 21l3-3"/>',
  pickaxe:
    '<path d="M3 21l9-9"/><path d="M12 12l3-3"/><path d="M6 6c4-2 8-2 12 0"/><path d="M15 9c2 2 3 5 3 9"/>',
  drill:
    '<path d="M3 12h7"/><path d="M10 9h6v6h-6z"/><path d="M16 10h4v4h-4z"/><path d="M12 15l-1 5h3l1-5"/>',
  dynamite:
    '<path d="M6 10h10v10H6z"/><path d="M11 10V6"/><path d="M11 6c2-2 4-1 5 0"/><circle cx="17" cy="5" r="1"/>',
};
function mineToolIcon(tool, size) {
  const body = MINE_TOOL_SVG[tool] || MINE_TOOL_SVG.chisel;
  const px = Number(size) || 16;
  return (
    '<svg class="mine-tool-ico" viewBox="0 0 24 24" width="' +
    px +
    '" height="' +
    px +
    '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    body +
    '</svg>'
  );
}
/** « Marteau · 15 énergie par coup · zone 3×3 · puissance 1 » (chiffres lus dans MINE_TOOL_DEFS). */
function _mineToolHint(tool) {
  const defs = globalThis.MINE_TOOL_DEFS || null;
  const def = defs && defs[tool] ? defs[tool] : { shape: 'single', power: 1 };
  const area = t('mine_tool_area_' + (def.shape || 'single'));
  return tr('mine_tool_hint', {
    tool: t('mine_tool_' + tool),
    cost: String(globalThis.mineToolEnergyCost ? mineToolEnergyCost(tool) : 5),
    area: area,
    power: String(def.power || 1),
  });
}
/** Survol d'une case : les cases que l'outil courant toucherait sont marquées. */
function _mineAimClear(grid) {
  grid.querySelectorAll('.mine-tile.is-aim').forEach((el) => el.classList.remove('is-aim'));
}
function _mineAimAt(grid, tile) {
  _mineAimClear(grid);
  if (!tile || !globalThis.mineToolCells || !G || !G.mine) return;
  const x = Number(tile.dataset.mineX);
  const y = Number(tile.dataset.mineY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  for (const [cx2, cy2] of mineToolCells(G.mine.tool || 'chisel', x, y)) {
    const el = grid.querySelector(
      '.mine-tile[data-mine-x="' + cx2 + '"][data-mine-y="' + cy2 + '"]'
    );
    if (el) el.classList.add('is-aim');
  }
}
function installMineAimPreview() {
  if (typeof document === 'undefined' || !document.body) return false;
  if (document.body.dataset.pwMineAim === '1') return true;
  document.body.dataset.pwMineAim = '1';
  document.addEventListener('pointerover', (ev) => {
    const tgt = ev.target;
    if (!tgt || typeof tgt.closest !== 'function') return;
    const grid = tgt.closest('#mine-window-body .mine-grid');
    if (!grid) return;
    _mineAimAt(grid, tgt.closest('.mine-tile'));
  });
  document.addEventListener('pointerout', (ev) => {
    const tgt = ev.target;
    if (!tgt || typeof tgt.closest !== 'function') return;
    const grid = tgt.closest('#mine-window-body .mine-grid');
    if (!grid) return;
    const to = ev.relatedTarget;
    if (!to || typeof to.closest !== 'function' || !to.closest('#mine-window-body .mine-grid'))
      _mineAimClear(grid);
  });
  return true;
}
installMineAimPreview();
/** Au coup : l'icône de l'outil « frappe » la case visée et le coût s'envole. */
function _mineStrikeFx(grid, hit) {
  if (!hit || !Number.isFinite(Number(hit.x)) || !Number.isFinite(Number(hit.y))) return;
  const tile = grid.querySelector(
    '.mine-tile[data-mine-x="' + hit.x + '"][data-mine-y="' + hit.y + '"]'
  );
  if (!tile) return;
  const fx = document.createElement('span');
  fx.className = 'pw-mine-strike';
  fx.dataset.tool = String(hit.tool || 'chisel');
  _pwSetHtmlSafe(
    fx,
    mineToolIcon(hit.tool, 22) +
      '<b class="pw-mine-strike-cost">−' +
      Number(hit.cost || 0) +
      (globalThis.getIcon ? globalThis.getIcon('energy', 11) : '') +
      '</b>'
  );
  tile.appendChild(fx);
  setTimeout(() => {
    try {
      fx.remove();
    } catch (_) {}
  }, 700);
}

function playMineDigFx(cells, hit) {
  if (typeof document === 'undefined') return;
  if (typeof uiAnimationsOn === 'function' && !uiAnimationsOn()) return;
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
  } catch (_) {}
  const grid = document.querySelector('#mine-window-body .mine-grid');
  if (!grid) return;
  _mineStrikeFx(grid, hit); // V7-R3 · R3-01
  if (!Array.isArray(cells) || !cells.length) return;
  for (const c of cells) {
    const tile = grid.querySelector(
      '.mine-tile[data-mine-x="' + c.x + '"][data-mine-y="' + c.y + '"]'
    );
    if (!tile) continue;
    const cls = c.broken ? 'pw-mine-break' : 'pw-mine-hit';
    const ms = c.broken ? 420 : 280;
    tile.classList.remove('pw-mine-break', 'pw-mine-hit');
    void tile.offsetWidth; // reflow : rejoue l'animation sur un coup répété
    tile.classList.add(cls);
    // un trésor mis au jour scintille en plus de se casser
    if (c.broken && tile.classList.contains('mine-tile-revealed-item')) {
      tile.classList.add('pw-mine-reveal');
      setTimeout(() => {
        try {
          tile.classList.remove('pw-mine-reveal');
        } catch (_) {}
      }, 620);
    }
    setTimeout(() => {
      try {
        tile.classList.remove(cls);
      } catch (_) {}
    }, ms);
  }
}

// --- Migrated to ES module, globals exposed ---
if (typeof openMineManagementMenu !== 'undefined') {
  if (typeof window !== 'undefined') window.openMineManagementMenu = openMineManagementMenu;
  if (typeof globalThis !== 'undefined') globalThis.openMineManagementMenu = openMineManagementMenu;
}
if (typeof renderMineWindow !== 'undefined') {
  if (typeof window !== 'undefined') window.renderMineWindow = renderMineWindow;
  if (typeof globalThis !== 'undefined') globalThis.renderMineWindow = renderMineWindow;
}
if (typeof renderMine !== 'undefined') {
  if (typeof window !== 'undefined') window.renderMine = renderMine;
  if (typeof globalThis !== 'undefined') globalThis.renderMine = renderMine;
}
if (typeof playMineDigFx !== 'undefined') {
  if (typeof window !== 'undefined') window.playMineDigFx = playMineDigFx;
  if (typeof globalThis !== 'undefined') globalThis.playMineDigFx = playMineDigFx;
}

// --- Exported globals ---

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  openMineManagementMenu,
  renderMineWindow,
  renderMine,
  playMineDigFx,
  mineToolIcon,
  installMineAimPreview,
  refreshMineAutomationUi,
};
if (typeof window !== 'undefined')
  Object.assign(window, { mineToolIcon, installMineAimPreview, refreshMineAutomationUi });
if (typeof globalThis !== 'undefined')
  Object.assign(globalThis, { mineToolIcon, installMineAimPreview, refreshMineAutomationUi });

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('renderMineWindow', renderMineWindow);
  } catch (_) {}
}
