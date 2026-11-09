# Livraison Rework v1.16.36 — bandeau d'Équipe porté dans le jeu

**Version du paquet : 1.16.36** · Branche : `Rework` · Date : 08/11/2026

Portage de l'écran **Équipe** validé. Tout est cadré sur `#team-window-body` : la carte du combat
(`#battle-team-row`) partage le même composant mais garde exactement son rendu validé.

## Ce qui change dans la fenêtre Équipe

- carte **sable** (`--light1`) à bord `--dark1`, la boîte d'information devient une **boîte sombre**
  (`--dark1`) posée dessus, avec son ombre décalée ;
- nom et PV en sable clair dans cette boîte, pastille de niveau sable/encre ;
- **lignes de capacités sur fond sombre** (`--dark2`) : sur une carte sable, le voile noir à 34 %
  rendait les couleurs de type illisibles ;
- **les quatre emplacements partagent une hauteur** : un emplacement vide fait la taille d'un plein
  (33 px), au lieu d'être plus court ;
- objet tenu : pas de pastille, pas de disque.

## Ce qui ne change pas

Aucun JavaScript, aucune donnée, aucun système, aucun test. Les règles ajoutées sont en fin de
`team.css`, toutes préfixées par `#team-window-body`.

Fichier touché : `assets/css/panels/team.css`.
