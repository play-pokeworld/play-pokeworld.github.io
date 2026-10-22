# Bilan historique — Rework 1.14.8 (première tentative du point 17)

- **Version applicative :** 1.14.8
- **Schéma de sauvegarde :** 15, inchangé
- **Portée visée :** point 17 — fidélité d’affichage Boîte PC/Pokédex et choix de remplacement depuis l’équipe
- **Statut d’acceptation :** Pokédex accepté par l’utilisateur; Boîte PC et choix de remplacement explicitement refusés, car ils n’utilisaient pas le même objet d’affichage que le Pokédex. La reprise est portée séparément en v1.14.10, puis complétée en v1.14.11 après les retours sur le visuel PC.

## Résultat de cette première tentative

- La référence `main` a été comparée sur `BoxView`, `PokedexView`, `poke-card.js` et le parcours de sélection/remplacement.
- La première version a créé un composant distinct `PokemonBoxCard` pour la Boîte PC et le remplacement. Malgré une présentation rapprochée de la carte de référence, ce n’était pas l’objet de tuile partagé par le Pokédex et ne répondait donc pas au critère confirmé par l’utilisateur.
- Le Pokédex a repris la tuile circulaire avec numéro, silhouette et étoile shiny, sans nom sous chaque tuile. Cette présentation a été approuvée et doit rester inchangée dans le correctif.
- Les parcours PC, filtres, indicateurs et mutations d’équipe/PC ont été couverts par les tests automatisés; les données et le schéma de sauvegarde n’ont pas changé.

## Vérifications de l’archive v1.14.8

- `npm test` : **320 réussis, 0 échec**.
- `node --check` : **583 fichiers JS/MJS** vérifiés sur le projet et après extraction.
- `git diff --check` : propre.
- Contrôle HTTP : **200** pour `/`, `/assets/css/style.css` et `/src/panels/fullscreen/BoxPanel.js`.
- Archive extraite : tests réussis; métadonnées **1.14.8**, schéma **15**.
- Archive historique : `pokeworld-rework-1.14.8.zip` — **2 570 entrées**, intégrité vérifiée.

Le contrôle visuel manuel en navigateur/jeu n’a pas été effectué. L’utilisateur avait donc refusé l’affichage PC; ne pas présenter v1.14.8 comme la correction acceptée du point 17. Voir [`PHASE_v1.14.11.md`](PHASE_v1.14.11.md) pour la reprise courante; les étapes v1.14.10 et v1.14.9 sont conservées pour l’historique.
