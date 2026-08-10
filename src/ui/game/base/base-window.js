// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// ============================================================================
// SECRET BASE — permanent window + editor/visit (passes 35→38)
// ----------------------------------------------------------------------------
// A window "like the others" (card, team, quests…): a #win-base block in
// index.html, movable between columns via the native data-drag-window
// system, always visible. Two distinct canvases (#base-canvas-2d / 3d): a
// WebGL2 canvas can no longer provide a 2D context (getContext('2d') → null).
//
// Phase 38 (2D first, 3D later — user decision):
//   · PLACEMENT EDITOR: clickable stock, green/red ghost, click to place,
//     pivot (right-click / button), pickup (surface items carried along),
//     buddy placement/removal — all the logic is in base-editor.js
//     (baseCanPlace/basePlace/baseRotate/basePickup on the engine side).
//   · INTERACTIVE VISIT: animated touch-to-walk (engine BFS), ORAS traps,
//     interactions (heal, light, message…) and a bounded battle against a
//     buddy (once per visit). JSON export + visit by file.
// ============================================================================
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseCreateDefault(...args) { const f = __pwV43Link('baseCreateDefault'); return f ? f(...args) : undefined; }
function baseDialogNpc(...args) { const f = __pwV43Link('baseDialogNpc'); return f ? f(...args) : undefined; }
function baseDialogPc(...args) { const f = __pwV43Link('baseDialogPc'); return f ? f(...args) : undefined; }
function baseEditorAdoptVisit(...args) { const f = __pwV43Link('baseEditorAdoptVisit'); return f ? f(...args) : undefined; }
function baseEditorCellFromEvent(...args) { const f = __pwV43Link('baseEditorCellFromEvent'); return f ? f(...args) : undefined; }
function baseEditorClickCell(...args) { const f = __pwV43Link('baseEditorClickCell'); return f ? f(...args) : undefined; }
function baseEditorGet(...args) { const f = __pwV43Link('baseEditorGet'); return f ? f(...args) : undefined; }
function baseEditorGhost(...args) { const f = __pwV43Link('baseEditorGhost'); return f ? f(...args) : undefined; }
function baseEditorLaunchNpcBattle(...args) { const f = __pwV43Link('baseEditorLaunchNpcBattle'); return f ? f(...args) : undefined; }
function baseEditorMoveCancel(...args) { const f = __pwV43Link('baseEditorMoveCancel'); return f ? f(...args) : undefined; }
function baseEditorPickupSel(...args) { const f = __pwV43Link('baseEditorPickupSel'); return f ? f(...args) : undefined; }
function baseEditorRotateSel(...args) { const f = __pwV43Link('baseEditorRotateSel'); return f ? f(...args) : undefined; }
function baseEditorSelectNpc(...args) { const f = __pwV43Link('baseEditorSelectNpc'); return f ? f(...args) : undefined; }
function baseEditorSelectNpcNew(...args) { const f = __pwV43Link('baseEditorSelectNpcNew'); return f ? f(...args) : undefined; }
function baseEditorSelectSlug(...args) { const f = __pwV43Link('baseEditorSelectSlug'); return f ? f(...args) : undefined; }
function baseEditorSetHover(...args) { const f = __pwV43Link('baseEditorSetHover'); return f ? f(...args) : undefined; }
function baseEditorStartVisit(...args) { const f = __pwV43Link('baseEditorStartVisit'); return f ? f(...args) : undefined; }
function baseEditorStopVisit(...args) { const f = __pwV43Link('baseEditorStopVisit'); return f ? f(...args) : undefined; }
function baseEditorVisitClick(...args) { const f = __pwV43Link('baseEditorVisitClick'); return f ? f(...args) : undefined; }
function baseEditorVisitTick(...args) { const f = __pwV43Link('baseEditorVisitTick'); return f ? f(...args) : undefined; }
function baseExportDownload(...args) { const f = __pwV43Link('baseExportDownload'); return f ? f(...args) : undefined; }
function baseGetState(...args) { const f = __pwV43Link('baseGetState'); return f ? f(...args) : undefined; }
function baseImportPickFile(...args) { const f = __pwV43Link('baseImportPickFile'); return f ? f(...args) : undefined; }
function baseItemFootprint(...args) { const f = __pwV43Link('baseItemFootprint'); return f ? f(...args) : undefined; }
function baseItemGet(...args) { const f = __pwV43Link('baseItemGet'); return f ? f(...args) : undefined; }
function baseItemRotCount(...args) { const f = __pwV43Link('baseItemRotCount'); return f ? f(...args) : undefined; }
function baseLayoutGet(...args) { const f = __pwV43Link('baseLayoutGet'); return f ? f(...args) : undefined; }
function baseLayoutIds(...args) { const f = __pwV43Link('baseLayoutIds'); return f ? f(...args) : undefined; }
function baseNpcCount(...args) { const f = __pwV43Link('baseNpcCount'); return f ? f(...args) : undefined; }
function baseNpcSpriteUrl(...args) { const f = __pwV43Link('baseNpcSpriteUrl'); return f ? f(...args) : undefined; }
function basePlacedFind(...args) { const f = __pwV43Link('basePlacedFind'); return f ? f(...args) : undefined; }
function baseRelocate(...args) { const f = __pwV43Link('baseRelocate'); return f ? f(...args) : undefined; }
function baseStockCount(...args) { const f = __pwV43Link('baseStockCount'); return f ? f(...args) : undefined; }
function baseView2dDraw(...args) { const f = __pwV43Link('baseView2dDraw'); return f ? f(...args) : undefined; }
function baseView2dLoadSprites(...args) { const f = __pwV43Link('baseView2dLoadSprites'); return f ? f(...args) : undefined; }
function baseVisitCreate(...args) { const f = __pwV43Link('baseVisitCreate'); return f ? f(...args) : undefined; }
function baseZoneTopAt(...args) { const f = __pwV43Link('baseZoneTopAt'); return f ? f(...args) : undefined; }
function openBaseNpcEditor(...args) { const f = __pwV43Link('openBaseNpcEditor'); return f ? f(...args) : undefined; }

const _baseWin = {
  inited: false,
  root: null, c2d: null, c3d: null, modeSel: null, layoutSel: null, empty: null,
  rotateBtn: null, pickupBtn: null, visitBtn: null, expBtn: null, impBtn: null, npcEditBtn: null, pcEditBtn: null,
  hint: null, stock: null,
  r3d: undefined,       // WebGL2 renderer (undefined = not tried yet, null = absent)
  broken3d: false,      // phase 40: 3D cut for the session after the 1st failure
  sprites2d: null,
  spriteUrls: null,     // slug → url (for the stock thumbnails)
  stockTab: null,       // current stock page (phase 39)
  manP: null, iconUrls: null, // 2D manifest → thumbnail url (emerald || icon2d)
  lastSig: '',
  rendering: false,
  visitTimer: null,     // {pw} | {id}
};

// Engine state (creates the base on the default layout if needed).
function baseWindowState() {
  const st = (typeof __pwV43Link('baseGetState') === 'function') ? baseGetState() : null;
  if (!st) return null;
  // The base is no longer auto-created: until the player has settled in
  // (quest 218), st.layoutId stays null and the window shows "no base".
  return st;
}

