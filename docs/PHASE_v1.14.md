# Bilan de phase — Rework 1.14.0

- **Date :** 21 octobre 2026
- **Version applicative :** 1.14.0 · schéma de sauvegarde 15
- **Référence comportementale :** branche `main` (`64d8f7942ae5b92168b8990813dd16d60a60e7e2`)
- **Architecture conservée :** Rework (`d60138b833f5b148ba5a1e10750ac7de3bed0995`)

> Le ZIP 1.13.0 avait été jugé insuffisant; il reste historique et n'est pas la livraison finale. Cette phase clôt le port Base secrète demandé avant de préparer la nouvelle archive.

## Parité des données et de l'accès

- Comparaison des catalogues : **122/122 décorations** présentes; les champs de catégorie, dimensions, couches, surface, passage, effet, prix, acquisition, hauteur visuelle et empreinte correspondent à `main`.
- **36/36 layouts** présents; les lignes de grille ASCII sont identiques à `main`. Les **17 routes** gardent leur mapping d'alcôves de référence.
- L'accès courant Rework est dérivé du jalon stable `main.216` dans la chaîne Hoenn actuelle (étape 21). La conversion d'anciens exports conserve séparément son seuil historique afin de reconnaître les sauvegardes source. Les panneaux Base et Lieu sont actualisés après les événements typés d'établissement/déménagement.
- Les opérations de placement, retrait, PNJ, PC, établissement et déménagement restent dans les systèmes. Les textes FR/EN sont validés par la suite de localisation.

## Parcours navigateur Playwright

Contrôle sur fixture Rework à **1440 × 1000**, avec sauvegarde Hoenn déverrouillée et Base existante pour les parcours d'édition/visite :

1. **Panneau et édition :** aperçu visuel 2D; pose d'une Petite Chaise déjà en stock; vérification de la décrémentation du stock; enregistrement d'un message PC; sélection, modification et sauvegarde d'un PNJ.
2. **Entrée en visite :** le passage en visite termine le mode édition; le modal ne peut pas être fermé par la croix ou le fond, mais possède l'action localisée « Terminer la visite ».
3. **Fichier portable :** import visite-seule d'une base distante, déplacement vers son PC, affichage du message d'absence de message exporté, prise d'un drapeau (55 → 56) et refus du second prélèvement pendant le délai de 24 h.
4. **Combat PNJ :** interaction avec le PNJ enregistré, confirmation du duel, combat ouvert dans `BattleSystem`, puis reprise du modal après la fin du combat.
5. **Déménagement :** déplacement de `tree_1` vers `bush_1` depuis l'alcôve de Route 101; le modal se ferme, le record de visites ne s'incrémente pas, les meubles détenus reviennent au stock et le PNJ disparaît. Le PC reste automatique.
6. **Création neuve :** fixture vierge, exploration de l'alcôve, établissement sans entrée automatique dans la Base, puis entrée par l'action Lieu mise à jour. Le record reste à zéro jusqu'à une visite effective; stock vide, aucun meuble accordé et aucun bouton de grant debug en mode normal.

Un second contrôle mobile tactile à **390 × 844** ouvre l'onglet Base, l'éditeur et le modal de visite : la largeur de document reste à 390 px dans chaque état (aucun débordement horizontal). Résultat des deux parcours : **aucune erreur JavaScript/console et aucune réponse HTTP en échec**. Captures de contrôle utilisées pendant l'audit puis retirées de l'archive.

## Sauvegardes, échanges et règles de jeu

- La migration conserve une Base legacy établie, son lieu/layout, ses décorations et placements, son stock, ses PNJ/équipes/messages, son spawn, ses records, son message PC, les visites et ses drapeaux; les rotations legacy sont normalisées à 0, comme décidé.
- La nouvelle Base reçoit **uniquement le PC automatique**. Il n'y a ni boutique Base, ni meubles initiaux, ni grant gameplay. Le bouton debug ne figure qu'en mode debug et n'a pas servi à l'acquisition du parcours navigateur.
- L'import JSON est une visite temporaire et ne donne aucun inventaire. L'ID d'export stable Rework `base-${save.id}` est inchangé. L'export n'ajoute pas `pcMessage`, champ absent du format de référence.
- Chaque défi lancé est un duel autonome contre l'équipe sauvegardée du PNJ, avec le moteur partagé; il n'est ni une chaîne sauvage ni un règlement de dresseur ordinaire. Le résultat passe par l'événement Base dédié; les événements ordinaires de KO/défaite, récompenses de dresseur et auto-capture ne sont pas déclenchés. Les revisites/revanche suivent le comportement de `main`.
- Le fournisseur commun/extensible de bonus est branché sur les drapeaux : Normal 0; Bronze 10 (+3 % argent); Argent 50 (+3 % argent, EXP et énergie Mine max.); Or 150 (+5 % argent/EXP/énergie max. et +1 butin de route); Platine 400 (+8 % argent/EXP/énergie max. et +2 butins de route). Aucun bonus de succès n'est activé avant le port dédié des succès.

## Validation automatisée et archive finale

- `npm test` : **301 réussis, 0 échec**, sur la source puis depuis l'extraction temporaire du ZIP.
- `node --check` sur tous les JavaScript/MJS du projet : succès sur la source et sur l'extraction.
- `git diff --check` : succès sur la source.
- Archive finale `pokeworld-rework-1.14.0.zip` : **2 487 fichiers**; `unzip -t` ne signale aucune erreur. `.git`, `node_modules`, caches, scripts/fixtures temporaires et captures d'audit sont absents.
- Après extraction, les versions sont cohérentes : package/lock/config **1.14.0**, schéma **15**. Aucun ZIP 1.14.0 supplémentaire n'est conservé.

## Portée et limites

- Les parcours de Base nommés ci-dessus ont été observés dans le navigateur; la suite n'est donc pas utilisée seule comme preuve de fonctionnement.
- Le rapport ne prétend pas certifier une partie Hoenn complète ni tester individuellement les 122 décorations, chacune des 36 salles et toutes les équipes possibles.
