# Bilan de phase — Rework 1.14.6

- **Date :** 22 octobre 2026
- **Version applicative :** 1.14.6
- **Schéma de sauvegarde :** 15, inchangé
- **Point traité :** 16 — Réglages, agrandissement responsive
- **Livraison cumulative :** les points 13 et 14 restent présents depuis les ZIP séparés v1.14.4 et v1.14.5; cette archive traite séparément le point 16
- **Suivi complet :** [`SUIVI_CORRECTIFS.md`](SUIVI_CORRECTIFS.md)

## Correctif

Le gabarit actuel des Réglages était médium (**560 px**). Sur desktop, le modal passe à **1 120 px maximum**, soit 2× le médium, et se réduit avec le viewport pour garder ses marges. La règle existante à **600 px et moins** est préservée (largeur 560 px au maximum, sinon viewport moins 24 px), ainsi que la hauteur et le défilement du panneau. Aucun autre modal ne change de taille.

## Validation automatisée et archive

- `npm test` : **315 réussis, 0 échec**, sur le projet et après extraction de l’archive.
- Test CSS : minimum desktop 1 120 px avec limite viewport; largeur et cap mobile antérieurs conservés.
- `node --check` : **559 fichiers JavaScript/MJS**, sur la source et l’extraction.
- `git diff --check` : succès sur la source.
- Serveur HTTP : **200** pour la page et les feuilles CSS concernées.
- Archive `pokeworld-rework-1.14.6.zip` : **2 566 entrées**, 14 Mo; `unzip -t` sans erreur. Package et lock sont en **1.14.6**; schéma **15**. Aucun `.git` dans l’archive.
- Contrôle navigateur / mesure visuelle bureau et mobile : **non effectué**, conformément à la validation globale prévue par l’utilisateur.

## Hors périmètre

Le point 15 (restauration des déblocages d’anciennes sauvegardes) reste à faire. La validation manuelle globale de Kanto, des donjons et des autres livraisons reste ouverte.