function baseWindowEls() {
  _baseWin.root = document.getElementById('win-base');
  _baseWin.c2d = document.getElementById('base-canvas-2d');
  _baseWin.c3d = document.getElementById('base-canvas-3d');
  // Phase 55: more of selector 2D/3D — the 3D is has window has PART
  // (win-base3d), with its own gameplay. this window-ci not done that 2D.
  _baseWin.modeSel = null;
  _baseWin.layoutSel = document.getElementById('base-layout-select');
  _baseWin.empty = document.getElementById('base-win-empty');
  _baseWin.rotateBtn = document.getElementById('base-ed-rotate');
  baseWindowHideRotate();
  _baseWin.pickupBtn = document.getElementById('base-ed-pickup');
  _baseWin.npcEditBtn = document.getElementById('base-ed-npc-edit');
  _baseWin.pcEditBtn = document.getElementById('base-ed-pc-edit');
  _baseWin.visitBtn = document.getElementById('base-ed-visit');
  _baseWin.expBtn = document.getElementById('base-ed-export');
  _baseWin.impBtn = document.getElementById('base-ed-import');
  _baseWin.hint = document.getElementById('base-ed-hint');
  _baseWin.stock = document.getElementById('base-stock');
  return !!(_baseWin.root && _baseWin.c2d && _baseWin.layoutSel);
}

// Editor available only if the module + the toolbar elements are present.
function baseWindowEditorOk() {
  return typeof __pwV43Link('baseEditorGet') === 'function' && !!_baseWin.stock;
}

// Phase 42 (RSE canon): item rotation REMOVED → Rotate button hidden.
function baseWindowHideRotate() {
  if (_baseWin.rotateBtn) { _baseWin.rotateBtn.hidden = true; _baseWin.rotateBtn.disabled = true; }
}

// Opened via file:// (double-click on index.html)? Origins are then
// "unique": WebGL refuses any texture from a local <img>. The 3D is
// therefore disabled; the 2D stays fully functional.
function baseWindowIsFileUrl() {
  try {
    return (typeof location !== 'undefined') && location.protocol === 'file:';
  } catch (_) { return false; }
}

// Phase 55: this window is PURELY 2D. The 3D render lives in its own
// window (win-base3d / base3d-view.js) with its own WebGL2 context.

function baseWindowFillSelects() {
  const { layoutSel } = _baseWin;
  // dressing the header controls (runtime styles — project conventions)
  const controls = layoutSel.parentElement;
  if (controls) controls.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:auto';
  // The layout dropdown no longer EXISTS for the player: the base types
  // are scattered across the locations (ROUTE_BASE_ALCOVES) and are chosen
  // from the Location window of each route. The <select> stays filled for
  // internal use (state/debug/tests) but is permanently hidden.
  layoutSel.style.cssText = 'display:none';
  layoutSel.title = t('base.win.layout_label');
  if (!layoutSel.options.length) {
    // layouts grouped by family (brown/red/blue/yellow caves,
    // trees, bushes) — more readable than 30 flat options.
    const GROUP_ORDER = ['cave', 'cave_red', 'cave_blue', 'cave_yellow', 'tree', 'bush'];
    const groups = new Map();
    for (const id of baseLayoutIds()) {
      const m = /^(cave|tree|bush)(?:_(red|blue|yellow))?_\d+$/.exec(id);
      const g = m ? (m[2] ? m[1] + '_' + m[2] : m[1]) : 'cave';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(id);
    }
    for (const g of GROUP_ORDER) {
      const ids = groups.get(g);
      if (!ids || !ids.length) continue;
      const og = document.createElement('optgroup');
      og.label = t('base.win.layout_group.' + g);
      for (const id of ids) {
        const el = document.createElement('option');
        el.value = id; el.textContent = t('base.win.layout.' + id);
        og.appendChild(el);
      }
      layoutSel.appendChild(og);
    }
  }
}

// ——— Visit ticker — robust, always advancing ————————————————
// Fix: use PokeWorldTimers when available (visibility-aware), otherwise
// setInterval, and always step once immediately after the click for feedback.
function baseWindowVisitTicker(on) {
  if (on) {
    if (_baseWin.visitTimer) {
      // already running: keep the existing timer, it will advance the new path
      return;
    }
    const cb = () => {
      try {
        const r = baseEditorVisitTick();
        if (r.interact) baseWindowVisitInteractShow(r.interact);
        if (r.ev && r.ev.msg) {
          let msg;
          if (r.ev.msg === 'base.visit.note') {
            const names = t('base.notes');
            msg = tr('base.visit.note', { note: (names && names[r.ev.note]) || '?' });
          } else msg = t(r.ev.msg);
          if (typeof notify === 'function') notify(msg, 'var(--light1)');
        }
        baseWindowInvalidate();
        if (r.done) baseWindowVisitTicker(false);
      } catch (e) {
        baseWindowVisitTicker(false);
        try { console.warn('[base-window] visit tick:', e); } catch (_) {}
      }
    };
    try {
      if (typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers.set) {
        PokeWorldTimers.set('baseVisit', cb, 120);
        _baseWin.visitTimer = { pw: true };
      } else {
        const id = setInterval(cb, 110);
        _baseWin.visitTimer = { id };
      }
    } catch (_) {
      // fallback RAF
      const loop = () => {
        if (!_baseWin.visitTimer) return;
        cb();
        if (_baseWin.visitTimer) {
          if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loop);
          else setTimeout(loop, 110);
        }
      };
      _baseWin.visitTimer = { id: 1, raf: true };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loop);
      else setTimeout(loop, 110);
    }
  } else {
    if (!_baseWin.visitTimer) return;
    try {
      if (_baseWin.visitTimer.pw && typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers.stop) {
        PokeWorldTimers.stop('baseVisit');
      } else if (_baseWin.visitTimer.id) {
        clearInterval(_baseWin.visitTimer.id);
      }
    } catch (_) {}
    _baseWin.visitTimer = null;
  }
}

// —────────────────────────────────────────────────────────────────────────
function baseWindowOverlay(st) {
  const ed = baseEditorGet();
  const ov = {};
  if (ed.mode === 'visit' && ed.visit) {
    ov.path = ed.visit.path;
    ov.visitor = { x: ed.visit.pos.x, y: ed.visit.pos.y,
      // Phase 42: true animated hero sprite (dir + walk frames)
      dir: ed.visit.dir || 'down',
      frame: ed.visit.path && ed.visit.path.length ? ((ed.visit.animStep | 0) % 4) : 0,
      // Phase 44: perched on top of an item (display/slide)
      subElev: (ed.visit.pos && typeof __pwV43Link('baseZoneTopAt') === 'function' && baseZoneTopAt(ed.visit.st, ed.visit.pos.x, ed.visit.pos.y)) ? 1 : 0 };
    return ov;
  }
  const gh = baseEditorGhost(st);
  if (gh) ov.ghost = gh;
  else if (ed.hover) ov.hover = ed.hover;
  if (ed.selUid != null) {
    const it = basePlacedFind(st, ed.selUid);
    if (it) {
      const fp = baseItemFootprint(baseItemGet(it.s), it.rot);
      ov.select = { x: it.x, y: it.y, w: fp.w, d: fp.d };
    }
  } else if (ed.selNpc) {
    const n = st.npcs.find((p) => p.id === ed.selNpc);
    if (n && n.x != null) ov.select = { x: n.x, y: n.y, w: 1, d: 1 };
  }
  return ov;
}

// Phase 39 — paged stock:
// no more long list: a tab bar (one page per owned category
// + one Buddies page); each button carries the item sprite (Emerald,
// otherwise 2D shop icon — the GBA artwork is kept on the CANVAS only).
function baseWindowManifest() {
  if (!_baseWin.manP) {
    // Phase 40: priority to the script-embedded manifest (file:// without
    // CORS), fetch only as a fallback (http server).
    if (typeof window !== 'undefined' && window.PokeWorldBaseManifest2D) {
      _baseWin.manP = Promise.resolve(window.PokeWorldBaseManifest2D);
      return _baseWin.manP;
    }
    if (typeof fetch !== 'function') { _baseWin.manP = Promise.resolve({ items: {} }); return _baseWin.manP; }
    _baseWin.manP = fetch('src/assets/images/secret-base/manifest.render2d.json')
      .then((r) => (r.ok ? r.json() : { items: {} }))
      .catch(() => ({ items: {} }));
  }
  return _baseWin.manP;
}

