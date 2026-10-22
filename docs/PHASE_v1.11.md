# Bilan de phase — Rework 1.11.0

**Date : 20 octobre 2026**  
**Version applicative : 1.11.0 · schéma de sauvegarde : 13**  
**Périmètre du paquet : Rework, livraison ciblée Kanto**

> Ce bilan est volontairement prudent. Les systèmes listés comme terminés ont été implémentés et
> couverts par les validations indiquées; cela ne certifie pas une partie complète de Kanto ni une
> parité exhaustive avec `main`. Les travaux Hoenn de la Base secrète sont explicitement hors du
> périmètre de ce ZIP.

## Résumé des statuts

| Statut | Éléments |
|---|---|
| **Terminé dans ce lot** | Attribution des dialogues et quêtes à un PNJ stable; six puzzles Kanto; transferts PC/équipe; flux CT/CS à apprentissage différé; Rare Candy, six vitamines et Pierre Liaison; corrélation du bilan terminal de donjon par `runId`; migration de sauvegarde 12 → 13; tiroir mobile des filtres du Sac. |
| **Partiel** | L'objectif « Kanto pleinement jouable » n'est pas certifié par une partie de bout en bout. Les flux/systèmes ciblés passent leurs tests et scénarios QA, mais cela ne valide pas chaque quête, embranchement, lieu, équipe de dresseur, événement ni route complète. |
| **Visuellement vérifié, portée limitée** | Sac et filtres à 390 × 844; sélection d'objet, fiche Pokémon et fenêtre d'apprentissage d'une attaque sur mobile; scénarios ciblés sur bureau. La vérification n'est pas un audit pixel par pixel de toutes les pages, états, tailles et langues. |
| **Visuellement inachevé / non certifié** | La référence visuelle `main` n'a pas été comparée systématiquement écran par écran. Des écarts d'espacement, de densité et de présentation peuvent subsister dans les autres panneaux, cartes, combats et thèmes. Le présent lot corrige le tiroir du Sac et l'espacement du titre de la fiche Pokémon, sans prétendre uniformiser tout le jeu. |
| **Restant / différé** | Parcours QA complet de Kanto; couverture navigateur systématique des quêtes et combats jusqu'à la Ligue; audit visuel global; bonbons de temps/AFK, capsules IV, objets de talent et menthes. Ces familles ne sont pas rendues utilisables par cette version. |
| **Hors périmètre / non livré** | Le gameplay complet de la Base secrète Hoenn (lieux, pièces, décoration, visites et combats de PNJ). Seul le verrou d'accès et le jalon historique sont restaurés/importés; le panneau reste caché tant que le jalon n'est pas reconnu. |
| **Bloqué** | Aucun blocage technique n'a empêché la construction ou la validation du paquet. Les éléments incomplets ci-dessus sont soit non vérifiés, soit différés, soit hors périmètre — ils ne doivent pas être présentés comme terminés. |

## Contenu terminé et comportement attendu

### PNJ et quêtes secondaires

- Les identités de progression ont des IDs stables, indépendants du nom traduit et de l'ordre d'affichage.
- Les 50 liens Kanto sont déclarés dans `src/data/content/NpcQuestLinks.js` et disposent de références
  de localisation FR/EN sous la forme `kanto_<lieu>_npc_<NN>`.
- Une interaction avec un autre PNJ ou une ligne de dialogue générique ne doit pas faire progresser
  l'objectif lié ni proposer la quête de ce personnage.

### Puzzles Kanto

- Six définitions faites à la main, avec prérequis, indices, réponses/options, récompenses et clés FR/EN.
- Règles et résolution dans les couches données/système; les panneaux ne font que présenter et
  recueillir les choix, sans logique métier liée au DOM.
- Première résolution : récompense argent + objet une seule fois. Rejeu :
  `max(200, floor(rewardMoney * 0.1))` en argent, sans nouvel objet.

### Équipe, boîte et objets

- Dépôt, retrait et échange d'un Pokémon par l'interface PC, avec mutations réalisées par les systèmes
  d'équipe/boîte plutôt que par modification directe de l'UI.
- Une CT/CS rend une capacité apprenable au Pokémon cible, sans remplacer immédiatement une attaque.
  Le joueur l'équipe ensuite depuis la fiche Pokémon, en choisissant un emplacement libre ou à remplacer.
