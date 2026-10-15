// V7 · DBT-05 — L'UNIQUE échappement HTML du projet (texte et valeurs d'attributs).
// Toute autre fonction (`esc` du vdom, `escHtml` de save.js, `_esc` des composants
// hérités, le message de `pwConfirm`) délègue ici : une seule table, un seul contrat.
//
// NOTE : l'apostrophe reste brute — le sérialiseur vdom et le balisage hérité mettent
// TOUJOURS les valeurs d'attributs entre guillemets doubles, donc ' est sûr et les
// arguments data-* restent lisibles et greppables (data-call-args="'id'").

/**
 * @param {*} v
 * @returns {string}
 */
export function esc(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
