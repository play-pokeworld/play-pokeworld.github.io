# Bilan de phase — Rework 1.14.7

- **Date :** 22 octobre 2026
- **Version applicative :** 1.14.7
- **Schéma de sauvegarde :** 15, inchangé
- **Point traité :** 15 — compatibilité des anciennes sauvegardes
- **Livraison :** un ZIP séparé pour ce point; les livraisons 1.14.4, 1.14.5 et 1.14.6 restent inchangées
- **Suivi complet :** [`SUIVI_CORRECTIFS.md`](SUIVI_CORRECTIFS.md)

## Correctif

- Les exports du jeu original conservent les lieux de `G.unlockedLocs`, `G.visitedMaps` et le lieu courant. Les routes implicitement restaurées par les badges de Brock, Misty, Surge et Koga suivent la réparation de compatibilité de `main`; un badge Surge seul ne donne pas l’accès à la mine.
- Les anciens schémas Rework 9 et 11 réunissent également les historiques de carte explicites présents au niveau supérieur et dans l’accès sauvegardé.
- Le calcul des badges requis pour une route utilise désormais les identifiants de leaders déjà enregistrés par `PlayerData` et utilisés par `TrainerSystem`, afin que les badges migrés ouvrent réellement les routes attendues.
- Les victoires de Ligue et anciens indicateurs champion régionaux restent conservés; les contrôles de Ligue/Pokédex rendent le changement de région disponible lorsque les preuves sauvegardées sont présentes.
- Aucune modification du schéma 15 et aucune modification de gameplay hors de la restauration d’accès demandée.

## Validation automatisée et archive

- `npm test` : **319 réussis, 0 échec**, sur le projet et après extraction de l’archive finale.
- Parcours de migration intégrés : export original, `unlockedLocs`, `visitedMaps`, badges/accès d’arène, fonctionnalités Hatchery/Training/Mine, Ligue, Pokédex et changement Kanto↔Johto; migrations Rework 9 et 11.
- La mine n’est pas ouverte par le seul badge Surge; une visite enregistrée de la Grotte de Diglett restaure l’accès.
- `GameConfig.VERSION`, `package.json` et `package-lock.json` : **1.14.7**; schéma : **15**.
- `node --check` : **582 fichiers JavaScript/MJS**, sur la source et l’extraction; aucun échec.
- `git diff --check` : succès.
- Serveur de prévisualisation : **200** pour la page, `ui-modal.css` et `dungeons.css`.
- Archive `pokeworld-rework-1.14.7.zip` : **2 568 entrées**, 14 Mo; `unzip -t` sans erreur; aucun répertoire `.git`.
- Contrôle manuel navigateur / jeu : **non effectué**, conformément à la vérification globale finale prévue par l’utilisateur.

## Hors périmètre

Aucun changement au contenu ou à l’équilibrage du jeu. Les validations manuelles de Kanto, des donjons et des livraisons précédentes restent à faire par l’utilisateur.