async function baseWindowIconUrls() {
  if (_baseWin.iconUrls) return _baseWin.iconUrls;
  const mf = await baseWindowManifest();
  const out = {};
  for (const s of Object.keys(mf.items || {})) {
    const e = mf.items[s] || {};
    out[s] = e.emerald || e.icon2d || null;
  }
  _baseWin.iconUrls = out;
  return out;
}

function baseWindowStockBtn(label, count) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'base-stock-item';
  b.dataset.stopDrag = 'true';
  const img = document.createElement('img');
  img.className = 'base-stock-img';
  img.alt = '';
  b.appendChild(img);
  const nm = document.createElement('span');
  nm.className = 'base-stock-name';
  nm.textContent = label;
  b.appendChild(nm);
  if (count != null) {
    const c = document.createElement('span');
    c.className = 'base-stock-count';
    c.textContent = '×' + count;
    b.appendChild(c);
  }
  return b;
}

async function baseWindowRenderStock(st) {
  const box = _baseWin.stock;
  if (!box) return;
  if (!baseWindowEditorOk()) return;
  const ed = baseEditorGet();
  const urls = await baseWindowIconUrls();
  const slugs = Object.keys(st.stock || {}).filter((s) => baseStockCount(st, s) > 0 && baseItemGet(s));
  // Phase 47: no more "pool". The NPC is an item you place like a
  // furniture: a single button in its tab, available as long as the cap
  // is not reached (user feedback: "just an NPC item to place").
  const _npcRoom = (typeof __pwV43Link('baseNpcCount') === 'function' && typeof BASE_NPC_MAX !== 'undefined')
    ? Math.max(0, BASE_NPC_MAX - baseNpcCount(st)) : 0;
  const tabs = [];
  for (const cat of (typeof BASE_ITEM_CATEGORIES !== 'undefined' ? BASE_ITEM_CATEGORIES : [])) {
    const entries = slugs.filter((s) => baseItemGet(s).cat === cat);
    if (entries.length) tabs.push({ cat, entries });
  }
  tabs.push({ cat: '__pals', entries: ['__npc'] });
  if (!tabs.length) {
    box.textContent = '';
    const d = document.createElement('div');
    d.className = 'base-stock-empty';
    d.textContent = t('base.edit.stock_empty');
    box.appendChild(d);
    return;
  }
  if (!tabs.some((tb) => tb.cat === _baseWin.stockTab)) _baseWin.stockTab = tabs[0].cat;
  box.textContent = '';
  const bar = document.createElement('div');
  bar.className = 'base-stock-tabs';
  for (const tb of tabs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'base-stock-tab' + (tb.cat === _baseWin.stockTab ? ' sel' : '');
    b.dataset.action = 'base-ed-tab';
    b.dataset.cat = tb.cat;
    b.dataset.stopDrag = 'true';
    const label = tb.cat === '__pals' ? t('base.edit.pals') : t('base.cat.' + tb.cat);
    b.textContent = label;
    const pill = document.createElement('span'); // count pill like the bag (.inv-qty)
    pill.className = 'base-stock-tab-count';
    pill.textContent = String(tb.entries.length);
    b.appendChild(pill);
    bar.appendChild(b);
  }
  box.appendChild(bar);
  const page = document.createElement('div');
  page.className = 'base-stock-page';
  box.appendChild(page);
  const cur = tabs.find((tb) => tb.cat === _baseWin.stockTab);
  if (cur.cat === '__pals') {
    // Requested fix: a single NPC creator button, no accumulating pool,
    // no ×0/×8 counter: it is a CREATION button, not an owned item
    const placedCount = (st.npcs || []).length;
    const canCreate = placedCount < (typeof BASE_NPC_MAX !== 'undefined' ? BASE_NPC_MAX : 8);
    const bNew = baseWindowStockBtn(t('base.npced.place_npc'), null);
    bNew.dataset.action = 'base-ed-select-npc-new';
    bNew.title = t('base.npced.place_hint');
    if (ed.npcNew) bNew.classList.add('sel');
    if (!canCreate) bNew.disabled = true;
    const imNew = bNew.querySelector('img');
    if (imNew && typeof __pwV43Link('baseNpcSpriteUrl') === 'function') imNew.src = baseNpcSpriteUrl(BASE_NPC_SPRITE_DEFAULT);
    else if (imNew) imNew.remove();
    page.appendChild(bNew);
    if (!canCreate) {
      const d = document.createElement('div');
      d.className = 'base-stock-empty';
      d.textContent = t('base.err.npc_max');
      page.appendChild(d);
    }
    return;
  }
  for (const s of cur.entries) {
    const name = t('base.i.' + s);
    const b = baseWindowStockBtn(name, baseStockCount(st, s));
    b.dataset.action = 'base-ed-select';
    b.dataset.slug = s;
    b.title = name;
    if (ed.slug === s) b.classList.add('sel');
    if (urls[s]) b.querySelector('img').src = urls[s];
    else b.querySelector('img').remove(); // no asset connu : nom seul
    page.appendChild(b);
  }
}

// —────────────────────────────────────────────────────────────────────────
function baseWindowRefreshToolbar(st) {
  if (!baseWindowEditorOk()) return;
  const ed = baseEditorGet();
  const visit = ed.mode === 'visit' && !!ed.visit;
  _baseWin.stock.style.display = visit ? 'none' : '';
  _baseWin.visitBtn.textContent = t(visit ? 'base.edit.visit_stop' : 'base.edit.visit');
  if (_baseWin.rotateBtn) _baseWin.rotateBtn.textContent = t('base.edit.rotate');
  _baseWin.pickupBtn.textContent = t('base.edit.pickup');
  _baseWin.expBtn.textContent = t('base.edit.export');
  _baseWin.impBtn.textContent = t('base.edit.import');
  let canRotate = false;
  if (!visit) {
    if (ed.moveUid != null) {
      const itm = basePlacedFind(st, ed.moveUid);
      canRotate = !!(itm && baseItemRotCount(baseItemGet(itm.s)) > 1);
    } else if (ed.selUid != null) {
      const it = basePlacedFind(st, ed.selUid);
      canRotate = !!(it && baseItemRotCount(baseItemGet(it.s)) > 1);
    } else if (ed.slug) canRotate = baseItemRotCount(baseItemGet(ed.slug)) > 1;
  }
  void canRotate; // phase 42: rotation removed (button hidden)
  // Phase 41: "Pick up" also stores the HELD furniture (except automatics)
  let canPickup = !visit && (ed.selNpc != null || ed.selUid != null);
  if (!visit && ed.moveUid != null) {
    const heldPk = basePlacedFind(st, ed.moveUid);
    canPickup = !!(heldPk && heldPk.s !== 'pc');
  }
  _baseWin.pickupBtn.disabled = !canPickup;
  // Phase 47: "Edit" only appears when a placed NPC is selected
  // (user feedback: "when you click on top you see an edit button").
  if (_baseWin.npcEditBtn) {
    const selNpc = !visit && ed.selNpc != null;
    _baseWin.npcEditBtn.hidden = !selNpc;
    _baseWin.npcEditBtn.disabled = !selNpc;
    _baseWin.npcEditBtn.textContent = t('base.npced.edit_selected');
  }
  if (_baseWin.pcEditBtn) {
    let selPc = false;
    if (!visit && ed.selUid != null) {
      const it = (typeof __pwV43Link('basePlacedFind') === 'function') ? basePlacedFind(st, ed.selUid) : null;
      selPc = !!(it && it.s === 'pc');
    }
    _baseWin.pcEditBtn.hidden = !selPc;
    _baseWin.pcEditBtn.disabled = !selPc;
    try { _baseWin.pcEditBtn.textContent = t('base.pc.edit_selected') || 'Modifier le PC'; } catch(_) { _baseWin.pcEditBtn.textContent = 'Modifier le PC'; }
  }
  _baseWin.impBtn.disabled = visit;
  const movPlaced = !visit && ed.moveUid != null && basePlacedFind(st, ed.moveUid);
  _baseWin.hint.textContent = t(visit ? 'base.edit.visit_hint'
    : movPlaced ? tr('base.edit.move_hint', { name: t('base.i.' + movPlaced.s) })
    : ((ed.slug || ed.npcId || ed.npcNew) ? 'base.edit.place_hint' : 'base.edit.select_hint'));
  if (!visit) baseWindowRenderStock(st);
}

