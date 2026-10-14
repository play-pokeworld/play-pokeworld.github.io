// PokéWorld — DND-01 · Drag & drop des fenêtres (prototype validé porté en code)
// ----------------------------------------------------------------------------
// 7 points de la roadmap DND-01, tous implémentés ici :
//   1. marque-place conservant la hauteur (placeholder),
//   2. auto-défilement 60 px / 8 px par frame près des bords,
//   3. cache des rectangles limité à UNE lecture par frame (requestAnimationFrame),
//   4. colonne la plus proche (distance horizontale aux centres),
//   5. Pointer Events (souris + stylet ; le tactile reste géré par le dispatcher),
//   6. seuil de 5 px (un clic sans déplacement ne déclenche pas le drag),
//   7. Échap = annulation + remise en place exacte.
// La cible et l'index d'insertion sont calculés au moment du DROP (comme le
// prototype validé) : on ne « pousse » jamais la fenêtre en fin de colonne.

// Shared safe-HTML service (canonical sink).
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

const DND_CSS = `
.pw-win-dragging{position:fixed !important;z-index:10000;margin:0 !important;opacity:.93;box-shadow:0 12px 34px rgba(0,0,0,.6);pointer-events:none;cursor:grabbing;}
.pw-win-placeholder{border:1px dashed var(--accent,#FFA500);border-radius:var(--pw-radius-md,10px);background:var(--pw-accent-soft,rgba(255,165,0,.10));flex:none;}
.pw-drop-indicator{height:3px;border-radius:2px;background:var(--accent,#FFA500);box-shadow:0 0 8px var(--accent,#FFA500);flex:none;}
`;

let _styleInjected = false;
function _ensureStyle() {
  if (_styleInjected || typeof document === 'undefined') return;
  const st = document.createElement('style');
  st.id = 'pw-dnd01-css';
  st.textContent = DND_CSS;
  document.head.appendChild(st);
  _styleInjected = true;
}

// ── état du drag ─────────────────────────────────────────────────────────────
let drag = null;     // { winId, el, originCol, originIndex, placeholder, indicator, raf, clientX, clientY }
let pending = null;  // { winId, el, startX, startY } — avant le seuil de 5 px

const THRESHOLD_PX = 5;
const EDGE_PX = 60;
const SCROLL_STEP = 8;

// ── helpers ─────────────────────────────────────────────────────────────────
function _cols() {
  return (typeof getDashboardCols === 'function') ? getDashboardCols() : (window.dashboardCols || {});
}
function _colEl(c) { return document.getElementById('col-' + c); }
function _scroller() { return document.getElementById('main-dashboard') || document.body; }

// Fenêtres VISIBLES d'une colonne (une fenêtre masquée = rect nul → jamais une
// cible valide, wave 18). La fenêtre traînée est exclue.
function _visibleWinEls(ids, excludeId) {
  const out = [];
  for (const id of (ids || [])) {
    if (id === excludeId) continue;
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.width <= 0) continue;
    out.push({ id, el, r });
  }
  return out;
}

// ── entrée (pointerdown, via le dispatcher) ─────────────────────────────────
function startWinDrag(e, winId) {
  if (!e || !winId) return;
  // Les boutons dans l'en-tête ne doivent jamais déclencher le drag.
  if (e.target && e.target.closest && e.target.closest('button')) return;
  // Souris : bouton principal uniquement.
  if (e.pointerType === 'mouse' && e.button !== undefined && e.button !== 0) return;
  const win = document.getElementById(winId);
  if (!win) return;
  pending = { winId, el: win, startX: e.clientX, startY: e.clientY };
  e.preventDefault();
}

