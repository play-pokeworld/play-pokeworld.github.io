# Bilan de phase — Rework 1.12.0

**Date : 21 octobre 2026**  
**Version applicative : 1.12.0 · schéma de sauvegarde : 14**  
**Référence visuelle et comportementale : `main` · implémentation conservée dans l’architecture Rework**

> Ce rapport décrit l’archive historique 1.12.0. **Son statut de conformité a été contesté par
> l’utilisateur le 21/10/2026** : les observations de cette archive ne sont pas acceptées comme preuve
> de la demande initiale. Les corrections alors en cours ont depuis été livrées et vérifiées dans
> Rework 1.13.0; consulter [`PHASE_v1.13.md`](PHASE_v1.13.md). L’archive 1.12.0 reste historique et
> n’est pas la livraison actuelle.

## Résumé de livraison historique

| Domaine | Résultat déclaré dans l’archive 1.12.0 |
|---|---|
| Header et raccourcis | Hauteur/espacement des badges et bouton Réglages contrôlés; raccourcis réorganisés, textes et accents visuels revus. |
| Tutoriel et quêtes | Carte de tutoriel visible et progression branchée sur les événements réels; progression et récompenses testées; texte et affichage des quêtes vérifiés. |
| Lieu, errants et carte | Lore, progression, rencontres et affichage d’errant; déplacement et déblocages passent par `LocationSystem` et les règles de progression. Errants conformes au périmètre confirmé ci-dessous. |
| Combat et capture | Résumé de combat centré avec totaux, butin et dégâts; animation de capture en deux phases (chance, verdict) avec préférence et nettoyage des timers. |
| Équipe et PC | Objets tenus, boutons « + » et sélection d’objet; mutations via `TeamSystem` / `BoxSystem`. Filtres PC de référence : Favoris, Verrouillés, région, type, shiny, évolution manquante, IV/EV, rang E–SS, formes et recherche. |
| Pré requis des modules | Base secrète, Pension, Mine et Entraînement entièrement masqués (panneaux et navigation mobile) avant le déblocage pertinent. |
| Pokédex et Guide | Pokédex avec totaux, progression régionale, silhouettes, recherche, tri et filtres de présentation; Guide plafonné à 960 px avec disposition responsive. FR/EN conservés. |

## Errants — autorisation ciblée du 20/10/2026

- Rotation commune en fenêtres UTC de **12 heures**, avec compte à rebours jusqu’à la frontière suivante.
- Seuil de déclenchement **strictement inférieur à 1 %**; niveau fixe **75**.
- Les pools sont par région; les villes et les donjons sont exclus du tirage.
- Le combat et la capture utilisent les flux Rework ordinaires.
- **Aucune modification** des poids de rencontre ordinaires : `{ common: 60, uncommon: 30, rare: 10, very_rare: 3 }`, et sélection toujours pondérée par entrée.
- Pas d’autre changement de gameplay ajouté à la faveur de cette autorisation.

## Persistance et compatibilité

- L’archive 1.12.0 utilisait le schéma **14**. Le Pokédex refait ne créait ni champ, ni migration,
  ni nouveau taux de shiny; recherche, filtres et tri du Pokédex restaient des états de présentation.
- Le schéma 14 conserve `boxFilters` et les flags Pokémon `favorite` / `locked` ajoutés par la migration
  13 → 14.
- `GameConfig.VERSION`, `package.json` et `package-lock.json` étaient synchronisés sur `1.12.0` dans l’archive.
- Les opérations d’équipe/PC passent par leurs systèmes; les couches système/données ne manipulent pas le DOM.

## Validation automatisée historique de l’archive

- `npm test` : **252 réussis, 0 échec** après le nouveau test UI Pokédex et la non-régression du filtre de rang SS PC.
- Couverture déclarée : affichage du Pokédex limité à la région accessible, états vu/capturé/shiny, filtres,
  recherche par identifiant stable, tiroir mobile, migrations, accès aux modules, déblocages/déplacements,
  errants, résumés de combat, animation de capture, équipe/PC et flux d’objets concernés.
- Smoke HTTP et extraction avaient été contrôlés pour l’archive. Cela ne certifie ni la progression
  complète ni la parité visuelle générale.

