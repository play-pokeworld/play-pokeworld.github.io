# Bilan de phase — Rework 1.14.13

- **Date :** 22/10/2026
- **Version applicative :** 1.14.13
- **Schéma de sauvegarde :** 15, inchangé
- **Portée :** retour de validation no 1 — choix d'objet tenu depuis Team

## Correction

- Les actions **Retirer l’objet** et **Annuler** sont maintenant rendues dans le slot de footer fixe du Sac, en dehors du corps défilant.
- « Retirer l’objet » reste visible mais est désactivé si le Pokémon ne porte rien ou si les objets tenus sont verrouillés pendant un combat.
- Les choix d'objets tenus reprennent les colonnes adaptatives, l'espacement et les lignes de la grille standard du Sac; ils ne sont plus forcés en liste mono-colonne.
- Le contexte du Pokémon, le filtre Objets tenus, la recherche et le tri restent inchangés. Le footer se vide à la fermeture et dans le Sac normal.
- Le footer fixe du **remplacement Team → PC** de v1.14.12 reste séparé et inchangé.

## Vérifications

- `npm test` sur le projet et après extraction de l'archive finale : **325 réussis, 0 échec**.
- `node --check` passe sur **588 fichiers JS/MJS**; `git diff --check` est propre.
- Couverture renforcée : footer dans le slot fixe et absent du corps défilant; boutons Retirer/Annuler présents; retrait désactivé sans objet, actif avec objet; équipement et retrait sauvegardent chacun une fois; grille du choix alignée sur celle du Sac.
- Schéma **15** conservé; aucune migration ni donnée sauvegardée nouvelle.
- Validation visuelle manuelle dans le jeu toujours à faire; les tests automatisés ne remplacent pas ce contrôle.

## Livraison

- Archive dédiée au retour no 1 : `pokeworld-rework-1.14.13.zip` — **2 580 entrées**, environ **14 Mo**; `unzip -t` sans erreur.
- Cette version est cumulative depuis v1.14.12; les trois autres retours restent réservés à leurs propres archives.
- Les tests après extraction passent; le SHA-256 exact est communiqué avec le fichier à la remise.
