// ════════════════════════════════════════════════════════════════════════════
// PASSE 38 — LE PAYSAGE EN TROIS PROFONDEURS
// ════════════════════════════════════════════════════════════════════════════
// Retour joueur : « possible de mettre des rochers devant et derrière les
// arbres, herbes, buissons ? ».
// Le paysage est peint en CSS pur :
//   body::after   → les 4 bandes (ciel → horizon → herbe → sol)   z −3
//   html::before  → rochers/buissons LOINTAINS, sur la ligne d'herbe  z −2
//   html::after   → arbres, herbes et buissons (la frise d'origine)  z −2
//   #pw-land-fg   → gros rochers + touffes d'herbe DEVANT, ligne de sol  z −1
// Ce module ne fait QUE garantir la présence du nœud `#pw-land-fg` (exactement
// comme `#pw-bg-pokemon-layer` pour les promeneurs) : la frise elle-même est
// un -webkit-mask porté par la feuille de style, aucun pixel de DOM par tuile.
//
// `pointer-events:none` + `aria-hidden` : la couche est invisible aux clics et
// aux lecteurs d'écran. z-index −1 : devant la végétation (−2), derrière les
// promeneurs (0) et toute l'interface (1).

/** Garantit que la couche de premier plan du paysage existe dans le DOM. */
function ensureLandscapeForeground() {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById('pw-land-fg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pw-land-fg';
    el.setAttribute('aria-hidden', 'true');
    // tout en bas du body : la couche est de toute façon en position fixe
    document.body.appendChild(el);
  }
  return el;
}

if (typeof document !== 'undefined') ensureLandscapeForeground();

// Surface classique (harnais VM, tests) + surface ES module.
if (typeof globalThis !== 'undefined')
  globalThis.ensureLandscapeForeground = ensureLandscapeForeground;
if (typeof window !== 'undefined') window.ensureLandscapeForeground = ensureLandscapeForeground;

export { ensureLandscapeForeground };
