# Phase 1.16.22 — Mobile battle reflow, map camera and update notice

**Date :** 5 novembre 2026  
**Branche :** `Rework`  
**Type :** correctif d'interface et notification de mise à jour ; schéma de sauvegarde inchangé.

## 1. Éléments remontés

- L'interface de combat se déforme sur mobile : sprites, informations et capacités ne restent pas dans une composition lisible.
- La carte ne propose plus les gestes et commandes de zoom/déplacement présents dans `main` et dans certaines versions de Rework.
- Les joueurs ne sont pas avertis lorsqu'une nouvelle version déployée est disponible.
- Une possibilité de version mobile Expo et d'exécutable Windows est demandée.

## 2. Corrections réalisées

- Le combat tactile repasse sur des cartes compactes à largeur réductible : sprite, informations/status et capacités ont des pistes distinctes, les libellés peuvent revenir à la ligne et le contenu reste dans le flux de page. Les cartes de l'équipe restent accessibles en faisant défiler la page.
- La carte retrouve une caméra SVG bornée : zoom par boutons accessibles, molette, pincement à deux doigts et déplacement tactile/souris lorsqu'elle est zoomée. Son cadrage survit aux rafraîchissements de la même région et revient au cadrage complet lors d'un changement de région.
- `UpdateSystem` vérifie une fois par minute la version du fichier de configuration déployé sur la même origine. Une bannière FR/EN est affichée si cette version dépasse la version locale ; le joueur peut recharger ou la fermer pour la session.
- Le portage React/Expo/Windows n'est pas lancé : Rework est une application DOM vanilla, pas React. Une note technique décrit les deux stratégies principales, leurs risques, et recommande l'enveloppe Expo WebView + Tauri sans réécrire le jeu, sous réserve d'une validation de portée.
- Version synchronisée dans `package.json`, `package-lock.json` et `GameConfig.VERSION` : **1.16.22**.

## 3. Tests et résultats

- `npm test` : **883 réussis, 0 échec** (inclut comparaison/versionnement de la bannière et présence des trois commandes accessibles de la carte).
- Analyse statique des imports, règles d'architecture, localisation FR/EN et styles : incluse dans la suite ci-dessus.
- Tentative de contrôle visuel Chromium/Playwright : **non exécutée**. Le navigateur ne démarre pas car les dépendances système (dont `libnss3.so`) ne sont pas installées et l'environnement n'autorise pas leur installation par `apt`. Il ne s'agit pas d'un échec du jeu, mais le rendu navigateur n'a donc pas été validé.
- Aucun test sur un téléphone/tablette physique, Safari/WebKit ou Firefox.

## 4. Limites et suite

- La détection de mise à jour suppose que l'hébergement sert `src/config/GameConfig.js` sur la même origine que l'application, sans cache persistant malgré le paramètre de cache-busting. Un lancement `file://` ou hors ligne ne peut pas savoir qu'une autre version existe ; il réessaie périodiquement.
- Le zoom/cadrage et les gestes tactiles sont implémentés mais le rendu et les interactions ne sont pas validés dans un navigateur réel/émulé faute de dépendances de navigateur disponibles. À vérifier dans les tests visuels avant de considérer la passe comme validée sur appareil.
- La correction du combat est structurelle et doit être vérifiée par un contrôle visuel mobile ciblé avant d'affirmer une réussite finale pour ce défaut rapporté.
- La voie Expo WebView + Windows Tauri est une recommandation de faisabilité, pas une implémentation. Attendre l'accord sur les plateformes et la portée avant d'ajouter les projets natifs.
