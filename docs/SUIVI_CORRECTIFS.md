# Suivi des correctifs demandés

**Base de travail :** v1.14.16 · schéma 15  
**Règle de livraison :** un point par ZIP par défaut. Les exceptions autorisées sont les points **2, 3, 4, 5, 11 et 12** regroupés en v1.14.2, puis les points **6–10** regroupés en un ZIP unique v1.14.3. Les points 13, 14 et 16 sont livrés séparément en v1.14.4, v1.14.5 et v1.14.6; le point 15 est livré séparément en v1.14.7; le point 17 a une première tentative v1.14.8, explicitement non acceptée pour la Boîte PC, puis des reprises séparées v1.14.10 et v1.14.11. Ces dérogations ne s’étendent pas aux autres points. Chaque archive est contrôlée avant présentation.  
**Règles de production :** préserver l’architecture Rework et les `Rules.md`; `main` sert de référence visuelle/comportementale, pas de code à transplanter. Aucun changement de gameplay hors périmètre.

## Reprise actuelle — v1.14.18 / schéma 17

- **Terminés sur le périmètre testé :** vraie tuile `PokemonGridEntry` partagée avec Lieu; média objet
  commun; accès permanent par `FeatureAccessSystem`; retrait de « Dernière expédition » limité au
  combat en direct; réservation UID et reprise exacte de l’entraînement Rework.
- **Fonctionnels, fidélité visuelle globale encore à affiner :** Pension, Mine et Centre
  d’entraînement, avec améliorations, automatisation, personnel et sous-fenêtres réellement reliés aux
  systèmes. Les 9 onglets sont contrôlés à 1 024/768/375 px; cela ne valide pas chaque action mobile.
- **Partiel :** import des anciens états d’installations. Talents débloqués et personnel sont repris;
  affectations/automatisations/files et combats de l’ancien runtime ne sont pas entièrement convertis.
- **Non réalisé :** parcours intégral de Kanto, comparaison visuelle mesurée de tous les états à `main`,
  essais Windows réels et validation sur tous les navigateurs/thèmes. Aucun blocage technique actuel.
- **Preuves :** 372 tests automatisés, 17 scénarios Chromium; détails, décisions et reproduction dans
  [`PHASE_v1.14.18.md`](PHASE_v1.14.18.md) et [`../tests/browser/README.md`](../tests/browser/README.md).

## Priorités critiques

| Nº | Point à traiter | État | Version / preuve |
|---:|---|---|---|
| 1 | Équipe : sélectionner l’objet tenu dans le Sac, harmoniser l’interface et supprimer le panneau/markup dupliqué. | **Terminé** | 1.14.1 — 303 tests; parcours bureau/tactile consigné |
| 2 | Équipe : glisser-déposer pour échanger deux Pokémon. | **Reprise ciblée livrée — contrôle navigateur à faire** | 1.14.14 — glisser natif sur carte après maintien 400 ms, échange stable par UID et une sauvegarde; poignée pointeur et clavier conservés; 325 tests. Le retour a signalé que le geste précédent v1.14.2 ne fonctionnait pas à l'usage. |
| 3 | Équipe : appeler la Boîte PC en cliquant un Pokémon afin de le remplacer. | **Implémenté — contrôle navigateur à faire** | 1.14.2 — échange Équipe/PC atomique, 306 tests automatisés |
| 4 | Équipe : bouton unique « Gérer les équipes »; supprimer « PRESETS: » et le résumé « Équipe Aventure (0/6) ». | **Implémenté — contrôle navigateur à faire** | 1.14.2 — un seul bouton de gestion, résumé redondant retiré |
| 5 | Fiches d’information Pokémon : refonte lisible Stats/IV/EV inspirée de `main`, avec focus et défilement conservés. | **Implémenté — contrôle navigateur à faire** | 1.14.2 — trois onglets accessibles; focus/défilement testés |
| 6 | Carte : restaurer la légende « ? » et comparer couleurs/opacités à `main`. | **Implémenté — contrôle navigateur à faire** | 1.14.3 — six états de `main` confirmés par l’utilisateur le 22/10/2026; bouton et modal FR/EN; couleurs/opacités testées |
| 7 | Quêtes : masquer tout texte de quêtes répétables avant leur déblocage; retirer le texte parasite de dialogue. | **Implémenté — contrôle navigateur à faire** | 1.14.3 — cartes, aides et dialogue du tableau verrouillé couverts par tests |
| 8 | Lieu : supprimer les tags et centrer le nom du lieu en grand dans sa case. | **Implémenté — contrôle navigateur à faire** | 1.14.3 — tags retirés, titre centré et responsive; test d’interface |
| 9 | Lieu : réaligner l’affichage des informations de routes sur `main`. | **Implémenté — contrôle navigateur à faire** | 1.14.3 — rencontres, drops et progression agrégés par groupe; combat inchangé; test des routes scindées |
| 10 | Lieu : retirer le halo non conforme des boutons PNJ/arène et vérifier l’absence de halos sur les boutons concernés. | **Implémenté — contrôle navigateur à faire** | 1.14.3 — ombres désactivées pour les variantes normales/hover; test CSS |
| 11 | Boîte PC : corriger le visuel et l’interface par comparaison à `main`, sans retirer filtres, favoris, verrouillages ni rangs. | **Implémenté — contrôle navigateur à faire** | 1.14.2 — grille partagée; fonctionnalités existantes préservées |
| 12 | Pokédex : corriger le visuel et partager la présentation de grille/sprite avec la Boîte PC. | **Implémenté — contrôle navigateur à faire** | 1.14.2 — primitives communes; filtres et détail conservés |
| 13 | Donjons : corriger le visuel par comparaison à `main`. | **Implémenté — contrôle navigateur/jeu à faire** | 1.14.4 — styles rattachés au widget Rework réel; brouillard, états, grilles 7–11, focus et couleurs de thème testés |
| 14 | Donjons : corriger le blocage après combat et vérifier la reprise de progression. | **Implémenté — contrôle navigateur/jeu à faire** | 1.14.5 — la carte suit les événements typés début/fin de combat; reprise sauvegardée, victoire et accès à la case suivante testés |
| 15 | Anciennes sauvegardes : préserver/restaurer les déblocages de routes, arènes, Ligue, fonctionnalités et changement de région. | **Implémenté — contrôle navigateur/jeu à faire** | 1.14.7 — `visitedMaps`, `unlockedLocs`, retours de badges du jeu original, badges gym/accès régionaux et flags de Ligue; schéma 15 inchangé; tests de migration et parcours intégrés |
| 16 | Réglages : agrandir les panneaux à la largeur demandée (au moins 2× si le gabarit medium est déjà utilisé). | **Implémenté — contrôle navigateur/jeu à faire** | 1.14.6 — 1 120 px maximum desktop (viewport clamp); règle mobile 560 px conservée; test statique |
| 17 | Boîte PC et Pokédex : rapprocher l’affichage des Pokémon du jeu original, y compris les choix proposés dans le remplacement depuis l’équipe. | **Correctif implémenté — contrôle visuel utilisateur à faire** | 1.14.11 — tuile complète toujours partagée; aucun badge de rang affiché sur les Pokémon; catégories de tri intégrées à la barre de filtres pleine largeur, selon la structure unifiée de `main`; filtres/rangs de filtre et actions conservés; découplage `BoxPanel`/Équipe et transferts atomiques maintenus; schéma 15; 323 tests. Contrôle visuel manuel toujours requis. Les archives v1.14.8–1.14.10 restent historiques pour l’acceptation PC. |
| 18 | Équipe : rendre le choix d’objet tenu plus clair dans le Sac et ajouter un footer dédié au choix de remplacement PC. | **Reprise ciblée livrée — contrôle visuel utilisateur à faire** | 1.14.12 a bien le footer de remplacement PC; le retour signale que ce footer ne répond pas au choix d’objet tenu et que ses objets restent en colonne. 1.14.13 ajoute le footer Retirer/Annuler fixe au choix d’objet tenu et reprend la grille du Sac; schéma 15; 325 tests. |

## Retours de validation après v1.14.12