// ——— Interactions mouse on the canvas 2D —————————————————————————————————
// State to use when converting a mouse event: in VISIT mode it is the session
// state (sess.st) — the player's base may not exist at all.
function baseWindowEventState() {
  if (baseWindowEditorOk()) {
    const ed = baseEditorGet();
    if (ed.mode === 'visit' && ed.visit) return ed.visit.st;
  }
  return baseWindowState();
}
function baseWindowCanvasMove(ev) {
  const st = baseWindowState();
  if (!st || !baseWindowEditorOk()) return;
  const ed = baseEditorGet();
  if (ed.mode === 'visit') return; // no ghost while visiting
  const cell = baseEditorCellFromEvent(st, _baseWin.c2d, ev);
  const prev = ed.hover;
  if ((prev && cell && prev.x === cell.x && prev.y === cell.y) || (!prev && !cell)) return;
  baseEditorSetHover(cell);
  baseWindowInvalidate();
}

function baseWindowCanvasLeave() {
  if (!baseWindowEditorOk()) return;
  const ed = baseEditorGet();
  if (ed.mode === 'visit' || !ed.hover) return;
  baseEditorSetHover(null);
  baseWindowInvalidate();
}

// Displays the result of a visit interaction (and triggers the bounded
// battle when relevant — startBattle is called by base-editor).
function baseWindowVisitInteractShow(res) {
  if (!res) return;
  const say = (key, params, color) => { if (typeof notify === 'function') notify(tr(key, params), color || 'var(--light1)'); };
  switch (res.type) {
    // Phase 51: OPEN a dialog box — the player reads the encounter line
    // before deciding (fallback: direct start if the dialog is missing).
    case 'npc_battle':
    case 'npc_talked':
    case 'npc_idle':
      if (typeof __pwV43Link('baseDialogNpc') === 'function') baseDialogNpc(res);
      else if (res.type === 'npc_battle') {
        say('base.edit.battle_challenge', { name: res.npc.name }, 'var(--blue)');
        baseEditorLaunchNpcBattle(res);
      }
      break;
    case 'heal':
      // Canon: the bed heals the visitor's team.
      if (typeof G !== 'undefined' && G && Array.isArray(G.team)) {
        for (const p of G.team) { p.currentHP = p.maxHP; p.status = null; p.statusTurns = 0; }
      }
      say('base.edit.heal', null, 'var(--green)');
      break;
    case 'message': say('base.edit.message'); break;
    case 'light': say(res.on ? 'base.edit.light_on' : 'base.edit.light_off'); break;
    case 'punch': say('base.edit.punch'); break;
    case 'rules': say('base.edit.rules'); break;
    case 'sit': say('base.edit.sit'); break;
    case 'reveal': say('base.edit.reveal'); break;
    case 'msg': say(res.msg); break;
    case 'pc': {
      // Phase 51: the PC opens a panel (empty for now — reserved for
      // upcoming functions), with the base records in the header.
      if (typeof __pwV43Link('baseDialogPc') === 'function') { baseDialogPc(res); break; }
      const edc = baseEditorGet();
      if (edc.visitOwn) say('base.edit.pc_own', null, 'var(--blue)');
      else if (res.record) say('base.edit.pc_record', { name: edc.visitName || '?', v: res.record.visits | 0, w: res.record.w | 0, l: res.record.l | 0 });
      else say('base.edit.pc_record_none');
      break;
    }
    default: break;
  }
}

function baseWindowCanvasClick(ev) {
  const st = baseWindowState();
  if (!st || !baseWindowEditorOk()) return;
  const evSt = baseWindowEventState();
  const cell = baseEditorCellFromEvent(evSt, _baseWin.c2d, ev);
  if (!cell) return;
  const ed = baseEditorGet();
  if (ed.mode === 'visit') {
    baseEditorSetHover(cell);
    const r = baseEditorVisitClick(cell.x, cell.y);
    if (r.type === 'move') {
      baseWindowVisitTicker(true);
      // Immediate first step for instant feedback (in case the ticker has
      // a slight delay)
      try {
        const step = baseEditorVisitTick();
        if (step && step.interact) baseWindowVisitInteractShow(step.interact);
      } catch(_){}
    }
    else if (r.type === 'blocked' && typeof notify === 'function') notify(t('base.edit.blocked'), 'var(--light1)');
    else if (r.type === 'interact') baseWindowVisitInteractShow(r.res);
    baseWindowInvalidate();
    return;
  }
  const r = baseEditorClickCell(st, cell.x, cell.y);
  if (r.type === 'pc_dialog') {
    // PC panel opened in edit mode – no notification, just refresh
    baseWindowInvalidate();
    return;
  }
  if (typeof notify === 'function') {
    if (r.type === 'place') {
      if (r.ok) notify(tr('base.edit.placed', { name: t('base.i.' + r.slug) }), 'var(--green)');
      else notify(t(r.reason), 'var(--red)');
    } else if (r.type === 'place_npc') {
      if (r.ok) notify(tr('base.edit.npc_placed', { name: (st.npcs.find((n) => n.id === r.npcId) || {}).name || '?' }), 'var(--green)');
      else notify(t(r.reason), 'var(--red)');
    } else if (r.type === 'move_npc_start') {
      notify(tr('base.edit.npc_move_hint', { name: r.name || '?' }), 'var(--blue)');
    } else if (r.type === 'move_npc') {
      if (r.ok) notify(tr('base.edit.npc_placed', { name: (st.npcs.find((n) => n.id === r.npcId) || {}).name || '?' }), 'var(--green)');
      else notify(t(r.reason), 'var(--red)');
    } else if (r.type === 'move_start') {
      notify(tr('base.edit.move_hint', { name: t('base.i.' + r.slug) }), 'var(--blue)');
    } else if (r.type === 'move') {
      if (r.ok) notify(tr('base.edit.moved_item', { name: t('base.i.' + r.slug) }), 'var(--green)');
      else notify(t(r.reason), 'var(--red)');
    }
  }
  baseWindowInvalidate();
}

// ——— Toolbar actions —————————————————————————————————————————
function baseWindowSelectSlug(slug) {
  const st = baseWindowState();
  if (!st) return;
  baseEditorSelectSlug(st, slug);
  baseWindowInvalidate();
}

// Phase 47: take the "NPC item" from the stock.
function baseWindowSelectNpcNew() {
  const st = baseWindowState();
  if (!st || !baseWindowEditorOk()) return;
  const was = (typeof __pwV43Link('baseEditorGet') === 'function' ? baseEditorGet().npcNew : false);
  baseEditorSelectNpcNew(st);
  const now = (typeof __pwV43Link('baseEditorGet') === 'function' ? baseEditorGet().npcNew : false);
  if (typeof notify === 'function') {
    if (now) notify(t('base.npced.place_hint') || 'PNJ pris en main — cliquez une case pour le poser', 'var(--blue)');
    else if (was) notify(t('base.edit.select_hint') || 'Sélection annulée', 'var(--light1)');
  }
  baseWindowInvalidate();
}

