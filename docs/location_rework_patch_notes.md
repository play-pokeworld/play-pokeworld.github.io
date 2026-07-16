# Patch progression lieux — corrections complémentaires

## Corrections appliquées

- Les blocs "combats pour débloquer" n'apparaissent plus si le lieu actuel ne débloque réellement aucune nouvelle zone.
- Le calcul des zones débloquées par un lieu est maintenant fait par simulation : le jeu compare les zones accessibles avant/après le nettoyage du lieu. Cela évite les messages inversés du type Route 25 → Route 24.
- Ajout d'une connexion directe Route 5 ↔ Route 6 pour représenter le Souterrain / passage officiel vers Carmin sur Mer sans devoir entrer dans Safrania.
- Route 5 débloque maintenant correctement Route 6 après les combats requis.

## Tests manuels rapides effectués

- Route 24 affiche Route 25 comme zone débloquée.
- Route 25 n'affiche plus Route 24 comme zone à débloquer.
- Route 5 affiche Route 6 comme zone débloquée.
- Route 6 devient accessible après nettoyage de Route 5.
