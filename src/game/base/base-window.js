// ============================================================================
// BASE SECRÈTE — Fenêtre permanente + éditeur/visite (passes 35→38)
// ----------------------------------------------------------------------------
// Fenêtre « comme les autres » (carte, équipe, quêtes…) : bloc #win-base dans
// index.html, déplaçable entre colonnes via le système natif data-drag-window,
// visible en permanence. Deux canvas distincts (#base-canvas-2d / 3d) : un
// canvas WebGL2 ne peut plus fournir de contexte 2D (getContext('2d') → null).
//
// Passe 38 (2D d'abord, la 3D suivra — décision utilisateur) :
//   · ÉDITEUR de pose : stock cliquable, fantôme vert/rouge, pose au clic,
//     pivot (clic droit / bouton), ramassage (objets de surface embarqués),
//     placement/retrait des copains — toute la logique est dans base-editor.js
//     (baseCanPlace/basePlace/baseRotate/basePickup côté moteur).
//   · VISITE interactive : toucher-pour-marcher animé (BFS moteur), pièges
//     ROSA, interactions (soin, lumière, message…) et combat borné contre un
//     copain (une fois par visite). Export JSON + visite par fichier.
// ============================================================================

const _baseWin = {
  inited: false,
  root: null, c2d: null, c3d: null, modeSel: null, layoutSel: null, empty: null,
  rotateBtn: null, pickupBtn: null, visitBtn: null, expBtn: null, impBtn: null, npcEditBtn: null,
  hint: null, stock: null,
  r3d: undefined,       // renderer WebGL2 (undefined = pas encore tenté, null = absent)
  broken3d: false,      // passe 40 : 3D coupée pour la session après 1er échec
  sprites2d: null,
  spriteUrls: null,     // slug → url (pour les vignettes du stock)
  stockTab: null,       // page courante du stock (passe 39)
  manP: null, iconUrls: null, // manifeste 2D → url vignette (emerald || icon2d)
  lastSig: '',
  rendering: false,
  visitTimer: null,     // {pw} | {id}
};

// État moteur (crée la base au gabarit par défaut si nécessaire).
function baseWindowState() {
  const st = (typeof baseGetState === 'function') ? baseGetState() : null;
  if (!st) return null;
  // La base N'EST PLUS auto-créée : tant que le joueur ne s'est pas installé
  // (quête 218), st.layoutId reste null et la fenêtre affiche « aucune base ».
  return st;
}

function baseWindowEls() {
  _baseWin.root = document.getElementById('win-base');
  _baseWin.c2d = document.getElementById('base-canvas-2d');
  _baseWin.c3d = document.getElementById('base-canvas-3d');
  // Passe 55 : plus de sélecteur 2D/3D — la 3D est une FENÊTRE À PART
  // (win-base3d), avec son propre gameplay. Cette fenêtre-ci ne fait que 2D.
  _baseWin.modeSel = null;
  _baseWin.layoutSel = document.getElementById('base-layout-select');
  _baseWin.empty = document.getElementById('base-win-empty');
  _baseWin.rotateBtn = document.getElementById('base-ed-rotate');
  baseWindowHideRotate();
  _baseWin.pickupBtn = document.getElementById('base-ed-pickup');
  _baseWin.npcEditBtn = document.getElementById('base-ed-npc-edit');
  _baseWin.visitBtn = document.getElementById('base-ed-visit');
  _baseWin.expBtn = document.getElementById('base-ed-export');
  _baseWin.impBtn = document.getElementById('base-ed-import');
  _baseWin.hint = document.getElementById('base-ed-hint');
  _baseWin.stock = document.getElementById('base-stock');
  return !!(_baseWin.root && _baseWin.c2d && _baseWin.layoutSel);
}

// Éditeur dispo seulement si le module + les éléments de la barre sont là.
function baseWindowEditorOk() {
  return typeof baseEditorGet === 'function' && !!_baseWin.stock;
}