| Retour | Demande | État / version dédiée |
|---:|---|---|
| 1 | Choix d’objet tenu dans Team : footer fixe Retirer/Annuler et grille comme le Sac. | **Implémenté en 1.14.13** — retrait désactivé si aucun objet n'est équipé; grille standard du Sac; 325 tests. |
| 2 | Équipe : glisser-déposer fonctionnel pour échanger deux Pokémon, comme dans `main`. | **Implémenté en 1.14.14** — drag natif par carte après maintien 400 ms; la poignée pointeur et le clavier restent actifs; 325 tests. |
| 3 | Équipe : masquer l'emplacement « ajouter un Pokémon » lorsque l'équipe contient six Pokémon. | **Implémenté en 1.14.15** — règle flex exclue quand `.is-hidden` est présent; test à six Pokémon et test de spécificité CSS; 327 tests. |
| 4 | Lieu : faire ressembler les boutons des donjons à ceux de `main`. | **Implémenté en 1.14.16** — glyphe exploration équivalent, tarif/profondeur et sprite de jeton dans le libellé d'entrée, skin générique de `main`; l'expédition en cours conserve l'action Rework `DungeonSystem.enter()` et « Reprendre l'expédition ». 331 tests. |
| 5 | Boîte PC indépendante de l'équipe (tous les Pokémon, sans doublon, verrous d'action par emplacement), sprites de la grille de donjon de `main`, suppression du Guide « ? » de la Carte au profit de la légende (position et sprite repris). | **Implémenté en 1.14.17 — contrôle navigateur/jeu à faire** — schéma 16 (collection unique + migration v15→v16), `PokemonUsageSystem` réutilisable, emplacement et raisons de verrou dans la fiche, sélection Équipe filtrée; sprites/tailles/alignement de `main` sans changement de gameplay; légende seule aide de la Carte. 338 tests. |

## Porte de validation générale

À valider sur les correctifs concernés puis en clôture : Kanto entièrement jouable, progression non bloquée après les combats de donjon, déblocages d’une ancienne sauvegarde cohérents, navigation sans perte de focus et aucune modification non demandée. Les tests automatisés ne remplacent pas le parcours de jeu dans un navigateur. La v1.14.3 passe 312 tests automatisés, la v1.14.4 en passe 313, la v1.14.5 en passe 314, la v1.14.6 en passe 315, la v1.14.7 en passe 319, la tentative v1.14.8 en passe 320, l’étape intermédiaire v1.14.9 en passe 321, la reprise v1.14.10 en passe 322, la reprise v1.14.11 en passe 323, v1.14.12 en passe 325, v1.14.13 en passe 325, v1.14.14 en passe 325, v1.14.15 en passe 327 v1.14.16 en passe 331 et v1.14.17 en passe 338; le contrôle manuel navigateur/jouabilité reste à effectuer. Les retours reçus après v1.14.12 sont traités séparément : nos 1 (footer/grille d'objet tenu), 2 (drag Team), 3 (emplacement d'ajout à six), 4 (action visuelle du donjon) et 5 (PC indépendant, sprites de donjon, aide de la Carte) dans les ZIP v1.14.13, v1.14.14, v1.14.15, v1.14.16 et v1.14.17 respectivement. Le schéma de sauvegarde passe à 16 en v1.14.17. Le rendu du Pokédex demeure la référence approuvée et doit être protégé; le rendu PC ne sera pas déclaré accepté avant contrôle visuel utilisateur. La portée du point 6 (six états sémantiques de `main`) a été confirmée par l’utilisateur le 22/10/2026. Aucune réussite globale n’est annoncée avant les contrôles manuels.

## Journal des livraisons

