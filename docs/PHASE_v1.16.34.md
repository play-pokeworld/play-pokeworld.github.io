# Livraison Rework v1.16.34 — Combat, Lieu, Choix du starter

**Version du paquet : 1.16.34** · Branche : `Rework` · Date : 07/11/2026

Cette livraison porte **enfin dans le jeu** les trois écransvalidés sur la maquette
(Combat, Lieu, Choix du starter). Elle ne touche **ni la logique, ni les données, ni les systèmes** :
seuls des fichiers CSS, une chaîne de localisation et les numéros de version changent.

## 1. Combat — alignement de la carte du sauvage

Le sauvage est le premier élément de `#battle-team-row` ; sa carte gardait un modèle de boîte
différent de celui de nos Pokémon. Seules des **positions** ont été corrigées, jamais les couleurs,
le décor ni les arrondis.

- même épaisseur de cadre, même remplissage (`7px 7px 7px 9px`) et même alignement vertical que
  nos cartes → **le sprite et le cadre du sauvage tombent exactement sur les nôtres** (mesuré :
  sprite `x = 411` des deux côtés, boîte d'info `x = 589`, largeur `442` des deux côtés) ;
- la boîte d'attaques du sauvage n'ajoute plus de remplissage ni de bordure propre ;
- les **quatre emplacements d'attaque partagent une seule hauteur de ligne** : un emplacement vide
  fait exactement la taille d'un emplacement plein (35 px), au lieu d'être plus court.

Fichiers : `assets/css/panels/battle-team-row.css`, `assets/css/panels/team-moves.css`.

## 2. Lieu — nom du lieu sur le décor

- le **décor de la zone** (`--pc-scene-url`, le jeton partagé du design-system) devient le fond du
  panneau du lieu ; la fenêtre n'écrit aucun chemin d'image ;
- le nom est une **plaque centrée, à fond opaque**, lisible sur n'importe quel paysage.

Fichier : `assets/css/panels/location.css`.

## 3. Choix du starter — même grammaire que la maquette

- la fenêtre **couvre le décor** : voile opaque, dégradé radial + trame discrète (plus d'aplat vide) ;
- le titre est posé sur un **bandeau sable**, texte en encre sombre ;
- **« Nom du dresseur »** (et non plus « Pseudo du Dresseur ») est un intitulé en petites capitales
  **sur sa propre ligne**, au-dessus du champ ;
- les trois starters forment une **grille de cartes sable** (3 colonnes sur PC, 1 colonne sur mobile)
  à bordure pointillée, sprite de 104 px **sans disque**, nom + numéro de Pokédex, description, et
  une action « Choisir » en pastille sombre ;
- les textes suivent la DA : sable adouci (`--light1`) et encre tiède, plus de noir sur blanc.

Fichiers : `assets/css/panels/starter.css`, `src/localization/fr/starter.js`,
`src/localization/en/starter.js`.

## Ce qui n'est pas touché

- **Équipe** : aucun fichier ni aucune règle de l'équipe n'a été modifiée.
- Aucun JavaScript de gameplay, aucune donnée, aucun système, aucun test.

## Vérifications

- `npm test` : **894 tests passés**, 1 échec **antérieur** et hors périmètre
  (`.poke-card-top .hp-text` à 10 px, règle de la carte d'équipe validée — non touchée).
- Parcours réel (`node server.js`) : accueil → choix du starter → création de partie →
  voyage vers la Route 1 → combat sauvage. **0 erreur JavaScript**.
- `start.bat` repassé en CRLF (le test de conformité le demandait).