// Phase 47: opens the editor on the NPC selected in the room.
function baseWindowEditSelectedNpc() {
  const ed = baseEditorGet();
  if (!ed || ed.selNpc == null) return;
  if (typeof __pwV43Link('openBaseNpcEditor') === 'function') openBaseNpcEditor(ed.selNpc);
}

function baseWindowEditSelectedPc() {
  if (typeof __pwV43Link('baseDialogPc') === 'function') {
    try { baseDialogPc(); } catch(_){}
  }
}

function baseWindowSelectNpc(npcId) {
  const st = baseWindowState();
  if (!st) return;
  // re-click on the same buddy = deselect (like the decos)
  const ed = baseEditorGet();
  baseEditorSelectNpc(st, ed.npcId === npcId ? null : npcId);
  baseWindowInvalidate();
}

// Changes the stock page (decorations ↔ category ↔ buddies).
function baseWindowSelectTab(cat) {
  _baseWin.stockTab = cat;
  baseWindowInvalidate();
}

function baseWindowRotateSel() {
  const st = baseWindowState();
  if (!st) return;
  const ed = baseEditorGet();
  let name = null;
  if (ed.selUid != null) {
    const it = basePlacedFind(st, ed.selUid);
    name = it ? t('base.i.' + it.s) : null;
  }
  const r = baseEditorRotateSel(st);
  if (r.placed && typeof notify === 'function') {
    if (r.ok) notify(tr('base.edit.rotated', { name: name || '?' }), 'var(--green)');
    else notify(t(r.reason), 'var(--red)');
  }
  baseWindowInvalidate();
}

function baseWindowPickupSel() {
  const st = baseWindowState();
  if (!st) return;
  const ed = baseEditorGet();
  let name = null;
  if (ed.selUid != null) {
    const it = basePlacedFind(st, ed.selUid);
    name = it ? t('base.i.' + it.s) : null;
  } else if (ed.selNpc) {
    const n = st.npcs.find((p) => p.id === ed.selNpc);
    name = n ? n.name : null;
  }
  const r = baseEditorPickupSel(st);
  if (r.ok && typeof notify === 'function') {
    notify(tr(r.npc ? 'base.edit.npc_picked_up' : 'base.edit.picked_up', { name: name || '?' }), 'var(--green)');
  }
  baseWindowInvalidate();
}

function baseWindowVisitToggle() {
  const st = baseWindowState();
  if (!st || !baseWindowEditorOk()) return;
  const ed = baseEditorGet();
  if (ed.mode === 'visit') {
    baseWindowVisitTicker(false);
    const sum = baseEditorStopVisit();
    if (sum && typeof notify === 'function') notify(tr('base.edit.visit_end', { w: sum.w, l: sum.l }), 'var(--light1)');
  } else {
    const res = baseEditorStartVisit(st, { name: '', source: 'own' });
    if (!res.ok) { if (typeof notify === 'function') notify(t(res.reason), 'var(--red)'); return; }
    if (typeof notify === 'function') notify(t('base.edit.visit_start_own'), 'var(--green)');
    // Quete decouverte (217) : visiter has base secrete.
    try { if (typeof advanceQuests === 'function') advanceQuests('base_visit', (typeof G !== 'undefined' && G) ? G.location : null, 1); } catch (_) {}
    try { if (typeof renderStoryWindow === 'function') renderStoryWindow(); } catch (_) {}
  }
  baseWindowInvalidate();
}

// Wave 35 (user): ENTER your own base from the Location window. The base
// window's "Visiter" toggle was the ONLY entry — nothing told the player it
// existed. Standing on your base's route now lists a direct "Entrer dans ma
// base" button (locAlcovesVNode current row) wired to this action. It ends
// any other ongoing visit properly, then starts an OWN-base visit session —
// identical semantics to the toggle's start branch (notify + quest 217
// advancement), plus scrolling the base window into view.
function baseWindowVisitOwnBase() {
  const st = baseWindowState();
  const en = (typeof G !== 'undefined' && G && G.lang === 'en');
  // First click may predate the first render: bind the window on demand
  // (#win-base is a static index.html element, init is idempotent).
  if (st && !baseWindowEditorOk() && typeof baseWindowInit === 'function') { try { baseWindowInit(); } catch (_) {} }
  if (!st || !baseWindowEditorOk()) return;
  if (!(st.layoutId)) {
    if (typeof notify === 'function') notify(en ? 'You have no Secret Base yet — settle an alcove first!' : 'Vous n\u2019avez pas encore de Base Secrète — installez-vous d\u2019abord dans une alcôve !', 'var(--light1)');
    return;
  }
  const ed = baseEditorGet();
  if (ed.mode === 'visit') {
    // Already walking inside your own base? Just bring the window forward.
    // (own-ness lives in _baseEd.visitOwn — the visit session itself holds
    // a structuredClone of the state, no source field)
    if (ed.visit && ed.visitOwn) {
      try { if (typeof scrollToWin === 'function') scrollToWin('win-base'); } catch (_) {}
      if (typeof baseWindowInvalidate === 'function') baseWindowInvalidate();
      return;
    }
    baseWindowVisitTicker(false);
    if (typeof __pwV43Link('baseEditorStopVisit') === 'function') baseEditorStopVisit();
  }
  const res = baseEditorStartVisit(st, { name: '', source: 'own' });
  if (!res.ok) { if (typeof notify === 'function') notify(t(res.reason), 'var(--red)'); return; }
  if (typeof notify === 'function') notify(t('base.edit.visit_start_own'), 'var(--green)');
  try { if (typeof advanceQuests === 'function') advanceQuests('base_visit', (typeof G !== 'undefined' && G) ? G.location : null, 1); } catch (_) {}
  try { if (typeof renderStoryWindow === 'function') renderStoryWindow(); } catch (_) {}
  try { if (typeof scrollToWin === 'function') scrollToWin('win-base'); } catch (_) {}
  if (typeof baseWindowInvalidate === 'function') baseWindowInvalidate();
}

function baseWindowExport() {
  const st = baseWindowState();
  if (!st) return;
  if (typeof __pwV43Link('baseExportDownload') === 'function') baseExportDownload(st, null);
}

// Visited by fichier : import valid (never credite) → session interactive.
function baseWindowImport() {
  const st = baseWindowState();
  if (!st || !baseWindowEditorOk()) return;
  const ed = baseEditorGet();
  if (ed.mode === 'visit') return;
  if (typeof __pwV43Link('baseImportPickFile') !== 'function') return;
  baseImportPickFile((res) => {
    if (!res || !res.ok) {
      if (res && res.reason && typeof notify === 'function') notify(t(res.reason), 'var(--red)');
      return;
    }
    baseEditorAdoptVisit(res.sess, { name: res.meta && res.meta.name, source: 'import' });
    if (typeof notify === 'function') notify(tr('base.edit.visit_start', { name: (res.meta && res.meta.name) || '?' }), 'var(--green)');
    baseWindowInvalidate();
  });
}