| Version | Points inclus | Tests / validation | Archive |
|---|---|---|---|
| 1.14.0 | Port Base secrète antérieur à cette liste | 301 tests; parcours Base bureau/mobile | `pokeworld-rework-1.14.0.zip` — conservé |
| 1.14.1 | Point 1 — Sac / objet tenu | 303 tests; `node --check`; `git diff --check`; Playwright bureau/mobile; test après extraction | `pokeworld-rework-1.14.1.zip` — 2 488 fichiers, intégrité vérifiée |
| 1.14.2 | Points 2, 3, 4, 5, 11 et 12 | 306 tests, 0 échec; `node --check` sur JS/MJS; `git diff --check`; serveur HTTP 200; `npm test` après extraction; contrôle manuel navigateur/jeu encore requis | `pokeworld-rework-1.14.2.zip` — 2 560 fichiers, `unzip -t` sans erreur |
| 1.14.3 | Points 6–10 — lot unique autorisé | 312 tests, 0 échec sur le projet et après extraction; `node --check` sur tous les JS/MJS de `src` et `tests`; `git diff --check`; HTTP 200 (page, CSS carte, module carte); parcours manuel navigateur/jeu encore requis | `pokeworld-rework-1.14.3.zip` — 2 563 fichiers, 14 Mo, `unzip -t` sans erreur |
| 1.14.4 | Point 13 — visuel Donjons | 313 tests, 0 échec sur le projet et après extraction; `node --check`; `git diff --check`; serveur/page/CSS validés; contrôle manuel navigateur/jeu encore requis | `pokeworld-rework-1.14.4.zip` — 2 564 fichiers, intégrité vérifiée |
| 1.14.5 | Point 14 — reprise après combat de donjon | 314 tests, 0 échec sur le projet et après extraction; `node --check`; `git diff --check`; serveur/page/module validés; contrôle manuel navigateur/jeu encore requis | `pokeworld-rework-1.14.5.zip` — 2 565 entrées, intégrité vérifiée |
| 1.14.6 | Point 16 — largeur Réglages | 315 tests, 0 échec sur le projet et après extraction; `node --check`; `git diff --check`; serveur/page/CSS validés; contrôle manuel navigateur/jeu encore requis | `pokeworld-rework-1.14.6.zip` — 2 566 entrées, intégrité vérifiée |
| 1.14.7 | Point 15 — compatibilité des sauvegardes anciennes | 319 tests, 0 échec sur le projet et après extraction; `node --check` sur 582 JS/MJS; `git diff --check`; HTTP 200; tests des exports originaux, schémas Rework 9/11, routes, arènes, fonctionnalités, Ligue et changement de région; contrôle manuel navigateur/jeu encore requis | `pokeworld-rework-1.14.7.zip` — 2 568 entrées, 14 Mo, intégrité vérifiée |
| 1.14.8 | Point 17 — première tentative; Pokédex accepté, Boîte PC non acceptée (composant distinct) | 320 tests, 0 échec; archive extraite et contrôlée; tentative historique supplantée par v1.14.9 | `pokeworld-rework-1.14.8.zip` — 2 570 entrées, 14 Mo, intégrité vérifiée |
| 1.14.9 | Point 17 — étape intermédiaire; sprite/tuile PC encore visuellement rejetés, puis remplacée par v1.14.10 | 321 tests; archive historique conservée; ne pas considérer cette étape comme l’acceptation PC | `pokeworld-rework-1.14.9.zip` — 2 570 entrées, environ 14 Mo, intégrité vérifiée |
| 1.14.10 | Reprise du point 17 — tuile complète partagée et orchestrateur Team/Box indépendant; étape supplantée pour le rang et la barre PC | 322 tests; archive historique conservée; retours utilisateur traités dans v1.14.11 | `pokeworld-rework-1.14.10.zip` — 2 575 entrées, environ 14 Mo, intégrité vérifiée |
| 1.14.11 | Point 17 — retrait des badges de rang et correction de la barre filtres/tri PC | 323 tests, 0 échec sur le projet et après extraction; `node --check` sur 584 JS/MJS; métadonnées 1.14.11 / schéma 15; contrôles HTTP 200; `unzip -t` sans erreur; vérification visuelle manuelle toujours requise | `pokeworld-rework-1.14.11.zip` — 2 576 entrées, environ 14 Mo, intégrité vérifiée |
| 1.14.12 | Point 18 — Sac de sélection d'objet tenu et footer du choix de remplacement PC | 325 tests, 0 échec sur le projet et après extraction; `node --check` sur 586 JS/MJS; métadonnées 1.14.12 / schéma 15; HTTP 200; `unzip -t` sans erreur; validation visuelle manuelle encore requise | `pokeworld-rework-1.14.12.zip` — 2 579 entrées, environ 14 Mo, intégrité vérifiée |
| 1.14.13 | Retour no 1 — footer fixe Retirer/Annuler et grille du Sac pour le choix d'objet tenu | 325 tests, 0 échec sur le projet et après extraction; `node --check` sur 588 JS/MJS; `git diff --check`; métadonnées 1.14.13 / schéma 15; `unzip -t` valide; contrôle visuel manuel encore requis | `pokeworld-rework-1.14.13.zip` — 2 580 entrées, environ 14 Mo, intégrité vérifiée |
| 1.14.14 | Retour no 2 — drag Team sur carte complète avec maintien de 400 ms | 325 tests, 0 échec sur le projet et après extraction; `node --check` sur 588 JS/MJS; `git diff --check`; métadonnées 1.14.14 / schéma 15; `unzip -t` valide; contrôle visuel manuel encore requis | `pokeworld-rework-1.14.14.zip` — 2 581 entrées, environ 14 Mo, intégrité vérifiée |
| 1.14.15 | Retour no 3 — masquer l'emplacement d'ajout à six Pokémon | 327 tests, 0 échec sur le projet et après extraction; `node --check` sur 588 JS/MJS; `git diff --check`; métadonnées 1.14.15 / schéma 15; `unzip -t` valide; contrôle visuel manuel encore requis | `pokeworld-rework-1.14.15.zip` — 2 582 entrées, environ 14 Mo, intégrité vérifiée |
| 1.14.16 | Retour no 4 — rapprocher l’icône, le tarif/jeton et l’action visuelle du bouton de donjon de `main` | 331 tests, 0 échec sur le projet et après extraction; `node --check` sur 589 JS/MJS; `git diff --check`; métadonnées 1.14.16 / schéma 15; `unzip -t` valide; action d'expédition active conservée selon Rework; contrôle visuel manuel encore requis | `pokeworld-rework-1.14.16.zip` — 2 584 entrées, environ 14 Mo, intégrité vérifiée |
| 1.14.17 | Retour no 5 — Boîte PC indépendante (collection unique, schéma 16, verrous d'action), sprites de grille de donjon de `main`, légende seule aide de la Carte | 338 tests, 0 échec sur le projet et après extraction; `node --check`; `git diff --check`; métadonnées 1.14.17 / schéma 16; `unzip -t` valide; contrôle Chromium headless des trois points; contrôle manuel de jeu encore requis | `pokeworld-rework-1.14.17.zip` — 2 598 entrées, environ 14 Mo, intégrité vérifiée |
| 1.14.18 | Lieu partagé, accès permanent et vraies gestions Pension/Mine/Entraînement; réservations UID et reprise exacte Rework; personnel/talents; schéma 17 | 372 tests source, 17 scénarios Chromium; 655 JS/MJS; contrôles responsive des 9 onglets à 1 024/768/375 px; preuves et limites dans `PHASE_v1.14.18.md`; parité visuelle exhaustive et parcours Kanto non revendiqués | `pokeworld-rework-1.14.18.zip` — archive locale versionnée, manifeste SHA-256; aucun commit/push |
| 1.14.19 | Correction visuelle des trois installations et neuf onglets sur `main` rendu; vrais sprites et filtres par emplacement; migration schéma 18 | 396 tests, 26 scénarios Chromium (17 fonctionnels + 9 visuels/interactions); captures originales/Rework; filtres/focus/rechargement, remplacement atomique et confirmation Mine; limites dans `PHASE_v1.14.19.md` | `pokeworld-rework-1.14.19.zip` — archive vérifiée, manifeste SHA-256; aucun commit/push |
| 1.14.20 | Huit retours Équipe / Mine / helpers / Entraînement / presets / alcôves Lieu ; schéma 19 pour le compteur Mine | 419 tests, 43 scénarios Chromium (17 fonctionnels + 9 visuels + 17 nouveaux parcours) ; drag réel, sélections/annulations, compteur persistant et confirmations ; ligues exclues à la demande utilisateur | `pokeworld-rework-1.14.20.zip` — archive vérifiée après extraction, manifeste SHA-256 ; aucun commit/push |

## Mise à jour — v1.14.21 / schéma 20

- Devis d’améliorations Mine/Entraînement/Pension toujours visibles, sans prose de solde insuffisant.
- Grilles de helpers égalisées entre toutes les rangées, y compris recrutement mixte et mobile.
- Achats uniques en boutique : relance sauvage 2 500 PQ, donjon 5 000 PQ, pas d’objet d’inventaire.
- Relance naturelle à 5 secondes et pilote complet après 3 victoires locales : Farm/Gardien/Coffres.
- Tutoriel français A–Z (26 chapitres), HTML autonome et kit régional exécutable dans une copie séparée.
- 457 tests source et 56 scénarios Chromium réussis. Exemple : 12 assertions, 458 tests, 4 scénarios.
- Réparation des anciennes ligues toujours exclue, comme demandé ; aucune revendication de campagne
  naturelle complète, de simulation AFK hors ligne ou de test natif Windows.

Détails et preuves : [rapport 1.14.21](PHASE_v1.14.21.md).


## 1.14.22 — Entraînement adaptatif et Marché

- Débordement reproduit : panneau 228 px, slots forcés à 280 px. Les pistes sont maintenant bornées
  par le conteneur ; les petites cartes redistribuent identité, modes et achat automatique sans
  masquer le contenu. Le document reste le scroller.
- Raccourci Marché branché sur son vrai plein écran, composants de portefeuille/prix/quantité
  communs à la boutique, visuel issu du main, sélection visible et vues mises à jour en place.
- Achats en PQ par `ShopSystem`, collection unique et UID distincts, une sauvegarde, aucun faux
  crédit de capture/éclosion. Le schéma de production reste 20.
- Choix demandé et validé : mêmes filtres, rencontres actuelles du Rework conservées. Johto : six
  offres, et non quinze. Kanto : neuf ; Hoenn : quatre. Aucune table générée modifiée.
- Validation : **492 tests, 77 scénarios Chromium**, 714 vérifications syntaxiques, 41 CSS analysés,
  `DataValidator=[]`. Kit isolé **1.14.23-demo / schéma 21** : 12 + 493 + 4 réussites.
- Rapport et limites : [PHASE_v1.14.22.md](PHASE_v1.14.22.md). Aucune réparation de ligue réintroduite.


## 1.14.23 — Retours équipe / ancien main / Combat

- La souris ne doit plus attendre 400 ms : le glisser démarre à 5 px et suit réellement le pointeur.
  Les lignes d’attaque en lecture seule sont saisissables ; les actions réelles restent distinctes.
- Échap annule sans écriture ni clic parasite ; le prochain clic volontaire n’est pas avalé.
  Les cartes et UID ne sont pas recréés pendant les refreshs ; scroll de bord testé.
- Le switch d’un module main possédé n’est plus caché pendant un combat ou une expédition.
  Import de fichier main testé avec propriété/préférences conservées, sans nouveau paiement.
- Le contrôle Auto ne construit qu’un switch ; achats en boutique, pas de paragraphes/prix/statut
  ou boutons supplémentaires sur la surface de relance.
- Les cartes, textes et actions Combat restent dans le panneau contraint ; repos masqué en donjon.
  Le viewport de carte reste pannable comme prévu par la règle commune.
- **520 tests + 95 scénarios Chromium**, 718 JS/MJS et 43 CSS analysés, référentiels sans problème.
  Kit isolé : **12 + 521 + 4**. Schéma 20 inchangé, aucune table générée modifiée.
- Voir [PHASE_v1.14.23.md](PHASE_v1.14.23.md) pour formats testés et limite sans JSON personnel.


## 1.14.24 — Auto nommé par lieu et fond dispersé

- Les deux modules restent distincts : Auto combat sur exploration, Auto donjon sur un donjon,
  jamais les deux en même temps. FR/EN et noms dans les deux états. Même résolveur d’activité que Lieu.
- Le fond n’utilise plus quatre diagonales fixes ni des phases négatives : tirage de bords/points
  hors écran, directions et vitesses variées, départs échelonnés et espacement prévisionnel.
- Densité plafonnée selon l’écran, nœuds réutilisés, espèces/shinies capturées uniquement,
  RNG séparé du combat, aucune écriture et respect du mouvement réduit/visibilité.
- **551 tests + 109 scénarios Chromium**, 724 JS/MJS, 43 CSS, référentiels sans problème et
  seize tables générées inchangées. Kit isolé **12 + 552 + 4**. Schéma 20 conservé.
- Rapport : [PHASE_v1.14.24.md](PHASE_v1.14.24.md), avec méthode des échantillons d’animation.


## 1.14.25 — Réimplémentation native du Dictionnaire

- Remplacement du raccourci par le Dictionnaire plein format (`DictionaryPanel`, id `#fs-dictionary`).
- Trois onglets conformes au main : Objets, Attaques, Talents avec barre d'outils fixe et recherche instantanée.
- Découverte progressive des objets selon les générations débloquées (`ItemGenerationRules`) : 214 objets à Kanto, 252 à Johto, 277 à Hoenn, Gen 4+ masquée, masquage des balls non possédées.
- Cartes d'entrée interactives avec indication de possession, badges de types colorés et compteurs d'utilisateurs.
- Modale de détail superposée (`DictionaryDetailModal`, id `#pw-dictionary-detail`) avec prix, inventaire, sources d'obtention, effets de capacités, apprenants catégorisés et porteurs de talents.
- **574 tests unitaires + 121 scénarios Chromium** réussis, 724 fichiers JS et 43 feuilles CSS validés, schéma 20 inchangé.
- Voir [PHASE_v1.14.25.md](PHASE_v1.14.25.md) pour les détails techniques et méthodologiques.


## 1.14.26 — Sac, Fiche d'information Pokémon, Boîte PC continue et Widget Debug complet

- **Sac (Inventaire / BagView)** :
  - Restructuration visuelle et fonctionnelle en plein écran fidèle au design du `main` tout en respectant strictement l'architecture Rework (`UIFullscreenPanel`, `UIContainer`, `UIButton`, widgets réutilisables).
  - Gestion ergonomique des interactions : clic gauche différencié selon la nature de l'objet (pierres d'évolution déclenchant la sous-vue de sélection de cible d'évolution inline avec cartes de candidats et badges possédé/niveau ; objets de valeur/trésors déclenchant la sous-vue de vente inline avec cours en ₽ et boutons de vente unitaire / totale ; objets non utilisables ouvrant la modale de détail Dictionnaire avec bouton "Retour au sac"). Clic droit contextuel sur n'importe quel objet pour inspecter sa fiche détaillée Dictionnaire.
  - Barre d'onglets de catégories filtrées avec compteurs dynamiques précis et recherche instantanée live par nom.
- **Fiche d'information Pokémon (`PokemonInfoModal`)** :
  - Restructuration visuelle complète alignée sur la référence `main` : bandeau supérieur canonique avec numéro de Pokédex national, nom, marqueur shiny et bouton de fermeture standard.
  - Hero card supérieure épurée présentant le nom, le niveau, la localisation, la carte de sprite centrée sur disque, les badges de types colorés et les boutons interactifs de verrouillage et favori (suppression des barres parasites de PV et d'EXP qui surchargeaient la vue).
  - Panneau latéral d'onglets épuré (suppression de l'élément `<h3>` redondant) avec couleurs harmonisées sur les 6 statistiques canoniques (`STAT_COLORS`), ratios `${val} / ${max}` subtilement formatés et totaux clairs.
  - Grille modulaire de sections équilibrée en 2 colonnes : colonne 1 dédiée aux Talents (`PokemonTalentPanel`) ; colonne 2 combinant Rang (avec BST) et Objet tenu ; pleine largeur inférieure pour le panneau d'Évolutions.
  - **Flux de remplacement de capacités 100% interactif et fidèle à `main`** :
    - Détection automatique de la plénitude des capacités (4/4) avec affichage de l'indice de sélection.
    - Clic gauche sur une capacité connue pour armer son emplacement en remplacement (jauge avec puce rouge `⬇ Remplacement` et apparition du bouton `Annuler` dans l'en-tête).
    - Clic gauche sur une capacité apprenable pour apprendre ou remplacer immédiatement la capacité sans changer de vue.
    - Clic droit (menu contextuel) sur toute capacité (connue ou apprenable) pour ouvrir sa fiche détaillée Dictionnaire.
    - Bouton pleine largeur « Voir toutes les capacités » menant au catalogue complet d'apprentissage.
- **Règles d'apprentissage et affichage des CT / CS (`BagPanel` et `BoxPanel`)** :
  - Dans le Sac (`BagPanel`), les CT et CS affichent explicitement leur suffixe distinctif (`Surf CS`, `Toxik CT`).
  - Lors de l'utilisation d'une CT ou CS, la Boîte PC (`BoxPanel`) applique le filtrage strict de compatibilité d'espèce (`MoveLearningSystem.canUnlockWithItem`) : seuls les Pokémon compatibles avec les types de la capacité apparaissent dans la grille. Les Pokémon incompatibles sont exclus.
  - Titre canonique de la modale d'enseignement : `Enseigner {Capacité} (CT/CS) · ×{Quantité}`.
  - Bannière d'instruction explicite : `Cliquez sur un Pokémon compatible pour lui enseigner {Capacité}. Quantité restante : {Quantité}`.
  - Gestion de l'état vide avec le message canonique `Aucun Pokémon trouvé.` si la collection ne contient aucun sujet éligible.
- **Utilisation continue des objets ciblés dans la Boîte PC (`BoxPanel`)** :
  - Depuis le Sac (`BagPanel`), l'utilisation des Super Bonbons, vitamines (PV Plus, Protéine, Fer, Carbone, Calcium, Zinc) et objets d'apprentissage de capacités (CT/CS) bascule immédiatement sur la Boîte PC (`BoxPanel` en mode sélection d'objet `itemUseId`).
  - **Boucle d'application continue** : la modale Boîte PC reste ouverte après chaque utilisation tant que la quantité résiduelle de l'objet dans le Sac est strictement supérieure à 0. L'utilisateur peut ainsi enchaîner les montées de niveau ou les allocations d'EVs sur les Pokémon de son équipe ou de ses boîtes sans interruption.
  - Mise à jour instantanée des niveaux affichés, des jauges et des statistiques, accompagnée de notifications visuelles temporaires dédiées.
  - Dès épuisement complet de l'objet (quantité tombant à 0) ou en cas d'annulation explicite (bouton "Retour au sac" ou fermeture), la Boîte PC se referme et réouvre automatiquement le Sac.
- **Widget de Debug interactif conforme au `main` (`DebugWidget`)** :
  - Intégration d'un bouton flottant `#debug-widget-toggle` et d'un tiroir d'actions `#debug-drawer` ancrés en bas à droite, visibles exclusivement lorsque le mode développeur est activé dans les Paramètres.
  - Implémentation des 13 actions de débogage et de test de `main` :
    1. `+50 000₽` : crédit instantané de 50 000 unités de chaque devise majeure (`money`, `dungeonToken`, `questPoint`, `diamond`, `battlePoint`).
    2. `Super Bonbons +10` : ajout de 10 Super Bonbons dans l'inventaire.
    3. `Débloquer 8 badges Kanto` : attribution immédiate des 8 badges de la Ligue Kanto.
    4. `Énergie mine +100` : réinitialisation de l'énergie de la Mine souterraine à 100.
    5. `Base : toutes les décos +1` : déblocage et ajout d'un exemplaire de l'ensemble du catalogue de décoration de Base Secrète.
    6. `Base : +1 copain (équipe actuelle)` : capture de l'équipe active pour instancier un PNJ visiteur de base secrète.
    7. `Obtenir CT/CS +1` : ajout de chaque CT et CS du jeu dans l'inventaire.
    8. `AFK +30 min` : avance rapide temporelle simulée.
    9. `Tous les objets +1` : ajout de chaque objet de l'ItemDB dans l'inventaire.
    10. `Dictionnaire : tout afficher` : ouverture du Dictionnaire avec visibilité exhaustive forcée.
    11. `Vitesse x10 : ON/OFF` : accélération dynamique du système de combat (`BattleSystem`) par un facteur 10.
    12. `Cycle jour/nuit : AUTO / DAWN / DAY / DUSK / NIGHT` : forçage instantané de l'ambiance lumineuse via attribut `data-daytime`.
    13. `Nettoyer doublons Boîte` : purge des doublons résiduels de la collection PC.
- **Tests et validation** :
  - **579 tests unitaires** réussis (100% de succès), 0 régression, schéma de sauvegarde 20 rigoureusement préservé.
  - Suites de tests Playwright navigateur Chromium (`tests/browser/BagAndPokemonInfoParity.mjs` et `tests/browser/DebugAndBoxItemUse.mjs`) validant l'ensemble des scénarios visuels, l'enchaînement des 13 boutons debug et le cycle complet d'utilisation continue jusqu'à épuisement.
- Voir [PHASE_v1.14.26.md](PHASE_v1.14.26.md) pour les détails complets de validation et captures d'écran.


## 1.14.28 — Parité visuelle et fonctionnelle intégrale de la Fiche Pokémon et Modale de Capacités

- **Saut de version direct à 1.14.28** : suite à la remarque de l'utilisateur concernant la publication double de la 1.14.26, passage direct à la version **1.14.28** (schéma 20 préservé).
- **Fiche principale Pokémon (`PokemonInfoModal`)** :
  - **Héritage architectural strict UIPanel de taille Moyen** : hérite de `UIModal` (lui-même hérité de `UIPanel`), avec format standard Moyen (`size: 'md'`), respectant les 3 tailles uniques du jeu (sm, md, lg).
  - Vrai en-tête canonique natif UIPanel fixe (`.pw-win-hdr` avec `.pw-win-hdr-title` et titre dynamique `${isShiny ? '★ ' : ''}${displayName} #${species.dex}`, et bouton de fermeture standard `.pw-modal-close-btn`).
  - Suppression de l'ancienne classe externe `poke-detail-inner` et des règles CSS héritées qui forçaient `display: block !important` et cassaient la structure d'en-tête et de défilement.
  - Hero card supérieure épurée : nom en gras, niveau et localisation (`.poke-detail-name-row`), vignette sprite canonique 132px (`PokemonSpriteSizes.HERO` / `.pw-poke-circle-wrap--hero`), badges types 2 colonnes, bascule shiny (`.poke-detail-shiny-toggle`), boutons de protection (`.poke-protect-btn`) favori et verrouillé.
  - Onglets de statistiques latéraux (`stats`, `ivs`, `evs`) au design parchemin sans en-tête `h3` redondant, jauges de statistiques colorées (`STAT_COLORS`), ratios `${val} / ${max}` et totaux pour IV et EV.
  - **Sélecteur d'onglets de statistiques haute visibilité et couleurs du thème** : conteneur segmenté sombre (`rgba(0,0,0,0.25)`), onglets inactifs translucides discrets (`rgba(0,0,0,0.35)`), et onglet actif mis en valeur de manière éclatante avec la couleur d'accentuation du thème (`var(--accent)`), texte sombre contrasté (`var(--dark1)`) et ombre portée soignée.
  - **Bouton Verrouiller épuré** : retrait du symbole parasite « × » devant le libellé du bouton verrouiller (`.poke-protect-btn`), harmonisé avec le bouton favori.
  - **En-tête et dimensionnement conformes aux fenêtres moyennes** : nettoyage de la règle CSS héritée `#poke-modal-inner` (qui appliquait un rembourrage externe de 20px et un rétrécissement à 600px / 90%), neutralisation de la fausse boîte d'en-tête imbriquée `.poke-detail-title`, et alignement strict sur le format et l'en-tête de `SettingsModal` et des autres modales de taille moyenne (`size: 'md'`, `max-width: 620px`, en-tête fixe `.pw-win-hdr` de 50px de bord à bord avec titre à gauche et croix à droite, défilement confiné dans `.win-body`).
  - Grille modulaire de sections équilibrée en 2 colonnes :
    - **Talents** : disposition verticale stricte (`.poke-detail-talent-panel`), chaque phrase et bouton sur sa propre ligne sous le précédent sans empilement horizontal, menu déroulant conforme (`UIDropdown`), mentions de rareté `[Commun]`, `[Peu commun]`, `[Rare]`, puce Talent Caché cliquable et descriptions dédiées.
    - **Rang & BST** (`poke-rank-panel`) avec lettre de rang métallique et total des statistiques de base.
    - **Évolutions** (`.poke-detail-panel-wide`) affichant les conditions et cibles d'évolution.
    - **Section Objet tenu supprimée** : aucune section d'objet tenu sur la fiche Pokémon conformément à la demande explicite.
  - Bloc de capacités conforme :
    - 4 capacités équipées affichées sur 4 colonnes (badge de type, nom, puissance/catégorie `${pow} ${t('power_abbrev')} · ${cat}`, puce de statut).
    - Sélection et badge de remplacement (`_replaceSlot`), permutation directe de deux capacités équipées par simple clic, et apparition du bouton `Annuler` dans le titre.
    - **Capacités apprenables affichées à l'identique des capacités sélectionnées** : exactement 3 colonnes (badge de type, nom, puissance/catégorie), sans aucun bouton `+` ou élément inutile. Clic sur la ligne pour apprendre ou remplacer.
    - Clic droit contextuel sur toute capacité (connue ou apprenable) pour ouvrir sa fiche détaillée dans le Dictionnaire (`ModalIds.DICTIONARY_DETAIL`).
    - Bouton pleine largeur « Voir toutes les capacités » (`.poke-detail-full-list-btn`) ouvrant par-dessus la modale d'apprentissage.
- **Fenêtre dédiée d'apprentissage des capacités (`PokemonMoveLearningModal`)** :
  - **Héritage architectural strict UIPanel de taille Moyen** : hérite de `UIModal` (qui hérite de `UIPanel`), format moyen (`size: 'md'`), empilée au-dessus de `PokemonInfoModal` (`z-index: 31001`).
  - Fermeture ciblée par la croix native de l'en-tête (`.pw-modal-close-btn`) : ferme uniquement la modale des capacités et laisse la fiche Pokémon ouverte dessous.
  - Vrai en-tête natif UIPanel fixe avec titre et sous-titre ratio possédé (`X/Y possédées` dans `.pw-win-hdr-subtitle`).
  - Trois catégories avec titres visibles et compteurs : `★ Niveau (N)`, `◇ CT/CS (N)`, `▽ Entraînement (N)`.
  - Puces d'état `✓ Équipée`, `✓ Disponible`, verrouillée avec niveau requis / inventaire requis.
  - Clic droit contextuel pour inspecter la fiche Dictionnaire de chaque capacité.
  - **Pied de page Footer natif UIPanel fixe (`.pw-panel-footer`)** : bouton unique `← Retour au Pokémon` (`.poke-detail-mini-btn`) configuré via `hasFooter: true` et `addFooterChild`, centré au bas de la modale.
- **Conformité du Panneau des Filtres de Poké Balls (`BallFilterEditorModal`)** :
  - Vrai en-tête natif `UIModal` : titre *« Paramètres des Poké Balls »*, `hasHeader: true`, bouton de fermeture natif `.pw-modal-close-btn`.
  - Suppression du faux titre redondant dans le corps de la fenêtre (`.pw-ball-title`).
  - Suppression du bouton « Fermer » superflu en pied de liste (`.pw-ball-actions`).
- **Tests et validation** :
  - **588 tests unitaires réussis sur 588 (100% de succès)**, 0 régression, schéma 20 inchangé.
  - Suite dédiée `tests/PokemonInfoAndTmParity.test.js` enrichie pour valider la vignette 132px, la structure canonique d'en-tête, la permutation de capacités par clic, l'absence de section objet, l'intégration conforme des talents via `UIDropdown`, et la modale superposée des capacités apprenables avec ses 3 catégories et son bouton unique.
- Voir [PHASE_v1.14.28.md](PHASE_v1.14.28.md) pour les détails complets.


## 1.14.33 — Phase 1 : Uniformisation des affichages et gabarits de fenêtres

- **Passage à la version 1.14.33** (`GameConfig.VERSION`, `package.json`, `package-lock.json`), schéma 20 canonique inchangé.
- **Uniformisation des gabarits de panels** :
  - Identification et suppression des dimensions isolées et codées en dur (620px pour la fiche Pokémon, 980px × 760px pour les installations).
  - Alignement strict de la Fiche d'information Pokémon (`PokemonInfoModal`) et des trois menus de gestion d'installations (`FacilityManagementModal` : Mine, Entraînement, Pension) sur le gabarit de référence des Paramètres (`SettingsModal`) :
    - Format bureau : `width / max-width: min(1120px, calc(100vw - 40px))`, `height / max-height: 85vh`.
    - Format mobile : `width: min(560px, calc(100vw - 24px))`, `height: min(85vh, 720px)`.
  - Harmonisation des composants JS : `FacilityManagementModal` bascule de `size: 'custom'` vers `size: 'md'`, `PokemonInfoModal` reçoit la classe sémantique `pw-pokemon-info-window`.
  - Nettoyage des règles CSS parasites dans `design-system.css`, `facilities.css` et consolidation dans `ui-modal.css`.
- **Tests et validation** :
  - **589 tests réussis sur 589 (100% de succès)**.
  - Ajout du test `Settings, PokemonInfoModal, and FacilityManagementModals share the same size template`.
- Voir [PHASE_v1.14.33.md](PHASE_v1.14.33.md) pour les détails complets.


## 1.14.33 — Phase 2.1 : Système de Succès (Achievements)

- **Implémentation complète du système de succès sous l'architecture Rework** :
  - `AchievementDB` (`src/data/achievements/AchievementDB.js`) : dépôt de données étendant `DataRepository`, couvrant les 84 succès des 15 familles (Pokédex, Shinies, Combat, Capture, Routes, Revanches, Exploration, Pension, Entraînement, Souterrain, Économie, Atoll, Base, Easter eggs, Formes) pour un total de 229 paliers.
  - `AchievementsData` (`src/data/save/AchievementsData.js`) : modèle de données persisté étendant `BaseModel`, gérant les paliers débloqués, horodatages, succès épinglé et compteurs statistiques. Intégré dans `SaveData.js` et pris en compte dans `MigrationOriginalToV1.js` (schéma 20 inchangé).
  - Événements `AchievementUnlockedEvent` et `AchievementPinnedEvent` créés dans `src/core/events/`.
  - `AchievementBonusProvider` (`src/systems/achievements/AchievementBonusProvider.js`) : fournisseur de bonus permanent branché sur le `BonusSystem` unifié, appliquant les garde-fous anti-inflation (argent global max +29 %, XP globale max +25 %, capture max +4,5 pt, shiny max ×1,15, argent régional max 15 %).
  - `AchievementSystem` (`src/systems/AchievementSystem.js`) : moteur de progression singleton avec évaluation réactive des métriques, calcul de progression, déblocage avec notification dorée, et rétroactivité complète au chargement de sauvegarde.
  - `AchievementsFullscreenPanel` (`src/panels/fullscreen/AchievementsFullscreenPanel.js`) : modale plein écran `ModalIds.ACHIEVEMENTS` avec bannière récapitulative, barre de filtres par famille avec icônes, pastilles de paliers, badges de rangs métalliques et bouton d'épinglage.
  - `AchievementsPanel` (`src/panels/AchievementsPanel.js`) : widget de suivi sur le tableau de bord avec sélecteur d'objectif, barre de progression et ouverture de la vue plein écran au clic.
  - Intégration dans `IconRegistry.js` (9 glyphes SVG vectoriels), `Shortcuts.js` (raccourci vers les succès), `GamePage.js`, `main.js`, et dictionnaires FR/EN.
- **Tests et validation** :
  - **605 tests automatisés réussis sur 605 (100% de succès)**.
  - Suite de tests complète ajoutée dans `tests/Achievements.test.js`.
  - Conformité stricte aux `StaticRules.test.js` (0 violation).
- Voir [PHASE_v1.14.33.md](PHASE_v1.14.33.md) pour les détails complets.


## 1.14.33 — Phase 2.2 : Atoll de Combat (Battle Atoll)

- **Recréation complète de l'Atoll de Combat sous l'architecture Rework** :
  - `AtollData` (`src/data/save/AtollData.js`) : modèle de données persisté étendant `BaseModel`, stockant les jetons, la série actuelle, le record de victoires, les victoires par mode, l'état de l'Usine de Combat (mode, fenêtre, série, roster d'emprunt), et les fragments de Légende. Intégré dans `SaveData.js` et supporté par `MigrationOriginalToV1.js` (schéma 20 inchangé).
  - `AtollDB` (`src/data/atoll/AtollDB.js`) : définition des 14 modes de défi (Tour, Usine, Arène, Dôme), rotation cyclique de 12 heures synchronisée sur UTC, graine pseudo-aléatoire déterministe régénérée tous les 3 jours, bannissements tournants de légendaires (avec la Tour Libre comme sanctuaire sans ban), sets compétitifs optimisés au niveau 100 avec budgets IV/EV <= 36, et formules de gains de jetons et fragments.
  - Événements `AtollStateChangedEvent` et `AtollBattleFinishedEvent` créés dans `src/core/events/`.
  - `AtollBattleContext` (`src/systems/atoll/AtollBattleContext.js`) : sauvegarde de l'équipe du joueur, gestion des équipes de location, règlement à l'issue du combat, octroi des récompenses et réorganisation forcée de l'équipe d'emprunt.
  - `BattleSystem` (`src/systems/BattleSystem.js`) : intégration de `startAtollBattle()`, support de `_atollBattle` pour les équipes d'emprunt et métadonnées d'affichage.
  - `AtollSystem` (`src/systems/AtollSystem.js`) : système moteur singleton gérant le verrouillage post-Ligue, la validation des équipes selon les règles de chaque mode, les sessions de l'Usine, la boutique d'échange de jetons et l'invocation des Pokémon Légendaires.
  - `AtollFullscreenPanel` (`src/panels/fullscreen/AtollFullscreenPanel.js`) : panneau plein écran `ModalIds.ATOLL` avec panneau verrouillé pré-Ligue, en-tête héro récapitulatif, 6 onglets (Accueil, Tour, Usine, Arène, Dôme, Boutique & Fragments), minuterie de rotation dynamique et intégration d'icônes SVG conformes.
  - `AtollFactoryPrepModal` (`src/panels/AtollFactoryPrepModal.js`) : modale de préparation tactique `ModalIds.ATOLL_FACTORY_PREP` permettant la réorganisation de la formation et des capacités des Pokémon loués.
  - Raccourci vers l'Atoll branché sur `ModalIds.ATOLL` dans `Shortcuts.js`.
- **Tests et validation** :
  - **623 tests automatisés réussis sur 623 (100% de succès)**.
  - 17 nouveaux tests unitaires complets ajoutés dans `tests/Atoll.test.js`.
  - Conformité stricte aux `StaticRules.test.js` (0 violation).
- Voir [PHASE_v1.14.33.md](PHASE_v1.14.33.md) pour les détails complets.


## 1.14.33 — Phase 2.3 : Base Secrète (Secret Base)

- **Consolidation et intégration complète du système de Base Secrète sous l'architecture Rework** :
  - `SecretBaseData` (`src/data/save/SecretBaseData.js`) : modèle de données persisté étendant `BaseModel`, stockant le plan, le lieu, les décorations placées, le stock en réserve, les PNJ et leur équipe/messages, les records de visites et le suivi des drapeaux. Intégré dans `SaveData.js` et supporté par `MigrationOriginalToV1.js` (schéma 20 inchangé).
  - `SecretBaseItemDB` & `SecretBaseLayoutDB` (`src/data/base/`) : catalogues des 122 décorations sur 8 catégories et des 36 plans de base conformes à Pokémon Émeraude.
  - `SecretBasePlacementRules` : gestion des collisions au sol, meubles de surface, encombrements multicases et ancrages muraux.
  - `SecretBaseFlagBonusProvider` : intégration au `BonusSystem` commun apportant les bonus échelonnés par paliers ORAS (argent, EXP, énergie de Mine, butin de route).
  - `SecretBaseExchangeRules` : partage JSON de bases en lecture seule sans fuite de données d'inventaire ou de progression.
  - `SecretBaseSystem` : moteur complet coordonnant l'établissement sur une alcôve, le déménagement avec retour automatique des meubles au stock, l'édition des meubles et des PNJ, les visites interactives avec déplacement animé, les duels dédiés sans effet parasite sur les compteurs sauvages, et la prise de drapeau toutes les 24h.
  - `SecretBasePanel` & `SecretBaseVisitModal` : interfaces utilisateur conformes aux widgets Rework, avec rendu Pixel Art sur Canvas `SecretBaseRoomView`.
  - Intégration réactive avec `AchievementSystem` : écoute de `SecretBaseChangedEvent` et progression automatique des succès `base_flags`, `base_decos`, `base_visitors`.
- **Tests et validation** :
  - **624 tests automatisés réussis sur 624 (100% de succès)**.
  - 10 tests unitaires complets dans `tests/SecretBase.test.js` vérifiant l'ensemble du cycle de vie et l'intégration avec les succès.
  - Conformité stricte aux `StaticRules.test.js` (0 violation).
- Voir [PHASE_v1.14.33.md](PHASE_v1.14.33.md) pour les détails complets.

## 1.14.34 — Correctifs Succès & Parité Base Secrète

- **Ajustements du système de Succès (Achievements)** :
  - Suppression du bouton d'épinglage individuel ; le clic sur la carte bascule l'état épinglé.
  - Contour vert distinctif (`.is-pinned`) sur les cartes épinglées.
  - Support de plusieurs succès épinglés simultanément dans `AchievementsData`, `AchievementSystem`, et affichage dynamique de la liste dans `AchievementsPanel`.
  - Intégration de `FilterBar` unifiée avec drawer mobile, filtre par famille, chips de statut (`Tous`, `En cours`, `Terminés`, `Épinglés`), recherche et réinitialisation.
  - Refonte visuelle complète de la section des bonus permanents en une grille spacieuse et claire (`.pw-ach-bonuses-section`, `.pw-ach-bonuses-grid`, `.pw-ach-bonus-card`).
- **Parité visuelle et fonctionnelle de la Base Secrète** :
  - Intégration du canvas 2D directement dans la fenêtre `#win-base` (`#base-canvas-2d`, échelle 32px GBA 2×) avec fonds Émeraude, ombres de contact et tri en profondeur.
  - Barre d'outils `#base-toolbar` : « Ramasser » (`#base-ed-pickup`), « Modifier le PNJ » (`#base-ed-npc-edit`), « Modifier le PC » (`#base-ed-pc-edit`), texte d'aide contextuel (`#base-ed-hint`), « Exporter », « Visiter un fichier… » et « Visiter » / « Arrêter la visite ».
  - Tiroir de réserve `#base-stock` avec 9 onglets de catégories, pastilles de décompte, vignettes circulaires d'objets et bouton d'ajout de PNJ.
  - Mode visite interactif directement dans le canvas de la fenêtre avec pathfinding BFS et déclenchement des dialogues PNJ/PC.
  - Création des modales `SecretBaseNpcModal` et `SecretBasePcModal`.
- **Validation** :
  - **628 tests passants sur 628 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.14.34.md](PHASE_v1.14.34.md) pour les détails complets.

## 1.14.35 — Ajustements Succès & Base Secrète

- **Ajustements Succès (Achievements)** :
  - Suppression de la hauteur maximale et du défilement interne sur `.pw-ach-tracker-list` : la fenêtre s'étend désormais naturellement quel que soit le nombre de succès épinglés (plus besoin de scroller au-delà de 3 succès).
- **Ajustements Base Secrète** :
  - Élimination des étirements de canvas et de sprites : passage en dimensions intrinsèques préservées (`width: auto; height: auto; max-width: 100%; max-height: 58vh; object-fit: contain; margin: 0 auto;`) avec centrage et bandes latérales neutres.
  - Conformité stricte de `SecretBaseVisitModal` avec `UIModal` et `Rules.md` : en-tête avec bouton de fermeture et fermeture interactive sur clic de fond de fenêtre (backdrop).
  - Déblocage complet des PNJ : le joueur peut poser des PNJ dès le début sans objet requis, avec un nombre illimité (`MAX_NPCS: Infinity`) et pastille infinie `∞`.
- **Validation** :
  - **631 tests passants sur 631 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.14.35.md](PHASE_v1.14.35.md) pour les détails complets.

## 1.14.36 — Isolation de la visite de Base Secrète & Refonte du formulaire PNJ

- **Isolation de la visite de Base Secrète depuis la fenêtre Lieu** :
  - La visite d'une alcôve ou de sa propre base depuis le composant `LocationAlcoves` de la fenêtre Lieu n'active plus le mode visite sur le `DraggablePanel` de la Base Secrète (`SecretBasePanel`).
  - `SecretBaseSystem.startOwnVisit({ fromLocation: true })` et `startAlcoveVisit` transmettent désormais le marqueur `fromLocation: true` dans le snapshot de session `SecretBaseVisitChangedEvent`.
  - `SecretBasePanel` ignore les lancements de visite externes (`fromLocation: true` ou `source: 'alcove'`), laissant le panneau d'édition intact tout en permettant à la modale de visite dédiée `SecretBaseVisitModal` de s'exécuter indépendamment.
- **Refonte ergonomique et visuelle de la modale de modification de PNJ (`SecretBaseNpcModal`)** :
  - Suppression de la grille étroite à 2 colonnes où les libellés et zones de saisie étaient collés.
  - Alignement sur l'architecture et les espacements de la fenêtre `Settings` : utilisation de `.save-profile-field` avec libellés surélevés, espacements généreux (12px à 16px) et champs de saisie confortables et pleine largeur.
  - **Galerie d'apparences visuelle (101 visuels)** : remplacement du menu déroulant brut par un sélecteur visuel interactif complet (`_mode: 'sprite-picker'`) avec filtre de recherche et cartes portraits 48px sélectionnables en un clic.
  - **Constructeur d'équipe interactif** : fiches Pokémon individuelles avec miniatures, noms et niveaux, bouton de retrait `✕`, boutons d'ajout `+`, sélecteur de Pokémon issu de l'équipe et de la boîte PC avec recherche (`_mode: 'mon-picker'`), et sélecteur d'équipes et préréglages complets (`_mode: 'preset-picker'`).
  - Section de répliques spacieuse avec champs dédiés pour « Avant le combat », « S'il gagne » et « S'il perd ».
- **Validation** :
  - **634 tests passants sur 634 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.14.36.md](PHASE_v1.14.36.md) pour les détails complets.

## 1.14.38 — Marqueur Joueur sur la Carte, Ergonomie PNJ Base Secrète & Équilibrage

- **Marqueur visuel du joueur sur la carte (`UIMapView` & `MapPanel`)** :
  - Restauration du marqueur du dresseur (`pw-map-player`, `pw-map-player-ring`, `pw-map-player-bob`) centré sur le nœud du lieu actuel avec infobulle localisée (« Vous êtes ici »).
  - Déplacement instantané lors d'un voyage vers un nouveau lieu et masquage lors du changement de région.
- **Correction du filtre de recherche de la modale PNJ (`SecretBaseNpcModal`)** :
  - Élimination de la destruction du champ de recherche (`onInput`) lors de la saisie dans le sélecteur d'apparence (101 sprites) et le sélecteur de Pokémon.
  - Mise à jour dynamique de la grille d'éléments sans recréer le champ de texte, préservant en permanence le focus et le curseur.
- **Parité des cartes d'équipe du PNJ avec la référence standard** :
  - Implémentation du composant dédié `BaseNpcMemberCard` héritant de `PokemonCardView` (`poke-card`).
  - Affichage complet des 4 capacités (`poke-moves`), sprite de dresseur et Pokémon, niveau, badge d'objet tenu, bouton de retrait `✕` et clic pour remplacer le slot.
  - Emplacement libre sous forme de zone de dépôt `preset-slot-empty` avec `+ Ajouter un Pokémon`.
- **Validation d'équilibrage du jeu** :
  - Taux de capture strictement inchangés (maintien de l'accessibilité des Pokémon rares).
  - Confirmation de la règle des 0 XP en combat actif contre les adversaires de bas niveau.
  - Propositions de sécurisation de la Pension contre l'abus de victoires gratuites (frais obligatoires par niveau, échelonnement des K.O.).
  - Moteur de combat confirmé en auto-battle sans IA avec équilibre Vitesse vs Bulk/Attaque.
- **Validation** :
  - **635 tests passants sur 635 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.14.38.md](PHASE_v1.14.38.md) pour les détails complets.

## 1.14.39 — Unification Complète de l'Édition d'Équipe & Plan d'Action d'Équilibrage

- **Unification du rendu et du fonctionnement des équipes** :
  - L'édition de l'équipe du PNJ de Base Secrète (`SecretBaseNpcModal`) et l'édition des préréglages d'équipe (`TeamPresetEditorModal`) adoptent le même système visuel et interactif que l'équipe active (`ActiveTeamPanel`).
  - Conteneur `.team-view` avec liste `.pw-team-member-list` pilotée par `UISortableList`.
  - Cartes `.poke-card.pw-poke-card` avec poignée de glisser-déposer (`.pw-team-drag-handle`), bouton de retrait (`.pw-team-store-btn`), badge d'objet tenu, infobulle de capacités, et 4 attaques (`.poke-moves`).
  - Emplacement d'ajout standardisé `.pw-drop-zone` avec symbole `+`, libellé « Ajouter un Pokémon » et compteur `Équipe : X/6`, visible tant que l'équipe compte moins de 6 membres.
  - Interactions unifiées : clic gauche pour remplacer le Pokémon via le sélecteur, clic droit (menu contextuel) pour ouvrir la fiche d'informations, et réorganisation libre par glisser-déposer ou au clavier (flèches Haut / Bas).
- **Correction du sélecteur d'importation d'équipe (`SecretBaseNpcModal`)** :
  - Chaque carte d'équipe importable affiche désormais clairement la liste intégrale des Pokémon qui la composent (miniature sprite, nom d'espèce localisé, niveau).
  - Élimination des images brisées causées par le passage erroné de `{ shiny }` comme second argument de `AssetPaths.pokemonSprite`.
