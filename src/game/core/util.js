function rand(min,max){return window.PokeWorldCore.randomInt(min,max);}
function chance(pct){return window.PokeWorldCore.chancePercent(pct);}
function clamp(v,lo,hi){return window.PokeWorldCore.clamp(v,lo,hi);}
function notify(msg, color='var(--green)'){
 const el=document.getElementById('notif');
 el.textContent=msg; el.style.background=color; el.style.display='block';
 clearTimeout(el._t); el._t=setTimeout(()=>el.style.display='none',2500);
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
 // Passe 24 : libellé localisé ('Fire' → 'Feu'), la classe CSS reste sur l'id anglais.
 const label = (typeof getTypeName === 'function') ? getTypeName(type) : type;
 return `<span class="type-badge ${typeClass(type)}">${label}</span>`;
}
function hpColor(pct){
 if(pct>0.5) return 'var(--green)';
 if(pct>0.25) return 'var(--light2)';
 return 'var(--red)';
}


// --- Migrated to ES module, globals exposed ---
if (typeof rand !== 'undefined' && typeof window !== 'undefined') window.rand = rand;
if (typeof chance !== 'undefined' && typeof window !== 'undefined') window.chance = chance;
if (typeof clamp !== 'undefined' && typeof window !== 'undefined') window.clamp = clamp;
if (typeof notify !== 'undefined' && typeof window !== 'undefined') window.notify = notify;
if (typeof setMsg !== 'undefined' && typeof window !== 'undefined') window.setMsg = setMsg;
if (typeof addBattleLog !== 'undefined' && typeof window !== 'undefined') window.addBattleLog = addBattleLog;
if (typeof clearBattleLog !== 'undefined' && typeof window !== 'undefined') window.clearBattleLog = clearBattleLog;
if (typeof typeClass !== 'undefined' && typeof window !== 'undefined') window.typeClass = typeClass;
if (typeof typeSpan !== 'undefined' && typeof window !== 'undefined') window.typeSpan = typeSpan;
if (typeof hpColor !== 'undefined' && typeof window !== 'undefined') window.hpColor = hpColor;


// ── Passe 15 : anti « retour en haut » des panneaux ────────────────────────
// Quand un panneau/une liste est regénéré (innerHTML), le navigateur ramène
// le scroll en haut — très désagréable pour enchaîner plusieurs actions
// (pension, entraînement, sac, sélecteur…). Ces helpers capturent la position
// avant re-render et la restaurent après.
function pwSaveScroll(el) {
  return el ? (el.scrollTop || 0) : null;
}
function pwRestoreScroll(el, pos) {
  if (!el || pos === null || pos === undefined) return;
  try { el.scrollTop = pos; } catch (_) {}
}
// Variantes par sélecteur : pour les conteneurs RECRÉÉS par le re-render
// (ex. .management-content régénéré à chaque ouverture de menu de gestion).
function pwSaveScrollOf(root, selector) {
  const el = root && root.querySelector ? root.querySelector(selector) : null;
  return pwSaveScroll(el);
}
function pwRestoreScrollOf(root, selector, pos) {
  if (pos === null || pos === undefined) return;
  const el = root && root.querySelector ? root.querySelector(selector) : null;
  pwRestoreScroll(el, pos);
}
if (typeof pwSaveScroll !== 'undefined' && typeof window !== 'undefined') window.pwSaveScroll = pwSaveScroll;
if (typeof pwRestoreScroll !== 'undefined' && typeof window !== 'undefined') window.pwRestoreScroll = pwRestoreScroll;
if (typeof pwSaveScrollOf !== 'undefined' && typeof window !== 'undefined') window.pwSaveScrollOf = pwSaveScrollOf;
if (typeof pwRestoreScrollOf !== 'undefined' && typeof window !== 'undefined') window.pwRestoreScrollOf = pwRestoreScrollOf;

