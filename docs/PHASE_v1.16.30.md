# Phase 1.16.30 — icône native Android PokéWorld

**Date :** 5 novembre 2026  
**Type :** configuration de l'icône de lancement Android et incrément du code de build.

- Expo utilisait l'icône par défaut car `app.json` ne définissait ni `expo.icon` ni `android.adaptiveIcon`.
- Ajout de `apps/mobile/assets/icon.png` et `adaptive-icon.png`, dérivées de l'illustration PokéWorld déjà présente, avec un fond sombre et une marge de sécurité pour les masques Android.
- `app.json` pointe maintenant sur les deux images; `android.versionCode` est incrémenté à 1016027; `expo.version` reste à 1.16.26 pour remplacer l'APK de cette release.
- Changer l'icône exige une nouvelle compilation APK (ressource native intégrée au package). Les changements de contenu du jeu web n'exigent toujours pas de reconstruire l'APK ou l'EXE.

Une fois le nouvel APK construit, remplacer l'asset `Pokeworld-Android.apk` dans la release GitHub. Les anciens utilisateurs n'auront le nouvel icône d'application qu'après installation/mise à jour de cet APK.

Validation locale : le test vérifie que les chemins Expo pointent vers deux images présentes; la compilation EAS et la vérification sur appareil Android n'ont pas été réalisées ici.