- **Suppression du double rond autour des sprites dans la liste des équipes (`TeamPresetsPanel`)** :
  - Suppression des bordures et fonds résiduels sur `.preset-chip:has(.pw-poke-circle-wrap)` et `.preset-row-chips .preset-chip:not(.missing)`.
  - Seul le disque canonique uniforme de `UIPokemonSprite` est affiché, supprimant la double bordure circulaire concentrique.
- **Plan d'action et analyse d'équilibrage comparative approfondie** :
  - Étude comparative détaillée entre PokéWorld, la référence (main / PokéChill) et PokéClicker (voir [docs/ANALYSE_EQUILIBRAGE_COMPARATIF.md](ANALYSE_EQUILIBRAGE_COMPARATIF.md)).
  - *Pension & Garderie* : Barème progressif des frais (15 ₽ en début de Kanto jusqu'à 2 000 ₽ en fin de jeu), formule linéaire des K.O. (1 K.O. par niveau, total 4 950 K.O.), Level Cap régional débloqué à 100 après la Ligue, et dissociation stricte de la reproduction/incubation/IV.
  - *Économie & Monnaies* : Articulation des 3 monnaies complémentaires (Pokédollars pour consommables/pension/vitamines, Jetons de Donjon obtenus par capture pour entrer dans les donjons, Points de Quête pour les automatisations/Master Balls).
  - *Moteur de Combat* : Rotation des 4 capacités, facteurs de cooldown par attaque (rapide vs lourde), équilibre Vitesse vs Bulk/Dégâts, et montée en puissance des objets tenus.
  - *Taux de capture* : Maintien strict du statu quo afin d'éviter le découragement sur les espèces rares.
- **Validation** :
  - **635 tests passants sur 635 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.14.39.md](PHASE_v1.14.39.md) et [ANALYSE_EQUILIBRAGE_COMPARATIF.md](ANALYSE_EQUILIBRAGE_COMPARATIF.md) pour les détails complets.

