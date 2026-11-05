# Phase 1.16.29 — détection du déploiement Pages sans branche imposée

**Date :** 5 novembre 2026  
**Type :** détection des mises à jour web; aucun binaire natif à reconstruire.

## Cause observée

Le site en ligne servait `GameConfig.VERSION = 1.16.26` et `DeploymentConfig.DEPLOYMENT_ID = 'local-development'`. Le workflow personnalisé de la phase précédente ciblait `main`, alors que le déploiement observé venait de `Rework`. Les commits de contenu gardant le même numéro ne changeaient donc aucun marqueur lisible par l'application.

## Correction

- Retrait de la dépendance à un workflow `push` branché en dur sur `main` ou `Rework`.
- Ajout de `deployment-id.js`, un fichier Jekyll avec `site.github.build_revision`. GitHub Pages le rend avec le SHA du commit qu'il est en train de publier, quelle que soit la branche source configurée.
- `UpdateSystem` lit cette empreinte sur le site réel, retient celle au démarrage, puis la recompare chaque minute. Si le déploiement Pages change, l'ancien jeu ouvert présente le bandeau. Une branche qui ne déploie pas le site ne déclenche pas de faux bandeau.
- Les vérifications s'appliquent aux sessions déjà ouvertes. Une nouvelle session charge la version publiée directement.

Le dépôt utilise le build Pages/Jekyll natif : aucune modification des paramètres Pages ni aucun workflow de déploiement supplémentaire n'est requis. Après push sur la branche source actuelle, vérifier que `https://play-pokeworld.github.io/deployment-id.js` affiche un SHA au lieu du template Liquid, puis laisser tourner une session plus d'une minute. La construction Pages distante n'a pas pu être testée depuis cet espace.
