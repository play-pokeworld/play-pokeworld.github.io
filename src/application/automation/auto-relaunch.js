// V7-R2 · AUTO-01 — RELANCE AUTOMATIQUE DES COMBATS SAUVAGES.
//
// Constat (roadmap V7 §4b) : la seule « défaite » d'une chaîne sauvage est la
// fatigue de combat (DORM-04) ou un adversaire trop fort ; l'équipe est soignée
// aussitôt (R1-06) mais le joueur devait revenir cliquer « Explorer ». Décision
// joueur : amélioration vendue EN BOUTIQUE (points de quête), AUCUN coût par
// relance, interrupteur dans la fenêtre Combat, compte à rebours annulable.
//
// Garde-fous : jamais en expédition de donjon (le pilote s'en charge, et un
// wipe termine le run), jamais pendant le rattrapage hors-ligne (PW_FF), jamais
// si le lieu n'a pas de table sauvage ni si un combat est déjà actif. Le compte
// à rebours est RELANCÉ uniquement par la fin d'un combat subie (endBattle sur
// équipe K.O.) — une sortie volontaire (« Quitter ») ne relance rien.
//
// Module sans import statique (DBT-04) : tout passe par les globaux classiques.

const AUTO_RELAUNCH_KEY = 'autoRelaunch';
const AUTO_RELAUNCH_DELAY_MS = 5000;
let _arTimer = null;
let _arTick = null;
let _arDeadline = 0;
let _arCancelledAt = 0; // V7-R3d · R3d-03 — annulation manuelle (affichée dans le butin)

function _arFn(name) {
  const f = globalThis[name];
  return typeof f === 'function' ? f : null;
}
function _arText(key, params) {
  const trf = _arFn('tr');
  if (trf && params) return trf(key, params);
  const tf = _arFn('t');
  return tf ? tf(key) : key;
}
function _arUnref(h) {
  if (h && typeof h.unref === 'function') h.unref();
  return h;
}
function _arBtn(call, label, cls, attrs) {
  return (
    '<button type="button" class="hbtn ' +
    (cls || '') +
    '" data-action="legacy-call" data-call="' +
    call +
    '" data-call-args=""' +
    (attrs ? ' ' + attrs : '') +
    '>' +
    label +
    '</button>'
  );
}

/** L'amélioration a-t-elle été achetée (boutique, PQ) ? */
function isAutoRelaunchOwned() {
  const f = _arFn('isAutomationPurchased');
  return !!(f && f(AUTO_RELAUNCH_KEY));
}

/** Achetée ET interrupteur sur « activé » (par défaut activé après l'achat). */
function isAutoRelaunchEnabled() {
  if (!isAutoRelaunchOwned()) return false;
  const g = globalThis.G;
  return !!(g && (!g.automation || g.automation[AUTO_RELAUNCH_KEY] !== false));
}

function setAutoRelaunchEnabled(on) {
  if (!isAutoRelaunchOwned()) {
    const notifyF = _arFn('notify');
    if (notifyF) notifyF(_arText('auto_relaunch_need'), 'var(--red)');
    return false;
  }
  const g = globalThis.G;
  if (!g) return false;
  if (!g.automation) g.automation = {};
  g.automation[AUTO_RELAUNCH_KEY] = !!on;
  if (!on) cancelAutoRelaunch(true);
  renderAutoRelaunchBar();
  const saveF = _arFn('saveGame');
  if (saveF) saveF();
  return true;
}
function toggleAutoRelaunch() {
  return setAutoRelaunchEnabled(!isAutoRelaunchEnabled());
}

/** Le lieu courant et l'état du jeu permettent-ils une relance « Explorer » ? */
function autoRelaunchAllowedHere() {
  if (globalThis.PW_FF) return false;
  const g = globalThis.G;
  if (!g || !Array.isArray(g.team) || !g.team.length) return false;
  const b = globalThis.battle;
  if (b && b.active) return false;
  const runF = _arFn('currentDungeonRun');
  const run = runF ? runF() : null;
  if (run && run.active) return false;
  const locF = _arFn('getLocObj');
  const loc = locF ? locF(g.location) : null;
  if (!loc || loc.type === 'dungeon') return false;
  return Array.isArray(loc.wild) && loc.wild.length > 0;
}

function autoRelaunchRemainingMs() {
  return _arTimer ? Math.max(0, _arDeadline - Date.now()) : 0;
}

/**
 * Lance le compte à rebours (appelé par endBattle quand la chaîne sauvage
 * s'arrête sur une équipe K.O., et par la fin du rattrapage hors-ligne).
 * @returns {boolean} un compte à rebours est armé
 */
