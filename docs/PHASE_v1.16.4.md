# Phase 1.16.4 — Talents : un seul talent au lieu d'un pool, et vérification des attaques

> Signalement du joueur : « des erreurs de talents et attaques sur certains Pokémon, qui ont
> seulement un seul talent… normalement un Pokémon est censé avoir au minimum 10 talents ».
> Le pool de talents de 135 espèces était vide de fait (3 entrées, souvent le même talent deux fois),
> ce qui figeait le tirage du talent, vidait le sélecteur de talents d'un Pokémon possédé et affichait
> une seule fiche dans le Pokédex. Les attaques, elles, ont été auditées de bout en bout : elles sont
> conformes, aucune correction n'a été nécessaire (détail §5).

---

## 1. Le problème constaté

Un pool de 3 entrées, tel que stocké pour les espèces de Hoenn et de Sinnoh :

```js
// src/data/raw/species-data.js avant 1.16.4
treecko:  { …, talents: ["overgrow", "overgrow", "unburden"], hiddenTalent: "unburden" }
torchic:  { …, talents: ["blaze", "blaze", "speedboost"],     hiddenTalent: "speedboost" }
```

Conséquences mesurées dans le jeu :

| Symptôme | Cause exacte |
|---|---|
| Toujours le même talent sur ces espèces | `PokemonFactory.rollTalent()` retire le talent caché de la liste : il ne reste qu'**un** candidat, donc le tirage 60 / 30 / 10 n'a aucun effet |
| « Seulement un seul talent » dans la fiche d'un Pokémon possédé | `PokemonTalentSystem.getSnapshot()` liste le pool moins le talent caché → **1 option** au sélecteur |
| Une seule fiche (en double) dans le Pokédex | `PokedexDetailModal` affiche `species.talents` tel quel : le même talent deux fois |
| Collection de talents bloquée | `TalentUnlockData.unlock()` refuse tout talent hors pool : un pool d'une entrée ne peut jamais s'enrichir |

**Ce n'était pas une erreur de portage.** Le fichier amont `src/data/poke-talents.js` de `main` contient
exactement ces lignes (`"252":["overgrow","overgrow","unburden"]`, `"255":["blaze","blaze","speedboost"]`,
…) : la reproduction était fidèle, la donnée en amont est incomplète. Son propre test `fix-07b` ne vérifie
que « pool non vide » (`length >= 1`), ce qui laisse passer le défaut.

### Ce que dit la donnée, pour les 386 espèces

| Mesure | Avant 1.16.4 |
|---|---|
| Pools de 3 entrées (dont 23 avec un doublon) | **135** espèces |
| Pools de 15 à 34 entrées | 251 espèces |
| Pools contenant un talent hors règle de type | 112 espèces (talents signature : `guts`, `rockguard`, `intimidate`…) |
| Pools sans talent caché (`hiddenTalent: null`) | 17 espèces — comportement amont conservé |

## 2. La règle appliquée

Le pool d'une espèce n'est pas une liste écrite à la main, c'est une **règle** : tous les talents dont
l'`affinity` contient un des types de l'espèce, plus ceux dont l'affinité est `all`. Elle reproduisait
déjà exactement les pools de Kanto et de Johto (vérifié : Bulbasaur 28, Charmander 22, Pikachu 18,
Gengar 20, Mewtwo 21 — identiques au stocké).

Le pool est donc désormais l'**union** :

1. des talents listés par la donnée d'origine (ordre d'origine, doublons retirés) — cela conserve les
   talents signature que la règle de type ne couvre pas ;
2. des talents dérivés des types de l'espèce (ordre de `talents-data.js`).

La règle vit dans un seul fichier, `tools/data/talent-pools.mjs`, et **rien n'a été écrit à la main** :

- `tools/data/gen-species.mjs` l'applique : une régénération depuis le dépôt d'origine produit le même
  résultat ;
