// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
function rand(min,max){ const c = (typeof window !== 'undefined' && window.PokeWorldCore) || (typeof globalThis !== 'undefined' && globalThis.PokeWorldCore); return c && c.randomInt ? c.randomInt(min,max) : Math.floor(Math.random() * (max - min + 1)) + min; }
function chance(pct){ const c = (typeof window !== 'undefined' && window.PokeWorldCore) || (typeof globalThis !== 'undefined' && globalThis.PokeWorldCore); return c && c.chancePercent ? c.chancePercent(pct) : Math.random() * 100 < pct; }
function clamp(v,lo,hi){ const c = (typeof window !== 'undefined' && window.PokeWorldCore) || (typeof globalThis !== 'undefined' && globalThis.PokeWorldCore); return c && c.clamp ? c.clamp(v,lo,hi) : Math.max(lo, Math.min(hi, v)); }
// Wave 19 (ECS DS): the toast is pure design-system now — flat surface,
// theme-token text, and a coloured kind bar on the left (same colour
// language as the buttons: crimson danger / positive green / accent info).
// The historical `color` argument is mapped to a kind, nothing else
// changes: same #notif node, same display contract, same 2.5s lifetime.
function pwToastKind(color){
 const c = String(color == null ? '' : color);
 if (/--red|#d3425f|#c0392b|#e74c3c|#e55575|#ff4500/i.test(c)) return 'danger';
 if (/--accent|#ffa500|#f5a623/i.test(c)) return 'info';
 if (/--light|#ecdeb7|#c8bba0|#f5efeb/i.test(c)) return 'neutral';
 if (/--green|#2ecc71|#60be58|#27ae60/i.test(c)) return 'success';
 return c ? 'neutral' : 'success';
}
function notify(msg, color='var(--green)'){
 const el=document.getElementById('notif');
 if(!el) return;
 el.textContent=msg;
 el.className='pw-toast pw-toast--' + pwToastKind(color);
 void el.offsetWidth; // restart the entrance animation on repeated pings
 el.classList.add('is-visible');
 el.style.display='block';
 clearTimeout(el._t); el._t=setTimeout(()=>{ el.style.display='none'; el.classList.remove('is-visible'); },2500);
}
function setMsg(msg){
 
 
 notify(msg);
}
function addBattleLog(msg){
 if(!battle.log) battle.log=[];
 battle.log.push(msg);
 if(battle.log.length>60) battle.log.shift();
 const modal=document.getElementById('battle-summary-modal');
 if(modal&&modal.classList.contains('open')) renderBattleSummary();
}
function clearBattleLog(){ battle.log=[]; }


function typeClass(type){return 'type-' + String(type || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');}
function typeSpan(type){
 // Phase 24: localized label ('Fire' → 'Feu'), the CSS class stays on the English id.
 const label = (typeof getTypeName === 'function') ? getTypeName(type) : type;
 return `<span class="type-badge ${typeClass(type)}">${label}</span>`;
}
function hpColor(pct){
 if(pct>0.5) return 'var(--green)';
 if(pct>0.25) return 'var(--light2)';
 return 'var(--red)';
}


// --- Migrated to ES module, globals exposed ---
if (typeof rand !== 'undefined') { if (typeof window !== 'undefined') window.rand = rand; if (typeof globalThis !== 'undefined') globalThis.rand = rand; }
if (typeof chance !== 'undefined') { if (typeof window !== 'undefined') window.chance = chance; if (typeof globalThis !== 'undefined') globalThis.chance = chance; }
if (typeof clamp !== 'undefined') { if (typeof window !== 'undefined') window.clamp = clamp; if (typeof globalThis !== 'undefined') globalThis.clamp = clamp; }
if (typeof notify !== 'undefined') { if (typeof window !== 'undefined') window.notify = notify; if (typeof globalThis !== 'undefined') globalThis.notify = notify; }
if (typeof pwToastKind !== 'undefined') { if (typeof window !== 'undefined') window.pwToastKind = pwToastKind; if (typeof globalThis !== 'undefined') globalThis.pwToastKind = pwToastKind; }
if (typeof setMsg !== 'undefined') { if (typeof window !== 'undefined') window.setMsg = setMsg; if (typeof globalThis !== 'undefined') globalThis.setMsg = setMsg; }
if (typeof addBattleLog !== 'undefined') { if (typeof window !== 'undefined') window.addBattleLog = addBattleLog; if (typeof globalThis !== 'undefined') globalThis.addBattleLog = addBattleLog; }
if (typeof clearBattleLog !== 'undefined') { if (typeof window !== 'undefined') window.clearBattleLog = clearBattleLog; if (typeof globalThis !== 'undefined') globalThis.clearBattleLog = clearBattleLog; }
if (typeof typeClass !== 'undefined') { if (typeof window !== 'undefined') window.typeClass = typeClass; if (typeof globalThis !== 'undefined') globalThis.typeClass = typeClass; }
if (typeof typeSpan !== 'undefined') { if (typeof window !== 'undefined') window.typeSpan = typeSpan; if (typeof globalThis !== 'undefined') globalThis.typeSpan = typeSpan; }
if (typeof hpColor !== 'undefined') { if (typeof window !== 'undefined') window.hpColor = hpColor; if (typeof globalThis !== 'undefined') globalThis.hpColor = hpColor; }


// Phase 15 — legacy feature update
// when has panel/has liste is regenere (innerHTML), the navigateur ramene
// the scroll to the top — very annoying when chaining several actions
// (hatchery, training, sac, selector…). these helpers capturent the position
// before re-render and the restaurent after.
function pwSaveScroll(el) {
  return el ? (el.scrollTop || 0) : null;
}
function pwRestoreScroll(el, pos) {
  if (!el || pos === null || pos === undefined) return;
  try { el.scrollTop = pos; } catch (_) {}
}
// Variantes by selector : for the conteneurs RECREES by the re-render
// (ex. .management-content regenere has each ouverture of menu of management).
function pwSaveScrollOf(root, selector) {
  const el = root && root.querySelector ? root.querySelector(selector) : null;
  return pwSaveScroll(el);
}
function pwRestoreScrollOf(root, selector, pos) {
  if (pos === null || pos === undefined) return;
  const el = root && root.querySelector ? root.querySelector(selector) : null;
  pwRestoreScroll(el, pos);
}
if (typeof pwSaveScroll !== 'undefined') { if (typeof window !== 'undefined') window.pwSaveScroll = pwSaveScroll; if (typeof globalThis !== 'undefined') globalThis.pwSaveScroll = pwSaveScroll; }
if (typeof pwRestoreScroll !== 'undefined') { if (typeof window !== 'undefined') window.pwRestoreScroll = pwRestoreScroll; if (typeof globalThis !== 'undefined') globalThis.pwRestoreScroll = pwRestoreScroll; }
if (typeof pwSaveScrollOf !== 'undefined') { if (typeof window !== 'undefined') window.pwSaveScrollOf = pwSaveScrollOf; if (typeof globalThis !== 'undefined') globalThis.pwSaveScrollOf = pwSaveScrollOf; }
if (typeof pwRestoreScrollOf !== 'undefined') { if (typeof window !== 'undefined') window.pwRestoreScrollOf = pwRestoreScrollOf; if (typeof globalThis !== 'undefined') globalThis.pwRestoreScrollOf = pwRestoreScrollOf; }

// Phase 16 — legacy feature update
// Phase 15 — legacy feature update
// the browser (scroll anchoring / deferred layout) may STILL bring it back
// to the top afterwards, and the jumping scroll is sometimes the PAGE's one
// (dashboard windows in overflow:visible), not the panel's.
 // DOM safe rendering and scroll preservation helpers
// .scrollingElement) ; 2) double re-verification in requestAnimationFrame
// (after the micro-tasks/observers); 3) an "epoch" per element, so that
// an intentional reset to zero (tab change, sort, search) is never
// overwritten by a deferred restoration.
function pwScrollEpoch(el, bump) {
  if (!el) return 0;
  if (bump) el._pwScrollEpoch = (el._pwScrollEpoch || 0) + 1;
  return el._pwScrollEpoch || 0;
}
// Deliberate scroll-to-top reset of an element (new tab, new
// search…): cancels every deferred scroll restoration scheduled before.
function pwResetScrollNow(el) {
  if (!el) return;
  pwScrollEpoch(el, true);
  try { el.scrollTop = 0; el.scrollLeft = 0; } catch (_) {}
}
// Writes el.innerHTML = html while preserving the scroll of the PAGE and of
// the element, synchronously, then double-checks over two frames (the browser
// applies its scroll anchoring during layout, after our code).
function pwSetHtml(el, html) {
  if (!el) return;
  let se = null;
  try { se = (typeof document !== 'undefined') ? (document.scrollingElement || document.documentElement) : null; } catch (_) {}
  const docTop = se ? (se.scrollTop || 0) : 0;
  const docLeft = se ? (se.scrollLeft || 0) : 0;
  let ownTop = 0, ownLeft = 0;
  try { ownTop = el.scrollTop || 0; ownLeft = el.scrollLeft || 0; } catch (_) {}
  const epoch = pwScrollEpoch(el, false);
  el.innerHTML = html;
  const restore = function () {
    try {
      if (se && se.isConnected !== false) {
        if (se.scrollTop !== docTop) se.scrollTop = docTop;
        if (se.scrollLeft !== docLeft) se.scrollLeft = docLeft;
      }
      if (el.isConnected && pwScrollEpoch(el, false) === epoch) {
        if (el.scrollTop !== ownTop) el.scrollTop = ownTop;
        if (el.scrollLeft !== ownLeft) el.scrollLeft = ownLeft;
      }
    } catch (_) {}
  };
  restore();
  if (typeof requestAnimationFrame === 'function') {
    try { requestAnimationFrame(function () { requestAnimationFrame(restore); }); } catch (_) {}
  }
}
// Captures the scroll of a target's ANCESTORS (click) + of the page: used
// by the event dispatchers to cancel any "jump" caused by the action that
// follows, whichever panel is concerned (safety net).
function pwSnapshotScrollAround(target) {
  const entries = [];
  try {
    const se = (typeof document !== 'undefined') ? (document.scrollingElement || document.documentElement) : null;
    const seen = (typeof Set !== 'undefined') ? new Set() : null;
    const push = function (node) {
      if (!node || (seen && seen.has(node))) return;
      if (seen) seen.add(node);
      let top = 0, left = 0;
      try { top = node.scrollTop || 0; left = node.scrollLeft || 0; } catch (_) {}
      if (top || left) entries.push({ node: node, top: top, left: left, epoch: pwScrollEpoch(node, false) });
    };
    let cur = target;
    while (cur) { push(cur); cur = cur.parentElement || null; }
    push(se);
  } catch (_) {}
  return entries;
}
function pwRestoreScrollAround(entries) {
  if (!entries || !entries.length) return;
  const restore = function () {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      try {
        if (!e.node || e.node.isConnected === false) continue;
        if (pwScrollEpoch(e.node, false) !== e.epoch) continue; // remise a zero volontaire between-temps
        if (e.node.scrollTop !== e.top) e.node.scrollTop = e.top;
        if (e.node.scrollLeft !== e.left) e.node.scrollLeft = e.left;
      } catch (_) {}
    }
  };
  restore();
  if (typeof requestAnimationFrame === 'function') {
    try { requestAnimationFrame(function () { requestAnimationFrame(restore); }); } catch (_) {}
  }
}
if (typeof pwScrollEpoch !== 'undefined') { if (typeof window !== 'undefined') window.pwScrollEpoch = pwScrollEpoch; if (typeof globalThis !== 'undefined') globalThis.pwScrollEpoch = pwScrollEpoch; }
if (typeof pwResetScrollNow !== 'undefined') { if (typeof window !== 'undefined') window.pwResetScrollNow = pwResetScrollNow; if (typeof globalThis !== 'undefined') globalThis.pwResetScrollNow = pwResetScrollNow; }
if (typeof pwSetHtml !== 'undefined') { if (typeof window !== 'undefined') window.pwSetHtml = pwSetHtml; if (typeof globalThis !== 'undefined') globalThis.pwSetHtml = pwSetHtml; }
if (typeof pwSnapshotScrollAround !== 'undefined') { if (typeof window !== 'undefined') window.pwSnapshotScrollAround = pwSnapshotScrollAround; if (typeof globalThis !== 'undefined') globalThis.pwSnapshotScrollAround = pwSnapshotScrollAround; }
if (typeof pwRestoreScrollAround !== 'undefined') { if (typeof window !== 'undefined') window.pwRestoreScrollAround = pwRestoreScrollAround; if (typeof globalThis !== 'undefined') globalThis.pwRestoreScrollAround = pwRestoreScrollAround; }


// ─── UNIFIED confirmation panel (#confirm-modal, index.html) ──────────────
// Replaces window.confirm: same design language as the other modals
// (settings, quests…). pwConfirm(message, onConfirm[, opts]) — opts.title (optional),
// opts.confirmLabel / opts.cancelLabel, opts.danger (red button),
// opts.onCancel. Fallback: if the modal does not exist in the DOM (headless
// tests), do NOT trigger the action at all: the design-system modal is the
// only confirmation path (never a native confirm() dialog).
let _pwConfirmCb = null;
function pwConfirm(message, onConfirm, opts) {
  opts = opts || {};
  const modal = (typeof document !== 'undefined') ? document.getElementById('confirm-modal') : null;
  const textEl = modal ? document.getElementById('confirm-text') : null;
  const yesBtn = modal ? document.getElementById('confirm-yes') : null;
  if (!modal || !textEl || !yesBtn) {
    try { if (typeof console !== 'undefined') console.warn('[pwConfirm] design-system shell missing — action not triggered.'); } catch (_) {}
    if (typeof opts.onCancel === 'function') try { opts.onCancel(); } catch (_) {}
    return false;
  }
  const titleHtml = opts.title ? '<div class="pw-confirm-title">' + String(opts.title) + '</div>' : '';
   // DOM safe rendering and scroll preservation helpers
  const esc = String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  textEl.innerHTML = titleHtml + '<div class="pw-confirm-msg">' + esc + '</div>';
  yesBtn.textContent = opts.confirmLabel || ((typeof t === 'function') ? t('confirm_btn') : 'Confirmer');
  yesBtn.classList.toggle('pw-confirm-danger', !!opts.danger);
  // Wave 23: the button coloring is NO LONGER painted inline — benign =
  // accent / danger = red live in the stylesheet (#confirm-yes rules).
  const cancelBtn = modal.querySelector('[data-action="close-confirm"]');
  if (cancelBtn) cancelBtn.textContent = opts.cancelLabel || ((typeof t === 'function') ? t('cancel_btn') : 'Annuler');
  _pwConfirmCb = { ok: onConfirm || null, cancel: opts.onCancel || null };
  yesBtn.onclick = function () {
    const cb = _pwConfirmCb && _pwConfirmCb.ok;
    _pwConfirmCb = null;
    modal.classList.remove('open');
    if (typeof cb === 'function') { try { cb(); } catch (e) { try { console.error(e); } catch (_) {} } }
  };
  modal.classList.add('open');
}
function closeConfirm() {
  const modal = (typeof document !== 'undefined') ? document.getElementById('confirm-modal') : null;
  const cb = _pwConfirmCb && _pwConfirmCb.cancel;
  _pwConfirmCb = null;
  if (modal) modal.classList.remove('open');
  if (typeof cb === 'function') { try { cb(); } catch (_) {} }
}
if (typeof pwConfirm !== 'undefined') { if (typeof window !== 'undefined') window.pwConfirm = pwConfirm; if (typeof globalThis !== 'undefined') globalThis.pwConfirm = pwConfirm; }
if (typeof closeConfirm !== 'undefined') { if (typeof window !== 'undefined') window.closeConfirm = closeConfirm; if (typeof globalThis !== 'undefined') globalThis.closeConfirm = closeConfirm; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  rand,
  chance,
  clamp,
  notify,
  pwToastKind,
  setMsg,
  addBattleLog,
  clearBattleLog,
  typeClass,
  typeSpan,
  hpColor,
  pwSaveScroll,
  pwRestoreScroll,
  pwSaveScrollOf,
  pwRestoreScrollOf,
  pwScrollEpoch,
  pwResetScrollNow,
  pwSetHtml,
  pwSnapshotScrollAround,
  pwRestoreScrollAround,
  pwConfirm,
  closeConfirm,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
// Measured lesson: this module lives in the architecture-core chunk, evaluated
// BEFORE the engine chunk (action-registry) — if the registry does not exist yet,
// registration is re-armed in a microtask (end of graph evaluation).
const __pwV42RegisterCloseConfirm = () => { if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('closeConfirm', closeConfirm); } catch (_) {} } };
__pwV42RegisterCloseConfirm();
if ((typeof PokeActions === 'undefined' || !PokeActions || (typeof PokeActions.has === 'function' && !PokeActions.has('closeConfirm')))
  && typeof queueMicrotask === 'function') {
  queueMicrotask(__pwV42RegisterCloseConfirm);
}

