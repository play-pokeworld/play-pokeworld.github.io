// ════════════════════════════════════════════════════════════════════════════
// PASSE 32 — CYCLE JOUR / NUIT DU FOND DE PAGE
// ════════════════════════════════════════════════════════════════════════════
// Demande : « un cycle jour nuit des couleurs qui respecte l'heure du système
// du joueur (avec un debug pour switch de jour à nuit) ».
//
// Ce module ne fait qu'UNE chose : poser l'attribut `data-daytime` sur <html>.
// Toute la couleur vit dans la feuille de style (§32.9), où chaque thème
// décline ses quatre bandes de paysage et chaque phase son filtre. Séparer
// ainsi la décision (ici) du rendu (CSS) permet au joueur de changer de thème
// et de phase indépendamment, sans recalcul.
//
// LES QUATRE PHASES, d'après l'heure LOCALE de la machine du joueur :
//     aube       06:00 → 09:00   (dawn)
//     jour       09:00 → 18:00   (day)
//     crépuscule 18:00 → 21:00   (dusk)
//     nuit       21:00 → 06:00   (night)
//
// SURCHARGE DE DEBUG : `G.debugDaytime` (ou le bouton du tiroir Debug) force
// une phase. Tant qu'elle est posée, l'heure système est ignorée — c'est le
// « debug pour switch de jour à nuit » demandé.

const PW_DAYTIME_PHASES = ['dawn', 'day', 'dusk', 'night'];

/**
 * Phase correspondant à une heure donnée (0-23).
 * @param {number} hour
 * @returns {'dawn'|'day'|'dusk'|'night'}
 */
function daytimePhaseForHour(hour) {
  const h = Number(hour);
  if (!Number.isFinite(h)) return 'day';
  const n = ((Math.floor(h) % 24) + 24) % 24;
  if (n >= 6 && n < 9) return 'dawn';
  if (n >= 9 && n < 18) return 'day';
  if (n >= 18 && n < 21) return 'dusk';
  return 'night';
}

/**
 * Phase active : la surcharge de debug si elle existe, sinon l'heure système.
 * @returns {'dawn'|'day'|'dusk'|'night'}
 */
function currentDaytimePhase() {
  try {
    const forced = (typeof G !== 'undefined' && G) ? G.debugDaytime : null;
    if (forced && PW_DAYTIME_PHASES.includes(forced)) return forced;
  } catch (_) { /* G absent (tests unitaires) : on suit l'horloge */ }
  return daytimePhaseForHour(new Date().getHours());
}

/**
 * Applique la phase au document. Idempotent : réécrire la même valeur
 * n'entraîne aucun recalcul de style.
 * @returns {string} la phase appliquée
 */
function applyDaytime() {
  const phase = currentDaytimePhase();
  if (typeof document !== 'undefined' && document.documentElement) {
    if (document.documentElement.getAttribute('data-daytime') !== phase) {
      document.documentElement.setAttribute('data-daytime', phase);
    }
  }
  return phase;
}

/**
 * Bouton de debug : fait défiler aube → jour → crépuscule → nuit → automatique.
 * Le cinquième cran rend la main à l'heure système.
 * @returns {string} le libellé de l'état atteint
 */
function debugCycleDaytime() {
  if (typeof G === 'undefined' || !G) return 'auto';
  const cur = G.debugDaytime || null;
  const idx = cur ? PW_DAYTIME_PHASES.indexOf(cur) : -1;
  const next = (idx < 0) ? PW_DAYTIME_PHASES[0]
    : (idx >= PW_DAYTIME_PHASES.length - 1) ? null
      : PW_DAYTIME_PHASES[idx + 1];
  G.debugDaytime = next;
  applyDaytime();
  const label = next || 'auto';
  const el = (typeof document !== 'undefined') ? document.getElementById('debug-daytime-state') : null;
  if (el) el.textContent = label.toUpperCase();
  return label;
}

// Réévaluation périodique : l'heure tourne pendant que le joueur joue. Une
// vérification par minute suffit largement et ne coûte rien (l'attribut n'est
// réécrit que s'il change réellement).
let _pwDaytimeTimer = 0;
function startDaytimeWatch() {
  applyDaytime();
  if (_pwDaytimeTimer || typeof setInterval === 'undefined') return;
  _pwDaytimeTimer = setInterval(applyDaytime, 60000);
}

if (typeof globalThis !== 'undefined') {
  globalThis.daytimePhaseForHour = daytimePhaseForHour;
  globalThis.currentDaytimePhase = currentDaytimePhase;
  globalThis.applyDaytime = applyDaytime;
  globalThis.debugCycleDaytime = debugCycleDaytime;
  globalThis.startDaytimeWatch = startDaytimeWatch;
  globalThis.PW_DAYTIME_PHASES = PW_DAYTIME_PHASES;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startDaytimeWatch, { once: true });
  else startDaytimeWatch();
}

if (typeof PokeActions !== 'undefined' && PokeActions) {
  try { PokeActions.register('debugCycleDaytime', debugCycleDaytime); } catch (_) {}
}

export {
  daytimePhaseForHour,
  currentDaytimePhase,
  applyDaytime,
  debugCycleDaytime,
  startDaytimeWatch,
  PW_DAYTIME_PHASES,
};

