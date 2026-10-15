/**
 * V7-R1 · retours joueurs #8 — accès au mode debug.
 *
 * Le widget `#debug-widget` (bouton « Debug » + tiroir d'actions de
 * développement) était visible par tous les joueurs. Il est désormais masqué
 * par la feuille de style tant que `<body>` ne porte pas `pw-debug-on`, et ne
 * s'affiche que si le joueur l'a déverrouillé :
 *
 *   - par un CODE saisi dans Réglages → Avancé (`DEBUG_ACCESS_CODE`) ;
 *   - par la console du navigateur : `pwDebug.on()` / `pwDebug.off()` /
 *     `pwDebug.status()`.
 *
 * Le choix est mémorisé dans le stockage local (clé `pokeworld_debug`), hors
 * sauvegarde de partie : il ne voyage pas avec un export de sauvegarde.
 *
 * @module application/save/debug-access
 */

/** Code à saisir dans Réglages → Avancé (insensible à la casse / aux espaces). */
export const DEBUG_ACCESS_CODE = 'PWDEBUG';
const STORAGE_KEY = 'pokeworld_debug';
const BODY_CLASS = 'pw-debug-on';

function _storage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.safeStorage) return globalThis.safeStorage;
  } catch (_) {}
  try {
    if (typeof localStorage !== 'undefined')
      return {
        get: (k) => localStorage.getItem(k),
        set: (k, v) => localStorage.setItem(k, v),
        remove: (k) => localStorage.removeItem(k),
      };
  } catch (_) {}
  return null;
}

function _t(key) {
  try {
    if (typeof globalThis.t === 'function') return globalThis.t(key);
  } catch (_) {}
  return key;
}

function _notify(msg, color) {
  try {
    if (typeof globalThis.notify === 'function') globalThis.notify(msg, color);
  } catch (_) {}
}

/** @returns {boolean} le mode debug est-il déverrouillé sur cet appareil ? */
export function isDebugUnlocked() {
  const st = _storage();
  if (!st) return false;
  try {
    return st.get(STORAGE_KEY) === '1';
  } catch (_) {
    return false;
  }
}

/** Pose/retire la classe sur <body> selon l'état mémorisé (idempotent). */
export function applyDebugAccess() {
  if (typeof document === 'undefined' || !document.body) return false;
  const on = isDebugUnlocked();
  document.body.classList.toggle(BODY_CLASS, on);
  if (!on) {
    // Tiroir refermé quand on masque : il ne doit pas réapparaître ouvert.
    const drawer = document.getElementById('debug-drawer');
    if (drawer) drawer.style.display = 'none';
  }
  return on;
}

/**
 * Déverrouille (ou masque) le mode debug et mémorise le choix.
 * @param {boolean} on
 * @param {{silent?: boolean}} [opts]
 */
export function setDebugUnlocked(on, opts = {}) {
  const st = _storage();
  try {
    if (st) {
      if (on) st.set(STORAGE_KEY, '1');
      else if (typeof st.remove === 'function') st.remove(STORAGE_KEY);
      else st.set(STORAGE_KEY, '0');
    }
  } catch (_) {}
  applyDebugAccess();
  if (!opts.silent) {
    _notify(
      _t(on ? 'debug_mode_enabled' : 'debug_mode_disabled'),
      on ? 'var(--green)' : 'var(--light1)'
    );
  }
  return !!on;
}

/**
 * Teste un code saisi : le bon code bascule le mode debug (ON s'il est
 * masqué, OFF s'il est affiché). Tout autre code est refusé.
 * @param {string} code
 * @returns {boolean} code accepté ?
 */
export function tryDebugCode(code) {
  const norm = String(code == null ? '' : code)
    .trim()
    .toUpperCase();
  if (!norm || norm !== DEBUG_ACCESS_CODE) return false;
  setDebugUnlocked(!isDebugUnlocked());
  return true;
}

/** Réglages → Avancé → « Valider » (lit le champ #debug-code-input). */
export function submitDebugCode() {
  const input =
    typeof document !== 'undefined' ? document.getElementById('debug-code-input') : null;
  const code = input ? input.value : '';
  const ok = tryDebugCode(code);
  if (!ok) _notify(_t('debug_code_wrong'), 'var(--red)');
  if (input) input.value = '';
  try {
    if (typeof globalThis.openSettings === 'function') globalThis.openSettings();
  } catch (_) {}
  return ok;
}

/** Réglages → Avancé → « Masquer le mode debug ». */
export function hideDebugMode() {
  setDebugUnlocked(false);
  try {
    if (typeof globalThis.openSettings === 'function') globalThis.openSettings();
  } catch (_) {}
}

// ── Console du navigateur : `pwDebug.on()` / `pwDebug.off()` / `pwDebug.status()` ──
const pwDebug = Object.freeze({
  on() {
    setDebugUnlocked(true);
    return 'PokéWorld debug: ON';
  },
  off() {
    setDebugUnlocked(false);
    return 'PokéWorld debug: OFF';
  },
  status() {
    return isDebugUnlocked() ? 'ON' : 'OFF';
  },
});

if (typeof window !== 'undefined') {
  window.pwDebug = pwDebug;
  window.isDebugUnlocked = isDebugUnlocked;
  window.applyDebugAccess = applyDebugAccess;
  window.setDebugUnlocked = setDebugUnlocked;
  window.submitDebugCode = submitDebugCode;
  window.hideDebugMode = hideDebugMode;
}
if (typeof globalThis !== 'undefined') {
  globalThis.pwDebug = pwDebug;
  globalThis.isDebugUnlocked = isDebugUnlocked;
  globalThis.applyDebugAccess = applyDebugAccess;
  globalThis.setDebugUnlocked = setDebugUnlocked;
  globalThis.submitDebugCode = submitDebugCode;
  globalThis.hideDebugMode = hideDebugMode;
}
