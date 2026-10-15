// PASSE 32 — RÉCONCILIATION DOM ("morphing") POUR LA RANGÉE DE COMBAT
//
// PROBLÈME RAPPORTÉ PAR LE JOUEUR
// « La Poké Ball qui tourne se reset à chaque Pokémon adverse. Le problème
//   n'est pas vraiment la Poké Ball mais la page de combat entière qui se
//   refresh au lieu de refresh uniquement les bons éléments. »
//
// DIAGNOSTIC
// `renderBattleTeamRow()` reconstruisait une chaîne HTML complète puis la
// posait d'un bloc (`_pwSetHtmlSafe(row, html)`). Chaque appel — et il y en a
// un à chaque attaque, chaque changement de statut, chaque capture, chaque
// rencontre — DÉTRUISAIT tous les noeuds pour en recréer des neufs. Or une
// animation CSS est portée par le NOEUD : détruire le noeud remet fatalement
// l'animation à son temps zéro. La Poké Ball décorative (`pw28-flair-spin`,
// 12 s) n'avait donc jamais le temps de faire un tour complet, et le sautillement
// des sprites repartait sans cesse du même pied.
//
// SOLUTION
// On garde intégralement le rendu par chaîne HTML (l'architecture existante,
// le composant `PokeFullCard`, le contrat `_pwSetHtmlSafe`) : on change
// seulement la façon de POSER le résultat. Le HTML est parsé dans un conteneur
// détaché, puis comparé au DOM en place noeud par noeud :
//   - même tag + même clé  → on met à jour les attributs et on descend dans
//     les enfants ; le noeud d'origine SURVIT, donc ses animations continuent ;
//   - noeud différent      → on remplace, uniquement celui-là ;
//   - noeud en trop/manquant → on retire / on insère ponctuellement.
//
// Résultat : entre deux rendus, une carte de combat qui reste « la même carte »
// n'est jamais recréée. La Poké Ball tourne en continu, y compris quand le
// Pokémon adverse change, exactement comme demandé.
//
// NOTE DE CONTRAT — ce module n'écrit JAMAIS `.innerHTML` en direct : il passe
// par `_pwSetHtmlSafe` (contrat de puits HTML vérifié par
// `tools/validate-project.mjs`).

// Attributs qui ne doivent jamais être recopiés aveuglément : ils sont pilotés
// par le moteur au moment du rendu et non par le balisage.
const _PW_MORPH_SKIP = Object.create(null);

/**
 * Clé d'identité d'un élément : deux noeuds de même clé sont « le même
 * élément » d'un rendu à l'autre, donc morphés plutôt que remplacés.
 * On privilégie une clé explicite, sinon l'identité visuelle de la carte.
 * @param {Element} el
 * @returns {string}
 */
function morphKey(el) {
  if (!el || el.nodeType !== 1) return '';
  const explicit = el.getAttribute && el.getAttribute('data-pw-key');
  if (explicit) return 'k:' + explicit;
  const id = el.id;
  if (id) return 'id:' + id;
  return '';
}

/**
 * Signature de compatibilité : au-delà de la clé, deux noeuds ne sont morphés
 * que s'ils sont de même nature (même balise).
 * @param {Node} a
 * @param {Node} b
 * @returns {boolean}
 */
function sameKind(a, b) {
  if (!a || !b) return false;
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType === 1) {
    if (a.tagName !== b.tagName) return false;
    const ka = morphKey(a);
    const kb = morphKey(b);
    // Deux noeuds explicitement identifiés ne se confondent jamais.
    if (ka || kb) return ka === kb;
    return true;
  }
  return true;
}

/**
 * Aligne les attributs de `target` sur ceux de `source`.
 * @param {Element} target
 * @param {Element} source
 */
