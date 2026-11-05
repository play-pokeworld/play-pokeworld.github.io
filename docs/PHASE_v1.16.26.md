# Phase 1.16.26 — mises à jour du site dans les enveloppes et détection des déploiements

**Date :** 5 novembre 2026  
**Type :** fiabilité de déploiement et notification, sans changement de format de sauvegarde.

## Architecture de mise à jour

- Les enveloppes Tauri Windows et Expo WebView Android chargent `https://play-pokeworld.github.io/` à distance. Elles ne contiennent pas les ressources du jeu. Une mise à jour du site est donc visible après rechargement de la page dans l'application; remplacer ou redistribuer l'EXE/APK n'est pas nécessaire pour un changement de contenu web.
- iOS : PWA installable depuis Safari → Partager → Sur l'écran d'accueil; elle charge elle aussi le site distant. Ce n'est pas un IPA natif et aucune publication App Store n'est nécessaire.
- Le bandeau comparait seulement `GameConfig.VERSION`. La version déployée actuellement constatée sur le site était encore `1.16.24`; des commits sans incrément de version ne pouvaient donc pas déclencher le bandeau.
- Ajout d'une empreinte `DeploymentConfig` et du workflow GitHub `refresh-deployment-id.yml`. Chaque push sur `main` met l'empreinte à jour par un commit bot; le système vérifie la version et l'empreinte sans cache. Une session déjà ouverte peut ainsi annoncer un nouveau déploiement même si le numéro sémantique n'a pas bougé.

## Action nécessaire dans GitHub

Le workflow doit être poussé sur `main`, puis faire une seule configuration dans Settings → Pages → Build and deployment → Source : **GitHub Actions**. Ensuite chaque push sur `main` lance tests/audits et déploie le site statique avec son empreinte de commit. Pas de PAT, secret Expo, EAS ou nouveau binaire requis pour les mises à jour du jeu. Aucun commit bot n'est ajouté.

Le workspace n'a pas de remote GitHub configuré : le workflow n'a donc pas pu être poussé ou exécuté ici. Vérifier le premier run GitHub Actions après ajout et le déploiement Pages. Les plateformes réelles n'ont pas été testées; les contrôles automatisés locaux sont consignés dans la livraison.
