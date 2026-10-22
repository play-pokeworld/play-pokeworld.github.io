# Bilan de phase — Rework 1.14.9

> **Étape historique remplacée par v1.14.10.** Bien que cette livraison ait partagé le widget de sprite, l’écart de tuile PC signalé par l’utilisateur n’était pas résolu. Le découplage demandé entre `BoxPanel` et l’équipe est également réalisé dans v1.14.10. Ne pas traiter cette archive comme l’acceptation finale du point 17.

- **Version applicative :** 1.14.9
- **Schéma de sauvegarde :** 15, inchangé
- **Portée :** correctif séparé du point 17, après le retour utilisateur sur v1.14.8
- **Critère conservé :** le Pokédex est approuvé; le stockage PC et les choix de remplacement doivent réutiliser effectivement le même objet de tuile et le même widget d’affichage que le Pokédex.

## Correction

- `BoxPanel` importe et compose directement `PokemonGridSprite`, le composant utilisé dans `PokedexPanel`.
- Pour les Pokémon PC et les choix de remplacement, le widget partagé est placé dans une tuile `dex-entry`, comme dans le Pokédex. Le niveau, l’étoile shiny et le badge de forme restent attachés au sprite; les noms, rangs, favoris/verrous et actions PC restent autour de la tuile.
- En sélection d’équipe, le comportement de clic sur la rangée reste inchangé; dans le mode de gestion, la tuile reste un bouton accessible qui ouvre la fiche Pokémon. Les échanges, filtres, systèmes PC/équipe et sauvegarde atomique sont préservés.
- `PokemonBoxCard`, le composant distinct créé pour la livraison initiale, a été supprimé.
- `PokedexPanel` et son CSS ne sont pas modifiés par ce correctif; son rendu approuvé est conservé.
- Aucun changement de gameplay, de donnée ou de schéma.

## Tests et contrôles

- `npm test` : **321 réussis, 0 échec**.
- Test statique ajouté : le PC et le remplacement doivent importer/instancier `PokemonGridSprite` et utiliser `dex-entry`.
- Test DOM PC : la tuile ouvre toujours la fiche Pokémon avec l’UID et l’emplacement attendus; les actions d’équipe/PC restent couvertes.
- Test de remplacement : la tuile partagée, le niveau, les indicateurs et l’action de remplacement sont contrôlés.
- Pokédex : les tests de rendu et de filtres restent inchangés et passent.
- `node --check` : **582 fichiers JS/MJS** vérifiés sur le projet et après extraction.
- `git diff --check` : propre.
- Archive extraite : `npm test` — **321 réussis, 0 échec**; métadonnées **1.14.9**, schéma **15**.
- Contrôle visuel navigateur/jeu : non effectué; l’utilisateur fera la vérification manuelle.

## Livraison

- Archive corrective : `pokeworld-rework-1.14.9.zip` — **2 570 entrées**, environ 14 Mo; `unzip -t` sans erreur.
- Archive v1.14.8 conservée comme première tentative historique, explicitement non acceptée pour la Boîte PC. Voir [`PHASE_v1.14.8.md`](PHASE_v1.14.8.md).
