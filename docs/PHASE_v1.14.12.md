# Bilan de phase — Rework 1.14.12

- **Date :** 22/10/2026
- **Version applicative :** 1.14.12
- **Schéma de sauvegarde :** 15, inchangé
- **Portée :** interface de sélection d'objet tenu dans Team, et footer du remplacement Team → PC

## Choix d'objet tenu : Sac plus lisible

- Le mode de choix reste dans `BagPanel` et présente les objets tenus avec les lignes standard `BagItemRow` du Sac.
- Le filtre de catégorie est limité à « Objets tenus » pendant ce mode; sélectionner une catégorie sans rapport ne peut plus faire quitter silencieusement le choix.
- Le bandeau de contexte montre le sprite, le nom/niveau du Pokémon visé et l'objet actuellement équipé, avec son icône lorsqu'il en porte un.
- Les contrôles de recherche, de tri, de quantité, de description, d'objet déjà équipé par un coéquipier et de verrouillage en combat restent fonctionnels.

## Footer du choix PC

- `UIFullscreenPanel` possède maintenant un slot de footer fixe, masqué quand il est vide; le corps principal reste la seule zone défilante.
- Pendant le **remplacement** d'un membre de Team depuis le PC, le footer indique le Pokémon concerné et propose « Annuler » et « Retirer de l'équipe ».
- Annuler ferme la sélection sans mutation. Retirer range ce membre dans la boîte via `TeamBoxTransferSystem`, avec une seule sauvegarde et les événements d'équipe/PC existants.
- Le retrait est désactivé lorsqu'il ne reste qu'un seul Pokémon dans l'équipe. Aucun footer n'apparaît dans le stockage PC normal ni dans le choix d'ajout à un emplacement vide.
- `BoxPanel` reste générique : il ne dépend ni de `TeamSystem` ni d'un UID d'équipe; le nouvel événement de sélection est interprété par l'orchestrateur `TeamBoxTransferSystem`.

## Vérifications

- `npm test` sur le projet et après extraction : **325 réussis, 0 échec**.
- `node --check` passe sur **586 fichiers JS/MJS**, sur le projet et après extraction; `git diff --check` est propre.
- Couverture ajoutée : catégories Sac réservées au mode tenu, sprite/contexte du Pokémon, slot footer fixe/masqué, footer absent en stockage/ajout, annulation sans sauvegarde, retrait Team → PC avec une sauvegarde et interdiction de retirer le dernier Pokémon.
- Schéma **15** conservé; aucune migration ni donnée sauvegardée nouvelle.
- Serveur de prévisualisation : page, `BoxPanel.js`, `BagPanel.js` et CSS du footer répondent **HTTP 200**.
- Vérification visuelle manuelle dans le jeu encore à faire; les tests automatisés ne remplacent pas cette validation.

## Livraison

- Archive dédiée : `pokeworld-rework-1.14.12.zip` — **2 579 entrées**, environ **14 Mo**.
- `unzip -t` sans erreur; tests et vérifications syntaxe/métadonnées réussis après extraction.
