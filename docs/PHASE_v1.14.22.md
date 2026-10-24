# Phase 1.14.22 — Entraînement adaptatif et Marché régional

**Production : 1.14.22 · schéma de sauvegarde 20, inchangé.**
Référence consultée et exécutée : `main` **64d8f7942ae5b92168b8990813dd16d60a60e7e2**,
confirmée par lecture distante pendant cette phase. Le runtime du main n’est pas transplanté.

## 1. Entraînement : le débordement a été reproduit puis corrigé

Le problème venait de `repeat(auto-fit, minmax(280px, 1fr))` : cette largeur minimale restait
supérieure à la colonne réellement disponible, même sur un écran de bureau.

| Vue préparée | Panneau | Slot avant | Slot après |
|---|---:|---:|---:|
| Écran 960 px, colonne droite | 228 px | 280 px, dépassement | 206 px, sans débordement |

La grille utilise maintenant `minmax(min(280px, 100%), 1fr)`. Les enfants peuvent rétrécir et les
textes se répartissent sur plusieurs lignes. Une requête de conteneur, indépendante du seul
breakpoint mobile, réorganise les petites cartes :

- modes sur une colonne lorsque nécessaire ;
- identité et métadonnées sur leur propre ligne sous le sprite ;
- actions d’affectation/retrait sur des lignes accessibles ;
- titre et achat du dresseur automatique sur des lignes séparées, sans mots comprimés verticalement.

Le corps Entraînement neutralise aussi le `overflow-x: hidden !important` hérité de la peau
« machine » : le contenu n’est plus découpé pour masquer un débordement. Le panneau grandit et
c’est toujours **le document** qui défile, pas un petit scroller interne au slot.

La règle a été explicitée dans `Rules.md`. Les visuels et actions de progression restent les mêmes :
aucun mode n’est offert, retiré ou débloqué par le redimensionnement. Les tests affichent aussi les
cartes encore verrouillées par la progression. Le chrome commun des en-têtes reste celui du Rework.

## 2. Marché : le vrai écran remplace le raccourci « bientôt »

### Visuel et principe

Le Marché est un `UIFullscreenPanel` ouvert par `ModalOpenRequestedEvent(ModalIds.MARKET)` :
même cadre que la boutique, portefeuille en haut, catégories, grille, sprites sur leur disque
canonique, types, numéro national, indicateur de possession normal/doré et prix en points de quête.
Un nom non rencontré est masqué par `???`, comme dans le main.

Cliquer une carte **sélectionne**, sans acheter. La barre commune `ShopFooter` fournit **Reset,
quantité, +10, +100, Max, total, Acheter**. Les chiffres compacts du Marché reprennent la présentation
native ; une infobulle conserve le montant exact. Les montants de la transaction ne sont jamais
arrondis. L’anneau de sélection reste visible même lorsque l’ombre de carte du CSS legacy est
prioritaire ; les champs et images ne sont pas recréés à chaque événement.

Les composants de portefeuille, prix et quantité sont partagés avec la boutique existante. La
boutique a aussi été réessayée par un achat réel de Poké Balls. Il n’existe pas de deuxième système
monétaire ou d’inventaire Pokémon spécifique au Marché.

### Accès, prix et choix de catalogue

Accès du main conservé : **un premier badge d’arène, ou Johto**. Le contrôle existe dans le
résolveur commun `FeatureAccessSystem`, dans le raccourci et dans la commande d’achat.

| Région | Offres du Rework | Starter | Autres |
|---|---:|---:|---:|
| Kanto | 9 | 1 000 PQ | 2 000 PQ |
| Johto | **6** | 3 000 PQ | 6 000 PQ |
| Hoenn | 4 | 6 000 PQ | 12 000 PQ |

**Décision demandée et validée : appliquer le filtrage du main aux données actuelles du Rework.**
Le main exécuté affiche quinze offres à Johto ; neuf de ces candidats sont déjà sauvages dans les
rencontres actuellement livrées par le Rework. Ils sont donc exclus ici. Les six offres sont
Germignon, Héricendre, Kaiminus, Mentali, Noctali et Roigada. Aucune rencontre sauvage n’a été
retirée pour forcer un catalogue de quinze offres. Les seize fichiers de tables générées ont été
comparés à l’archive 1.14.21 : **tous identiques octet pour octet**.

Les exceptions du main sont explicites dans `MarketRules` : Morphéo reste vendu malgré sa présence
sauvage ; les dérogations d’évolution sont conservées. Aucun légendaire ou Terhal n’est inventé à
partir des anciennes tables de prix en argent, qui ne sont pas les prix PQ réellement utilisés.

### Achat et propriété

`ShopSystem.buyMarket` est l’unique propriétaire de la transaction : catalogue revalidé, quantité
entière limitée aux fonds, préparation du lot, paiement et une seule sauvegarde.

- Chaque exemplaire acheté est un vrai `PokemonData` de niveau 1, avec **UID distinct**.
- La collection reste l’unique propriétaire ; l’équipe ne contient que des références UID.
- Si l’espèce n’était pas possédée et qu’une place est libre, le premier exemplaire rejoint
  l’équipe ; les suivants, les doublons et les achats avec équipe pleine restent au PC.
- Le Pokédex et les talents sont actualisés par l’acquisition canonique. La génération et les
  règles shiny prises en charge sont celles du Rework ; l’achat peut révéler un shiny.
- Aucun événement de capture sauvage, récompense de doublon capturé ou crédit d’éclosion n’est
  produit par un achat. Aucun faux objet Pokémon n’est ajouté au sac.
- En cas de refus, pas de paiement partiel ni de sauvegarde parasite. Les achats réentrants sont refusés.

