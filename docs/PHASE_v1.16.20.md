# Phase 1.16.20 — Correctifs responsive et scroll des fenêtres

**Date :** 4 novembre 2026  
**Branche :** `Rework`  
**Nature :** corrections dans les gabarits et feuilles propriétaires existants ; aucun changement du schéma de sauvegarde.

## 1. Audit et cause racine

Les fenêtres ont déjà des surfaces de scroll partagées : `.win-body` dans les modales et `.pw-modal-body` dans les écrans plein écran. `ScrollLock` protège la page sous une couche tactile. La défaillance commune relevée en poursuivant l'audit venait d'une règle responsive globale dans `core/base.css` : `body.mobile-mode .win-body { overflow: visible; }`. Sa spécificité écrasait les corps scrollables des modales (par exemple Settings), alors qu'elle devait uniquement préserver le flux naturel des fenêtres du tableau de bord.

D'autres faiblesses venaient de contraintes propres aux feuilles : les fenêtres Settings/Pokédex/Pnj avaient des plafonds `vh`, tandis que la grille des succès demandait une colonne minimale de 320 px et que son filtre était un enfant flex sans contrainte de rétrécissement.

## 2. Modifications

- **Cause globale du scroll :** les deux règles `body.mobile-mode .win-body` sont désormais limitées à `body.mobile-mode #main-dashboard .win-body`. Le flux normal du tableau de bord reste intact ; les fenêtres modales conservent leur scroll propre.
- **Gabarits modaux communs :** `dvh` avec fallback et safe areas pour les limites de hauteur tactile ; le corps flex peut rétrécir et le scroll imbriqué est confiné.
- **PNJ :** les fenêtres de dialogue de taille `sm` suivent la hauteur visible et la zone de dialogue reste scrollable.
- **Pokédex :** la fiche détaillée utilise une hauteur de fenêtre dynamique et son corps garde le scroll.
- **Settings :** limite dynamique adaptée au petit écran et corps de réglages explicitement rétrécissable avec propagation de scroll contenue.
- **Succès :** la barre de filtre peut rétrécir dans son parent ; les puces peuvent s'enrouler et les cartes n'imposent plus une largeur minimale PC de 320 px.
- Ajout de tests statiques et de `tests/browser/ReportedMobileWindows.mjs`, exposé via `npm run test:browser:reported-mobile`.
- Version 1.16.20 synchronisée dans package/config/lockfile ; aucun changement métier ni format de sauvegarde. `start.bat` est en CRLF conformément aux règles.

## 3. Vérifications

- `npm test` : **879 réussis, 0 échec**.
- `ReportedMobileWindows.mjs` : **20/20** vérifications (5 dimensions × 4 interfaces : Settings, dialogue PNJ, détail Pokédex, Succès) : 320×568, 390×844, 844×390, 768×1024, 1024×768. Contrôles du cadre, du débordement horizontal, de l'accès à la fin du scroll et de la barre/puces de filtre.
- `MobileTouch.mjs` : **14/14** sur Chromium avec iPhone 13 émulé en 390×664, gestes tactiles CDP et écran paysage.
- `PanelFit.mjs` : **7/7** ; dimensions/lieux/labels anglais suivant la suite du projet.
- Audit i18n : 0 clé manquante. Audit contraste : 147 paires vérifiées, toutes AA.
- `MarketAndResponsiveTraining.mjs` : 19 scénarios passent puis le test échoue sur quantité attendue 12 / observée 10 (déjà signalé comme échec antérieur). Non validé.
- `InteractionCorrections.mjs` : 5 scénarios passent puis l'étape clic droit ne trouve pas `#poke-modal-inner .modal-close`. Cause produit/test à établir. Non validé.
- Les tests navigateur tournent sous Chromium émulé seulement ; aucun appareil physique, Safari/WebKit ou Firefox n'a été testé.

## 4. Limites

Les interfaces signalées et les comportements génériques corrigés ont des contrôles reproductibles dans `ReportedMobileWindows.mjs`. Le jeu n'a pas fait l'objet d'un parcours exhaustif de toutes les fonctionnalités, combinaisons de modales, tailles raisonnables ou navigateurs. Les échecs ci-dessus restent ouverts et ne sont pas présentés comme réussis.
