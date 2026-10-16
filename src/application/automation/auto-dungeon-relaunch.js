// V7-R3 · R3-05 / D30 — RELANCE AUTOMATIQUE DES EXPÉDITIONS DE DONJON.
//
// Retour joueur : « Relance auto donjon comme la relance auto combat (plus
// cher) ». Décisions : amélioration vendue EN BOUTIQUE (points de quête,
// AUTOMATION_UPGRADE_COSTS.autoDungeonRelaunch), AUCUN coût par relance,
// interrupteur dans l'écran de repos de la fenêtre Combat, compte à rebours
// annulable (même rythme que AUTO-01). Quand une expédition se SOLDE (gardien
// vaincu ou équipe K.O.), une nouvelle expédition du même donjon démarre au
// bout du compte à rebours, péage normal prélevé, pilote réglé sur le dernier
// mode utilisé (plateau « farm » par défaut, D26) si le pilote est débloqué.
//
// Garde-fous : jamais pendant le rattrapage hors-ligne (PW_FF — l'étape
// « dungeon » du moteur hors-ligne enchaîne elle-même les expéditions, voir
// dungeon-offline.js), jamais si le joueur a quitté le donjon, si un combat
// est actif, si l'équipe est à terre ou si les jetons ne couvrent plus le
// péage (message clair, pas de boucle). Un abandon volontaire (« Quitter »)
// ne relance rien.
//
// Module sans import statique (DBT-04) : tout passe par les globaux classiques.

const AUTO_DG_KEY = 'autoDungeonRelaunch';
const AUTO_DG_DELAY_MS = 5000;
const AUTO_DG_DEFAULT_MODE = 'farm';
let _dgaTimer = null;
let _dgaTick = null;
let _dgaDeadline = 0;
let _dgaLoc = null;
let _dgaCancelledAt = 0; // V7-R3d · R3d-03 — annulation manuelle (affichée dans le butin)

function _dgaFn(name) {
  const f = globalThis[name];
  return typeof f === 'function' ? f : null;
}
function _dgaText(key, params) {
  const trf = _dgaFn('tr');
  if (trf && params) return trf(key, params);
  const tf = _dgaFn('t');
  return tf ? tf(key) : key;
}
function _dgaUnref(h) {
  if (h && typeof h.unref === 'function') h.unref();
  return h;
}
function _dgaLocObj(locId) {
  const f = _dgaFn('getLocObj');
  return f ? f(locId) : null;
}

/** L'amélioration a-t-elle été achetée (boutique, PQ) ? */
function isAutoDungeonRelaunchOwned() {
  const f = _dgaFn('isAutomationPurchased');
  return !!(f && f(AUTO_DG_KEY));
}
/** Achetée ET interrupteur sur « activé » (par défaut activé après l'achat). */
function isAutoDungeonRelaunchEnabled() {
  if (!isAutoDungeonRelaunchOwned()) return false;
  const g = globalThis.G;
  return !!(g && (!g.automation || g.automation[AUTO_DG_KEY] !== false));
}
function setAutoDungeonRelaunchEnabled(on) {
  if (!isAutoDungeonRelaunchOwned()) {
    const notifyF = _dgaFn('notify');
    if (notifyF) notifyF(_dgaText('auto_dg_relaunch_need'), 'var(--red)');
    return false;
  }
  const g = globalThis.G;
  if (!g) return false;
  if (!g.automation) g.automation = {};
  g.automation[AUTO_DG_KEY] = !!on;
  if (!on) cancelAutoDungeonRelaunch(true);
  renderAutoDungeonRelaunchBar();
  const saveF = _dgaFn('saveGame');
  if (saveF) saveF();
  return true;
}
function toggleAutoDungeonRelaunch() {
  return setAutoDungeonRelaunchEnabled(!isAutoDungeonRelaunchEnabled());
}

/** Mode de pilote mémorisé pour les relances (dernier mode utilisé). */
function autoDungeonRelaunchMode() {
  const g = globalThis.G;
  const m = g && g.automation ? g.automation.autoDungeonMode : null;
  return m === 'boss' || m === 'farm' || m === 'chest' ? m : AUTO_DG_DEFAULT_MODE;
}
function rememberAutoDungeonMode(mode) {
  if (mode !== 'boss' && mode !== 'farm' && mode !== 'chest') return false;
  const g = globalThis.G;
  if (!g) return false;
  if (!g.automation) g.automation = {};
  g.automation.autoDungeonMode = mode;
  return true;
}