function morphAttributes(target, source) {
  const srcAttrs = source.attributes;
  for (let i = 0; i < srcAttrs.length; i++) {
    const { name, value } = srcAttrs[i];
    if (_PW_MORPH_SKIP[name]) continue;
    if (target.getAttribute(name) !== value) target.setAttribute(name, value);
  }
  // Retrait des attributs disparus (parcours à l'envers : liste vivante).
  const tgtAttrs = target.attributes;
  for (let i = tgtAttrs.length - 1; i >= 0; i--) {
    const name = tgtAttrs[i].name;
    if (_PW_MORPH_SKIP[name]) continue;
    if (!source.hasAttribute(name)) target.removeAttribute(name);
  }
}

/**
 * Réconcilie récursivement les enfants de `target` avec ceux de `source`.
 * @param {Element} target
 * @param {Element} source
 */
function morphChildren(target, source) {
  let tChild = target.firstChild;
  let sChild = source.firstChild;

  while (sChild) {
    const sNext = sChild.nextSibling;

    if (!tChild) {
      // Plus rien en face : on ajoute le noeud manquant.
      target.appendChild(sChild.cloneNode(true));
      sChild = sNext;
      continue;
    }

    const tNext = tChild.nextSibling;

    if (sameKind(tChild, sChild)) {
      morphNode(tChild, sChild);
      tChild = tNext;
      sChild = sNext;
      continue;
    }

    // Noeuds incompatibles : on tente de retrouver plus loin, dans la cible, un
    // noeud de même clé (cas d'un réordonnancement) ; sinon on remplace.
    const wantedKey = morphKey(sChild);
    let matched = null;
    if (wantedKey) {
      let probe = tChild;
      while (probe) {
        if (
          probe.nodeType === 1 &&
          morphKey(probe) === wantedKey &&
          probe.tagName === sChild.tagName
        ) {
          matched = probe;
          break;
        }
        probe = probe.nextSibling;
      }
    }

    if (matched) {
      // On ramène le noeud existant à sa place, animations intactes.
      if (matched !== tChild) target.insertBefore(matched, tChild);
      morphNode(matched, sChild);
      tChild = matched.nextSibling;
      sChild = sNext;
      continue;
    }

    target.replaceChild(sChild.cloneNode(true), tChild);
    tChild = tNext;
    sChild = sNext;
  }

  // Surplus dans la cible : on élague.
  while (tChild) {
    const tNext = tChild.nextSibling;
    target.removeChild(tChild);
    tChild = tNext;
  }
}

/**
 * Réconcilie un noeud (texte ou élément).
 * @param {Node} target
 * @param {Node} source
 */
function morphNode(target, source) {
  if (target.nodeType === 3 || target.nodeType === 8) {
    if (target.nodeValue !== source.nodeValue) target.nodeValue = source.nodeValue;
    return;
  }
  if (target.nodeType !== 1) return;
  morphAttributes(target, source);
  morphChildren(target, source);
}

/**
 * Pose `html` dans `host` en préservant les noeuds inchangés.
 *
 * C'est le remplaçant direct de `_pwSetHtmlSafe(host, html)` pour les surfaces
 * animées : même entrée, même résultat visuel, mais sans détruire le DOM
 * existant — donc sans réinitialiser les animations CSS en cours.
 *
 * @param {Element} host  conteneur à mettre à jour
 * @param {string}  html  balisage complet du conteneur
 */
function pwMorphHtml(host, html) {
  if (!host) return;
  const doc = host.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc) return;

  // Conteneur détaché : on réutilise le puits HTML canonique du projet.
  const scratch = doc.createElement('div');
  if (typeof globalThis._pwSetHtmlSafe === 'function') globalThis._pwSetHtmlSafe(scratch, html);
  else if (typeof globalThis.pwSetHtml === 'function') globalThis.pwSetHtml(scratch, html);
  else return;

  // Premier rendu : rien à préserver, on greffe directement.
  if (!host.firstChild) {
    while (scratch.firstChild) host.appendChild(scratch.firstChild);
    return;
  }

  morphChildren(host, scratch);
}

if (typeof globalThis !== 'undefined') {
  globalThis.pwMorphHtml = pwMorphHtml;
}

export { pwMorphHtml, morphKey };
