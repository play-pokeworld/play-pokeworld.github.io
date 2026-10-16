/**
 * V7-R1 · retours joueurs #9 — quelle fenêtre du tableau de bord vit dans
 * quelle vue mobile (barre du bas).
 *
 * Avant, les fenêtres « Poké Balls » et « Monnaies » n'étaient dans AUCUNE
 * vue : sur téléphone elles étaient tout simplement inaccessibles. Source
 * UNIQUE partagée par applyMobileView() (classic-bridge.js), scrollToWin()
 * (ui/game/dashboard.js — bascule de vue avant de défiler) et la surbrillance
 * du tutoriel (ui/game/tutorial-highlight.js — fait clignoter l'onglet).
 *
 * @module engine/runtime/mobile-views
 */

/** Vues de premier niveau → fenêtres affichées. */
export const MOBILE_VIEW_WINS = Object.freeze({
  adventure: ['win-map', 'win-tabs', 'win-story'],
  combat: ['win-battle', 'win-pokeballs'],
  team: ['win-team'],
  shortcuts: ['win-shortcuts', 'win-currency'],
});

/** Sous-vues « Gestion » → fenêtres affichées. */
export const MOBILE_MANAGE_WINS = Object.freeze({
  hatchery: ['win-hatchery'],
  training: ['win-training'],
  mine: ['win-mine'],
  base: ['win-base'],
});

/**
 * @param {string} winId  id d'une fenêtre du tableau de bord (ex. 'win-pokeballs')
 * @returns {{view: string, manage?: string}|null} vue mobile qui l'affiche
 */
export function pwMobileViewForWin(winId) {
  if (winId === 'win-achievements') return { view: 'adventure' };
  for (const view of Object.keys(MOBILE_VIEW_WINS)) {
    if (MOBILE_VIEW_WINS[view].indexOf(winId) !== -1) return { view };
  }
  for (const manage of Object.keys(MOBILE_MANAGE_WINS)) {
    if (MOBILE_MANAGE_WINS[manage].indexOf(winId) !== -1) return { view: 'manage', manage };
  }
  return null;
}

if (typeof globalThis !== 'undefined') globalThis.pwMobileViewForWin = pwMobileViewForWin;