/** Péage du donjon et jetons disponibles. */
function _dgaTollState(locId) {
  const loc = _dgaLocObj(locId);
  const tollF = _dgaFn('dungeonToll');
  const toll = loc && tollF ? Number(tollF(Number(loc.badgeReq) || 0)) || 0 : 0;
  const wF = _dgaFn('ensureWallet');
  const w = wF ? wF() : null;
  return { toll, have: w ? Number(w.dungeonTokens || 0) : 0 };
}

/**
 * Une nouvelle expédition de `locId` peut-elle être lancée automatiquement ?
 * @param {string} locId
 * @param {{offline?:boolean, arming?:boolean}} [opts] offline : vérifications du
 *   rattrapage (PW_FF autorisé) ; arming : armement du compte à rebours depuis la
 *   fin d'expédition (le combat perdu peut encore être en train de se fermer :
 *   on ne regarde pas l'état du combat, le tir le revérifiera)
 * @returns {{ok:boolean, reason:string|null}}
 */
function autoDungeonRelaunchCheck(locId, opts) {
  const offline = !!(opts && opts.offline);
  const arming = !!(opts && opts.arming);
  if (!offline && globalThis.PW_FF) return { ok: false, reason: 'ff' };
  const g = globalThis.G;
  if (!g || !Array.isArray(g.team) || !g.team.length) return { ok: false, reason: 'team' };
  if (!locId || g.location !== locId) return { ok: false, reason: 'away' };
  const loc = _dgaLocObj(locId);
  if (!loc || loc.type !== 'dungeon') return { ok: false, reason: 'loc' };
  const b = globalThis.battle;
  if (!arming && b && b.active) return { ok: false, reason: 'battle' };
  const runF = _dgaFn('currentDungeonRun');
  const run = runF ? runF() : null;
  if (run && run.active) return { ok: false, reason: 'running' };
  if (!g.team.some((p) => p && Number(p.currentHP) > 0)) return { ok: false, reason: 'ko' };
  const ts = _dgaTollState(locId);
  if (ts.toll > 0 && ts.have < ts.toll) return { ok: false, reason: 'tokens' };
  return { ok: true, reason: null };
}

function autoDungeonRelaunchRemainingMs() {
  return _dgaTimer ? Math.max(0, _dgaDeadline - Date.now()) : 0;
}

/**
 * Fin d'expédition subie ou achevée (appelé par dungeonOnWipe /
 * dungeonOnBossDefeated) : arme le compte à rebours si tout est réuni.
 * @param {{loc:string, mode?:string|null, outcome?:string}} info
 * @returns {boolean} un compte à rebours est armé
 */
function scheduleAutoDungeonRelaunch(info) {
  const locId = info && info.loc ? String(info.loc) : null;
  if (info && info.mode) rememberAutoDungeonMode(info.mode);
  if (!locId || !isAutoDungeonRelaunchEnabled()) return false;
  const chk = autoDungeonRelaunchCheck(locId, { arming: true });
  if (!chk.ok) {
    if (chk.reason === 'tokens') {
      const ts = _dgaTollState(locId);
      const notifyF = _dgaFn('notify');
      if (notifyF)
        notifyF(
          _dgaText('auto_dg_relaunch_no_tokens', { need: String(ts.toll), have: String(ts.have) }),
          'var(--red)'
        );
    }
    renderAutoDungeonRelaunchBar();
    return false;
  }
  cancelAutoDungeonRelaunch(true);
  _dgaCancelledAt = 0;
  _dgaLoc = locId;
  _dgaDeadline = Date.now() + AUTO_DG_DELAY_MS;
  _dgaTimer = _dgaUnref(globalThis.setTimeout(_dgaFire, AUTO_DG_DELAY_MS));
  _dgaTick = _dgaUnref(globalThis.setInterval(renderAutoDungeonRelaunchBar, 250));
  renderAutoDungeonRelaunchBar();
  return true;
}

function cancelAutoDungeonRelaunch(silent) {
  if (_dgaTimer && !silent) _dgaCancelledAt = Date.now(); // annulation par le joueur
  if (_dgaTimer) globalThis.clearTimeout(_dgaTimer);
  if (_dgaTick) globalThis.clearInterval(_dgaTick);
  _dgaTimer = null;
  _dgaTick = null;
  _dgaDeadline = 0;
  _dgaLoc = null;
  if (!silent) renderAutoDungeonRelaunchBar();
}

