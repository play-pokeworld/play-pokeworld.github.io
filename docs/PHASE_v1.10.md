# Livraison Rework v1.10.0 — accès historiques, Ligue et interface

**Version affichée : 1.10** · **Version paquet : 1.10.0** · **Schéma de sauvegarde : 12** · **Branche : `Rework`** · **Date : 20/10/2026**

> Cette note décrit la passe 1.10.0; les notes [`PHASE_v1.9.1.md`](PHASE_v1.9.1.md) et [`PHASE_v1.9.md`](PHASE_v1.9.md) restent des historiques. « Vérifié » signifie contrôlé par les tests automatisés ou un smoke QA synthétique; cela ne constitue pas une validation de l'utilisateur.

## Changements de cette passe

- **Ligue et badges d'Arène** : `statistics.leaguesWon` est désormais la source des titres régionaux. Une victoire de Ligue n'ajoute plus l'ID de Ligue à `player.badges`; le compteur et la progression de badges restent exclusivement basés sur les badges d'Arène. Les cartes de Ligue lisent la victoire par région et se rafraîchissent après l'événement de victoire.
- **Migration 11 → 12** : retire uniquement les IDs de Ligue connus des badges, reconstitue les titres régionaux à partir des statistiques, des anciennes IDs de Ligue, des victoires de dresseurs et de l'ancien jalon de champion, puis conserve les autres IDs. Les accès Pension/Mine/Entraînement explicitement persistés restent conservés; la migration répare aussi les accès appuyés par une localisation déjà atteinte, une progression de facility ou le badge requis. Les anciennes sauvegardes non utilisées restent verrouillées, les nouvelles parties ne reçoivent aucun déverrouillage anticipé.
- **Panneaux verrouillés** : Pension, Mine et Entraînement restent visibles sur desktop et affichent le texte localisé qui explique leur condition. En mobile, le filtrage des fenêtres non sélectionnées reste actif.
- **Header / Réglages** : bouton engrenage ramené à 38×38 px; le titre Réglages s'aligne à gauche dans sa propre barre; les choix de langue s'affichent comme « Français » et « English », sans suffixes de région.
- **Fond de jeu animé** : ajout d'une vue UI pilotée par la Pokédex, sans logique DOM dans les systèmes et sans style inline. Zéro capture : aucun promeneur; dès une capture : 5, puis +1 par tranche de 10 espèces capturées. Les sprites de 96 à 150 px traversent l'écran en 26–52 secondes; les chromatiques gardent un éclat distinctif. Le mouvement réduit coupe la couche.
- **Modèle de Pokédex** : ajout d'une lecture en masse des espèces capturées pour les vues de collection; le total reste dérivé des entrées et n'est pas dupliqué dans la sauvegarde.
- **Maintenabilité** : retrait des replis runtime qui traitaient une ancienne ID de Ligue comme badge; tests dédiés pour la migration, les panneaux verrouillés, la carte de Ligue, les offres de boutique et le fond de collection.

## Portée conservée

Les dix étapes et leurs conditions de tutoriel restent intactes. Le tableau répétable conserve trois offres persistées, le reroll, les slots/améliorations, les imports et migrations; seul `swimmer-ondee` déverrouille une nouvelle partie, et `r30–r38` restent Johto-only. Les presets gardent leurs 20 emplacements et l'édition équipe/boîte via les systèmes. Les flux de capture, sélection d'objet, résumé et expéditions de donjon restent couverts par leurs tests du projet. Le sprite d'équipe 132×132 px n'est ni rogné ni réduit pour tenir dans la colonne de 112 px, conformément à la comparaison avec `origin/main`.

## Contrôles exécutés

- `npm test` : **215 tests réussis, 0 échec** après la passe finale. Même résultat sur l'archive extraite.
- `git diff --check` et contrôles `node --check` sur les modules de migration, le fond et le test de migration : aucun problème.
- Smoke Playwright synthétique sur Chromium local : création d'une sauvegarde QA temporaire, vérification des trois panels verrouillés et de leurs messages français, ouverture de Réglages et du panneau Badges/Ligues, contrôle de la navigation à 390×844, et inspection des 5 sprites de fond pour une sauvegarde avec une espèce capturée (images chargées et positions animées). La sauvegarde QA temporaire a été créée uniquement pour ce contrôle; le stockage local a ensuite été vidé et la session Playwright fermée.
- Le titre « Ligue vaincue » et la réémission de la carte sont vérifiés par test de modèle/UI synthétique; le smoke navigateur n'a pas joué une Ligue réelle.
- Aucun parcours de jeu complet ni validation utilisateur n'est revendiqué. La revue responsive exhaustive multi-navigateurs, les parcours de capture réelle et de donjon de bout en bout restent hors de ce contrôle ciblé.

## Livraison ZIP

L'archive courante est **`pokeworld-rework-1.10.0.zip`** dans la racine du workspace. Elle contient les sources, données, styles, documentation et tests, sans `.git`, dépendances téléchargées, caches, captures QA ni anciens ZIP; son CRC et son inventaire ont été contrôlés. `npm test` a été lancé après extraction : **215 tests réussis, 0 échec**. Les ZIPs 1.7, 1.9.0 et 1.9.1 présents auparavant dans le workspace ont été supprimés après validation. `npm start` démarre le jeu avec Node.js 18+.

Avant d'importer une sauvegarde ancienne, il est prudent d'en exporter une copie JSON. Les migrations s'appliquent automatiquement au chargement; l'exécution de `npm test` et les smokes synthétiques ne remplacent pas cette sauvegarde de précaution.
