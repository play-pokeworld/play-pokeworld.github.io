# Refonte Pokémon — phase 2 livrée

## Attaques / learnsets

- Ajout d'un module généré `official-pokemon-data.js`.
- Les learnsets niveau 1-251 sont reconstruits depuis les données officielles PokéAPI pour les versions Kanto/Johto disponibles : Red/Blue, Yellow, Gold/Silver, Crystal.
- Les évolutions héritent des attaques des sous-évolutions pour éviter de perdre des attaques apprises avant évolution.
- La base `MOVES` est étendue à environ 250 attaques.
- Les attaques sont converties dans le système de combat actuel : type, puissance, précision, PP, catégorie, priorité, drain, recul, charge, recharge, statuts et effets secondaires simplifiés.
- Une table `POKE_TM_COMPAT` est générée pour préparer les CT/CS.

## Talents / abilities

- Les talents officiels des Pokémon Kanto/Johto sont générés depuis PokéAPI.
- Les talents cachés reçoivent une rareté supérieure.
- Les Pokémon gardent au moins trois talents candidats quand possible, avec quelques talents de gameplay en complément.
- Les talents restent compatibles avec la capture et l'entraînement existants.
- Les effets de combat ont été étendus pour plusieurs talents officiels : Absorb Eau, Absorb Volt, Torche, Herbivore, Paratonnerre, Lévitation, Fermeté, Peau Dure, Statik, Point Poison, Cran, Technicien, Adaptabilité, Multiécaille, Isograisse, Filtre/Solide Roc, Écaille Spéciale, Essaim, etc.

## Dictionnaire / Pokédex / fiches

- Le Dictionnaire possède une barre sticky, une recherche, et des sources d'obtention pour les objets.
- Le Pokédex utilise des descriptions officielles et lit correctement les attaques avec la structure actuelle des données.
- Les fiches Pokémon utilisent des onglets Base Stats / IV / EV.

## Limites assumées

- Les CT/CS ne sont pas encore utilisables dans l'inventaire, mais la table de compatibilité est prête.
- Tous les effets des centaines d'attaques officielles ne peuvent pas être représentés à 100% dans le moteur actuel ; ils sont convertis vers les effets disponibles les plus proches.