// ── passage du seuil (5 px) → début effectif du glissement ─────────────────
function _beginDrag(p, e) {
  pending = null;
  _ensureStyle();
  const win = p.el;
  const rect = win.getBoundingClientRect();
  const cols = _cols();
  let originCol = null, originIndex = -1;
  for (let c = 1; c <= 3; c++) {
    const i = (cols[c] || []).indexOf(p.winId);
    if (i !== -1) { originCol = c; originIndex = i; break; }
  }
  if (originCol == null) return;

  // Déplie temporairement les colonnes masquées pour qu'elles soient ciblables.
  for (let c = 1; c <= 3; c++) {
    const colEl = _colEl(c);
    if (colEl && getComputedStyle(colEl).display === 'none') {
      colEl.style.display = 'flex';
      colEl.classList.add('temp-uncollapsed');
    }
  }

  // Marque-place conservant la hauteur, inséré à la position d'origine.
  const ph = document.createElement('div');
  ph.className = 'pw-win-placeholder';
  ph.style.height = rect.height + 'px';
  const originColEl = _colEl(originCol);
  originColEl.insertBefore(ph, win);

  // La fenêtre passe en position:fixed et suit le curseur (détachée du flux).
  win.classList.add('pw-win-dragging');
  win.style.width = rect.width + 'px';
  win.style.height = rect.height + 'px';
  win.style.left = (e.clientX - rect.width / 2) + 'px';
  win.style.top = (e.clientY - 24) + 'px';
  document.body.appendChild(win);

  const indicator = document.createElement('div');
  indicator.className = 'pw-drop-indicator';

  drag = { winId: p.winId, el: win, originCol, originIndex, placeholder: ph, indicator, raf: 0, clientX: e.clientX, clientY: e.clientY };
}

