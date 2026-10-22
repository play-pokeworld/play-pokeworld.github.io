# Bilan de phase — Rework 1.14.1

- **Date :** 21 octobre 2026
- **Version applicative :** 1.14.1
- **Schéma de sauvegarde :** 15, inchangé
- **Point traité :** 1 — Équipe, sélection d’objet tenu via le Sac
- **Références :** `Rules.md`, architecture Rework et comportement de `main`
- **Suivi complet des demandes :** [`SUIVI_CORRECTIFS.md`](SUIVI_CORRECTIFS.md)

## Constat et portée de cette livraison

À l’inspection de la source v1.14.0, les actions de la carte Équipe et de la fiche Pokémon envoyaient déjà une demande vers `ModalIds.BAG` en mode objet tenu. Toutefois, `GamePage` enregistrait encore un `HeldItemPickerModal` autonome, avec sa propre présentation et sa propre ligne de choix; un composant de ligne parallèle était également utilisé par le mode Sac. Le parcours depuis la fiche avait aussi un défaut réel de superposition : le Sac (z-index 960) s’ouvrait derrière le modal Pokémon (z-index 31 000), qui interceptait ses clics. Le chemin de la fiche n’était donc pas utilisable malgré l’événement vers le Sac.

Cette livraison traite **ce premier point uniquement**. Les autres changements antérieurs (dont le port Base de v1.14.0) restent inchangés; aucun des points 2 à 16 ci-dessous n’est déclaré résolu par cette archive.

## Correctif

- Les deux actions de l’Équipe continuent d’ouvrir le Sac plein écran via `ModalOpenRequestedEvent(ModalIds.BAG, { mode: 'held-item', teamIndex })`.
- En mode sélection d’objet tenu seulement, `BagPanel` reçoit la classe `pw-bag-held-item-mode` et passe au z-index **32 000**, au-dessus du modal Pokémon (**31 000**). Le modal source reste ouvert et retrouve le focus visuel à la fermeture du Sac; le z-index normal des autres écrans Sac/Boîte n’est pas changé.
- Suppression de `HeldItemPickerModal`, de son identifiant `ModalIds.HELD_ITEM_PICKER`, de son import/instanciation dans `GamePage`, des clés de traduction et règles CSS réservées à ce modal.
- Suppression de `HeldItemBagRow`; le mode Sac réutilise maintenant `BagItemRow`, avec paramètres de description, de détenteur, de quantité, d’indisponibilité et de style spécifiques au contexte.
- Suppression de l’ancienne requête `HeldItemSystem.getOptions`, qui n’était consommée que par le modal retiré.
- Le `BagPanel` rafraîchit ses résultats à la modification de l’inventaire/de l’équipe et au début/à la fin d’un combat, afin de garder le détenteur et le verrouillage à jour.
- L’équipement et le retrait restent gérés par `HeldItemSystem` et `TeamSystem`; l’équipement conserve l’objet dans l’inventaire et produit une seule écriture de sauvegarde.
- Aucun format, champ ni migration de sauvegarde n’a été modifié.

## Validation

- `npm test` : **303 réussis, 0 échec**, sur la source et après extraction de l’archive.
- Trois tests dédiés couvrent les deux points d’entrée vers le Sac, le rendu avec `BagItemRow`, la désactivation d’un objet déjà tenu par un autre Pokémon, l’équipement avec une seule sauvegarde et le rafraîchissement du verrou lors du début/fin de combat.
- Playwright bureau **1280 × 900** : import d’une fixture contrôlée; clic sur l’objet tenu de la carte Équipe; confirmation que le plein écran ouvert est bien `#fs-inventory` (« Sac »), que l’objet tenu par un coéquipier est désactivé, puis équipement de `leftovers`, fermeture du Sac et mise à jour du badge de l’équipe.
- Playwright tactile **390 × 844** : depuis la fiche Pokémon, « Changer » ouvre le Sac au-dessus de la fiche (z-index mesuré 32 000 contre 31 000); l’objet tenu par un coéquipier est désactivé, `leftovers` s’équipe, le Sac se ferme et la fiche reste ouverte. La largeur de page demeure **390 px**, sans débordement horizontal.
- Les deux parcours navigateur : `errors: []`, `failedResponses: []`.
- `node --check` sur tous les JS/MJS : succès sur la source et l’extraction; `git diff --check` passe sur la source.
- Archive `pokeworld-rework-1.14.1.zip` : **2 488 fichiers**; `unzip -t` sans erreur. L’extraction confirme package/lock/config **1.14.1**, schéma **15**. Aucun `.git`, cache, dépendance, script/fixture temporaire ou capture d’audit.

## Hors périmètre restant

La refonte des fiches Pokémon, les autres demandes Équipe, Carte, Quêtes, Lieu, Boîte PC, Pokédex, Donjon, anciennes sauvegardes et Réglages restent ouvertes. La vérification de Kanto entièrement jouable et la navigation sans perte de focus restent une porte globale de validation, non satisfaite par ce seul correctif.