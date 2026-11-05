# Phase 1.16.28 — iOS PWA sans invitation à installer un raccourci PC

**Date :** 5 novembre 2026  
**Type :** affichage PWA mobile et distribution existante.

- La cause du choix « installer le site / créer un raccourci » sur navigateur desktop était la balise manifeste PWA globale. Elle est retirée du document commun; l'enregistrement du service worker est limité à iOS/iPadOS.
- Les métadonnées Apple Home Screen et l'icône restent pour Safari iOS. L'installation iOS se fait par Partager → Sur l'écran d'accueil, pas par un fichier IPA ni par le bouton de téléchargement Windows/Android.
- La compilation Tauri/Expo charge le site distant; les changements du jeu continuent de se mettre à jour par le site sans remplacer le `.exe`/`.apk`.
- Les URL directes Windows/Android pointent vers des assets GitHub Release. Tant qu'une release publiée avec les fichiers nommés exactement `Pokeworld-Windows-Setup.exe` et `Pokeworld-Android.apk` n'existe pas, elles renvoient 404.

Pas de test Safari ou navigateur Windows réel effectué. La PWA reste installable via le menu Safari sur un appareil iOS; pas d'installation automatisée sans confirmation système.
