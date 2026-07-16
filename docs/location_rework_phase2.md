# Rework lieux / progression — phase 2

## Changements appliqués

### Déblocage / logique

- Suppression du contournement qui rendait toutes les zones accessibles dès 8 badges globaux.
- Les prérequis de badges sont maintenant évalués par région :
  - badges Kanto pour Kanto ;
  - badges Johto pour Johto.
- Les zones post-game peuvent rester verrouillées même si le joueur a 8 badges.
- Les anciennes sauvegardes qui avaient déjà des lieux dans `G.unlockedLocs` ne contournent plus les nouveaux verrous : `isLocUnlocked()` revérifie les gates.
- Correction de la recherche de chemin de `locReachable()` : chaque branche utilise maintenant son propre set de visite, ce qui évite les faux négatifs liés aux chemins multiples.
- Les messages “X combats pour débloquer Y” ne listent plus les zones déjà accessibles ou qui ne sont pas réellement débloquées par le lieu actuel.

### Verrous spéciaux ajoutés

- Route 12 et Route 16 : nécessitent la quête Ronflex / Poké Flûte.
- Caverne Azurée : nécessite la victoire à la Ligue.
- Mont Argenté et Chutes Tohjo : nécessitent la victoire à la Ligue en plus des badges Johto requis.

### Ronflex / Poké Flûte

- Ajout de l’objet `pokeflute` avec sprite inclus.
- Ajout au script de téléchargement des sprites : `call :getitem pokeflute poke-flute`.
- La quête de la Tour Pokémon donne maintenant la Poké Flûte.
- Nouvelle quête principale Kanto : “La Poké Flûte et Ronflex”.
- Cette quête lance un combat/capture contre Ronflex, comme les combats de légendaire, mais avec un niveau adapté.

### Noms corrigés

- Forêt Jadielle → Forêt de Jade.
- Route 23 / Victoire → Route 23.
- Route Victoire (Grotte) → Route Victoire.
- Parc National → Parc Naturel.
- Puits Spinarak → Puits Ramoloss.
- Tour Brûlante → Tour Cendrée.
- Tour Cendrée / Tin Tower → Tour Carillon / Bell Tower.
- Mt. Mortar → Mont Creuset.
- Chemin Glace → Route de Glace.
- Grotte Obscure → Antre Noir.
- Îles Whirl → Tourb’Îles.
- Mt. Argent → Mont Argenté.
- Cascade Tohjo → Chutes Tohjo.
- En anglais, les `Road XX` ont été normalisées en `Route XX`.

### Corrections de connexions Johto

- Route 28 n’est plus reliée directement à Acajou.
- Route Victoire Johto n’est plus reliée directement au Mont Argenté / Route 28.
- Mont Argenté est relié à Route 28 / Chutes Tohjo.
- Chutes Tohjo est relié à Route 27 / Mont Argenté.

## Tests

- Build Vite OK.
- Validation projet OK.
- Smoke test OK.
- Vérification syntaxique JS OK.