// ——— Render ————————————————————————————————————————————————————————————————
function baseWindowInit() {
  if (_baseWin.inited) return true;
  if (!baseWindowEls()) return false;
  for (const cv of [_baseWin.c2d, _baseWin.c3d]) {
    cv.style.cssText = 'display:none;max-width:100%;margin:0 auto;image-rendering:pixelated;background:transparent';
  }
  _baseWin.empty.style.cssText = 'display:none;opacity:.75;font-size:12px;padding:8px 4px;text-align:center';
  baseWindowFillSelects();
  if (baseWindowEditorOk()) {
    // Phase 38: editor wiring (ghost + click-to-place on the 2D canvas).
    _baseWin.c2d.addEventListener('mousemove', baseWindowCanvasMove);
    _baseWin.c2d.addEventListener('mouseleave', baseWindowCanvasLeave);
    _baseWin.c2d.addEventListener('click', baseWindowCanvasClick);
    // Phase 41: clicking the 3D (no editing possible) → explicit hint.
    _baseWin.c3d.addEventListener('click', () => {
      if (typeof notify === 'function') notify(t('base.edit.need2d'), 'var(--light1)');
    });
    _baseWin.c2d.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      const st = baseWindowState();
      if (!st || !baseWindowEditorOk()) return;
      const ed2 = baseEditorGet();
      if (ed2.mode === 'visit') return;
      if (ed2.moveUid != null) {
        // Phase 40: right-click cancels the one-click move.
        baseEditorMoveCancel(st);
        if (typeof notify === 'function') notify(t('base.edit.move_cancel'), 'var(--light1)');
        baseWindowInvalidate();
        return;
      }
      baseWindowRotateSel();
    });
  }
  _baseWin.inited = true;
  return true;
}

// Signature against useless re-renders (renderMap is called often)
function baseWindowSig(st, mode) {
  let s = mode + '|' + (st.layoutId || '') + '|';
  for (const it of st.items) s += it.s + it.x + it.y + it.rot + ';';
  s += '#';
  for (const n of st.npcs) s += (n.x == null ? '-' : n.x + ',' + n.y) + ';';
  return s;
}

async function baseWindowRender() {
  try { if (typeof PokeTrace !== 'undefined' && PokeTrace) PokeTrace.count('render', 'ui:base-window'); } catch (_) {}
  const isHoennBlocked = (typeof G !== 'undefined' && G && G.region && !G.unlockedSecretBaseHoenn);
  const rootEl = typeof document !== 'undefined' && document ? document.getElementById('win-base') : null;
  if (isHoennBlocked) {
    if (rootEl) rootEl.style.display = 'none';
    _baseWin.lastSig = 'hoenn_locked';
    return;
  } else {
    if (rootEl) rootEl.style.display = '';
  }
  if (!baseWindowInit() || _baseWin.rendering) return;
  const st = baseWindowState();
  if (!st) {
    // no save loaded: hint + nothing else
    _baseWin.lastSig = '';
    _baseWin.empty.textContent = t('base.win.empty');
    _baseWin.empty.style.display = 'block';
    _baseWin.c2d.style.display = 'none';
    _baseWin.c3d.style.display = 'none';
    return;
  }
  // a VISIT session can exist without a base of one's own (visit of an empty
  // alcove from the Location window, quest 217, or an imported friend's base):
  // it renders with its own state (sess.st), not the owner's.
  const _edV = baseWindowEditorOk() ? baseEditorGet() : null;
  const _visitSt = (_edV && _edV.mode === 'visit' && _edV.visit) ? _edV.visit.st : null;
  if (!st.layoutId && !_visitSt) {
    // No established base: the window stays empty/black (the base does
    // not exist yet — it gets created via "settle here" in the Location
    // window).
    _baseWin.lastSig = '';
    _baseWin.empty.textContent = t('base.win.not_established');
    _baseWin.empty.style.display = 'block';
    _baseWin.c2d.style.display = 'none';
    _baseWin.c3d.style.display = 'none';
    if (_baseWin.stock) _baseWin.stock.style.display = 'none';
    for (const b of [_baseWin.pickupBtn, _baseWin.expBtn, _baseWin.impBtn, _baseWin.visitBtn]) { if (b) b.disabled = true; }
    if (_baseWin.hint) _baseWin.hint.textContent = '';
    return;
  }
  for (const b of [_baseWin.expBtn, _baseWin.impBtn, _baseWin.visitBtn]) { if (b) b.disabled = false; }
  const drawSt = _visitSt || st;
  _baseWin.layoutSel.value = drawSt.layoutId || _BASE_DEFAULT_LAYOUT;
  const mode = '2d';   // phase 55 : window 2D pure (the 3D has the sienne)
  const sig = baseWindowSig(drawSt, mode) + (_visitSt ? '|V' : '');
  if (sig === _baseWin.lastSig) { baseWindowRefreshToolbar(drawSt); return; }
  _baseWin.lastSig = sig;
  _baseWin.rendering = true;
  try {
    _baseWin.empty.style.display = 'none';
    if (!_baseWin.sprites2d) {
      _baseWin.sprites2d = (await baseView2dLoadSprites()) || {};
      // urls of the vignettes of the stock (re-use of the images already chargees)
      _baseWin.spriteUrls = {};
      for (const slug of Object.keys(_baseWin.sprites2d || {})) {
        const img = _baseWin.sprites2d[slug];
        if (img && img.src) _baseWin.spriteUrls[slug] = img.src;
      }
    }
    const ok = false;   // phase 55 : more of branche 3D here
    if (ok) {
      _baseWin.c3d.style.display = 'block';
      _baseWin.c2d.style.display = 'none';
    } else {
      try {
        const overlay = baseWindowEditorOk() ? baseWindowOverlay(drawSt) : null;
        await baseView2dDraw(_baseWin.c2d, drawSt, _baseWin.sprites2d, overlay);
        _baseWin.c2d.style.display = 'block';
        _baseWin.c3d.style.display = 'none';
        _baseWin.empty.style.display = 'none';
      } catch (e2) {
        // last resort: message in the frame (window never empty)
        _baseWin.empty.textContent = t('base.win.no_gl');
        _baseWin.empty.style.display = 'block';
        try { console.warn('[base-window] 2D render failed:', e2); } catch (_) {}
      }
      if (mode === '3d' && typeof notify === 'function') notify(t('base.win.no_gl'), 'var(--red)');
    }
    baseWindowRefreshToolbar(drawSt);
  } catch (e) {
    try { console.warn('[base-window] render:', e); } catch (_) {}
  } finally {
    _baseWin.rendering = false;
  }
}

function baseWindowSetMode() { _baseWin.lastSig = ''; baseWindowRender(); }

function baseWindowSetLayout(id) {
  if (!baseWindowInit()) return;
  const st = baseWindowState();
  if (!st) return;
  // Demenagement during has visited : on clot proprement the session of abord.
  if (baseWindowEditorOk() && baseEditorGet().mode === 'visit') {
    baseWindowVisitTicker(false);
    baseEditorStopVisit();
  }
  const res = baseRelocate(st, id);
  if (res.ok && typeof notify === 'function') {
    const opts = _baseWin.layoutSel && _baseWin.layoutSel.options;
    const lbl = opts ? opts[_baseWin.layoutSel.selectedIndex] : null;
    notify(tr('base.win.moved', { name: (lbl && lbl.textContent) || id }), 'var(--green)');
  }
  _baseWin.lastSig = '';
  baseWindowRender();
}

// called by debug / all changement of state externe
function baseWindowInvalidate() { _baseWin.lastSig = ''; baseWindowRender(); }

