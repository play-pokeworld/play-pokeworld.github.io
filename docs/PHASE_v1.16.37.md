# Livraison Rework v1.16.37 — starter mobile et plaque du lieu

**Version du paquet : 1.16.37** · Branche : `Rework` · Date : 08/11/2026

## Choix du starter — mise en page tactile

Sur téléphone, la fenêtre du starter reprend les proportions du menu de référence au lieu d'une
colonne pleine largeur avec un sprite de 104 px :

- les cartes gardent **la largeur de leur contenu** (`flex: 0 1 auto`, 45 % au plus) et **s'enroulent** :
  deux cartes sur la première ligne d'un 390 px, la troisième se centre en dessous ;
- sprite **60 px** (au lieu de 104), titre 16 px, textes 9,5–11 px, champ de nom 34 px ;
- aucun défilement nécessaire sur un écran de 844 px.

Le PC (3 colonnes, sprite 104 px) ne change pas.

## Lieu — plaque centrée

La plaque du nom est centrée horizontalement **et verticalement** dans le décor, avec son fond
translucide à 72 %.

Aucun JavaScript, aucune donnée, aucun système, aucun test touché.
Fichiers : `assets/css/panels/starter.css`, `assets/css/panels/location.css`.