## 1.15.0 — Refonte du Plafond de Pension Régional, Embuscades de Carte & Combats d'Histoire

- **Plafond Régional de la Pension (Daycare Regional Level Cap)** :
  - Un Pokémon à la pension ne peut jamais dépasser le niveau du meilleur Pokémon possédé de sa propre région d'origine (`species.region`).
  - Exemple validé : Rattatac Nv 100 (Kanto) et Kaiminus Nv 30 (Johto) -> Hoothoot (Johto) est bloqué au Nv 30 à la pension tant que Kaiminus n'est pas entraîné plus haut.
  - Filtrage des candidats (`HatcherySystem.getCandidates`) et autoremplissage/retrait automatique adaptés.
- **Système d'Embuscades des Teams Ennemies sur la Carte (`TeamAmbushSystem`)** :
  - Apparition d'embuscades de sbires et boss de Teams sur la carte du monde selon l'avancement en badges.
  - Rendu SVG dynamique avec groupe `.pw-map-team-ambush`, anneau pulsé `.pw-map-ambush-ring` et sprite officiel du dresseur.
  - Tout déplacement vers le lieu déclenche le combat. En cas d'échec / repli, le joueur reste à l'emplacement précédent. En cas de victoire, l'embuscade est levée et le joueur entre sur le lieu.