/** Lance l'expédition (compte à rebours écoulé). */
function _dgaFire() {
  const locId = _dgaLoc;
  const wasArmed = !!_dgaTimer;
  cancelAutoDungeonRelaunch(true);
  if (!wasArmed || !locId || !isAutoDungeonRelaunchEnabled()) return false;
  // Comme la relance des combats (AUTO-01) : le résumé de fin de combat /
  // d'expédition ne doit pas rester ouvert par-dessus la nouvelle expédition.
  const closeF = _dgaFn('closeBattleSummary');
  if (closeF) closeF();
  const started = startAutoDungeonRun(locId, { offline: false });
  renderAutoDungeonRelaunchBar();
  return started;
}

/**
 * Démarre une expédition et règle le pilote sur le mode mémorisé. Partagé
 * entre la relance en direct et l'étape « dungeon » du rattrapage hors-ligne.
 * @returns {boolean} une expédition a démarré
 */
function startAutoDungeonRun(locId, opts) {
  const chk = autoDungeonRelaunchCheck(locId, opts);
  if (!chk.ok) return false;
  const startF = _dgaFn('startDungeonRun');
  const run = startF ? startF(locId) : null;
  if (!run) return false;
  const mode = autoDungeonRelaunchMode();
  const unlockedF = _dgaFn('dungeonAutoUnlocked');
  if (unlockedF && unlockedF(locId)) {
    if (opts && opts.offline)
      run.auto = mode; // sans relance différée (le pas est joué par l'étape)
    else {
      const setF = _dgaFn('dungeonSetAuto');
      if (setF) setF(mode);
    }
  }
  const logF = _dgaFn('addBattleLog');
  if (logF && !(opts && opts.offline)) logF(_dgaText('auto_dg_relaunch_fired'));
  return true;
}

function _dgaBtn(call, label, cls) {
  return (
    '<button type="button" class="hbtn ' +
    (cls || '') +
    '" data-action="legacy-call" data-call="' +
    call +
    '" data-call-args="">' +
    label +
    '</button>'
  );
}

/** V7-R3d · R3d-03 — compte à rebours de la prochaine expédition DANS le menu de butin
 *  (le résumé de fin d'expédition recouvre le bandeau de l'écran de repos). */