// ─── Alcoves by route (no more dropdown menu: each Hoenn route has its
// own base slots, as in RSE). The 36 catalog layouts
// are scattered across the 17 routes by environment (trees/bushes on
// plains, brown/red/yellow caves in rocky or ash zones,
// blue caves near the water). Some routes carry 3 alcoves so that
// each precise base type exists somewhere.
const ROUTE_BASE_ALCOVES = {
  route101: ['tree_1', 'bush_1'],
  route102: ['bush_2', 'tree_2'],
  route103: ['cave_1', 'bush_3'],
  route104: ['tree_3', 'cave_blue_1'],
  route110: ['tree_4', 'bush_4'],
  route111: ['cave_2', 'cave_yellow_1', 'cave_red_1'],
  route112: ['cave_red_2', 'cave_red_5'],
  route113: ['cave_yellow_2', 'cave_red_3'],
  route114: ['cave_3', 'cave_red_4', 'cave_red_6'],
  route115: ['cave_blue_2', 'cave_blue_5'],
  route116: ['cave_4', 'cave_yellow_3'],
  route117: ['bush_5', 'tree_5'],
  route118: ['cave_yellow_4', 'cave_blue_3'],
  route119: ['tree_6', 'cave_blue_6'],
  route120: ['bush_6', 'cave_yellow_5'],
  route121: ['cave_5', 'cave_yellow_6'],
  route123: ['cave_6', 'cave_blue_4'],
};

function baseWindowGetRouteAlcoves(locId) {
  return ROUTE_BASE_ALCOVES[locId] || [];
}

// Route where the current base is established (persisted in st.routeId).
function baseWindowRouteOfCurrentBase() {
  const st = (typeof __pwV43Link('baseGetState') === 'function') ? baseGetState() : null;
  return (st && st.routeId) || null;
}

function _baseLayoutLabel(id) {
  const v = (typeof t === 'function') ? t('base.win.layout.' + id) : id;
  return (v && v !== 'base.win.layout.' + id) ? v : id;
}

// "Visit the alcove": starts a REAL visit session in the route's empty
// alcove — without touching the player's base (it may not exist).
// This is the visit that counts for quest 217 (discovering the bases).
function baseWindowVisitAlcove(locId, layoutId) {
  const alcoves = baseWindowGetRouteAlcoves(locId);
  const en = (typeof G !== 'undefined' && G && G.lang === 'en');
  if (!alcoves.length) {
    if (typeof notify === 'function') notify(en ? 'No usable alcove on this route.' : 'Aucune alcôve exploitable sur cette route.', 'var(--light1)');
    return;
  }
  const target = (layoutId && alcoves.includes(layoutId)) ? layoutId : alcoves[0];
  if (typeof __pwV43Link('baseEditorGet') === 'function') {
    const ed = baseEditorGet();
    if (ed.mode === 'visit') { baseWindowVisitTicker(false); if (typeof __pwV43Link('baseEditorStopVisit') === 'function') baseEditorStopVisit(); }
  }
  // TEMPORARY state of the empty alcove (never persisted): the visit
  // session clones this state — the player's base is not modified.
  const emptySt = (typeof __pwV43Link('baseCreateDefault') === 'function') ? baseCreateDefault() : { items: [], stock: {}, npcs: [], npcStock: [], uidSeq: 1, record: { w: 0, l: 0, visits: 0 } };
  if (typeof __pwV43Link('baseRelocate') === 'function') baseRelocate(emptySt, target); // places the layout + automatic PC
  const res = (typeof __pwV43Link('baseEditorAdoptVisit') === 'function' && typeof __pwV43Link('baseVisitCreate') === 'function')
    ? baseEditorAdoptVisit(baseVisitCreate(emptySt), { name: _baseLayoutLabel(target), source: 'alcove' })
    : { ok: false };
  if (!res.ok) {
    if (typeof notify === 'function') notify(en ? 'This alcove cannot be visited right now.' : 'Impossible de visiter cette alcôve pour le moment.', 'var(--red)');
    return;
  }
  if (typeof notify === 'function') notify(en ? ('Visiting the empty alcove (' + _baseLayoutLabel(target) + '). Walk around, then settle in if you like it!') : ('Visite de l\u2019alcôve vide (' + _baseLayoutLabel(target) + '). Explorez, puis installez-vous si elle vous plaît !'), 'var(--green)');
  // NB : baseEditorAdoptVisit avance already the quete 217 (base_visit).
  try { if (typeof scrollToWin === 'function') scrollToWin('win-base'); } catch (_) {}
  if (typeof baseWindowInvalidate === 'function') baseWindowInvalidate();
}

// Backward compatibility: "Examine the alcove" = visit the first alcove.
function baseWindowSelectRouteLayout(locId) { baseWindowVisitAlcove(locId, null); }

// "Set up here": MANDATORY confirmation once a base already exists
// (whatever the route/alcove — relocating dismantles all furniture, never
// to be done by mistake). Only the very first installation is direct.
// UNIFIED confirmation panel (#confirm-modal via pwConfirm) — no more
// browser window.confirm.
function baseWindowConfirmEstablish(locId, layoutId) {
  const st = baseWindowState();
  if (!st) return;
  const alcoves = baseWindowGetRouteAlcoves(locId);
  if (!alcoves.length) return;
  const target = (layoutId && alcoves.includes(layoutId)) ? layoutId : alcoves[0];
  const en = (typeof G !== 'undefined' && G && G.lang === 'en');
  // a base exists as soon as a layout is placed (st.routeId may be missing on
  // old saves: it must not short-circuit the confirmation).
  const hasBase = !!st.layoutId;
  if (hasBase) {
    // Already established exactly here → nothing to do.
    if (st.routeId === locId && st.layoutId === target) {
      if (typeof notify === 'function') notify(en ? 'Your Secret Base is already established here.' : 'Votre Base Secrète est déjà établie ici.', 'var(--light1)');
      return;
    }
    const hasFurniture = (st.items || []).some((i) => i.s !== 'pc');
    const title = en ? '🏠 Move your Secret Base?' : '🏠 Déménager votre Base Secrète ?';
    const msg = en
      ? 'You already have a Secret Base.' + (hasFurniture ? '\nAll its furniture will be picked up and returned to your stock.' : '') + '\n\nMove your base here: ' + _baseLayoutLabel(target) + ' (' + (typeof getLocName === 'function' ? getLocName(locId) : locId) + ')?'
      : 'Vous avez déjà une Base Secrète.' + (hasFurniture ? '\nTous ses meubles seront ramassés et retourneront dans votre stock.' : '') + '\n\nDéménager votre base ici : ' + _baseLayoutLabel(target) + ' (' + (typeof getLocName === 'function' ? getLocName(locId) : locId) + ') ?';
    if (typeof pwConfirm === 'function') {
      pwConfirm(msg, function () { baseWindowEstablishRouteLayout(locId, target); }, {
        title,
        danger: true,
        confirmLabel: en ? 'Move my base' : 'Déménager ma base',
        cancelLabel: en ? 'Cancel' : 'Annuler',
      });
      return;
    }
    // No design-system modal → do nothing (never fall back to native confirm()).
    return;
  }
  baseWindowEstablishRouteLayout(locId, target);
}

