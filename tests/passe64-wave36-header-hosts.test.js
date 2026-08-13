/**
 * Vague 36 — « Les panneaux résumé, afk, éditeur pnj, éditeur pc base n'ont
 * toujours pas exactement le même header que les autres. »
 *
 * Deux défauts DISTINCTS subsistaient après la vague 35, aucun des deux dans
 * le composant d'en-tête lui-même (qui était bien partagé partout) :
 *
 *  A) L'HÔTE poussait la bande vers l'intérieur.
 *     - `#battle-summary-inner` héritait du `padding: 20px` de la règle
 *       groupée des coques modales  -> bande à 21/21 au lieu de 1/1,
 *       largeur 1038 sur 1080.
 *     - `.afk-result-card` déclarait `padding: 16px`
 *       -> bande à 17/17, largeur 586 sur 620.
 *     C'est exactement le défaut corrigé pour les panneaux de gestion à la
 *     vague 35 (`#poke-modal-inner.management-inner`) et pour `#settings-inner`
 *     à la vague 28, jamais généralisé à ces deux coques.
 *     Remède constant : la coque ne pousse plus, le retrait passe au CONTENU.
 *
 *  B) La coque `.pw-panel-shell` (PC de base, dialogue PNJ, éditeur PNJ)
 *     forçait `border-radius: 0 !important` + `margin: 0 !important` au nom
 *     d'un alignement sur « la fenêtre de quête ». Mesure faite en direct :
 *     la fenêtre de quête porte en réalité radius 10px / marge basse 12px.
 *     La prémisse de la vague 30 était fausse ; ces trois panneaux étaient
 *     les SEULS du jeu à porter une bande à angles vifs collée au corps.
 *
 * Référence mesurée (Playwright, 11 panneaux) après correctif :
 *   inset 1/1, radius 10px, margin-bottom 12px — pour sac, marché, pokédex,
 *   pension, mine, réglages, quêtes, résumé, afk, PC de base, éditeur PNJ.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = readFileSync(join(ROOT, 'src/assets/styles/design-system.css'), 'utf8');

/**
 * Corps de la règle QUI GAGNE au niveau racine pour ce sélecteur.
 * (Leçon de la vague 35 : un doublon mort en amont peut faire lire l'ancienne
 * valeur et donner un faux échec — c'est la DERNIÈRE déclaration qui compte.)
 */
function winningRule(selector) {
  const needle = `\n${selector} {`;
  const i = CSS.lastIndexOf(needle);
  assert.notEqual(i, -1, `règle introuvable au niveau racine : ${selector}`);
  return CSS.slice(i + 1, CSS.indexOf('}', i + 1));
}

// ══════════ A. les hôtes n'enfoncent plus la bande ══════════

test('vague 36 A1: #battle-summary-inner ne pousse plus la bande (pas de retrait en haut/à gauche)', () => {
  const body = winningRule('#battle-summary-inner');
  const pad = (body.match(/padding:\s*([^;]+);/) || [])[1];
  assert.ok(pad, '#battle-summary-inner doit déclarer explicitement son padding');
  // La bande doit toucher le bord : aucun retrait en haut ni sur les côtés.
  assert.match(pad.trim(), /^0(\s|$)/,
    `le padding de la coque doit commencer par 0 (haut) — lu: "${pad.trim()}"`);
  assert.doesNotMatch(pad, /^\s*20px\s*$/, 'le padding uniforme de 20px est le défaut d’origine');
});

test('vague 36 A2: le retrait du résumé est déplacé sur le contenu, pas sur la coque', () => {
  assert.match(CSS, /#battle-summary-inner\s*>\s*\.pw-view\s*>\s*\*:not\(\.modal-title\)\s*\{[^}]*margin-left:\s*20px/,
    'les enfants hors bande portent le retrait latéral (le .pw-view est display:contents)');
});

test('vague 36 A3: .afk-result-card ne pousse plus la bande', () => {
  const body = winningRule('.afk-result-card');
  const pad = (body.match(/padding:\s*([^;]+);/) || [])[1];
  assert.ok(pad, '.afk-result-card doit déclarer son padding');
  assert.match(pad.trim(), /^0(\s|$)/, `retrait haut/côtés nul attendu — lu: "${pad.trim()}"`);
  assert.match(CSS, /\.afk-result-card\s*>\s*\*:not\(\.modal-title\)\s*\{[^}]*margin-left:\s*16px/,
    'le retrait est reporté sur les enfants hors bande');
});

test('vague 36 A4: la carte AFK ne cumule pas gap + marge canonique sous la bande', () => {
  // .afk-result-card est une grille avec gap:12px ; la marge basse canonique
  // de 12px s'y ajouterait (24px au lieu de 12). Elle est donc neutralisée ICI
  // — et seulement ici.
  assert.match(CSS, /\.afk-result-card\s*>\s*\.modal-title:first-child\s*\{[^}]*margin-bottom:\s*0/,
    'la marge basse est neutralisée sur la carte AFK (le gap de la grille la fournit)');
});

// ══════════ B. la coque .pw-panel-shell porte la bande canonique ══════════

test('vague 36 B1: .pw-panel-shell ne force plus une bande à angles vifs', () => {
  const body = winningRule('.pw-panel-shell > .modal-title');
  assert.doesNotMatch(body, /border-radius:\s*0\s*!important/,
    'le rayon 0 de la vague 30 (prémisse fausse) doit avoir disparu');
  assert.match(body, /border-radius:\s*var\(--pw-header-radius\)/,
    'le rayon vient du jeton canonique');
});

test('vague 36 B2: .pw-panel-shell rétablit l’espace canonique sous la bande', () => {
  const body = winningRule('.pw-panel-shell > .modal-title');
  assert.doesNotMatch(body, /margin:\s*0\s*!important/, 'la marge 0 de la vague 30 doit avoir disparu');
  assert.match(body, /margin:\s*0 0 var\(--pw-header-gap\) 0/,
    'la respiration sous la bande vient du jeton --pw-header-gap');
});

test('vague 36 B3: seul le contrat de colonne reste local à la coque', () => {
  const body = winningRule('.pw-panel-shell > .modal-title');
  assert.match(body, /flex:\s*none/, 'la bande ne doit pas s’étirer dans la colonne flex');
  // Aucune géométrie propre : ni hauteur, ni fond, ni bordure, ni padding.
  for (const prop of ['height', 'background', 'border-bottom', 'padding', 'font-size']) {
    assert.doesNotMatch(body, new RegExp(`(^|[^-])${prop}:`),
      `la coque ne doit PAS redéclarer « ${prop} » (source unique = bloc canonique)`);
  }
});

// ══════════ C. cohérence d'ensemble des hôtes de panneau ══════════

test('vague 36 C: tous les hôtes de panneau appliquent le même remède', () => {
  // #settings-inner (vague 28), .management-inner (vague 35),
  // #battle-summary-inner + .afk-result-card (vague 36) : aucun ne doit
  // conserver un retrait uniforme qui enfoncerait la bande.
  const hotes = ['#settings-inner', '#poke-modal-inner.management-inner',
    '#battle-summary-inner', '.afk-result-card'];
  for (const h of hotes) {
    const body = winningRule(h);
    const pad = (body.match(/padding:\s*([^;]+);/) || [])[1];
    if (!pad) continue; // pas de padding déclaré = rien à enfoncer
    assert.match(pad.trim(), /^0(\s|$)/,
      `${h} enfonce encore sa bande (padding "${pad.trim()}")`);
  }
});
