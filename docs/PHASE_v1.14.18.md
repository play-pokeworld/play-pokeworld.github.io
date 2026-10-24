# Bilan de phase — Rework 1.14.18

- **Date :** 22/10/2026.
- **Application :** 1.14.18; **schéma de sauvegarde :** 17, migration pure `MigrationV16ToV17`.
- **Base Rework :** `07292aea3ced286d99d266e485adbe7fe3526e9c`.
- **Référence `main` :** `64d8f7942ae5b92168b8990813dd16d60a60e7e2`, consultée pour le comportement et
  la présentation, sans reprise de son architecture runtime.
- **Branche de travail :** `fix/facilities-and-location-parity`; aucun commit, push ou déploiement effectué.

## 1. État réel de la demande

| Périmètre | État | Preuve / limite |
|---|---|---|
| Tuile complète partagée entre Lieu, PC et Pokédex | **Terminé sur le périmètre testé** | Même classe `PokemonGridEntry`, pas une copie visuelle du sprite; ouverture du bon détail Pokédex; aucun badge de rang ajouté. |
| Objets du Lieu : données, sprites et cadre commun | **Terminé sur le périmètre testé** | `UIItemSprite` lit `ItemDB`; cadre `UISpriteFrame` commun, chemins centralisés, géométrie CSS commune. |
| Retirer « Dernière expédition » du combat en direct uniquement | **Terminé** | Présentation retirée; données d’expédition et autres consommateurs conservés, test de non-mutation. |
| Accès permanent Pension / Mine / Entraînement après déblocage | **Terminé sur le périmètre testé** | `FeatureAccessSystem` reste la source unique; utilisation depuis une route distante vérifiée. Pas de gate indépendant dans les vues. |
| Collection unique, réservations, reprise exacte Rework | **Terminé sur le périmètre testé** | Affectations/files par UID; PC complet; reprise même adversaire/PV/RNG/terrain/cooldowns après rechargement et changement de sauvegarde. |
| Gestion Pension, Mine, Entraînement | **Fonctionnelle; parité visuelle globale à affiner/valider** | Vrais achats, files, automatisation, personnel et sous-fenêtres; contrôles navigateur. Pas de comparaison pixel à pixel avec tous les états de `main`. |
| Import d’anciens états d’installations | **Partiel** | Talents débloqués et personnel repris; affectations, automatisations/files et combats du runtime original non entièrement traduits. |
| Parcours intégral Kanto, validation de tous les workflows mobiles/thèmes/navigateurs | **Non réalisé** | Les fixtures et tests ciblés ne remplacent pas ce parcours. |
| Blocage technique actuel empêchant les contrôles livrés | **Aucun identifié** | Les suites ci-dessous passent; cela ne signifie pas absence de tout bug. |

## 2. Décisions utilisateur appliquées

1. **Reprise exacte d’entraînement :** sérialisation propre du moteur Rework, pas de redémarrage du
   combat à la place d’une reprise. Les états invalides sont refusés avant mutation des PV possédés;
   l’automatisation est mise en pause et l’affectation demeure réservée.
2. **Réservation dès l’affectation :** le Pokémon reste dans la collection/Boîte PC. Annuler le combat
   ne libère pas la place; il faut retirer explicitement le Pokémon. Même règle après rechargement.
3. **Personnel :** recrutement et progression portés; seuls les effets réellement utilisés par `main`
   sont appliqués. Les bonus annoncés mais inutilisés sont signalés dans l’interface, sans formule inventée.
4. **Tarifs personnel « PC » :** paiement avec `questPoint`, donc **points de quête**, ni points de
   combat ni jetons d’Atoll. Couvert par tests système et navigateur.
5. **Johto 111 :** incubation Pokémon disponible dès que la quête devient active. Ni dépôt ni état
   « prêt » ne valent éclosion; seule la collecte effective du véritable œuf crédite l’objectif.

## 3. Fonctionnalités restaurées

### Pension

- 1 à 4 places; garderie et incubation Pokémon/fossiles, progression par KO, retrait/collecte et
  changement de mode. Le laboratoire local de résurrection des fossiles reste distinct de l’accès distant.
- Files FIFO persistantes, priorités Pokémon/fossiles, réservations, sélection PC et sous-fenêtre fossiles.
- Améliorations, auto-éclosion et remplissage automatique, frais de référence et réductions effectives.
- Parent incubé réinitialisé niveau 1 / XP 0 à la collecte; progression IV/chromatique et bébé inédit
  niveau 5 selon les règles effectives. Le bonus annoncé de niveau d’œuf n’est pas inventé.
- Gérant, niveau/XP, activation et effets effectifs, conservés dans la sauvegarde.

### Centre d’entraînement

- Deux places achetables, modes Attaque/Talent/Niveau/EV/Caché selon la progression, files et
  options d’automatisation persistantes. Les modes restent validés par le système.
- Combats réellement affichés dans la fenêtre de combat en direct, barres PV/cooldowns/statuts,
  adversaires et progression; annulation et résultat. Pas de faux écran de déblocage.
- Récompenses de référence et tirage sur tout le pool normal, confirmations incluses; résultat
  « Nouveau talent » / « Talent confirmé ». Talent caché passif et choix des talents normaux débloqués.
- Snapshots versionnés/validés : propriétaires par UID, adversaires, réserves, effets/statuts, terrain,
  horloges et générateur aléatoire. Points de sauvegarde toutes les 5 s, sortie/masquage et changement
  de sauvegarde; aucun combat hors ligne fabriqué, aucun effet d’entrée rejoué.
