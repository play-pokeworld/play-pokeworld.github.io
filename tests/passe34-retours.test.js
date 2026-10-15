// ════════════════════════════════════════════════════════════════════════════
// PASSE 34 — les 4 retours joueur rejetés à l'issue de la passe 33
// ════════════════════════════════════════════════════════════════════════════
// 1. le survol des cartes de combat ne doit RIEN faire      → §34.1
// 2. les sprites du banc sont trop petits                   → --pc-bench-sprite
// 3. la transition sol/ciel ne doit pas être une ligne      → §34.2
// 4. « Exploration au repos » revient en pleine expédition  → §34.3
//
// Le retour n°4 a coûté cher : trois hypothèses successives ont été invalidées
// (portée des symboles, `_dgRunActive`, style inline). La cause réelle était
// une règle §32.6 `:has(#battle-active-scene:not(.is-live))` de spécificité
// SUPÉRIEURE, qui rallumait l'écran de repos dès que la scène était éteinte —
// donc aussi entre deux paliers, où le combat est arrêté volontairement.
// D'où deux garde-fous ici : le drapeau `data-dungeon-run` doit exister, ET
// aucune règle ne doit rallumer l'écran de repos pendant une expédition.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

const CSS = readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
const DUNGEON = readFileSync(new URL('../src/application/world/dungeon-run.js', import.meta.url), 'utf8');
const FLOW = readFileSync(new URL('../src/application/combat/battle-flow.js', import.meta.url), 'utf8');

/** Tranche de la feuille couvrant une section « 34.x ». */
function section(n) {
  const start = CSS.indexOf(`── 34.${n} —`);
  assert.notStrictEqual(start, -1, `section 34.${n} introuvable`);
  const next = CSS.indexOf(`── 34.${n + 1} —`, start);
  return CSS.slice(start, next === -1 ? CSS.length : next);
}