- `tools/data/apply-talent-pools.mjs` réécrit les `talents` du tableau déjà généré, avec un mode
  `--check` (code de sortie 1 si la table n'est plus le produit de la règle) utilisé par les tests.

### Résultat

| Mesure | Après 1.16.4 |
|---|---|
| Plus petit pool | **15** (Misdreavus) |
| Plus grand pool | **34** |
| Pools de moins de 10 talents | **0** |
| Doublons dans un pool | **0** |
| Espèces modifiées | 135 (uniquement celles dont le pool était vide) ; Kanto et Johto sont inchangés au caractère près |
| Exemple | Arcko : 3 entrées → **24** talents distincts |

## 3. Garde-fous ajoutés

- `PokemonRules.MIN_TALENT_POOL = 10` : le minimum est écrit noir sur blanc dans la configuration.
- `PokemonDB.validate()` refuse désormais un pool de moins de 10 talents (au lieu de « non vide ») :
  toute régression de données est signalée par `DataValidator` au démarrage.
- `PokemonSpecies` dédoublonne le pool à la construction (une donnée fautive ne peut plus afficher un
  talent deux fois ni rétrécir le tirage).
- Le Pokédex n'affiche plus le talent caché dans la liste des talents normaux : il a déjà sa fiche `★`,
  et il n'est jamais tiré au sort — il était affiché deux fois.

## 4. Effet en jeu (vérifié au navigateur)

| Écran | Avant | Après |
|---|---|---|
| Pokédex → Arcko → Talents | 1 talent en double + la fiche cachée | 23 fiches distinctes + la fiche `★ Délestage` |
| Fiche d'un Arcko possédé → sélecteur de talents | 1 option | 23 options (verrouillées tant qu'elles ne sont pas découvertes) |
| Talent d'un Arcko sauvage | toujours `overgrow` | tirage réel 60 / 30 / 10 sur 23 candidats |
| Pokédex → Bulbasaur | 28 fiches | 28 fiches (inchangé) |

Aucune sauvegarde n'est invalidée : les talents sont enregistrés par identifiant et non par index, et le
pool ne fait que s'agrandir (les identifiants déjà connus y restent).

## 5. Les attaques : audit complet, aucune correction nécessaire

Le signalement mêlait les attaques. Elles ont été vérifiées contre la référence (`main`), pas à l'œil :

| Vérification | Résultat |
|---|---|
| Pool de montée de niveau de chaque espèce, comparé à `getSpeciesMovePool()` de `main` (types, `moveset`, tri, plafond de 15) | **386 / 386 identiques** |
| Valeurs des 419 capacités (type, puissance, précision, rareté) comparées à `moves.js` de `main` | **0 écart**, aucune capacité manquante |
| Types des 386 espèces comparés à `pd-data.js` de `main` | **0 écart** |
| Espèces sans capacité de dégâts de leur propre type dans leur pool | **0** |
| Espèces avec un pool d'entraînement vide ou un pool de niveau incomplet | **0** |
| Capacités inconnues dans les équipes de dresseurs et d'entraînement (367 membres) | **0** |
| Talents de dresseur hors pool de l'espèce | **0** |
| Noms de capacités et de talents manquants (fr / en) | **0** |

Les 159 capacités sans `learnTypes` sont les capacités signature de la donnée d'origine : `main` les
ignore aussi (`if (!mvTypes) continue`), elles ne sont pas tirables à la montée de niveau mais restent
utilisables par CT/CS et par les dresseurs. Rien à corriger là non plus.

Si le joueur constate encore une attaque qui lui paraît fausse, il faut un exemple précis
(espèce + capacité + où elle apparaît) : à ce stade, la donnée est identique à la référence pour les
386 espèces.

## 6. Tests

- `tests/Release1164.test.js` (nouveau, 16 tests) : taille minimale du pool, absence de doublon, talents
  connus, affinités couvertes, talents signature conservés, idempotence de `completeTalentPool()`,
  `apply-talent-pools.mjs --check`, `PokemonDB.validate()`, tirage réel sur 400 essais pour 4 espèces
  ex-« un seul talent », sélecteur de talents d'un Pokémon possédé, pools d'attaques, capacités et
  talents des dresseurs.
- `tests/browser/TalentPools.mjs` (nouveau, 5 vérifications Chromium) : fiches du Pokédex d'Arcko
  (≥ 10, sans doublon, sans répétition du talent caché), 15 attaques de niveau, Bulbasaur inchangé,
  aucune clé de localisation brute.
- Suite complète : **745 tests unitaires / intégration, 0 échec**. Suites navigateur rejouées :
  `TalentPools` 5/5, `PanelFit` 7/7, `DictionaryParity`, `BagAndPokemonInfoParity` : succès.

## 7. Numérotation

| Prévu | Réel | Document |
|---|---|---|
| 1.17.0 | **1.16.4** | `docs/PHASE_v1.16.4.md` |

Correction de données et de règle, sans contenu nouveau : niveau patch, comme 1.16.1 à 1.16.3.

## 8. Ce qui reste ouvert

- **17 espèces n'ont pas de talent caché** (`hiddenTalent: null`) : c'est la donnée d'origine
  (`farfetchd`, `mewtwo`, `lugia`, `raikou`…). On peut en attribuer un par décision de game design, mais
  ce serait un ajout de contenu, pas une correction.
- **Les 159 capacités signature** restent hors montée de niveau, comme dans la référence.
- **5 suites navigateur** restent rouges pour des raisons antérieures (animation / équilibrage),
  identifiées en 1.16.3.
