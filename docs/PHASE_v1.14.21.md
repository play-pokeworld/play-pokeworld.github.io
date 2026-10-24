# Phase 1.14.21 — prix, grille des helpers, chaîne automatique et tutoriel A–Z

**Livraison : 1.14.21 · sauvegardes : schéma 20 · 23 octobre 2026**  
**Base livrée précédente : 1.14.20 / schéma 19.**

## 1. Périmètre et décision retenue

Cette phase répond aux trois demandes : prix d’amélioration toujours visibles dans Mine,
Entraînement et Pension, grille de helpers réellement égalisée ; restauration de la relance sauvage
et de donjon avec achat en boutique ; document français permettant de créer une région et un gameplay.

Pour les donjons, l’option **chaîne automatique complète** a été explicitement choisie : pilote,
trois modes, déverrouillage et relance. La référence comportementale reste `main`, révision exécutée
`64d8f7942ae5b92168b8990813dd16d60a60e7e2`. Son architecture globale n’a pas été transplantée.
Le code reste réparti entre configuration, modèles, systèmes et widgets du Rework.

**Le point de réparation des anciennes victoires de ligue, abandonné à votre demande, n’est pas repris.**

## 2. Prix et helpers — correction visible

- Le coût de chaque amélioration disponible reste rendu **quel que soit le portefeuille**.
- Le montant est un devis informatif séparé de l’action d’achat : le design system peut cacher
  un bouton désactivé sans faire disparaître le prix.
- Les pages concernées n’ajoutent plus de prose « solde insuffisant… ». Une action non achetable
  reste non achetable ; l’affichage du tarif ne constitue pas une autorisation de paiement.
- Les coûts des 15 helpers restent visibles sans fonds.
- Les grilles utilisent des rangées de même hauteur (`grid-auto-rows: 1fr`), des cartes flex et
  un pied repoussé en bas. L’égalisation concerne **toutes les rangées d’une même grille**, pas
  uniquement les trois cartes de la première ligne. Les états recruté/non recruté et le mobile
  sont vérifiés aussi.
- Les portraits, les monnaies et la distinction bonus effectif / bonus annoncé inactif sont conservés.

Les captures et mesures se trouvent dans [la galerie de preuves](validation/v1.14.21/preuves.html).

## 3. Modules d’achat et relance sauvage

| Élément | Contrat livré |
|---|---|
| Relance sauvage | achat unique **2 500 points de quête** |
| Relance des donjons | achat unique **5 000 points de quête** |
| Vente | toutes les boutiques actuellement accessibles, plus confirmation depuis la barre de relance |
| Stock | offre `upgrade`, quantité toujours 1, retirée du catalogue après achat |
| Inventaire | aucun faux objet ajouté au sac |
| Transaction | même commande d’achat, propriété cohérente dès l’événement de portefeuille, une sauvegarde |
| Propriété / activation | persistantes ; activation indépendante de l’annulation d’un compte à rebours |
| Délai | **5 secondes** après une fin admissible |

Une chaîne sauvage victorieuse s’enchaînait déjà. Le module restaure la reprise après **défaite
naturelle de l’équipe en sauvage**. Quitter volontairement, un duel spécial, une arène ou une ligue
ne déclenchent pas cette relance. Aucun prix supplémentaire n’est payé par reprise sauvage.

Le compteur reste lié à la partie et au lieu ; les commandes recontrôlent les conditions à
l’échéance. Changer de partie/lieu, lancer une autre activité ou démarrer l’Entraînement l’annule.
Les ticks et l’annulation ne créent pas une écriture de sauvegarde par seconde.
Les switches, textes et actions restent les mêmes nœuds pendant le compteur ; le focus est testé.
La synthèse de session se ferme par événement typé lors du vrai redémarrage.

## 4. Donjons — pilote et nouvelle expédition

### Déverrouillage et modes

Le pilote gratuit se débloque après **trois expéditions terminées victorieusement dans le même
donjon**. Il ne dépend pas de l’achat du module de relance.

