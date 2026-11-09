# Livraison Rework v1.16.33 — bandeau d'équipe

**Version du paquet : 1.16.33** · Branche : `Rework` · Date : 07/11/2026

Patch correctif de la 1.16.32. Il ne contient **qu'un seul changement de rendu**, et aucun changement de logique.

## Ce qui change

- **Équipe** : la carte d'un Pokémon devient le **bandeau validé**.
  - fond **sable** (`--light1`), bord `--dark1`, rayon 10 px ;
  - le bloc d'information (nom, pastille de niveau, PV, barre d'XP) vit dans une **boîte sombre**
    (`--dark1`) posée dans la carte ;
  - le sprite passe à **112 px**, sans disque derrière lui, ancré sur le bas ;
  - l'**objet tenu** remonte dans l'angle haut-gauche de la carte, agrandi 1,55× avec un coin arrondi,
    comme `team-held-item` du jeu de référence ;
  - les barres de PV et d'XP prennent le fond sombre du bloc.

## Ce qui ne change pas

Aucun fichier JavaScript, aucune donnée, aucun test, aucun système. Les touches
`assets/css/panels/team.css` uniquement. Les règles existantes de la feuille restent dans
leur ordre historique ; le bloc ajouté est en fin de fichier, donc il gagne la cascade.

## Fichier touché

- `assets/css/panels/team.css`
