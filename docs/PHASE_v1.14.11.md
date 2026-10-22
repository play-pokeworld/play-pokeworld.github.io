# Bilan de phase — Rework 1.14.11

- **Version applicative :** 1.14.11
- **Schéma de sauvegarde :** 15, inchangé
- **Portée :** reprise du point 17 après le dernier retour sur la Boîte PC
- **Demandes traitées :** ne pas afficher le rang sur les tuiles Pokémon; réorganiser la barre supérieure des filtres et catégories de tri suivant la structure de référence `main`.

## Correction

- Les badges de rang (`E`–`S`) sont retirés des cartes Pokémon du PC et des choix de remplacement. Le filtre de rang et le tri par rang restent disponibles dans la barre, car la demande porte sur l’affichage du badge sur les Pokémon.
- Les six catégories de tri sont intégrées dans la rangée de chips de la `FilterBar`, avant les filtres rapides, avec l’état actif et l’indicateur de direction. La barre de tri séparée est supprimée.
- La barre du PC occupe maintenant toute la largeur disponible au lieu d’être un élément flex intrinsèquement large aligné à droite dans la zone de recherche modale. Les rangées de chips, champs de filtre, recherche et réinitialisation se replient proprement selon la largeur; le tiroir mobile reste accessible.
- Le layout suit le modèle de barre unifiée de `main` sans transplanter son code ni remplacer le composant Rework `FilterBar`. Les autres consommateurs de `FilterBar` conservent leur comportement; les chips acceptent désormais classes et données additionnelles utiles aux contrôles de tri.
- La tuile partagée `PokemonGridEntry`, le découplage `BoxPanel`/Équipe et le système orchestrateur de transferts introduits en v1.14.10 restent inchangés. Les actions PC, filtres, tri, détails et transferts atomiques sont conservés.
- Aucune donnée sauvegardée ne change; le schéma reste 15.

## Tests et contrôles

- `npm test` : **323 réussis, 0 échec**.
- Test d’interface : aucun badge de rang sur un Pokémon stocké ni dans le remplacement; les catégories de tri sont dans la même barre que les filtres, marquent le tri actif et indiquent la direction; l’ancienne barre distincte n’existe plus.
- Règles statiques : pas de rendu/classe de badge de rang; barre PC pleine largeur et modèle de tri intégré.
- Le filtre de rang, le tri par rang, les autres filtres et les scénarios transfert/stockage/remplacement restent testés.
- `node --check` : **584 fichiers JS/MJS** sur le projet et après extraction.
- `git diff --check` : aucune erreur d’espacement; Git a seulement signalé un avis non bloquant de normalisation CRLF pour `tools/launcher/node-missing.txt`.
- Métadonnées vérifiées : **1.14.11**, schéma **15**.
- Contrôle HTTP : **200** pour la page, les feuilles CSS principale/PC et `BoxPanel.js`.
- Archive extraite : `npm test` — **323 réussis, 0 échec**; `node --check` — **584 fichiers**; métadonnées **1.14.11 / schéma 15**; `unzip -t` sans erreur, **2 576 entrées**, environ **14 Mo**.
- Contrôle visuel manuel : l’aperçu live est disponible; la validation finale de l’apparence PC reste à faire par l’utilisateur.

## Livraison

- Archive séparée : `pokeworld-rework-1.14.11.zip` — **2 576 entrées**, environ **14 Mo**; intégrité et tests après extraction vérifiés.
- L’archive v1.14.10 reste inchangée; v1.14.11 constitue un ZIP distinct pour cette nouvelle reprise du point 17.