function scheduleAutoRelaunch() {
  if (!isAutoRelaunchEnabled() || !autoRelaunchAllowedHere()) return false;
  cancelAutoRelaunch(true);
  _arCancelledAt = 0;
  _arDeadline = Date.now() + AUTO_RELAUNCH_DELAY_MS;
  _arTimer = _arUnref(globalThis.setTimeout(_arFire, AUTO_RELAUNCH_DELAY_MS));
  _arTick = _arUnref(globalThis.setInterval(renderAutoRelaunchBar, 250));
  renderAutoRelaunchBar();
  return true;
}

function cancelAutoRelaunch(silent) {
  if (_arTimer && !silent) _arCancelledAt = Date.now(); // annulation par le joueur
  if (_arTimer) globalThis.clearTimeout(_arTimer);
  if (_arTick) globalThis.clearInterval(_arTick);
  _arTimer = null;
  _arTick = null;
  _arDeadline = 0;
  if (!silent) renderAutoRelaunchBar();
}

function _arFire() {
  const wasArmed = !!_arTimer;
  cancelAutoRelaunch(true);
  if (!wasArmed || !isAutoRelaunchEnabled() || !autoRelaunchAllowedHere()) {
    renderAutoRelaunchBar();
    return false;
  }
  const closeF = _arFn('closeBattleSummary');
  if (closeF) closeF();
  const exploreF = _arFn('exploreArea');
  if (exploreF) exploreF();
  const logF = _arFn('addBattleLog');
  if (logF) logF(_arText('auto_relaunch_fired'));
  renderAutoRelaunchBar();
  return true;
}

/** V7-R3d · R3d-03 — le compte à rebours est aussi affiché DANS le menu de butin
 *  (résumé de combat, qui recouvre l'écran de repos) avec une barre de progression
 *  et un bouton d'arrêt ; après une annulation, le menu le dit explicitement. */
function _arRenderSummary() {
  const host = document.getElementById('summary-relaunch-wild');
  if (!host) return;
  const setHtml = _arFn('_pwSetHtmlSafe');
  if (!autoRelaunchAllowedHere() && !_arTimer) {
    if (host.firstElementChild) {
      if (setHtml) setHtml(host, '');
      else host.textContent = '';
    }
    return;
  }
  const left = autoRelaunchRemainingMs();
  const armed = !!(_arTimer && left > 0);
  const existing = host.firstElementChild;
  if (armed) {
    const textStr = _arText('auto_relaunch_countdown', { s: Math.ceil(left / 1000) });
    const pct = Math.max(0, Math.min(100, Math.round((left / AUTO_RELAUNCH_DELAY_MS) * 100))) + '%';
    if (existing && existing.classList.contains('is-armed')) {
      const txt = existing.querySelector('.pw-summary-relaunch-text');
      if (txt && txt.textContent !== textStr) txt.textContent = textStr;
      const fill = existing.querySelector('.pw-summary-relaunch-fill');
      if (fill && fill.style) fill.style.width = pct;
      return;
    }
    const html =
      '<div class="pw-summary-relaunch is-armed" role="status" aria-live="polite">' +
      '<span class="pw-summary-relaunch-text">' +
      textStr +
      '</span><span class="pw-summary-relaunch-bar"><span class="pw-summary-relaunch-fill" style="width:' +
      pct +
      '"></span></span>' +
      _arBtn(
        'cancelAutoRelaunch',
        _arText('auto_relaunch_cancel_btn'),
        'pw-summary-relaunch-cancel'
      ) +
      '</div>';
    if (setHtml) setHtml(host, html);
    else host.textContent = html.replace(/<[^>]+>/g, ' ');
    return;
  }
  if (_arCancelledAt) {
    if (existing && existing.classList.contains('is-cancelled')) return;
    const html =
      '<div class="pw-summary-relaunch is-cancelled" role="status"><span class="pw-summary-relaunch-text">' +
      _arText('auto_relaunch_cancelled') +
      '</span></div>';
    if (setHtml) setHtml(host, html);
    else host.textContent = html.replace(/<[^>]+>/g, ' ');
    return;
  }
  if (existing) {
    if (setHtml) setHtml(host, '');
    else host.textContent = '';
  }
}