// Passe 42 (canon RSE) : rotation des objets SUPPRIMÉE → bouton Pivoter caché.
function baseWindowHideRotate() {
  if (_baseWin.rotateBtn) { _baseWin.rotateBtn.hidden = true; _baseWin.rotateBtn.disabled = true; }
}

// Ouverture en file:// (double-clic sur index.html) ? Les origines y sont
// « uniques » : WebGL refuse toute texture issue d'un <img> local. La 3D est
// donc désactivée d'emblée dans ce mode (le rendu 2D, lui, fonctionne).
function baseWindowIsFileUrl() {
  try {
    return (typeof location !== 'undefined') && location.protocol === 'file:';
  } catch (_) { return false; }
}

// Passe 55 : cette fenêtre est PUREMENT 2D. Le rendu 3D vit dans sa propre
// fenêtre (win-base3d / base3d-view.js) avec son propre contexte WebGL2.

function baseWindowFillSelects() {
  const { layoutSel } = _baseWin;
  // habillage des contrôles du header (styles runtime — conventions du projet)
  const controls = layoutSel.parentElement;
  if (controls) controls.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:auto';
  // Le menu déroulant des gabarits N'EXISTE PLUS pour le joueur : les types de
  // base sont disséminés dans les lieux (ROUTE_BASE_ALCOVES) et se choisissent
  // depuis la fenêtre Lieu de chaque route. Le <select> reste rempli à titre
  // interne (état/débug/tests) mais définitivement masqué.
  layoutSel.style.cssText = 'display:none';
  layoutSel.title = t('base.win.layout_label');
  if (!layoutSel.options.length) {
    // gabarits regroupés par famille (grottes brune/rouge/bleue/jaune,
    // arbres, buissons) — plus lisible que 30 options à plat.
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

// ——— Minuteur de visite (pas animés ; registre natif si présent) —————————
function baseWindowVisitTicker(on) {
  if (on && !_baseWin.visitTimer) {
    const cb = () => {
      try {
        const r = baseEditorVisitTick();
        // passe 46 : arrivée à côté d'un copain abordé de loin → interaction
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
      } catch (e) { baseWindowVisitTicker(false); try { console.warn('[base-window] visit tick:', e); } catch (_) {} }
    };
    if (typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers && PokeWorldTimers.set) {
      PokeWorldTimers.set('baseVisit', cb, 140);
      _baseWin.visitTimer = { pw: true };
    } else _baseWin.visitTimer = { id: setInterval(cb, 140) };
  } else if (!on && _baseWin.visitTimer) {
    if (_baseWin.visitTimer.pw && typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers.stop) PokeWorldTimers.stop('baseVisit');
    else clearInterval(_baseWin.visitTimer.id);
    _baseWin.visitTimer = null;
  }
}

// ——— Surcouche 2D pour l'éditeur/la visite ————————————————————————————————
function baseWindowOverlay(st) {
  const ed = baseEditorGet();
  const ov = {};
  if (ed.mode === 'visit' && ed.visit) {
    ov.path = ed.visit.path;
    ov.visitor = { x: ed.visit.pos.x, y: ed.visit.pos.y,
      // passe 42 : vraie sprite héros animée (dir + frames de marche)
      dir: ed.visit.dir || 'down',
      frame: ed.visit.path && ed.visit.path.length ? ((ed.visit.animStep | 0) % 4) : 0,
      // passe 44 : perché sur le dessus d'un objet (présentoir/toboggan)
      subElev: (ed.visit.pos && typeof baseZoneTopAt === 'function' && baseZoneTopAt(ed.visit.st, ed.visit.pos.x, ed.visit.pos.y)) ? 1 : 0 };
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

// ——— Panneau de stock / vivier : PAGES par catégorie (passe 39) ———————————
// Plus de longue liste : une barre d'onglets (une page par catégorie possédée
// + une page Copains), chaque bouton porte le sprite de l'objet (Émeraude,
// sinon icône boutique 2D — la DA GBA est préservée sur le CANVAS uniquement).
function baseWindowManifest() {
  if (!_baseWin.manP) {
    // Passe 40 : priorité au manifeste embarqué en script (file:// sans CORS),
    // fetch seulement en repli (serveur http).
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
  // Passe 47 : plus de « vivier ». Le PNJ est un OBJET qu'on pose comme un
  // meuble : un seul bouton dans son onglet, disponible tant que le plafond
  // n'est pas atteint (retour utilisateur : « juste un objet PNJ posé »).
  const npcRoom = (typeof baseNpcCount === 'function' && typeof BASE_NPC_MAX !== 'undefined')
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
    const pill = document.createElement('span'); // pastille de comptage façon sac (.inv-qty)
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
    // UN bouton « PNJ » : on le prend puis on clique une case, comme un meuble.
    const b = baseWindowStockBtn(t('base.npced.place_npc'), npcRoom);
    b.dataset.action = 'base-ed-select-npc-new';
    b.title = t('base.npced.place_hint');
    if (ed.npcNew) b.classList.add('sel');
    if (!npcRoom) b.disabled = true;
    const im = b.querySelector('img');
    if (im && typeof baseNpcSpriteUrl === 'function') im.src = baseNpcSpriteUrl(BASE_NPC_SPRITE_DEFAULT);
    else if (im) im.remove();
    page.appendChild(b);
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
    else b.querySelector('img').remove(); // aucun asset connu : nom seul
    page.appendChild(b);
  }
}

// ——— Barre d'outils (états + libellés + hint) —————————————————————————————
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
  void canRotate; // passe 42 : rotation supprimée (bouton caché)
  // passe 41 : « Ramasser » range aussi le meuble TENU (sauf automatiques)
  let canPickup = !visit && (ed.selNpc != null || ed.selUid != null);
  if (!visit && ed.moveUid != null) {
    const heldPk = basePlacedFind(st, ed.moveUid);
    canPickup = !!(heldPk && heldPk.s !== 'pc');
  }
  _baseWin.pickupBtn.disabled = !canPickup;
  // Passe 47 : « Modifier » n'apparaît QUE lorsqu'un PNJ posé est sélectionné
  // (retour utilisateur : « quand on clique dessus on voit un bouton modifier »).
  if (_baseWin.npcEditBtn) {
    const selNpc = !visit && ed.selNpc != null;
    _baseWin.npcEditBtn.hidden = !selNpc;
    _baseWin.npcEditBtn.disabled = !selNpc;
    _baseWin.npcEditBtn.textContent = t('base.npced.edit_selected');
  }
  _baseWin.impBtn.disabled = visit;
  const movPlaced = !visit && ed.moveUid != null && basePlacedFind(st, ed.moveUid);
  _baseWin.hint.textContent = t(visit ? 'base.edit.visit_hint'
    : movPlaced ? tr('base.edit.move_hint', { name: t('base.i.' + movPlaced.s) })
    : ((ed.slug || ed.npcId || ed.npcNew) ? 'base.edit.place_hint' : 'base.edit.select_hint'));
  if (!visit) baseWindowRenderStock(st);
}

// ——— Interactions souris sur le canvas 2D —————————————————————————————————
// État à utiliser pour convertir un événement souris : en VISITE c'est l'état
// de la session (sess.st) — la base du joueur peut ne pas exister du tout.
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
  if (ed.mode === 'visit') return; // pas de fantôme en visite
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

// Affichage du résultat d'une interaction de visite (et déclenchement du
// combat borné le cas échéant — startBattle est appelé par base-editor).
function baseWindowVisitInteractShow(res) {
  if (!res) return;
  const say = (key, params, color) => { if (typeof notify === 'function') notify(tr(key, params), color || 'var(--light1)'); };
  switch (res.type) {
    // Passe 51 : on OUVRE une boîte de dialogue — le joueur lit la phrase de
    // rencontre et choisit de combattre ou de passer son chemin.
    case 'npc_battle':
    case 'npc_talked':
    case 'npc_idle':
      if (typeof baseDialogNpc === 'function') baseDialogNpc(res);
      else if (res.type === 'npc_battle') {
        say('base.edit.battle_challenge', { name: res.npc.name }, 'var(--blue)');
        baseEditorLaunchNpcBattle(res);
      }
      break;
    case 'heal':
      // Canon : le lit soigne l'équipe du visiteur.
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
      // Passe 51 : le PC ouvre un PANNEAU (vide pour l'instant — réservé aux
      // fonctions à venir), avec les records de la base en en-tête.
      if (typeof baseDialogPc === 'function') { baseDialogPc(res); break; }
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
    if (r.type === 'move') baseWindowVisitTicker(true);
    else if (r.type === 'blocked' && typeof notify === 'function') notify(t('base.edit.blocked'), 'var(--light1)');
    else if (r.type === 'interact') baseWindowVisitInteractShow(r.res);
    baseWindowInvalidate();
    return;
  }
  const r = baseEditorClickCell(st, cell.x, cell.y);
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

// ——— Actions de la barre d'outils —————————————————————————————————————————
function baseWindowSelectSlug(slug) {
  const st = baseWindowState();
  if (!st) return;
  baseEditorSelectSlug(st, slug);
  baseWindowInvalidate();
}

// Passe 47 : prendre « l'objet PNJ » du stock.
function baseWindowSelectNpcNew() {
  const st = baseWindowState();
  if (!st || !baseWindowEditorOk()) return;
  baseEditorSelectNpcNew(st);
  baseWindowInvalidate();
}

// Passe 47 : ouvre l'éditeur SUR le PNJ sélectionné dans la salle.
function baseWindowEditSelectedNpc() {
  const ed = baseEditorGet();
  if (!ed || ed.selNpc == null) return;
  if (typeof openBaseNpcEditor === 'function') openBaseNpcEditor(ed.selNpc);
}

function baseWindowSelectNpc(npcId) {
  const st = baseWindowState();
  if (!st) return;
  // re-clic sur le même copain = désélection (comme les décos)
  const ed = baseEditorGet();
  baseEditorSelectNpc(st, ed.npcId === npcId ? null : npcId);
  baseWindowInvalidate();
}

// Change la page du stock (décoration ↔ catégorie ↔ copains).
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
    // Quête découverte (217) : visiter une base secrète.
    try { if (typeof advanceQuests === 'function') advanceQuests('base_visit', (typeof G !== 'undefined' && G) ? G.location : null, 1); } catch (_) {}
    try { if (typeof renderStoryWindow === 'function') renderStoryWindow(); } catch (_) {}
  }
  baseWindowInvalidate();
}

function baseWindowExport() {
  const st = baseWindowState();
  if (!st) return;
  if (typeof baseExportDownload === 'function') baseExportDownload(st, null);
}

// Visite par fichier : import validé (jamais crédité) → session interactive.
function baseWindowImport() {
  const st = baseWindowState();
  if (!st || !baseWindowEditorOk()) return;
  const ed = baseEditorGet();
  if (ed.mode === 'visit') return;
  if (typeof baseImportPickFile !== 'function') return;
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

// ——— Rendu ————————————————————————————————————————————————————————————————
function baseWindowInit() {
  if (_baseWin.inited) return true;
  if (!baseWindowEls()) return false;
  for (const cv of [_baseWin.c2d, _baseWin.c3d]) {
    cv.style.cssText = 'display:none;max-width:100%;margin:0 auto;image-rendering:pixelated;background:transparent';
  }
  _baseWin.empty.style.cssText = 'display:none;opacity:.75;font-size:12px;padding:8px 4px;text-align:center';
  baseWindowFillSelects();
  if (baseWindowEditorOk()) {
    // Interactions éditeur/visite : UNIQUEMENT le canvas 2D (passe 38).
    _baseWin.c2d.addEventListener('mousemove', baseWindowCanvasMove);
    _baseWin.c2d.addEventListener('mouseleave', baseWindowCanvasLeave);
    _baseWin.c2d.addEventListener('click', baseWindowCanvasClick);
    // passe 41 : clic sur la 3D (aucune édition possible) → hint explicite.
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
        // clic droit = rendre le meuble tenu à sa place d'origine (passe 40)
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

// Signature anti-rendu inutile (renderMap est appelé souvent)
function baseWindowSig(st, mode) {
  let s = mode + '|' + (st.layoutId || '') + '|';
  for (const it of st.items) s += it.s + it.x + it.y + it.rot + ';';
  s += '#';
  for (const n of st.npcs) s += (n.x == null ? '-' : n.x + ',' + n.y) + ';';
  return s;
}

async function baseWindowRender() {
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
    // pas de sauvegarde chargée : hint + rien d'autre
    _baseWin.lastSig = '';
    _baseWin.empty.textContent = t('base.win.empty');
    _baseWin.empty.style.display = 'block';
    _baseWin.c2d.style.display = 'none';
    _baseWin.c3d.style.display = 'none';
    return;
  }
  // Une session de VISITE peut exister sans base à soi (visite d'une alcôve
  // vide depuis la fenêtre Lieu, quête 217, ou base d'un ami importée) : elle
  // se rend avec SON propre état (sess.st), pas celui du propriétaire.
  const _edV = baseWindowEditorOk() ? baseEditorGet() : null;
  const _visitSt = (_edV && _edV.mode === 'visit' && _edV.visit) ? _edV.visit.st : null;
  if (!st.layoutId && !_visitSt) {
    // Aucune base établie : la fenêtre reste vide/noire (la base n'existe pas
    // encore — elle se crée via « S'installer ici » dans la fenêtre Lieu).
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
  _baseWin.layoutSel.value = drawSt.layoutId || BASE_DEFAULT_LAYOUT;
  const mode = '2d';   // passe 55 : fenêtre 2D pure (la 3D a la sienne)
  const sig = baseWindowSig(drawSt, mode) + (_visitSt ? '|V' : '');
  if (sig === _baseWin.lastSig) { baseWindowRefreshToolbar(drawSt); return; }
  _baseWin.lastSig = sig;
  _baseWin.rendering = true;
  try {
    _baseWin.empty.style.display = 'none';
    if (!_baseWin.sprites2d) {
      _baseWin.sprites2d = await baseView2dLoadSprites();
      // urls des vignettes du stock (re-use des images déjà chargées)
      _baseWin.spriteUrls = {};
      for (const slug of Object.keys(_baseWin.sprites2d)) {
        const img = _baseWin.sprites2d[slug];
        if (img && img.src) _baseWin.spriteUrls[slug] = img.src;
      }
    }
    const ok = false;   // passe 55 : plus de branche 3D ici
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
        // dernier recours : message dans le cadre (fenêtre jamais vide)
        _baseWin.empty.textContent = t('base.win.no_gl');
        _baseWin.empty.style.display = 'block';
        try { console.warn('[base-window] rendu 2D en échec :', e2); } catch (_) {}
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
  // Déménagement pendant une visite : on clôt proprement la session d'abord.
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

// appelée par debug / tout changement d'état externe
function baseWindowInvalidate() { _baseWin.lastSig = ''; baseWindowRender(); }

// ─── Alcôves par route (plus de menu déroulant : chaque route de Hoenn a ses
// propres emplacements de base, comme dans RSE). Les 36 gabarits du catalogue
// sont disséminés sur les 17 routes selon l'environnement (arbres/buissons en
// plaine, grottes brunes/rouges/jaunes dans les zones rocheuses ou de cendres,
// grottes bleues près de l'eau). Certaines routes portent 3 alcôves pour que
// chaque type de base précis existe quelque part.
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

// Route où la base actuelle est établie (persisté dans st.routeId).
function baseWindowRouteOfCurrentBase() {
  const st = (typeof baseGetState === 'function') ? baseGetState() : null;
  return (st && st.routeId) || null;
}

function _baseLayoutLabel(id) {
  const v = (typeof t === 'function') ? t('base.win.layout.' + id) : id;
  return (v && v !== 'base.win.layout.' + id) ? v : id;
}

// « Visiter l'alcôve » : lance une VRAIE session de visite dans l'alcôve vide
// de la route — sans toucher à la base du joueur (elle peut ne pas exister).
// C'est cette visite qui compte pour la quête 217 (découverte des bases).
function baseWindowVisitAlcove(locId, layoutId) {
  const alcoves = baseWindowGetRouteAlcoves(locId);
  const en = (typeof G !== 'undefined' && G && G.lang === 'en');
  if (!alcoves.length) {
    if (typeof notify === 'function') notify(en ? 'No usable alcove on this route.' : 'Aucune alcôve exploitable sur cette route.', 'var(--light1)');
    return;
  }
  const target = (layoutId && alcoves.includes(layoutId)) ? layoutId : alcoves[0];
  if (typeof baseEditorGet === 'function') {
    const ed = baseEditorGet();
    if (ed.mode === 'visit') { baseWindowVisitTicker(false); if (typeof baseEditorStopVisit === 'function') baseEditorStopVisit(); }
  }
  // État TEMPORAIRE de l'alcôve vide (jamais persisté) : la session de visite
  // clone cet état — la base du joueur n'est pas modifiée.
  const emptySt = (typeof baseCreateDefault === 'function') ? baseCreateDefault() : { items: [], stock: {}, npcs: [], npcStock: [], uidSeq: 1, record: { w: 0, l: 0, visits: 0 } };
  if (typeof baseRelocate === 'function') baseRelocate(emptySt, target); // pose le gabarit + PC automatique
  const res = (typeof baseEditorAdoptVisit === 'function' && typeof baseVisitCreate === 'function')
    ? baseEditorAdoptVisit(baseVisitCreate(emptySt), { name: _baseLayoutLabel(target), source: 'alcove' })
    : { ok: false };
  if (!res.ok) {
    if (typeof notify === 'function') notify(en ? 'This alcove cannot be visited right now.' : 'Impossible de visiter cette alcôve pour le moment.', 'var(--red)');
    return;
  }
  if (typeof notify === 'function') notify(en ? ('Visiting the empty alcove (' + _baseLayoutLabel(target) + '). Walk around, then settle in if you like it!') : ('Visite de l\u2019alcôve vide (' + _baseLayoutLabel(target) + '). Explorez, puis installez-vous si elle vous plaît !'), 'var(--green)');
  // NB : baseEditorAdoptVisit avance déjà la quête 217 (base_visit).
  try { if (typeof scrollToWin === 'function') scrollToWin('win-base'); } catch (_) {}
  if (typeof baseWindowInvalidate === 'function') baseWindowInvalidate();
}

// Rétro-compatibilité : « Examiner l'alcôve » = visiter la première alcôve.
function baseWindowSelectRouteLayout(locId) { baseWindowVisitAlcove(locId, null); }

// « S'installer ici » : confirmation OBLIGATOIRE dès qu'une base existe déjà
// (peu importe la route/l'alcôve — déménager démonte tous les meubles, à ne
// jamais faire par erreur). Seule la toute première installation est directe.
// Panneau de confirmation UNIFIÉ (#confirm-modal via pwConfirm) — plus de
// window.confirm du navigateur.
function baseWindowConfirmEstablish(locId, layoutId) {
  const st = baseWindowState();
  if (!st) return;
  const alcoves = baseWindowGetRouteAlcoves(locId);
  if (!alcoves.length) return;
  const target = (layoutId && alcoves.includes(layoutId)) ? layoutId : alcoves[0];
  const en = (typeof G !== 'undefined' && G && G.lang === 'en');
  // Une base existe dès qu'un gabarit est posé (st.routeId peut manquer sur
  // les anciennes sauvegardes : il ne doit PAS court-circuiter la confirmation).
  const hasBase = !!st.layoutId;
  if (hasBase) {
    // Déjà installé exactement ici → rien à faire.
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
    // Repli extrême (pwConfirm indisponible) : refus par défaut sans confirm natif.
    if (typeof confirm !== 'function' || !confirm(msg)) return;
  }
  baseWindowEstablishRouteLayout(locId, target);
}

function baseWindowEstablishRouteLayout(locId, layoutId) {
  const st = baseWindowState();
  if (!st) return;
  const alcoves = baseWindowGetRouteAlcoves(locId);
  const target = (layoutId && (typeof baseLayoutGet !== 'function' || baseLayoutGet(layoutId))) ? layoutId : (alcoves[0] || 'cave_1');
  // Fin de la visite d'alcôve éventuellement en cours (on s'installe !).
  if (typeof baseEditorGet === 'function') {
    const ed = baseEditorGet();
    if (ed.mode === 'visit') { baseWindowVisitTicker(false); if (typeof baseEditorStopVisit === 'function') baseEditorStopVisit(); }
  }
  baseWindowSetLayout(target);
  // Robustesse : si la fenêtre n'était pas initialisable (DOM absent),
  // baseWindowSetLayout n'a rien fait — on déménage directement l'état.
  if (st.layoutId !== target && typeof baseRelocate === 'function') baseRelocate(st, target);
  st.routeId = locId || null;
  if (typeof notify === 'function') notify((typeof G !== 'undefined' && G && G.lang === 'en') ? 'Your Secret Base is now established on this route!' : 'Votre Base Secrète est désormais établie sur cette route !', 'var(--green)');
  // Quête découverte (218) : prendre possession d'une base secrète.
  try { if (typeof advanceQuests === 'function') advanceQuests('base_establish', locId || null, 1); } catch (_) {}
  try { if (typeof renderStoryWindow === 'function') renderStoryWindow(); } catch (_) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (_) {}
  try { if (typeof refreshMapAndLoc === 'function') refreshMapAndLoc(); } catch (_) {}
}

window.baseWindowGetRouteAlcoves = baseWindowGetRouteAlcoves;
window.baseWindowRouteOfCurrentBase = baseWindowRouteOfCurrentBase;
window.baseWindowVisitAlcove = baseWindowVisitAlcove;
window.baseWindowSelectRouteLayout = baseWindowSelectRouteLayout;
window.baseWindowConfirmEstablish = baseWindowConfirmEstablish;
window.baseWindowEstablishRouteLayout = baseWindowEstablishRouteLayout;

window.baseWindowInit = baseWindowInit;
window.baseWindowRender = baseWindowRender;
window.baseWindowSetMode = baseWindowSetMode;
window.baseWindowSetLayout = baseWindowSetLayout;
window.baseWindowInvalidate = baseWindowInvalidate;
window.baseWindowSelectSlug = baseWindowSelectSlug;
window.baseWindowSelectNpc = baseWindowSelectNpc;
window.baseWindowSelectTab = baseWindowSelectTab;
window.baseWindowRotateSel = baseWindowRotateSel;
window.baseWindowPickupSel = baseWindowPickupSel;
window.baseWindowVisitToggle = baseWindowVisitToggle;
window.baseWindowExport = baseWindowExport;
window.baseWindowImport = baseWindowImport;
window.baseWindowOverlay = baseWindowOverlay;
window.baseWindowVisitTicker = baseWindowVisitTicker;
window.baseWindowSelectNpcNew = baseWindowSelectNpcNew;
window.baseWindowEditSelectedNpc = baseWindowEditSelectedNpc;
window.baseWindowIsFileUrl = baseWindowIsFileUrl;

