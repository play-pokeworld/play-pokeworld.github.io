# Phase 1.16.58 — écarts fermés sur les écrans validés + fiche de validation

Deux demandes : **terminer** la mise en jeu de ce qui est validé, et **présenter le catalogue avec
la liste des points à valider**. Aucun écran du statut 3 n'a été retouché : ils attendent ton œil.

## 1. Les quatre écarts de la 1.16.57 sont fermés

| Écart écrit dans la 1.16.57 | Traitement |
|---|---|
| Presets : pas de cercle « + » sur un emplacement vide | `TeamPresetListCard` dessine le cercle de 26 px et le libellé court à côté, comme le cadre. La bande de sprites existait déjà (elle ne s'affichait pas seulement parce que la sauvegarde de test était vide) : la phrase de la 1.16.57 était trop large, elle est corrigée ici |
| Presets : la pastille « active » était un aplat jaune | Passée en `--light1` + encre sombre : c'est la règle validée au pas 16 (« jamais l'accent en aplat ») |
| Le ✕ des feuilles, absent du catalogue | Retiré des feuilles (`.pw-sheet`). Toutes portent un bouton « Fermer » dans le pied, et Escape et le fond restent actifs |
| Choix de la Poké Ball : la ligne du nom de filtre (« Errant ») n'existe pas dans le cadre | Retirée. Le libellé du filtre reste visible dans l'éditeur de filtres, juste au-dessus |
| « Quitter le combat » / « Quitter » | Le bouton de confirmation porte « Quitter », comme le cadre (nouvelle clé `battle_quit_confirm`, fr + en) |

## 2. Le catalogue devient adressable

`CATALOGUE_AFFICHAGES.html` lit maintenant son ancre : `…#sac`, `…#boite`, `…#succes-fs` ouvrent
directement le bon cadre, et la navigation met l'ancre à jour. Sans ça, une fiche de validation ne
pouvait pas pointer sur un écran précis — c'était le blocage de ta demande.

## 3. La fiche de validation

`catalogue/VALIDATION_A_VALIDER.html` — **12 écrans, 46 points de contrôle** :

- une carte par écran, avec son groupe et un lien **« Ouvrir le cadre »** vers le bon cadre ;
- les points sont des cases à cocher, une ligne de verdict libre par écran ;
- une barre compte les points et les écrans complets ; le bouton **« Exporter ma réponse »** produit un
  texte prêt à coller (un statut par écran : BON / À CORRIGER / pas regardé, plus ta phrase) ;
- tout reste dans le navigateur (`localStorage`), rien n'est envoyé.

Les douze écrans sont ceux du **statut 3** : Sac, Boîte PC, Pokédex, Marché, Boutique, Badges,
Dictionnaire, Atoll, Atoll — Boutique, Succès plein écran, Starter régional, Menu de navigation.
Les vingt-cinq écrans du statut 4 sont explicitement exclus en bas de page : les regarder maintenant
serait du temps perdu, ils vont changer.

## Vérifications

- `npm test` : **906 passés, 0 échec**.
- Paires rendues après correction : `PASSATION/shots/2026-11-09/portage11658/paire-{presets,map-help,ball-picker,confirm-quitter}.png`.
- Ancres vérifiées sur quatre cadres (`#sac`, `#pokedex`, `#map-help`, `#presets`) : la liste de
  gauche s'ouvre bien sur le cadre demandé, aucune erreur de page.
- Fiche de validation contrôlée au navigateur : 12 cartes, 46 cases, export cohérent.