- **Bouton « Combattre » Ciblé dans les Quêtes (`StoryPanel` / `QuestCard`)** :
  - Bouton direct « Combattre » réservé exclusivement aux combats d'histoire contre les Rivaux et les Teams ennemies (Rocket, Aqua, Magma).
  - Les champions d'arène (badges) ne disposent plus du bouton direct dans les quêtes et doivent être affrontés dans leur arène.
- **Normalisation Terminologique** :
  - Remplacement de « Pierre Liaison » / « Link Stone » par « Câble Link » (FR) / « Link Cable » (EN).
  - Renommage intégral du « PokéMarket » / « Marché » en « Marché Noir » / « Black Market ».
- **Validation** :
  - **640 tests passants sur 640 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.15.0.md](PHASE_v1.15.0.md) pour les détails complets.

## 1.15.1 — Formes de Base sur les Routes, Étalonnage d'Entraînement BST, Combo Cross-STAB & Quêtes du Marché Noir

- **Suppression des Évolutions Sauvages sur les Routes (`encounters-content.js`)** :
  - Remplacement des formes évoluées sauvages (`raticate`, `gloom`, `weepinbell`, `fearow`, `arbok`, `tentacruel`) des routes 14, 17, 18, 19, 20, 21, 23 par leurs formes de base (`rattata`, `oddish`, `bellsprout`, `spearow`, `ekans`, `tentacool`).
  - Incite à la montée en niveau active des Pokémon de base pour déclencher leurs évolutions.
