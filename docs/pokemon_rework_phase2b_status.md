# Refonte Pokémon — phase 2B

## Problèmes corrigés

- Les données officielles sont maintenant visibles dans le moteur classique et le build.
- `MOVES` et `TALENTS_FULL` sont exposés/mutés correctement côté scripts classiques.
- Les Pokémon existants d'une sauvegarde sont migrés au chargement après mise à jour de `window.G` / `globalThis.G`.
- Les attaques invalides ou supprimées sont retirées au chargement.
- Les cases de moves inconnus ne devraient plus apparaître sous forme de `?` dans les fiches ; seules les attaques valides sont conservées.

## Attaques

- Les learnsets utilisent désormais toutes les versions disponibles dans PokéAPI, pas seulement Rouge/Bleu/Jaune/Or/Argent/Cristal.
- Les évolutions héritent toujours des attaques des sous-évolutions.
- La base `MOVES` passe à plus de 600 attaques liées aux Pokémon 1-251.
- Exemple : Dracaufeu possède maintenant un pool élargi d'environ 25 attaques niveau-up, avec les attaques modernes compatibles.
- Le dictionnaire affiche les attaques de ce pool étendu.

## Talents

- Les talents officiels restent prioritaires.
- Ajout de talents custom cohérents par type / rôle :
  - Impulsion Verte ;
  - Cœur Infernal ;
  - Appel des Marées ;
  - Charge-Orage ;
  - Concentration Psy ;
  - Voile Spectral ;
  - Art Venimeux ;
  - As Aérien ;
  - Noyau Givré ;
  - Peau de Roc ;
  - Aura Draconique ;
  - Âme d’Acier ;
  - Instinct Insecte ;
  - Ruée Féroce ;
  - etc.
- Les Pokémon peuvent maintenant avoir jusqu'à 8 talents candidats, en mélangeant talents officiels et talents gameplay cohérents.

## CT/CS

- `POKE_TM_COMPAT` reste généré et couvre davantage de versions.
- `POKE_EGG_MOVES` est aussi préparé pour de futurs systèmes.