## Vérifications navigateur historiques — non retenues comme preuve de conformité

- Le rapport antérieur mentionnait des observations ciblées du Pokédex, du Guide, de la capture et du
  résumé. **L’utilisateur a ensuite contesté la conformité générale de 1.12.0**; ces observations
  historiques ne remplacent pas les parcours critiques et comparaisons visuelles encore demandés.
- Aucun parcours complet de nouvelle sauvegarde jusqu’à la Ligue n’est certifié.
- La parité pixel par pixel n’est pas revendiquée pour chaque écran, thème, état de combat ou langue.
- Le gameplay complet de la Base secrète Hoenn reste hors périmètre; seule la règle de visibilité et
  le jalon d’accès historique sont conservés.
- Les familles d’objets non confirmées comme bonbons de temps, capsules IV, objets de talent et menthes
  restent inchangées et différées.

## Archive historique

- Fichier : `pokeworld-rework-1.12.0.zip` (racine `Rework/`), **2 448 fichiers**, 2 516 entrées ZIP,
  environ **14 MiB** compressés.
- `unzip -t` : intégrité validée. L’archive ne contient ni `.git/`, ni `.playwright-cli/`,
  `node_modules/`, `build/`, `dist/`, `coverage/` ou caches.
- Après extraction dans un nouveau dossier : `npm test` repassait à **252 réussis, 0 échec**; le
  serveur répondait HTTP 200 sur les ressources contrôlées.

## Corrections après l’archive — état intermédiaire avant la livraison 1.13.0

- Le flux de combat local de quête est implémenté dans le code source : PNJ temporaire visible seulement
  pour une quête `KILL` active sans rencontres normales dans le groupe du lieu; dialogue avant le combat
  unique. La victoire progresse comme une victoire sauvage du lieu, sans auto-capture ni modification
  des rencontres ordinaires.
- Audit PNJ : **214 IDs** appariés et uniques entre FR/EN; **210 liens** vers quêtes principales,
  secondaires et tableaux. Une quête side `talk` progresse par lieu, sans imposer un PNJ cible.
- Les **25 puzzles manquants de Johto/Hoenn** sont définis en contenu manuel localisé FR/EN. `PuzzleDB`
  contient désormais 31 définitions; séquence, code, braille, équipe et attente passent par le système
  DOM-free; la fenêtre de résolution affiche aussi braille, équipe et temporisation.
- Le sélecteur de région transporte maintenant le joueur au départ de la région après les prérequis
  de Ligue/Pokédex. À la première entrée en Johto/Hoenn, le starter régional est choisi une fois;
  il rejoint l’équipe ou la Boîte PC si l’équipe est pleine. L’accès à Route 29/101 suit le drapeau
  d’accès existant, sans nouveau champ ni migration. Les changements de région synchronisent la quête
  principale et ne sauvegardent qu’une fois par opération.
- Le seuil de victoires locales de Johto suit les données utilisées par la carte de `main` (table
  monolithique), tandis que les définitions Johto dédiées conservent les rencontres. Pour le Parc
  Naturel, conformément à la décision confirmée, l’accès suit la carte active et le contenu de donjon/
  rencontres reste présent.
- Audit comparatif automatisé `main` ↔ Rework : **0 différence de déblocage sur 1 602 états de nœuds**
  (3 régions × 9 paliers de badges), avec les seuils de victoire, starters, objets/quête et accès Ligue
  appliqués dans les deux modèles. Ce contrôle headless ne certifie pas les parcours de jeu complets.
- Dernière suite complète : `npm test` **280 réussis, 0 échec**. Toutes les sources JS/MJS de `src`,
  `tests` et `tools` passent `node --check`; `git diff --check` passe.
- **Aucune validation navigateur visuelle de ces correctifs n’a été effectuée.** L’outil navigateur
  automatisable n’est pas disponible dans l’environnement. Les tests headless ne certifient pas la
  parité visuelle ou les parcours complets.
- Aucun nouveau ZIP n’a été créé. L’archive 1.12.0 conservée précède ces corrections. Les parcours
  complets multi-régions, l’audit final de persistance combat/capture, le contrôle navigateur et la
  comparaison visuelle restent requis avant toute nouvelle livraison.
