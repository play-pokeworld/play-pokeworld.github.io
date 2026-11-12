# Phase 1.16.56 — tableau de validation des affichages

Aucun code de jeu n'a changé dans cette version : elle livre **un document**, et la correction des
deux documents qui se contredisaient.

## Le problème

Ta question : « reste-t-il des écrans validés dans le catalogue qui ne sont pas dans le jeu ? ».
La réponse était dans `PASSATION/ETAT_DES_ECRANS_v12.md`, mais ce fichier :

- date du **07/11** et ignore le Lot C-cœur, les neuf retours v21 et trois passes de grammaire ;
- affiche des compteurs faux (« VALIDÉ 13 » pour 19 lignes VALIDÉ, « À REFAIRE 24 » pour 25) ;
- ne dit pas, pour un écran donné, s'il est **mis en jeu** ou seulement dessiné ;
- ne contient ni `atoll-boutique` ni `nav-menu`, ajoutés depuis.

Et mon `docs/STATUT_AFFICHAGES.md` du 09/11 parlait de *conformité*, pas de *validation* : deux
documents, deux vocabulaires, aucune réponse à « qu'est-ce que je dois tester ».

## Ce qui est livré

`PASSATION/ETAT_DES_ECRANS_v13.md` — un seul document, tes cinq statuts, et rien d'autre :

| Statut | Nombre |
|---|---|
| 1 · Validé dans le catalogue **et** mis en jeu | 9 |
| 2 · Validé dans le catalogue, **pas encore en jeu** | 9 |
| 3 · Fait dans le catalogue, **à valider** | 12 |
| 4 · Pas encore dans le catalogue alors qu'il est noté à modifier | 25 + 8 écrans de jeu à ajouter |
| 5 · Aucune modification à faire entre les deux reworks | 1 |

Chaque ligne porte trois faits séparés : la référence catalogue (`SCREENS[].id`), **ta** validation
(citée avec sa source), et l'état du jeu (porté avec version et capture, ou « annoncé, non
contrôlé »). Un écran ne peut pas passer en statut 1 sur la seule foi d'une note de portage.

## Deux erreurs corrigées

1. `telechargement` (« Export de sauvegarde ») avait été rapproché de `DOWNLOAD_PROMPT`. Ce sont
   deux choses différentes : `DOWNLOAD_PROMPT` est l'invite « Télécharger PokéWorld ». L'export de
   sauvegarde est un **bouton dans Réglages**, il n'a aucun écran.
2. `fiche-objet` n'a **aucun** écran dédié en jeu : le Sac ouvre la fiche dictionnaire
   (`DICTIONARY_DETAIL`, bouton « Retour au sac »).

## Portage n'est pas conformité

`PASSATION.md` §0.5 annonce douze pleines pages et quatre fenêtres « portées » en 1.16.49 → 1.16.51.
Les paires rendues le 09/11 montrent des écarts réels sur **Sac** (3 barres d'outils au lieu de 2,
liste sur une colonne au lieu de 3), **Boîte PC** (3 rangées au lieu de 2), **Pokédex** (pas de bloc
de stats, pastilles en trop, grille 6 colonnes au lieu de 10) et **Marché** (en-tête et barre
d'outils). Ces quatre écrans restent donc en statut 3, écart écrit dans leur ligne.

## Outil ajouté

`tools/measure/presence.mjs [outJson]` — ouvre les 43 modales du jeu une par une et relève le titre
réellement affiché. C'est ce qui permet d'affirmer qu'un écran existe (ou non) au lieu de le déduire
du code. Sortie du jour : 32 modales s'ouvrent, 11 exigent des paramètres (état de partie), 0 erreur de page.

## Vérifications

- `npm test` : **906 passés, 0 échec**.
- Aucun fichier de `src/` ni de `assets/` n'est modifié par cette version (vérifié : la seule
  écriture hors `docs/` et `PASSATION/` est le numéro de version).
- Contrôle d'integrite : **0 ressource manquante** (tous les `src`/`href` de `index.html` et tous les
  `url()` des feuilles CSS resolus), 784 sprites, 428 objets, 338 dresseurs, 409 fichiers audio.

## Le zip est plus leger de 32 Mo — c'est volontaire

Les versions 1.16.51 a 1.16.55 embarquaient le dossier `.git` dans l'archive (43 entrees, ~32 Mo de
packfile), malgre la commande d'exclusion : la suppression passait avant le zip mais `.git` etait
recree entre-temps. Cette version ne le contient pas. **Aucun fichier du projet n'a disparu** : le
compte de fichiers baisse de 43 entrees, exactement celles de `.git`, et le controle ci-dessus
prouve que chaque ressource referencee est presente.
