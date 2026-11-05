# Phase 1.16.25 — PWA iOS et releases automatisées

**Date :** 5 novembre 2026  
**Type :** installabilité web mobile et pipeline de releases; schéma de sauvegarde inchangé.

## Changements

- Ajout d'un manifeste PWA, icônes 192/512, métadonnées Safari iOS et service worker en ligne d'abord. Sur iPhone/iPad, le jeu peut être ajouté à l'écran d'accueil depuis Safari sans App Store; le contenu du jeu se met à jour quand le site déployé est rechargé.
- L'enveloppe Android Expo WebView continue à charger le site en direct; les mises à jour de gameplay ne demandent donc pas de nouvel APK. Modifications natives du wrapper = nouvelle version APK.
- Ajout de La première proposition de workflow de build Android/Windows est remplacée dans la phase 1.16.26 : ces compilations ne sont pas nécessaires pour les mises à jour du contenu du jeu, qui est chargé depuis le site distant.
- Version de jeu synchronisée : **1.16.25**.

La détection continue sur chaque déploiement est décrite dans la phase 1.16.26. Aucun secret Expo n'est requis pour mettre à jour le jeu distant.
