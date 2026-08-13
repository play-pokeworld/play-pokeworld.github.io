/**
 * Wave 35 — PLACEMENT des en-têtes de panneau (retour utilisateur)
 *
 * Défaut signalé : « sur les panneaux de gestion (pension, mine et
 * entraînement) le header est placé différemment des autres ».
 *
 * Les vagues précédentes avaient unifié le LOOK (fond, bordures, hauteur)
 * puis la STRUCTURE (panelHeaderVNode, un seul constructeur). Le balisage
 * de ces trois panneaux était donc déjà le bon — le défaut venait de
 * l'HÔTE : `#poke-modal-inner.management-inner` appliquait `padding: 16px`,
 * ce qui poussait l'en-tête de 17px vers l'intérieur et le rendait 34px
 * plus étroit que son panneau, alors que tous les panneaux de référence
 * laissent leur en-tête occuper toute la largeur, à fleur de bordure.
 *
 * Mesures avant correctif (Chromium) :
 *   sac (référence) : décalage 1px  (= la bordure seule)
 *   pension/mine/entraînement : décalage 17px, largeur 946 pour 980
 *
 * LA LEÇON, et la raison d'être de ce fichier : un en-tête peut être
 * parfaitement conforme et rester MAL PLACÉ, parce que le padding du
 * conteneur le déplace. Les audits « même classe / même règle » ne voient
 * pas ça. On teste donc le CONTENANT, pas seulement l'en-tête.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const R = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CSS = R('src/assets/styles/design-system.css');

/**
 * Extrait le corps de la règle QUI GAGNE pour ce sélecteur.
 *
 * Piège rencontré en écrivant ce test : `#poke-modal-inner.management-inner`
 * était déclaré DEUX fois (un doublon mort plus haut dans le fichier). Lire
 * la première occurrence donnait l'ancien `padding: 16px` et faisait échouer
 * un correctif pourtant appliqué. À spécificité égale, c'est la DERNIÈRE
 * déclaration au niveau racine qui l'emporte : c'est donc elle qu'on audite.
 * Les blocs `@media` sont exclus (ils sont indentés).
 */
function ruleBody(css, selector) {
  const needle = `\n${selector} {`;
  const i = css.lastIndexOf(needle);
  assert.notEqual(i, -1, `règle introuvable au niveau racine : ${selector}`);
  const start = i + 1;
  return css.slice(start, css.indexOf('}', start));
}

test('wave 35: le shell de gestion ne décale plus son en-tête (padding 0)', () => {
  const body = ruleBody(CSS, '#poke-modal-inner.management-inner');
  // C'est LE correctif : plus de padding sur la coque, donc l'en-tête est
  // à fleur de bordure comme dans tous les autres panneaux.
  assert.ok(/padding:\s*0;/.test(body), 'la coque de gestion ne doit plus appliquer de padding (il décalait l’en-tête)');
  assert.ok(!/padding:\s*16px;/.test(body), 'l’ancien padding 16px de la coque a bien disparu');
  // Le gap séparait aussi l'en-tête du contenu en le détachant du bord.
  assert.ok(/gap:\s*0;/.test(body), 'plus de gap de coque entre l’en-tête et le contenu');
});

test('wave 35: le retrait de 16px a été déplacé sur le contenu, pas supprimé', () => {
  const body = ruleBody(CSS, '.management-shell');
  assert.ok(/padding:\s*0 16px 16px;/.test(body), 'le retrait vit désormais sous l’en-tête (contenu seulement)');
  assert.ok(/box-sizing:\s*border-box;/.test(body), 'box-sizing pour que le retrait ne déborde pas la coque');
});

test('wave 35: même remède que #settings-inner (vague 28) — cohérence des coques', () => {
  // Réglages avait EXACTEMENT le même défaut, corrigé en vague 28 : coque à
  // padding nul + retrait déporté sur le corps défilant. Les deux coques
  // doivent rester alignées sur ce contrat, sinon l'une redivergera.
  const settings = ruleBody(CSS, '#settings-inner');
  assert.ok(/padding:\s*0;/.test(settings), 'la coque des réglages reste à padding nul');
  const mgmt = ruleBody(CSS, '#poke-modal-inner.management-inner');
  assert.ok(/padding:\s*0;/.test(mgmt), 'la coque de gestion suit le même contrat');
});

test('wave 35: l’en-tête de gestion n’a plus qu’un rôle de mise en page', () => {
  // Aucune peinture locale : le fond/les bordures viennent de la règle
  // canonique. Seul le rôle flex reste local.
  const body = ruleBody(CSS, '#poke-modal-inner.management-inner .management-title');
  assert.ok(!/background:/.test(body), 'aucun fond local sur l’en-tête de gestion');
  assert.ok(!/border-bottom:/.test(body), 'aucune bordure basse locale sur l’en-tête de gestion');
  assert.ok(!/padding:/.test(body), 'aucun padding local (la géométrie vient du bloc canonique)');
});

test('wave 35: les trois panneaux de gestion partagent UNE seule coque', () => {
  // pension / entraînement / mine passent tous par .management-inner :
  // corriger la coque les corrige tous les trois, par construction.
  const view = R('src/ui/views/ManagementMenuView.js');
  assert.ok(view.includes('panelHeaderVNode'), 'l’en-tête vient du constructeur partagé');
  assert.ok(/management-shell management-\$\{m\.machine\}/.test(view), 'une coque unique paramétrée par machine');
});
