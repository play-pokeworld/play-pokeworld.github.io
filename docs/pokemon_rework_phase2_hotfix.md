# Hotfix phase 2 — données officielles visibles

## Problème corrigé

En mode lancement direct `index.html` / `file://`, le script classique `official-pokemon-data.js` contenait encore une instruction `export {}` réservée aux modules ES. Le navigateur pouvait donc ignorer ce script, ce qui expliquait que les nouveaux learnsets/talents n'étaient pas visibles.

## Corrections

- Version classique `src/legacy/scripts/data/official-pokemon-data.js` corrigée : plus de `export {}`.
- `move-learning.js` lit explicitement `globalThis.POKE_MOVE_POOLS`.
- Au chargement d'une sauvegarde, `applyOfficialPokemonDataToSave()` synchronise les Pokémon existants :
  - retire les attaques non compatibles avec le nouveau learnset officiel ;
  - complète avec des attaques officielles disponibles ;
  - remplace les anciens talents non officiels par le premier talent officiel du Pokémon ;
  - conserve/alimente `G.unlockedTalents`.
- Les nouveaux Pokémon créés utilisent déjà les données officielles.

## Effet attendu

- Le dictionnaire affiche bien les nouvelles attaques et les nouveaux talents.
- Les Pokémon d'une ancienne sauvegarde sont remis en cohérence au chargement.
- Les attaques apprenables utilisent les learnsets officiels + héritage des sous-évolutions.
