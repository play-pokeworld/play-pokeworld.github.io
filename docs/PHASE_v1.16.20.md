# Phase 1.16.20 — Bornes de scroll des fenêtres tactiles

**Date :** 4 novembre 2026  
**Branche :** `Rework`  
**Nature :** correctif responsive ciblé, sans changement d'architecture ni de schéma de sauvegarde.

## 1. Constat et cause

L'audit a confirmé que le jeu dispose déjà de surfaces centralisées distinctes : les fenêtres modales ont un corps `.win-body`, les écrans plein écran ont leur corps `.pw-modal-body`, et `ScrollLock` bloque la page sous-jacente pendant l'ouverture des couches sur les layouts tactiles.

Il restait toutefois une faiblesse dans le gabarit commun des fenêtres modales : leurs limites étaient exprimées en `vh`, et le corps flex ne déclarait pas explicitement sa capacité à rétrécir dans le cadre. Les règles propres à la fiche Pokémon reprenaient aussi `85vh`. Sur un navigateur mobile dont la zone visible varie avec les barres du navigateur ou le clavier logiciel, le viewport CSS utilisé par `vh` peut dépasser la zone réellement visible.

## 2. Modifications

- `assets/css/components/ui-panel.css` : les fenêtres modales du parcours tactile plafonnent désormais leur hauteur sur `100dvh`, en gardant un fallback `100vh` et en tenant compte des safe areas.
- Le corps commun des modales peut rétrécir (`min-height: 0`) et contient la chaîne de scroll avec `overscroll-behavior: contain`.
- La fiche Pokémon sur écran étroit utilise les mêmes limites `dvh` pour sa hauteur et sa hauteur maximale ; ses dimensions bureau restent inchangées.
- `tests/MobileTouchCss.test.js` verrouille ces règles communes.
- Version `1.16.20` synchronisée entre `package.json`, `package-lock.json` et `GameConfig.VERSION`. Aucun champ de sauvegarde n'a changé.
- `start.bat` remis au format CRLF requis par `Rules.md`.

Aucun système de responsive, d'interaction ou d'événement parallèle n'a été introduit. Aucun test ne simule ici Safari iOS ou un appareil tactile physique.

## 3. Vérifications

- `npm test` : résultat à consigner après la passe finale ; le contrôle initial avait un échec de fins de ligne CRLF dans `start.bat`, corrigé dans cette phase.
- `tests/browser/MobileTouch.mjs` : 14/14 réussis dans Chromium, profil iPhone 13 émulé en 390 × 664, gestes tactiles CDP.
- `tests/browser/PanelFit.mjs` : 7/7 réussis ; neuf largeurs, 12 lieux et labels anglais selon la suite existante.
- `tests/browser/MarketAndResponsiveTraining.mjs` : **19 scénarios réussis**, puis échec préexistant à la ligne 819 (quantité attendue 12, constatée 10). Le test s'exécute seul ; il ne s'agit pas d'un timeout réseau. Le document `PHASE_v1.16.19.md` signale déjà cette assertion comme échec antérieur à la phase.
- `tests/browser/InteractionCorrections.mjs` : **5 scénarios réussis**, puis l'étape clic droit échoue à attendre `#poke-modal-inner .modal-close`. Échec reproductible dans cette suite ; la cause produit/test reste à établir et n'a pas été corrigée dans le présent correctif de responsive.
- L'installation des dépendances Playwright signale l'absence de deux paquets de polices optionnels dans l'image Debian, mais Chromium a pu s'exécuter après installation des bibliothèques système disponibles.
- Aucun test sur appareil physique, ni sur Safari/WebKit ou Firefox.

## 4. Limites et suites

Cette livraison corrige les limites de hauteur au niveau partagé des fenêtres modales, mais ne prétend pas certifier individuellement chaque écran ou chaque action du jeu. La suite `MobileTouch` couvre les filtres, le sac, la boîte, le Pokédex, la fiche Pokémon, les gestes d'appui long, le verrouillage de page et une orientation paysage ; elle ne constitue pas un parcours complet de gameplay. Les tests navigateur échoués/non exécutés doivent être investigués séparément avant d'être considérés comme réussis.