/** Bandeau de l'écran de repos : état de l'interrupteur + compte à rebours. */
function renderAutoRelaunchBar() {
  if (typeof document === 'undefined') return;
  // V7-R3 · D30 — le bandeau jumeau des donjons se rafraîchit en même temps.
  const dgBar = _arFn('renderAutoDungeonRelaunchBar');
  if (dgBar) dgBar();
  _arRenderSummary();
  const host = document.getElementById('battle-auto-relaunch');
  if (!host) return;
  const setHtml = _arFn('_pwSetHtmlSafe');
  const btn = _arBtn;
  if (!isAutoRelaunchOwned()) {
    // V7-R3c · R3c-04 — module non acheté : le bandeau annonce le prix et
    // propose l'achat direct (plus de bouton muet ni de bandeau caché).
    const costF = _arFn('automationCostLabel');
    if (!costF || !autoRelaunchAllowedHere()) {
      host.hidden = true;
      if (setHtml) setHtml(host, '');
      else host.textContent = '';
      return;
    }
    host.hidden = false;
    const priceText = costF(AUTO_RELAUNCH_KEY);
    const locked = btn(
      'buyAutoRelaunchUpgrade',
      _arText('auto_relaunch_locked', { price: priceText }),
      'pw-auto-relaunch-buy automation-buy-btn'
    );
    if (setHtml) setHtml(host, locked);
    else host.textContent = locked.replace(/<[^>]+>/g, ' ');
    return;
  }
  host.hidden = false;
  const on = isAutoRelaunchEnabled();
  const left = autoRelaunchRemainingMs();
  let html = '';
  if (_arTimer && left > 0) {
    html +=
      '<span class="pw-auto-relaunch-countdown">' +
      _arText('auto_relaunch_countdown', { s: Math.ceil(left / 1000) }) +
      '</span>' +
      btn('cancelAutoRelaunch', _arText('auto_relaunch_cancel'), 'pw-auto-relaunch-cancel');
  }
  const stateKey = on ? 'auto_relaunch_on' : 'auto_relaunch_off';
  const label = _arText('auto_relaunch_btn_battle') || 'Relance auto combat';
  html += btn(
    'toggleAutoRelaunch',
    label,
    'pw-auto-relaunch-toggle' + (on ? ' active' : ''),
    'aria-label="' +
      _arText(stateKey) +
      '" data-state="' +
      stateKey +
      '" title="' +
      _arText(stateKey) +
      '"'
  );
  if (setHtml) setHtml(host, html);
  else host.textContent = html.replace(/<[^>]+>/g, ' ');
}

/** V7-R3c — achat depuis le bandeau de repos (même caisse que la boutique). */
function buyAutoRelaunchUpgrade() {
  const costF = _arFn('formatNumber') || String;
  const price = costF(AUTO_RELAUNCH_KEY) + ' ' + _arText('currency_quest_points');
  const title = _arText('auto_relaunch_title') || 'Relance automatique';
  const msg =
    _arText('auto_relaunch_buy_confirm', { price }) || `Acheter la « ${title} » pour ${price} ?`;

  const doBuy = () => {
    const buyF = _arFn('purchaseAutomationIfNeeded');
    if (!buyF || !buyF(AUTO_RELAUNCH_KEY)) return false;
    setAutoRelaunchEnabled(true);
    const saveF = _arFn('saveGame');
    if (saveF) saveF();
    renderAutoRelaunchBar();
    return true;
  };

  const confirmFn = globalThis.pwConfirm || null;
  if (confirmFn) {
    confirmFn(msg, doBuy, { title });
  } else {
    doBuy();
  }
}

const _autoRelaunchGlobals = {
  buyAutoRelaunchUpgrade,
  AUTO_RELAUNCH_KEY,
  AUTO_RELAUNCH_DELAY_MS,
  isAutoRelaunchOwned,
  isAutoRelaunchEnabled,
  setAutoRelaunchEnabled,
  toggleAutoRelaunch,
  autoRelaunchAllowedHere,
  autoRelaunchRemainingMs,
  scheduleAutoRelaunch,
  cancelAutoRelaunch,
  renderAutoRelaunchBar,
};
if (typeof window !== 'undefined') Object.assign(window, _autoRelaunchGlobals);
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _autoRelaunchGlobals);

export {
  buyAutoRelaunchUpgrade,
  AUTO_RELAUNCH_KEY,
  AUTO_RELAUNCH_DELAY_MS,
  isAutoRelaunchOwned,
  isAutoRelaunchEnabled,
  setAutoRelaunchEnabled,
  toggleAutoRelaunch,
  autoRelaunchAllowedHere,
  autoRelaunchRemainingMs,
  scheduleAutoRelaunch,
  cancelAutoRelaunch,
  renderAutoRelaunchBar,
};