- **Étalonnage Relatif de l'Entraînement des EVs (`TrainingSystem.js`)** :
  - Calcul dynamique de niveau basé sur le ratio BST stagiaire/opposant ($\min(1.15, \max(0.60, \text{traineeBst} / \text{oppBst}))$).
  - Permet aux Pokémon de toutes classes (y compris E et D comme Chenipan et Magicarpe) de remporter leurs combats d'entraînement d'EVs.
- **Bonus de Combo Offensif Cross-STAB (`BattleRules.js` & `DamageCalculator.js`)** :
  - Bonus de $+35\%$ de dégâts lors de l'alternance entre deux types STAB natifs distincts.
- **Déblocage Narratif du Marché Noir (`FeatureAccessSystem.js`)** :
  - Autorisation d'accès au Marché Noir suite à la complétion de la quête `main.33` (Repaire Rocket de Céladopole).
- **Validation** :
  - **644 tests passants sur 644 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.15.1.md](PHASE_v1.15.1.md) pour les détails complets.

## 1.15.2 — Capacités de Combat Spécifiques & Système de Fatigue en Combat Prolongé

- **Mécaniques des Capacités de Combat Spécifiques (`DamageCalculator.js` & `MoveTyping.js`)** :
  - `weather_ball` (Ball'Météo) : Dynamique de type selon la météo active (Eau sous Pluie, Feu sous Soleil, Roche sous Sable, Glace sous Grêle) avec multiplicateur de dégâts $\times 2$.
  - `stored_power` (Force Ajoutée) : Puissance accrue de $+30$ par palier de statistique positive du lanceur.
  - `body_press` (Big Splash) : Calcul des dégâts physiques basé sur la Défense (`def`) du lanceur au lieu de l'Attaque.
- **Système de Fatigue en Combat Prolongé & Talent Endurance (`BattleSystem.js`)** :
  - Application d'une usure de fatigue progressive sur l'équipe active au-delà de 50 combats sauvages consécutifs dans la même session.
  - Le talent `stamina` (Endurance) divise par 2 l'usure de fatigue subie.
- **Validation** :
  - **648 tests passants sur 648 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.15.2.md](PHASE_v1.15.2.md) pour les détails complets.