- **Farm** : explorer/régler les combats et coffres accessibles avant le gardien/la descente.
- **Gardien** : chemin direct vers le gardien, sans explorer pour la forme.
- **Coffres** : coffres d’abord, coût de trajet pénalisant les combats inutiles, puis gardien.
- **Manuel** : pilote arrêté ; le dernier mode non manuel reste mémorisé pour une future relance.

Le planificateur est une règle pure ; il évite le passage incident par le gardien. Le conducteur
vivant appelle les commandes normales de DungeonSystem pour déplacer, ouvrir, combattre et descendre.
Il ne simule pas une récompense forfaitaire. Les rythmes sont 400 ms au départ/après combat,
350 ms par pas, 450 ms pour un coffre ; les combats gardent leurs propres horloges.
L’Entraînement actif suspend les pas du pilote.

### Relance

Après gardien final ou équipe K.O., le module activé prépare une nouvelle expédition à cinq secondes.
**Chaque entrée paie le péage normal** en jetons. Le mode mémorisé est réappliqué seulement si le
pilote est déverrouillé dans ce donjon ; acheter la relance ne donne pas trois victoires gratuites.
Un abandon ou une remontée volontaire ne sont pas présentés comme une fin naturelle à relancer.

Si les jetons manquent, la tentative s’arrête avec le coût d’entrée indiqué. Réapprovisionner plus
tard ne déclenche pas une boucle de tentatives cachée. Ce message de péage concerne la barre de
relance du donjon, **pas les pages d’améliorations Mine/Entraînement/Pension**.

## 5. Sauvegardes et conservation des acquis

`MigrationV19ToV20` ajoute `RelaunchData` : propriété/activation des deux modules et mode de pilote
mémorisé. `DungeonRunData.auto` accepte un mode validé ou `false` ; l’ancien booléen `true` devient
`farm`. L’import de l’original récupère les faits explicites d’achat/activation historiques.
Un module possédé est activé par défaut sauf désactivation explicitement enregistrée.

Les échéances de relance et les trajets calculés sont transitoires. Ils ne sont pas rejoués lors
d’un import ou d’un changement de partie. Cet import ne prétend pas reprendre les DTO de bataille
propres au runtime original ou son moteur de calcul hors ligne.

Les protections précédentes restent en place et leurs suites de régression ont été relancées :
collection unique/UID, PC complet et tuiles acceptées, drag de carte entière et presets, réservation
et reprise exacte de l’Entraînement Rework, filtres par emplacement et FIFO manuels, incubation Johto
au seuil 111 avec crédits d’éclosion réellement collectés, compteur de sondage manuel Mine de dix
minutes, alcôves de Base dans Lieu. Aucun badge de rang/usage n’a été ajouté aux tuiles.

Une fin de fichier CSS malformée, déjà présente dans le ZIP 1.14.20, a également été nettoyée :
seuls le doublon/traces après la règle valide du compteur d’en-tête ont été retirés. Ce n’est pas
une refonte de la feuille de style originale. Les contrôles navigateur complets ont tourné **après**
ce nettoyage.

## 6. Le tutoriel français livré

- [Créer une région et un gameplay de A à Z — Markdown](GUIDE_CREATION_REGION_A_Z.md).
- [Version HTML autonome, sans ressources réseau](GUIDE_CREATION_REGION_A_Z.html).
- [Kit Auroria exécutable et instructions](examples/auroria/README.md).

Le guide comporte **26 chapitres, 1 754 lignes** : architecture, création/modification des données,
région et ordre de progression, carte/lieux/rencontres, Pokémon/formes/évolutions, capacités et
apprentissage réel, objets/talents, arène/rival/ligue, boutique, PNJ et quêtes, portes derrière
objet/quête/combat/arène, Pokédex/starters/filtres, donjons, UID, puis modèle/système/événement/panneau,
composition bureau/mobile, sauvegarde/migration, traductions, tests, dépannage et checklist.

