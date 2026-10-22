# Bilan de phase — Rework 1.14.10

> **Archive historique.** La reprise v1.14.11 conserve la tuile partagée et le découplage, mais supprime les badges de rang des Pokémon et recompose la barre PC. Voir [`PHASE_v1.14.11.md`](PHASE_v1.14.11.md).

- **Version applicative :** 1.14.10
- **Schéma de sauvegarde :** 15, inchangé
- **Portée :** reprise séparée du point 17, après les retours sur v1.14.8 et v1.14.9
- **Critères conservés :** le rendu approuvé du Pokédex ne doit pas régresser; la Boîte PC doit employer la même tuile complète; `BoxPanel` ne doit pas connaître l’équipe; ajout, remplacement et stockage restent disponibles et atomiques.

## Correction

- Extraction de `PokemonGridEntry`, la tuile complète de grille. Le Pokédex et la Boîte PC instancient le même objet, qui enveloppe `PokemonGridSprite`. Les classes et règles visuelles déjà approuvées du Pokédex — états de silhouette, géométrie circulaire, marqueur et sprite — sont conservées; le composant commun reçoit seulement une classe d’identité sans style additionnel.
- `BoxPanel` gère uniquement le stockage, les filtres, le tri, les détails et une demande générique de sélection. Il n’importe ni `TeamSystem` ni événement d’équipe, ne rend aucun état d’équipe et n’interprète pas le but métier d’une sélection.
- Les résultats/annulations de sélection utilisent les événements génériques `BoxPokemonSelectedEvent` et `BoxPokemonSelectionCancelledEvent`, munis d’un identifiant de requête opaque et de l’UID stable du Pokémon.
- `TeamBoxTransferSystem`, système métier sans DOM enregistré dans `main.js`, est le seul orchestrateur connaissant à la fois `TeamSystem` et `BoxSystem`. Il gère l’ajout depuis le PC, le remplacement depuis une carte d’équipe et le stockage d’un membre de l’équipe.
- Le PC conserve filtres, tri, détails, favoris, verrouillages, rangs et badges. Les trois mutations de transfert passent par les systèmes de domaine, écrivent une fois la sauvegarde et émettent les événements typés Équipe/PC. Le dernier membre actif ne peut pas être stocké; le focus est replacé sur une carte survivante après stockage.
- Aucun modèle de sauvegarde ni donnée persistée n’a changé; le schéma reste 15.

## Tests et contrôles

- `npm test` : **322 réussis, 0 échec**.
- Règles statiques : imports des deux vues sur la même tuile; absence de `TeamSystem`/état d’équipe dans `BoxPanel`; orchestrateur `BaseSystem` enregistré par le point de composition.
- Tests d’interface : tuile PC partagée et ouverture des détails; sélection générique avec transfert PC→Équipe; remplacement; stockage; conservation des favoris/verrous; une sauvegarde par opération; impossibilité de stocker le dernier membre; restitution du focus après stockage.
- Tests du Pokédex : les classes de tuile, géométrie, silhouettes, filtres et vue non mutante restent couverts.
- Contrôle navigateur par capture : **non effectué**. Aucune capture de référence du défaut PC n’a été fournie; le rendu PC ne doit pas être présenté comme visuellement accepté avant contrôle manuel. Le Pokédex reste la référence approuvée et n’a pas été contrôlé par capture après extraction.
- `node --check` : **584 fichiers JS/MJS** réussis sur le projet puis sur l’archive extraite.
- `git diff --check` : propre.
- Métadonnées : package, lockfile et configuration synchronisés en **1.14.10**; `SaveSchema.VERSION` reste à **15**.
- Contrôle HTTP du serveur de prévisualisation : **200** pour `/`, `assets/css/style.css` et le module `BoxPanel.js`.
- Archive extraite : `npm test` — **322 réussis, 0 échec**; métadonnées **1.14.10**, schéma **15**.
- Archive : `unzip -t` sans erreur; **2 575 entrées**, environ **14 Mo**.
- Contrôle navigateur par capture/manuelle : **non effectué**. La prévisualisation live est disponible, mais l’acceptation visuelle du PC et la comparaison Pokédex restent à confirmer par l’utilisateur.

## Livraison

- Archive corrective séparée : `pokeworld-rework-1.14.10.zip` — **2 575 entrées**, environ **14 Mo**; extraction, tests et intégrité vérifiés.
- Les archives v1.14.8 à v1.14.10 sont conservées comme historiques; aucune n’est présentée comme correction PC visuellement acceptée.