- Pierre Liaison : évolution du Pokémon sélectionné (équipe ou PC), pour Kadabra, Machopeur,
  Gravalanch et Spectrum à partir du niveau 40; l'objet est consommé sans créer un nouveau Pokémon.
- `rarecandy` augmente d'un niveau. Les six vitamines ajoutent un EV aléatoire admissible, dans les
  plafonds Rework de 18 EV par statistique et 36 au total. Les effets différés ci-dessus ne sont pas
  inclus.

### Donjons et persistance

- Le résumé de run est un instantané défensif; le bilan de combat terminal est associé au même
  `runId`, pour éviter le mélange ou le double comptage entre combats et expédition.
- La migration 12 → 13 déplace `trainingUnlockedMoves` vers `unlockedMoves`, préserve les identifiants
  de capacité encore inconnus et n'enseigne pas une attaque sans choix du joueur.

### Base secrète

- Le verrou d'origine et l'import du jalon historique (notamment `main.216`) déterminent l'accès.
  Panneau et onglet mobile ne sont visibles qu'après déblocage.
- **Ce mécanisme d'accès n'est pas le gameplay Hoenn** : ne pas le compter comme une Base secrète
  jouable dans la portée Kanto.

## Validation effectuée

- Suite automatisée : **236 tests réussis, 0 échec** (`npm test`).
- `git diff --check` et vérifications syntaxiques ciblées réussis après les modifications de code.
- Playwright ciblé, sauvegarde QA dédiée (ce n'est pas une sauvegarde utilisateur) :
  - CT Tonnerre consommée sur Pikachu, puis capacité proposée depuis sa fiche et équipée via la
    fenêtre d'apprentissage; le scénario mobile a vérifié l'ajout à un emplacement libre.
  - Pierre Liaison sur Kadabra niveau 40 stocké dans le PC : évolution en Alakazam et consommation
    de la pierre.
  - Rare Candy : Salamèche passe du niveau 5 au 6; vitamine PV Plus consommée sur Pikachu et
    renforcement d'une statistique admissible confirmé.
  - à 390 × 844, les 7 catégories de filtre, le tri et la recherche du Sac sont présents; tiroir
    déployé mesuré à 334 px et toutes les catégories restent visibles.
  - flux PC et interface mobile vérifiés par scénarios ciblés. Console navigateur : 0 erreur et
    0 avertissement applicatif au contrôle effectué.
- Ces contrôles QA valident les interactions citées, pas l'intégralité d'une sauvegarde jouée de zéro
  jusqu'à la Ligue.

## Reste à faire pour revendiquer « Kanto pleinement jouable »

1. Exécuter une partie complète depuis une nouvelle sauvegarde jusqu'à la Ligue, avec contrôle des
   blocages de progression, prérequis et retours de sauvegarde/rechargement.
2. Parcourir systématiquement les quêtes Kanto, les interactions PNJ liées, les six puzzles et les
   combats/donjons dans le navigateur, plutôt que d'extrapoler depuis les tests unitaires.
3. Faire l'audit visuel de toutes les pages et états sur mobile et bureau, avec `main` comme référence;
   consigner les écarts restants et ne fermer ceux-ci qu'après vérification.
4. Ajouter les familles d'objets différées uniquement dans une phase ultérieure, avec règles, système,
   interface localisée, parité FR/EN et tests.
5. Traiter le contenu Base secrète Hoenn dans une livraison Hoenn distincte, avec ses données,
   systèmes, UI et migration/compatibilité nécessaires.

## Fichiers de référence

- `README.md` — version et portée de la livraison.
- `docs/AUDIT.md` — suivi consolidé et validations précédentes.
- `docs/DATA_MODEL.md` — schéma courant et migration 12 → 13.
- `docs/GUIDE_CONTENU.md` — conventions d'ajout du contenu 1.11.

## Archive vérifiée

- Fichier livré : `pokeworld-rework-1.11.0.zip` (dossier racine `Rework/`).
- Contenu : **2 436 fichiers**, environ **13,2 MiB** compressés; `.git/`, `.playwright-cli/`, les
  dépendances, caches et fichiers de session QA sont exclus.
- Intégrité : `unzip -t` ne signale aucune erreur; la vérification des entrées confirme les fichiers
  de projet requis et l'absence des répertoires exclus.
- Vérification après extraction : `npm test` repasse à **236 réussis, 0 échec**.