// ─── Retour 1 : le survol ────────────────────────────────────────────────────
test('34.1 — les 4 blocs neutralisants ont été retirés au profit d\'une exclusion', () => {
  // Empiler des `!important` scopés était inopérant : on a supprimé les blocs
  // §30/§31/§32.3/§33.3 et corrigé les règles fautives à la source.
  const supprimes = CSS.match(/\[PASSE 34\] Bloc .+ SUPPRIMÉ/g) || [];
  assert.ok(supprimes.length >= 4,
    `les 4 blocs neutralisants doivent être supprimés (trouvés : ${supprimes.length})`);
  // les deux règles fautives historiques excluent désormais la rangée
  assert.match(CSS, /:not\(#battle-team-row\)\s*>\s*\.poke-card:hover/);
});

// ─── Retour 2 : la taille du banc ────────────────────────────────────────────
test('34.x — le banc est lisible sans décaler les combattants', () => {
  // 96 px est la taille NATIVE du sprite : en dessous, `object-fit: contain`
  // bride le dessin quelle que soit la hauteur de la boîte.
  assert.match(CSS, /--pc-bench-sprite:\s*104px/);
  assert.match(CSS, /--pc-bench-sprite-h:\s*112px/);
});

// ─── Retour 3 : la transition sol / ciel ─────────────────────────────────────
test('34.2 — trois frises SVG découpées, en trois profondeurs (passe 38)', () => {
  // PASSE 36 — retour joueur : la végétation flottait 16 vh au-dessus des
  // rochers. La végétation et les rochers partagent la ligne de sol.
  // PASSE 38 — retour joueur : des rochers DEVANT ET DERRIÈRE les arbres.
  // Trois couches désormais : html::before = rochers/buissons lointains sur la
  // ligne d'herbe (derrière), html::after = végétation sur la ligne de sol,
  // #pw-land-fg = gros rochers de premier plan sur la ligne de sol (devant).
  const s = section(2);
  assert.match(s, /mask/, 'les silhouettes sont découpées au masque SVG');
  assert.match(s, /svg\+xml/, 'les frises sont des SVG inline en data-URI');
  assert.match(CSS, /--pw-land-h-grass:\s*72vh/);
  assert.match(CSS, /--pw-land-h-ground:\s*88vh/);
  assert.match(CSS, /html::before\s*\{[^}]*mask-position:[^;]*calc\(var\(--pw-land-h-ground\)\s*-\s*26px\)/,
    'les rochers/buissons lointains sont calés sur la ligne de sol (derrière les arbres, PASSE 38 : plus de ligne haute)');
  assert.match(CSS, /html::after\s*\{[^}]*mask-position:[^;]*calc\(var\(--pw-land-h-ground\)\s*-\s*64px\)/,
    'la frise végétale est calée sur la ligne de sol');
  assert.match(CSS, /#pw-land-fg\s*\{[^}]*mask-position:[^;]*calc\(var\(--pw-land-h-ground\)\s*-\s*38px\)/,
    'les rochers de premier plan sont calés sur la ligne de sol, DEVANT la végétation');
  assert.match(CSS, /#pw-land-fg\s*\{[^}]*z-index:\s*-1/,
    'le premier plan passe devant la végétation (z -2)');
  assert.ok(!/mask-position:[^;]*\d+%/.test(s),
    'aucune position de masque en pourcentage (elle dériverait)');
  // le rocher doit CONTRASTER avec sa bande, sinon la silhouette est invisible
  assert.match(CSS, /--pw-land-rock:\s*color-mix\(in srgb, var\(--pw-land-ground\) 72%, #cfc6a8 28%\)/);
  assert.match(CSS, /--pw-land-rock-bg:\s*color-mix\(/, 'l\'arrière-plan a sa teinte dédiée');
});

// ─── Retour 4 : l'écran de repos pendant une expédition ──────────────────────
test('34.3 — un drapeau sur <html> porte l\'état d\'expédition', () => {
  // Le style inline ne survivait pas au morphing du DOM (l'attribut `style`
  // est reconstruit) ; un attribut sur <html> traverse tous les rendus.
  assert.match(DUNGEON, /_dgSyncRunFlag/, 'la fonction de synchronisation doit exister');
  assert.match(DUNGEON, /setAttribute\(\s*'data-dungeon-run'\s*,\s*'1'\s*\)/);
  assert.match(DUNGEON, /removeAttribute\(\s*'data-dungeon-run'\s*\)/);
  // le drapeau est resynchronisé à chaque rafraîchissement du bandeau
  const refresh = DUNGEON.slice(DUNGEON.indexOf('function refreshDungeonPanel'));
  assert.match(refresh.slice(0, 400), /_dgSyncRunFlag\(\)/,
    'refreshDungeonPanel doit resynchroniser le drapeau');
});

test('34.3 — aucune règle ne rallume l\'écran de repos pendant une expédition', () => {
  const sansCommentaires = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const coupables = [];
  for (const [, selecteurs, corps] of sansCommentaires.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/#battle-idle-screen/.test(selecteurs)) continue;
    // on ne regarde que les règles qui ALLUMENT l'écran
    if (!/display:\s*(flex|block)/.test(corps)) continue;
    // …et qui ne se désactivent pas d'elles-mêmes en expédition
    if (/:not\(\[data-dungeon-run/.test(selecteurs)) continue;
    if (/html:not\(\[data-dungeon-run/.test(selecteurs)) continue;
    // La règle de base `#battle-idle-screen { display:flex }` est légitime :
    // c'est l'état normal hors donjon. Elle est battue par la règle drapeau
    // `html[data-dungeon-run="1"] #battle-idle-screen`, de spécificité
    // supérieure (0,2,1 contre 0,1,0) — vérifié par le test suivant.
    // Ne sont fautives que les règles AU MOINS aussi spécifiques que celle-ci.
    const specifiqueEtImportante = /:has\(|>|~|\s#|\.[\w-]+\s+#/.test(selecteurs.trim());
    if (!specifiqueEtImportante) continue;
    coupables.push(selecteurs.trim().replace(/\s+/g, ' ').slice(0, 90));
  }
  assert.deepEqual(coupables, [],
    'toute règle allumant l\'écran de repos doit s\'exclure en expédition');
});

test('34.3 — la règle de masquage existe et cible bien le drapeau', () => {
  assert.match(CSS, /html\[data-dungeon-run="1"\]\s*#battle-idle-screen\s*\{\s*display:\s*none\s*!important/);
});

test('34.3 — le résumé de session ne surgit pas entre deux paliers', () => {
  // Second volet du retour n°4 : « la fenêtre de fin de combat s'ouvre ».
  // `endBattle()` ouvrait le résumé dès qu'il y avait du butin — donc à chaque
  // palier, puisque le combat y est arrêté volontairement. Défaut invisible
  // pour les sondes DOM : il a fallu une CAPTURE pour le voir.
  assert.ok(wsMatch(FLOW, /if\(hadLoot && !_dgRunActive\) openBattleSummary\(true\);/), // V7 · DBT-01
    'l\'ouverture automatique du résumé doit être conditionnée à l\'expédition');
});

