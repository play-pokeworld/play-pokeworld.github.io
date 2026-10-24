# Rework 1.14.19 — correction visuelle des installations

Livraison locale du 23 octobre 2026.

## 1. Objet et référence

Cette livraison corrige le retour sur **les trois panneaux et leurs menus de gestion**, dont le rendu
1.14.18 avait été refusé et dont certains sprites manquaient. Elle remplace cette version pour ce
périmètre, sans remplacer l’architecture du Rework par le runtime original.

Référence réellement exécutée et capturée : `main`, commit
`64d8f7942ae5b92168b8990813dd16d60a60e7e2`. Le Rework reste sur la branche locale
`fix/facilities-and-location-parity`, base `07292aea3ced286d99d266e485adbe7fe3526e9c`.
**Version du paquet : 1.14.19 ; schéma de sauvegarde : 18.** Aucun commit, push ou déploiement effectué.

Comparatif autonome : [`validation/v1.14.19/comparatif.html`](validation/v1.14.19/comparatif.html).
Les images sont de vraies captures Chromium, pas des maquettes ni des images générées.

## 2. Réalisé sur les vues

- **Pension :** accès de gestion dans le corps du panneau, sprite réel dans son cadre partagé, ligne
  Pokémon ouvrable au clic/clavier, progression KO/niveau, retrait, modes Garderie/Incubation,
  offre vide compacte et accès fossiles sans grand pictogramme vide.
- **Entraînement :** Pokémon/nom/niveau, EV, talents et capacités, changement/retrait via les vrais
  sélecteurs et commandes ; cinq disciplines colorées avec les conditions propres aux modes verrouillés.
- **Mine :** Mine automatique avant Gestion, sous-titre Grand Souterrain, énergie, outils distincts
  et leurs coûts, indication de l’outil choisi, vraie grille, noms et sprites des trésors révélés/collectés,
  nouvelle couche. Le récapitulatif de durée de vie reste dans les données, pas dans ce panneau.
- **Neuf onglets de gestion :** fenêtre bureau de 980 × 760, en-tête et onglets avec les icônes du
  registre partagé, achats en colonnes, portraits réels 48 × 48, personnel en trois puis deux cartes.
  La Pension a deux colonnes d’automatisation ; l’Entraînement des emplacements verticaux avec quatre
  colonnes de filtres au bureau. Les champs reprennent le fond sombre et les sélecteurs natifs.
- Sprites Pokémon, personnel, monnaies et trésors résolus par les repositories/`AssetPaths` ; chargement
  immédiat limité aux petites images critiques. Le widget image commun reste paresseux par défaut.
- CSS dédiée consolidée : 24 règles racines répétées regroupées, responsive conservé. Pas de HTML brut
  dans les panneaux, ni de logique de progression ajoutée dans les vues. L’apparence native des listes
  est une option du widget partagé ; les autres listes, dont le Pokédex accepté, gardent leur défaut.

Les formats communs des prix/sprites et les décisions propres au Rework sont conservés. Les captures
montrent des fixtures explicites, avec quelques valeurs/modes/butins différents du runtime original ;
elles ne constituent **pas** une mesure de différence pixel à pixel ni une identité visuelle de tous
les états. Le comparatif rend ces différences inspectables au lieu de les masquer.

## 3. Restauration complète des filtres par emplacement

Choix utilisateur appliqué : **restauration complète**, avec migration conservatrice.

| Installation | Contrôles réels |
|---|---|
| Pension | Shiny, IV complets/incomplets, favoris, région, rang IV, type, tri |
| Entraînement | Mode automatique, Shiny, EV complets/incomplets, favoris, région, rang IV, type, tri |

- IV/EV complets = total 36 ; rang S+ = total IV au moins 24, **pas** le rang de l’espèce.
- Les ordres et départages suivent la référence. Les candidats sont partagés entre génération de
  file et remplissage automatique d’une file vide. Les entrées d’une file manuelle existante ne sont
  **jamais retirées** par un changement de filtre.