// ── Passe 16 : anti « retour en haut » renforcé ────────────────────────────
// La passe 15 restaurait le scroll SYNCHRONE juste après innerHTML, mais le
// navigateur (ancrage de scroll / mise en page différée) peut ENCORE ramener
// en haut après coup, et le scroll qui saute est parfois celui de la PAGE
// (fenêtres du tableau de bord en overflow:visible), pas celui du panneau.
// Cette couche ajoute : 1) conservation du scroll de la page (document
// .scrollingElement) ; 2) double re-vérification en requestAnimationFrame
// (après les micro-tâches/observateurs) ; 3) un « epoch » par élément pour
// qu'une remise à zéro volontaire (changement d'onglet, tri, recherche) ne
// soit jamais écrasée par une restauration différée.
function pwScrollEpoch(el, bump) {
  if (!el) return 0;
  if (bump) el._pwScrollEpoch = (el._pwScrollEpoch || 0) + 1;
  return el._pwScrollEpoch || 0;
}
// Remise à zéro volontaire du scroll d'un élément (nouvel onglet, nouvelle
// recherche…) : invalide toute restauration différée planifiée avant.
function pwResetScrollNow(el) {
  if (!el) return;
  pwScrollEpoch(el, true);
  try { el.scrollTop = 0; el.scrollLeft = 0; } catch (_) {}
}
// Écrit el.innerHTML = html en conservant le scroll de la PAGE ET de
// l'élément, synchrone puis re-vérifié sur deux frames (le navigateur
// applique son ancrage de scroll pendant la mise en page, APRÈS notre code).
function pwSetHtml(el, html) {
  if (!el) return;
  var se = null;
  try { se = (typeof document !== 'undefined') ? (document.scrollingElement || document.documentElement) : null; } catch (_) {}
  var docTop = se ? (se.scrollTop || 0) : 0;
  var docLeft = se ? (se.scrollLeft || 0) : 0;
  var ownTop = 0, ownLeft = 0;
  try { ownTop = el.scrollTop || 0; ownLeft = el.scrollLeft || 0; } catch (_) {}
  var epoch = pwScrollEpoch(el, false);
  el.innerHTML = html;
  var restore = function () {
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
// Capture le scroll des ANCÊTRES d'une cible (clic) + de la page : utilisé
// par les répartiteurs d'événements pour annuler tout « saut » provoqué par
// l'action qui suit, quel que soit le panneau concerné (filet de sécurité).
function pwSnapshotScrollAround(target) {
  var entries = [];
  try {
    var se = (typeof document !== 'undefined') ? (document.scrollingElement || document.documentElement) : null;
    var seen = (typeof Set !== 'undefined') ? new Set() : null;
    var push = function (node) {
      if (!node || (seen && seen.has(node))) return;
      if (seen) seen.add(node);
      var top = 0, left = 0;
      try { top = node.scrollTop || 0; left = node.scrollLeft || 0; } catch (_) {}
      if (top || left) entries.push({ node: node, top: top, left: left, epoch: pwScrollEpoch(node, false) });
    };
    var cur = target;
    while (cur) { push(cur); cur = cur.parentElement || null; }
    push(se);
  } catch (_) {}
  return entries;
}
function pwRestoreScrollAround(entries) {
  if (!entries || !entries.length) return;
  var restore = function () {
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      try {
        if (!e.node || e.node.isConnected === false) continue;
        if (pwScrollEpoch(e.node, false) !== e.epoch) continue; // remise à zéro volontaire entre-temps
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
if (typeof pwScrollEpoch !== 'undefined' && typeof window !== 'undefined') window.pwScrollEpoch = pwScrollEpoch;
if (typeof pwResetScrollNow !== 'undefined' && typeof window !== 'undefined') window.pwResetScrollNow = pwResetScrollNow;
if (typeof pwSetHtml !== 'undefined' && typeof window !== 'undefined') window.pwSetHtml = pwSetHtml;
if (typeof pwSnapshotScrollAround !== 'undefined' && typeof window !== 'undefined') window.pwSnapshotScrollAround = pwSnapshotScrollAround;
if (typeof pwRestoreScrollAround !== 'undefined' && typeof window !== 'undefined') window.pwRestoreScrollAround = pwRestoreScrollAround;


// ─── Panneau de confirmation UNIFIÉ (#confirm-modal, index.html) ────────────
// Remplace window.confirm : même charte que les autres modales (settings,
// quêtes…). pwConfirm(message, onConfirm[, opts]) — opts.title (optionnel),
// opts.confirmLabel / opts.cancelLabel, opts.danger (bouton rouge),
// opts.onCancel. Fallback : si la modale n'existe pas dans le DOM (tests
// headless), on retombe sur window.confirm pour ne jamais bloquer un flux.
var _pwConfirmCb = null;
function pwConfirm(message, onConfirm, opts) {
  opts = opts || {};
  var modal = (typeof document !== 'undefined') ? document.getElementById('confirm-modal') : null;
  var textEl = modal ? document.getElementById('confirm-text') : null;
  var yesBtn = modal ? document.getElementById('confirm-yes') : null;
  if (!modal || !textEl || !yesBtn) {
    var ok = (typeof confirm === 'function') ? confirm(String(message)) : false;
    if (ok && typeof onConfirm === 'function') onConfirm();
    else if (!ok && typeof opts.onCancel === 'function') opts.onCancel();
    return;
  }
  var titleHtml = opts.title ? '<div class="pw-confirm-title">' + String(opts.title) + '</div>' : '';
  // message : texte brut (échappé) — les retours à la ligne deviennent des <br>
  var esc = String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  textEl.innerHTML = titleHtml + '<div class="pw-confirm-msg">' + esc + '</div>';
  yesBtn.textContent = opts.confirmLabel || ((typeof t === 'function') ? t('confirm_btn') : 'Confirmer');
  yesBtn.classList.toggle('pw-confirm-danger', !!opts.danger);
  var cancelBtn = modal.querySelector('[data-action="close-confirm"]');
  if (cancelBtn) cancelBtn.textContent = opts.cancelLabel || ((typeof t === 'function') ? t('cancel_btn') : 'Annuler');
  _pwConfirmCb = { ok: onConfirm || null, cancel: opts.onCancel || null };
  yesBtn.onclick = function () {
    var cb = _pwConfirmCb && _pwConfirmCb.ok;
    _pwConfirmCb = null;
    modal.classList.remove('open');
    if (typeof cb === 'function') { try { cb(); } catch (e) { try { console.error(e); } catch (_) {} } }
  };
  modal.classList.add('open');
}
function closeConfirm() {
  var modal = (typeof document !== 'undefined') ? document.getElementById('confirm-modal') : null;
  var cb = _pwConfirmCb && _pwConfirmCb.cancel;
  _pwConfirmCb = null;
  if (modal) modal.classList.remove('open');
  if (typeof cb === 'function') { try { cb(); } catch (_) {} }
}
if (typeof pwConfirm !== 'undefined' && typeof window !== 'undefined') window.pwConfirm = pwConfirm;
if (typeof closeConfirm !== 'undefined' && typeof window !== 'undefined') window.closeConfirm = closeConfirm;