Il distingue ce qui fonctionne déjà des extensions à développer : pas de faux learnset par espèce,
pas de champ de porte ignoré, pas de titre de ligue traité comme un badge d’arène, pas de contrainte
sur un PNJ précis inventée pour l’objectif TALK actuel.

Le kit contient toutes les données et les classes du **Carnet de terrain** (un site étudié une fois,
après trois victoires sauvages, récompense unique de 250 Pokédollars), une carte de travail et deux
langues. Il ne modifie pas le jeu installé : son script crée une copie **1.14.22-demo / schéma 21**.
Le jeu de production et ce ZIP restent **1.14.21 / schéma 20**, sans Auroria activée.
Les sprites et certains portraits/badges du kit sont des placeholders existants, déclarés comme tels.

## 7. Contrôles réellement exécutés

| Jeu livré | Résultat |
|---|---:|
| Suite Node, règles/données/systèmes/UI factice | **457 / 457** |
| Chromium fonctionnel historique | **17 / 17** |
| Chromium visuel/interaction | **9 / 9** |
| Chromium retours 1.14.20 | **17 / 17** |
| Chromium prix/helpers/boutique/automatisation | **13 / 13** |
| Total Chromium du jeu | **56 / 56**, aucun diagnostic inattendu |
| Syntaxe JS/MJS, y compris fichiers pédagogiques | **702**, aucune erreur |
| Analyse des feuilles CSS | **39**, aucun nœud d’erreur de premier niveau |
| DataValidator | **[]** |
| `git diff --check` | réussi |

Les 13 nouveaux scénarios incluent les coûts sans fonds, l’égalité mesurée des cartes de toutes
les rangées, la propriété mixte, achats uniques sans quantité/inventaire, confirmation/annulation,
défaite sauvage par le moteur, focus stable, fermeture de synthèse, changement de partie, troisième
vraie victoire de donjon, choix de modes, **fin réelle par le pilote puis nouvelle entrée payée**,
arrêt faute de jetons, anglais et mobile.

| Exemple isolé du tutoriel | Résultat |
|---|---:|
| Assertions ciblées, vraies commandes et combats | **12 / 12** |
| Suite complète dans la copie schéma 21 | **458 / 458** |
| Chromium de cette copie | **4 / 4**, aucun diagnostic inattendu |
| Guide HTML hors réseau | 26 chapitres, image intégrée, largeurs 1 360 et 390 px vérifiées |

Les résultats, journaux et captures retenus sont dans [le dossier de preuves](validation/v1.14.21/README.md).
Le conditionnement contrôle CRC, empreintes de fichiers, égalité source/ZIP, versions et encodage
ASCII/CRLF du lanceur, puis relance les **457 tests depuis l’archive extraite**. Son bilan complet et
le SHA-256 du ZIP sont produits dans le journal de livraison externe à l’archive afin d’éviter une
empreinte autoréférentielle.

## 8. Limites — ne pas confondre tests et certification générale

- Progression/équipe/monnaies des scénarios navigateur préparées ; horloges avancées automatiquement.
  **Pas de campagne naturelle Kanto → Hoenn intégrale.**
- Le tutoriel prépare explicitement la ligue/Pokédex de Hoenn et utilise un Pokémon sur-nivelé ;
  les victoires de ses nouveaux lieux, arène, rival et ligue passent toutefois par le vrai moteur.
- Chaîne automatique **en direct**, pas simulation de 12 h hors ligne ni parité complète de l’AFK original.
- Pas de certification de tous les points de rechargement d’une rencontre de donjon en attente,
  de tous les thèmes, graines de carte ou compositions d’équipe.
- Chromium automatisé, pas test natif Windows, Firefox/WebKit, tactile physique ou recette humaine
  exhaustive. Le contrôle du `.bat` vérifie ses octets, il ne l’exécute pas sous Windows.
- Les captures ne sont pas une certification pixel à pixel de tous les écrans.
- Aucun commit, push ou déploiement n’a été réalisé.