- « Tout faire » : talents → talent caché → capacités → EV → niveau, en sautant les modes verrouillés
  ou inéligibles. Ce choix et son ordre survivent au rechargement.
- Les verrous centraux restent prioritaires : équipe, autre usage, réservation, Pokémon verrouillé.
  Le filtre favoris n’est pas un moyen de contourner une interdiction.
- Générer la file d’un emplacement Pension ne remplit pas l’autre. Les commandes passent par les
  systèmes et conservent la règle d’une seule écriture par opération.

### Migration 17 → 18

Les nouveaux modèles ne possèdent aucun Pokémon : ils enregistrent uniquement des valeurs de filtre.
**UID, affectations, files FIFO et DTO de combat existants restent conservés.**

- Pension ancienne : tri explicite `legacy` pour garder l’ancienne politique ; ses anciennes priorités
  restent modifiables uniquement lorsque ce tri est utilisé.
- Entraînement ancien : une seule option devient le mode correspondant ; une configuration multiple
  reste `configured`, avec son ordre antérieur. Les contrôles de compatibilité restent accessibles.
- Valeurs inconnues normalisées, nombre d’emplacements Pension borné à 1–4, cases d’entraînement vides
  malformées tolérées. Les migrations sont pures et les sauvegardes restent versionnées.

Sauvegarder une copie de son export avant mise à niveau reste recommandé. Cette garantie concerne les
**sauvegardes Rework** ; elle n’étend pas l’import des états du runtime original.

## 4. Interactions et décisions préservées

- Affectation d’entraînement réservée jusqu’au retrait/changement explicite, même au repos ou après
  rechargement ; le Pokémon reste dans la collection PC unique. Annuler le sélecteur de remplacement
  ne libère pas l’ancien ; valider remplace atomiquement. Pas de remplacement pendant un combat.
- Reprise exacte des combats Rework : même adversaire, PV, RNG, terrain et horloges après
  rechargement/changement de sauvegarde ; pas de simulation hors ligne inventée.
- Nouvelle couche Mine : le bouton ouvre la confirmation partagée. Annuler conserve le plateau ;
  confirmer le remplace sans accorder les trésors cachés ni modifier l’énergie. **Écart volontaire de
  sécurité :** l’original abandonne directement la couche, le Rework demande confirmation.
- Tarification inchangée : l’admission Pension de base 1 000 Pokédollars, remise personnel appliquée,
  est due **uniquement si l’éclosion automatique est activée**, y compris en garderie. Le remplissage
  automatique seul ne crée pas de nouveau paiement d’admission.
- Recrutement « PC » original = **points de quête**, pas points de combat/Atoll. Formules de personnel
  effectivement utilisées conservées ; les bonus annoncés mais inactifs dans `main` sont signalés,
  sans inventer de formule.
- Johto 111 s’ouvre à son activation ; seule la collecte d’une vraie éclosion crédite l’objectif.
- Tuile complète Lieu/PC/Pokédex partagée, absence de badges de rang sur les tuiles, collection/UID et
  verrous centraux conservés. « Dernière expédition » reste absent du seul combat en direct, avec
  données et autres consommateurs conservés.

## 5. Validation exécutée

### Automatisation, architecture et syntaxe

- **396 tests réussis, 0 échec**, contre 372 dans la livraison précédente.
- Les 24 régressions supplémentaires couvrent filtres et tris réels, migrations/pureté/UID/DTO,
  file manuelle intacte, génération locale, sélection automatique, priorité Tout faire et modes
  verrouillés, rechargement, remplacement, confirmation Mine, traductions/glyphes/fichiers sprites,
  options natives et chargement immédiat sans changer les widgets par défaut.
- **666 fichiers JS/MJS** contrôlés par `node --check`, aucune erreur.
- `git diff --check` sans erreur ; parité des clés/paramètres FR/EN et règles d’architecture dans
  `npm test`. Lanceur `start.bat` ASCII et CRLF vérifié ; pas d’exécution Windows native.

