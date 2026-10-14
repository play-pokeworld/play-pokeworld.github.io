/**
 * PokéWorld UI — help button (HLP-00)
 *
 * Le bouton « ? » placé dans l'en-tête de CHAQUE fenêtre du tableau de bord.
 * Il ouvre le panneau Guide directement sur la rubrique de la fenêtre
 * concernée (quêtes, équipe, pension, mine, combat, base, économie…).
 * Un seul gabarit pour toutes les fenêtres (même look que les autres
 * outils d'en-tête : .pw-win-tool-btn, comme la roue des Poké Balls).
 *
 * @module ui/components/help-button
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';

/** Fenêtre → rubrique du Guide (win-map a déjà son « ? » légende dédié). */
export const WIN_GUIDE_SECTION = {
  'win-story': 'quests',
  'win-team': 'pokemon',
  'win-hatchery': 'hatchery',
  'win-mine': 'mine',
  'win-battle': 'combat',
  'win-base': 'base',
  'win-currency': 'economy',
  'win-pokeballs': 'economy',
  'win-training': 'training',
  'win-tabs': 'map',
  'win-shortcuts': null, // pas de rubrique dédiée → accueil du Guide
};

/** Bouton « ? » d'en-tête (vdom) — ouvre le Guide à la rubrique `section`. */
export function winHelpButtonVNode(section) {
  const sectionAttr = section ? String(section) : '';
  return h('button', {
    type: 'button',
    class: 'pw-win-tool-btn pw-win-help-btn',
    dataset: { action: 'open-guide-section', section: sectionAttr, stopDrag: 'true' },
    title: '?',
    'aria-label': '?',
  }, '?');
}

/** Bouton « ? » d'en-tête (string HTML) pour les adaptateurs classiques. */
export function winHelpButtonHTML(section) { return toHTMLString(winHelpButtonVNode(section)); }

// Surface classique (consommateurs classiques + harnais VM).
if (typeof window !== 'undefined') {
  window.winHelpButtonHTML = winHelpButtonHTML;
  window.WIN_GUIDE_SECTION = WIN_GUIDE_SECTION;
}
if (typeof globalThis !== 'undefined') {
  globalThis.winHelpButtonHTML = winHelpButtonHTML;
  globalThis.WIN_GUIDE_SECTION = WIN_GUIDE_SECTION;
}