## 1.15.3 — Boss de Raid Légendaires, Hard Enrage 90s, Transit Régional & Paliers de Pension

- **Boss de Raid Légendaires Épiques (`DungeonBattleRules.js`)** :
  - Points de vie des boss légendaires de donjon multipliés par $\times 35$ (Artikodin, Électhor, Sulfura, Mewtwo...).
  - Multiplicateurs de statistiques renforcés et niveau minimal 70.
  - Attribution du statut `legendaryBoss: true`.
- **Hard Enrage Timer de 90 Secondes (`BattleSession.js`)** :
  - Déclenchement d'un wipe mortel de l'équipe (`dungeon_boss_enrage_wipe`) si le boss légendaire n'est pas vaincu en 90 secondes.
  - Impose un DPS check exigeant l'optimisation complète (IV, EV, objets, Cross-STAB).
- **Condition de Transit Régional Pokédex Hors Légendaires (`FeatureAccessSystem.js`)** :
  - Déblocage de la région suivante fondé sur la victoire en Ligue et la complétion du Pokédex régional standard (hors légendaires de raid endgame).
- **Paliers de Tarification Progressive de la Pension (`HatcherySystem.js` & `HatcheryData.js`)** :
  - Mémorisation du `initialLevel` en pension et tarification progressive de $100$ ₽ de base $+ 100$ ₽ par niveau gagné.
- **Validation** :
  - **652 tests passants sur 652 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.15.3.md](PHASE_v1.15.3.md) pour les détails complets.

## 1.15.4 — Objets Tenus Palier 25, Cristaux Z & Méga-Gemmes, Talents Simple & Lunatique, Laboratoire de Cramois'Île

- **Extension des Paliers d'Objets Tenus jusqu'au Palier 25 (`BattleRules.js` & `HeldItemPower.js`)** :
  - Échelonnement continu jusqu'au Palier 25 (120 exemplaires) pour le raid endgame.
- **Activation des Méga-Gemmes & Cristaux Z (`DamageCalculator.js` & `BattleEffectCoverage.js`)** :
  - Multiplicateur de puissance d'objet tenu pour `mega_stone` et boost de type $\times 1.4$ pour `z_crystal`.
  - Statut promu de `DEFERRED` à `PORTED` dans `BattleEffectCoverage.js`.
- **Talents Simple (`simple`) & Lunatique (`moody`) (`StatChangeRules.js` & `TurnEndRules.js`)** :
  - Doublement des modificateurs de stats pour le talent Simple.
  - Fluctuation de stats de fin de tour (+2 / -1) pour le talent Lunatique.
- **Laboratoire de Résurrection de Fossiles à Cramois'Île (`FossilRules.js` & `FossilSystem.js`)** :
  - Autorisation officielle de résurrection à Cramois'Île (`cinnabar`) en conformité avec le canon.
- **Validation** :
  - **657 tests passants sur 657 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.15.4.md](PHASE_v1.15.4.md) pour les détails complets.

## 1.15.5 — Talent Corps en Or, Moteur Fast-Forward Post-AFK & Validation Globale de Bout en Bout

- **Talent Corps en Or (`goodasgold`) (`StatusRules.js` & `StatChangeRules.js`)** :
  - Immunité totale aux altérations de statut et aux baisses de statistiques en combat.
  - Bonus passif de $+15\%$ de chance de rencontre chromatique.
- **Moteur Fast-Forward Déterministe Post-AFK (`FastForwardSystem.js`)** :
  - Simulation accélérée des combats en cas de reprise après absence.
  - Gains de monnaie, drops d'objets, avancée en pension et calcul d'usure de fatigue.
- **Validation Globale de Bout en Bout (`Release1155.test.js`)** :
  - Vérification de la création de nouvelle sauvegarde, starters, progression de niveau, pensions régionales et portes d'accès.
- **Validation** :
  - **660 tests passants sur 660 (100 % de succès)**.
  - 27 règles statiques validées (0 violation).
- Voir [PHASE_v1.15.5.md](PHASE_v1.15.5.md) pour les détails complets.