### Chromium réel — 26 scénarios réussis

**17 scénarios fonctionnels rejoués** : accès distant, Lieu → Pokédex, PC, achats/personnel, files,
focus, minage, vrai entraînement, égalité exacte des DTO après rechargement/changement de sauvegarde,
Johto 111 avec vraie éclosion/réclamation, fossiles, neuf onglets à 1 024/768/375 px et reconstruction
anglaise. Les preuves 1.14.18 seules n’ont pas été réutilisées comme validation actuelle.

**9 scénarios visuels/interactions supplémentaires** :

1. Trois accès de gestion dans le corps, cinq disciplines visibles, sprites décodés à la bonne taille.
2. Neuf onglets à 980 × 760, achats horizontaux, icônes, 15 portraits réels en 48 × 48 et grille 3 + 2.
3. Sept filtres Pension, persistance et identité/focus natifs pendant les rafraîchissements KO.
4. Huit filtres Entraînement, quatre colonnes, fond natif sombre et ordre Tout faire après rechargement.
5. Annulation et validation du changement Pokémon sans perte de réservation ni duplication.
6. Cinq outils achetés, cinq glyphes distincts, coûts exacts et vrais sprites après extraction d’un trésor.
7. Annulation de nouvelle couche sans perte ; seul le clic de confirmation abandonne le plateau.
8. Les trois panneaux/neuf onglets/filtres achetés tiennent à 768 px, sans débordement horizontal.
9. Même contrôle à 375 px.

Aucun diagnostic navigateur inattendu collecté. Les captures comparatives ont été inspectées ; il
n’existe pas de seuil automatique d’égalité pixel avec `main`. Les mesures attendent la fin réelle de
l’animation d’ouverture, au lieu de mesurer son échelle transitoire.

**Conditions :** progression, monnaies et collection préparées explicitement, ticks autonomes Pension/
Entraînement suspendus pour les comparaisons de persistance ; commandes, moteur, widgets et minage
réels. Le parcours Johto utilise la chaîne sauvage réelle accélérée de la suite fonctionnelle, avec
35 victoires pour les 35 KO requis. Aucun clic forcé ni événement d’éclosion simulé. Ce n’est pas un
parcours naturel de la campagne.

Reproduction : [`../tests/browser/README.md`](../tests/browser/README.md).
Preuves : [`validation/v1.14.19/README.md`](validation/v1.14.19/README.md).
L’archive est contrôlée après extraction : tests, versions, manifeste de fichiers et intégrité ZIP.

## 6. Statut honnête et limites

| Statut | Périmètre |
|---|---|
| **Terminé sur le périmètre corrigé** | Trois panneaux, neuf onglets restructurés sur rendu original, sprites rétablis, filtres par emplacement reliés aux systèmes, migration 17 → 18 |
| **Fonctionnel et testé** | Scénarios listés ci-dessus ; non-régressions des décisions Rework et contrôles source |
| **Partiel** | Import des installations depuis le runtime original ; équivalence visuelle exhaustive de tous les états/actions/thèmes non certifiée |
| **Non implémenté** | Traduction complète des anciennes incubations Pokémon, affectations/files/automatisations et combats sauvegardés du runtime original |
| **Non vérifié** | Parcours manuel intégral Kanto/Johto, tous les thèmes, tous les états mobiles/sous-fenêtres, appareils tactiles physiques, Firefox/WebKit, Windows natif |
| **Bloqué** | Aucun blocage pour cette livraison locale ; publication distante non réalisée |

Il ne s’agit ni d’une garantie globale du jeu, ni d’un import original sans perte, ni d’une certification
visuelle absolue. Les réserves ci-dessus ne reportent pas les corrections demandées : leur code,
leurs contrôles réels, leur migration et leurs captures sont inclus dans cette version.
