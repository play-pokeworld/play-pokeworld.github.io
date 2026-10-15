/**
 * V7-R1 · retours joueurs #10 — surbrillance de l'élément à ouvrir.
 *
 * Retour : « le tuto devrait mettre en surbrillance les menus/boutons à aller
 * voir (Poké Balls, Pokémon, Pokédex…) ». Pour l'étape de tutoriel COURANTE,
 * ce module pose la classe `pw-tuto-target` (halo pulsé, design-system.css
 * § V7-R1) sur les éléments concernés :
 *
 *   - la cible est déduite de l'action de l'étape (`clickLocation` → nœud de
 *     la carte, `scrollToWin` → fenêtre du tableau de bord, `openFullscreenPanel`
 *     → bouton de raccourci / bouton du panneau Lieu, `showTab` → fenêtre
 *     Équipe), complétée par les cibles explicites `step.targets` ;
 *   - sur mobile, si la fenêtre visée n'est pas dans la vue affichée, c'est
 *     le bouton de la barre du bas qui mène à cette vue qui clignote.
 *
 * Aucune dépendance de rendu : un simple balayage (`setInterval`, 1,5 s)
 * survit aux re-rendus des fenêtres (raccourcis, carte, panneau Lieu) sans
 * avoir à crocheter chaque rendu. Zéro surbrillance quand le tutoriel est
 * désactivé ou terminé.
 *
 * @module ui/game/tutorial-highlight
 */

export const TUTO_TARGET_CLASS = 'pw-tuto-target';
const SCAN_EVERY_MS = 1500;
let _timer = null;

/** Échappe une valeur pour un sélecteur d'attribut `[data-call-args="'x'"]`. */
function _argSel(arg) {
  return `[data-call-args="'${String(arg).replace(/["\\]/g, '')}'"]`;
}

/**
 * Sélecteurs CSS visés par une étape (déduits de son action + explicites).
 * @param {{actionCall?: string, actionArgs?: string, targets?: string[]}} step
 * @returns {string[]}
 */
export function tutorialTargetSelectors(step) {
  if (!step) return [];
  const out = [];
  const arg = String(step.actionArgs || '').replace(/^'|'$/g, '');
  switch (step.actionCall) {
    case 'clickLocation':
      if (arg) out.push(`#nodes g.loc-node${_argSel(arg)}`);
      break;
    case 'scrollToWin':
      if (arg) out.push(`#${arg}`);
      break;
    case 'openFullscreenPanel':
      if (arg) {
        out.push(`.shortcut-action-btn[data-panel="${arg}"]`);
        out.push(`#win-tabs [data-call="openFullscreenPanel"]${_argSel(arg)}`);
      }
      break;
    case 'showTab':
      if (arg === 'team') out.push('#win-team');
      break;
    default:
      break;
  }
  if (Array.isArray(step.targets)) out.push(...step.targets);
  return out;
}

/** Étape courante SANS effet de bord (pas de progression/sauvegarde ici). */
function _currentStep() {
  try {
    const g = globalThis;
    if (typeof g.ensureTutorialState !== 'function' || typeof g.tutorialSteps !== 'function')
      return null;
    const st = g.ensureTutorialState();
    if (!st || !st.enabled) return null;
    const steps = g.tutorialSteps() || [];
    return steps.find((s) => s && !st.completed[s.id]) || null;
  } catch (_) {
    return null;
  }
}

/** Vue mobile (barre du bas) qui contient une fenêtre du tableau de bord. */
function _mobileViewFor(el) {
  try {
    const win = el.closest ? el.closest('#main-dashboard .dash-win') : null;
    if (!win || typeof globalThis.pwMobileViewForWin !== 'function') return null;
    const v = globalThis.pwMobileViewForWin(win.id);
    if (!v) return null;
    if (win.classList.contains('mobile-visible')) return null; // déjà à l'écran
    return v;
  } catch (_) {
    return null;
  }
}

/** Retire toute surbrillance (étape terminée, tuto désactivé, cible changée). */
export function clearTutorialHighlight() {
  if (typeof document === 'undefined') return 0;
  const prev = document.querySelectorAll('.' + TUTO_TARGET_CLASS);
  prev.forEach((el) => el.classList.remove(TUTO_TARGET_CLASS));
  return prev.length;
}

/**
 * Pose la surbrillance pour l'étape courante.
 * @returns {number} nombre d'éléments mis en évidence
 */
export function applyTutorialHighlight() {
  if (typeof document === 'undefined' || !document.body) return 0;
  const step = _currentStep();
  const wanted = new Set();
  if (step && document.body.classList.contains('game-started')) {
    const mobile = document.body.classList.contains('mobile-mode');
    for (const sel of tutorialTargetSelectors(step)) {
      let nodes = [];
      try {
        nodes = document.querySelectorAll(sel);
      } catch (_) {
        nodes = [];
      }
      nodes.forEach((el) => {
        wanted.add(el);
        if (!mobile) return;
        const view = _mobileViewFor(el);
        if (!view) return;
        const nav = document.querySelector(`.mobile-nav-bar [data-mobile-view="${view.view}"]`);
        if (nav) wanted.add(nav);
        if (view.manage) {
          const sub = document.querySelector(
            `.mobile-subnav-bar [data-mobile-manage-view="${view.manage}"]`
          );
          if (sub) wanted.add(sub);
        }
      });
    }
  }
  // Diff minimal : on ne touche qu'aux nœuds qui changent (pas de
  // redémarrage d'animation à chaque balayage).
  document.querySelectorAll('.' + TUTO_TARGET_CLASS).forEach((el) => {
    if (!wanted.has(el)) el.classList.remove(TUTO_TARGET_CLASS);
  });
  wanted.forEach((el) => el.classList.add(TUTO_TARGET_CLASS));
  return wanted.size;
}

/** Démarre le balayage périodique (idempotent). */
export function installTutorialHighlight() {
  if (_timer || typeof setInterval !== 'function') return false;
  _timer = setInterval(() => {
    try {
      applyTutorialHighlight();
    } catch (_) {}
  }, SCAN_EVERY_MS);
  // Node (tests/harnais) : le balayage ne doit jamais retenir le processus.
  if (_timer && typeof _timer.unref === 'function') _timer.unref();
  try {
    applyTutorialHighlight();
  } catch (_) {}
  return true;
}

if (typeof window !== 'undefined') {
  window.applyTutorialHighlight = applyTutorialHighlight;
  window.clearTutorialHighlight = clearTutorialHighlight;
  window.tutorialTargetSelectors = tutorialTargetSelectors;
}
if (typeof globalThis !== 'undefined') {
  globalThis.applyTutorialHighlight = applyTutorialHighlight;
  globalThis.clearTutorialHighlight = clearTutorialHighlight;
  globalThis.tutorialTargetSelectors = tutorialTargetSelectors;
}
