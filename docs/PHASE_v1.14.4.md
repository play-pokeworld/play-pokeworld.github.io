# Bilan de phase — Rework 1.14.4

- **Date :** 22 octobre 2026
- **Version applicative :** 1.14.4
- **Schéma de sauvegarde :** 15, inchangé
- **Point traité :** 13 — Donjons, correction visuelle comparée à `main`
- **Architecture conservée :** Rework (`d60138b833f5b148ba5a1e10750ac7de3bed0995`)
- **Référence visuelle :** `main` (`64d8f7942ae5b92168b8990813dd16d60a60e7e2`)
- **Suivi complet :** [`SUIVI_CORRECTIFS.md`](SUIVI_CORRECTIFS.md)

## Correctif

La grille Rework est désormais stylée sur son vrai hôte (`.pw-dungeon-expedition`) au lieu de dépendre des sélecteurs de l’ancien bandeau `#battle-dungeon-bar`, absent de cette architecture. La présentation reprend la grammaire de la référence : cases bornées et carrées, surface de carte contrastée, brouillard explicite avec « ? », états de tuile distincts, case terminée estompée et position du joueur marquée. Les teintes utilisent les tokens du thème courant. Les grilles de 7 à 11 colonnes restent navigables sur petit écran sans être rognées; le focus clavier et la préférence de réduction des animations sont préservés.

Les cases explorées vides n’affichent plus de losange, comme dans le rendu de référence. Aucun système de donjon, règle de combat, contenu de sauvegarde ou migration n’a changé.

## Validation automatisée et archive

- `npm test` : **313 réussis, 0 échec**, sur le projet et après extraction de l’archive.
- Test statique : hôte widget réel, tailles de grille 7–11, marqueur du brouillard, états visuels et couleurs par tokens.
- `node --check` : **559 fichiers JavaScript/MJS**, sur la source et l’extraction.
- `git diff --check` : succès sur la source.
- Serveur HTTP : **200** pour la page, `style.css`, `dungeons.css` et `DungeonExpeditionPanel.js`.
- Archive `pokeworld-rework-1.14.4.zip` : **2 564 entrées**, 14 Mo; `unzip -t` sans erreur. Package et lock sont en **1.14.4**; schéma **15**. Aucun `.git` dans l’archive.
- Contrôle navigateur / parcours de jeu manuel : **non effectué**, conformément à la validation globale prévue par l’utilisateur.

## Hors périmètre

Les points 14 (blocage après combat), 15 (déblocages d’anciennes sauvegardes) et 16 (largeur Réglages) ne sont pas résolus par cette archive. Les contrôles manuels globaux demeurent ouverts.
