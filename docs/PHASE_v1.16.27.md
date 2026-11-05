# Phase 1.16.27 — déploiement Pages sur la branche Rework

**Date :** 5 novembre 2026  
**Type :** correction du déclencheur de publication et notification des mises à jour.

La vérification du dépôt montre que GitHub Pages publie depuis la branche `Rework`, pas `main`. Le premier workflow de publication avait été configuré sur `main`; il n'aurait donc pas traité les prochains pushes de la branche réellement utilisée. Corrigé : `.github/workflows/deploy-pages.yml` déclenche maintenant sur `Rework`, teste le jeu, injecte l'empreinte du commit dans l'artefact Pages et déploie le site.

## Action unique dans GitHub

Dans **Settings → Pages → Build and deployment → Source**, choisir **GitHub Actions**. Ensuite pousser cette version sur `Rework`; le workflow se lance et déploie automatiquement le site. Les prochains pushes sur `Rework` actualiseront le jeu et l'empreinte, donc le bandeau des sessions déjà ouvertes. Aucun nouvel EXE/APK n'est requis pour des changements web; les enveloppes lisent les ressources de la page publiée.

Le déploiement automatique actuel de la branche `Rework` (run Pages #88 au moment de la vérification) a été observé en cours. Le contenu en ligne vérifiait toujours `1.16.24` à cet instant; attendre que ce run finisse avant de considérer `.26` publié. Aucun accès au dépôt ou aux réglages GitHub n'est disponible depuis ce workspace pour effectuer la configuration à la place du propriétaire.
