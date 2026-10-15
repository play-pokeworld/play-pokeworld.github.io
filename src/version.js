/**
 * PokéWorld — version unique (V7, décision joueur du 2026-10-14).
 *
 * FICHIER GÉNÉRÉ par tools/gen-version.mjs depuis package.json — NE PAS ÉDITER.
 * Pour changer la version : modifier « version » dans package.json puis
 * `npm run build` (ou `node tools/gen-version.mjs`).
 *
 * Une seule version, un chiffre clair : `MAJEUR.MINEUR.CORRECTIF`.
 *   - MAJEUR  = génération de la roadmap (7 = ROAD_MAP_V7) ;
 *   - MINEUR  = +1 à chaque livraison jouable (zip) — 7.0 = passe P0a,
 *               7.1 = P0b + P1, 7.2 = P2, … ;
 *   - CORRECTIF = +1 pour une correction livrée seule entre deux passes.
 *
 * Affichée telle quelle en bas des Réglages (`#pw-build-stamp`) et dans
 * l'export Diagnostic (OBS-01). `PW_BUILD` reste exposé comme alias de
 * `PW_VERSION` pour les sondes et les harnais.
 */

export const PW_VERSION = '7.3.2';
export const PW_BUILD = PW_VERSION;

if (typeof window !== 'undefined') {
  window.PW_VERSION = PW_VERSION;
  window.PW_BUILD = PW_BUILD;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PW_VERSION = PW_VERSION;
  globalThis.PW_BUILD = PW_BUILD;
}
