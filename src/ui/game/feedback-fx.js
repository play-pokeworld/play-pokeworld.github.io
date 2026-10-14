// PokeWorld — P3 · ANI-01 : retours visuels (nombres flottants, secousse,
// pulsation, éclat de capture) + P3 · CUR-01 : deltas animés des monnaies.
//
// Règle du genre inscrite au ROAD_MAP §6.3 : « une récompense visible toutes
// les 30 à 90 secondes ». Tout passe par UN SEUL interrupteur —
// G.settings.uiAnimations (accessibilité + machines lentes). Quand il est
// coupé, les valeurs sont écrites instantanément : aucune animation, aucun
// timer, aucun nœud ajouté au DOM.
//
// Durées normatives (§6.3) :
//   nombre flottant 800 ms · barre d'XP 400 ms · éclat de capture 600 ms
//   secousse 200 ms · pulsation 1 000 ms

/** Interrupteur unique. Par défaut : animations actives. */
function uiAnimationsOn() {
  try {
    if (typeof G === 'undefined' || !G || !G.settings) return true;
    return G.settings.uiAnimations !== false;
  } catch (_) { return true; }
}

/** Respecte aussi la préférence système « réduire les animations ». */
function _prefersReducedMotion() {
  try {
    return typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) { return false; }
}

function _fxEnabled() { return uiAnimationsOn() && !_prefersReducedMotion(); }

function toggleUiAnimations() {
  if (typeof G === 'undefined' || !G) return;
  if (!G.settings || typeof G.settings !== 'object') G.settings = {};
  G.settings.uiAnimations = !uiAnimationsOn();
  // PASSE 30 — la couche de promeneurs du fond obéit au même interrupteur :
  // on l'allume ou on l'éteint immédiatement, sans attendre un re-rendu.
  try { if (typeof renderBgPokemon === 'function') renderBgPokemon(); } catch (_) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (_) {}
  try { if (typeof openSettings === 'function') openSettings(); } catch (_) {}
}

// ── Nombre flottant (800 ms) ───────────────────────────────────────────────
// `host` est le conteneur positionné qui reçoit le nœud éphémère. On nettoie
// sur animationend ET via un filet de sécurité (onglet en arrière-plan :
// l'événement peut ne jamais arriver).
function floatNumber(host, text, kind) {
  if (!host || !text || typeof document === 'undefined') return null;
  if (!_fxEnabled()) return null;
  const node = document.createElement('span');
  node.className = 'pw-fx-float' + (kind ? ' pw-fx-float--' + kind : '');
  node.textContent = text;
  node.setAttribute('aria-hidden', 'true');
  host.appendChild(node);
  const drop = () => { try { node.remove(); } catch (_) {} };
  try { node.addEventListener('animationend', drop, { once: true }); } catch (_) {}
  try { setTimeout(drop, 1200); } catch (_) { drop(); }
  return node;
}

/** Signe + séparateurs de milliers, via le formateur du jeu s'il existe. */
function formatDelta(delta, suffix) {
  const n = Number(delta) || 0;
  const abs = Math.abs(n);
  const body = (typeof formatNumber === 'function') ? formatNumber(abs) : String(abs);
  return (n < 0 ? '-' : '+') + body + (suffix || '');
}

// ── Classe éphémère (secousse 200 ms, pulsation 1 000 ms, éclat 600 ms) ────
function _pulseClass(el, cls, ms) {
  if (!el || !_fxEnabled()) return;
  try {
    el.classList.remove(cls);
    // reflow : rejoue l'animation même si la classe vient d'être retirée
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => { try { el.classList.remove(cls); } catch (_) {} }, ms);
  } catch (_) {}
}

/** Secousse — coup super-efficace (200 ms). */
function shakeElement(el) { _pulseClass(el, 'pw-fx-shake', 200); }
/** Pulsation — palier de succès atteint (1 000 ms). */
function pulseElement(el) { _pulseClass(el, 'pw-fx-pulse', 1000); }
/** Éclat — capture réussie (700 ms).
 *  PASSE 31 : la classe était retirée au bout de 600 ms alors que les
 *  keyframes `pw31-capture` durent 700 ms — la fin de l'éclat (retour au
 *  calme) était coupée net. Les deux durées doivent rester synchronisées. */
function flashCapture(el) { _pulseClass(el, 'pw-fx-capture', 700); }

// ── Deltas de monnaies (CUR-01) ────────────────────────────────────────────
// On mémorise la dernière valeur affichée par compteur ; à chaque rendu du
// header, l'écart devient un nombre flottant. Premier passage = pas de delta
// (sinon le solde chargé depuis la sauvegarde « pleuvrait » au boot).
const _lastSeen = Object.create(null);

function reportCurrency(id, value, opts) {
  const o = opts || {};
  const val = Number(value) || 0;
  const known = Object.prototype.hasOwnProperty.call(_lastSeen, id);
  const prev = known ? _lastSeen[id] : val;
  _lastSeen[id] = val;
  if (!known || val === prev) return 0;
  const delta = val - prev;
  // Seuls les GAINS s'annoncent : une dépense volontaire (achat) n'a pas
  // besoin d'être signalée, le joueur vient de la déclencher.
  if (delta > 0 && o.host) floatNumber(o.host, formatDelta(delta, o.suffix || ''), o.kind || 'money');
  return delta;
}

/** Remise à zéro (changement de sauvegarde : aucun delta ne doit survivre). */
function resetCurrencyDeltas() {
  for (const k of Object.keys(_lastSeen)) delete _lastSeen[k];
}

// ── Barre d'XP fluide (400 ms) ─────────────────────────────────────────────
// La transition CSS est portée par .pw-fx-smooth ; ici on ne fait que la
// poser/retirer selon l'interrupteur, pour que les machines lentes écrivent
// la largeur sans interpolation.
function smoothBar(el, pct) {
  if (!el) return;
  try {
    el.classList.toggle('pw-fx-smooth', _fxEnabled());
    el.style.width = Math.max(0, Math.min(100, Number(pct) || 0)) + '%';
  } catch (_) {}
}

// --- Surface classique -----------------------------------------------------
const _api = {
  uiAnimationsOn, toggleUiAnimations, floatNumber, formatDelta,
  shakeElement, pulseElement, flashCapture,
  reportCurrency, resetCurrencyDeltas, smoothBar,
};
if (typeof window !== 'undefined') Object.assign(window, _api);
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _api);
try {
  if (typeof PokeActions !== 'undefined' && PokeActions) PokeActions.register('toggleUiAnimations', toggleUiAnimations);
} catch (_) {}

export {
  uiAnimationsOn, toggleUiAnimations, floatNumber, formatDelta,
  shakeElement, pulseElement, flashCapture,
  reportCurrency, resetCurrencyDeltas, smoothBar,
};