function _dgaRenderSummary() {
  const host = document.getElementById('summary-relaunch-dungeon');
  if (!host) return;
  const setHtml = _dgaFn('_pwSetHtmlSafe');
  const g = globalThis.G;
  const loc = g ? _dgaLocObj(g.location) : null;
  if ((!loc || loc.type !== 'dungeon') && !_dgaTimer) {
    if (host.firstElementChild) {
      if (setHtml) setHtml(host, '');
      else host.textContent = '';
    }
    return;
  }
  const left = autoDungeonRelaunchRemainingMs();
  const armed = !!(_dgaTimer && left > 0);
  const existing = host.firstElementChild;
  if (armed) {
    const textStr = _dgaText('auto_dg_relaunch_countdown', { s: Math.ceil(left / 1000) });
    const pct = Math.max(0, Math.min(100, Math.round((left / AUTO_DG_DELAY_MS) * 100))) + '%';
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
      _dgaBtn(
        'cancelAutoDungeonRelaunch',
        _dgaText('auto_relaunch_cancel_btn'),
        'pw-summary-relaunch-cancel'
      ) +
      '</div>';
    if (setHtml) setHtml(host, html);
    else host.textContent = html.replace(/<[^>]+>/g, ' ');
    return;
  }
  if (_dgaCancelledAt) {
    if (existing && existing.classList.contains('is-cancelled')) return;
    const html =
      '<div class="pw-summary-relaunch is-cancelled" role="status"><span class="pw-summary-relaunch-text">' +
      _dgaText('auto_dg_relaunch_cancelled') +
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

/** Bandeau de l'écran de repos (visible seulement dans un donjon, amélioration achetée). */
function renderAutoDungeonRelaunchBar() {
  if (typeof document === 'undefined') return;
  _dgaRenderSummary();
  const host = document.getElementById('dungeon-auto-relaunch');
  if (!host) return;
  const setHtml = _dgaFn('_pwSetHtmlSafe');
  const g = globalThis.G;
  const loc = g ? _dgaLocObj(g.location) : null;
  const btn = _dgaBtn;
  const costF = _dgaFn('automationCostLabel');
  if (!loc || loc.type !== 'dungeon' || (!isAutoDungeonRelaunchOwned() && !costF)) {
    host.hidden = true;
    if (setHtml) setHtml(host, '');
    else host.textContent = '';
    return;
  }
  host.hidden = false;
  if (!isAutoDungeonRelaunchOwned()) {
    host.hidden = false;
    const priceText = costF(AUTO_DG_KEY);
    const locked = btn(
      'buyAutoDungeonRelaunchUpgrade',
      _dgaText('auto_dg_relaunch_locked', { price: priceText }),
      'pw-auto-relaunch-buy automation-buy-btn'
    );
    if (setHtml) setHtml(host, locked);
    else host.textContent = locked.replace(/<[^>]+>/g, ' ');
    return;
  }
  host.hidden = false;
  const on = isAutoDungeonRelaunchEnabled();
  const left = autoDungeonRelaunchRemainingMs();
  let html = '';
  if (_dgaTimer && left > 0) {
    html +=
      '<span class="pw-auto-relaunch-countdown">' +
      _dgaText('auto_dg_relaunch_countdown', { s: Math.ceil(left / 1000) }) +
      '</span>' +
      btn('cancelAutoDungeonRelaunch', _dgaText('auto_relaunch_cancel'), 'pw-auto-relaunch-cancel');
  }
  const label = _dgaText('auto_dg_btn_dungeon') || 'Relance auto donjon';
  html += btn(
    'toggleAutoDungeonRelaunch',
    label,
    'pw-auto-relaunch-toggle' + (on ? ' active' : '')
  );
  if (setHtml) setHtml(host, html);
  else host.textContent = html.replace(/<[^>]+>/g, ' ');
}

/** V7-R3c — achat depuis le bandeau du donjon (même caisse que la boutique). */
function buyAutoDungeonRelaunchUpgrade() {
  const costF = _dgaFn('formatNumber') || String;
  const price = costF(AUTO_DG_KEY) + ' ' + _dgaText('currency_quest_points');
  const title = _dgaText('auto_dg_relaunch_title') || 'Relance auto des donjons';
  const msg =
    _dgaText('auto_relaunch_buy_confirm', { price }) || `Acheter la « ${title} » pour ${price} ?`;

  const doBuy = () => {
    const buyF = _dgaFn('purchaseAutomationIfNeeded');
    if (!buyF || !buyF(AUTO_DG_KEY)) return false;
    setAutoDungeonRelaunchEnabled(true);
    const saveF = _dgaFn('saveGame');
    if (saveF) saveF();
    renderAutoDungeonRelaunchBar();
    return true;
  };

  const confirmFn = globalThis.pwConfirm || null;
  if (confirmFn) {
    confirmFn(msg, doBuy, { title });
  } else {
    doBuy();
  }
}

const _autoDungeonRelaunchGlobals = {
  buyAutoDungeonRelaunchUpgrade,
  AUTO_DG_KEY,
  AUTO_DG_DELAY_MS,
  AUTO_DG_DEFAULT_MODE,
  isAutoDungeonRelaunchOwned,
  isAutoDungeonRelaunchEnabled,
  setAutoDungeonRelaunchEnabled,
  toggleAutoDungeonRelaunch,
  autoDungeonRelaunchMode,
  rememberAutoDungeonMode,
  autoDungeonRelaunchCheck,
  autoDungeonRelaunchRemainingMs,
  scheduleAutoDungeonRelaunch,
  cancelAutoDungeonRelaunch,
  startAutoDungeonRun,
  renderAutoDungeonRelaunchBar,
};
if (typeof window !== 'undefined') Object.assign(window, _autoDungeonRelaunchGlobals);
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _autoDungeonRelaunchGlobals);

export {
  buyAutoDungeonRelaunchUpgrade,
  AUTO_DG_KEY,
  AUTO_DG_DELAY_MS,
  AUTO_DG_DEFAULT_MODE,
  isAutoDungeonRelaunchOwned,
  isAutoDungeonRelaunchEnabled,
  setAutoDungeonRelaunchEnabled,
  toggleAutoDungeonRelaunch,
  autoDungeonRelaunchMode,
  rememberAutoDungeonMode,
  autoDungeonRelaunchCheck,
  autoDungeonRelaunchRemainingMs,
  scheduleAutoDungeonRelaunch,
  cancelAutoDungeonRelaunch,
  startAutoDungeonRun,
  renderAutoDungeonRelaunchBar,
};