`MarketCatalog` et `MarketPokemonFactory` sont sans DOM. Les vues `MarketPanel`,
`MarketCategoryView` et `MarketPokemonCard` composent les widgets communs. L’état de sélection est
transitoire et est réinitialisé lors d’un changement de sauvegarde ou de région.

## 3. Sauvegardes et protections maintenues

Il n’y a **pas de nouvelle forme sérialisée**, donc pas de migration artificielle : la production
reste au schéma 20. Le nouvel indicateur d’accès au Marché est dérivé, pas enregistré à côté des
badges. Les achats sont déjà représentés par les objets de la collection et le portefeuille.

Les événements d’équipe et de collection acceptent des métadonnées `deferSave` afin qu’un objectif
d’état puisse réagir avant l’unique écriture de la transaction. Les autres appelants gardent leur
comportement antérieur.

La reprise exacte de l’Entraînement, ses UID réservés, files, filtres, modes et DTO restent protégés.
Une vérification supplémentaire achète un shiny de **la même espèce qu’un Pokémon en entraînement** :
le DTO reste identique et se recharge réellement, sans perdre le déblocage shiny. Les autres choix
validés — collection unique, PC complet/Pokédex, filtres, presets, prix des installations/helpers,
horloge de Mine, relance et pilote — ne sont pas remplacés par cette phase.

**Le correctif d’anciennes ligues abandonné par l’utilisateur n’a pas été réintroduit.**

## 4. Guide et kit restent exécutables sur cette livraison

Le guide français A–Z accompagne maintenant 1.14.22 : **26 chapitres**, **1 794 lignes**, édition
HTML autonome. Le chapitre Boutiques distingue désormais boutique d’objets et Marché régional,
explique le stock, les filtres, les prix, les UID et les extensions pour une région nouvelle.

Le kit Auroria reste séparé de la production. Il crée une copie **1.14.23-demo / schéma 21**, jamais
une injection dans la partie livrée. Son import CSS est placé dans le bloc initial des imports :
un `@import` en fin de feuille serait ignoré. Le navigateur vérifie effectivement le style du Carnet.
Les images pédagogiques restent des placeholders déclarés.

## 5. Contrôles réellement exécutés

| Contrôle final | Résultat |
|---|---:|
| `npm test`, après les dernières modifications | **492 réussites, 0 échec** |
| Ajout de cette phase | **35 tests**, en plus des 457 précédents |
| Chromium — installations/parité fonctionnelle | **17 / 17** |
| Chromium — visuel/interactions | **9 / 9** |
| Chromium — retours précédents | **17 / 17** |
| Chromium — relances et pilote | **13 / 13** |
| Chromium — Marché et Entraînement adaptatif | **21 / 21** |
| Total Chromium du jeu livré | **77 / 77**, tous les rapports `issues: []` |
| Syntaxe JS/MJS, y compris outils/exemples | **714 fichiers, 0 erreur** |
| Analyse CSS de premier niveau | **41 feuilles, 0 erreur** |
| `DataValidator.validateAll()` | `[]` |
| Données générées contre ZIP 1.14.21 | **16 fichiers identiques** |
| `git diff --check` | réussi |
| Kit installé depuis une copie fraîche | **12 vérifications ciblées + 493 tests + 4 scénarios Chromium** |

Les nouvelles recettes utilisent les commandes et les vrais contrôles : achats, quantité saisie,
focus conservé, PC, shiny contrôlé, changement de région/partie, stockage et rechargement réels.
Un événement sans changement produit **zéro mutation DOM** dans le Marché. Les tests mesurent les
slots vides, occupés, actifs et terminés à 320, 390, 860, 960, 1 100 et 1 560 px, ainsi qu’un
panneau contraint à 210 px sur écran large. Le combat d’entraînement est effectivement terminé
par le moteur ; la géométrie n’est pas validée seulement sur une carte vide.

Les suites navigateur sont exécutées **séquentiellement**. Les ticks automatiques d’entraînement
et de checkpoint sont arrêtés dans la nouvelle recette pour comparer les DTO et les écritures sans
course ; les commandes explicites, sauvegardes, événements, UI et moteur de combat restent réels.
La progression et certains tirages sont préparés : **ce n’est pas une campagne naturelle**.

## 6. Preuves et livraison

- [`validation/v1.14.22/preuves.html`](validation/v1.14.22/preuves.html) : sélection de captures
  réelles intégrées, bureau/mobile, état avant correction et référence main séparée.
- `validation/v1.14.22/` : journaux, résultats JSON, contrôle des données et provenance.
- `files.sha256` : empreintes des fichiers livrés, générées au scellement de l’archive.
- L’archive est contrôlée par CRC, comparaison octet pour octet au source et manifeste SHA-256,
  puis testée après extraction. Le lanceur `start.bat` est contrôlé ASCII / CRLF.

Les captures des panneaux très hauts utilisent parfois une hauteur de vue allongée, uniquement
pour éviter de photographier leur haut derrière l’en-tête sticky ; les mesures géométriques sont
faites séparément avec une vue de 1 000 px de haut. Il s’agit de captures du vrai rendu, pas de maquettes.

## 7. Limites explicites

Pas de certification pixel à pixel de tous les états/thèmes, de test Firefox/WebKit, d’appareil
tactile physique ou d’exécution Windows native. Aucun parcours naturel complet Kanto/Johto/Hoenn
ni simulateur hors ligne n’est revendiqué. Les bonus encore absents du Rework ne sont pas déclarés
implémentés par la seule création du Marché. Les seize tables générées ne sont pas réécrites.

Aucun commit, push ou déploiement n’a été effectué.
