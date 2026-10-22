# Bilan de phase — Rework 1.14.14

- **Date :** 22/10/2026
- **Version applicative :** 1.14.14
- **Schéma de sauvegarde :** 15, inchangé
- **Portée :** retour de validation no 2 — échange des Pokémon par glisser-déposer dans Team

## Correction

- `UISortableList` propose maintenant, sur option, un glisser natif de la carte entière après un maintien de **400 ms**, conformément au geste de référence dans `main`.
- Seul `ActiveTeamPanel` active cette option. `BallFilterEditorModal` et les autres listes conservent leur comportement actuel; la logique monolithique de `main` n'est pas copiée.
- Déposer une carte sur une autre déclenche le même échange par UID dans `TeamSystem.swapMembers`, avec une sauvegarde et les événements d'équipe habituels.
- Le drag est bloqué depuis les boutons, la pastille d'objet tenu, les contrôles et les lignes de mouvements. Le glisser par poignée avec événements pointeur (tactile), les retours visuels de cible et la réorganisation clavier restent disponibles.
- La durée d'attente laisse le clic simple de carte disponible pour le remplacement depuis le PC.

## Vérifications

- `npm test` sur le projet et après extraction de l'archive finale : **325 réussis, 0 échec**.
- Couverture : activation après 400 ms, drag natif et UID stable, échange des deux cartes, une seule sauvegarde; parcours pointeur/poignée et clavier toujours fonctionnels.
- `node --check` passe sur **588 fichiers JS/MJS** dans le projet et après extraction; `git diff --check` est propre; schéma **15** conservé.
- Validation manuelle en navigateur, notamment du geste au pointeur et du clic simple en jeu, reste à faire.

## Livraison

- Archive dédiée au retour no 2 : `pokeworld-rework-1.14.14.zip` — **2 581 entrées**, environ **14 Mo**, `unzip -t` sans erreur; version cumulative depuis v1.14.13.
- Les retours nos 3 et 4 restent réservés à leurs propres archives.