// ── ciblage (colonne la plus proche + point d'insertion au Y) ───────────────
function _targetColumn(clientX) {
  let best = null, bestD = Infinity;
  for (let c = 1; c <= 3; c++) {
    const colEl = _colEl(c);
    if (!colEl) continue;
    const r = colEl.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const d = Math.abs(clientX - (r.left + r.width / 2));
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function _insertIndexInCol(colNum, clientY) {
  const others = (_cols()[colNum] || []).filter((id) => id !== drag.winId);
  const vis = _visibleWinEls(others, drag.winId);
  let vi = vis.length;
  for (let i = 0; i < vis.length; i++) {
    if (clientY < vis[i].r.top + vis[i].r.height / 2) { vi = i; break; }
  }
  let insIdx = others.length;
  if (vi < vis.length) {
    insIdx = others.indexOf(vis[vi].id);
    if (insIdx < 0) insIdx = others.length;
  }
  return { others, insIdx };
}

// ── passe par frame (cache des rects + position + indicateur + auto-scroll) ─
function _dragFrame() {
  if (!drag) return;
  drag.raf = 0;
  const win = drag.el;
  win.style.left = (drag.clientX - win.offsetWidth / 2) + 'px';
  win.style.top = (drag.clientY - 24) + 'px';

  const col = _targetColumn(drag.clientX);
  for (let c = 1; c <= 3; c++) {
    const colEl = _colEl(c);
    if (colEl) colEl.classList.toggle('col-hovered', col === c);
  }

  if (col != null) {
    const colEl = _colEl(col);
    const others = (_cols()[col] || []).filter((id) => id !== drag.winId);
    const vis = _visibleWinEls(others, drag.winId);
    let before = null;
    // Premier visible dont le milieu est sous le curseur, sinon append en fin.
    for (let i = 0; i < vis.length; i++) {
      if (drag.clientY < vis[i].r.top + vis[i].r.height / 2) { before = vis[i].el; break; }
    }
    if (before == null) colEl.appendChild(drag.indicator);
    else if (drag.indicator.parentElement !== colEl) colEl.insertBefore(drag.indicator, before);
    else if (drag.indicator.nextSibling !== before) colEl.insertBefore(drag.indicator, before);
  }

  // Auto-défilement (zone de 60 px, 8 px par frame).
  const sc = _scroller();
  const r = sc.getBoundingClientRect();
  if (drag.clientY < r.top + EDGE_PX) sc.scrollTop -= SCROLL_STEP;
  else if (drag.clientY > r.bottom - EDGE_PX) sc.scrollTop += SCROLL_STEP;
}

function _onPointerMove(e) {
  if (pending) {
    if (Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) > THRESHOLD_PX) {
      _beginDrag(pending, e);
    }
    return;
  }
  if (!drag) return;
  drag.clientX = e.clientX;
  drag.clientY = e.clientY;
  if (!drag.raf) drag.raf = requestAnimationFrame(_dragFrame);
}

// ── dépôt ───────────────────────────────────────────────────────────────────
function _dropDrag() {
  if (!drag) return;
  const { winId, el, originCol, originIndex, placeholder, indicator } = drag;
  if (drag.raf) { cancelAnimationFrame(drag.raf); drag.raf = 0; }

  // La colonne cible est la PLUS PROCHE du curseur au moment du drop
  // (l'indicateur est purement visuel et peut ne pas avoir été placé
  // si le pointerup arrive avant la passe de frame suivante).
  const nearest = _targetColumn(drag.clientX);
  const targetCol = (nearest != null) ? nearest : originCol;

  // restaure la fenêtre + nettoie le décor
  if (indicator.parentElement) indicator.remove();
  if (placeholder.parentElement) placeholder.remove();
  el.classList.remove('pw-win-dragging');
  el.style.left = el.style.top = el.style.width = el.style.height = '';
  for (let c = 1; c <= 3; c++) {
    const colEl = _colEl(c);
    if (colEl) {
      colEl.classList.remove('col-hovered');
      if (colEl.classList.contains('temp-uncollapsed')) colEl.classList.remove('temp-uncollapsed');
    }
  }

  // Recalcule l'index d'insertion à partir de l'état + curseur (jamais « push »).
  const cols = _cols();
  const { insIdx } = _insertIndexInCol(targetCol, drag.clientY);
  for (let c = 1; c <= 3; c++) cols[c] = (cols[c] || []).filter((id) => id !== winId);
  const backHome = (targetCol === originCol && insIdx === originIndex);
  if (!backHome) {
    if (!cols[targetCol]) cols[targetCol] = [];
    cols[targetCol].splice(insIdx, 0, winId);
  }

  drag = null;

  try { safeStorage.set('pokeworld_cols_v13', JSON.stringify(cols)); } catch (_e) {}
  if (typeof setDashboardCols === 'function') setDashboardCols(cols, { persist: false });
  else if (typeof renderDashboardColumns === 'function') renderDashboardColumns();
}

// ── annulation (Échap) ──────────────────────────────────────────────────────
function _cancelDrag() {
  if (!drag) return;
  const { el, placeholder, indicator } = drag;
  if (drag.raf) { cancelAnimationFrame(drag.raf); drag.raf = 0; }
  if (indicator.parentElement) indicator.remove();
  el.classList.remove('pw-win-dragging');
  el.style.left = el.style.top = el.style.width = el.style.height = '';
  // Remise en place exacte : la fenêtre reprend la place de son marque-place
  // (qui n'a jamais bougé, car le rendu n'est pas relancé pendant le drag).
  if (placeholder.parentElement) placeholder.parentElement.insertBefore(el, placeholder);
  if (placeholder.parentElement) placeholder.remove();
  for (let c = 1; c <= 3; c++) {
    const colEl = _colEl(c);
    if (colEl) {
      colEl.classList.remove('col-hovered');
      if (colEl.classList.contains('temp-uncollapsed')) colEl.classList.remove('temp-uncollapsed');
    }
  }
  drag = null;
}

// ── écouteurs globaux (Pointer Events) ──────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', _onPointerMove);
  window.addEventListener('pointerup', () => {
    if (drag) _dropDrag();
    else pending = null; // simple clic sans déplacement → rien
  });
  window.addEventListener('pointercancel', () => {
    if (drag) _cancelDrag();
    pending = null;
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drag) _cancelDrag();
  });
}

// --- Migrated to ES module, globals exposed ---
if (typeof startWinDrag !== 'undefined') { if (typeof window !== 'undefined') window.startWinDrag = startWinDrag; if (typeof globalThis !== 'undefined') globalThis.startWinDrag = startWinDrag; }

// Wave 41 — native ESM module: exports the same names as the classic surface.
export { startWinDrag };

// Wave 42 — engine-registry absorption.
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('startWinDrag', startWinDrag); } catch (_) {} }