function baseWindowEstablishRouteLayout(locId, layoutId) {
  const st = baseWindowState();
  if (!st) return;
  const alcoves = baseWindowGetRouteAlcoves(locId);
  const target = (layoutId && (typeof __pwV43Link('baseLayoutGet') !== 'function' || baseLayoutGet(layoutId))) ? layoutId : (alcoves[0] || 'cave_1');
  // End any ongoing alcove visit (we are settling in!).
  if (typeof __pwV43Link('baseEditorGet') === 'function') {
    const ed = baseEditorGet();
    if (ed.mode === 'visit') { baseWindowVisitTicker(false); if (typeof __pwV43Link('baseEditorStopVisit') === 'function') baseEditorStopVisit(); }
  }
  baseWindowSetLayout(target);
  // Robustness: if the window could not be initialized (missing DOM),
  // baseWindowSetLayout did nothing — move the state directly.
  if (st.layoutId !== target && typeof __pwV43Link('baseRelocate') === 'function') baseRelocate(st, target);
  st.routeId = locId || null;
  if (typeof notify === 'function') notify((typeof G !== 'undefined' && G && G.lang === 'en') ? 'Your Secret Base is now established on this route!' : 'Votre Base Secrète est désormais établie sur cette route !', 'var(--green)');
  // Wave 35 (user): TELL the player how to enter — the "Visiter" toggle was
  // the only entry and nobody ever mentioned it (feedback: "on ne m'a jamais
  // dit d'appuyer sur visiter").
  if (typeof notify === 'function') notify((typeof G !== 'undefined' && G && G.lang === 'en') ? 'Press Visiter (Base window) — or "Enter my base" from the Location window of this route — to walk inside!' : 'Appuyez sur Visiter (fenêtre Base) — ou « Entrer dans ma base » depuis la fenêtre Lieu de cette route — pour y entrer !', 'var(--yellow)');
  // Quete decouverte (218) : prendre possession of has base secrete.
  try { if (typeof advanceQuests === 'function') advanceQuests('base_establish', locId || null, 1); } catch (_) {}
  try { if (typeof renderStoryWindow === 'function') renderStoryWindow(); } catch (_) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (_) {}
  try { if (typeof refreshMapAndLoc === 'function') refreshMapAndLoc(); } catch (_) {}
}

if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowGetRouteAlcoves', baseWindowGetRouteAlcoves); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowGetRouteAlcoves = baseWindowGetRouteAlcoves; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowRouteOfCurrentBase', baseWindowRouteOfCurrentBase); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowRouteOfCurrentBase = baseWindowRouteOfCurrentBase; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowVisitAlcove', baseWindowVisitAlcove); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowVisitAlcove = baseWindowVisitAlcove; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowSelectRouteLayout', baseWindowSelectRouteLayout); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowSelectRouteLayout = baseWindowSelectRouteLayout; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowConfirmEstablish', baseWindowConfirmEstablish); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowConfirmEstablish = baseWindowConfirmEstablish; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowEstablishRouteLayout', baseWindowEstablishRouteLayout); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowEstablishRouteLayout = baseWindowEstablishRouteLayout; }

if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowInit', baseWindowInit); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowInit = baseWindowInit; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowRender', baseWindowRender); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowRender = baseWindowRender; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowSetMode', baseWindowSetMode); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowSetMode = baseWindowSetMode; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowSetLayout', baseWindowSetLayout); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowSetLayout = baseWindowSetLayout; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowInvalidate', baseWindowInvalidate); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowInvalidate = baseWindowInvalidate; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowSelectSlug', baseWindowSelectSlug); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowSelectSlug = baseWindowSelectSlug; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowSelectNpc', baseWindowSelectNpc); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowSelectNpc = baseWindowSelectNpc; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowSelectTab', baseWindowSelectTab); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowSelectTab = baseWindowSelectTab; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowRotateSel', baseWindowRotateSel); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowRotateSel = baseWindowRotateSel; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowPickupSel', baseWindowPickupSel); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowPickupSel = baseWindowPickupSel; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowVisitToggle', baseWindowVisitToggle); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowVisitToggle = baseWindowVisitToggle; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowVisitOwnBase', baseWindowVisitOwnBase); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowVisitOwnBase = baseWindowVisitOwnBase; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowExport', baseWindowExport); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowExport = baseWindowExport; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowImport', baseWindowImport); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowImport = baseWindowImport; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowOverlay', baseWindowOverlay); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowOverlay = baseWindowOverlay; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowVisitTicker', baseWindowVisitTicker); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowVisitTicker = baseWindowVisitTicker; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowSelectNpcNew', baseWindowSelectNpcNew); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowSelectNpcNew = baseWindowSelectNpcNew; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowEditSelectedNpc', baseWindowEditSelectedNpc); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowEditSelectedNpc = baseWindowEditSelectedNpc; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowEditSelectedPc', baseWindowEditSelectedPc); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowEditSelectedPc = baseWindowEditSelectedPc; }
if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowIsFileUrl', baseWindowIsFileUrl); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowIsFileUrl = baseWindowIsFileUrl; }


// --- Exported globals ---
if (typeof baseWindowCanvasClick !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowCanvasClick', baseWindowCanvasClick); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowCanvasClick = baseWindowCanvasClick; } }
if (typeof baseWindowCanvasLeave !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowCanvasLeave', baseWindowCanvasLeave); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowCanvasLeave = baseWindowCanvasLeave; } }
if (typeof baseWindowCanvasMove !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowCanvasMove', baseWindowCanvasMove); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowCanvasMove = baseWindowCanvasMove; } }
if (typeof baseWindowEditorOk !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowEditorOk', baseWindowEditorOk); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowEditorOk = baseWindowEditorOk; } }
if (typeof baseWindowEls !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowEls', baseWindowEls); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowEls = baseWindowEls; } }
if (typeof baseWindowEventState !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowEventState', baseWindowEventState); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowEventState = baseWindowEventState; } }
if (typeof baseWindowFillSelects !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowFillSelects', baseWindowFillSelects); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowFillSelects = baseWindowFillSelects; } }
if (typeof baseWindowHideRotate !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowHideRotate', baseWindowHideRotate); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowHideRotate = baseWindowHideRotate; } }
if (typeof baseWindowManifest !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowManifest', baseWindowManifest); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowManifest = baseWindowManifest; } }
if (typeof baseWindowRefreshToolbar !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowRefreshToolbar', baseWindowRefreshToolbar); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowRefreshToolbar = baseWindowRefreshToolbar; } }
if (typeof baseWindowSig !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowSig', baseWindowSig); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowSig = baseWindowSig; } }
if (typeof baseWindowState !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowState', baseWindowState); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowState = baseWindowState; } }
if (typeof baseWindowStockBtn !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowStockBtn', baseWindowStockBtn); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowStockBtn = baseWindowStockBtn; } }
if (typeof baseWindowVisitInteractShow !== 'undefined') { if (typeof PokeActions !== 'undefined') { PokeActions.register('baseWindowVisitInteractShow', baseWindowVisitInteractShow); } else if (typeof globalThis !== 'undefined') { globalThis.baseWindowVisitInteractShow = baseWindowVisitInteractShow; } }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  baseWindowGetRouteAlcoves,
  baseWindowRouteOfCurrentBase,
  baseWindowVisitAlcove,
  baseWindowSelectRouteLayout,
  baseWindowConfirmEstablish,
  baseWindowEstablishRouteLayout,
  baseWindowInit,
  baseWindowRender,
  baseWindowSetMode,
  baseWindowSetLayout,
  baseWindowInvalidate,
  baseWindowSelectSlug,
  baseWindowSelectNpc,
  baseWindowSelectTab,
  baseWindowRotateSel,
  baseWindowPickupSel,
  baseWindowVisitToggle,
  baseWindowVisitOwnBase,
  baseWindowExport,
  baseWindowImport,
  baseWindowOverlay,
  baseWindowVisitTicker,
  baseWindowSelectNpcNew,
  baseWindowEditSelectedNpc,
  baseWindowEditSelectedPc,
  baseWindowIsFileUrl,
  baseWindowCanvasClick,
  baseWindowCanvasLeave,
  baseWindowCanvasMove,
  baseWindowEditorOk,
  baseWindowEls,
  baseWindowEventState,
  baseWindowFillSelects,
  baseWindowHideRotate,
  baseWindowManifest,
  baseWindowRefreshToolbar,
  baseWindowSig,
  baseWindowState,
  baseWindowStockBtn,
  baseWindowVisitInteractShow,
};