- Garde de concurrence entre entraînement actif et combat extérieur, sans ajouter de verrou de combat
  extérieur pour une affectation simplement au repos. Verrous d’objets/objets tenus pendant le combat.

### Mine

- Énergie, régénération, plateau 10×8, strates, formes de trésors, révélations et récolte réelle.
- Burin, marteau, pioche renforcée, foreuse, dynamite : prix, empreintes, puissance et coût unique par action.
- Améliorations d’énergie, automatisation payante, mineurs et progression persistante.
- Acheter +25 de capacité ajoute aussi +25 à l’énergie courante, avec plafond, comme la référence.
- L’initialisation du plateau appartient au système; un rafraîchissement d’interface n’effectue pas d’achat
  ou d’écriture et ne crée pas un nouveau plateau.

### Composants et sauvegardes

- Fenêtre de gestion commune à trois onglets, cartes dédiées par responsabilité et listes à clés stables.
  Focus, boutons, cases et options natives ne sont pas reconstruits pour une mise à jour identique.
- Sélecteur PC générique avec verrous centralisés, annulation nettoyée et revalidation des réponses.
- `TrainingData`, `FacilityStaffData`, `TalentUnlockData` et extension des modèles Pension/Mine; la
  collection demeure l’unique propriétaire des Pokémon. Migration v16→v17 pure et déterministe.
- Import original amélioré pour `G.unlockedTalents` et `G.staff`, avec validation des identifiants,
  niveaux/XP et un actif par secteur. **Cela ne rend pas l’import des installations sans perte.**
- Localisation FR/EN et métadonnées versionnées; `start.bat` reste ASCII/CRLF.

## 4. Validation effectivement exécutée

### Tests automatisés

- **372 réussites, 0 échec**, dont **34 tests ciblés** dans `tests/FacilityParity.test.js`.
- Rejeu déterministe comparé sur 300 pas; état JSON, PV temporaires multipliés, terrain permanent,
  callbacks, invalides/versions incompatibles/références étrangères, refus sans mutation des PV possédés.
- Persistance des réservations/files/résultats, achats atomiques, monnaies personnel, tarifs, outils,
  empreintes, talents et progression; composition des vraies vues et conservation des données d’expédition.
- **655 fichiers JS/MJS** vérifiés par `node --check`, aucune erreur; `git diff --check` sans erreur.
- Parité des clés/paramètres FR/EN et règles statiques incluses dans `npm test`.

### Chromium réel — 17 scénarios réussis

- Interfaces distantes, tuile Lieu → Pokédex, sélection/retrait PC sans doublon.
- Améliorations et recrutement en points de quête; files FIFO; sélecteurs au-dessus du parent et annulation.
- Maintien du focus et de l’identité des contrôles; options natives inchangées sans mutation du DOM.
- Achats/outils et action de minage avec un seul débit; affichage/annulation d’un vrai entraînement.
- Rechargement et changement de sauvegarde : égalité du DTO exact et liaison au même Pokémon possédé.
- **Johto 111 :** verrouillé avant l’étape, ouvert à l’index actif 10; **35 victoires sauvages réelles**
  pour 35 KO requis, 323 mises à jour contrôlées. Dépôt et disponibilité ne complètent pas la quête;
  collecte réelle puis réclamation par `QuestSystem` réussissent. Bébé et parent vérifiés.
- Choix fossile : mise en file sans consommation; démarrage manuel consommant exactement un exemplaire.
- **1 024, 768 et 375 px :** les trois fenêtres et leurs neuf onglets, soit 27 contrôles d’onglets,
  restent dans le viewport, sans débordement horizontal du contenu, avec défilement vertical effectif.
- Reconstruction de la page en anglais : trois fenêtres et contrôles localisés opérationnels.
- Aucun diagnostic inattendu collecté; 13 captures des parcours réussis jointes aux preuves.

**Conditions des essais :** soldes, progression et Pokémon explicitement préparés; ticks de l’entraînement
mis en pause pour comparer exactement les sauvegardes, mais moteur/UI/commandes réels. La chaîne sauvage
Johto est accélérée avec un chef niveau 100 et les filtres de capture désactivés. Son canal de notifications
BATTLE est temporairement coupé puis restauré en `finally`; la vraie fenêtre de résumé est fermée par son
bouton. Aucun clic forcé, aucune fausse éclosion. Ces conditions ne prouvent pas une progression naturelle.

Reproduction : [`../tests/browser/README.md`](../tests/browser/README.md).
Preuves : [`validation/v1.14.18/README.md`](validation/v1.14.18/README.md).

## 5. Limites et suite de validation

- La parité **fonctionnelle ciblée** est testée; l’identité visuelle globale avec `main` n’est pas certifiée.
- Les neuf onglets sont contrôlés en responsive, mais pas chaque combinaison d’action/sous-fenêtre mobile,
  ni un parcours sur appareils tactiles physiques ou sur tous les thèmes.
- Pas de parcours manuel intégral Kanto/Johto, ni de garantie globale sur tous les domaines antérieurs.
- Pas de compatibilité exacte annoncée avec les combats sauvegardés du runtime original. Ses anciennes
  incubations Pokémon, affectations d’entraînement, automatisations et files restent un chantier d’import, malgré talents/personnel repris.
- Pas d’exécution native Windows, Firefox ou WebKit; les règles ASCII/CRLF du lanceur sont testées.
- Passage FR/EN navigateur vérifié après reconstruction de la page, pas traduction à chaud de tout widget.
- Aucun commit/push ni publication distante. Cette livraison est un dossier source et une archive locale.
